/**
 * Simple In-Memory Rate Limiter for Tala AI
 * Production-ready rate limiting without external dependencies
 */

// In-memory storage for rate limit tracking
const rateLimitStore = new Map();
const cleanupInterval = 60000; // Clean up old entries every minute

// Rate limit configurations for different endpoints
const RATE_LIMITS = {
  // AI endpoints (most expensive)
  '/api/chat/v2': {
    windowMs: 60000, // 1 minute
    maxRequests: 10,
    errorMessage: 'Too many chat requests. Please wait before trying again.'
  },
  '/api/chat/intelligent': {
    windowMs: 60000,
    maxRequests: 10,
    errorMessage: 'Too many AI requests. Please wait before trying again.'
  },
  '/api/chat/generate': {
    windowMs: 60000,
    maxRequests: 20,
    errorMessage: 'Too many generation requests. Please wait before trying again.'
  },
  
  // Document operations
  '/api/documents/upload': {
    windowMs: 60000,
    maxRequests: 5,
    errorMessage: 'Too many upload requests. Please wait before trying again.'
  },
  
  // Search operations
  '/api/search': {
    windowMs: 60000,
    maxRequests: 30,
    errorMessage: 'Too many search requests. Please wait before trying again.'
  },
  
  // Default for all other endpoints
  default: {
    windowMs: 60000,
    maxRequests: 100,
    errorMessage: 'Too many requests. Please wait before trying again.'
  }
};

// User tier multipliers
const TIER_MULTIPLIERS = {
  free: 1,
  premium: 5,
  enterprise: 20
};

class SimpleRateLimiter {
  constructor() {
    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Start periodic cleanup of old entries
   */
  startCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, data] of rateLimitStore.entries()) {
        if (data.resetTime < now) {
          rateLimitStore.delete(key);
        }
      }
    }, cleanupInterval);
  }

  /**
   * Get user identifier from request
   */
  getUserIdentifier(req) {
    // Priority: User ID > Session ID > IP Address
    const userId = req.headers['x-user-id'] || req.session?.userId;
    if (userId) return `user:${userId}`;
    
    if (req.sessionID) return `session:${req.sessionID}`;
    
    // Get real IP behind proxy
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
               req.headers['x-real-ip'] || 
               req.ip;
    return `ip:${ip}`;
  }

  /**
   * Get user tier (simplified version)
   */
  getUserTier(req) {
    // In production, this would check the database
    const userId = req.headers['x-user-id'] || req.session?.userId;
    
    // Mock implementation - replace with actual database lookup
    if (userId) {
      // Check if user is premium (would be from database)
      return 'free'; // Default to free for now
    }
    
    return 'free';
  }

  /**
   * Get rate limit config for endpoint
   */
  getRateLimitConfig(path) {
    // Find matching config
    for (const [endpoint, config] of Object.entries(RATE_LIMITS)) {
      if (endpoint !== 'default' && path.startsWith(endpoint)) {
        return config;
      }
    }
    return RATE_LIMITS.default;
  }

  /**
   * Check if request should be rate limited
   */
  checkRateLimit(identifier, config, tier = 'free') {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    const multiplier = TIER_MULTIPLIERS[tier] || 1;
    const maxRequests = config.maxRequests * multiplier;
    
    // Get or create rate limit data
    let data = rateLimitStore.get(identifier);
    
    if (!data) {
      data = {
        requests: [],
        resetTime: now + config.windowMs
      };
      rateLimitStore.set(identifier, data);
    }
    
    // Remove old requests outside the window
    data.requests = data.requests.filter(timestamp => timestamp > windowStart);
    
    // Check if limit exceeded
    if (data.requests.length >= maxRequests) {
      const oldestRequest = Math.min(...data.requests);
      const resetTime = oldestRequest + config.windowMs;
      const retryAfter = Math.ceil((resetTime - now) / 1000);
      
      return {
        limited: true,
        remaining: 0,
        resetTime,
        retryAfter,
        limit: maxRequests
      };
    }
    
    // Add current request
    data.requests.push(now);
    
    // Update reset time
    if (data.requests.length === 1) {
      data.resetTime = now + config.windowMs;
    }
    
    return {
      limited: false,
      remaining: maxRequests - data.requests.length,
      resetTime: data.resetTime,
      limit: maxRequests
    };
  }
}

// Create singleton instance
const limiter = new SimpleRateLimiter();

/**
 * Express middleware for rate limiting
 */
function rateLimitMiddleware(req, res, next) {
  // Skip rate limiting for health checks and static assets
  if (req.path === '/health' || req.path.startsWith('/static')) {
    return next();
  }

  try {
    const identifier = limiter.getUserIdentifier(req);
    const tier = limiter.getUserTier(req);
    const config = limiter.getRateLimitConfig(req.path);
    const result = limiter.checkRateLimit(identifier, config, tier);
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', result.limit);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
    
    if (result.limited) {
      // Log rate limit violation
      console.warn(`Rate limit exceeded for ${identifier} on ${req.path}`);
      
      // Set retry header
      res.setHeader('Retry-After', result.retryAfter);
      
      // Return rate limit error
      return res.status(429).json({
        error: 'Too Many Requests',
        message: config.errorMessage,
        retryAfter: result.retryAfter,
        limit: result.limit
      });
    }
    
    next();
  } catch (error) {
    console.error('Rate limiter error:', error);
    // Fail open - allow request if rate limiter fails
    next();
  }
}

/**
 * Endpoint to check current usage
 */
function usageEndpoint(req, res) {
  try {
    const identifier = limiter.getUserIdentifier(req);
    const tier = limiter.getUserTier(req);
    
    // Collect usage stats for different endpoints
    const stats = {};
    for (const endpoint of Object.keys(RATE_LIMITS)) {
      if (endpoint === 'default') continue;
      
      const config = RATE_LIMITS[endpoint];
      const key = `${identifier}:${endpoint}`;
      const data = rateLimitStore.get(key);
      
      if (data) {
        const now = Date.now();
        const windowStart = now - config.windowMs;
        const activeRequests = data.requests.filter(t => t > windowStart);
        
        stats[endpoint] = {
          used: activeRequests.length,
          limit: config.maxRequests * (TIER_MULTIPLIERS[tier] || 1),
          remaining: Math.max(0, config.maxRequests * (TIER_MULTIPLIERS[tier] || 1) - activeRequests.length),
          resetTime: data.resetTime
        };
      } else {
        stats[endpoint] = {
          used: 0,
          limit: config.maxRequests * (TIER_MULTIPLIERS[tier] || 1),
          remaining: config.maxRequests * (TIER_MULTIPLIERS[tier] || 1),
          resetTime: null
        };
      }
    }
    
    res.json({
      tier,
      multiplier: TIER_MULTIPLIERS[tier] || 1,
      usage: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Usage endpoint error:', error);
    res.status(500).json({ error: 'Failed to get usage stats' });
  }
}

/**
 * Reset rate limits for a specific user (admin function)
 */
function resetUserLimits(userId) {
  const identifier = `user:${userId}`;
  const keysToDelete = [];
  
  for (const key of rateLimitStore.keys()) {
    if (key.startsWith(identifier)) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => rateLimitStore.delete(key));
  
  return keysToDelete.length;
}

module.exports = {
  rateLimitMiddleware,
  usageEndpoint,
  resetUserLimits,
  RATE_LIMITS,
  TIER_MULTIPLIERS
};