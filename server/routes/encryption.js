/**
 * Encryption API Routes
 * 
 * Provides REST API endpoints for client-side encryption operations,
 * key management, and document encryption services.
 */

import express from 'express';
import encryptionService from '../security/EncryptionService.js';
import keyManager from '../security/KeyManager.js';
import { EncryptedDocumentService } from '../services/db/encryptedDocumentService.js';
import { generateSecureToken } from '../utils/crypto.js';

const router = express.Router();

// Initialize services
let encryptedDocumentService;

/**
 * Initialize encryption routes
 */
async function initializeEncryptionRoutes() {
  try {
    await encryptionService.initialize();
    await keyManager.initialize();
    
    encryptedDocumentService = new EncryptedDocumentService();
    await encryptedDocumentService.initializeEncryption();
    
    console.log('Encryption routes initialized successfully');
  } catch (error) {
    console.error('Failed to initialize encryption routes:', error);
    throw error;
  }
}

/**
 * Authentication middleware
 */
function requireAuth(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required for encryption operations'
      }
    });
  }
  next();
}

/**
 * Validate user password middleware
 */
function validateUserPassword(req, res, next) {
  const userPassword = req.headers['x-user-password'] || req.body.userPassword;
  
  if (!userPassword) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'USER_PASSWORD_REQUIRED',
        message: 'User password is required for this operation'
      }
    });
  }
  
  req.userPassword = userPassword;
  next();
}

// Key Management Endpoints

/**
 * Generate encryption keys for user
 * POST /api/encryption/keys
 */
router.post('/keys', requireAuth, validateUserPassword, async (req, res) => {
  try {
    const { user, userPassword } = req;
    const { keySize = 4096, backupKey = true } = req.body;

    // Check if user already has keys
    const existingKey = await keyManager.getUserPublicKey(user.id);
    if (existingKey) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'KEYS_ALREADY_EXIST',
          message: 'User already has encryption keys. Use rotation endpoint to update keys.'
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
      { 
        keySize, 
        generatedVia: 'api',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    );

    // Create backup if requested
    let backupResult = null;
    if (backupKey) {
      try {
        backupResult = await keyManager.backupKeys(user.id, userPassword, {
          includePrivateKey: true,
          backupReason: 'initial_generation'
        });
      } catch (backupError) {
        console.warn('Failed to create key backup:', backupError.message);
      }
    }

    res.json({
      success: true,
      data: {
        keyId: storeResult.keyId,
        fingerprint: storeResult.fingerprint,
        publicKey: keyPair.publicKey,
        createdAt: storeResult.createdAt,
        backup: backupResult ? {
          created: true,
          backupId: backupResult.backupId
        } : null
      }
    });

  } catch (error) {
    console.error('Key generation failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'KEY_GENERATION_FAILED',
        message: error.message
      }
    });
  }
});

/**
 * Get user's public key
 * GET /api/encryption/keys/public
 */
router.get('/keys/public', requireAuth, async (req, res) => {
  try {
    const { user } = req;
    const { includeFingerprint = true } = req.query;

    const publicKey = await keyManager.getUserPublicKey(user.id);
    
    if (!publicKey) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NO_PUBLIC_KEY',
          message: 'User does not have encryption keys'
        }
      });
    }

    const response = {
      success: true,
      data: {
        publicKey,
        userId: user.id
      }
    };

    if (includeFingerprint) {
      const fingerprint = await keyManager.getUserKeyFingerprint(user.id);
      response.data.fingerprint = fingerprint;
    }

    res.json(response);

  } catch (error) {
    console.error('Failed to get public key:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PUBLIC_KEY_RETRIEVAL_FAILED',
        message: error.message
      }
    });
  }
});

/**
 * Get public keys for multiple users
 * POST /api/encryption/keys/public/batch
 */
router.post('/keys/public/batch', requireAuth, async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_USER_IDS',
          message: 'userIds must be a non-empty array'
        }
      });
    }

    const publicKeys = [];
    
    for (const userId of userIds) {
      try {
        const publicKey = await keyManager.getUserPublicKey(userId);
        const fingerprint = await keyManager.getUserKeyFingerprint(userId);
        
        if (publicKey) {
          publicKeys.push({
            userId,
            publicKey,
            fingerprint
          });
        }
      } catch (error) {
        console.warn(`Failed to get public key for user ${userId}:`, error.message);
      }
    }

    res.json({
      success: true,
      data: {
        publicKeys,
        found: publicKeys.length,
        requested: userIds.length
      }
    });

  } catch (error) {
    console.error('Batch public key retrieval failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'BATCH_KEY_RETRIEVAL_FAILED',
        message: error.message
      }
    });
  }
});

/**
 * Rotate user's encryption keys
 * POST /api/encryption/keys/rotate
 */
router.post('/keys/rotate', requireAuth, validateUserPassword, async (req, res) => {
  try {
    const { user, userPassword } = req;
    const { keySize = 4096, backupOldKey = true } = req.body;

    const rotateResult = await keyManager.rotateUserKeys(user.id, userPassword, {
      keySize,
      backupOldKey,
      notifyContacts: true
    });

    res.json({
      success: true,
      data: rotateResult
    });

  } catch (error) {
    console.error('Key rotation failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'KEY_ROTATION_FAILED',
        message: error.message
      }
    });
  }
});

/**
 * Verify user password
 * POST /api/encryption/keys/verify
 */
router.post('/keys/verify', requireAuth, validateUserPassword, async (req, res) => {
  try {
    const { user, userPassword } = req;

    const isValid = await keyManager.verifyUserPassword(user.id, userPassword);

    res.json({
      success: true,
      data: {
        valid: isValid,
        userId: user.id
      }
    });

  } catch (error) {
    console.error('Password verification failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PASSWORD_VERIFICATION_FAILED',
        message: error.message
      }
    });
  }
});

// Document Encryption Endpoints

/**
 * Create encrypted document
 * POST /api/encryption/documents
 */
router.post('/documents', requireAuth, validateUserPassword, async (req, res) => {
  try {
    const { user, userPassword } = req;
    const { 
      title, 
      content, 
      shareWith = [], 
      organizationId,
      tags = [],
      metadata = {} 
    } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CONTENT_REQUIRED',
          message: 'Document content is required'
        }
      });
    }

    const documentData = {
      title,
      content,
      user_id: user.id,
      organization_id: organizationId || user.organization_id,
      tags,
      metadata
    };

    const result = await encryptedDocumentService.createEncryptedDocument(documentData, {
      recipientUserIds: shareWith,
      encryptContent: true,
      userPassword,
      encryptionMetadata: {
        createdVia: 'api',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        ...metadata
      }
    });

    res.status(result.success ? 201 : 400).json(result);

  } catch (error) {
    console.error('Encrypted document creation failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DOCUMENT_CREATION_FAILED',
        message: error.message
      }
    });
  }
});

/**
 * Get encrypted document (with decryption)
 * GET /api/encryption/documents/:id
 */
router.get('/documents/:id', requireAuth, async (req, res) => {
  try {
    const { user } = req;
    const { id } = req.params;
    const userPassword = req.headers['x-user-password'] || req.query.userPassword;
    const { includeContent = 'true' } = req.query;

    const result = await encryptedDocumentService.getDecryptedDocument(id, {
      userId: user.id,
      userPassword,
      organizationId: user.organization_id,
      includeContent: includeContent === 'true',
      auditAccess: true
    });

    res.status(result.success ? 200 : (result.error?.code === 'ACCESS_DENIED' ? 403 : 400)).json(result);

  } catch (error) {
    console.error('Document retrieval failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DOCUMENT_RETRIEVAL_FAILED',
        message: error.message
      }
    });
  }
});

/**
 * Share encrypted document
 * POST /api/encryption/documents/:id/share
 */
router.post('/documents/:id/share', requireAuth, validateUserPassword, async (req, res) => {
  try {
    const { user, userPassword } = req;
    const { id } = req.params;
    const { shareWith, permissions = ['read'], notifyRecipients = true } = req.body;

    if (!Array.isArray(shareWith) || shareWith.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_RECIPIENTS',
          message: 'shareWith must be a non-empty array of user IDs'
        }
      });
    }

    const result = await encryptedDocumentService.shareEncryptedDocument(id, shareWith, {
      userId: user.id,
      userPassword,
      permissions,
      notifyRecipients
    });

    res.status(result.success ? 200 : 400).json(result);

  } catch (error) {
    console.error('Document sharing failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DOCUMENT_SHARING_FAILED',
        message: error.message
      }
    });
  }
});

/**
 * Revoke document access
 * POST /api/encryption/documents/:id/revoke
 */
router.post('/documents/:id/revoke', requireAuth, async (req, res) => {
  try {
    const { user } = req;
    const { id } = req.params;
    const { revokeUsers, reason = 'access_revoked' } = req.body;

    if (!Array.isArray(revokeUsers) || revokeUsers.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REVOKE_USERS',
          message: 'revokeUsers must be a non-empty array of user IDs'
        }
      });
    }

    const result = await encryptedDocumentService.revokeDocumentAccess(id, revokeUsers, {
      userId: user.id,
      reason
    });

    res.status(result.success ? 200 : 400).json(result);

  } catch (error) {
    console.error('Access revocation failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ACCESS_REVOCATION_FAILED',
        message: error.message
      }
    });
  }
});

// Utility Endpoints

/**
 * Generate client-side encryption parameters
 * POST /api/encryption/client/params
 */
router.post('/client/params', requireAuth, async (req, res) => {
  try {
    const { operation = 'encrypt' } = req.body;

    const params = {
      algorithms: {
        symmetric: 'AES-256-GCM',
        asymmetric: 'RSA-OAEP',
        hash: 'SHA-256',
        keyDerivation: 'Argon2id'
      },
      keyLengths: {
        aes: 256,
        rsa: 4096,
        iv: 128,
        salt: 256
      },
      parameters: {
        argon2: {
          iterations: 3,
          memory: 65536,
          parallelism: 1,
          hashLength: 32
        }
      }
    };

    if (operation === 'encrypt') {
      params.sessionId = generateSecureToken(16, 'hex');
      params.timestamp = new Date().toISOString();
    }

    res.json({
      success: true,
      data: params
    });

  } catch (error) {
    console.error('Failed to generate client params:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CLIENT_PARAMS_FAILED',
        message: error.message
      }
    });
  }
});

/**
 * Health check endpoint
 * GET /api/encryption/health
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        encryptionService: encryptionService.getHealthStatus(),
        keyManager: keyManager.getHealthStatus(),
        encryptedDocumentService: encryptedDocumentService?.getHealthStatus() || { status: 'not_initialized' }
      }
    };

    const allHealthy = Object.values(health.services).every(service => 
      service.status === 'healthy'
    );

    health.status = allHealthy ? 'healthy' : 'degraded';

    res.status(allHealthy ? 200 : 503).json({
      success: true,
      data: health
    });

  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: error.message
      }
    });
  }
});

/**
 * Get encryption statistics
 * GET /api/encryption/stats
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const { user } = req;

    // This would typically query the database for actual statistics
    // For now, return placeholder data
    const stats = {
      userId: user.id,
      hasEncryptionKeys: !!(await keyManager.getUserPublicKey(user.id)),
      keyFingerprint: await keyManager.getUserKeyFingerprint(user.id),
      encryptedDocuments: 0, // Would be queried from database
      sharedDocuments: 0,    // Would be queried from database
      lastKeyRotation: null  // Would be queried from database
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Failed to get encryption stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STATS_RETRIEVAL_FAILED',
        message: error.message
      }
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Encryption API error:', error);
  
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred in the encryption service'
    }
  });
});

// Initialize routes on startup
initializeEncryptionRoutes().catch(error => {
  console.error('Failed to initialize encryption routes:', error);
});

export default router;