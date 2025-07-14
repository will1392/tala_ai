/**
 * Security Headers Middleware for Tala AI
 * 
 * Configures comprehensive security headers using Helmet.js and custom policies
 * to protect against common web vulnerabilities.
 */

import helmet from 'helmet';

/**
 * Content Security Policy configuration
 */
const getCSPConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Allow inline scripts (be careful with this)
        "'unsafe-eval'", // Allow eval() for development (remove in production)
        "https://cdn.jsdelivr.net", // CDN for libraries
        "https://unpkg.com", // Package CDN
        ...(isDevelopment ? ["'unsafe-inline'", "'unsafe-eval'"] : [])
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Allow inline styles
        "https://fonts.googleapis.com",
        "https://cdn.jsdelivr.net"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdn.jsdelivr.net"
      ],
      imgSrc: [
        "'self'",
        "data:", // Allow data URLs for images
        "blob:", // Allow blob URLs
        "https:", // Allow HTTPS images
        "http://localhost:*", // Development
        "http://127.0.0.1:*" // Development
      ],
      connectSrc: [
        "'self'",
        "https://api.tala.ai", // Your API domain
        "wss://api.tala.ai", // WebSocket connections
        ...(isDevelopment ? [
          "http://localhost:*",
          "http://127.0.0.1:*",
          "ws://localhost:*",
          "ws://127.0.0.1:*"
        ] : [])
      ],
      mediaSrc: ["'self'", "blob:", "data:"],
      objectSrc: ["'none'"], // Disable plugins
      frameSrc: ["'none'"], // Disable frames/iframes
      frameAncestors: ["'none'"], // Prevent being framed
      formAction: ["'self'"], // Restrict form submissions
      upgradeInsecureRequests: !isDevelopment, // Upgrade HTTP to HTTPS in production
      blockAllMixedContent: !isDevelopment // Block mixed content in production
    },
    reportOnly: isDevelopment, // Use report-only mode in development
    reportUri: process.env.CSP_REPORT_URI // Optional: CSP violation reporting endpoint
  };
};

/**
 * HSTS (HTTP Strict Transport Security) configuration
 */
const getHSTSConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    maxAge: 365 * 24 * 60 * 60, // 1 year in seconds
    includeSubDomains: true, // Apply to all subdomains
    preload: !isDevelopment // Enable HSTS preload list in production only
  };
};

/**
 * Referrer Policy configuration
 */
const getReferrerPolicyConfig = () => {
  return {
    policy: [
      "strict-origin-when-cross-origin", // Send full URL for same-origin, origin only for cross-origin HTTPS
      "strict-origin" // Fallback: send origin only
    ]
  };
};

/**
 * Permissions Policy configuration (formerly Feature Policy)
 */
const getPermissionsPolicyConfig = () => {
  return {
    // Disable potentially dangerous features
    camera: [], // No camera access
    microphone: [], // No microphone access
    geolocation: [], // No geolocation access
    gyroscope: [], // No gyroscope access
    magnetometer: [], // No magnetometer access
    accelerometer: [], // No accelerometer access
    usb: [], // No USB access
    midi: [], // No MIDI access
    'display-capture': [], // No screen sharing
    'document-domain': [], // No document.domain modification
    
    // Allow some features for self only
    'payment': ['self'], // Payment API for same origin only
    'fullscreen': ['self'], // Fullscreen for same origin only
    'autoplay': ['self'], // Autoplay for same origin only
    'encrypted-media': ['self'], // DRM content for same origin only
    
    // Completely disable others
    'picture-in-picture': [], // No picture-in-picture
    'web-share': [], // No web share API
    'xr-spatial-tracking': [] // No XR/VR tracking
  };
};

/**
 * Create helmet middleware with comprehensive security configuration
 */
export function createSecurityHeadersMiddleware(options = {}) {
  const {
    contentSecurityPolicy = true,
    hsts = true,
    referrerPolicy = true,
    permissionsPolicy = true,
    customHeaders = {}
  } = options;

  const middlewares = [];

  // Content Security Policy
  if (contentSecurityPolicy) {
    middlewares.push(helmet.contentSecurityPolicy(getCSPConfig()));
  }

  // HTTP Strict Transport Security
  if (hsts && process.env.NODE_ENV === 'production') {
    middlewares.push(helmet.hsts(getHSTSConfig()));
  }

  // Referrer Policy
  if (referrerPolicy) {
    middlewares.push(helmet.referrerPolicy(getReferrerPolicyConfig()));
  }

  // Hide X-Powered-By header
  middlewares.push(helmet.hidePoweredBy());

  // Set X-Content-Type-Options to nosniff
  middlewares.push(helmet.noSniff());

  // Set X-Frame-Options to DENY
  middlewares.push(helmet.frameguard({ action: 'deny' }));

  // Set X-XSS-Protection
  middlewares.push(helmet.xssFilter());

  // Don't cache DNS lookups
  middlewares.push(helmet.dnsPrefetchControl());

  // Disable client-side caching
  middlewares.push(helmet.noCache({
    // Only apply to sensitive endpoints
    paths: ['/api/auth', '/api/users', '/api/admin']
  }));

  // Cross-Origin Policies
  middlewares.push(helmet.crossOriginEmbedderPolicy({ policy: 'credentialless' }));
  middlewares.push(helmet.crossOriginOpenerPolicy({ policy: 'same-origin' }));
  middlewares.push(helmet.crossOriginResourcePolicy({ policy: 'same-origin' }));

  // Origin Agent Cluster
  middlewares.push(helmet.originAgentCluster());

  // Custom security middleware for additional headers
  middlewares.push((req, res, next) => {
    // Security headers not covered by Helmet
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // XSS Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer Policy (backup)
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions Policy
    if (permissionsPolicy) {
      const policies = getPermissionsPolicyConfig();
      const policyString = Object.entries(policies)
        .map(([feature, allowlist]) => {
          if (allowlist.length === 0) {
            return `${feature}=()`;
          }
          return `${feature}=(${allowlist.join(' ')})`;
        })
        .join(', ');
      
      res.setHeader('Permissions-Policy', policyString);
    }
    
    // Clear-Site-Data header for logout endpoints
    if (req.path.includes('/logout') || req.path.includes('/signout')) {
      res.setHeader('Clear-Site-Data', '"cache", "cookies", "storage", "executionContexts"');
    }
    
    // Server header removal/modification
    res.removeHeader('Server');
    res.removeHeader('X-Powered-By');
    
    // Custom application headers
    res.setHeader('X-Application', 'Tala-AI');
    res.setHeader('X-Version', process.env.APP_VERSION || '1.0.0');
    
    // Security contact information
    res.setHeader('X-Security-Contact', 'security@tala.ai');
    
    // Add custom headers from options
    Object.entries(customHeaders).forEach(([name, value]) => {
      res.setHeader(name, value);
    });
    
    next();
  });

  // Return combined middleware
  return (req, res, next) => {
    let index = 0;
    
    function runNextMiddleware() {
      if (index >= middlewares.length) {
        return next();
      }
      
      const middleware = middlewares[index++];
      middleware(req, res, runNextMiddleware);
    }
    
    runNextMiddleware();
  };
}

/**
 * API-specific security headers middleware
 */
export function createAPISecurityMiddleware() {
  return (req, res, next) => {
    // API-specific headers
    res.setHeader('X-API-Version', 'v1');
    res.setHeader('X-RateLimit-Policy', 'standard');
    
    // CORS headers for API endpoints
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.setHeader('Access-Control-Allow-Headers', 
        'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key, X-CSRF-Token'
      );
      res.setHeader('Access-Control-Expose-Headers', 
        'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset'
      );
      res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    }
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    
    next();
  };
}

/**
 * Static files security middleware
 */
export function createStaticSecurityMiddleware() {
  return (req, res, next) => {
    // Headers for static assets
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Cache control for static assets
    const isImmutable = req.path.includes('.') && (
      req.path.includes('/static/') ||
      req.path.includes('/assets/') ||
      req.path.includes('.js') ||
      req.path.includes('.css') ||
      req.path.includes('.woff') ||
      req.path.includes('.png') ||
      req.path.includes('.jpg')
    );
    
    if (isImmutable) {
      // Long cache for immutable assets
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      // Short cache for other static files
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
    
    // ETag for caching
    res.setHeader('ETag', `"${Date.now()}"`);
    
    next();
  };
}

/**
 * Development-specific security middleware
 */
export function createDevelopmentSecurityMiddleware() {
  return (req, res, next) => {
    if (process.env.NODE_ENV === 'development') {
      // Less strict headers for development
      res.setHeader('X-Development-Mode', 'true');
      
      // Allow more lenient CSP in development
      res.setHeader('Content-Security-Policy-Report-Only', 
        "default-src 'self' 'unsafe-inline' 'unsafe-eval' *; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' *; " +
        "style-src 'self' 'unsafe-inline' *;"
      );
    }
    
    next();
  };
}

/**
 * Security audit middleware - logs security-related events
 */
export function createSecurityAuditMiddleware() {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // Log security-relevant requests
    const isSecuritySensitive = 
      req.path.includes('/auth') ||
      req.path.includes('/admin') ||
      req.path.includes('/api/keys') ||
      req.path.includes('/encryption') ||
      req.method === 'DELETE';
    
    if (isSecuritySensitive) {
      console.log(`[Security] ${req.method} ${req.path} from ${req.ip}`, {
        userAgent: req.headers['user-agent'],
        referer: req.headers.referer,
        timestamp: new Date().toISOString()
      });
    }
    
    // Monitor response
    const originalSend = res.send;
    res.send = function(data) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Log slow requests (potential DoS)
      if (duration > 5000) { // 5 seconds
        console.warn(`[Security] Slow request detected: ${req.method} ${req.path} took ${duration}ms`);
      }
      
      // Log error responses
      if (res.statusCode >= 400) {
        console.warn(`[Security] Error response: ${res.statusCode} for ${req.method} ${req.path}`, {
          ip: req.ip,
          userAgent: req.headers['user-agent']
        });
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
}

/**
 * Complete security middleware stack
 */
export function createCompleteSecurityMiddleware(options = {}) {
  const middlewares = [
    createSecurityHeadersMiddleware(options),
    createSecurityAuditMiddleware()
  ];
  
  if (process.env.NODE_ENV === 'development') {
    middlewares.push(createDevelopmentSecurityMiddleware());
  }
  
  return (req, res, next) => {
    let index = 0;
    
    function runNextMiddleware() {
      if (index >= middlewares.length) {
        return next();
      }
      
      const middleware = middlewares[index++];
      middleware(req, res, runNextMiddleware);
    }
    
    runNextMiddleware();
  };
}

// Export individual middlewares and main function
export default {
  createSecurityHeadersMiddleware,
  createAPISecurityMiddleware,
  createStaticSecurityMiddleware,
  createDevelopmentSecurityMiddleware,
  createSecurityAuditMiddleware,
  createCompleteSecurityMiddleware
};