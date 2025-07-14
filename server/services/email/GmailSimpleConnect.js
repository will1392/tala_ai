/**
 * Gmail Simple Connect Service
 * 
 * Provides a simplified interface for Gmail connection management
 */

import googleOAuthService from '../auth/GoogleOAuthService.js';
import { EventEmitter } from 'events';

class GmailSimpleConnect extends EventEmitter {
  constructor() {
    super();
    this.connectionCache = new Map();
  }

  /**
   * Initialize connection for a user
   * @param {string} userId - User ID
   * @returns {Object} Connection URL and status
   */
  async initializeConnection(userId) {
    try {
      // Check if already connected
      const status = await this.getConnectionStatus(userId);
      if (status.connected) {
        return {
          alreadyConnected: true,
          accounts: status.accounts
        };
      }

      // Generate auth URL
      const authUrl = googleOAuthService.generateAuthUrl(userId);
      
      return {
        authUrl,
        alreadyConnected: false
      };
    } catch (error) {
      this.emit('error', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Get connection status for user
   * @param {string} userId - User ID
   * @returns {Object} Connection status
   */
  async getConnectionStatus(userId) {
    try {
      // Check cache first
      const cached = this.connectionCache.get(userId);
      if (cached && (Date.now() - cached.timestamp) < 60000) { // 1 minute cache
        return cached.data;
      }

      const connections = await googleOAuthService.getUserConnections(userId);
      
      const status = {
        connected: connections.length > 0,
        accounts: connections.map(conn => ({
          email: conn.email,
          connectedAt: conn.connectedAt,
          lastRefreshed: conn.lastRefreshed,
          picture: conn.userInfo?.picture,
          name: conn.userInfo?.name,
          isActive: true
        })),
        primaryAccount: connections[0]?.email || null
      };

      // Update cache
      this.connectionCache.set(userId, {
        timestamp: Date.now(),
        data: status
      });

      return status;
    } catch (error) {
      this.emit('error', { userId, error: error.message });
      return {
        connected: false,
        accounts: [],
        error: error.message
      };
    }
  }

  /**
   * Handle OAuth callback
   * @param {string} code - Authorization code
   * @param {string} state - State parameter
   * @returns {Object} Connection result
   */
  async handleCallback(code, state) {
    try {
      // Parse state to get user ID
      const stateData = googleOAuthService.parseState(state);
      
      // Exchange code for tokens
      const tokenData = await googleOAuthService.getTokens(code);
      
      // Store tokens
      const email = await googleOAuthService.storeUserTokens(stateData.userId, tokenData);
      
      // Clear cache
      this.connectionCache.delete(stateData.userId);
      
      // Emit connection event
      this.emit('connected', {
        userId: stateData.userId,
        email,
        userInfo: tokenData.userInfo
      });
      
      return {
        success: true,
        email,
        userInfo: tokenData.userInfo,
        returnUrl: stateData.returnUrl
      };
    } catch (error) {
      this.emit('error', { error: error.message });
      throw error;
    }
  }

  /**
   * Disconnect Gmail account
   * @param {string} userId - User ID
   * @param {string} email - Email to disconnect
   * @returns {Object} Disconnection result
   */
  async disconnect(userId, email) {
    try {
      await googleOAuthService.disconnect(userId, email);
      
      // Clear cache
      this.connectionCache.delete(userId);
      
      // Emit disconnection event
      this.emit('disconnected', { userId, email });
      
      return {
        success: true,
        message: `Gmail account ${email} disconnected`
      };
    } catch (error) {
      this.emit('error', { userId, email, error: error.message });
      throw error;
    }
  }

  /**
   * Test Gmail connection
   * @param {string} userId - User ID
   * @param {string} email - Optional specific email
   * @returns {Object} Test results
   */
  async testConnection(userId, email = null) {
    try {
      const result = await googleOAuthService.testConnection(userId, email);
      
      if (result.success) {
        this.emit('test:success', { userId, email: result.email });
      } else {
        this.emit('test:failed', { userId, email, error: result.error });
      }
      
      return result;
    } catch (error) {
      this.emit('error', { userId, email, error: error.message });
      throw error;
    }
  }

  /**
   * Get primary Gmail account for user
   * @param {string} userId - User ID
   * @returns {string|null} Primary email
   */
  async getPrimaryAccount(userId) {
    const status = await this.getConnectionStatus(userId);
    return status.primaryAccount;
  }

  /**
   * Check if specific email is connected
   * @param {string} userId - User ID
   * @param {string} email - Email to check
   * @returns {boolean} Connection status
   */
  async isEmailConnected(userId, email) {
    const status = await this.getConnectionStatus(userId);
    return status.accounts.some(acc => acc.email === email);
  }

  /**
   * Get connection metrics
   * @returns {Object} Connection metrics
   */
  getMetrics() {
    const cacheSize = this.connectionCache.size;
    const events = this.eventNames();
    
    return {
      cacheSize,
      activeEvents: events.length,
      listeners: events.reduce((acc, event) => {
        acc[event] = this.listenerCount(event);
        return acc;
      }, {})
    };
  }

  /**
   * Clear connection cache
   * @param {string} userId - Optional specific user
   */
  clearCache(userId = null) {
    if (userId) {
      this.connectionCache.delete(userId);
    } else {
      this.connectionCache.clear();
    }
  }

  /**
   * Handle connection errors gracefully
   * @param {string} userId - User ID
   * @param {Error} error - Error object
   * @returns {Object} Error response
   */
  handleConnectionError(userId, error) {
    const errorResponse = {
      connected: false,
      error: true,
      message: 'Gmail connection error'
    };

    if (error.message.includes('refresh')) {
      errorResponse.message = 'Gmail access expired. Please reconnect.';
      errorResponse.requiresReconnect = true;
    } else if (error.message.includes('revoked')) {
      errorResponse.message = 'Gmail access was revoked. Please reconnect.';
      errorResponse.requiresReconnect = true;
    } else if (error.message.includes('scope')) {
      errorResponse.message = 'Gmail permissions changed. Please reconnect.';
      errorResponse.requiresReconnect = true;
    } else {
      errorResponse.message = 'Unable to access Gmail. Please try again.';
    }

    this.emit('error', { userId, ...errorResponse });
    return errorResponse;
  }

  /**
   * Get quick actions for Gmail
   * @param {string} userId - User ID
   * @returns {Array} Available actions
   */
  async getQuickActions(userId) {
    const status = await this.getConnectionStatus(userId);
    
    if (!status.connected) {
      return [{
        action: 'connect',
        label: 'Connect Gmail',
        description: 'Link your Gmail account to Tala AI',
        icon: 'mail'
      }];
    }

    return [
      {
        action: 'inbox',
        label: 'View Inbox',
        description: 'Check your latest emails',
        icon: 'inbox',
        count: await this.getUnreadCount(userId)
      },
      {
        action: 'compose',
        label: 'Compose Email',
        description: 'Write a new email',
        icon: 'edit'
      },
      {
        action: 'search',
        label: 'Search Emails',
        description: 'Find specific emails',
        icon: 'search'
      },
      {
        action: 'settings',
        label: 'Email Settings',
        description: 'Manage Gmail connections',
        icon: 'settings'
      }
    ];
  }

  /**
   * Get unread email count
   * @param {string} userId - User ID
   * @returns {number} Unread count
   */
  async getUnreadCount(userId) {
    try {
      const { gmail } = await googleOAuthService.getGmailClient(userId);
      
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread',
        maxResults: 1
      });
      
      return response.data.resultSizeEstimate || 0;
    } catch (error) {
      return 0;
    }
  }
}

// Export singleton instance
const gmailSimpleConnect = new GmailSimpleConnect();
export default gmailSimpleConnect;