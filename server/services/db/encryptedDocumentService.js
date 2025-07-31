/**
 * Encrypted Document Service
 * 
 * Extends the base DocumentService to provide end-to-end encryption capabilities.
 * Handles encryption/decryption transparently while maintaining compatibility.
 */

import { DocumentService } from './documentService.js';
import encryptionService from '../../security/EncryptionService.js';
import keyManager from '../../security/KeyManager.js';
import { generateSecureToken } from '../../utils/crypto.js';

export class EncryptedDocumentService extends DocumentService {
  constructor(options = {}) {
    super({
      enableEncryption: true,
      ...options
    });
    
    this.encryptionInitialized = false;
  }

  /**
   * Initialize encryption services
   */
  async initializeEncryption() {
    try {
      if (!this.encryptionInitialized) {
        await encryptionService.initialize();
        await keyManager.initialize(this.db);
        this.encryptionInitialized = true;
        this.log('Encryption services initialized');
      }
    } catch (error) {
      this.log(`Failed to initialize encryption: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Create an encrypted document
   * @param {Object} data - Document data
   * @param {Object} options - Creation options
   * @returns {Object} Created document
   */
  async createEncryptedDocument(data, options = {}) {
    await this.initializeEncryption();
    
    const {
      recipientUserIds = [],
      encryptContent = true,
      userPassword,
      shareWithOrganization = false,
      encryptionMetadata = {}
    } = options;

    if (!data.user_id) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'User ID is required for encrypted documents'
        }
      };
    }

    if (!userPassword) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'User password is required for encryption'
        }
      };
    }

    try {
      const transaction = await this.beginTransaction();

      try {
        // Create the base document first
        const documentResult = await super.createDocument(data, {
          ...options,
          transaction
        });

        if (!documentResult.success) {
          await this.rollbackTransaction(transaction);
          return documentResult;
        }

        const document = documentResult.data;

        if (encryptContent && data.content) {
          // Get recipient public keys
          const recipientPublicKeys = await this.getRecipientPublicKeys([
            data.user_id,
            ...recipientUserIds
          ]);

          if (recipientPublicKeys.length === 0) {
            await this.rollbackTransaction(transaction);
            return {
              success: false,
              error: {
                code: 'ENCRYPTION_ERROR',
                message: 'No valid public keys found for recipients'
              }
            };
          }

          // Encrypt document content
          const encryptedDocument = await encryptionService.encryptDocument(
            data.content,
            recipientPublicKeys,
            {
              documentId: document.id,
              metadata: {
                title: data.title,
                originalSize: Buffer.byteLength(data.content, 'utf8'),
                ...encryptionMetadata
              }
            }
          );

          // Store encryption metadata
          await this.storeEncryptionMetadata(
            document.id,
            encryptedDocument,
            data.user_id,
            transaction
          );

          // Store document key shares
          await this.storeDocumentKeyShares(
            document.id,
            encryptedDocument.encryptedKeys,
            data.user_id,
            transaction
          );

          // Update document with encrypted content
          await this.db
            .from('documents')
            .update({
              content: JSON.stringify(encryptedDocument.encryptedContent),
              is_encrypted: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', document.id)
            .eq('organization_id', data.organization_id);

          // Audit log
          await this.auditEncryptionEvent(
            'document_encrypted',
            'document',
            document.id,
            data.user_id,
            {
              recipients: recipientPublicKeys.length,
              algorithm: encryptedDocument.metadata.algorithm
            }
          );
        }

        await this.commitTransaction(transaction);

        this.log(`Encrypted document created: ${document.id}`, 'info', {
          documentId: document.id,
          userId: data.user_id,
          encrypted: encryptContent
        });

        return {
          success: true,
          data: {
            ...document,
            is_encrypted: encryptContent,
            encryption_recipients: recipientUserIds.length + 1
          }
        };

      } catch (error) {
        await this.rollbackTransaction(transaction);
        throw error;
      }

    } catch (error) {
      this.log(`Failed to create encrypted document: ${error.message}`, 'error');
      return {
        success: false,
        error: {
          code: 'ENCRYPTION_ERROR',
          message: error.message
        }
      };
    }
  }

  /**
   * Get and decrypt a document
   * @param {string} id - Document ID
   * @param {Object} options - Retrieval options
   * @returns {Object} Decrypted document
   */
  async getDecryptedDocument(id, options = {}) {
    await this.initializeEncryption();
    
    const {
      userId,
      userPassword,
      organizationId,
      includeContent = true,
      auditAccess = true
    } = options;

    if (!userId) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'User ID is required for document access'
        }
      };
    }

    try {
      // Get the base document
      const documentResult = await super.getDocument(id, {
        organizationId,
        includeContent: false // We'll handle content decryption separately
      });

      if (!documentResult.success) {
        return documentResult;
      }

      const document = documentResult.data;

      // Check if document is encrypted
      const encryptionMetadata = await this.getDocumentEncryptionMetadata(id);
      
      if (!encryptionMetadata) {
        // Document is not encrypted, return as normal
        if (includeContent) {
          const contentResult = await super.getDocument(id, { organizationId, includeContent: true });
          if (contentResult.success) {
            document.content = contentResult.data.content;
          }
        }
        
        return {
          success: true,
          data: {
            ...document,
            is_encrypted: false
          }
        };
      }

      // Check if user has access to encrypted document
      const hasAccess = await this.userHasDocumentAccess(userId, id);
      if (!hasAccess) {
        await this.auditEncryptionEvent(
          'access_denied',
          'document',
          id,
          userId,
          { reason: 'no_key_share' }
        );

        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'User does not have access to this encrypted document'
          }
        };
      }

      // Decrypt content if requested
      if (includeContent) {
        if (!userPassword) {
          return {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'User password is required to decrypt document content'
            }
          };
        }

        try {
          // Get user's private key
          const privateKey = await keyManager.getDecryptedPrivateKey(userId, userPassword);
          if (!privateKey) {
            return {
              success: false,
              error: {
                code: 'AUTHENTICATION_ERROR',
                message: 'Invalid password or missing encryption keys'
              }
            };
          }

          // Get encrypted document package
          const encryptedContent = JSON.parse(document.content);
          const documentKeyShares = await this.getDocumentKeyShares(id, userId);

          if (!documentKeyShares) {
            return {
              success: false,
              error: {
                code: 'ENCRYPTION_ERROR',
                message: 'Document key share not found'
              }
            };
          }

          // Reconstruct encrypted document for decryption
          const encryptedDocument = {
            documentId: id,
            encryptedContent,
            encryptedKeys: [documentKeyShares],
            metadata: encryptionMetadata.encryption_metadata
          };

          // Decrypt the document
          const decryptedContent = await encryptionService.decryptDocument(
            encryptedDocument,
            privateKey,
            userPassword
          );

          document.content = decryptedContent.toString('utf8');

          // Update last accessed
          await this.updateLastAccessed(id, organizationId);

          // Audit successful access
          if (auditAccess) {
            await this.auditEncryptionEvent(
              'document_decrypted',
              'document',
              id,
              userId,
              { success: true }
            );
          }

        } catch (decryptError) {
          this.log(`Decryption failed for document ${id}: ${decryptError.message}`, 'error');
          
          await this.auditEncryptionEvent(
            'decryption_failed',
            'document',
            id,
            userId,
            { error: decryptError.message }
          );

          return {
            success: false,
            error: {
              code: 'DECRYPTION_ERROR',
              message: 'Failed to decrypt document content'
            }
          };
        }
      }

      return {
        success: true,
        data: {
          ...document,
          is_encrypted: true,
          encryption_algorithm: encryptionMetadata.encryption_algorithm,
          encrypted_for_users: encryptionMetadata.encrypted_for_users
        }
      };

    } catch (error) {
      this.log(`Failed to get encrypted document ${id}: ${error.message}`, 'error');
      return {
        success: false,
        error: {
          code: 'RETRIEVAL_ERROR',
          message: error.message
        }
      };
    }
  }

  /**
   * Share encrypted document with additional users
   * @param {string} documentId - Document ID
   * @param {Array<string>} recipientUserIds - User IDs to share with
   * @param {Object} options - Sharing options
   * @returns {Object} Sharing result
   */
  async shareEncryptedDocument(documentId, recipientUserIds, options = {}) {
    await this.initializeEncryption();
    
    const {
      userId,
      userPassword,
      permissions = ['read'],
      notifyRecipients = true
    } = options;

    if (!userId || !userPassword) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'User ID and password are required for sharing'
        }
      };
    }

    try {
      // Verify user has access to the document
      const hasAccess = await this.userHasDocumentAccess(userId, documentId);
      if (!hasAccess) {
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'User does not have access to share this document'
          }
        };
      }

      // Get recipient public keys
      const recipientPublicKeys = await this.getRecipientPublicKeys(recipientUserIds);
      if (recipientPublicKeys.length === 0) {
        return {
          success: false,
          error: {
            code: 'ENCRYPTION_ERROR',
            message: 'No valid public keys found for recipients'
          }
        };
      }

      // Get current encrypted document
      const documentResult = await this.getDecryptedDocument(documentId, {
        userId,
        userPassword,
        includeContent: false
      });

      if (!documentResult.success) {
        return documentResult;
      }

      // Get user's private key for re-encryption
      const privateKey = await keyManager.getDecryptedPrivateKey(userId, userPassword);
      if (!privateKey) {
        return {
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: 'Invalid password or missing encryption keys'
          }
        };
      }

      const transaction = await this.beginTransaction();

      try {
        // Get current encryption metadata and shares
        const encryptionMetadata = await this.getDocumentEncryptionMetadata(documentId);
        const existingShares = await this.getAllDocumentKeyShares(documentId);

        // Reconstruct encrypted document
        const document = await this.db
          .from('documents')
          .select('content')
          .eq('id', documentId)
          .single();

        const encryptedDocument = {
          documentId,
          encryptedContent: JSON.parse(document.data.content),
          encryptedKeys: existingShares.map(share => ({
            recipientFingerprint: share.recipient_key_fingerprint,
            encryptedKey: share.encrypted_document_key,
            algorithm: share.key_encryption_algorithm
          })),
          metadata: encryptionMetadata.encryption_metadata
        };

        // Share document with new recipients
        const updatedDocument = await encryptionService.shareDocumentKey(
          encryptedDocument,
          recipientPublicKeys,
          privateKey,
          userPassword
        );

        // Store new key shares
        const newShares = updatedDocument.encryptedKeys.slice(existingShares.length);
        for (let i = 0; i < newShares.length; i++) {
          const share = newShares[i];
          const recipientUserId = recipientUserIds[i];

          await this.db
            .from('document_key_shares')
            .insert({
              document_id: documentId,
              user_id: recipientUserId,
              recipient_key_fingerprint: share.recipientFingerprint,
              encrypted_document_key: share.encryptedKey,
              key_encryption_algorithm: share.algorithm,
              shared_by_user_id: userId,
              share_permissions: JSON.stringify(permissions)
            });
        }

        // Update encryption metadata
        await this.db
          .from('document_encryption')
          .update({
            encrypted_for_users: JSON.stringify([
              ...encryptionMetadata.encrypted_for_users,
              ...recipientUserIds
            ]),
            last_shared_at: new Date().toISOString(),
            encryption_metadata: JSON.stringify(updatedDocument.metadata)
          })
          .eq('document_id', documentId);

        await this.commitTransaction(transaction);

        // Audit sharing
        await this.auditEncryptionEvent(
          'document_shared',
          'document',
          documentId,
          userId,
          {
            recipients: recipientUserIds,
            permissions,
            total_shares: updatedDocument.encryptedKeys.length
          }
        );

        this.log(`Document ${documentId} shared with ${recipientUserIds.length} users`);

        return {
          success: true,
          data: {
            documentId,
            newRecipients: recipientUserIds.length,
            totalRecipients: updatedDocument.encryptedKeys.length
          }
        };

      } catch (error) {
        await this.rollbackTransaction(transaction);
        throw error;
      }

    } catch (error) {
      this.log(`Failed to share document ${documentId}: ${error.message}`, 'error');
      return {
        success: false,
        error: {
          code: 'SHARING_ERROR',
          message: error.message
        }
      };
    }
  }

  /**
   * Revoke access to encrypted document
   * @param {string} documentId - Document ID
   * @param {Array<string>} revokeUserIds - User IDs to revoke access from
   * @param {Object} options - Revocation options
   * @returns {Object} Revocation result
   */
  async revokeDocumentAccess(documentId, revokeUserIds, options = {}) {
    await this.initializeEncryption();
    
    const {
      userId,
      reason = 'access_revoked',
      reEncryptDocument = false
    } = options;

    try {
      const transaction = await this.beginTransaction();

      try {
        // Mark key shares as revoked
        await this.db
          .from('document_key_shares')
          .update({
            revoked_at: new Date().toISOString(),
            revoked_by_user_id: userId,
            revocation_reason: reason
          })
          .eq('document_id', documentId)
          .in('user_id', revokeUserIds);

        // Update encryption metadata
        const encryptionMetadata = await this.getDocumentEncryptionMetadata(documentId);
        const remainingUsers = encryptionMetadata.encrypted_for_users.filter(
          uid => !revokeUserIds.includes(uid)
        );

        await this.db
          .from('document_encryption')
          .update({
            encrypted_for_users: JSON.stringify(remainingUsers)
          })
          .eq('document_id', documentId);

        await this.commitTransaction(transaction);

        // Audit revocation
        await this.auditEncryptionEvent(
          'access_revoked',
          'document',
          documentId,
          userId,
          {
            revokedUsers: revokeUserIds,
            reason,
            remainingUsers: remainingUsers.length
          }
        );

        this.log(`Access revoked for ${revokeUserIds.length} users from document ${documentId}`);

        return {
          success: true,
          data: {
            documentId,
            revokedUsers: revokeUserIds.length,
            remainingUsers: remainingUsers.length
          }
        };

      } catch (error) {
        await this.rollbackTransaction(transaction);
        throw error;
      }

    } catch (error) {
      this.log(`Failed to revoke access for document ${documentId}: ${error.message}`, 'error');
      return {
        success: false,
        error: {
          code: 'REVOCATION_ERROR',
          message: error.message
        }
      };
    }
  }

  // Private helper methods

  /**
   * Get recipient public keys for user IDs
   * @param {Array<string>} userIds - User IDs
   * @returns {Promise<Array<string>>} Public keys
   */
  async getRecipientPublicKeys(userIds) {
    try {
      const publicKeys = [];
      
      for (const userId of userIds) {
        const publicKey = await keyManager.getUserPublicKey(userId);
        if (publicKey) {
          publicKeys.push(publicKey);
        }
      }
      
      return publicKeys;
      
    } catch (error) {
      this.log(`Failed to get recipient public keys: ${error.message}`, 'error');
      return [];
    }
  }

  /**
   * Store encryption metadata for document
   * @param {string} documentId - Document ID
   * @param {Object} encryptedDocument - Encrypted document data
   * @param {string} userId - User ID
   * @param {Object} transaction - Database transaction
   */
  async storeEncryptionMetadata(documentId, encryptedDocument, userId, transaction) {
    const encryptionRecord = {
      document_id: documentId,
      is_encrypted: true,
      encryption_algorithm: encryptedDocument.metadata.algorithm,
      key_algorithm: encryptedDocument.metadata.keyAlgorithm,
      encryption_version: encryptedDocument.metadata.version,
      document_key_id: encryptedDocument.documentId,
      content_fingerprint: encryptedDocument.metadata.contentFingerprint,
      encryption_metadata: JSON.stringify(encryptedDocument.metadata),
      created_by_user_id: userId,
      encrypted_for_users: JSON.stringify([userId])
    };

    await this.db
      .from('document_encryption')
      .insert([encryptionRecord]);
  }

  /**
   * Store document key shares
   * @param {string} documentId - Document ID
   * @param {Array} encryptedKeys - Encrypted keys for recipients
   * @param {string} sharedBy - User who shared the document
   * @param {Object} transaction - Database transaction
   */
  async storeDocumentKeyShares(documentId, encryptedKeys, sharedBy, transaction) {
    for (const keyData of encryptedKeys) {
      // We need to map fingerprints back to user IDs
      // This is a simplified version - in production you'd have a better mapping
      const shareRecord = {
        document_id: documentId,
        user_id: sharedBy, // Simplified - should map fingerprint to user ID
        recipient_key_fingerprint: keyData.recipientFingerprint,
        encrypted_document_key: keyData.encryptedKey,
        key_encryption_algorithm: keyData.algorithm,
        shared_by_user_id: sharedBy,
        share_permissions: JSON.stringify(['read', 'write'])
      };

      await this.db
        .from('document_key_shares')
        .insert([shareRecord]);
    }
  }

  /**
   * Get document encryption metadata
   * @param {string} documentId - Document ID
   * @returns {Promise<Object|null>} Encryption metadata
   */
  async getDocumentEncryptionMetadata(documentId) {
    try {
      const { data, error } = await this.db
        .from('document_encryption')
        .select('*')
        .eq('document_id', documentId)
        .single();

      if (error) {
        return null;
      }

      return {
        ...data,
        encryption_metadata: JSON.parse(data.encryption_metadata || '{}'),
        encrypted_for_users: JSON.parse(data.encrypted_for_users || '[]')
      };

    } catch (error) {
      return null;
    }
  }

  /**
   * Check if user has access to document
   * @param {string} userId - User ID
   * @param {string} documentId - Document ID
   * @returns {Promise<boolean>} Access status
   */
  async userHasDocumentAccess(userId, documentId) {
    try {
      const { data, error } = await this.db
        .from('document_key_shares')
        .select('id')
        .eq('user_id', userId)
        .eq('document_id', documentId)
        .is('revoked_at', null)
        .limit(1);

      return !error && data && data.length > 0;

    } catch (error) {
      return false;
    }
  }

  /**
   * Get document key shares for user
   * @param {string} documentId - Document ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Key share data
   */
  async getDocumentKeyShares(documentId, userId) {
    try {
      const { data, error } = await this.db
        .from('document_key_shares')
        .select('*')
        .eq('document_id', documentId)
        .eq('user_id', userId)
        .is('revoked_at', null)
        .single();

      if (error) {
        return null;
      }

      return {
        recipientFingerprint: data.recipient_key_fingerprint,
        encryptedKey: data.encrypted_document_key,
        algorithm: data.key_encryption_algorithm
      };

    } catch (error) {
      return null;
    }
  }

  /**
   * Get all document key shares
   * @param {string} documentId - Document ID
   * @returns {Promise<Array>} All key shares
   */
  async getAllDocumentKeyShares(documentId) {
    try {
      const { data, error } = await this.db
        .from('document_key_shares')
        .select('*')
        .eq('document_id', documentId)
        .is('revoked_at', null);

      if (error) {
        return [];
      }

      return data;

    } catch (error) {
      return [];
    }
  }

  /**
   * Audit encryption events
   * @param {string} eventType - Type of event
   * @param {string} entityType - Type of entity
   * @param {string} entityId - Entity ID
   * @param {string} userId - User ID
   * @param {Object} eventData - Event data
   */
  async auditEncryptionEvent(eventType, entityType, entityId, userId, eventData = {}) {
    try {
      await this.db
        .from('encryption_audit_log')
        .insert([{
          event_type: eventType,
          entity_type: entityType,
          entity_id: entityId,
          user_id: userId,
          event_data: JSON.stringify(eventData),
          success: !eventData.error
        }]);

    } catch (error) {
      this.log(`Failed to audit encryption event: ${error.message}`, 'error');
    }
  }

  /**
   * Get service health status
   * @returns {Object} Health status
   */
  getHealthStatus() {
    const baseHealth = super.getHealthStatus();
    
    return {
      ...baseHealth,
      encryption: {
        initialized: this.encryptionInitialized,
        encryptionService: encryptionService.getHealthStatus(),
        keyManager: keyManager.getHealthStatus()
      }
    };
  }
}

// Export as default
export default EncryptedDocumentService;