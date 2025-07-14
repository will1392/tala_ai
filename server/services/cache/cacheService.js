/**
 * Cache Service for Tala AI
 * 
 * Provides high-level caching interface with:
 * - Automatic serialization/deserialization
 * - TTL management
 * - Pattern-based deletion
 * - Graceful fallback when Redis is unavailable
 * - Performance metrics
 */

import { getRedisClient, safeRedisCommand, config as redisConfig } from '../../config/redis.js';

class CacheService {
  constructor() {
    this.isEnabled = redisConfig.enabled;
    this.defaultTTL = redisConfig.defaultTTL;
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} Cached value or null if not found
   */
  async get(key) {
    if (!this.isEnabled) {
      return null;
    }

    try {
      const result = await safeRedisCommand(async () => {
        const client = getRedisClient();
        if (!client) return null;
        
        const value = await client.get(key);
        return value ? JSON.parse(value) : null;
      });

      if (result !== null) {
        this.metrics.hits++;
      } else {
        this.metrics.misses++;
      }

      return result;
    } catch (error) {
      this.metrics.errors++;
      console.warn(`Cache get error for key ${key}:`, error.message);
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} [ttl] - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl = this.defaultTTL) {
    if (!this.isEnabled) {
      return false;
    }

    try {
      const success = await safeRedisCommand(async () => {
        const client = getRedisClient();
        if (!client) return false;

        const serializedValue = JSON.stringify(value);
        
        if (ttl > 0) {
          await client.setex(key, ttl, serializedValue);
        } else {
          await client.set(key, serializedValue);
        }
        
        return true;
      }, false);

      if (success) {
        this.metrics.sets++;
      } else {
        this.metrics.errors++;
      }

      return success;
    } catch (error) {
      this.metrics.errors++;
      console.warn(`Cache set error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Delete specific key from cache
   * @param {string} key - Cache key to delete
   * @returns {Promise<boolean>} Success status
   */
  async delete(key) {
    if (!this.isEnabled) {
      return false;
    }

    try {
      const success = await safeRedisCommand(async () => {
        const client = getRedisClient();
        if (!client) return false;

        const deleted = await client.del(key);
        return deleted > 0;
      }, false);

      if (success) {
        this.metrics.deletes++;
      }

      return success;
    } catch (error) {
      this.metrics.errors++;
      console.warn(`Cache delete error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   * @param {string} pattern - Pattern to match (e.g., "user:*", "conversation:123:*")
   * @returns {Promise<number>} Number of keys deleted
   */
  async deletePattern(pattern) {
    if (!this.isEnabled) {
      return 0;
    }

    try {
      const deletedCount = await safeRedisCommand(async () => {
        const client = getRedisClient();
        if (!client) return 0;

        // Get all keys matching pattern
        const keys = await client.keys(pattern);
        
        if (keys.length === 0) {
          return 0;
        }

        // Delete all matching keys in a pipeline for better performance
        const pipeline = client.pipeline();
        keys.forEach(key => pipeline.del(key));
        
        const results = await pipeline.exec();
        
        // Count successful deletions
        return results.reduce((count, [error, result]) => {
          return error ? count : count + result;
        }, 0);
      }, 0);

      this.metrics.deletes += deletedCount;
      return deletedCount;
    } catch (error) {
      this.metrics.errors++;
      console.warn(`Cache deletePattern error for pattern ${pattern}:`, error.message);
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} True if key exists
   */
  async exists(key) {
    if (!this.isEnabled) {
      return false;
    }

    try {
      return await safeRedisCommand(async () => {
        const client = getRedisClient();
        if (!client) return false;

        const exists = await client.exists(key);
        return exists === 1;
      }, false);
    } catch (error) {
      this.metrics.errors++;
      console.warn(`Cache exists error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Get TTL (time to live) for a key
   * @param {string} key - Cache key
   * @returns {Promise<number>} TTL in seconds (-1 if no expiry, -2 if key doesn't exist)
   */
  async getTTL(key) {
    if (!this.isEnabled) {
      return -2;
    }

    try {
      return await safeRedisCommand(async () => {
        const client = getRedisClient();
        if (!client) return -2;

        return await client.ttl(key);
      }, -2);
    } catch (error) {
      this.metrics.errors++;
      console.warn(`Cache getTTL error for key ${key}:`, error.message);
      return -2;
    }
  }

  /**
   * Set expiry for existing key
   * @param {string} key - Cache key
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async expire(key, ttl) {
    if (!this.isEnabled) {
      return false;
    }

    try {
      return await safeRedisCommand(async () => {
        const client = getRedisClient();
        if (!client) return false;

        const result = await client.expire(key, ttl);
        return result === 1;
      }, false);
    } catch (error) {
      this.metrics.errors++;
      console.warn(`Cache expire error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Get multiple values at once
   * @param {string[]} keys - Array of cache keys
   * @returns {Promise<Object>} Object with key-value pairs
   */
  async getMultiple(keys) {
    if (!this.isEnabled || keys.length === 0) {
      return {};
    }

    try {
      return await safeRedisCommand(async () => {
        const client = getRedisClient();
        if (!client) return {};

        const values = await client.mget(...keys);
        const result = {};

        keys.forEach((key, index) => {
          const value = values[index];
          if (value !== null) {
            try {
              result[key] = JSON.parse(value);
              this.metrics.hits++;
            } catch (parseError) {
              console.warn(`Cache parse error for key ${key}:`, parseError.message);
              this.metrics.errors++;
            }
          } else {
            this.metrics.misses++;
          }
        });

        return result;
      }, {});
    } catch (error) {
      this.metrics.errors++;
      console.warn(`Cache getMultiple error:`, error.message);
      return {};
    }
  }

  /**
   * Set multiple values at once
   * @param {Object} keyValuePairs - Object with key-value pairs
   * @param {number} [ttl] - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async setMultiple(keyValuePairs, ttl = this.defaultTTL) {
    if (!this.isEnabled || Object.keys(keyValuePairs).length === 0) {
      return false;
    }

    try {
      return await safeRedisCommand(async () => {
        const client = getRedisClient();
        if (!client) return false;

        const pipeline = client.pipeline();

        Object.entries(keyValuePairs).forEach(([key, value]) => {
          const serializedValue = JSON.stringify(value);
          
          if (ttl > 0) {
            pipeline.setex(key, ttl, serializedValue);
          } else {
            pipeline.set(key, serializedValue);
          }
        });

        await pipeline.exec();
        this.metrics.sets += Object.keys(keyValuePairs).length;
        return true;
      }, false);
    } catch (error) {
      this.metrics.errors++;
      console.warn(`Cache setMultiple error:`, error.message);
      return false;
    }
  }

  /**
   * Flush all cache data
   * @returns {Promise<boolean>} Success status
   */
  async flush() {
    if (!this.isEnabled) {
      return false;
    }

    try {
      return await safeRedisCommand(async () => {
        const client = getRedisClient();
        if (!client) return false;

        await client.flushdb();
        return true;
      }, false);
    } catch (error) {
      this.metrics.errors++;
      console.warn(`Cache flush error:`, error.message);
      return false;
    }
  }

  /**
   * Get cache statistics and metrics
   * @returns {Object} Cache metrics and statistics
   */
  getMetrics() {
    const hitRate = this.metrics.hits + this.metrics.misses > 0 
      ? (this.metrics.hits / (this.metrics.hits + this.metrics.misses) * 100).toFixed(2)
      : 0;

    return {
      enabled: this.isEnabled,
      hitRate: `${hitRate}%`,
      totalOperations: this.metrics.hits + this.metrics.misses + this.metrics.sets + this.metrics.deletes,
      ...this.metrics,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Reset metrics counters
   */
  resetMetrics() {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
  }

  /**
   * Helper method for cache-aside pattern
   * Gets value from cache, or executes function and caches result
   * @param {string} key - Cache key
   * @param {Function} fetchFunction - Function to fetch data if not in cache
   * @param {number} [ttl] - Time to live in seconds
   * @returns {Promise<any>} Cached or fetched value
   */
  async getOrSet(key, fetchFunction, ttl = this.defaultTTL) {
    // Try to get from cache first
    let value = await this.get(key);
    
    if (value !== null) {
      return value;
    }

    // Not in cache, fetch the data
    try {
      value = await fetchFunction();
      
      // Cache the result if we got a value
      if (value !== null && value !== undefined) {
        await this.set(key, value, ttl);
      }
      
      return value;
    } catch (error) {
      console.warn(`Cache getOrSet fetch error for key ${key}:`, error.message);
      throw error; // Re-throw to let caller handle
    }
  }

  /**
   * Increment a numeric value in cache
   * @param {string} key - Cache key
   * @param {number} [increment=1] - Amount to increment by
   * @returns {Promise<number>} New value after increment
   */
  async increment(key, increment = 1) {
    if (!this.isEnabled) {
      return 0;
    }

    try {
      return await safeRedisCommand(async () => {
        const client = getRedisClient();
        if (!client) return 0;

        return await client.incrby(key, increment);
      }, 0);
    } catch (error) {
      this.metrics.errors++;
      console.warn(`Cache increment error for key ${key}:`, error.message);
      return 0;
    }
  }

  /**
   * Decrement a numeric value in cache
   * @param {string} key - Cache key
   * @param {number} [decrement=1] - Amount to decrement by
   * @returns {Promise<number>} New value after decrement
   */
  async decrement(key, decrement = 1) {
    if (!this.isEnabled) {
      return 0;
    }

    try {
      return await safeRedisCommand(async () => {
        const client = getRedisClient();
        if (!client) return 0;

        return await client.decrby(key, decrement);
      }, 0);
    } catch (error) {
      this.metrics.errors++;
      console.warn(`Cache decrement error for key ${key}:`, error.message);
      return 0;
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Export class for testing
export { CacheService };

// Export default
export default cacheService;