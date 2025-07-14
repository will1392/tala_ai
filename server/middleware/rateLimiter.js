/**
 * Rate Limiter Middleware for Tala AI
 * 
 * Provides Redis-based rate limiting with:
 * - IP-based rate limiting
 * - User-based rate limiting
 * - API key-based rate limiting
 * - Configurable time windows
 * - Different limits for different endpoints
 * - Graceful fallback when Redis is unavailable
 */

import { cacheService } from '../services/cache/cacheService.js';
import cacheKeys from '../services/cache/cacheKeys.js';
import { extractApiKey, isValidKeyFormat } from '../utils/apiKey.js';

/**
 * Rate limiting configurations for different endpoints
 */
const RATE_LIMIT_CONFIGS = {
  // Global default limits
  default: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 1000,          // requests per window
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },

  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 10,            // 10 attempts per window
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },

  // LLM API endpoints (more restrictive)
  llm: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 60,           // 60 requests per minute
    skipSuccessfulRequests: false,
    skipFailedRequests: true   // Don't count failed requests
  },

  // Search endpoints
  search: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 100,          // 100 searches per minute
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },

  // File upload endpoints
  upload: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 20,           // 20 uploads per minute
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },

  // Admin endpoints (very restrictive)
  admin: {
    windowMs: 5 * 60 * 1000,   // 5 minutes
    maxRequests: 100,          // 100 requests per 5 minutes
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },

  // API key management endpoints
  api_keys: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 50,           // 50 requests per minute
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },

  // High-frequency API endpoints for premium API keys
  premium: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 10000,        // 10,000 requests per minute
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  }
};

/**
 * Rate limiter class
 */
export class RateLimiter {
  constructor(options = {}) {
    this.options = {
      enabled: options.enabled !== false,
      logRequests: options.logRequests === true,
      trustProxy: options.trustProxy === true,
      ...options
    };
  }

  /**
   * Get client identifier from request
   * @param {Object} req - Express request object
   * @returns {Object} Client identification info
   */
  getClientId(req) {
    // Priority order: API Key > User ID > IP Address
    
    // Check for API key first (for API-based rate limiting)
    const apiKey = extractApiKey(req);
    if (apiKey && isValidKeyFormat(apiKey)) {
      return {
        type: 'api-key',
        id: apiKey,
        identifier: apiKey,
        keyInfo: req.apiKey || null  // May have been set by apiKeyAuth middleware
      };
    }

    // Check for authenticated user
    if (req.user?.id) {
      return {
        type: 'user',
        id: req.user.id,
        identifier: req.user.id,
        organizationId: req.user.organizationId || null
      };
    }

    // Fall back to IP address
    let ip = req.ip;
    if (this.options.trustProxy) {
      ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
           req.headers['x-real-ip'] || 
           req.connection.remoteAddress || 
           req.ip;
    }

    return {
      type: 'ip',
      id: ip,
      identifier: ip
    };
  }

  /**
   * Get rate limit configuration for endpoint
   * @param {string} endpoint - Endpoint identifier
   * @param {Object} client - Client information (for API key custom limits)
   * @returns {Object} Rate limit configuration
   */
  getRateLimitConfig(endpoint, client = null) {
    // Use API key's custom rate limits if available
    if (client?.type === 'api-key' && client.keyInfo?.rateLimitInfo) {
      const keyInfo = client.keyInfo.rateLimitInfo;
      
      // Convert period to milliseconds
      let windowMs;
      switch (keyInfo.period) {
        case 'minute':
          windowMs = 60 * 1000;
          break;
        case 'hour':
          windowMs = 60 * 60 * 1000;
          break;
        case 'day':
          windowMs = 24 * 60 * 60 * 1000;
          break;
        case 'month':
          windowMs = 30 * 24 * 60 * 60 * 1000;
          break;
        default:
          windowMs = 60 * 60 * 1000; // Default to hour
      }
      
      return {
        windowMs,
        maxRequests: keyInfo.limit || 1000,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
        source: 'api_key_custom'
      };
    }
    
    return RATE_LIMIT_CONFIGS[endpoint] || RATE_LIMIT_CONFIGS.default;
  }

  /**
   * Generate cache key for rate limiting
   * @param {Object} client - Client identification info
   * @param {string} endpoint - Endpoint identifier
   * @param {number} windowStart - Window start time
   * @returns {string} Cache key
   */
  generateCacheKey(client, endpoint, windowStart) {
    switch (client.type) {
      case 'user':
        return cacheKeys.rateLimit.user(client.id, endpoint) + `:${windowStart}`;
      case 'api-key':
        return cacheKeys.rateLimit.apiKey(client.id, endpoint) + `:${windowStart}`;
      default:
        return cacheKeys.rateLimit.ip(client.id, endpoint) + `:${windowStart}`;
    }
  }

  /**
   * Get current request count for client
   * @param {string} cacheKey - Cache key
   * @returns {Promise<number>} Current request count
   */
  async getCurrentCount(cacheKey) {
    try {
      const count = await cacheService.get(cacheKey);
      return count ? parseInt(count) : 0;
    } catch (error) {
      console.warn('Rate limiter: Error getting count from cache:', error.message);
      return 0; // Fail open (allow request)
    }
  }

  /**
   * Increment request count
   * @param {string} cacheKey - Cache key
   * @param {number} windowMs - Window duration in milliseconds
   * @returns {Promise<number>} New request count
   */
  async incrementCount(cacheKey, windowMs) {
    try {
      // Use atomic increment if possible, otherwise get and set
      const newCount = await cacheService.increment(cacheKey, 1);
      
      if (newCount === 1) {
        // First request in window, set expiration
        await cacheService.expire(cacheKey, Math.ceil(windowMs / 1000));
      }
      
      return newCount;
    } catch (error) {
      console.warn('Rate limiter: Error incrementing count:', error.message);
      return 1; // Fail open (allow request)
    }
  }

  /**
   * Check if request should be rate limited
   * @param {Object} req - Express request object
   * @param {string} endpoint - Endpoint identifier
   * @returns {Promise<Object>} Rate limit result
   */
  async checkRateLimit(req, endpoint = 'default') {
    // If rate limiting is disabled, allow all requests
    if (!this.options.enabled) {
      return {
        allowed: true,
        remaining: Infinity,
        resetTime: Date.now() + 60000
      };
    }

    const client = this.getClientId(req);
    const config = this.getRateLimitConfig(endpoint, client);
    
    // Calculate current window
    const now = Date.now();
    const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
    const windowEnd = windowStart + config.windowMs;
    
    const cacheKey = this.generateCacheKey(client, endpoint, windowStart);
    
    try {
      // Get current count
      const currentCount = await this.getCurrentCount(cacheKey);
      
      // Check if limit exceeded
      if (currentCount >= config.maxRequests) {
        if (this.options.logRequests) {
          const clientId = client.type === 'api-key' ? 
            (client.keyInfo?.prefix || 'api-key') : client.id;
          console.log(`Rate limit exceeded for ${client.type} ${clientId} on ${endpoint}: ${currentCount}/${config.maxRequests} (source: ${config.source || 'default'})`);
        }
        
        return {
          allowed: false,
          remaining: 0,
          resetTime: windowEnd,
          retryAfter: Math.ceil((windowEnd - now) / 1000),
          limit: config.maxRequests,
          current: currentCount,
          window: config.windowMs / 1000,
          clientType: client.type,
          source: config.source || 'default'
        };
      }
      
      // Increment count
      const newCount = await this.incrementCount(cacheKey, config.windowMs);
      const remaining = Math.max(0, config.maxRequests - newCount);
      
      if (this.options.logRequests) {
        const clientId = client.type === 'api-key' ? 
          (client.keyInfo?.prefix || 'api-key') : client.id;
        console.log(`Rate limit check for ${client.type} ${clientId} on ${endpoint}: ${newCount}/${config.maxRequests} (source: ${config.source || 'default'})`);
      }
      
      return {
        allowed: true,
        remaining,
        resetTime: windowEnd,
        limit: config.maxRequests,
        current: newCount,
        window: config.windowMs / 1000,
        clientType: client.type,
        source: config.source || 'default'
      };
      
    } catch (error) {
      console.warn('Rate limiter: Error checking rate limit:', error.message);
      
      // Fail open (allow request) when cache is unavailable
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetTime: windowEnd,
        error: 'Cache unavailable'
      };
    }
  }

  /**
   * Create Express middleware for rate limiting
   * @param {string} endpoint - Endpoint identifier
   * @param {Object} options - Middleware options
   * @returns {Function} Express middleware
   */
  middleware(endpoint = 'default', options = {}) {
    const {
      skipSuccessfulRequests = false,
      skipFailedRequests = false,
      onLimitReached = null,
      headers = true
    } = options;

    return async (req, res, next) => {
      try {
        const result = await this.checkRateLimit(req, endpoint);
        
        // Add rate limit headers
        if (headers) {
          res.set({
            'X-RateLimit-Limit': result.limit || 'unknown',
            'X-RateLimit-Remaining': result.remaining || 0,
            'X-RateLimit-Reset': result.resetTime ? new Date(result.resetTime).toISOString() : 'unknown'
          });
          
          if (result.window) {
            res.set('X-RateLimit-Window', result.window);
          }
        }
        
        if (!result.allowed) {
          // Rate limit exceeded
          if (result.retryAfter) {
            res.set('Retry-After', result.retryAfter);
          }
          
          if (onLimitReached) {
            onLimitReached(req, res, result);
          }
          
          return res.status(429).json({
            error: 'Too Many Requests',
            message: `Rate limit exceeded. Try again in ${result.retryAfter || 'a few'} seconds.`,
            limit: result.limit,
            current: result.current,
            resetTime: result.resetTime
          });
        }
        
        // Track the request for potential post-response cleanup
        req.rateLimitResult = result;
        req.rateLimitEndpoint = endpoint;
        req.rateLimitOptions = { skipSuccessfulRequests, skipFailedRequests };
        
        next();
        
      } catch (error) {
        console.error('Rate limiter middleware error:', error);
        // Fail open - allow the request to continue
        next();
      }
    };
  }

  /**
   * Reset rate limit for a specific client and endpoint
   * @param {string} clientId - Client identifier
   * @param {string} clientType - Client type (user, api-key, ip)
   * @param {string} endpoint - Endpoint identifier
   * @returns {Promise<boolean>} Success status
   */
  async resetRateLimit(clientId, clientType, endpoint = 'default') {
    try {
      let cacheKeyPattern;
      
      switch (clientType) {
        case 'user':
          cacheKeyPattern = cacheKeys.rateLimit.user(clientId, endpoint) + ':*';
          break;
        case 'api-key':
          cacheKeyPattern = cacheKeys.rateLimit.apiKey(clientId, endpoint) + ':*';
          break;
        default:
          cacheKeyPattern = cacheKeys.rateLimit.ip(clientId, endpoint) + ':*';
      }
      
      const deletedCount = await cacheService.deletePattern(cacheKeyPattern);
      console.log(`Reset rate limit for ${clientType} ${clientId} on ${endpoint}: ${deletedCount} entries deleted`);
      
      return true;
    } catch (error) {
      console.error('Error resetting rate limit:', error);
      return false;
    }
  }

  /**
   * Get rate limit status for a client
   * @param {string} clientId - Client identifier
   * @param {string} clientType - Client type
   * @param {string} endpoint - Endpoint identifier
   * @returns {Promise<Object>} Rate limit status
   */
  async getRateLimitStatus(clientId, clientType, endpoint = 'default') {
    const config = this.getRateLimitConfig(endpoint);
    const now = Date.now();
    const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
    const windowEnd = windowStart + config.windowMs;
    
    const client = { type: clientType, id: clientId };
    const cacheKey = this.generateCacheKey(client, endpoint, windowStart);
    
    try {
      const currentCount = await this.getCurrentCount(cacheKey);
      const remaining = Math.max(0, config.maxRequests - currentCount);
      
      return {
        limit: config.maxRequests,
        current: currentCount,
        remaining,
        resetTime: windowEnd,
        window: config.windowMs / 1000,
        allowed: currentCount < config.maxRequests
      };
    } catch (error) {
      console.error('Error getting rate limit status:', error);
      return null;
    }
  }
}

// Create default rate limiter instance
export const rateLimiter = new RateLimiter({
  enabled: process.env.REDIS_ENABLED !== 'false',
  logRequests: process.env.NODE_ENV === 'development',
  trustProxy: process.env.NODE_ENV === 'production'
});

// Export pre-configured middleware functions
export const rateLimitMiddleware = {
  default: rateLimiter.middleware('default'),
  auth: rateLimiter.middleware('auth'),
  llm: rateLimiter.middleware('llm'),
  search: rateLimiter.middleware('search'),
  upload: rateLimiter.middleware('upload'),
  admin: rateLimiter.middleware('admin'),
  
  // Custom middleware creator
  custom: (endpoint, options) => rateLimiter.middleware(endpoint, options),
  
  // API key specific middleware
  apiKeys: rateLimiter.middleware('api_keys'),
  premium: rateLimiter.middleware('premium')
};

/**
 * Create API key aware rate limiting middleware
 * This middleware uses API key specific rate limits when available,
 * falls back to endpoint-specific limits otherwise
 * @param {string} endpoint - Endpoint identifier
 * @param {Object} options - Middleware options
 * @returns {Function} Express middleware
 */
export function createApiKeyAwareRateLimit(endpoint = 'default', options = {}) {
  const {
    burstAllowance = true,        // Allow burst beyond normal limits
    burstMultiplier = 2,          // Multiplier for burst allowance
    fallbackToEndpoint = true,    // Fall back to endpoint limits if no API key
    customLimits = {},            // Custom limits for specific endpoints
    ...middlewareOptions
  } = options;

  return async (req, res, next) => {
    try {
      const client = rateLimiter.getClientId(req);
      
      // For API keys, use their custom rate limits
      if (client.type === 'api-key' && client.keyInfo?.rateLimitInfo) {
        // Check if API key has custom burst allowance
        if (burstAllowance && client.keyInfo.rateLimitBurst) {
          const burstLimit = Math.max(
            client.keyInfo.rateLimitInfo.limit,
            client.keyInfo.rateLimitBurst || client.keyInfo.rateLimitInfo.limit * burstMultiplier
          );
          
          // Temporarily override the rate limit for burst checking
          const originalLimit = client.keyInfo.rateLimitInfo.limit;
          client.keyInfo.rateLimitInfo.limit = burstLimit;
          
          const result = await rateLimiter.checkRateLimit(req, endpoint);
          
          // Restore original limit
          client.keyInfo.rateLimitInfo.limit = originalLimit;
          
          // Add burst information to headers
          res.set({
            'X-RateLimit-Burst': burstLimit.toString(),
            'X-RateLimit-Standard': originalLimit.toString()
          });
          
          if (!result.allowed) {
            return res.status(429).json({
              error: 'Rate limit exceeded',
              message: `API key rate limit exceeded. Try again in ${result.retryAfter || 'a few'} seconds.`,
              limit: result.limit,
              current: result.current,
              resetTime: result.resetTime,
              type: 'api_key_limit'
            });
          }
        } else {
          // Standard API key rate limiting
          const result = await rateLimiter.checkRateLimit(req, endpoint);
          
          if (!result.allowed) {
            return res.status(429).json({
              error: 'Rate limit exceeded',
              message: `API key rate limit exceeded. Try again in ${result.retryAfter || 'a few'} seconds.`,
              limit: result.limit,
              current: result.current,
              resetTime: result.resetTime,
              type: 'api_key_limit'
            });
          }
        }
      } else if (fallbackToEndpoint || client.type !== 'api-key') {
        // Use endpoint-specific rate limiting for non-API key requests
        // or when API key doesn't have custom limits
        return rateLimiter.middleware(endpoint, middlewareOptions)(req, res, next);
      }
      
      next();
      
    } catch (error) {
      console.error('API key aware rate limit error:', error);
      // Fail open - allow the request to continue
      next();
    }
  };
}

// Export configuration for external use
export { RATE_LIMIT_CONFIGS };

export default rateLimitMiddleware;