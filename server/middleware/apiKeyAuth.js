/**
 * API Key Authentication Middleware
 * 
 * Provides middleware for authenticating requests using API keys.
 * Handles key extraction, validation, rate limiting, and user context attachment.
 */

import apiKeyManager from '../auth/ApiKeyManager.js';
import { extractApiKey, isValidKeyFormat, maskApiKey } from '../utils/apiKey.js';

/**
 * API Key Authentication Middleware
 * @param {Object} options - Middleware options
 * @returns {Function} Express middleware function
 */
export function apiKeyAuth(options = {}) {
  const {
    required = true,                    // Whether API key is required
    permissions = [],                   // Required permissions
    scopes = [],                        // Required scopes
    rateLimitOverride = null,          // Override rate limit for specific routes
    logUsage = true,                   // Whether to log API usage
    skipPaths = [],                    // Paths to skip API key authentication
    errorHandler = null                // Custom error handler
  } = options;

  return async (req, res, next) => {
    const startTime = Date.now();
    
    try {
      // Skip authentication for certain paths
      if (skipPaths.some(path => req.path.startsWith(path))) {
        return next();
      }
      
      // Extract API key from request
      const apiKey = extractApiKey(req);
      
      // Handle missing API key
      if (!apiKey) {
        if (!required) {
          return next();
        }
        
        return handleAuthError(res, {
          error: 'API key required',
          code: 'MISSING_API_KEY',
          statusCode: 401
        }, errorHandler);
      }
      
      // Validate API key format
      if (!isValidKeyFormat(apiKey)) {
        return handleAuthError(res, {
          error: 'Invalid API key format',
          code: 'INVALID_API_KEY_FORMAT',
          statusCode: 401
        }, errorHandler);
      }
      
      // Build request context
      const context = buildRequestContext(req);
      
      // Validate API key with manager
      const validationResult = await apiKeyManager.validateApiKey(apiKey, context);
      
      if (!validationResult.valid) {
        return handleAuthError(res, {
          error: validationResult.error,
          code: validationResult.code,
          statusCode: validationResult.code === 'RATE_LIMIT_EXCEEDED' ? 429 : 401,
          rateLimitInfo: validationResult.rateLimitInfo
        }, errorHandler);
      }
      
      const { apiKey: keyInfo } = validationResult;
      
      // Check permissions if required
      if (permissions.length > 0) {
        const hasPermissions = checkPermissions(keyInfo.permissions, permissions);
        if (!hasPermissions.allowed) {
          return handleAuthError(res, {
            error: 'Insufficient permissions',
            code: 'INSUFFICIENT_PERMISSIONS',
            statusCode: 403,
            required: permissions,
            provided: keyInfo.permissions,
            missing: hasPermissions.missing
          }, errorHandler);
        }
      }
      
      // Check scopes if required
      if (scopes.length > 0) {
        const hasScopes = checkScopes(keyInfo.scopes, scopes);
        if (!hasScopes.allowed) {
          return handleAuthError(res, {
            error: 'Insufficient scopes',
            code: 'INSUFFICIENT_SCOPES',
            statusCode: 403,
            required: scopes,
            provided: keyInfo.scopes,
            missing: hasScopes.missing
          }, errorHandler);
        }
      }
      
      // Apply rate limit override if specified
      if (rateLimitOverride) {
        // TODO: Implement custom rate limiting
      }
      
      // Attach API key context to request
      req.apiKey = {
        id: keyInfo.id,
        prefix: keyInfo.prefix,
        name: keyInfo.name,
        permissions: keyInfo.permissions,
        scopes: keyInfo.scopes,
        userId: keyInfo.userId,
        organizationId: keyInfo.organizationId,
        rateLimitInfo: keyInfo.rateLimitInfo
      };
      
      // Attach user context (for compatibility with user auth middleware)
      req.user = {
        id: keyInfo.userId,
        organizationId: keyInfo.organizationId,
        apiKeyId: keyInfo.id,
        authType: 'api_key'
      };
      
      req.userId = keyInfo.userId;
      req.organizationId = keyInfo.organizationId;
      req.authMethod = 'api_key';
      
      // Set rate limit headers
      setRateLimitHeaders(res, keyInfo.rateLimitInfo);
      
      // Log successful authentication
      logAuthSuccess(req, keyInfo);
      
      // Set up response logging
      if (logUsage) {
        setupResponseLogging(req, res, keyInfo.id, startTime);
      }
      
      next();
      
    } catch (error) {
      console.error('[ApiKeyAuth] Authentication error:', error);
      
      return handleAuthError(res, {
        error: 'Authentication failed',
        code: 'AUTH_ERROR',
        statusCode: 500
      }, errorHandler);
    }
  };
}

/**
 * API Key Authentication Middleware (strict mode)
 * Always requires API key, no optional authentication
 */
export function requireApiKey(options = {}) {
  return apiKeyAuth({ ...options, required: true });
}

/**
 * API Key Authentication Middleware (optional mode)
 * API key authentication is optional
 */
export function optionalApiKey(options = {}) {
  return apiKeyAuth({ ...options, required: false });
}

/**
 * Middleware to check specific permissions
 * @param {Array} requiredPermissions - Required permissions
 * @param {string} logic - Permission logic ('AND' or 'OR')
 */
export function requirePermissions(requiredPermissions, logic = 'OR') {
  return apiKeyAuth({
    required: true,
    permissions: requiredPermissions,
    permissionLogic: logic
  });
}

/**
 * Middleware to check specific scopes
 * @param {Array} requiredScopes - Required scopes
 */
export function requireScopes(requiredScopes) {
  return apiKeyAuth({
    required: true,
    scopes: requiredScopes
  });
}

/**
 * Middleware to apply custom rate limits
 * @param {number} requests - Number of requests
 * @param {string} period - Time period (minute, hour, day)
 */
export function customRateLimit(requests, period = 'hour') {
  return apiKeyAuth({
    required: true,
    rateLimitOverride: { requests, period }
  });
}

/**
 * Combined middleware for user OR API key authentication
 * Allows either user session or API key authentication
 */
export function userOrApiKey(authManager, options = {}) {
  return async (req, res, next) => {
    // First try API key authentication
    const apiKey = extractApiKey(req);
    
    if (apiKey && isValidKeyFormat(apiKey)) {
      // Use API key authentication
      return apiKeyAuth(options)(req, res, next);
    }
    
    // Fall back to user authentication
    if (authManager && typeof authManager.middleware === 'function') {
      return authManager.middleware({ 
        required: options.required !== false,
        autoDetect: true 
      })(req, res, next);
    }
    
    // No authentication available
    if (options.required !== false) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'NO_AUTH',
        message: 'Provide either a valid API key or user session'
      });
    }
    
    next();
  };
}

// Helper functions

/**
 * Build request context for API key validation
 */
function buildRequestContext(req) {
  return {
    ip: getClientIP(req),
    userAgent: req.get('User-Agent') || 'unknown',
    referer: req.get('Referer'),
    endpoint: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    headers: req.headers
  };
}

/**
 * Get client IP address from request
 */
function getClientIP(req) {
  return req.ip || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         (req.connection?.socket ? req.connection.socket.remoteAddress : null) ||
         req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         'unknown';
}

/**
 * Check if API key has required permissions
 */
function checkPermissions(keyPermissions, requiredPermissions, logic = 'OR') {
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return { allowed: true, missing: [] };
  }
  
  const missing = requiredPermissions.filter(permission => 
    !keyPermissions.includes(permission)
  );
  
  let allowed = false;
  
  if (logic === 'AND') {
    allowed = missing.length === 0;
  } else { // OR logic
    allowed = requiredPermissions.some(permission => 
      keyPermissions.includes(permission)
    );
  }
  
  return { allowed, missing };
}

/**
 * Check if API key has required scopes
 */
function checkScopes(keyScopes, requiredScopes) {
  if (!requiredScopes || requiredScopes.length === 0) {
    return { allowed: true, missing: [] };
  }
  
  const missing = requiredScopes.filter(scope => 
    !keyScopes.includes(scope)
  );
  
  const allowed = missing.length === 0;
  
  return { allowed, missing };
}

/**
 * Set rate limit headers on response
 */
function setRateLimitHeaders(res, rateLimitInfo) {
  if (!rateLimitInfo) return;
  
  res.set({
    'X-RateLimit-Limit': rateLimitInfo.limit?.toString(),
    'X-RateLimit-Remaining': rateLimitInfo.remaining?.toString(),
    'X-RateLimit-Reset': rateLimitInfo.resetTime,
    'X-RateLimit-Period': rateLimitInfo.period
  });
  
  // Add Retry-After header if rate limited
  if (rateLimitInfo.remaining === 0) {
    const resetTime = new Date(rateLimitInfo.resetTime);
    const retryAfter = Math.ceil((resetTime.getTime() - Date.now()) / 1000);
    res.set('Retry-After', retryAfter.toString());
  }
}

/**
 * Handle authentication errors
 */
function handleAuthError(res, errorInfo, customHandler) {
  if (customHandler && typeof customHandler === 'function') {
    return customHandler(errorInfo, res);
  }
  
  const response = {
    error: errorInfo.error,
    code: errorInfo.code,
    timestamp: new Date().toISOString()
  };
  
  // Add additional error details for specific cases
  if (errorInfo.rateLimitInfo) {
    response.rateLimitInfo = errorInfo.rateLimitInfo;
  }
  
  if (errorInfo.required || errorInfo.missing) {
    response.details = {
      required: errorInfo.required,
      provided: errorInfo.provided,
      missing: errorInfo.missing
    };
  }
  
  return res.status(errorInfo.statusCode || 401).json(response);
}

/**
 * Log successful API key authentication
 */
function logAuthSuccess(req, keyInfo) {
  const logData = {
    timestamp: new Date().toISOString(),
    apiKeyId: keyInfo.id,
    apiKeyPrefix: keyInfo.prefix,
    userId: keyInfo.userId,
    organizationId: keyInfo.organizationId,
    endpoint: req.path,
    method: req.method,
    ip: getClientIP(req),
    userAgent: req.get('User-Agent')
  };
  
  console.log('[ApiKeyAuth] Authentication successful:', logData);
}

/**
 * Set up response logging for usage analytics
 */
function setupResponseLogging(req, res, apiKeyId, startTime) {
  const originalSend = res.send;
  const originalJson = res.json;
  
  // Track response size and time
  let responseSize = 0;
  
  res.send = function(body) {
    responseSize = Buffer.byteLength(body || '', 'utf8');
    logApiUsage(req, res, apiKeyId, startTime, responseSize);
    return originalSend.call(this, body);
  };
  
  res.json = function(obj) {
    const body = JSON.stringify(obj);
    responseSize = Buffer.byteLength(body, 'utf8');
    logApiUsage(req, res, apiKeyId, startTime, responseSize);
    return originalJson.call(this, obj);
  };
  
  // Handle response finish event
  res.on('finish', () => {
    if (responseSize === 0) {
      logApiUsage(req, res, apiKeyId, startTime, 0);
    }
  });
}

/**
 * Log API usage for analytics
 */
async function logApiUsage(req, res, apiKeyId, startTime, responseSize) {
  try {
    const responseTime = Date.now() - startTime;
    
    const context = buildRequestContext(req);
    const response = {
      statusCode: res.statusCode,
      size: responseSize,
      responseTime
    };
    
    // Log usage asynchronously to avoid blocking response
    setImmediate(async () => {
      try {
        await apiKeyManager.logUsage(apiKeyId, context, response);
      } catch (error) {
        console.error('[ApiKeyAuth] Failed to log usage:', error);
      }
    });
    
  } catch (error) {
    console.error('[ApiKeyAuth] Failed to set up usage logging:', error);
  }
}

/**
 * Middleware for development/testing to bypass API key auth
 */
export function bypassApiKeyAuth(req, res, next) {
  if (process.env.NODE_ENV === 'development' && process.env.BYPASS_API_KEY_AUTH === 'true') {
    // Set mock API key context
    req.apiKey = {
      id: 'dev-bypass',
      prefix: 'tlai_dev_bypass',
      name: 'Development Bypass',
      permissions: ['*'],
      scopes: ['read', 'write', 'admin'],
      userId: 'dev-user',
      organizationId: 'dev-org'
    };
    
    req.user = {
      id: 'dev-user',
      organizationId: 'dev-org',
      apiKeyId: 'dev-bypass',
      authType: 'api_key_bypass'
    };
    
    req.userId = 'dev-user';
    req.organizationId = 'dev-org';
    req.authMethod = 'api_key_bypass';
    
    console.log('[ApiKeyAuth] Development bypass active');
  }
  
  next();
}

/**
 * Error handler specifically for API key authentication
 */
export function apiKeyErrorHandler(err, req, res, next) {
  if (err.code && err.code.startsWith('API_KEY_')) {
    return res.status(err.statusCode || 401).json({
      error: err.message,
      code: err.code,
      timestamp: new Date().toISOString()
    });
  }
  
  next(err);
}

/**
 * Middleware to extract and validate API key without enforcing authentication
 * Useful for optional API key features
 */
export function extractApiKeyInfo(req, res, next) {
  const apiKey = extractApiKey(req);
  
  if (apiKey && isValidKeyFormat(apiKey)) {
    // Validate API key asynchronously but don't block request
    apiKeyManager.validateApiKey(apiKey, buildRequestContext(req))
      .then(result => {
        if (result.valid) {
          req.apiKeyInfo = result.apiKey;
        }
      })
      .catch(error => {
        console.warn('[ApiKeyAuth] Optional API key validation failed:', error.message);
      });
  }
  
  next();
}

export default apiKeyAuth;