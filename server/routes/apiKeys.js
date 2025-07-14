/**
 * API Keys Routes
 * 
 * Provides RESTful endpoints for managing API keys.
 * Includes creation, listing, updating, deletion, rotation, and statistics.
 */

import express from 'express';
import apiKeyManager from '../auth/ApiKeyManager.js';
import authManager from '../auth/AuthManager.js';
import { apiKeyAuth, requirePermissions } from '../middleware/apiKeyAuth.js';
import { maskApiKey, validateKeyStrength } from '../utils/apiKey.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

// Initialize API Key Manager
let apiKeyManagerInitialized = false;

const initializeApiKeyManager = async () => {
  if (!apiKeyManagerInitialized) {
    try {
      await apiKeyManager.initialize();
      apiKeyManagerInitialized = true;
    } catch (error) {
      console.error('Failed to initialize API Key Manager:', error);
    }
  }
};

// Initialize on first route access
router.use(async (req, res, next) => {
  if (!apiKeyManagerInitialized) {
    await initializeApiKeyManager();
  }
  next();
});

/**
 * GET /api/keys
 * List user's API keys
 */
router.get('/', authManager.middleware({ autoDetect: true }), async (req, res) => {
  try {
    const userId = req.userId;
    const organizationId = req.query.organization_id || req.user?.organizationId;
    
    const apiKeys = await apiKeyManager.getUserApiKeys(userId, organizationId);
    
    // Sanitize sensitive information
    const sanitizedKeys = apiKeys.map(key => ({
      id: key.id,
      prefix: key.key_prefix,
      name: key.name,
      description: key.description,
      permissions: key.permissions,
      scopes: key.scopes,
      status: key.status,
      isActive: key.is_active,
      rateLimitRequests: key.rate_limit_requests,
      rateLimitPeriod: key.rate_limit_period,
      expiresAt: key.expires_at,
      lastUsedAt: key.last_used_at,
      createdAt: key.created_at,
      totalRequests: key.total_requests || 0,
      maskedKey: maskApiKey(key.key_prefix + 'dummy')
    }));
    
    res.json({
      success: true,
      apiKeys: sanitizedKeys,
      total: sanitizedKeys.length,
      organization: organizationId || null
    });
    
  } catch (error) {
    console.error('Failed to list API keys:', error);
    res.status(500).json({
      error: 'Failed to retrieve API keys',
      code: 'LIST_ERROR'
    });
  }
});

/**
 * POST /api/keys
 * Create new API key
 */
router.post('/', 
  authManager.middleware({ autoDetect: true }),
  authorize(['api_keys:create:own', 'api_keys:create:organization'], 'OR'),
  async (req, res) => {
    try {
      const {
        name,
        description = '',
        permissions = [],
        scopes = ['read'],
        environment = 'test',
        rateLimitRequests = 1000,
        rateLimitPeriod = 'hour',
        rateLimitBurst = 100,
        expiresAt = null,
        organizationId = null
      } = req.body;
      
      // Validate required fields
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
          error: 'API key name is required',
          code: 'MISSING_NAME'
        });
      }
      
      // Validate permissions array
      if (!Array.isArray(permissions)) {
        return res.status(400).json({
          error: 'Permissions must be an array',
          code: 'INVALID_PERMISSIONS'
        });
      }
      
      // Validate scopes array
      if (!Array.isArray(scopes)) {
        return res.status(400).json({
          error: 'Scopes must be an array',
          code: 'INVALID_SCOPES'
        });
      }
      
      // Validate environment
      const validEnvironments = ['test', 'live', 'sandbox'];
      if (!validEnvironments.includes(environment)) {
        return res.status(400).json({
          error: 'Invalid environment. Must be test, live, or sandbox',
          code: 'INVALID_ENVIRONMENT'
        });
      }
      
      // Validate rate limit values
      if (rateLimitRequests <= 0 || rateLimitRequests > 100000) {
        return res.status(400).json({
          error: 'Rate limit requests must be between 1 and 100,000',
          code: 'INVALID_RATE_LIMIT'
        });
      }
      
      const validPeriods = ['minute', 'hour', 'day', 'month'];
      if (!validPeriods.includes(rateLimitPeriod)) {
        return res.status(400).json({
          error: 'Invalid rate limit period. Must be minute, hour, day, or month',
          code: 'INVALID_RATE_PERIOD'
        });
      }
      
      // Validate expiration date
      if (expiresAt && new Date(expiresAt) <= new Date()) {
        return res.status(400).json({
          error: 'Expiration date must be in the future',
          code: 'INVALID_EXPIRATION'
        });
      }
      
      const userId = req.userId;
      const finalOrgId = organizationId || req.user?.organizationId;
      
      const options = {
        description,
        scopes,
        environment,
        rateLimitRequests,
        rateLimitPeriod,
        rateLimitBurst,
        expiresAt,
        isActive: true
      };
      
      const result = await apiKeyManager.generateApiKey(
        userId,
        finalOrgId,
        name.trim(),
        permissions,
        options
      );
      
      res.status(201).json({
        success: true,
        message: 'API key created successfully',
        apiKey: {
          id: result.apiKey.id,
          key: result.apiKey.key,           // Full key shown only once!
          prefix: result.apiKey.prefix,
          name: result.apiKey.name,
          description: result.apiKey.description,
          permissions: result.apiKey.permissions,
          scopes: result.apiKey.scopes,
          environment: result.apiKey.environment,
          rateLimitRequests: result.apiKey.rateLimitRequests,
          rateLimitPeriod: result.apiKey.rateLimitPeriod,
          expiresAt: result.apiKey.expiresAt,
          createdAt: result.apiKey.createdAt
        },
        security: result.security,
        warning: 'Store this API key securely. It will not be displayed again.'
      });
      
    } catch (error) {
      console.error('Failed to create API key:', error);
      
      if (error.message.includes('permission')) {
        return res.status(403).json({
          error: error.message,
          code: 'PERMISSION_ERROR'
        });
      }
      
      res.status(500).json({
        error: 'Failed to create API key',
        code: 'CREATION_ERROR'
      });
    }
  }
);

/**
 * GET /api/keys/:id
 * Get specific API key details
 */
router.get('/:id', 
  authManager.middleware({ autoDetect: true }),
  async (req, res) => {
    try {
      const keyId = req.params.id;
      const userId = req.userId;
      
      // Get user's API keys to check ownership
      const userKeys = await apiKeyManager.getUserApiKeys(userId);
      const apiKey = userKeys.find(key => key.id === keyId);
      
      if (!apiKey) {
        return res.status(404).json({
          error: 'API key not found',
          code: 'KEY_NOT_FOUND'
        });
      }
      
      res.json({
        success: true,
        apiKey: {
          id: apiKey.id,
          prefix: apiKey.key_prefix,
          name: apiKey.name,
          description: apiKey.description,
          permissions: apiKey.permissions,
          scopes: apiKey.scopes,
          status: apiKey.status,
          isActive: apiKey.is_active,
          rateLimitRequests: apiKey.rate_limit_requests,
          rateLimitPeriod: apiKey.rate_limit_period,
          expiresAt: apiKey.expires_at,
          lastUsedAt: apiKey.last_used_at,
          createdAt: apiKey.created_at,
          totalRequests: apiKey.total_requests || 0,
          maskedKey: maskApiKey(apiKey.key_prefix + 'dummy')
        }
      });
      
    } catch (error) {
      console.error('Failed to get API key details:', error);
      res.status(500).json({
        error: 'Failed to retrieve API key details',
        code: 'GET_ERROR'
      });
    }
  }
);

/**
 * GET /api/keys/:id/stats
 * Get API key usage statistics
 */
router.get('/:id/stats', 
  authManager.middleware({ autoDetect: true }),
  async (req, res) => {
    try {
      const keyId = req.params.id;
      const userId = req.userId;
      
      const {
        start_date: startDate,
        end_date: endDate,
        group_by: groupBy = 'day',
        include_details: includeDetails = false
      } = req.query;
      
      // Verify user owns the API key
      const userKeys = await apiKeyManager.getUserApiKeys(userId);
      const apiKey = userKeys.find(key => key.id === keyId);
      
      if (!apiKey) {
        return res.status(404).json({
          error: 'API key not found',
          code: 'KEY_NOT_FOUND'
        });
      }
      
      const options = {
        startDate,
        endDate,
        groupBy,
        includeDetails: includeDetails === 'true'
      };
      
      const stats = await apiKeyManager.getApiKeyUsageStats(keyId, options);
      
      res.json({
        success: true,
        ...stats
      });
      
    } catch (error) {
      console.error('Failed to get API key stats:', error);
      res.status(500).json({
        error: 'Failed to retrieve usage statistics',
        code: 'STATS_ERROR'
      });
    }
  }
);

/**
 * PUT /api/keys/:id
 * Update API key metadata
 */
router.put('/:id', 
  authManager.middleware({ autoDetect: true }),
  authorize(['api_keys:update:own', 'api_keys:update:organization'], 'OR'),
  async (req, res) => {
    try {
      const keyId = req.params.id;
      const userId = req.userId;
      
      const allowedUpdates = [
        'name', 
        'description', 
        'permissions', 
        'scopes', 
        'rate_limit_requests', 
        'rate_limit_period', 
        'expires_at', 
        'is_active'
      ];
      
      const updates = {};
      for (const [key, value] of Object.entries(req.body)) {
        if (allowedUpdates.includes(key)) {
          updates[key] = value;
        }
      }
      
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          error: 'No valid updates provided',
          code: 'NO_UPDATES',
          allowedFields: allowedUpdates
        });
      }
      
      // Validate specific update fields
      if (updates.name && (typeof updates.name !== 'string' || updates.name.trim().length === 0)) {
        return res.status(400).json({
          error: 'Name must be a non-empty string',
          code: 'INVALID_NAME'
        });
      }
      
      if (updates.permissions && !Array.isArray(updates.permissions)) {
        return res.status(400).json({
          error: 'Permissions must be an array',
          code: 'INVALID_PERMISSIONS'
        });
      }
      
      if (updates.scopes && !Array.isArray(updates.scopes)) {
        return res.status(400).json({
          error: 'Scopes must be an array',
          code: 'INVALID_SCOPES'
        });
      }
      
      if (updates.rate_limit_requests && (updates.rate_limit_requests <= 0 || updates.rate_limit_requests > 100000)) {
        return res.status(400).json({
          error: 'Rate limit requests must be between 1 and 100,000',
          code: 'INVALID_RATE_LIMIT'
        });
      }
      
      if (updates.expires_at && new Date(updates.expires_at) <= new Date()) {
        return res.status(400).json({
          error: 'Expiration date must be in the future',
          code: 'INVALID_EXPIRATION'
        });
      }
      
      const result = await apiKeyManager.updateApiKey(keyId, userId, updates);
      
      res.json({
        success: true,
        message: result.message,
        updatedFields: result.updatedFields
      });
      
    } catch (error) {
      console.error('Failed to update API key:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: 'API key not found',
          code: 'KEY_NOT_FOUND'
        });
      }
      
      if (error.message.includes('permission')) {
        return res.status(403).json({
          error: error.message,
          code: 'PERMISSION_ERROR'
        });
      }
      
      res.status(500).json({
        error: 'Failed to update API key',
        code: 'UPDATE_ERROR'
      });
    }
  }
);

/**
 * DELETE /api/keys/:id
 * Revoke/delete API key
 */
router.delete('/:id', 
  authManager.middleware({ autoDetect: true }),
  authorize(['api_keys:delete:own', 'api_keys:delete:organization'], 'OR'),
  async (req, res) => {
    try {
      const keyId = req.params.id;
      const userId = req.userId;
      const { reason = 'User requested deletion' } = req.body;
      
      const result = await apiKeyManager.revokeApiKey(keyId, userId, reason);
      
      res.json({
        success: true,
        message: result.message,
        revokedKey: {
          id: result.revokedKey.id,
          prefix: result.revokedKey.prefix,
          name: result.revokedKey.name,
          revokedAt: result.revokedKey.revokedAt,
          reason: result.revokedKey.reason
        }
      });
      
    } catch (error) {
      console.error('Failed to revoke API key:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: 'API key not found',
          code: 'KEY_NOT_FOUND'
        });
      }
      
      if (error.message.includes('permission')) {
        return res.status(403).json({
          error: error.message,
          code: 'PERMISSION_ERROR'
        });
      }
      
      res.status(500).json({
        error: 'Failed to revoke API key',
        code: 'REVOKE_ERROR'
      });
    }
  }
);

/**
 * POST /api/keys/:id/rotate
 * Rotate API key (generate new key, keep metadata)
 */
router.post('/:id/rotate', 
  authManager.middleware({ autoDetect: true }),
  authorize(['api_keys:rotate:own', 'api_keys:rotate:organization'], 'OR'),
  async (req, res) => {
    try {
      const keyId = req.params.id;
      const userId = req.userId;
      const { reason = 'Security rotation', keep_old_active = false } = req.body;
      
      const options = {
        reason,
        keepOldKeyActive: keep_old_active
      };
      
      const result = await apiKeyManager.rotateApiKey(keyId, userId, options);
      
      res.json({
        success: true,
        message: result.message,
        newApiKey: {
          id: result.newApiKey.id,
          key: result.newApiKey.key,           // New full key shown only once!
          prefix: result.newApiKey.prefix,
          name: result.newApiKey.name,
          rotatedAt: result.newApiKey.rotatedAt,
          reason: result.newApiKey.reason
        },
        security: result.security,
        warning: 'Store this new API key securely. It will not be displayed again.'
      });
      
    } catch (error) {
      console.error('Failed to rotate API key:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: 'API key not found',
          code: 'KEY_NOT_FOUND'
        });
      }
      
      if (error.message.includes('permission')) {
        return res.status(403).json({
          error: error.message,
          code: 'PERMISSION_ERROR'
        });
      }
      
      res.status(500).json({
        error: 'Failed to rotate API key',
        code: 'ROTATION_ERROR'
      });
    }
  }
);

/**
 * POST /api/keys/:id/test
 * Test API key validity and permissions
 */
router.post('/:id/test', 
  authManager.middleware({ autoDetect: true }),
  async (req, res) => {
    try {
      const keyId = req.params.id;
      const userId = req.userId;
      
      // Verify user owns the API key
      const userKeys = await apiKeyManager.getUserApiKeys(userId);
      const apiKey = userKeys.find(key => key.id === keyId);
      
      if (!apiKey) {
        return res.status(404).json({
          error: 'API key not found',
          code: 'KEY_NOT_FOUND'
        });
      }
      
      // Check if key is active and not expired
      const isActive = apiKey.is_active && apiKey.status === 'active';
      const isExpired = apiKey.expires_at && new Date(apiKey.expires_at) < new Date();
      
      let status = 'valid';
      let issues = [];
      
      if (!isActive) {
        status = 'invalid';
        issues.push('API key is not active');
      }
      
      if (isExpired) {
        status = 'expired';
        issues.push('API key has expired');
      }
      
      // Check rate limit status
      const rateLimitResult = await apiKeyManager.checkRateLimit(keyId);
      
      res.json({
        success: true,
        test: {
          status,
          isValid: status === 'valid',
          issues,
          keyInfo: {
            id: apiKey.id,
            prefix: apiKey.key_prefix,
            name: apiKey.name,
            status: apiKey.status,
            isActive: apiKey.is_active,
            expiresAt: apiKey.expires_at,
            lastUsedAt: apiKey.last_used_at
          },
          rateLimitInfo: rateLimitResult.info,
          permissions: apiKey.permissions,
          scopes: apiKey.scopes,
          testedAt: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('Failed to test API key:', error);
      res.status(500).json({
        error: 'Failed to test API key',
        code: 'TEST_ERROR'
      });
    }
  }
);

/**
 * GET /api/keys/config
 * Get API key configuration and available options
 */
router.get('/config', async (req, res) => {
  try {
    res.json({
      success: true,
      config: {
        environments: ['test', 'live', 'sandbox'],
        rateLimitPeriods: ['minute', 'hour', 'day', 'month'],
        maxRateLimitRequests: 100000,
        defaultRateLimit: {
          requests: 1000,
          period: 'hour',
          burst: 100
        },
        keyFormat: {
          prefixes: {
            test: 'tlai_test_',
            live: 'tlai_live_',
            sandbox: 'tlai_sandbox_'
          },
          minLength: 64,
          maxLength: 128
        },
        permissions: {
          description: 'Available permissions that can be assigned to API keys',
          categories: [
            'documents', 'analytics', 'users', 'organizations', 
            'api_keys', 'conversations', 'uploads', 'settings', 'system'
          ]
        },
        scopes: ['read', 'write', 'admin'],
        limits: {
          maxKeysPerUser: 50,
          maxKeysPerOrganization: 200,
          maxNameLength: 100,
          maxDescriptionLength: 500
        }
      }
    });
    
  } catch (error) {
    console.error('Failed to get API key config:', error);
    res.status(500).json({
      error: 'Failed to retrieve configuration',
      code: 'CONFIG_ERROR'
    });
  }
});

/**
 * Development/Testing Routes
 */
if (process.env.NODE_ENV === 'development') {
  
  /**
   * POST /api/keys/dev/validate
   * Validate an API key directly (for testing)
   */
  router.post('/dev/validate', async (req, res) => {
    try {
      const { apiKey } = req.body;
      
      if (!apiKey) {
        return res.status(400).json({
          error: 'API key required for validation',
          code: 'MISSING_API_KEY'
        });
      }
      
      const context = {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: '/dev/validate',
        method: 'POST'
      };
      
      const result = await apiKeyManager.validateApiKey(apiKey, context);
      
      res.json({
        success: true,
        validation: result,
        maskedKey: maskApiKey(apiKey),
        strength: validateKeyStrength(apiKey)
      });
      
    } catch (error) {
      console.error('Failed to validate API key:', error);
      res.status(500).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR'
      });
    }
  });
  
  /**
   * GET /api/keys/dev/stats
   * Get overall API key system statistics
   */
  router.get('/dev/stats', async (req, res) => {
    try {
      // This would require additional database queries
      // For now, return basic info
      res.json({
        success: true,
        systemStats: {
          message: 'API Key system operational',
          initialized: apiKeyManagerInitialized,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('Failed to get system stats:', error);
      res.status(500).json({
        error: 'Failed to retrieve system statistics',
        code: 'SYSTEM_STATS_ERROR'
      });
    }
  });
}

export default router;