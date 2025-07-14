/**
 * BaseAuthProvider - Abstract base class for authentication providers
 * 
 * Defines the interface that all authentication providers must implement.
 * Supports multiple authentication methods (local, OAuth, SSO) with a unified API.
 */

class BaseAuthProvider {
  constructor(config = {}) {
    this.config = config;
    this.type = this.constructor.name.replace('AuthProvider', '').toLowerCase();
    
    if (this.constructor === BaseAuthProvider) {
      throw new Error('BaseAuthProvider is abstract and cannot be instantiated directly');
    }
  }

  /**
   * Initialize the authentication provider
   * Override in child classes for provider-specific setup
   */
  async initialize() {
    throw new Error('initialize() must be implemented by authentication provider');
  }

  /**
   * Authenticate user with credentials
   * @param {Object} credentials - User credentials (email/password, token, etc.)
   * @param {Object} context - Additional context (IP, user agent, etc.)
   * @returns {Promise<Object>} Authentication result
   */
  async authenticate(credentials, context = {}) {
    throw new Error('authenticate() must be implemented by authentication provider');
  }

  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Registration result
   */
  async register(userData, context = {}) {
    throw new Error('register() must be implemented by authentication provider');
  }

  /**
   * Refresh authentication token/session
   * @param {string} refreshToken - Refresh token or session identifier
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Refresh result
   */
  async refresh(refreshToken, context = {}) {
    throw new Error('refresh() must be implemented by authentication provider');
  }

  /**
   * Logout user and invalidate session/token
   * @param {string} token - Access token or session identifier
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Logout result
   */
  async logout(token, context = {}) {
    throw new Error('logout() must be implemented by authentication provider');
  }

  /**
   * Validate and decode authentication token
   * @param {string} token - Authentication token
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Validation result with user data
   */
  async validateToken(token, context = {}) {
    throw new Error('validateToken() must be implemented by authentication provider');
  }

  /**
   * Get user by ID
   * @param {string} userId - User identifier
   * @returns {Promise<Object>} User data
   */
  async getUser(userId) {
    throw new Error('getUser() must be implemented by authentication provider');
  }

  /**
   * Update user data
   * @param {string} userId - User identifier
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated user data
   */
  async updateUser(userId, updateData) {
    throw new Error('updateUser() must be implemented by authentication provider');
  }

  /**
   * Delete/deactivate user
   * @param {string} userId - User identifier
   * @returns {Promise<Object>} Deletion result
   */
  async deleteUser(userId) {
    throw new Error('deleteUser() must be implemented by authentication provider');
  }

  /**
   * Reset user password
   * @param {string} email - User email
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Reset result
   */
  async resetPassword(email, context = {}) {
    throw new Error('resetPassword() must be implemented by authentication provider');
  }

  /**
   * Verify email address
   * @param {string} token - Email verification token
   * @returns {Promise<Object>} Verification result
   */
  async verifyEmail(token) {
    throw new Error('verifyEmail() must be implemented by authentication provider');
  }

  /**
   * Get provider health status
   * @returns {Object} Health status information
   */
  getHealthStatus() {
    return {
      provider: this.type,
      status: 'healthy',
      initialized: true,
      lastCheck: new Date().toISOString()
    };
  }

  /**
   * Get provider configuration (without sensitive data)
   * @returns {Object} Safe configuration data
   */
  getConfig() {
    const { ...safeConfig } = this.config;
    
    // Remove sensitive configuration keys
    const sensitiveKeys = ['secret', 'key', 'password', 'token', 'apiKey', 'clientSecret'];
    sensitiveKeys.forEach(key => {
      Object.keys(safeConfig).forEach(configKey => {
        if (configKey.toLowerCase().includes(key)) {
          delete safeConfig[configKey];
        }
      });
    });
    
    return {
      type: this.type,
      config: safeConfig
    };
  }

  /**
   * Validate required configuration
   * @param {Array} requiredKeys - Required configuration keys
   */
  validateConfig(requiredKeys = []) {
    const missing = requiredKeys.filter(key => !this.config[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }
  }

  /**
   * Log provider events
   * @param {string} message - Log message
   * @param {string} level - Log level
   * @param {Object} metadata - Additional metadata
   */
  log(message, level = 'info', metadata = {}) {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      provider: this.type,
      level,
      message,
      ...metadata
    };

    switch (level) {
      case 'error':
        console.error(`[${this.type}Auth]`, logData);
        break;
      case 'warn':
        console.warn(`[${this.type}Auth]`, logData);
        break;
      default:
        console.log(`[${this.type}Auth]`, logData);
    }
  }
}

export default BaseAuthProvider;