/**
 * Comprehensive Security Manager for Tala AI
 * 
 * Provides centralized security services including:
 * - CSRF protection
 * - XSS prevention
 * - SQL injection prevention
 * - Rate limiting
 * - Suspicious activity detection
 * - Input validation and sanitization
 */

import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { createClient } from '@supabase/supabase-js';
import { auditLog } from '../utils/audit.js';
import { generateSecureToken, constantTimeCompare } from '../utils/crypto.js';

class SecurityManager {
  constructor() {
    this.initialized = false;
    this.db = null;
    this.rateLimiters = new Map();
    this.suspiciousActivityCache = new Map();
    this.csrfTokens = new Map();
    
    // Security configuration
    this.config = {
      // Rate limiting
      rateLimits: {
        global: { windowMs: 15 * 60 * 1000, max: 1000 }, // 1000 requests per 15 minutes
        auth: { windowMs: 15 * 60 * 1000, max: 10 },     // 10 auth attempts per 15 minutes
        api: { windowMs: 60 * 1000, max: 100 },          // 100 API requests per minute
        apiKey: { windowMs: 60 * 1000, max: 1000 },      // 1000 API key requests per minute
        upload: { windowMs: 60 * 1000, max: 10 }         // 10 uploads per minute
      },
      
      // Suspicious activity thresholds
      suspiciousActivity: {
        maxFailedAttempts: 5,
        timeWindow: 15 * 60 * 1000, // 15 minutes
        blockDuration: 60 * 60 * 1000, // 1 hour
        patterns: {
          sqlInjection: [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
            /(\'|\";?\s*(OR|AND)\s*\d+\s*=\s*\d+)/gi,
            /(\bOR\b\s+\d+=\d+|\bAND\b\s+\d+=\d+)/gi
          ],
          xss: [
            /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
            /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi
          ],
          pathTraversal: [
            /\.\.[\/\\]/g,
            /\.\.[\\\/]/g,
            /%2e%2e[\/\\]/gi,
            /\x2e\x2e[\/\\]/g
          ]
        }
      },
      
      // CSRF protection
      csrf: {
        tokenLength: 32,
        tokenExpiry: 60 * 60 * 1000, // 1 hour
        cookieName: 'csrf-token',
        headerName: 'x-csrf-token'
      },
      
      // Input validation
      validation: {
        maxStringLength: 10000,
        maxArrayLength: 1000,
        maxObjectDepth: 10,
        allowedFileTypes: [
          'image/jpeg', 'image/png', 'image/gif', 'image/webp',
          'application/pdf', 'text/plain', 'text/csv',
          'application/json', 'application/xml'
        ],
        maxFileSize: 50 * 1024 * 1024 // 50MB
      }
    };
  }

  /**
   * Initialize the Security Manager
   */
  async initialize() {
    try {
      // Initialize database connection
      this.db = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );
      
      // Initialize rate limiters
      this.initializeRateLimiters();
      
      // Start cleanup tasks
      this.startCleanupTasks();
      
      this.initialized = true;
      this.log('SecurityManager initialized successfully');
      
    } catch (error) {
      this.log(`Failed to initialize SecurityManager: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Initialize rate limiters
   */
  initializeRateLimiters() {
    // Global rate limiter
    this.rateLimiters.set('global', rateLimit({
      windowMs: this.config.rateLimits.global.windowMs,
      max: this.config.rateLimits.global.max,
      message: {
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: async (req, res) => {
        await this.logSuspiciousActivity(req.ip, 'rate_limit_exceeded', {
          userAgent: req.headers['user-agent'],
          endpoint: req.originalUrl
        });
        
        res.status(429).json({
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests from this IP, please try again later'
        });
      }
    }));

    // Authentication rate limiter
    this.rateLimiters.set('auth', rateLimit({
      windowMs: this.config.rateLimits.auth.windowMs,
      max: this.config.rateLimits.auth.max,
      skipSuccessfulRequests: true,
      message: {
        error: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts'
      },
      handler: async (req, res) => {
        await this.logSuspiciousActivity(req.ip, 'auth_rate_limit_exceeded', {
          userAgent: req.headers['user-agent']
        });
        
        res.status(429).json({
          error: 'AUTH_RATE_LIMIT_EXCEEDED',
          message: 'Too many authentication attempts, please try again later'
        });
      }
    }));

    // API rate limiter
    this.rateLimiters.set('api', rateLimit({
      windowMs: this.config.rateLimits.api.windowMs,
      max: this.config.rateLimits.api.max,
      message: {
        error: 'API_RATE_LIMIT_EXCEEDED',
        message: 'API rate limit exceeded'
      }
    }));

    // Upload rate limiter with slow down
    this.rateLimiters.set('upload', slowDown({
      windowMs: this.config.rateLimits.upload.windowMs,
      delayAfter: 2,
      delayMs: 500,
      maxDelayMs: 20000
    }));
  }

  /**
   * Get rate limiter middleware
   */
  getRateLimiter(type = 'global') {
    return this.rateLimiters.get(type) || this.rateLimiters.get('global');
  }

  /**
   * Check rate limit for specific user/IP combination
   */
  async checkRequest(ip, userId = null) {
    const key = userId ? `${ip}:${userId}` : ip;
    const now = Date.now();
    const windowMs = this.config.rateLimits.global.windowMs;
    const maxRequests = this.config.rateLimits.global.max;

    // Get current request count
    const requests = await this.getRequestCount(key, windowMs);
    
    if (requests >= maxRequests) {
      return {
        allowed: false,
        limit: maxRequests,
        remaining: 0,
        retryAfter: Math.ceil(windowMs / 1000)
      };
    }

    // Increment request count
    await this.incrementRequestCount(key, windowMs);

    return {
      allowed: true,
      limit: maxRequests,
      remaining: maxRequests - requests - 1,
      retryAfter: 0
    };
  }

  /**
   * Check API key specific rate limits
   */
  async checkAPIKeyLimit(apiKey, ip) {
    const key = `api:${apiKey}:${ip}`;
    const now = Date.now();
    const windowMs = this.config.rateLimits.apiKey.windowMs;
    const maxRequests = this.config.rateLimits.apiKey.max;

    const requests = await this.getRequestCount(key, windowMs);
    
    if (requests >= maxRequests) {
      return {
        allowed: false,
        limit: maxRequests,
        remaining: 0,
        retryAfter: Math.ceil(windowMs / 1000)
      };
    }

    await this.incrementRequestCount(key, windowMs);

    return {
      allowed: true,
      limit: maxRequests,
      remaining: maxRequests - requests - 1,
      retryAfter: 0
    };
  }

  /**
   * CSRF Token Management
   */
  generateCSRFToken(sessionId) {
    const token = generateSecureToken(this.config.csrf.tokenLength, 'hex');
    const expiry = Date.now() + this.config.csrf.tokenExpiry;
    
    this.csrfTokens.set(sessionId, {
      token,
      expiry,
      used: false
    });
    
    return token;
  }

  /**
   * Validate CSRF token
   */
  validateCSRFToken(sessionId, providedToken) {
    const storedData = this.csrfTokens.get(sessionId);
    
    if (!storedData) {
      return false;
    }
    
    if (Date.now() > storedData.expiry) {
      this.csrfTokens.delete(sessionId);
      return false;
    }
    
    if (storedData.used) {
      return false;
    }
    
    const isValid = constantTimeCompare(storedData.token, providedToken);
    
    if (isValid) {
      storedData.used = true;
    }
    
    return isValid;
  }

  /**
   * CSRF protection middleware
   */
  csrfProtection() {
    return async (req, res, next) => {
      // Skip CSRF for GET, HEAD, OPTIONS
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }
      
      // Skip CSRF for API key authentication
      if (req.headers['x-api-key']) {
        return next();
      }
      
      const sessionId = req.session?.id;
      if (!sessionId) {
        return res.status(403).json({
          error: 'CSRF_NO_SESSION',
          message: 'Session required for CSRF protection'
        });
      }
      
      const token = req.headers[this.config.csrf.headerName] || 
                   req.body._csrf || 
                   req.query._csrf;
      
      if (!token) {
        return res.status(403).json({
          error: 'CSRF_TOKEN_MISSING',
          message: 'CSRF token is required'
        });
      }
      
      if (!this.validateCSRFToken(sessionId, token)) {
        await this.logSuspiciousActivity(req.ip, 'csrf_validation_failed', {
          sessionId,
          userAgent: req.headers['user-agent'],
          endpoint: req.originalUrl
        });
        
        return res.status(403).json({
          error: 'CSRF_TOKEN_INVALID',
          message: 'Invalid or expired CSRF token'
        });
      }
      
      next();
    };
  }

  /**
   * Input validation and sanitization
   */
  validateInput(input, options = {}) {
    const {
      maxLength = this.config.validation.maxStringLength,
      allowHTML = false,
      required = false,
      type = 'string'
    } = options;

    if (required && (input === null || input === undefined || input === '')) {
      return {
        isValid: false,
        error: 'REQUIRED_FIELD',
        message: 'This field is required'
      };
    }

    if (input === null || input === undefined) {
      return { isValid: true, sanitized: input };
    }

    let sanitized = input;

    try {
      switch (type) {
        case 'string':
          sanitized = this.sanitizeString(input, { maxLength, allowHTML });
          break;
        case 'email':
          sanitized = this.sanitizeEmail(input);
          break;
        case 'url':
          sanitized = this.sanitizeURL(input);
          break;
        case 'number':
          sanitized = this.sanitizeNumber(input);
          break;
        case 'boolean':
          sanitized = this.sanitizeBoolean(input);
          break;
        case 'array':
          sanitized = this.sanitizeArray(input, options);
          break;
        case 'object':
          sanitized = this.sanitizeObject(input, options);
          break;
        default:
          sanitized = input;
      }

      // Check for malicious patterns
      const threatCheck = this.checkForThreats(sanitized);
      if (!threatCheck.isSafe) {
        return {
          isValid: false,
          error: 'MALICIOUS_INPUT',
          message: `Potentially malicious input detected: ${threatCheck.threat}`
        };
      }

      return {
        isValid: true,
        sanitized
      };

    } catch (error) {
      return {
        isValid: false,
        error: 'VALIDATION_ERROR',
        message: error.message
      };
    }
  }

  /**
   * Sanitize string input
   */
  sanitizeString(input, options = {}) {
    const { maxLength, allowHTML } = options;
    
    if (typeof input !== 'string') {
      input = String(input);
    }
    
    if (maxLength && input.length > maxLength) {
      throw new Error(`String too long (max ${maxLength} characters)`);
    }
    
    if (!allowHTML) {
      // Remove HTML tags and entities
      input = input
        .replace(/<[^>]*>/g, '')
        .replace(/&[^;]+;/g, '')
        .trim();
    }
    
    return input;
  }

  /**
   * Sanitize email input
   */
  sanitizeEmail(input) {
    if (typeof input !== 'string') {
      throw new Error('Email must be a string');
    }
    
    const email = input.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
    
    return email;
  }

  /**
   * Sanitize URL input
   */
  sanitizeURL(input) {
    if (typeof input !== 'string') {
      throw new Error('URL must be a string');
    }
    
    try {
      const url = new URL(input);
      
      // Only allow HTTP and HTTPS
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Only HTTP and HTTPS URLs are allowed');
      }
      
      return url.toString();
      
    } catch (error) {
      throw new Error('Invalid URL format');
    }
  }

  /**
   * Sanitize number input
   */
  sanitizeNumber(input) {
    const num = Number(input);
    
    if (isNaN(num) || !isFinite(num)) {
      throw new Error('Invalid number');
    }
    
    return num;
  }

  /**
   * Sanitize boolean input
   */
  sanitizeBoolean(input) {
    if (typeof input === 'boolean') {
      return input;
    }
    
    if (typeof input === 'string') {
      const lower = input.toLowerCase();
      if (['true', '1', 'yes', 'on'].includes(lower)) {
        return true;
      }
      if (['false', '0', 'no', 'off'].includes(lower)) {
        return false;
      }
    }
    
    if (typeof input === 'number') {
      return Boolean(input);
    }
    
    throw new Error('Invalid boolean value');
  }

  /**
   * Sanitize array input
   */
  sanitizeArray(input, options = {}) {
    if (!Array.isArray(input)) {
      throw new Error('Input must be an array');
    }
    
    const { maxLength = this.config.validation.maxArrayLength } = options;
    
    if (input.length > maxLength) {
      throw new Error(`Array too long (max ${maxLength} items)`);
    }
    
    return input.map(item => {
      const result = this.validateInput(item, { type: 'string' });
      if (!result.isValid) {
        throw new Error(`Invalid array item: ${result.message}`);
      }
      return result.sanitized;
    });
  }

  /**
   * Sanitize object input
   */
  sanitizeObject(input, options = {}, depth = 0) {
    if (input === null || typeof input !== 'object' || Array.isArray(input)) {
      throw new Error('Input must be an object');
    }
    
    const { maxDepth = this.config.validation.maxObjectDepth } = options;
    
    if (depth > maxDepth) {
      throw new Error(`Object nesting too deep (max ${maxDepth} levels)`);
    }
    
    const sanitized = {};
    
    for (const [key, value] of Object.entries(input)) {
      // Sanitize key
      const sanitizedKey = this.sanitizeString(key, { maxLength: 100 });
      
      // Sanitize value
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[sanitizedKey] = this.sanitizeObject(value, options, depth + 1);
      } else {
        const result = this.validateInput(value, { type: 'string' });
        if (!result.isValid) {
          throw new Error(`Invalid object property '${key}': ${result.message}`);
        }
        sanitized[sanitizedKey] = result.sanitized;
      }
    }
    
    return sanitized;
  }

  /**
   * Check for malicious patterns
   */
  checkForThreats(input) {
    if (typeof input !== 'string') {
      return { isSafe: true };
    }
    
    const patterns = this.config.suspiciousActivity.patterns;
    
    // Check for SQL injection
    for (const pattern of patterns.sqlInjection) {
      if (pattern.test(input)) {
        return {
          isSafe: false,
          threat: 'sql_injection',
          pattern: pattern.toString()
        };
      }
    }
    
    // Check for XSS
    for (const pattern of patterns.xss) {
      if (pattern.test(input)) {
        return {
          isSafe: false,
          threat: 'xss',
          pattern: pattern.toString()
        };
      }
    }
    
    // Check for path traversal
    for (const pattern of patterns.pathTraversal) {
      if (pattern.test(input)) {
        return {
          isSafe: false,
          threat: 'path_traversal',
          pattern: pattern.toString()
        };
      }
    }
    
    return { isSafe: true };
  }

  /**
   * File upload validation
   */
  validateFileUpload(file, options = {}) {
    const {
      allowedTypes = this.config.validation.allowedFileTypes,
      maxSize = this.config.validation.maxFileSize,
      requireExtension = true
    } = options;

    if (!file) {
      return {
        isValid: false,
        error: 'NO_FILE',
        message: 'No file provided'
      };
    }

    // Check file size
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: 'FILE_TOO_LARGE',
        message: `File size exceeds maximum allowed size of ${maxSize} bytes`
      };
    }

    // Check MIME type
    if (!allowedTypes.includes(file.mimetype)) {
      return {
        isValid: false,
        error: 'INVALID_FILE_TYPE',
        message: `File type ${file.mimetype} is not allowed`
      };
    }

    // Check file extension
    if (requireExtension) {
      const extension = file.originalname.split('.').pop()?.toLowerCase();
      const validExtensions = {
        'image/jpeg': ['jpg', 'jpeg'],
        'image/png': ['png'],
        'image/gif': ['gif'],
        'image/webp': ['webp'],
        'application/pdf': ['pdf'],
        'text/plain': ['txt'],
        'text/csv': ['csv'],
        'application/json': ['json'],
        'application/xml': ['xml']
      };

      const expectedExtensions = validExtensions[file.mimetype];
      if (!expectedExtensions || !expectedExtensions.includes(extension)) {
        return {
          isValid: false,
          error: 'EXTENSION_MISMATCH',
          message: 'File extension does not match MIME type'
        };
      }
    }

    // Check filename for path traversal
    const threatCheck = this.checkForThreats(file.originalname);
    if (!threatCheck.isSafe) {
      return {
        isValid: false,
        error: 'MALICIOUS_FILENAME',
        message: 'Filename contains potentially malicious content'
      };
    }

    return {
      isValid: true,
      sanitizedFilename: this.sanitizeFilename(file.originalname)
    };
  }

  /**
   * Sanitize filename
   */
  sanitizeFilename(filename) {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/\.+/g, '.')
      .replace(/^\.+|\.+$/g, '')
      .substring(0, 255);
  }

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(ip, activityType, details = {}) {
    try {
      const key = `suspicious:${ip}:${activityType}`;
      const now = Date.now();
      
      // Get current activity count
      let activity = this.suspiciousActivityCache.get(key) || {
        count: 0,
        firstSeen: now,
        lastSeen: now,
        blocked: false
      };
      
      activity.count++;
      activity.lastSeen = now;
      
      // Check if threshold exceeded
      const threshold = this.config.suspiciousActivity.maxFailedAttempts;
      const timeWindow = this.config.suspiciousActivity.timeWindow;
      
      if (activity.count >= threshold && (now - activity.firstSeen) <= timeWindow) {
        activity.blocked = true;
        activity.blockedUntil = now + this.config.suspiciousActivity.blockDuration;
        
        // Log security incident
        await auditLog('security_incident', 'security', null, ip, {
          activityType,
          count: activity.count,
          timeWindow,
          blocked: true,
          ...details
        });
      }
      
      this.suspiciousActivityCache.set(key, activity);
      
      // Also log individual suspicious activity
      await auditLog('suspicious_activity', 'security', null, ip, {
        activityType,
        count: activity.count,
        ...details
      });
      
    } catch (error) {
      console.error('Error logging suspicious activity:', error);
    }
  }

  /**
   * Check if IP is blocked
   */
  isBlocked(ip, activityType = null) {
    const now = Date.now();
    
    if (activityType) {
      const key = `suspicious:${ip}:${activityType}`;
      const activity = this.suspiciousActivityCache.get(key);
      
      if (activity && activity.blocked && activity.blockedUntil > now) {
        return {
          blocked: true,
          reason: activityType,
          blockedUntil: activity.blockedUntil,
          remainingTime: activity.blockedUntil - now
        };
      }
    }
    
    // Check for any blocked activity for this IP
    for (const [key, activity] of this.suspiciousActivityCache.entries()) {
      if (key.startsWith(`suspicious:${ip}:`) && activity.blocked && activity.blockedUntil > now) {
        return {
          blocked: true,
          reason: key.split(':')[2],
          blockedUntil: activity.blockedUntil,
          remainingTime: activity.blockedUntil - now
        };
      }
    }
    
    return { blocked: false };
  }

  /**
   * Security middleware factory
   */
  createSecurityMiddleware(options = {}) {
    const {
      rateLimitType = 'global',
      requireCSRF = false,
      validateInput = true,
      blockSuspicious = true
    } = options;

    return async (req, res, next) => {
      try {
        // Check if IP is blocked
        if (blockSuspicious) {
          const blockStatus = this.isBlocked(req.ip);
          if (blockStatus.blocked) {
            return res.status(429).json({
              error: 'IP_BLOCKED',
              message: 'IP address temporarily blocked due to suspicious activity',
              blockedUntil: new Date(blockStatus.blockedUntil).toISOString(),
              reason: blockStatus.reason
            });
          }
        }

        // Apply rate limiting
        const rateLimiter = this.getRateLimiter(rateLimitType);
        if (rateLimiter) {
          await new Promise((resolve, reject) => {
            rateLimiter(req, res, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }

        // CSRF protection
        if (requireCSRF) {
          await new Promise((resolve, reject) => {
            this.csrfProtection()(req, res, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }

        // Input validation
        if (validateInput && (req.body || req.query)) {
          const validation = this.validateRequestData(req);
          if (!validation.isValid) {
            await this.logSuspiciousActivity(req.ip, 'invalid_input', {
              error: validation.error,
              endpoint: req.originalUrl
            });
            
            return res.status(400).json({
              error: 'INVALID_INPUT',
              message: validation.message,
              details: validation.details
            });
          }
        }

        next();

      } catch (error) {
        console.error('Security middleware error:', error);
        res.status(500).json({
          error: 'SECURITY_ERROR',
          message: 'Security validation failed'
        });
      }
    };
  }

  /**
   * Validate all request data
   */
  validateRequestData(req) {
    const errors = [];

    // Validate body
    if (req.body && typeof req.body === 'object') {
      try {
        this.validateInput(req.body, { type: 'object' });
      } catch (error) {
        errors.push({ field: 'body', error: error.message });
      }
    }

    // Validate query parameters
    if (req.query && typeof req.query === 'object') {
      for (const [key, value] of Object.entries(req.query)) {
        const result = this.validateInput(value, { type: 'string' });
        if (!result.isValid) {
          errors.push({ field: `query.${key}`, error: result.message });
        }
      }
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        error: 'VALIDATION_FAILED',
        message: 'Request validation failed',
        details: errors
      };
    }

    return { isValid: true };
  }

  /**
   * Get/increment request count (in-memory for now, should use Redis in production)
   */
  async getRequestCount(key, windowMs) {
    // This is a simplified in-memory implementation
    // In production, use Redis with proper expiration
    const now = Date.now();
    const requests = this.requestCounts?.get(key) || { count: 0, window: now };
    
    // Reset if window expired
    if (now - requests.window > windowMs) {
      return 0;
    }
    
    return requests.count;
  }

  async incrementRequestCount(key, windowMs) {
    if (!this.requestCounts) {
      this.requestCounts = new Map();
    }
    
    const now = Date.now();
    const requests = this.requestCounts.get(key) || { count: 0, window: now };
    
    // Reset if window expired
    if (now - requests.window > windowMs) {
      requests.count = 1;
      requests.window = now;
    } else {
      requests.count++;
    }
    
    this.requestCounts.set(key, requests);
  }

  /**
   * Start cleanup tasks
   */
  startCleanupTasks() {
    // Clean up expired CSRF tokens every 15 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [sessionId, data] of this.csrfTokens.entries()) {
        if (now > data.expiry) {
          this.csrfTokens.delete(sessionId);
        }
      }
    }, 15 * 60 * 1000);

    // Clean up old suspicious activity every hour
    setInterval(() => {
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      for (const [key, activity] of this.suspiciousActivityCache.entries()) {
        if (now - activity.lastSeen > maxAge) {
          this.suspiciousActivityCache.delete(key);
        }
      }
    }, 60 * 60 * 1000);

    // Clean up request counts every hour
    setInterval(() => {
      if (this.requestCounts) {
        const now = Date.now();
        const maxAge = 60 * 60 * 1000; // 1 hour
        
        for (const [key, requests] of this.requestCounts.entries()) {
          if (now - requests.window > maxAge) {
            this.requestCounts.delete(key);
          }
        }
      }
    }, 60 * 60 * 1000);
  }

  /**
   * Get security status
   */
  getSecurityStatus() {
    return {
      initialized: this.initialized,
      activeRateLimiters: this.rateLimiters.size,
      suspiciousActivities: this.suspiciousActivityCache.size,
      csrfTokens: this.csrfTokens.size,
      requestCounts: this.requestCounts?.size || 0,
      config: {
        rateLimits: this.config.rateLimits,
        maxFileSize: this.config.validation.maxFileSize,
        allowedFileTypes: this.config.validation.allowedFileTypes.length
      }
    };
  }

  /**
   * Log messages
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      component: 'SecurityManager',
      level,
      message
    };

    switch (level) {
      case 'error':
        console.error('[SecurityManager]', logData);
        break;
      case 'warn':
        console.warn('[SecurityManager]', logData);
        break;
      default:
        console.log('[SecurityManager]', logData);
    }
  }
}

// Export singleton instance
const securityManager = new SecurityManager();

// Export rate limiter for use in authentication middleware
export const rateLimiter = securityManager;

export default securityManager;