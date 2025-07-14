/**
 * Base Database Service for Tala AI
 * 
 * Provides common functionality for all database services including:
 * - Error handling and validation
 * - Pagination utilities
 * - Transaction support
 * - Multi-tenant organization filtering
 * - Consistent logging and monitoring
 */

import { getSupabaseService, getSupabaseAnon, handleSupabaseError } from '../../db/supabaseClient.js';
import { cacheService } from '../cache/cacheService.js';
import cacheKeys from '../cache/cacheKeys.js';

export class BaseService {
  constructor(tableName, options = {}) {
    this.tableName = tableName;
    this.options = {
      enableLogging: options.enableLogging !== false,
      enableMetrics: options.enableMetrics !== false,
      enableCaching: options.enableCaching !== false,
      defaultPageSize: options.defaultPageSize || 50,
      maxPageSize: options.maxPageSize || 500,
      enableSoftDelete: options.enableSoftDelete !== false,
      // Cache TTL settings (in seconds)
      cacheTTL: {
        short: options.cacheTTL?.short || 60,    // 1 minute for frequently changing data
        medium: options.cacheTTL?.medium || 300, // 5 minutes for user data
        long: options.cacheTTL?.long || 600,     // 10 minutes for static/folder data
        ...options.cacheTTL
      },
      ...options
    };
    
    this.metrics = {
      queries: 0,
      errors: 0,
      totalResponseTime: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  /**
   * Get Supabase client (service role for admin operations)
   * @returns {Object} Supabase client
   */
  getClient() {
    return getSupabaseService();
  }

  /**
   * Get Supabase client (anonymous for read operations)
   * @returns {Object} Supabase client
   */
  getAnonClient() {
    return getSupabaseAnon();
  }

  /**
   * Execute query with error handling and metrics
   * @param {Function} queryFn - Function that executes the query
   * @param {string} operation - Operation name for logging
   * @returns {Object} Query result with standardized format
   */
  async executeQuery(queryFn, operation) {
    const startTime = Date.now();
    this.metrics.queries++;

    try {
      this.log(`Executing ${operation} on ${this.tableName}`);
      
      const result = await queryFn();
      
      const responseTime = Date.now() - startTime;
      this.metrics.totalResponseTime += responseTime;
      
      if (result.error) {
        this.metrics.errors++;
        const formattedError = handleSupabaseError(result.error);
        this.log(`${operation} failed: ${formattedError.message}`, 'error');
        
        return {
          success: false,
          error: formattedError,
          data: null,
          operation,
          responseTime
        };
      }

      this.log(`${operation} completed in ${responseTime}ms`);
      
      return {
        success: true,
        data: result.data,
        count: result.count,
        error: null,
        operation,
        responseTime
      };

    } catch (error) {
      this.metrics.errors++;
      const responseTime = Date.now() - startTime;
      this.metrics.totalResponseTime += responseTime;
      
      const formattedError = handleSupabaseError(error);
      this.log(`${operation} exception: ${formattedError.message}`, 'error');
      
      return {
        success: false,
        error: formattedError,
        data: null,
        operation,
        responseTime
      };
    }
  }

  /**
   * Apply organization filter for multi-tenancy
   * @param {Object} query - Supabase query builder
   * @param {string} organizationId - Organization ID to filter by
   * @returns {Object} Modified query
   */
  applyOrgFilter(query, organizationId) {
    if (organizationId) {
      return query.eq('organization_id', organizationId);
    }
    return query;
  }

  /**
   * Apply soft delete filter
   * @param {Object} query - Supabase query builder
   * @param {boolean} includeDeleted - Whether to include soft-deleted records
   * @returns {Object} Modified query
   */
  applySoftDeleteFilter(query, includeDeleted = false) {
    if (this.options.enableSoftDelete && !includeDeleted) {
      return query.is('deleted_at', null);
    }
    return query;
  }

  /**
   * Apply pagination to query
   * @param {Object} query - Supabase query builder
   * @param {Object} pagination - Pagination options
   * @returns {Object} Modified query
   */
  applyPagination(query, pagination = {}) {
    const { 
      page = 1, 
      pageSize = this.options.defaultPageSize,
      offset = null 
    } = pagination;

    // Validate page size
    const validPageSize = Math.min(
      Math.max(1, parseInt(pageSize)), 
      this.options.maxPageSize
    );

    // Use explicit offset or calculate from page
    const queryOffset = offset !== null ? parseInt(offset) : (parseInt(page) - 1) * validPageSize;

    return query
      .range(queryOffset, queryOffset + validPageSize - 1);
  }

  /**
   * Apply sorting to query
   * @param {Object} query - Supabase query builder
   * @param {Object} sort - Sort options
   * @returns {Object} Modified query
   */
  applySorting(query, sort = {}) {
    const { 
      field = 'created_at', 
      direction = 'desc',
      nullsFirst = false 
    } = sort;

    const ascending = direction.toLowerCase() === 'asc';
    
    return query.order(field, { 
      ascending, 
      nullsFirst 
    });
  }

  /**
   * Apply search filter
   * @param {Object} query - Supabase query builder
   * @param {string} searchTerm - Search term
   * @param {Array} searchFields - Fields to search in
   * @returns {Object} Modified query
   */
  applySearch(query, searchTerm, searchFields = []) {
    if (!searchTerm || searchFields.length === 0) {
      return query;
    }

    // For multiple fields, use OR conditions
    if (searchFields.length === 1) {
      return query.ilike(searchFields[0], `%${searchTerm}%`);
    } else {
      // Build OR query for multiple fields
      const orConditions = searchFields
        .map(field => `${field}.ilike.%${searchTerm}%`)
        .join(',');
      
      return query.or(orConditions);
    }
  }

  /**
   * Create a new record
   * @param {Object} data - Record data
   * @param {Object} options - Creation options
   * @returns {Object} Created record or error
   */
  async create(data, options = {}) {
    const { 
      organizationId = null,
      returnData = true,
      upsert = false 
    } = options;

    return this.executeQuery(async () => {
      let query = this.getClient()
        .from(this.tableName);

      if (upsert) {
        query = query.upsert(data);
      } else {
        query = query.insert(data);
      }

      if (returnData) {
        query = query.select();
      }

      return query;
    }, 'CREATE');
  }

  /**
   * Get record by ID with caching
   * @param {string} id - Record ID
   * @param {Object} options - Query options
   * @returns {Object} Record or error
   */
  async getById(id, options = {}) {
    const { 
      organizationId = null,
      includeDeleted = false,
      select = '*',
      bypassCache = false,
      cacheTTL = this.options.cacheTTL.medium
    } = options;

    // Generate cache key
    const cacheKey = this.generateCacheKey('getById', { id, organizationId, includeDeleted, select });

    // Try cache first (unless bypassed)
    if (this.options.enableCaching && !bypassCache) {
      const cachedResult = await this.getCachedResult(cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }
    }

    // Execute query
    const result = await this.executeQuery(async () => {
      let query = this.getAnonClient()
        .from(this.tableName)
        .select(select)
        .eq('id', id);

      query = this.applyOrgFilter(query, organizationId);
      query = this.applySoftDeleteFilter(query, includeDeleted);

      return query.single();
    }, 'GET_BY_ID');

    // Cache successful results
    if (this.options.enableCaching && result.success) {
      await this.cacheResult(cacheKey, result, cacheTTL);
    }

    return result;
  }

  /**
   * Get multiple records with filtering and pagination
   * @param {Object} filters - Filter conditions
   * @param {Object} options - Query options
   * @returns {Object} Records array or error
   */
  async getMany(filters = {}, options = {}) {
    const {
      organizationId = null,
      includeDeleted = false,
      select = '*',
      pagination = {},
      sort = {},
      search = {}
    } = options;

    return this.executeQuery(async () => {
      let query = this.getAnonClient()
        .from(this.tableName)
        .select(select, { count: 'exact' });

      // Apply organization filter
      query = this.applyOrgFilter(query, organizationId);

      // Apply soft delete filter
      query = this.applySoftDeleteFilter(query, includeDeleted);

      // Apply custom filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else {
            query = query.eq(key, value);
          }
        }
      });

      // Apply search
      if (search.term && search.fields) {
        query = this.applySearch(query, search.term, search.fields);
      }

      // Apply sorting
      query = this.applySorting(query, sort);

      // Apply pagination
      query = this.applyPagination(query, pagination);

      return query;
    }, 'GET_MANY');
  }

  /**
   * Update record by ID
   * @param {string} id - Record ID
   * @param {Object} data - Update data
   * @param {Object} options - Update options
   * @returns {Object} Updated record or error
   */
  async update(id, data, options = {}) {
    const {
      organizationId = null,
      returnData = true
    } = options;

    // Add updated_at timestamp
    const updateData = {
      ...data,
      updated_at: new Date().toISOString()
    };

    const result = await this.executeQuery(async () => {
      let query = this.getClient()
        .from(this.tableName)
        .update(updateData)
        .eq('id', id);

      query = this.applyOrgFilter(query, organizationId);

      if (returnData) {
        query = query.select();
      }

      return query;
    }, 'UPDATE');

    // Invalidate cache on successful update
    if (result.success && this.options.enableCaching) {
      await this.invalidateEntityCache(id, organizationId);
    }

    return result;
  }

  /**
   * Delete record (soft delete if enabled)
   * @param {string} id - Record ID
   * @param {Object} options - Delete options
   * @returns {Object} Delete result or error
   */
  async delete(id, options = {}) {
    const {
      organizationId = null,
      hardDelete = false,
      returnData = false
    } = options;

    let result;

    if (this.options.enableSoftDelete && !hardDelete) {
      // Soft delete (uses update method which handles cache invalidation)
      result = await this.update(id, { 
        deleted_at: new Date().toISOString() 
      }, { organizationId, returnData });
    } else {
      // Hard delete
      result = await this.executeQuery(async () => {
        let query = this.getClient()
          .from(this.tableName)
          .delete()
          .eq('id', id);

        query = this.applyOrgFilter(query, organizationId);

        if (returnData) {
          query = query.select();
        }

        return query;
      }, 'DELETE');

      // Invalidate cache on successful hard delete
      if (result.success && this.options.enableCaching) {
        await this.invalidateEntityCache(id, organizationId);
      }
    }

    return result;
  }

  /**
   * Count records with filters
   * @param {Object} filters - Filter conditions
   * @param {Object} options - Count options
   * @returns {Object} Count result or error
   */
  async count(filters = {}, options = {}) {
    const {
      organizationId = null,
      includeDeleted = false
    } = options;

    return this.executeQuery(async () => {
      let query = this.getAnonClient()
        .from(this.tableName)
        .select('id', { count: 'exact', head: true });

      query = this.applyOrgFilter(query, organizationId);
      query = this.applySoftDeleteFilter(query, includeDeleted);

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          query = query.eq(key, value);
        }
      });

      return query;
    }, 'COUNT');
  }

  /**
   * Execute raw SQL query (admin only)
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Object} Query result or error
   */
  async executeRawSQL(sql, params = []) {
    return this.executeQuery(async () => {
      return this.getClient().rpc('execute_sql', {
        sql,
        params
      });
    }, 'RAW_SQL');
  }

  /**
   * Begin transaction (if supported)
   * @returns {Object} Transaction context
   */
  async beginTransaction() {
    // Supabase doesn't support explicit transactions in the client
    // This is a placeholder for future implementation or custom logic
    this.log('Transaction started (simulated)', 'info');
    return { transactionId: `tx_${Date.now()}` };
  }

  /**
   * Commit transaction
   * @param {Object} transaction - Transaction context
   */
  async commitTransaction(transaction) {
    this.log(`Transaction ${transaction.transactionId} committed`, 'info');
  }

  /**
   * Rollback transaction
   * @param {Object} transaction - Transaction context
   */
  async rollbackTransaction(transaction) {
    this.log(`Transaction ${transaction.transactionId} rolled back`, 'warn');
  }

  /**
   * Get service metrics
   * @returns {Object} Service performance metrics
   */
  getMetrics() {
    const avgResponseTime = this.metrics.queries > 0 
      ? this.metrics.totalResponseTime / this.metrics.queries 
      : 0;

    const cacheRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    const cacheHitRate = cacheRequests > 0 
      ? (this.metrics.cacheHits / cacheRequests * 100).toFixed(2)
      : 0;

    return {
      tableName: this.tableName,
      queries: this.metrics.queries,
      errors: this.metrics.errors,
      successRate: this.metrics.queries > 0 
        ? ((this.metrics.queries - this.metrics.errors) / this.metrics.queries) * 100 
        : 100,
      avgResponseTime: Math.round(avgResponseTime),
      totalResponseTime: this.metrics.totalResponseTime,
      cache: {
        enabled: this.options.enableCaching,
        hits: this.metrics.cacheHits,
        misses: this.metrics.cacheMisses,
        hitRate: `${cacheHitRate}%`,
        totalRequests: cacheRequests
      }
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      queries: 0,
      errors: 0,
      totalResponseTime: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  /**
   * Generate cache key for operation
   * @param {string} operation - Operation name
   * @param {Object} params - Operation parameters
   * @returns {string} Cache key
   */
  generateCacheKey(operation, params) {
    const keyParts = [this.tableName, operation];
    
    // Add relevant parameters to key
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (typeof value === 'object') {
          keyParts.push(`${key}_${JSON.stringify(value)}`);
        } else {
          keyParts.push(`${key}_${value}`);
        }
      }
    });

    return keyParts.join(':').replace(/[^a-zA-Z0-9:_-]/g, '_');
  }

  /**
   * Get cached result
   * @param {string} cacheKey - Cache key
   * @returns {any|null} Cached result or null
   */
  async getCachedResult(cacheKey) {
    try {
      const result = await cacheService.get(cacheKey);
      if (result !== null) {
        this.metrics.cacheHits++;
        this.log(`Cache hit for key: ${cacheKey}`);
        return result;
      } else {
        this.metrics.cacheMisses++;
        this.log(`Cache miss for key: ${cacheKey}`);
        return null;
      }
    } catch (error) {
      this.log(`Cache get error for key ${cacheKey}: ${error.message}`, 'warn');
      this.metrics.cacheMisses++;
      return null;
    }
  }

  /**
   * Cache result
   * @param {string} cacheKey - Cache key
   * @param {any} result - Result to cache
   * @param {number} ttl - Time to live in seconds
   */
  async cacheResult(cacheKey, result, ttl) {
    try {
      await cacheService.set(cacheKey, result, ttl);
      this.log(`Cached result for key: ${cacheKey} (TTL: ${ttl}s)`);
    } catch (error) {
      this.log(`Cache set error for key ${cacheKey}: ${error.message}`, 'warn');
    }
  }

  /**
   * Invalidate cache patterns for this table
   * @param {string} [pattern] - Specific pattern or all table patterns
   */
  async invalidateCache(pattern = null) {
    try {
      const deletePattern = pattern || `${this.tableName}:*`;
      const deletedCount = await cacheService.deletePattern(deletePattern);
      this.log(`Invalidated ${deletedCount} cache entries for pattern: ${deletePattern}`);
      return deletedCount;
    } catch (error) {
      this.log(`Cache invalidation error for pattern ${pattern}: ${error.message}`, 'warn');
      return 0;
    }
  }

  /**
   * Invalidate specific entity cache
   * @param {string} id - Entity ID
   * @param {string} organizationId - Organization ID
   */
  async invalidateEntityCache(id, organizationId = null) {
    const patterns = [
      `${this.tableName}:getById:*id_${id}*`,
      `${this.tableName}:getMany:*`,
      `${this.tableName}:count:*`
    ];

    if (organizationId) {
      patterns.push(`${this.tableName}:*organizationId_${organizationId}*`);
    }

    let totalDeleted = 0;
    for (const pattern of patterns) {
      totalDeleted += await this.invalidateCache(pattern);
    }

    this.log(`Invalidated ${totalDeleted} cache entries for entity ${id}`);
    return totalDeleted;
  }

  /**
   * Health check for the service
   * @returns {Object} Health status
   */
  async healthCheck() {
    try {
      const result = await this.count();
      return {
        healthy: result.success,
        tableName: this.tableName,
        error: result.error?.message || null,
        metrics: this.getMetrics(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        healthy: false,
        tableName: this.tableName,
        error: error.message,
        metrics: this.getMetrics(),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Log messages with service context
   * @param {string} message - Log message
   * @param {string} level - Log level
   */
  log(message, level = 'info') {
    if (!this.options.enableLogging) return;

    const timestamp = new Date().toISOString();
    const prefix = `[${this.tableName}Service ${level.toUpperCase()}] ${timestamp}`;

    switch (level) {
      case 'error':
        console.error(`${prefix}: ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix}: ${message}`);
        break;
      default:
        console.log(`${prefix}: ${message}`);
    }
  }
}

export default BaseService;