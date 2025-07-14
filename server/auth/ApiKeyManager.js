/**
 * API Key Manager
 * 
 * Manages API key lifecycle including generation, validation, rotation, and usage tracking.
 * Provides secure storage and retrieval of API keys with comprehensive rate limiting.
 */

import { createClient } from '@supabase/supabase-js';
import { 
  generateSecureKey, 
  hashApiKey, 
  parseApiKey, 
  isValidKeyFormat,
  maskApiKey,
  validateKeyStrength,
  generateUsageFingerprint
} from '../utils/apiKey.js';
import { PERMISSIONS } from './rbac/permissions.js';

class ApiKeyManager {
  constructor() {
    this.db = null;
    this.initialized = false;
    this.rateLimitCache = new Map(); // In-memory rate limit cache
    this.usageStatsCache = new Map(); // Cache for usage statistics
    this.cacheTimeout = 60000; // 1 minute cache timeout
  }

  /**
   * Initialize the API Key Manager
   * @param {Object} dbClient - Database client (Supabase)
   */
  async initialize(dbClient = null) {
    try {
      if (dbClient) {
        this.db = dbClient;
      } else {
        // Use default Supabase client
        this.db = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_KEY
        );
      }
      
      // Verify database connection
      const { error } = await this.db.from('api_keys').select('id').limit(1);
      if (error && !error.message.includes('relation "api_keys" does not exist')) {
        throw error;
      }
      
      this.initialized = true;
      this.log('ApiKeyManager initialized successfully');
      
      // Start cleanup tasks
      this.startMaintenanceTasks();
      
    } catch (error) {
      this.log(`Failed to initialize ApiKeyManager: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Generate a new API key
   * @param {string} userId - User ID creating the key
   * @param {string} organizationId - Organization ID (optional)
   * @param {string} name - Human-readable name for the key
   * @param {Array} permissions - Array of permission strings
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Generated key information
   */
  async generateApiKey(userId, organizationId, name, permissions = [], options = {}) {
    this.ensureInitialized();
    
    try {
      const {
        description = '',
        scopes = ['read'],
        environment = 'test',
        rateLimitRequests = 1000,
        rateLimitPeriod = 'hour',
        rateLimitBurst = 100,
        expiresAt = null,
        isActive = true
      } = options;
      
      // Validate inputs
      this.validateApiKeyInputs(userId, name, permissions);
      
      // Generate secure key
      const keyData = generateSecureKey(environment);
      const keyHash = hashApiKey(keyData.key);
      
      // Validate permissions
      const validatedPermissions = this.validatePermissions(permissions);
      
      // Create API key record
      const apiKeyRecord = {
        key_hash: keyHash,
        key_prefix: keyData.prefix,
        name: name.trim(),
        description: description.trim(),
        organization_id: organizationId,
        created_by_user_id: userId,
        permissions: JSON.stringify(validatedPermissions),
        scopes: JSON.stringify(scopes),
        rate_limit_requests: rateLimitRequests,
        rate_limit_period: rateLimitPeriod,
        rate_limit_burst: rateLimitBurst,
        expires_at: expiresAt,
        is_active: isActive,
        status: 'active',
        rate_limit_reset_at: this.calculateRateLimitReset(rateLimitPeriod)
      };
      
      // Insert into database
      const { data: insertedKey, error } = await this.db
        .from('api_keys')
        .insert([apiKeyRecord])
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to create API key: ${error.message}`);
      }
      
      // Log successful creation
      this.log(`API key created: ${keyData.prefix} for user ${userId}`, 'info', {
        keyId: insertedKey.id,
        userId,
        organizationId,
        permissions: validatedPermissions.length
      });
      
      // Return key information (full key only shown once)
      return {
        success: true,
        apiKey: {
          id: insertedKey.id,
          key: keyData.key,          // Full key - only shown once!
          prefix: keyData.prefix,    // Safe to display
          name: insertedKey.name,
          description: insertedKey.description,
          permissions: validatedPermissions,
          scopes,
          environment: keyData.environment,
          rateLimitRequests,
          rateLimitPeriod,
          rateLimitBurst,
          expiresAt,
          isActive,
          createdAt: insertedKey.created_at
        },
        security: {
          strength: validateKeyStrength(keyData.key),
          masked: maskApiKey(keyData.key),
          fingerprint: generateUsageFingerprint(keyData.key, '', '')
        }
      };
      
    } catch (error) {
      this.log(`Failed to generate API key: ${error.message}`, 'error', { userId, name });
      throw error;
    }
  }

  /**
   * Validate an API key
   * @param {string} apiKey - The API key to validate
   * @param {Object} context - Request context (IP, user agent, etc.)
   * @returns {Promise<Object>} Validation result
   */
  async validateApiKey(apiKey, context = {}) {
    this.ensureInitialized();
    
    try {
      if (!apiKey || !isValidKeyFormat(apiKey)) {
        return {
          valid: false,
          error: 'Invalid API key format',
          code: 'INVALID_FORMAT'
        };
      }
      
      const keyHash = hashApiKey(apiKey);
      
      // Get API key from database
      const { data: keyRecord, error } = await this.db
        .from('api_keys')
        .select('*')
        .eq('key_hash', keyHash)
        .single();
      
      if (error || !keyRecord) {
        // Log failed validation attempt
        this.logFailedValidation(apiKey, context, 'KEY_NOT_FOUND');
        
        return {
          valid: false,
          error: 'API key not found',
          code: 'KEY_NOT_FOUND'
        };
      }
      
      // Check if key is active
      if (!keyRecord.is_active || keyRecord.status !== 'active') {
        this.logFailedValidation(apiKey, context, 'KEY_INACTIVE', keyRecord.id);
        
        return {
          valid: false,
          error: 'API key is inactive',
          code: 'KEY_INACTIVE'
        };
      }
      
      // Check expiration
      if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
        // Auto-update status to expired
        await this.updateKeyStatus(keyRecord.id, 'expired', false);
        
        this.logFailedValidation(apiKey, context, 'KEY_EXPIRED', keyRecord.id);
        
        return {
          valid: false,
          error: 'API key has expired',
          code: 'KEY_EXPIRED'
        };
      }
      
      // Check rate limits
      const rateLimitResult = await this.checkRateLimit(keyRecord.id, keyRecord);
      if (!rateLimitResult.allowed) {
        this.logFailedValidation(apiKey, context, 'RATE_LIMIT_EXCEEDED', keyRecord.id);
        
        return {
          valid: false,
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          rateLimitInfo: rateLimitResult.info
        };
      }
      
      // Update usage tracking
      await this.updateUsageTracking(keyRecord.id, context);
      
      // Log successful validation
      this.log(`API key validated successfully: ${keyRecord.key_prefix}`, 'info', {
        keyId: keyRecord.id,
        userId: keyRecord.created_by_user_id,
        organizationId: keyRecord.organization_id
      });
      
      return {
        valid: true,
        apiKey: {
          id: keyRecord.id,
          prefix: keyRecord.key_prefix,
          name: keyRecord.name,
          userId: keyRecord.created_by_user_id,
          organizationId: keyRecord.organization_id,
          permissions: JSON.parse(keyRecord.permissions || '[]'),
          scopes: JSON.parse(keyRecord.scopes || '[]'),
          rateLimitInfo: rateLimitResult.info
        }
      };
      
    } catch (error) {
      this.log(`API key validation error: ${error.message}`, 'error', { context });
      
      return {
        valid: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR'
      };
    }
  }

  /**
   * Revoke an API key
   * @param {string} keyId - The API key ID to revoke
   * @param {string} userId - User ID performing the revocation
   * @param {string} reason - Reason for revocation
   * @returns {Promise<Object>} Revocation result
   */
  async revokeApiKey(keyId, userId, reason = 'User requested') {
    this.ensureInitialized();
    
    try {
      // Get current key information
      const { data: keyRecord, error: fetchError } = await this.db
        .from('api_keys')
        .select('*')
        .eq('id', keyId)
        .single();
      
      if (fetchError || !keyRecord) {
        throw new Error('API key not found');
      }
      
      // Check permissions (user can only revoke their own keys, or org admin can revoke org keys)
      if (!this.canUserModifyKey(keyRecord, userId)) {
        throw new Error('Insufficient permissions to revoke this API key');
      }
      
      // Update key status
      const { error: updateError } = await this.db
        .from('api_keys')
        .update({
          status: 'revoked',
          is_active: false,
          revoked_at: new Date().toISOString(),
          revoked_by_user_id: userId,
          revoked_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', keyId);
      
      if (updateError) {
        throw new Error(`Failed to revoke API key: ${updateError.message}`);
      }
      
      // Clear from caches
      this.clearKeyFromCaches(keyId);
      
      // Log revocation
      this.log(`API key revoked: ${keyRecord.key_prefix}`, 'info', {
        keyId,
        userId,
        reason,
        revokedBy: userId
      });
      
      return {
        success: true,
        message: 'API key revoked successfully',
        revokedKey: {
          id: keyId,
          prefix: keyRecord.key_prefix,
          name: keyRecord.name,
          revokedAt: new Date().toISOString(),
          reason
        }
      };
      
    } catch (error) {
      this.log(`Failed to revoke API key: ${error.message}`, 'error', { keyId, userId });
      throw error;
    }
  }

  /**
   * Rotate an API key (generate new key, keep same metadata)
   * @param {string} keyId - The API key ID to rotate
   * @param {string} userId - User ID performing the rotation
   * @param {Object} options - Rotation options
   * @returns {Promise<Object>} Rotation result
   */
  async rotateApiKey(keyId, userId, options = {}) {
    this.ensureInitialized();
    
    try {
      const { reason = 'Security rotation', keepOldKeyActive = false } = options;
      
      // Get current key information
      const { data: keyRecord, error: fetchError } = await this.db
        .from('api_keys')
        .select('*')
        .eq('id', keyId)
        .single();
      
      if (fetchError || !keyRecord) {
        throw new Error('API key not found');
      }
      
      // Check permissions
      if (!this.canUserModifyKey(keyRecord, userId)) {
        throw new Error('Insufficient permissions to rotate this API key');
      }
      
      // Generate new key
      const environment = parseApiKey(keyRecord.key_prefix + 'dummy').environment;
      const newKeyData = generateSecureKey(environment);
      const newKeyHash = hashApiKey(newKeyData.key);
      
      // Record rotation in history
      await this.db
        .from('api_key_rotation_history')
        .insert([{
          api_key_id: keyId,
          old_key_hash: keyRecord.key_hash,
          old_key_prefix: keyRecord.key_prefix,
          rotated_by_user_id: userId,
          rotation_reason: reason
        }]);
      
      // Update the key record
      const { error: updateError } = await this.db
        .from('api_keys')
        .update({
          key_hash: newKeyHash,
          key_prefix: newKeyData.prefix,
          updated_at: new Date().toISOString(),
          // Reset usage stats for new key
          requests_count: 0,
          total_requests: keyRecord.total_requests, // Keep total count
          last_used_at: null,
          last_used_ip: null,
          last_used_user_agent: null,
          rate_limit_reset_at: this.calculateRateLimitReset(keyRecord.rate_limit_period)
        })
        .eq('id', keyId);
      
      if (updateError) {
        throw new Error(`Failed to rotate API key: ${updateError.message}`);
      }
      
      // Clear from caches
      this.clearKeyFromCaches(keyId);
      
      // Log rotation
      this.log(`API key rotated: ${keyRecord.key_prefix} -> ${newKeyData.prefix}`, 'info', {
        keyId,
        userId,
        reason,
        oldPrefix: keyRecord.key_prefix,
        newPrefix: newKeyData.prefix
      });
      
      return {
        success: true,
        message: 'API key rotated successfully',
        newApiKey: {
          id: keyId,
          key: newKeyData.key,      // Full new key - only shown once!
          prefix: newKeyData.prefix,
          name: keyRecord.name,
          rotatedAt: new Date().toISOString(),
          reason
        },
        security: {
          strength: validateKeyStrength(newKeyData.key),
          masked: maskApiKey(newKeyData.key)
        }
      };
      
    } catch (error) {
      this.log(`Failed to rotate API key: ${error.message}`, 'error', { keyId, userId });
      throw error;
    }
  }

  /**
   * Get API key usage statistics
   * @param {string} keyId - The API key ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Usage statistics
   */
  async getApiKeyUsageStats(keyId, options = {}) {
    this.ensureInitialized();
    
    try {
      const {
        startDate = null,
        endDate = null,
        groupBy = 'day', // hour, day, week, month
        includeDetails = false
      } = options;
      
      // Check cache first
      const cacheKey = `usage_${keyId}_${startDate}_${endDate}_${groupBy}`;
      const cached = this.usageStatsCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        return cached.data;
      }
      
      // Get basic key information
      const { data: keyRecord, error: keyError } = await this.db
        .from('api_keys')
        .select('id, key_prefix, name, created_at, total_requests, last_used_at, requests_count, rate_limit_requests, rate_limit_period')
        .eq('id', keyId)
        .single();
      
      if (keyError || !keyRecord) {
        throw new Error('API key not found');
      }
      
      // Build date filter
      let query = this.db
        .from('api_key_usage_logs')
        .select('*')
        .eq('api_key_id', keyId);
      
      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }
      
      const { data: usageLogs, error: usageError } = await query.order('created_at', { ascending: false });
      
      if (usageError) {
        throw new Error(`Failed to fetch usage logs: ${usageError.message}`);
      }
      
      // Calculate statistics
      const stats = this.calculateUsageStatistics(usageLogs, groupBy);
      
      const result = {
        keyInfo: {
          id: keyRecord.id,
          prefix: keyRecord.key_prefix,
          name: keyRecord.name,
          createdAt: keyRecord.created_at,
          lastUsedAt: keyRecord.last_used_at
        },
        summary: {
          totalRequests: keyRecord.total_requests || 0,
          currentPeriodRequests: keyRecord.requests_count || 0,
          rateLimitRequests: keyRecord.rate_limit_requests,
          rateLimitPeriod: keyRecord.rate_limit_period,
          usagePercentage: Math.round((keyRecord.requests_count / keyRecord.rate_limit_requests) * 100)
        },
        timeSeriesData: stats.timeSeries,
        aggregatedStats: stats.aggregated,
        topEndpoints: stats.topEndpoints,
        statusCodeDistribution: stats.statusCodes,
        errorAnalysis: stats.errors
      };
      
      if (includeDetails && usageLogs.length > 0) {
        result.recentActivity = usageLogs.slice(0, 100); // Last 100 requests
      }
      
      // Cache the result
      this.usageStatsCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
      
      return result;
      
    } catch (error) {
      this.log(`Failed to get usage stats: ${error.message}`, 'error', { keyId });
      throw error;
    }
  }

  /**
   * Enforce rate limit for an API key
   * @param {string} keyId - The API key ID
   * @param {Object} keyRecord - Key record from database
   * @returns {Promise<Object>} Rate limit result
   */
  async enforceRateLimit(keyId, keyRecord = null) {
    return await this.checkRateLimit(keyId, keyRecord, true);
  }

  /**
   * Check rate limit for an API key
   * @param {string} keyId - The API key ID
   * @param {Object} keyRecord - Key record from database
   * @param {boolean} enforce - Whether to increment counter
   * @returns {Promise<Object>} Rate limit check result
   */
  async checkRateLimit(keyId, keyRecord = null, enforce = false) {
    try {
      // Get key record if not provided
      if (!keyRecord) {
        const { data, error } = await this.db
          .from('api_keys')
          .select('rate_limit_requests, rate_limit_period, rate_limit_burst, requests_count, rate_limit_reset_at')
          .eq('id', keyId)
          .single();
        
        if (error || !data) {
          throw new Error('API key not found for rate limiting');
        }
        keyRecord = data;
      }
      
      const now = new Date();
      const resetTime = new Date(keyRecord.rate_limit_reset_at);
      
      // Check if rate limit period has reset
      if (now > resetTime) {
        // Reset the counter
        await this.db
          .from('api_keys')
          .update({
            requests_count: 0,
            rate_limit_reset_at: this.calculateRateLimitReset(keyRecord.rate_limit_period, now)
          })
          .eq('id', keyId);
        
        keyRecord.requests_count = 0;
      }
      
      // Check if within rate limit
      const allowed = keyRecord.requests_count < keyRecord.rate_limit_requests;
      const remaining = Math.max(0, keyRecord.rate_limit_requests - keyRecord.requests_count);
      
      // If enforcing and allowed, increment counter
      if (enforce && allowed) {
        await this.db
          .from('api_keys')
          .update({
            requests_count: keyRecord.requests_count + 1,
            total_requests: (keyRecord.total_requests || 0) + 1
          })
          .eq('id', keyId);
      }
      
      return {
        allowed,
        info: {
          limit: keyRecord.rate_limit_requests,
          remaining: enforce && allowed ? remaining - 1 : remaining,
          period: keyRecord.rate_limit_period,
          resetTime: keyRecord.rate_limit_reset_at,
          current: enforce && allowed ? keyRecord.requests_count + 1 : keyRecord.requests_count
        }
      };
      
    } catch (error) {
      this.log(`Rate limit check failed: ${error.message}`, 'error', { keyId });
      
      // Fail open for rate limiting errors
      return {
        allowed: true,
        info: {
          limit: 1000,
          remaining: 999,
          period: 'hour',
          resetTime: new Date(Date.now() + 3600000).toISOString(),
          current: 0,
          error: 'Rate limit check failed'
        }
      };
    }
  }

  /**
   * Get API keys for a user or organization
   * @param {string} userId - User ID
   * @param {string} organizationId - Organization ID (optional)
   * @returns {Promise<Array>} List of API keys
   */
  async getUserApiKeys(userId, organizationId = null) {
    this.ensureInitialized();
    
    try {
      let query = this.db
        .from('api_keys')
        .select('id, key_prefix, name, description, permissions, scopes, status, is_active, rate_limit_requests, rate_limit_period, expires_at, last_used_at, created_at, total_requests')
        .eq('created_by_user_id', userId)
        .order('created_at', { ascending: false });
      
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw new Error(`Failed to fetch API keys: ${error.message}`);
      }
      
      return data.map(key => ({
        ...key,
        permissions: JSON.parse(key.permissions || '[]'),
        scopes: JSON.parse(key.scopes || '[]'),
        maskedKey: maskApiKey(key.key_prefix + 'dummy')
      }));
      
    } catch (error) {
      this.log(`Failed to get user API keys: ${error.message}`, 'error', { userId, organizationId });
      throw error;
    }
  }

  /**
   * Update API key metadata
   * @param {string} keyId - API key ID
   * @param {string} userId - User ID making the update
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Update result
   */
  async updateApiKey(keyId, userId, updates) {
    this.ensureInitialized();
    
    try {
      // Get current key
      const { data: keyRecord, error: fetchError } = await this.db
        .from('api_keys')
        .select('*')
        .eq('id', keyId)
        .single();
      
      if (fetchError || !keyRecord) {
        throw new Error('API key not found');
      }
      
      // Check permissions
      if (!this.canUserModifyKey(keyRecord, userId)) {
        throw new Error('Insufficient permissions to update this API key');
      }
      
      // Validate and prepare updates
      const allowedUpdates = ['name', 'description', 'permissions', 'scopes', 'rate_limit_requests', 'rate_limit_period', 'expires_at', 'is_active'];
      const validUpdates = {};
      
      for (const [key, value] of Object.entries(updates)) {
        if (allowedUpdates.includes(key)) {
          if (key === 'permissions') {
            validUpdates[key] = JSON.stringify(this.validatePermissions(value));
          } else if (key === 'scopes') {
            validUpdates[key] = JSON.stringify(value);
          } else {
            validUpdates[key] = value;
          }
        }
      }
      
      if (Object.keys(validUpdates).length === 0) {
        throw new Error('No valid updates provided');
      }
      
      validUpdates.updated_at = new Date().toISOString();
      
      // Apply updates
      const { error: updateError } = await this.db
        .from('api_keys')
        .update(validUpdates)
        .eq('id', keyId);
      
      if (updateError) {
        throw new Error(`Failed to update API key: ${updateError.message}`);
      }
      
      // Clear from caches
      this.clearKeyFromCaches(keyId);
      
      // Log update
      this.log(`API key updated: ${keyRecord.key_prefix}`, 'info', {
        keyId,
        userId,
        updates: Object.keys(validUpdates)
      });
      
      return {
        success: true,
        message: 'API key updated successfully',
        updatedFields: Object.keys(validUpdates)
      };
      
    } catch (error) {
      this.log(`Failed to update API key: ${error.message}`, 'error', { keyId, userId });
      throw error;
    }
  }

  // Private helper methods

  /**
   * Validate API key generation inputs
   */
  validateApiKeyInputs(userId, name, permissions) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('Valid user ID is required');
    }
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('API key name is required');
    }
    
    if (name.length > 100) {
      throw new Error('API key name must be 100 characters or less');
    }
    
    if (!Array.isArray(permissions)) {
      throw new Error('Permissions must be an array');
    }
  }

  /**
   * Validate permissions against available permissions
   */
  validatePermissions(permissions) {
    const allPermissions = Object.values(PERMISSIONS)
      .flatMap(category => Object.keys(category));
    
    const validPermissions = permissions.filter(permission => 
      allPermissions.includes(permission)
    );
    
    return validPermissions;
  }

  /**
   * Calculate rate limit reset time
   */
  calculateRateLimitReset(period, baseTime = new Date()) {
    const resetTime = new Date(baseTime);
    
    switch (period) {
      case 'minute':
        resetTime.setMinutes(resetTime.getMinutes() + 1);
        break;
      case 'hour':
        resetTime.setHours(resetTime.getHours() + 1);
        break;
      case 'day':
        resetTime.setDate(resetTime.getDate() + 1);
        break;
      case 'month':
        resetTime.setMonth(resetTime.getMonth() + 1);
        break;
      default:
        resetTime.setHours(resetTime.getHours() + 1);
    }
    
    return resetTime.toISOString();
  }

  /**
   * Update usage tracking
   */
  async updateUsageTracking(keyId, context) {
    try {
      const { ip, userAgent, endpoint, method } = context;
      
      // Update last used information
      await this.db
        .from('api_keys')
        .update({
          last_used_at: new Date().toISOString(),
          last_used_ip: ip,
          last_used_user_agent: userAgent
        })
        .eq('id', keyId);
      
    } catch (error) {
      // Don't throw on usage tracking failures
      this.log(`Usage tracking failed: ${error.message}`, 'warn', { keyId });
    }
  }

  /**
   * Log usage details for analytics
   */
  async logUsage(keyId, context, response = {}) {
    try {
      const usageLog = {
        api_key_id: keyId,
        endpoint: context.endpoint || 'unknown',
        method: context.method || 'GET',
        status_code: response.statusCode || 200,
        response_size: response.size,
        response_time_ms: response.responseTime,
        ip_address: context.ip,
        user_agent: context.userAgent,
        referer: context.referer,
        error_code: response.errorCode,
        error_message: response.errorMessage
      };
      
      await this.db
        .from('api_key_usage_logs')
        .insert([usageLog]);
      
    } catch (error) {
      // Don't throw on logging failures
      this.log(`Usage logging failed: ${error.message}`, 'warn', { keyId });
    }
  }

  /**
   * Calculate usage statistics from logs
   */
  calculateUsageStatistics(logs, groupBy) {
    const stats = {
      timeSeries: new Map(),
      aggregated: {
        totalRequests: logs.length,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        totalResponseSize: 0
      },
      topEndpoints: new Map(),
      statusCodes: new Map(),
      errors: new Map()
    };
    
    let totalResponseTime = 0;
    let responseTimeCount = 0;
    
    for (const log of logs) {
      // Time series grouping
      const date = new Date(log.created_at);
      const groupKey = this.getTimeGroupKey(date, groupBy);
      
      if (!stats.timeSeries.has(groupKey)) {
        stats.timeSeries.set(groupKey, 0);
      }
      stats.timeSeries.set(groupKey, stats.timeSeries.get(groupKey) + 1);
      
      // Success/failure tracking
      if (log.status_code >= 200 && log.status_code < 400) {
        stats.aggregated.successfulRequests++;
      } else {
        stats.aggregated.failedRequests++;
      }
      
      // Response time aggregation
      if (log.response_time_ms) {
        totalResponseTime += log.response_time_ms;
        responseTimeCount++;
      }
      
      // Response size aggregation
      if (log.response_size) {
        stats.aggregated.totalResponseSize += log.response_size;
      }
      
      // Endpoint popularity
      const endpoint = log.endpoint || 'unknown';
      stats.topEndpoints.set(endpoint, (stats.topEndpoints.get(endpoint) || 0) + 1);
      
      // Status code distribution
      stats.statusCodes.set(log.status_code, (stats.statusCodes.get(log.status_code) || 0) + 1);
      
      // Error tracking
      if (log.error_code) {
        stats.errors.set(log.error_code, (stats.errors.get(log.error_code) || 0) + 1);
      }
    }
    
    // Calculate average response time
    if (responseTimeCount > 0) {
      stats.aggregated.averageResponseTime = Math.round(totalResponseTime / responseTimeCount);
    }
    
    // Convert Maps to sorted arrays
    stats.timeSeries = Array.from(stats.timeSeries.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([time, count]) => ({ time, count }));
    
    stats.topEndpoints = Array.from(stats.topEndpoints.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, count }));
    
    stats.statusCodes = Array.from(stats.statusCodes.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([statusCode, count]) => ({ statusCode, count }));
    
    stats.errors = Array.from(stats.errors.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([errorCode, count]) => ({ errorCode, count }));
    
    return stats;
  }

  /**
   * Get time group key for time series aggregation
   */
  getTimeGroupKey(date, groupBy) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    
    switch (groupBy) {
      case 'hour':
        return `${year}-${month}-${day} ${hour}:00`;
      case 'day':
        return `${year}-${month}-${day}`;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
      case 'month':
        return `${year}-${month}`;
      default:
        return `${year}-${month}-${day}`;
    }
  }

  /**
   * Check if user can modify an API key
   */
  canUserModifyKey(keyRecord, userId) {
    // User can modify their own keys
    if (keyRecord.created_by_user_id === userId) {
      return true;
    }
    
    // TODO: Add organization admin checks
    // Organization admins can modify org keys
    
    return false;
  }

  /**
   * Update API key status
   */
  async updateKeyStatus(keyId, status, isActive) {
    try {
      await this.db
        .from('api_keys')
        .update({
          status,
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', keyId);
    } catch (error) {
      this.log(`Failed to update key status: ${error.message}`, 'error', { keyId, status });
    }
  }

  /**
   * Log failed validation attempts
   */
  logFailedValidation(apiKey, context, reason, keyId = null) {
    const maskedKey = maskApiKey(apiKey);
    this.log(`API key validation failed: ${maskedKey} - ${reason}`, 'warn', {
      keyId,
      reason,
      ip: context.ip,
      userAgent: context.userAgent
    });
  }

  /**
   * Clear key from caches
   */
  clearKeyFromCaches(keyId) {
    // Clear rate limit cache
    for (const [key, value] of this.rateLimitCache.entries()) {
      if (key.includes(keyId)) {
        this.rateLimitCache.delete(key);
      }
    }
    
    // Clear usage stats cache
    for (const [key, value] of this.usageStatsCache.entries()) {
      if (key.includes(keyId)) {
        this.usageStatsCache.delete(key);
      }
    }
  }

  /**
   * Start maintenance tasks
   */
  startMaintenanceTasks() {
    // Clean up expired keys every hour
    setInterval(async () => {
      try {
        await this.db.rpc('update_expired_api_keys');
        await this.db.rpc('reset_api_key_rate_limits');
      } catch (error) {
        this.log(`Maintenance task failed: ${error.message}`, 'error');
      }
    }, 60 * 60 * 1000); // 1 hour
    
    // Clear caches every 10 minutes
    setInterval(() => {
      const now = Date.now();
      
      // Clear old cache entries
      for (const [key, value] of this.rateLimitCache.entries()) {
        if (now - value.timestamp > this.cacheTimeout) {
          this.rateLimitCache.delete(key);
        }
      }
      
      for (const [key, value] of this.usageStatsCache.entries()) {
        if (now - value.timestamp > this.cacheTimeout) {
          this.usageStatsCache.delete(key);
        }
      }
    }, 10 * 60 * 1000); // 10 minutes
  }

  /**
   * Ensure ApiKeyManager is initialized
   */
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('ApiKeyManager not initialized. Call initialize() first.');
    }
  }

  /**
   * Log messages
   */
  log(message, level = 'info', metadata = {}) {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      component: 'ApiKeyManager',
      level,
      message,
      ...metadata
    };

    switch (level) {
      case 'error':
        console.error('[ApiKeyManager]', logData);
        break;
      case 'warn':
        console.warn('[ApiKeyManager]', logData);
        break;
      default:
        console.log('[ApiKeyManager]', logData);
    }
  }
}

// Export singleton instance
const apiKeyManager = new ApiKeyManager();
export default apiKeyManager;