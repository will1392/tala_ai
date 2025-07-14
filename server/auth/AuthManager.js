/**
 * AuthManager - Central authentication management system
 * 
 * Manages multiple authentication providers and provides a unified interface
 * for authentication operations across the application.
 */

import LocalAuthProvider from './providers/LocalAuthProvider.js';
import Auth0Provider from './providers/Auth0Provider.js';
import ClerkProvider from './providers/ClerkProvider.js';
import MockAuthProvider from './providers/MockAuthProvider.js';

class AuthManager {
  constructor() {
    this.providers = new Map();
    this.defaultProvider = null;
    this.initialized = false;
    this.config = null;
  }

  /**
   * Initialize AuthManager with configuration
   * @param {Object} config - Authentication configuration
   */
  async initialize(config = {}) {
    this.config = config;
    
    try {
      // Initialize local provider if enabled
      if (config.local?.enabled) {
        await this.addProvider('local', LocalAuthProvider, config.local);
        
        if (!this.defaultProvider || config.local.default) {
          this.defaultProvider = 'local';
        }
      }

      // Initialize Auth0 provider if enabled
      if (config.auth0?.enabled) {
        try {
          await this.addProvider('auth0', Auth0Provider, config.auth0);
          
          if (!this.defaultProvider || config.auth0.default) {
            this.defaultProvider = 'auth0';
          }
        } catch (error) {
          this.log(`Failed to initialize Auth0 provider: ${error.message}`, 'warn');
          if (config.auth0.required) {
            throw error;
          }
        }
      }

      // Initialize Clerk provider if enabled  
      if (config.clerk?.enabled) {
        try {
          await this.addProvider('clerk', ClerkProvider, config.clerk);
          
          if (!this.defaultProvider || config.clerk.default) {
            this.defaultProvider = 'clerk';
          }
        } catch (error) {
          this.log(`Failed to initialize Clerk provider: ${error.message}`, 'warn');
          if (config.clerk.required) {
            throw error;
          }
        }
      }

      // Initialize Mock provider if enabled (for development/testing)
      if (config.mock?.enabled || process.env.NODE_ENV === 'development') {
        try {
          await this.addProvider('mock', MockAuthProvider, config.mock || {});
          
          // Use mock as default only if no other providers are configured
          if (!this.defaultProvider) {
            this.defaultProvider = 'mock';
          }
        } catch (error) {
          this.log(`Failed to initialize Mock provider: ${error.message}`, 'warn');
        }
      }

      if (!this.defaultProvider) {
        throw new Error('No authentication providers configured');
      }

      this.initialized = true;
      this.log(`AuthManager initialized with providers: ${Array.from(this.providers.keys()).join(', ')}`);
      this.log(`Default provider: ${this.defaultProvider}`);

    } catch (error) {
      this.log(`Failed to initialize AuthManager: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Add authentication provider
   * @param {string} name - Provider name
   * @param {Class} ProviderClass - Provider class
   * @param {Object} config - Provider configuration
   */
  async addProvider(name, ProviderClass, config) {
    try {
      const provider = new ProviderClass(config);
      await provider.initialize();
      
      this.providers.set(name, provider);
      this.log(`Added authentication provider: ${name}`);
      
    } catch (error) {
      this.log(`Failed to add provider ${name}: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Get authentication provider by name
   * @param {string} name - Provider name (optional, uses default if not specified)
   * @returns {Object} Authentication provider
   */
  getProvider(name = null) {
    const providerName = name || this.defaultProvider;
    const provider = this.providers.get(providerName);
    
    if (!provider) {
      throw new Error(`Authentication provider '${providerName}' not found`);
    }
    
    return provider;
  }

  /**
   * Authenticate user with credentials
   * @param {Object} credentials - User credentials
   * @param {Object} options - Authentication options
   * @returns {Promise<Object>} Authentication result
   */
  async authenticate(credentials, options = {}) {
    this.ensureInitialized();
    
    const provider = this.getProvider(options.provider);
    const context = this.buildContext(options);
    
    try {
      const result = await provider.authenticate(credentials, context);
      
      if (result.success) {
        this.log(`Authentication successful for ${credentials.email}`, 'info', {
          provider: options.provider || this.defaultProvider,
          userId: result.user?.id
        });
      } else {
        this.log(`Authentication failed for ${credentials.email}: ${result.error}`, 'warn', {
          provider: options.provider || this.defaultProvider,
          code: result.code
        });
      }
      
      return result;
      
    } catch (error) {
      this.log(`Authentication error: ${error.message}`, 'error', {
        provider: options.provider || this.defaultProvider,
        email: credentials.email
      });
      
      return {
        success: false,
        error: 'Authentication failed',
        code: 'AUTH_ERROR'
      };
    }
  }

  /**
   * Register new user
   * @param {Object} userData - User registration data
   * @param {Object} options - Registration options
   * @returns {Promise<Object>} Registration result
   */
  async register(userData, options = {}) {
    this.ensureInitialized();
    
    const provider = this.getProvider(options.provider);
    const context = this.buildContext(options);
    
    try {
      const result = await provider.register(userData, context);
      
      if (result.success) {
        this.log(`User registration successful: ${userData.email}`, 'info', {
          provider: options.provider || this.defaultProvider,
          userId: result.user?.id
        });
      } else {
        this.log(`User registration failed: ${userData.email}: ${result.error}`, 'warn', {
          provider: options.provider || this.defaultProvider,
          code: result.code
        });
      }
      
      return result;
      
    } catch (error) {
      this.log(`Registration error: ${error.message}`, 'error', {
        provider: options.provider || this.defaultProvider,
        email: userData.email
      });
      
      return {
        success: false,
        error: 'Registration failed',
        code: 'REGISTRATION_ERROR'
      };
    }
  }

  /**
   * Refresh authentication token
   * @param {string} refreshToken - Refresh token
   * @param {Object} options - Refresh options
   * @returns {Promise<Object>} Refresh result
   */
  async refresh(refreshToken, options = {}) {
    this.ensureInitialized();
    
    const provider = this.getProvider(options.provider);
    const context = this.buildContext(options);
    
    try {
      const result = await provider.refresh(refreshToken, context);
      
      if (result.success) {
        this.log('Token refresh successful', 'info', {
          provider: options.provider || this.defaultProvider
        });
      }
      
      return result;
      
    } catch (error) {
      this.log(`Token refresh error: ${error.message}`, 'error', {
        provider: options.provider || this.defaultProvider
      });
      
      return {
        success: false,
        error: 'Token refresh failed',
        code: 'REFRESH_ERROR'
      };
    }
  }

  /**
   * Logout user
   * @param {string} token - Authentication token
   * @param {Object} options - Logout options
   * @returns {Promise<Object>} Logout result
   */
  async logout(token, options = {}) {
    this.ensureInitialized();
    
    const provider = this.getProvider(options.provider);
    const context = this.buildContext(options);
    
    try {
      const result = await provider.logout(token, context);
      
      this.log('User logout successful', 'info', {
        provider: options.provider || this.defaultProvider
      });
      
      return result;
      
    } catch (error) {
      this.log(`Logout error: ${error.message}`, 'error', {
        provider: options.provider || this.defaultProvider
      });
      
      return {
        success: false,
        error: 'Logout failed',
        code: 'LOGOUT_ERROR'
      };
    }
  }

  /**
   * Validate authentication token
   * @param {string} token - Authentication token
   * @param {Object} options - Validation options
   * @returns {Promise<Object>} Validation result
   */
  async validateToken(token, options = {}) {
    this.ensureInitialized();
    
    const provider = this.getProvider(options.provider);
    const context = this.buildContext(options);
    
    try {
      const result = await provider.validateToken(token, context);
      return result;
      
    } catch (error) {
      this.log(`Token validation error: ${error.message}`, 'error', {
        provider: options.provider || this.defaultProvider
      });
      
      return {
        valid: false,
        error: 'Token validation failed',
        code: 'VALIDATION_ERROR'
      };
    }
  }

  /**
   * Get user by ID
   * @param {string} userId - User identifier
   * @param {Object} options - Options
   * @returns {Promise<Object>} User data
   */
  async getUser(userId, options = {}) {
    this.ensureInitialized();
    
    const provider = this.getProvider(options.provider);
    
    try {
      return await provider.getUser(userId);
    } catch (error) {
      this.log(`Get user error: ${error.message}`, 'error', {
        provider: options.provider || this.defaultProvider,
        userId
      });
      return null;
    }
  }

  /**
   * Update user data
   * @param {string} userId - User identifier
   * @param {Object} updateData - Data to update
   * @param {Object} options - Options
   * @returns {Promise<Object>} Update result
   */
  async updateUser(userId, updateData, options = {}) {
    this.ensureInitialized();
    
    const provider = this.getProvider(options.provider);
    
    try {
      const result = await provider.updateUser(userId, updateData);
      
      if (result.success) {
        this.log(`User updated successfully: ${userId}`, 'info', {
          provider: options.provider || this.defaultProvider
        });
      }
      
      return result;
      
    } catch (error) {
      this.log(`Update user error: ${error.message}`, 'error', {
        provider: options.provider || this.defaultProvider,
        userId
      });
      
      return {
        success: false,
        error: 'User update failed',
        code: 'UPDATE_ERROR'
      };
    }
  }

  /**
   * Delete user
   * @param {string} userId - User identifier
   * @param {Object} options - Options
   * @returns {Promise<Object>} Deletion result
   */
  async deleteUser(userId, options = {}) {
    this.ensureInitialized();
    
    const provider = this.getProvider(options.provider);
    
    try {
      const result = await provider.deleteUser(userId);
      
      if (result.success) {
        this.log(`User deleted successfully: ${userId}`, 'info', {
          provider: options.provider || this.defaultProvider
        });
      }
      
      return result;
      
    } catch (error) {
      this.log(`Delete user error: ${error.message}`, 'error', {
        provider: options.provider || this.defaultProvider,
        userId
      });
      
      return {
        success: false,
        error: 'User deletion failed',
        code: 'DELETE_ERROR'
      };
    }
  }

  /**
   * Reset user password
   * @param {string} email - User email
   * @param {Object} options - Options
   * @returns {Promise<Object>} Reset result
   */
  async resetPassword(email, options = {}) {
    this.ensureInitialized();
    
    const provider = this.getProvider(options.provider);
    const context = this.buildContext(options);
    
    try {
      const result = await provider.resetPassword(email, context);
      
      this.log(`Password reset requested for: ${email}`, 'info', {
        provider: options.provider || this.defaultProvider
      });
      
      return result;
      
    } catch (error) {
      this.log(`Password reset error: ${error.message}`, 'error', {
        provider: options.provider || this.defaultProvider,
        email
      });
      
      return {
        success: false,
        error: 'Password reset failed',
        code: 'RESET_ERROR'
      };
    }
  }

  /**
   * Verify email address
   * @param {string} token - Email verification token
   * @param {Object} options - Options
   * @returns {Promise<Object>} Verification result
   */
  async verifyEmail(token, options = {}) {
    this.ensureInitialized();
    
    const provider = this.getProvider(options.provider);
    
    try {
      const result = await provider.verifyEmail(token);
      
      if (result.success) {
        this.log('Email verification successful', 'info', {
          provider: options.provider || this.defaultProvider
        });
      }
      
      return result;
      
    } catch (error) {
      this.log(`Email verification error: ${error.message}`, 'error', {
        provider: options.provider || this.defaultProvider
      });
      
      return {
        success: false,
        error: 'Email verification failed',
        code: 'VERIFICATION_ERROR'
      };
    }
  }

  /**
   * Get health status of all providers
   * @returns {Object} Health status
   */
  getHealthStatus() {
    const providers = {};
    
    for (const [name, provider] of this.providers.entries()) {
      providers[name] = provider.getHealthStatus();
    }
    
    const healthyProviders = Object.values(providers).filter(p => p.status === 'healthy').length;
    
    return {
      status: healthyProviders > 0 ? 'healthy' : 'unhealthy',
      initialized: this.initialized,
      defaultProvider: this.defaultProvider,
      totalProviders: this.providers.size,
      healthyProviders,
      providers
    };
  }

  /**
   * Get available authentication providers
   * @returns {Array} Available providers
   */
  getAvailableProviders() {
    return Array.from(this.providers.keys());
  }

  /**
   * Get provider configuration (safe)
   * @returns {Object} Provider configurations without sensitive data
   */
  getProviderConfigs() {
    const configs = {};
    
    for (const [name, provider] of this.providers.entries()) {
      configs[name] = provider.getConfig();
    }
    
    return configs;
  }

  /**
   * Middleware for Express.js route protection
   * @param {Object} options - Middleware options
   * @returns {Function} Express middleware function
   */
  middleware(options = {}) {
    const { 
      required = true,
      provider = null,
      roles = [],
      permissions = []
    } = options;

    return async (req, res, next) => {
      try {
        const token = this.extractToken(req);
        
        if (!token) {
          if (required) {
            return res.status(401).json({
              error: 'Authentication required',
              code: 'NO_TOKEN'
            });
          } else {
            return next();
          }
        }

        const validation = await this.validateToken(token, { provider });
        
        if (!validation.valid) {
          return res.status(401).json({
            error: validation.error,
            code: validation.code
          });
        }

        // Check roles
        if (roles.length > 0) {
          const userRoles = validation.user.roles || [];
          const hasRole = roles.some(role => userRoles.includes(role));
          
          if (!hasRole) {
            return res.status(403).json({
              error: 'Insufficient permissions',
              code: 'INSUFFICIENT_ROLES'
            });
          }
        }

        // Attach user to request
        req.user = validation.user;
        req.userId = validation.user.id;
        req.userRoles = validation.user.roles || [];
        
        next();
        
      } catch (error) {
        this.log(`Middleware error: ${error.message}`, 'error');
        res.status(500).json({
          error: 'Authentication error',
          code: 'AUTH_ERROR'
        });
      }
    };
  }

  /**
   * Extract token from request
   * @param {Object} req - Express request object
   * @returns {string|null} Authentication token
   */
  extractToken(req) {
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    
    // Check cookie
    if (req.cookies && req.cookies.auth_token) {
      return req.cookies.auth_token;
    }
    
    // Check query parameter
    if (req.query && req.query.token) {
      return req.query.token;
    }
    
    return null;
  }

  /**
   * Build context object for provider calls
   * @param {Object} options - Options
   * @returns {Object} Context object
   */
  buildContext(options = {}) {
    return {
      ip: options.ip || 'unknown',
      userAgent: options.userAgent || 'unknown',
      timestamp: new Date().toISOString(),
      ...options.context
    };
  }

  /**
   * Ensure AuthManager is initialized
   */
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('AuthManager not initialized. Call initialize() first.');
    }
  }

  /**
   * Handle provider-specific callback (for OAuth flows)
   * @param {string} providerName - Provider name
   * @param {Object} callbackData - Callback data from provider
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Callback result
   */
  async handleCallback(providerName, callbackData, options = {}) {
    this.ensureInitialized();
    
    const provider = this.getProvider(providerName);
    const context = this.buildContext(options);
    
    try {
      // Handle provider-specific callback logic
      if (providerName === 'auth0') {
        return await this.handleAuth0Callback(provider, callbackData, context);
      } else if (providerName === 'clerk') {
        return await this.handleClerkCallback(provider, callbackData, context);
      } else {
        return {
          success: false,
          error: `Callback not supported for provider: ${providerName}`,
          code: 'CALLBACK_NOT_SUPPORTED'
        };
      }
    } catch (error) {
      this.log(`Callback handling failed for ${providerName}: ${error.message}`, 'error');
      
      return {
        success: false,
        error: 'Callback handling failed',
        code: 'CALLBACK_ERROR'
      };
    }
  }

  /**
   * Handle Auth0 callback
   * @param {Object} provider - Auth0 provider instance
   * @param {Object} callbackData - Auth0 callback data
   * @param {Object} context - Request context
   * @returns {Promise<Object>} Callback result
   */
  async handleAuth0Callback(provider, callbackData, context) {
    const { code, state, error, error_description } = callbackData;
    
    if (error) {
      return {
        success: false,
        error: error_description || error,
        code: 'AUTH0_CALLBACK_ERROR'
      };
    }
    
    if (!code) {
      return {
        success: false,
        error: 'Authorization code not provided',
        code: 'MISSING_AUTH_CODE'
      };
    }
    
    // Exchange code for tokens (would be implemented in Auth0Provider)
    // For now, return success with basic data
    return {
      success: true,
      provider: 'auth0',
      code,
      state
    };
  }

  /**
   * Handle Clerk callback/webhook
   * @param {Object} provider - Clerk provider instance
   * @param {Object} callbackData - Clerk callback data
   * @param {Object} context - Request context
   * @returns {Promise<Object>} Callback result
   */
  async handleClerkCallback(provider, callbackData, context) {
    // Clerk uses webhooks for most callbacks
    if (typeof provider.handleWebhook === 'function') {
      return await provider.handleWebhook(callbackData, context.signature);
    }
    
    return {
      success: true,
      provider: 'clerk',
      message: 'Callback processed'
    };
  }

  /**
   * Get current user from any provider
   * @param {string} token - Authentication token
   * @param {string} providerName - Provider name (optional)
   * @returns {Promise<Object>} User data
   */
  async getCurrentUser(token, providerName = null) {
    this.ensureInitialized();
    
    if (providerName) {
      // Use specific provider
      const provider = this.getProvider(providerName);
      const validation = await provider.validateToken(token);
      return validation.valid ? validation.user : null;
    } else {
      // Try all providers until one succeeds
      for (const [name, provider] of this.providers.entries()) {
        try {
          const validation = await provider.validateToken(token);
          if (validation.valid) {
            return {
              ...validation.user,
              provider: name
            };
          }
        } catch (error) {
          // Continue to next provider
          continue;
        }
      }
      return null;
    }
  }

  /**
   * List all available providers with their status
   * @returns {Array} Provider information
   */
  getAvailableProviders() {
    const providers = [];
    
    for (const [name, provider] of this.providers.entries()) {
      const health = provider.getHealthStatus();
      const config = provider.getConfig();
      
      providers.push({
        name,
        type: config.type,
        status: health.status,
        isDefault: name === this.defaultProvider,
        displayName: this.getProviderDisplayName(name),
        supportsRegistration: this.providerSupportsRegistration(name),
        supportsPasswordReset: this.providerSupportsPasswordReset(name)
      });
    }
    
    return providers.sort((a, b) => {
      if (a.isDefault) return -1;
      if (b.isDefault) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Authenticate with automatic provider detection
   * @param {Object} credentials - Authentication credentials
   * @param {Object} options - Authentication options
   * @returns {Promise<Object>} Authentication result
   */
  async authenticateAuto(credentials, options = {}) {
    this.ensureInitialized();
    
    // Try to detect provider from credentials
    const detectedProvider = this.detectProviderFromCredentials(credentials);
    
    if (detectedProvider) {
      return await this.authenticate(credentials, { ...options, provider: detectedProvider });
    }
    
    // Try default provider first
    try {
      const result = await this.authenticate(credentials, options);
      if (result.success) {
        return result;
      }
    } catch (error) {
      this.log(`Default provider authentication failed: ${error.message}`, 'warn');
    }
    
    // Try other providers
    for (const [name, provider] of this.providers.entries()) {
      if (name === this.defaultProvider) continue; // Already tried
      
      try {
        const result = await this.authenticate(credentials, { ...options, provider: name });
        if (result.success) {
          return {
            ...result,
            provider: name
          };
        }
      } catch (error) {
        // Continue to next provider
        continue;
      }
    }
    
    return {
      success: false,
      error: 'Authentication failed with all providers',
      code: 'ALL_PROVIDERS_FAILED'
    };
  }

  /**
   * Handle provider failover
   * @param {string} failedProvider - Provider that failed
   * @param {Object} credentials - Authentication credentials
   * @param {Object} options - Authentication options
   * @returns {Promise<Object>} Failover result
   */
  async handleProviderFailover(failedProvider, credentials, options = {}) {
    this.log(`Handling failover from provider: ${failedProvider}`, 'warn');
    
    // Get list of alternative providers
    const alternatives = Array.from(this.providers.keys())
      .filter(name => name !== failedProvider)
      .sort((a, b) => {
        // Prioritize default provider
        if (a === this.defaultProvider) return -1;
        if (b === this.defaultProvider) return 1;
        return 0;
      });
    
    for (const providerName of alternatives) {
      try {
        const result = await this.authenticate(credentials, { ...options, provider: providerName });
        if (result.success) {
          this.log(`Failover successful to provider: ${providerName}`, 'info');
          return {
            ...result,
            failedOver: true,
            originalProvider: failedProvider,
            currentProvider: providerName
          };
        }
      } catch (error) {
        this.log(`Failover attempt failed for ${providerName}: ${error.message}`, 'warn');
        continue;
      }
    }
    
    return {
      success: false,
      error: 'All failover attempts failed',
      code: 'FAILOVER_EXHAUSTED',
      failedProvider,
      attemptedProviders: alternatives
    };
  }

  // Helper methods

  getProviderDisplayName(providerName) {
    const displayNames = {
      local: 'Email/Password',
      auth0: 'Auth0',
      clerk: 'Clerk',
      mock: 'Mock (Development)'
    };
    return displayNames[providerName] || providerName;
  }

  providerSupportsRegistration(providerName) {
    // All providers support registration
    return true;
  }

  providerSupportsPasswordReset(providerName) {
    // Mock provider doesn't really support password reset
    return providerName !== 'mock';
  }

  detectProviderFromCredentials(credentials) {
    // Detect provider based on credential patterns
    if (credentials.sessionToken || credentials.sessionId) {
      return 'clerk';
    }
    
    if (credentials.token && credentials.token.startsWith('mock-')) {
      return 'mock';
    }
    
    if (credentials.token && this.isJWT(credentials.token)) {
      // Could be Auth0 or other JWT provider
      return 'auth0';
    }
    
    if (credentials.email && credentials.password) {
      // Default to local provider for email/password
      return this.defaultProvider;
    }
    
    return null;
  }

  isJWT(token) {
    // Simple JWT detection - has 3 parts separated by dots
    return typeof token === 'string' && token.split('.').length === 3;
  }

  /**
   * Enhanced middleware with provider detection
   * @param {Object} options - Middleware options
   * @returns {Function} Express middleware function
   */
  middleware(options = {}) {
    const { 
      required = true,
      provider = null,
      roles = [],
      permissions = [],
      autoDetect = false
    } = options;

    return async (req, res, next) => {
      try {
        const token = this.extractToken(req);
        
        if (!token) {
          if (required) {
            return res.status(401).json({
              error: 'Authentication required',
              code: 'NO_TOKEN'
            });
          } else {
            return next();
          }
        }

        let validation;
        
        if (autoDetect) {
          // Try to authenticate with any provider
          const user = await this.getCurrentUser(token);
          if (user) {
            validation = { valid: true, user };
          } else {
            validation = { valid: false, error: 'Invalid token' };
          }
        } else {
          // Use specific provider or default
          validation = await this.validateToken(token, { provider });
        }
        
        if (!validation.valid) {
          return res.status(401).json({
            error: validation.error,
            code: validation.code
          });
        }

        // Check roles if specified
        if (roles.length > 0) {
          const userRoles = validation.user.roles || [];
          const hasRole = roles.some(role => userRoles.includes(role));
          
          if (!hasRole) {
            return res.status(403).json({
              error: 'Insufficient permissions',
              code: 'INSUFFICIENT_ROLES'
            });
          }
        }

        // Attach user to request
        req.user = validation.user;
        req.userId = validation.user.id;
        req.userRoles = validation.user.roles || [];
        req.authProvider = validation.user.provider || provider || this.defaultProvider;
        
        next();
        
      } catch (error) {
        this.log(`Enhanced middleware error: ${error.message}`, 'error');
        res.status(500).json({
          error: 'Authentication error',
          code: 'AUTH_ERROR'
        });
      }
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    for (const [name, provider] of this.providers.entries()) {
      if (typeof provider.shutdown === 'function') {
        await provider.shutdown();
      }
    }
    
    this.providers.clear();
    this.initialized = false;
    this.log('AuthManager shutdown completed');
  }

  /**
   * Log messages
   * @param {string} message - Log message
   * @param {string} level - Log level
   * @param {Object} metadata - Additional metadata
   */
  log(message, level = 'info', metadata = {}) {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      component: 'AuthManager',
      level,
      message,
      ...metadata
    };

    switch (level) {
      case 'error':
        console.error('[AuthManager]', logData);
        break;
      case 'warn':
        console.warn('[AuthManager]', logData);
        break;
      default:
        console.log('[AuthManager]', logData);
    }
  }
}

// Export singleton instance
const authManager = new AuthManager();
export default authManager;