/**
 * Document Encryption Service
 * 
 * Provides high-level encryption functionality for documents using hybrid encryption.
 * Implements per-document AES keys encrypted with per-user RSA keys.
 */

import crypto from 'crypto';
import forge from 'node-forge';
import { 
  generateAESKey, 
  encryptAES, 
  decryptAES, 
  secureRandom, 
  generateSecureToken,
  zeroBuffer,
  secureMemory,
  generateFingerprint,
  hashData
} from '../utils/crypto.js';

class EncryptionService {
  constructor() {
    this.initialized = false;
    this.keyCache = new Map(); // Cache for performance (with TTL)
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Initialize the encryption service
   * @param {Object} options - Service options
   */
  async initialize(options = {}) {
    try {
      this.options = {
        keySize: 4096,           // RSA key size
        cacheKeys: true,         // Enable key caching
        cacheTimeout: 5 * 60 * 1000, // Cache timeout
        ...options
      };
      
      this.initialized = true;
      this.log('EncryptionService initialized successfully');
      
      // Start cache cleanup
      this.startCacheCleanup();
      
    } catch (error) {
      throw new Error(`Failed to initialize EncryptionService: ${error.message}`);
    }
  }

  /**
   * Generate RSA key pair for a user
   * @param {string} userId - User identifier
   * @param {string} userPassword - User password for private key encryption
   * @returns {Promise<Object>} Generated key pair
   */
  async generateKeyPair(userId, userPassword) {
    this.ensureInitialized();
    
    try {
      this.log(`Generating RSA key pair for user: ${userId}`);
      
      // Generate RSA key pair using node-forge
      const keyPair = forge.pki.rsa.generateKeyPair({
        bits: this.options.keySize,
        workers: -1, // Use Web Workers if available
        workerScript: 'forge.worker.js'
      });
      
      // Convert to PEM format
      const publicKeyPem = forge.pki.publicKeyToPem(keyPair.publicKey);
      
      // Encrypt private key with user password
      const encryptedPrivateKeyPem = forge.pki.encryptRsaPrivateKey(
        keyPair.privateKey, 
        userPassword, 
        {
          algorithm: 'aes256',
          count: 10000,
          saltSize: 16
        }
      );
      
      // Generate key fingerprint for identification
      const publicKeyFingerprint = this.generateKeyFingerprint(publicKeyPem);
      
      // Create key metadata
      const keyMetadata = {
        userId,
        algorithm: 'RSA',
        keySize: this.options.keySize,
        fingerprint: publicKeyFingerprint,
        createdAt: new Date().toISOString(),
        version: 1
      };
      
      this.log(`RSA key pair generated for user ${userId}: ${publicKeyFingerprint}`);
      
      return {
        publicKey: publicKeyPem,
        encryptedPrivateKey: encryptedPrivateKeyPem,
        fingerprint: publicKeyFingerprint,
        metadata: keyMetadata
      };
      
    } catch (error) {
      this.log(`Failed to generate key pair for user ${userId}: ${error.message}`, 'error');
      throw new Error(`Key pair generation failed: ${error.message}`);
    }
  }

  /**
   * Generate a document encryption key
   * @returns {Buffer} Generated AES key (32 bytes)
   */
  generateDocumentKey() {
    try {
      const documentKey = generateAESKey();
      this.log('Document encryption key generated');
      return documentKey;
      
    } catch (error) {
      throw new Error(`Document key generation failed: ${error.message}`);
    }
  }

  /**
   * Encrypt document content for multiple recipients
   * @param {Buffer|string} content - Document content to encrypt
   * @param {Array<string>} recipientPublicKeys - Array of recipient public keys (PEM format)
   * @param {Object} options - Encryption options
   * @returns {Promise<Object>} Encryption result
   */
  async encryptDocument(content, recipientPublicKeys, options = {}) {
    this.ensureInitialized();
    
    try {
      const {
        documentId = generateSecureToken(16, 'hex'),
        metadata = {},
        compressionEnabled = true
      } = options;
      
      this.log(`Encrypting document ${documentId} for ${recipientPublicKeys.length} recipients`);
      
      // Convert content to buffer if string
      let contentBuffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
      
      // Compress content if enabled and beneficial
      if (compressionEnabled && contentBuffer.length > 1024) {
        const zlib = await import('zlib');
        contentBuffer = await new Promise((resolve, reject) => {
          zlib.gzip(contentBuffer, (err, compressed) => {
            if (err) reject(err);
            else resolve(compressed);
          });
        });
        metadata.compressed = true;
      }
      
      // Generate document encryption key
      const documentKey = this.generateDocumentKey();
      
      // Encrypt document content with AES
      const encryptedContent = encryptAES(contentBuffer, documentKey);
      
      // Encrypt document key for each recipient
      const encryptedKeys = [];
      for (const publicKeyPem of recipientPublicKeys) {
        try {
          const encryptedKey = await this.encryptKeyForRecipient(documentKey, publicKeyPem);
          const recipientFingerprint = this.generateKeyFingerprint(publicKeyPem);
          
          encryptedKeys.push({
            recipientFingerprint,
            encryptedKey: encryptedKey.toString('base64'),
            algorithm: 'RSA-OAEP'
          });
          
        } catch (error) {
          this.log(`Failed to encrypt key for recipient: ${error.message}`, 'warn');
          // Continue with other recipients
        }
      }
      
      if (encryptedKeys.length === 0) {
        throw new Error('Failed to encrypt document key for any recipients');
      }
      
      // Clear document key from memory
      zeroBuffer(documentKey);
      
      // Create encryption metadata
      const encryptionMetadata = {
        documentId,
        algorithm: 'AES-256-GCM',
        keyAlgorithm: 'RSA-OAEP',
        version: 1,
        encryptedAt: new Date().toISOString(),
        recipients: encryptedKeys.length,
        contentFingerprint: generateFingerprint(content),
        ...metadata
      };
      
      // Package encrypted result
      const result = {
        documentId,
        encryptedContent: {
          algorithm: encryptedContent.algorithm,
          iv: encryptedContent.iv.toString('base64'),
          authTag: encryptedContent.authTag.toString('base64'),
          encrypted: encryptedContent.encrypted.toString('base64')
        },
        encryptedKeys,
        metadata: encryptionMetadata
      };
      
      this.log(`Document ${documentId} encrypted successfully for ${encryptedKeys.length} recipients`);
      
      return result;
      
    } catch (error) {
      this.log(`Document encryption failed: ${error.message}`, 'error');
      throw new Error(`Document encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt document content for a specific user
   * @param {Object} encryptedDocument - Encrypted document package
   * @param {string} userPrivateKeyPem - User's private key (PEM format)
   * @param {string} privateKeyPassword - Password for private key
   * @returns {Promise<Buffer>} Decrypted content
   */
  async decryptDocument(encryptedDocument, userPrivateKeyPem, privateKeyPassword) {
    this.ensureInitialized();
    
    try {
      const { documentId, encryptedContent, encryptedKeys, metadata } = encryptedDocument;
      
      this.log(`Decrypting document ${documentId}`);
      
      // Find encrypted key for this user
      const userFingerprint = this.generatePrivateKeyFingerprint(userPrivateKeyPem);
      const userEncryptedKey = encryptedKeys.find(key => 
        key.recipientFingerprint === userFingerprint
      );
      
      if (!userEncryptedKey) {
        throw new Error('User not authorized to decrypt this document');
      }
      
      // Decrypt the document key
      const documentKey = await this.decryptKeyForUser(
        Buffer.from(userEncryptedKey.encryptedKey, 'base64'),
        userPrivateKeyPem,
        privateKeyPassword
      );
      
      // Decrypt document content
      const iv = Buffer.from(encryptedContent.iv, 'base64');
      const authTag = Buffer.from(encryptedContent.authTag, 'base64');
      const encrypted = Buffer.from(encryptedContent.encrypted, 'base64');
      
      let decryptedContent = decryptAES(encrypted, documentKey, iv, authTag);
      
      // Clear document key from memory
      zeroBuffer(documentKey);
      
      // Decompress if needed
      if (metadata.compressed) {
        const zlib = await import('zlib');
        decryptedContent = await new Promise((resolve, reject) => {
          zlib.gunzip(decryptedContent, (err, decompressed) => {
            if (err) reject(err);
            else resolve(decompressed);
          });
        });
      }
      
      this.log(`Document ${documentId} decrypted successfully`);
      
      return decryptedContent;
      
    } catch (error) {
      this.log(`Document decryption failed: ${error.message}`, 'error');
      throw new Error(`Document decryption failed: ${error.message}`);
    }
  }

  /**
   * Share document key with additional recipients
   * @param {Object} encryptedDocument - Original encrypted document
   * @param {Array<string>} newRecipientPublicKeys - New recipient public keys
   * @param {string} userPrivateKeyPem - Current user's private key
   * @param {string} privateKeyPassword - Private key password
   * @returns {Promise<Object>} Updated encrypted document
   */
  async shareDocumentKey(encryptedDocument, newRecipientPublicKeys, userPrivateKeyPem, privateKeyPassword) {
    this.ensureInitialized();
    
    try {
      const { documentId, encryptedKeys } = encryptedDocument;
      
      this.log(`Sharing document ${documentId} with ${newRecipientPublicKeys.length} new recipients`);
      
      // First decrypt the document key using current user's private key
      const userFingerprint = this.generatePrivateKeyFingerprint(userPrivateKeyPem);
      const userEncryptedKey = encryptedKeys.find(key => 
        key.recipientFingerprint === userFingerprint
      );
      
      if (!userEncryptedKey) {
        throw new Error('User not authorized to share this document');
      }
      
      // Decrypt document key
      const documentKey = await this.decryptKeyForUser(
        Buffer.from(userEncryptedKey.encryptedKey, 'base64'),
        userPrivateKeyPem,
        privateKeyPassword
      );
      
      // Encrypt document key for new recipients
      const newEncryptedKeys = [];
      for (const publicKeyPem of newRecipientPublicKeys) {
        try {
          const encryptedKey = await this.encryptKeyForRecipient(documentKey, publicKeyPem);
          const recipientFingerprint = this.generateKeyFingerprint(publicKeyPem);
          
          // Check if recipient already has access
          const existingKey = encryptedKeys.find(key => 
            key.recipientFingerprint === recipientFingerprint
          );
          
          if (!existingKey) {
            newEncryptedKeys.push({
              recipientFingerprint,
              encryptedKey: encryptedKey.toString('base64'),
              algorithm: 'RSA-OAEP'
            });
          }
          
        } catch (error) {
          this.log(`Failed to encrypt key for new recipient: ${error.message}`, 'warn');
        }
      }
      
      // Clear document key from memory
      zeroBuffer(documentKey);
      
      if (newEncryptedKeys.length === 0) {
        throw new Error('No new recipients could be added');
      }
      
      // Update encrypted document
      const updatedDocument = {
        ...encryptedDocument,
        encryptedKeys: [...encryptedKeys, ...newEncryptedKeys],
        metadata: {
          ...encryptedDocument.metadata,
          recipients: encryptedKeys.length + newEncryptedKeys.length,
          lastSharedAt: new Date().toISOString(),
          sharedBy: userFingerprint
        }
      };
      
      this.log(`Document ${documentId} shared with ${newEncryptedKeys.length} new recipients`);
      
      return updatedDocument;
      
    } catch (error) {
      this.log(`Document sharing failed: ${error.message}`, 'error');
      throw new Error(`Document sharing failed: ${error.message}`);
    }
  }

  /**
   * Revoke access for specific recipients
   * @param {Object} encryptedDocument - Original encrypted document
   * @param {Array<string>} revokeFingerprints - Fingerprints of recipients to revoke
   * @returns {Object} Updated encrypted document
   */
  revokeDocumentAccess(encryptedDocument, revokeFingerprints) {
    try {
      const { documentId, encryptedKeys } = encryptedDocument;
      
      this.log(`Revoking access to document ${documentId} for ${revokeFingerprints.length} recipients`);
      
      // Filter out revoked recipients
      const remainingKeys = encryptedKeys.filter(key => 
        !revokeFingerprints.includes(key.recipientFingerprint)
      );
      
      if (remainingKeys.length === 0) {
        throw new Error('Cannot revoke access for all recipients');
      }
      
      const revokedCount = encryptedKeys.length - remainingKeys.length;
      
      const updatedDocument = {
        ...encryptedDocument,
        encryptedKeys: remainingKeys,
        metadata: {
          ...encryptedDocument.metadata,
          recipients: remainingKeys.length,
          lastRevokedAt: new Date().toISOString(),
          revokedCount
        }
      };
      
      this.log(`Access revoked for ${revokedCount} recipients from document ${documentId}`);
      
      return updatedDocument;
      
    } catch (error) {
      this.log(`Access revocation failed: ${error.message}`, 'error');
      throw new Error(`Access revocation failed: ${error.message}`);
    }
  }

  /**
   * Re-encrypt document with new key (for key rotation)
   * @param {Object} encryptedDocument - Original encrypted document
   * @param {Array<string>} recipientPublicKeys - Current recipient public keys
   * @param {string} userPrivateKeyPem - User's private key for decryption
   * @param {string} privateKeyPassword - Private key password
   * @returns {Promise<Object>} Re-encrypted document
   */
  async reEncryptDocument(encryptedDocument, recipientPublicKeys, userPrivateKeyPem, privateKeyPassword) {
    this.ensureInitialized();
    
    try {
      const { documentId } = encryptedDocument;
      
      this.log(`Re-encrypting document ${documentId}`);
      
      // Decrypt content
      const decryptedContent = await this.decryptDocument(
        encryptedDocument, 
        userPrivateKeyPem, 
        privateKeyPassword
      );
      
      // Re-encrypt with new key
      const reEncryptedDocument = await this.encryptDocument(
        decryptedContent,
        recipientPublicKeys,
        {
          documentId,
          metadata: {
            ...encryptedDocument.metadata,
            reEncryptedAt: new Date().toISOString(),
            version: (encryptedDocument.metadata.version || 1) + 1
          }
        }
      );
      
      // Clear decrypted content
      zeroBuffer(decryptedContent);
      
      this.log(`Document ${documentId} re-encrypted successfully`);
      
      return reEncryptedDocument;
      
    } catch (error) {
      this.log(`Document re-encryption failed: ${error.message}`, 'error');
      throw new Error(`Document re-encryption failed: ${error.message}`);
    }
  }

  // Private helper methods

  /**
   * Encrypt a key for a specific recipient
   * @param {Buffer} key - Key to encrypt
   * @param {string} publicKeyPem - Recipient's public key
   * @returns {Promise<Buffer>} Encrypted key
   */
  async encryptKeyForRecipient(key, publicKeyPem) {
    try {
      const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
      const encrypted = publicKey.encrypt(key.toString('binary'), 'RSA-OAEP', {
        md: forge.md.sha256.create(),
        mgf1: forge.mgf.mgf1.create(forge.md.sha256.create())
      });
      
      return Buffer.from(encrypted, 'binary');
      
    } catch (error) {
      throw new Error(`Key encryption for recipient failed: ${error.message}`);
    }
  }

  /**
   * Decrypt a key for a user
   * @param {Buffer} encryptedKey - Encrypted key
   * @param {string} privateKeyPem - User's private key
   * @param {string} password - Private key password
   * @returns {Promise<Buffer>} Decrypted key
   */
  async decryptKeyForUser(encryptedKey, privateKeyPem, password) {
    try {
      const privateKey = forge.pki.decryptRsaPrivateKey(privateKeyPem, password);
      if (!privateKey) {
        throw new Error('Invalid private key password');
      }
      
      const decrypted = privateKey.decrypt(encryptedKey.toString('binary'), 'RSA-OAEP', {
        md: forge.md.sha256.create(),
        mgf1: forge.mgf.mgf1.create(forge.md.sha256.create())
      });
      
      return Buffer.from(decrypted, 'binary');
      
    } catch (error) {
      throw new Error(`Key decryption failed: ${error.message}`);
    }
  }

  /**
   * Generate fingerprint for public key
   * @param {string} publicKeyPem - Public key in PEM format
   * @returns {string} Key fingerprint
   */
  generateKeyFingerprint(publicKeyPem) {
    try {
      const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
      const publicKeyBytes = forge.asn1.toDer(forge.pki.publicKeyToAsn1(publicKey)).getBytes();
      const hash = forge.md.sha256.create();
      hash.update(publicKeyBytes);
      return hash.digest().toHex().slice(0, 16); // First 16 chars of SHA-256
      
    } catch (error) {
      throw new Error(`Fingerprint generation failed: ${error.message}`);
    }
  }

  /**
   * Generate fingerprint for private key (derives from public key)
   * @param {string} privateKeyPem - Private key in PEM format
   * @returns {string} Key fingerprint
   */
  generatePrivateKeyFingerprint(privateKeyPem) {
    try {
      const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
      const publicKey = forge.pki.setRsaPublicKey(privateKey.n, privateKey.e);
      const publicKeyPem = forge.pki.publicKeyToPem(publicKey);
      return this.generateKeyFingerprint(publicKeyPem);
      
    } catch (error) {
      throw new Error(`Private key fingerprint generation failed: ${error.message}`);
    }
  }

  /**
   * Start cache cleanup timer
   */
  startCacheCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.keyCache.entries()) {
        if (now - entry.timestamp > this.cacheTimeout) {
          // Clear sensitive data before deletion
          if (entry.data && Buffer.isBuffer(entry.data)) {
            zeroBuffer(entry.data);
          }
          this.keyCache.delete(key);
        }
      }
    }, this.cacheTimeout / 2); // Clean up every half cache timeout
  }

  /**
   * Ensure service is initialized
   */
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('EncryptionService not initialized. Call initialize() first.');
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
      component: 'EncryptionService',
      level,
      message
    };

    switch (level) {
      case 'error':
        console.error('[EncryptionService]', logData);
        break;
      case 'warn':
        console.warn('[EncryptionService]', logData);
        break;
      default:
        console.log('[EncryptionService]', logData);
    }
  }

  /**
   * Get service health status
   * @returns {Object} Health status
   */
  getHealthStatus() {
    return {
      status: this.initialized ? 'healthy' : 'not_initialized',
      initialized: this.initialized,
      cacheSize: this.keyCache.size,
      maxCacheSize: 1000,
      version: '1.0.0'
    };
  }

  /**
   * Shutdown service and clear caches
   */
  shutdown() {
    try {
      // Clear sensitive data from cache
      for (const [key, entry] of this.keyCache.entries()) {
        if (entry.data && Buffer.isBuffer(entry.data)) {
          zeroBuffer(entry.data);
        }
      }
      
      this.keyCache.clear();
      this.initialized = false;
      
      this.log('EncryptionService shutdown completed');
      
    } catch (error) {
      this.log(`Shutdown error: ${error.message}`, 'error');
    }
  }
}

// Export singleton instance
const encryptionService = new EncryptionService();
export default encryptionService;