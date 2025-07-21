/**
 * Email API Service
 * 
 * Client-side API for email operations
 */

import { getAuthToken } from '../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class EmailAPI {
  constructor() {
    this.baseURL = `${API_BASE_URL}/email`;
  }

  /**
   * Get headers with auth token
   */
  getHeaders() {
    const token = getAuthToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * Handle API response
   */
  async handleResponse(response) {
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Get available email providers
   */
  async getProviders() {
    const response = await fetch(`${this.baseURL}/providers`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  /**
   * Initiate email connection
   */
  async initiateConnection(provider, options = {}) {
    const response = await fetch(`${this.baseURL}/connect`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ provider, ...options })
    });
    return this.handleResponse(response);
  }

  /**
   * Get user's email accounts
   */
  async getUserAccounts() {
    const response = await fetch(`${this.baseURL}/accounts`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  /**
   * Get connection status
   */
  async getConnectionStatus() {
    const response = await fetch(`${this.baseURL}/status`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  /**
   * Fetch inbox messages
   */
  async fetchInbox(params = {}) {
    const queryParams = new URLSearchParams(params);
    const response = await fetch(`${this.baseURL}/inbox?${queryParams}`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  /**
   * Get full message details
   */
  async getMessage(messageId, params = {}) {
    const queryParams = new URLSearchParams(params);
    const response = await fetch(`${this.baseURL}/message/${messageId}?${queryParams}`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  /**
   * Modify message (labels, read status, etc.)
   */
  async modifyMessage(messageId, modifications) {
    const response = await fetch(`${this.baseURL}/message/${messageId}/modify`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(modifications)
    });
    return this.handleResponse(response);
  }

  /**
   * Analyze email with Tala AI
   */
  async analyzeEmail(messageId, params) {
    const response = await fetch(`${this.baseURL}/message/${messageId}/send-to-tala`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(params)
    });
    return this.handleResponse(response);
  }

  /**
   * Search emails
   */
  async searchEmails(params) {
    const queryParams = new URLSearchParams(params);
    const response = await fetch(`${this.baseURL}/search?${queryParams}`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  /**
   * Get sync status
   */
  async getSyncStatus() {
    const response = await fetch(`${this.baseURL}/sync/status`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  /**
   * Trigger manual sync
   */
  async triggerSync(params) {
    const response = await fetch(`${this.baseURL}/sync`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(params)
    });
    return this.handleResponse(response);
  }

  /**
   * Disconnect email account
   */
  async disconnectAccount(email, provider) {
    const response = await fetch(`${this.baseURL}/disconnect`, {
      method: 'DELETE',
      headers: this.getHeaders(),
      body: JSON.stringify({ email, provider })
    });
    return this.handleResponse(response);
  }

  /**
   * Test email connection
   */
  async testConnection(email = null) {
    const url = email 
      ? `${this.baseURL}/test/${encodeURIComponent(email)}`
      : `${this.baseURL}/test`;
    
    const response = await fetch(url, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }
}

// Export singleton instance
export const emailAPI = new EmailAPI();