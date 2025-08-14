/**
 * Integration script for production essentials
 * This module integrates rate limiting, error handling, and monitoring
 */

const { rateLimitMiddleware, usageEndpoint } = require('./simpleRateLimiter');
const { safeErrorLog, ErrorSeverity, ErrorCategory } = require('../utils/errorHandler');

/**
 * Apply production essentials to Express app
 */
function applyProductionEssentials(app) {
  // 1. Apply rate limiting before any routes
  app.use(rateLimitMiddleware);
  
  // 2. Add usage monitoring endpoint
  app.get('/api/rate-limit/usage', usageEndpoint);
  
  // 3. Add request logging in production
  if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        
        // Log slow requests
        if (duration > 3000) {
          console.warn(`Slow request: ${req.method} ${req.path} took ${duration}ms`);
        }
        
        // Log failed requests
        if (res.statusCode >= 400) {
          safeErrorLog(new Error(`Request failed: ${req.method} ${req.path}`), {
            category: res.statusCode >= 500 ? ErrorCategory.UNKNOWN : ErrorCategory.VALIDATION,
            severity: res.statusCode >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
            statusCode: res.statusCode,
            method: req.method,
            path: req.path,
            duration
          });
        }
      });
      
      next();
    });
  }
  
  // 4. Add health check endpoint that bypasses rate limiting
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });
  
  console.log('✅ Production essentials applied: rate limiting, error logging, monitoring');
}

/**
 * Wrap async route handlers to catch errors
 */
function wrapAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(error => {
      safeErrorLog(error, {
        category: ErrorCategory.UNKNOWN,
        severity: ErrorSeverity.HIGH,
        endpoint: req.path,
        method: req.method,
        userId: req.session?.userId || req.headers['x-user-id']
      });
      next(error);
    });
  };
}

/**
 * Safe JSON parsing with error handling
 */
function safeJsonParse(text, defaultValue = null) {
  try {
    return JSON.parse(text);
  } catch (error) {
    safeErrorLog(error, {
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      context: 'JSON parsing failed'
    });
    return defaultValue;
  }
}

/**
 * Safe file operation wrapper
 */
async function safeFileOperation(operation, context = {}) {
  try {
    return await operation();
  } catch (error) {
    safeErrorLog(error, {
      category: ErrorCategory.FILE_SYSTEM,
      severity: ErrorSeverity.MEDIUM,
      ...context
    });
    throw error;
  }
}

/**
 * Safe database operation wrapper
 */
async function safeDatabaseOperation(operation, context = {}) {
  try {
    return await operation();
  } catch (error) {
    safeErrorLog(error, {
      category: ErrorCategory.DATABASE,
      severity: ErrorSeverity.HIGH,
      ...context
    });
    throw error;
  }
}

module.exports = {
  applyProductionEssentials,
  wrapAsync,
  safeJsonParse,
  safeFileOperation,
  safeDatabaseOperation
};