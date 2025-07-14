/**
 * Basic API Key Manager for Tala AI
 * Provides API key generation and validation
 */

import crypto from 'crypto';

export class APIKeyManager {
  constructor() {
    this.initialized = false;
    this.apiKeys = new Map(); // In-memory storage for development
    this.keyPrefix = process.env.API_KEY_PREFIX || 'tala_';
    this.keyLength = parseInt(process.env.API_KEY_LENGTH) || 32;
  }

  async initialize() {
    if (this.initialized) return;
    console.log('🔑 Initializing APIKeyManager...');
    this.initialized = true;
  }

  /**
   * Generate a new API key
   */
  async generateAPIKey(userId, organizationId, options = {}) {
    const keyId = crypto.randomUUID();
    const keySecret = crypto.randomBytes(this.keyLength).toString('hex');
    const apiKey = `${this.keyPrefix}${keySecret}`;
    
    const keyData = {
      id: keyId,
      key: apiKey,
      userId,
      organizationId,
      name: options.name || 'API Key',
      permissions: options.permissions || ['documents:read'],
      rateLimit: options.rateLimit || 1000,
      createdAt: new Date(),
      lastUsedAt: null,
      isActive: true,
      usageCount: 0
    };

    this.apiKeys.set(apiKey, keyData);

    return {
      success: true,
      keyId,
      apiKey,
      data: keyData
    };
  }

  /**
   * Validate an API key
   */
  async validateAPIKey(apiKey) {
    const keyData = this.apiKeys.get(apiKey);
    
    if (!keyData) {
      return { success: false, error: 'Invalid API key' };
    }

    if (!keyData.isActive) {
      return { success: false, error: 'API key is disabled' };
    }

    // Update usage statistics
    keyData.lastUsedAt = new Date();
    keyData.usageCount++;
    this.apiKeys.set(apiKey, keyData);

    return {
      success: true,
      userId: keyData.userId,
      organizationId: keyData.organizationId,
      permissions: keyData.permissions,
      keyData
    };
  }

  /**
   * Revoke an API key
   */
  async revokeAPIKey(keyId, userId) {
    for (const [key, data] of this.apiKeys.entries()) {
      if (data.id === keyId && data.userId === userId) {
        data.isActive = false;
        this.apiKeys.set(key, data);
        return { success: true };
      }
    }
    
    return { success: false, error: 'API key not found' };
  }

  /**
   * List API keys for user
   */
  async listAPIKeys(userId) {
    const userKeys = [];
    
    for (const [key, data] of this.apiKeys.entries()) {
      if (data.userId === userId) {
        userKeys.push({
          id: data.id,
          name: data.name,
          permissions: data.permissions,
          createdAt: data.createdAt,
          lastUsedAt: data.lastUsedAt,
          isActive: data.isActive,
          usageCount: data.usageCount,
          // Don't include the actual key for security
          keyPreview: key.substring(0, 12) + '...'
        });
      }
    }
    
    return { success: true, keys: userKeys };
  }

  /**
   * Check API key permissions
   */
  async checkAPIKeyPermission(apiKey, permission) {
    const validation = await this.validateAPIKey(apiKey);
    
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    const hasPermission = validation.permissions.includes(permission) || 
                         validation.permissions.includes('*') ||
                         validation.permissions.some(p => p.endsWith(':*') && permission.startsWith(p.split(':')[0]));

    return {
      success: hasPermission,
      userId: validation.userId,
      organizationId: validation.organizationId
    };
  }
}

export default APIKeyManager;