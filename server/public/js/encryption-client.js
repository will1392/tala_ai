/**
 * Client-Side Encryption Utilities
 * 
 * Provides JavaScript utilities for client-side encryption operations
 * to complement the server-side end-to-end encryption system.
 */

class EncryptionClient {
  constructor(options = {}) {
    this.baseURL = options.baseURL || '/api/encryption';
    this.userPassword = null;
    this.sessionId = null;
    this.initialized = false;
    
    // Encryption parameters (will be fetched from server)
    this.params = {
      algorithms: {
        symmetric: 'AES-256-GCM',
        asymmetric: 'RSA-OAEP',
        hash: 'SHA-256'
      },
      keyLengths: {
        aes: 256,
        rsa: 4096,
        iv: 128,
        salt: 256
      }
    };
  }

  /**
   * Initialize the encryption client
   * @param {string} userPassword - User's password for encryption operations
   * @returns {Promise<Object>} Initialization result
   */
  async initialize(userPassword) {
    try {
      this.userPassword = userPassword;
      
      // Fetch encryption parameters from server
      const paramsResponse = await this.makeRequest('POST', '/client/params', {
        operation: 'encrypt'
      });
      
      if (paramsResponse.success) {
        this.params = paramsResponse.data;
        this.sessionId = paramsResponse.data.sessionId;
        this.initialized = true;
      }
      
      return {
        success: true,
        sessionId: this.sessionId,
        initialized: this.initialized
      };
      
    } catch (error) {
      console.error('Failed to initialize encryption client:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate encryption keys for the current user
   * @param {Object} options - Key generation options
   * @returns {Promise<Object>} Key generation result
   */
  async generateKeys(options = {}) {
    try {
      this.ensureInitialized();
      
      const { keySize = 4096, backupKey = true } = options;
      
      const response = await this.makeRequest('POST', '/keys', {
        keySize,
        backupKey,
        userPassword: this.userPassword
      });
      
      if (response.success) {
        this.log('Encryption keys generated successfully');
      }
      
      return response;
      
    } catch (error) {
      console.error('Key generation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get user's public key
   * @returns {Promise<Object>} Public key result
   */
  async getPublicKey() {
    try {
      this.ensureInitialized();
      
      const response = await this.makeRequest('GET', '/keys/public');
      return response;
      
    } catch (error) {
      console.error('Failed to get public key:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get public keys for multiple users
   * @param {Array<string>} userIds - User IDs to get keys for
   * @returns {Promise<Object>} Batch public keys result
   */
  async getPublicKeys(userIds) {
    try {
      this.ensureInitialized();
      
      const response = await this.makeRequest('POST', '/keys/public/batch', {
        userIds
      });
      
      return response;
      
    } catch (error) {
      console.error('Failed to get public keys:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify user password
   * @returns {Promise<Object>} Verification result
   */
  async verifyPassword() {
    try {
      this.ensureInitialized();
      
      const response = await this.makeRequest('POST', '/keys/verify', {
        userPassword: this.userPassword
      });
      
      return response;
      
    } catch (error) {
      console.error('Password verification failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Rotate encryption keys
   * @param {Object} options - Rotation options
   * @returns {Promise<Object>} Rotation result
   */
  async rotateKeys(options = {}) {
    try {
      this.ensureInitialized();
      
      const { keySize = 4096, backupOldKey = true } = options;
      
      const response = await this.makeRequest('POST', '/keys/rotate', {
        keySize,
        backupOldKey,
        userPassword: this.userPassword
      });
      
      if (response.success) {
        this.log('Encryption keys rotated successfully');
      }
      
      return response;
      
    } catch (error) {
      console.error('Key rotation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create encrypted document
   * @param {Object} documentData - Document data to encrypt
   * @returns {Promise<Object>} Document creation result
   */
  async createEncryptedDocument(documentData) {
    try {
      this.ensureInitialized();
      
      const response = await this.makeRequest('POST', '/documents', {
        ...documentData,
        userPassword: this.userPassword
      });
      
      if (response.success) {
        this.log('Encrypted document created successfully');
      }
      
      return response;
      
    } catch (error) {
      console.error('Encrypted document creation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get encrypted document (with automatic decryption)
   * @param {string} documentId - Document ID
   * @param {Object} options - Retrieval options
   * @returns {Promise<Object>} Document retrieval result
   */
  async getEncryptedDocument(documentId, options = {}) {
    try {
      this.ensureInitialized();
      
      const { includeContent = true } = options;
      
      const response = await this.makeRequest('GET', `/documents/${documentId}`, null, {
        'x-user-password': this.userPassword
      }, {
        includeContent
      });
      
      return response;
      
    } catch (error) {
      console.error('Document retrieval failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Share encrypted document with other users
   * @param {string} documentId - Document ID
   * @param {Array<string>} shareWith - User IDs to share with
   * @param {Object} options - Sharing options
   * @returns {Promise<Object>} Sharing result
   */
  async shareEncryptedDocument(documentId, shareWith, options = {}) {
    try {
      this.ensureInitialized();
      
      const { permissions = ['read'], notifyRecipients = true } = options;
      
      const response = await this.makeRequest('POST', `/documents/${documentId}/share`, {
        shareWith,
        permissions,
        notifyRecipients,
        userPassword: this.userPassword
      });
      
      if (response.success) {
        this.log(`Document shared with ${shareWith.length} users`);
      }
      
      return response;
      
    } catch (error) {
      console.error('Document sharing failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Revoke document access for specific users
   * @param {string} documentId - Document ID
   * @param {Array<string>} revokeUsers - User IDs to revoke access from
   * @param {string} reason - Reason for revocation
   * @returns {Promise<Object>} Revocation result
   */
  async revokeDocumentAccess(documentId, revokeUsers, reason = 'access_revoked') {
    try {
      this.ensureInitialized();
      
      const response = await this.makeRequest('POST', `/documents/${documentId}/revoke`, {
        revokeUsers,
        reason
      });
      
      if (response.success) {
        this.log(`Access revoked for ${revokeUsers.length} users`);
      }
      
      return response;
      
    } catch (error) {
      console.error('Access revocation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get encryption statistics for current user
   * @returns {Promise<Object>} Statistics result
   */
  async getEncryptionStats() {
    try {
      this.ensureInitialized();
      
      const response = await this.makeRequest('GET', '/stats');
      return response;
      
    } catch (error) {
      console.error('Failed to get encryption stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check encryption service health
   * @returns {Promise<Object>} Health check result
   */
  async checkHealth() {
    try {
      const response = await this.makeRequest('GET', '/health');
      return response;
      
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Utility: Prepare document for client-side pre-encryption
   * @param {Object} document - Document to prepare
   * @returns {Object} Prepared document data
   */
  prepareDocumentForEncryption(document) {
    return {
      title: document.title,
      content: document.content,
      shareWith: document.shareWith || [],
      organizationId: document.organizationId,
      tags: document.tags || [],
      metadata: {
        clientEncrypted: true,
        encryptionVersion: '1.0.0',
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
        ...document.metadata
      }
    };
  }

  /**
   * Utility: Generate secure password prompt UI
   * @param {Object} options - UI options
   * @returns {Promise<string>} User password
   */
  async promptForPassword(options = {}) {
    const {
      title = 'Enter Encryption Password',
      message = 'Please enter your password to access encrypted documents:',
      placeholder = 'Password'
    } = options;

    return new Promise((resolve, reject) => {
      // Create modal dialog
      const modal = document.createElement('div');
      modal.className = 'encryption-password-modal';
      modal.innerHTML = `
        <div class="modal-overlay">
          <div class="modal-content">
            <h3>${title}</h3>
            <p>${message}</p>
            <div class="password-input-group">
              <input type="password" id="encryption-password" placeholder="${placeholder}" />
              <div class="password-strength-indicator"></div>
            </div>
            <div class="modal-actions">
              <button type="button" id="cancel-password">Cancel</button>
              <button type="button" id="submit-password" disabled>Submit</button>
            </div>
          </div>
        </div>
      `;

      // Add CSS styles
      const style = document.createElement('style');
      style.textContent = `
        .encryption-password-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 10000;
        }
        .modal-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-content {
          background: white;
          padding: 24px;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          max-width: 400px;
          width: 90%;
        }
        .password-input-group {
          margin: 16px 0;
        }
        .password-input-group input {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
        }
        .password-strength-indicator {
          height: 4px;
          background: #f0f0f0;
          border-radius: 2px;
          margin-top: 8px;
          transition: all 0.3s ease;
        }
        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 16px;
        }
        .modal-actions button {
          padding: 8px 16px;
          border: 1px solid #ddd;
          border-radius: 4px;
          cursor: pointer;
        }
        #submit-password {
          background: #007bff;
          color: white;
          border-color: #007bff;
        }
        #submit-password:disabled {
          background: #6c757d;
          border-color: #6c757d;
          cursor: not-allowed;
        }
      `;

      document.head.appendChild(style);
      document.body.appendChild(modal);

      const passwordInput = modal.querySelector('#encryption-password');
      const submitButton = modal.querySelector('#submit-password');
      const cancelButton = modal.querySelector('#cancel-password');
      const strengthIndicator = modal.querySelector('.password-strength-indicator');

      // Password strength validation
      passwordInput.addEventListener('input', (e) => {
        const password = e.target.value;
        const strength = this.calculatePasswordStrength(password);
        
        submitButton.disabled = strength < 3;
        
        const colors = ['#dc3545', '#ffc107', '#28a745'];
        const widths = ['25%', '50%', '75%', '100%'];
        
        strengthIndicator.style.background = colors[Math.min(strength - 1, 2)] || '#f0f0f0';
        strengthIndicator.style.width = widths[strength] || '0%';
      });

      // Handle form submission
      const handleSubmit = () => {
        const password = passwordInput.value;
        if (password) {
          document.body.removeChild(modal);
          document.head.removeChild(style);
          resolve(password);
        }
      };

      const handleCancel = () => {
        document.body.removeChild(modal);
        document.head.removeChild(style);
        reject(new Error('Password prompt cancelled'));
      };

      submitButton.addEventListener('click', handleSubmit);
      cancelButton.addEventListener('click', handleCancel);
      
      passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !submitButton.disabled) {
          handleSubmit();
        }
        if (e.key === 'Escape') {
          handleCancel();
        }
      });

      // Focus the password input
      setTimeout(() => passwordInput.focus(), 100);
    });
  }

  /**
   * Calculate password strength (simple implementation)
   * @param {string} password - Password to evaluate
   * @returns {number} Strength score (0-4)
   */
  calculatePasswordStrength(password) {
    let score = 0;
    
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    
    return score;
  }

  /**
   * Make HTTP request to encryption API
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request data
   * @param {Object} headers - Additional headers
   * @param {Object} params - URL parameters
   * @returns {Promise<Object>} Response data
   */
  async makeRequest(method, endpoint, data = null, headers = {}, params = {}) {
    try {
      const url = new URL(this.baseURL + endpoint, window.location.origin);
      
      // Add query parameters
      Object.keys(params).forEach(key => {
        url.searchParams.append(key, params[key]);
      });

      const requestOptions = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      // Add password header if available
      if (this.userPassword && !headers['x-user-password']) {
        requestOptions.headers['x-user-password'] = this.userPassword;
      }

      // Add request body for non-GET requests
      if (data && method !== 'GET') {
        requestOptions.body = JSON.stringify(data);
      }

      const response = await fetch(url.toString(), requestOptions);
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error?.message || `HTTP ${response.status}`);
      }

      return responseData;

    } catch (error) {
      console.error(`Request failed: ${method} ${endpoint}`, error);
      throw error;
    }
  }

  /**
   * Ensure client is initialized
   */
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('Encryption client not initialized. Call initialize() first.');
    }
  }

  /**
   * Log messages (can be extended for better logging)
   * @param {string} message - Log message
   * @param {string} level - Log level
   */
  log(message, level = 'info') {
    if (level === 'error') {
      console.error('[EncryptionClient]', message);
    } else {
      console.log('[EncryptionClient]', message);
    }
  }

  /**
   * Get client status
   * @returns {Object} Client status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      sessionId: this.sessionId,
      hasPassword: !!this.userPassword,
      baseURL: this.baseURL,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Clear sensitive data and shutdown client
   */
  shutdown() {
    this.userPassword = null;
    this.sessionId = null;
    this.initialized = false;
    this.log('Encryption client shutdown completed');
  }
}

// Export for use in browser environments
if (typeof window !== 'undefined') {
  window.EncryptionClient = EncryptionClient;
}

// Export for module environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EncryptionClient;
}