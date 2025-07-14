/**
 * Authentication Configuration
 * 
 * Central configuration file for all authentication providers and settings.
 * This file manages provider-specific configurations and global auth settings.
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Get authentication configuration based on environment variables
 * @returns {Object} Complete authentication configuration
 */
export function getAuthConfig() {
  return {
    // Global authentication settings
    global: {
      // Default provider to use when none specified
      defaultProvider: process.env.AUTH_DEFAULT_PROVIDER || 'local',
      
      // Enable multi-provider support
      multiProvider: process.env.AUTH_MULTI_PROVIDER === 'true',
      
      // Session configuration
      session: {
        secret: process.env.SESSION_SECRET || 'your-session-secret-change-this-in-production',
        maxAge: parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000, // 24 hours
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'strict'
      },
      
      // Cookie configuration
      cookies: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'strict',
        maxAge: parseInt(process.env.COOKIE_MAX_AGE) || 24 * 60 * 60 * 1000 // 24 hours
      },
      
      // Rate limiting
      rateLimiting: {
        windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
        maxAttempts: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5, // 5 attempts
        skipSuccessfulRequests: true
      },
      
      // Security settings
      security: {
        requireEmailVerification: process.env.AUTH_REQUIRE_EMAIL_VERIFICATION === 'true',
        enableAccountLockout: process.env.AUTH_ENABLE_ACCOUNT_LOCKOUT !== 'false',
        maxFailedAttempts: parseInt(process.env.AUTH_MAX_FAILED_ATTEMPTS) || 5,
        lockoutDuration: parseInt(process.env.AUTH_LOCKOUT_DURATION) || 15 * 60 * 1000, // 15 minutes
        passwordResetExpiry: parseInt(process.env.AUTH_PASSWORD_RESET_EXPIRY) || 60 * 60 * 1000 // 1 hour
      }
    },

    // Local authentication provider configuration
    local: {
      enabled: process.env.AUTH_LOCAL_ENABLED !== 'false', // Default enabled
      default: process.env.AUTH_DEFAULT_PROVIDER === 'local',
      
      // JWT configuration
      jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret-change-this-in-production',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
      refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      
      // Password hashing
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
      
      // Password requirements
      minPasswordLength: parseInt(process.env.AUTH_MIN_PASSWORD_LENGTH) || 8,
      requireUppercase: process.env.AUTH_REQUIRE_UPPERCASE !== 'false',
      requireLowercase: process.env.AUTH_REQUIRE_LOWERCASE !== 'false',
      requireNumbers: process.env.AUTH_REQUIRE_NUMBERS !== 'false',
      requireSpecialChars: process.env.AUTH_REQUIRE_SPECIAL_CHARS !== 'false',
      
      // Email verification
      requireEmailVerification: process.env.AUTH_REQUIRE_EMAIL_VERIFICATION === 'true',
      
      // Account lockout
      maxFailedAttempts: parseInt(process.env.AUTH_MAX_FAILED_ATTEMPTS) || 5,
      lockoutDuration: parseInt(process.env.AUTH_LOCKOUT_DURATION) || 15 * 60 * 1000, // 15 minutes
      
      // Default admin account (for development/setup)
      createDefaultAdmin: process.env.AUTH_CREATE_DEFAULT_ADMIN === 'true',
      defaultAdminEmail: process.env.AUTH_DEFAULT_ADMIN_EMAIL || 'admin@tala.ai',
      defaultAdminPassword: process.env.AUTH_DEFAULT_ADMIN_PASSWORD || 'admin123'
    },

    // Auth0 provider configuration
    auth0: {
      enabled: process.env.AUTH0_ENABLED === 'true',
      default: process.env.AUTH_DEFAULT_PROVIDER === 'auth0',
      
      domain: process.env.AUTH0_DOMAIN,
      clientId: process.env.AUTH0_CLIENT_ID,
      clientSecret: process.env.AUTH0_CLIENT_SECRET,
      audience: process.env.AUTH0_AUDIENCE,
      scope: process.env.AUTH0_SCOPE || 'openid profile email',
      
      // Callback URLs
      callbackURL: process.env.AUTH0_CALLBACK_URL || 'http://localhost:3001/auth/auth0/callback',
      logoutURL: process.env.AUTH0_LOGOUT_URL || 'http://localhost:3000',
      
      // Connection settings
      connection: process.env.AUTH0_CONNECTION || 'Username-Password-Authentication',
      
      // Additional settings
      leeway: parseInt(process.env.AUTH0_LEEWAY) || 60, // Clock skew tolerance in seconds
      cacheKey: process.env.AUTH0_CACHE_KEY,
      cacheTTL: parseInt(process.env.AUTH0_CACHE_TTL) || 3600 // 1 hour
    },

    // Clerk provider configuration  
    clerk: {
      enabled: process.env.CLERK_ENABLED === 'true',
      default: process.env.AUTH_DEFAULT_PROVIDER === 'clerk',
      
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
      secretKey: process.env.CLERK_SECRET_KEY,
      
      // JWT verification
      jwtKey: process.env.CLERK_JWT_KEY,
      
      // Webhook configuration
      webhookSecret: process.env.CLERK_WEBHOOK_SECRET,
      webhookPath: process.env.CLERK_WEBHOOK_PATH || '/auth/clerk/webhook',
      
      // Frontend configuration
      frontendApi: process.env.CLERK_FRONTEND_API,
      apiVersion: process.env.CLERK_API_VERSION || 'v1',
      
      // Additional settings
      sessionTokenName: process.env.CLERK_SESSION_TOKEN_NAME || '__session',
      devBrowserToken: process.env.CLERK_DEV_BROWSER_TOKEN
    },

    // OAuth provider configurations (Google, GitHub, etc.)
    oauth: {
      google: {
        enabled: process.env.GOOGLE_OAUTH_ENABLED === 'true',
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/auth/google/callback',
        scope: ['profile', 'email']
      },
      
      github: {
        enabled: process.env.GITHUB_OAUTH_ENABLED === 'true',
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3001/auth/github/callback',
        scope: ['user:email']
      },
      
      microsoft: {
        enabled: process.env.MICROSOFT_OAUTH_ENABLED === 'true',
        clientId: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
        callbackURL: process.env.MICROSOFT_CALLBACK_URL || 'http://localhost:3001/auth/microsoft/callback',
        scope: ['user.read']
      }
    },

    // Email service configuration (for verification, password reset, etc.)
    email: {
      service: process.env.EMAIL_SERVICE || 'smtp', // smtp, sendgrid, mailgun, ses
      
      // SMTP configuration
      smtp: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      },
      
      // SendGrid configuration
      sendgrid: {
        apiKey: process.env.SENDGRID_API_KEY,
        fromEmail: process.env.SENDGRID_FROM_EMAIL,
        fromName: process.env.SENDGRID_FROM_NAME || 'Tala AI'
      },
      
      // Mailgun configuration
      mailgun: {
        apiKey: process.env.MAILGUN_API_KEY,
        domain: process.env.MAILGUN_DOMAIN,
        fromEmail: process.env.MAILGUN_FROM_EMAIL,
        fromName: process.env.MAILGUN_FROM_NAME || 'Tala AI'
      },
      
      // AWS SES configuration
      ses: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1',
        fromEmail: process.env.SES_FROM_EMAIL,
        fromName: process.env.SES_FROM_NAME || 'Tala AI'
      },
      
      // Email templates
      templates: {
        verification: {
          subject: 'Verify your email address',
          template: 'email-verification'
        },
        passwordReset: {
          subject: 'Reset your password',
          template: 'password-reset'
        },
        welcomeEmail: {
          subject: 'Welcome to Tala AI',
          template: 'welcome'
        }
      }
    },

    // Database configuration for user storage
    database: {
      // Use existing database connection or specify separate auth database
      useExistingConnection: process.env.AUTH_USE_EXISTING_DB !== 'false',
      
      // Separate auth database configuration
      connectionString: process.env.AUTH_DATABASE_URL,
      
      // Table/collection names
      tables: {
        users: process.env.AUTH_USERS_TABLE || 'users',
        sessions: process.env.AUTH_SESSIONS_TABLE || 'user_sessions',
        tokens: process.env.AUTH_TOKENS_TABLE || 'auth_tokens'
      }
    },

    // Logging configuration
    logging: {
      enabled: process.env.AUTH_LOGGING_ENABLED !== 'false',
      level: process.env.AUTH_LOG_LEVEL || 'info', // error, warn, info, debug
      
      // Log authentication events
      logSuccessfulAuth: process.env.AUTH_LOG_SUCCESS === 'true',
      logFailedAuth: process.env.AUTH_LOG_FAILED !== 'false',
      logTokenRefresh: process.env.AUTH_LOG_REFRESH === 'true',
      logPasswordReset: process.env.AUTH_LOG_PASSWORD_RESET === 'true',
      
      // Sensitive data handling
      maskSensitiveData: process.env.AUTH_MASK_SENSITIVE !== 'false',
      
      // Log destinations
      destinations: {
        console: process.env.AUTH_LOG_CONSOLE !== 'false',
        file: process.env.AUTH_LOG_FILE === 'true',
        database: process.env.AUTH_LOG_DATABASE === 'true',
        external: process.env.AUTH_LOG_EXTERNAL === 'true'
      }
    },

    // Mock authentication provider (for development/testing)
    mock: {
      enabled: process.env.MOCK_ENABLED === 'true' || process.env.NODE_ENV === 'development',
      default: process.env.AUTH_DEFAULT_PROVIDER === 'mock',
      tokenExpiry: parseInt(process.env.MOCK_TOKEN_EXPIRY) || 3600,
      simulateLatency: process.env.MOCK_SIMULATE_LATENCY === 'true',
      latencyMs: parseInt(process.env.MOCK_LATENCY_MS) || 100,
      failureRate: parseFloat(process.env.MOCK_FAILURE_RATE) || 0,
      enableLogging: true
    },

    // Development/testing configuration
    development: {
      // Disable certain security features in development
      bypassEmailVerification: process.env.NODE_ENV === 'development' && process.env.AUTH_BYPASS_EMAIL_VERIFICATION === 'true',
      allowWeakPasswords: process.env.NODE_ENV === 'development' && process.env.AUTH_ALLOW_WEAK_PASSWORDS === 'true',
      enableTestRoutes: process.env.NODE_ENV === 'development' && process.env.AUTH_ENABLE_TEST_ROUTES === 'true',
      
      // Test user accounts
      createTestUsers: process.env.NODE_ENV === 'development' && process.env.AUTH_CREATE_TEST_USERS === 'true',
      testUserCount: parseInt(process.env.AUTH_TEST_USER_COUNT) || 5
    }
  };
}

/**
 * Validate authentication configuration
 * @param {Object} config - Configuration to validate
 * @returns {Array} Array of validation errors
 */
export function validateAuthConfig(config) {
  const errors = [];
  
  // Check that at least one provider is enabled
  const enabledProviders = [];
  if (config.local?.enabled) enabledProviders.push('local');
  if (config.auth0?.enabled) enabledProviders.push('auth0');
  if (config.clerk?.enabled) enabledProviders.push('clerk');
  
  if (enabledProviders.length === 0) {
    errors.push('At least one authentication provider must be enabled');
  }
  
  // Validate default provider
  if (!enabledProviders.includes(config.global.defaultProvider)) {
    errors.push(`Default provider '${config.global.defaultProvider}' is not enabled`);
  }
  
  // Validate local provider configuration
  if (config.local?.enabled) {
    if (!config.local.jwtSecret || config.local.jwtSecret === 'your-jwt-secret-change-this-in-production') {
      errors.push('JWT secret must be set for local authentication');
    }
    
    if (config.local.bcryptRounds < 10) {
      errors.push('BCrypt rounds should be at least 10 for security');
    }
  }
  
  // Validate Auth0 configuration
  if (config.auth0?.enabled) {
    const requiredAuth0Fields = ['domain', 'clientId', 'clientSecret'];
    for (const field of requiredAuth0Fields) {
      if (!config.auth0[field]) {
        errors.push(`Auth0 ${field} is required when Auth0 is enabled`);
      }
    }
  }
  
  // Validate Clerk configuration
  if (config.clerk?.enabled) {
    const requiredClerkFields = ['publishableKey', 'secretKey'];
    for (const field of requiredClerkFields) {
      if (!config.clerk[field]) {
        errors.push(`Clerk ${field} is required when Clerk is enabled`);
      }
    }
  }
  
  // Validate session secret
  if (!config.global.session.secret || config.global.session.secret === 'your-session-secret-change-this-in-production') {
    errors.push('Session secret must be set and should be changed from default');
  }
  
  // Production-specific validations
  if (process.env.NODE_ENV === 'production') {
    if (config.local?.createDefaultAdmin) {
      errors.push('Default admin creation should be disabled in production');
    }
    
    if (config.development?.enableTestRoutes) {
      errors.push('Test routes should be disabled in production');
    }
  }
  
  return errors;
}

/**
 * Get provider-specific configuration
 * @param {string} providerName - Name of the provider
 * @returns {Object} Provider configuration
 */
export function getProviderConfig(providerName) {
  const config = getAuthConfig();
  return config[providerName] || null;
}

/**
 * Check if a provider is enabled
 * @param {string} providerName - Name of the provider
 * @returns {boolean} Whether the provider is enabled
 */
export function isProviderEnabled(providerName) {
  const config = getProviderConfig(providerName);
  return config?.enabled === true;
}

/**
 * Get list of enabled providers
 * @returns {Array} List of enabled provider names
 */
export function getEnabledProviders() {
  const config = getAuthConfig();
  const providers = [];
  
  if (config.local?.enabled) providers.push('local');
  if (config.auth0?.enabled) providers.push('auth0');
  if (config.clerk?.enabled) providers.push('clerk');
  
  return providers;
}

// Export default configuration
export default getAuthConfig;