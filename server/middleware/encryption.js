/**
 * Encryption Middleware
 * 
 * Provides automatic encryption/decryption for document operations.
 * Handles transparent encryption for marked documents and decryption for authorized users.
 */

import encryptionService from '../security/EncryptionService.js';
import keyManager from '../security/KeyManager.js';
import { EncryptedDocumentService } from '../services/db/encryptedDocumentService.js';
import { generateSecureToken } from '../utils/crypto.js';

class EncryptionMiddleware {
  constructor() {
    this.initialized = false;
    this.encryptedDocumentService = null;
    this.options = {
      autoEncryptPaths: ['/api/documents'],
      encryptionHeader: 'x-encryption-required',
      userPasswordHeader: 'x-user-password',
      skipEncryptionHeader: 'x-skip-encryption',
      maxDocumentSize: 50 * 1024 * 1024, // 50MB
      requireUserPassword: true
    };
  }

  /**
   * Initialize encryption middleware
   * @param {Object} options - Middleware options
   */
  async initialize(options = {}) {
    try {
      this.options = { ...this.options, ...options };
      
      // Initialize services
      await encryptionService.initialize();
      await keyManager.initialize();
      
      // Initialize encrypted document service
      this.encryptedDocumentService = new EncryptedDocumentService();
      await this.encryptedDocumentService.initializeEncryption();
      
      this.initialized = true;
      this.log('Encryption middleware initialized successfully');
      
    } catch (error) {
      this.log(`Failed to initialize encryption middleware: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Create express middleware for document encryption
   * @returns {Function} Express middleware function
   */
  createDocumentEncryptionMiddleware() {
    return async (req, res, next) => {
      try {
        // Skip if middleware not initialized
        if (!this.initialized) {
          return next();
        }

        // Skip if explicitly disabled
        if (req.headers[this.options.skipEncryptionHeader] === 'true') {
          return next();
        }

        // Check if this is a document operation that needs encryption
        const shouldEncrypt = this.shouldEncryptRequest(req);
        
        if (shouldEncrypt && req.method === 'POST') {
          await this.handleDocumentCreation(req, res, next);
        } else if (shouldEncrypt && req.method === 'GET') {
          await this.handleDocumentRetrieval(req, res, next);
        } else if (shouldEncrypt && req.method === 'PUT') {
          await this.handleDocumentUpdate(req, res, next);
        } else {
          next();
        }

      } catch (error) {
        this.log(`Encryption middleware error: ${error.message}`, 'error');
        res.status(500).json({
          success: false,
          error: {
            code: 'ENCRYPTION_MIDDLEWARE_ERROR',
            message: 'Encryption operation failed'
          }
        });
      }
    };
  }

  /**
   * Handle document creation with encryption
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @param {Function} next - Next middleware
   */
  async handleDocumentCreation(req, res, next) {
    try {
      const { body, user } = req;
      
      // Extract encryption parameters
      const encryptionRequired = req.headers[this.options.encryptionHeader] === 'true' || 
                                body.encrypt === true ||
                                body.is_encrypted === true;

      if (!encryptionRequired) {
        return next();
      }

      // Validate user and password
      const userId = user?.id || body.user_id;
      const userPassword = req.headers[this.options.userPasswordHeader] || body.userPassword;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'USER_ID_REQUIRED',
            message: 'User ID is required for encryption'
          }
        });
      }

      if (this.options.requireUserPassword && !userPassword) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'USER_PASSWORD_REQUIRED',
            message: 'User password is required for encryption'
          }
        });
      }

      // Validate document size
      if (body.content && Buffer.byteLength(body.content, 'utf8') > this.options.maxDocumentSize) {
        return res.status(413).json({
          success: false,
          error: {
            code: 'DOCUMENT_TOO_LARGE',
            message: 'Document exceeds maximum size for encryption'
          }
        });
      }

      // Check if user has encryption keys
      const hasKeys = await keyManager.getUserPublicKey(userId);
      if (!hasKeys) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_ENCRYPTION_KEYS',
            message: 'User must have encryption keys to create encrypted documents'
          }
        });
      }

      // Prepare encryption options
      const encryptionOptions = {
        recipientUserIds: body.shareWith || [],
        encryptContent: true,
        userPassword,
        encryptionMetadata: {
          encryptedVia: 'middleware',
          clientIP: req.ip,
          userAgent: req.headers['user-agent']
        }
      };

      // Use encrypted document service
      req.encryptionOptions = encryptionOptions;
      req.useEncryptedService = true;
      
      next();

    } catch (error) {
      this.log(`Document creation encryption failed: ${error.message}`, 'error');
      res.status(500).json({
        success: false,
        error: {
          code: 'ENCRYPTION_FAILED',
          message: 'Failed to prepare document for encryption'
        }
      });
    }
  }

  /**
   * Handle document retrieval with decryption
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @param {Function} next - Next middleware
   */
  async handleDocumentRetrieval(req, res, next) {
    try {
      const { user, params } = req;
      const documentId = params.id || params.documentId;

      if (!documentId || !user?.id) {
        return next();
      }

      // Store original response methods
      const originalJson = res.json;
      const originalSend = res.send;

      // Override response methods to handle decryption
      res.json = async (data) => {
        try {
          if (data && data.success && data.data && data.data.is_encrypted) {
            const userPassword = req.headers[this.options.userPasswordHeader] || req.query.userPassword;
            
            if (!userPassword) {
              return originalJson.call(res, {
                success: false,
                error: {
                  code: 'USER_PASSWORD_REQUIRED',
                  message: 'User password required to decrypt document'
                }
              });
            }

            // Decrypt document
            const decryptResult = await this.encryptedDocumentService.getDecryptedDocument(
              documentId,
              {
                userId: user.id,
                userPassword,
                organizationId: user.organization_id,
                includeContent: true,
                auditAccess: true
              }
            );

            if (decryptResult.success) {
              // Replace encrypted content with decrypted content
              data.data = {
                ...data.data,
                ...decryptResult.data,
                decrypted: true
              };
            } else {
              return originalJson.call(res, decryptResult);
            }
          }

          return originalJson.call(res, data);

        } catch (error) {
          this.log(`Document decryption failed: ${error.message}`, 'error');
          return originalJson.call(res, {
            success: false,
            error: {
              code: 'DECRYPTION_FAILED',
              message: 'Failed to decrypt document'
            }
          });
        }
      };

      next();

    } catch (error) {
      this.log(`Document retrieval middleware error: ${error.message}`, 'error');
      res.status(500).json({
        success: false,
        error: {
          code: 'RETRIEVAL_MIDDLEWARE_ERROR',
          message: 'Document retrieval operation failed'
        }
      });
    }
  }

  /**
   * Handle document updates with re-encryption
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @param {Function} next - Next middleware
   */
  async handleDocumentUpdate(req, res, next) {
    try {
      const { body, user, params } = req;
      const documentId = params.id || params.documentId;

      if (!documentId || !user?.id) {
        return next();
      }

      // Check if document is encrypted
      const encryptionMetadata = await this.encryptedDocumentService.getDocumentEncryptionMetadata(documentId);
      
      if (encryptionMetadata && body.content) {
        const userPassword = req.headers[this.options.userPasswordHeader] || body.userPassword;
        
        if (!userPassword) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'USER_PASSWORD_REQUIRED',
              message: 'User password required to update encrypted document'
            }
          });
        }

        // Verify user has access
        const hasAccess = await this.encryptedDocumentService.userHasDocumentAccess(user.id, documentId);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'ACCESS_DENIED',
              message: 'User does not have access to update this encrypted document'
            }
          });
        }

        // Prepare for re-encryption
        req.reEncryptDocument = true;
        req.encryptionOptions = {
          userPassword,
          encryptionMetadata: {
            updatedVia: 'middleware',
            updatedAt: new Date().toISOString()
          }
        };
      }

      next();

    } catch (error) {
      this.log(`Document update middleware error: ${error.message}`, 'error');
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_MIDDLEWARE_ERROR',
          message: 'Document update operation failed'
        }
      });
    }
  }

  /**
   * Create middleware for document sharing
   * @returns {Function} Express middleware function
   */
  createDocumentSharingMiddleware() {
    return async (req, res, next) => {
      try {
        if (!this.initialized || req.method !== 'POST') {
          return next();
        }

        const { body, user, params } = req;
        const documentId = params.id || params.documentId || body.documentId;

        if (!documentId || !body.shareWith || !Array.isArray(body.shareWith)) {
          return next();
        }

        // Check if document is encrypted
        const encryptionMetadata = await this.encryptedDocumentService.getDocumentEncryptionMetadata(documentId);
        
        if (encryptionMetadata) {
          const userPassword = req.headers[this.options.userPasswordHeader] || body.userPassword;
          
          if (!userPassword) {
            return res.status(400).json({
              success: false,
              error: {
                code: 'USER_PASSWORD_REQUIRED',
                message: 'User password required to share encrypted document'
              }
            });
          }

          // Use encrypted document sharing
          try {
            const shareResult = await this.encryptedDocumentService.shareEncryptedDocument(
              documentId,
              body.shareWith,
              {
                userId: user.id,
                userPassword,
                permissions: body.permissions || ['read'],
                notifyRecipients: body.notifyRecipients !== false
              }
            );

            if (shareResult.success) {
              return res.json(shareResult);
            } else {
              return res.status(400).json(shareResult);
            }

          } catch (error) {
            this.log(`Encrypted document sharing failed: ${error.message}`, 'error');
            return res.status(500).json({
              success: false,
              error: {
                code: 'SHARING_FAILED',
                message: 'Failed to share encrypted document'
              }
            });
          }
        }

        next();

      } catch (error) {
        this.log(`Document sharing middleware error: ${error.message}`, 'error');
        res.status(500).json({
          success: false,
          error: {
            code: 'SHARING_MIDDLEWARE_ERROR',
            message: 'Document sharing operation failed'
          }
        });
      }
    };
  }

  /**
   * Create middleware for key management operations
   * @returns {Function} Express middleware function
   */
  createKeyManagementMiddleware() {
    return async (req, res, next) => {
      try {
        if (!this.initialized) {
          return next();
        }

        // Handle key generation requests
        if (req.path === '/api/encryption/keys' && req.method === 'POST') {
          const { user, body } = req;
          const { userPassword, keySize = 4096 } = body;

          if (!user?.id || !userPassword) {
            return res.status(400).json({
              success: false,
              error: {
                code: 'INVALID_REQUEST',
                message: 'User ID and password are required for key generation'
              }
            });
          }

          try {
            // Check if user already has keys
            const existingKey = await keyManager.getUserPublicKey(user.id);
            if (existingKey) {
              return res.status(409).json({
                success: false,
                error: {
                  code: 'KEYS_ALREADY_EXIST',
                  message: 'User already has encryption keys'
                }
              });
            }

            // Generate new key pair
            const keyPair = await encryptionService.generateKeyPair(user.id, userPassword);
            
            // Store keys
            const storeResult = await keyManager.storeUserKeyPair(
              user.id,
              keyPair.publicKey,
              keyPair.encryptedPrivateKey,
              userPassword,
              { keySize, generatedVia: 'middleware' }
            );

            return res.json({
              success: true,
              data: {
                keyId: storeResult.keyId,
                fingerprint: storeResult.fingerprint,
                createdAt: storeResult.createdAt
              }
            });

          } catch (error) {
            this.log(`Key generation failed: ${error.message}`, 'error');
            return res.status(500).json({
              success: false,
              error: {
                code: 'KEY_GENERATION_FAILED',
                message: 'Failed to generate encryption keys'
              }
            });
          }
        }

        // Handle key rotation requests
        if (req.path === '/api/encryption/keys/rotate' && req.method === 'POST') {
          const { user, body } = req;
          const { userPassword, keySize = 4096 } = body;

          if (!user?.id || !userPassword) {
            return res.status(400).json({
              success: false,
              error: {
                code: 'INVALID_REQUEST',
                message: 'User ID and password are required for key rotation'
              }
            });
          }

          try {
            const rotateResult = await keyManager.rotateUserKeys(user.id, userPassword, {
              keySize,
              backupOldKey: true,
              notifyContacts: true
            });

            return res.json({
              success: true,
              data: rotateResult
            });

          } catch (error) {
            this.log(`Key rotation failed: ${error.message}`, 'error');
            return res.status(500).json({
              success: false,
              error: {
                code: 'KEY_ROTATION_FAILED',
                message: 'Failed to rotate encryption keys'
              }
            });
          }
        }

        next();

      } catch (error) {
        this.log(`Key management middleware error: ${error.message}`, 'error');
        res.status(500).json({
          success: false,
          error: {
            code: 'KEY_MANAGEMENT_ERROR',
            message: 'Key management operation failed'
          }
        });
      }
    };
  }

  /**
   * Create group document encryption middleware
   * @returns {Function} Express middleware function
   */
  createGroupEncryptionMiddleware() {
    return async (req, res, next) => {
      try {
        if (!this.initialized) {
          return next();
        }

        const { body, user } = req;
        
        // Handle group document creation
        if (body.type === 'group' || body.isGroupDocument) {
          const groupMembers = body.groupMembers || body.members || [];
          
          if (groupMembers.length === 0) {
            return res.status(400).json({
              success: false,
              error: {
                code: 'NO_GROUP_MEMBERS',
                message: 'Group documents require at least one member'
              }
            });
          }

          // Validate all group members have encryption keys
          const memberKeys = [];
          for (const memberId of groupMembers) {
            const publicKey = await keyManager.getUserPublicKey(memberId);
            if (publicKey) {
              memberKeys.push(publicKey);
            } else {
              return res.status(400).json({
                success: false,
                error: {
                  code: 'MEMBER_NO_KEYS',
                  message: `Group member ${memberId} does not have encryption keys`
                }
              });
            }
          }

          // Set up group encryption options
          req.encryptionOptions = {
            ...req.encryptionOptions,
            recipientUserIds: groupMembers,
            isGroupDocument: true,
            groupMetadata: {
              groupId: body.groupId || generateSecureToken(16, 'hex'),
              groupName: body.groupName,
              memberCount: groupMembers.length
            }
          };
        }

        next();

      } catch (error) {
        this.log(`Group encryption middleware error: ${error.message}`, 'error');
        res.status(500).json({
          success: false,
          error: {
            code: 'GROUP_ENCRYPTION_ERROR',
            message: 'Group encryption operation failed'
          }
        });
      }
    };
  }

  /**
   * Check if request should be encrypted
   * @param {Object} req - Express request
   * @returns {boolean} Whether request should be encrypted
   */
  shouldEncryptRequest(req) {
    // Check path patterns
    const matchesPath = this.options.autoEncryptPaths.some(path => 
      req.path.startsWith(path)
    );

    // Check explicit headers
    const hasEncryptionHeader = req.headers[this.options.encryptionHeader] === 'true';
    
    // Check body flags
    const hasBodyFlag = req.body && (req.body.encrypt === true || req.body.is_encrypted === true);

    return matchesPath || hasEncryptionHeader || hasBodyFlag;
  }

  /**
   * Get middleware health status
   * @returns {Object} Health status
   */
  getHealthStatus() {
    return {
      status: this.initialized ? 'healthy' : 'not_initialized',
      initialized: this.initialized,
      services: {
        encryptionService: encryptionService.getHealthStatus(),
        keyManager: keyManager.getHealthStatus(),
        encryptedDocumentService: this.encryptedDocumentService?.getHealthStatus() || { status: 'not_initialized' }
      },
      options: {
        autoEncryptPaths: this.options.autoEncryptPaths,
        maxDocumentSize: this.options.maxDocumentSize,
        requireUserPassword: this.options.requireUserPassword
      }
    };
  }

  /**
   * Shutdown middleware and cleanup
   */
  async shutdown() {
    try {
      this.initialized = false;
      
      if (this.encryptedDocumentService) {
        // Clean up any resources
        this.encryptedDocumentService = null;
      }
      
      this.log('Encryption middleware shutdown completed');
      
    } catch (error) {
      this.log(`Shutdown error: ${error.message}`, 'error');
    }
  }

  /**
   * Log messages
   * @param {string} message - Log message
   * @param {string} level - Log level
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      component: 'EncryptionMiddleware',
      level,
      message
    };

    switch (level) {
      case 'error':
        console.error('[EncryptionMiddleware]', logData);
        break;
      case 'warn':
        console.warn('[EncryptionMiddleware]', logData);
        break;
      default:
        console.log('[EncryptionMiddleware]', logData);
    }
  }
}

// Export singleton instance
const encryptionMiddleware = new EncryptionMiddleware();
export default encryptionMiddleware;

// Export class for testing
export { EncryptionMiddleware };