/**
 * CMO Cache Service
 * 
 * High-performance caching for CMO operations
 */

import { LRUCache } from 'lru-cache';
import { performanceConfig, performanceUtils } from '../../config/performance.js';

export class CMOCache {
  constructor() {
    // Initialize different cache stores
    this.knowledgeCache = new LRUCache({
      max: performanceConfig.knowledgeCache.maxSize,
      ttl: performanceConfig.knowledgeCache.ttl * 1000, // Convert to milliseconds
      updateAgeOnGet: true,
      updateAgeOnHas: true
    });

    this.queryCache = new LRUCache({
      max: performanceConfig.queryCache.maxSize,
      ttl: performanceConfig.queryCache.ttl * 1000,
      updateAgeOnGet: true,
      updateAgeOnHas: true
    });

    this.vectorCache = new LRUCache({
      max: 200,
      ttl: performanceConfig.vectorSearch.cacheTTL * 1000,
      updateAgeOnGet: true,
      updateAgeOnHas: true
    });

    this.userPreferencesCache = new LRUCache({
      max: 1000,
      ttl: performanceConfig.modeContext.preferencesCacheTTL * 1000,
      updateAgeOnGet: true,
      updateAgeOnHas: true
    });

    // Track cache statistics
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };

    // Auto-clear caches periodically
    if (performanceConfig.memory.autoClearCaches) {
      this.startAutoClear();
    }

    console.log('🚀 CMO Cache initialized with performance optimizations');
  }

  /**
   * Start auto-clear interval
   */
  startAutoClear() {
    setInterval(() => {
      if (performanceUtils.isMemoryHigh()) {
        console.log('⚠️ High memory usage detected, clearing caches');
        this.clearOldEntries();
      }
    }, performanceConfig.memory.clearInterval * 1000);
  }

  /**
   * Get from knowledge cache
   */
  getKnowledge(key) {
    const value = this.knowledgeCache.get(key);
    if (value) {
      this.stats.hits++;
      return value;
    }
    this.stats.misses++;
    return null;
  }

  /**
   * Set knowledge cache
   */
  setKnowledge(key, value, ttl) {
    this.stats.sets++;
    return this.knowledgeCache.set(key, value, ttl);
  }

  /**
   * Get from query cache
   */
  getQuery(query, options = {}) {
    if (!performanceUtils.shouldCacheQuery(query)) {
      return null;
    }

    const key = performanceUtils.createCacheKey(query, options);
    const value = this.queryCache.get(key);
    
    if (value) {
      this.stats.hits++;
      return value;
    }
    
    this.stats.misses++;
    return null;
  }

  /**
   * Set query cache
   */
  setQuery(query, options, value) {
    if (!performanceUtils.shouldCacheQuery(query)) {
      return false;
    }

    const key = performanceUtils.createCacheKey(query, options);
    this.stats.sets++;
    return this.queryCache.set(key, value);
  }

  /**
   * Get vector search results
   */
  getVectorSearch(embedding, category) {
    // Create key from first few elements of embedding
    const key = `${category}:${embedding.slice(0, 5).join(',')}`;
    const value = this.vectorCache.get(key);
    
    if (value) {
      this.stats.hits++;
      return value;
    }
    
    this.stats.misses++;
    return null;
  }

  /**
   * Set vector search results
   */
  setVectorSearch(embedding, category, results) {
    const key = `${category}:${embedding.slice(0, 5).join(',')}`;
    this.stats.sets++;
    return this.vectorCache.set(key, results);
  }

  /**
   * Get user preferences
   */
  getUserPreferences(userId) {
    const value = this.userPreferencesCache.get(userId);
    if (value) {
      this.stats.hits++;
      return value;
    }
    this.stats.misses++;
    return null;
  }

  /**
   * Set user preferences
   */
  setUserPreferences(userId, preferences) {
    this.stats.sets++;
    return this.userPreferencesCache.set(userId, preferences);
  }

  /**
   * Clear old entries from all caches
   */
  clearOldEntries() {
    let cleared = 0;

    // LRUCache automatically handles TTL expiration
    // We can get the current size before and after to track changes
    const before = {
      knowledge: this.knowledgeCache.size,
      query: this.queryCache.size,
      vector: this.vectorCache.size,
      preferences: this.userPreferencesCache.size
    };

    // Force cleanup by iterating and checking TTL
    // Note: LRUCache v11 automatically removes expired items on access
    
    const after = {
      knowledge: this.knowledgeCache.size,
      query: this.queryCache.size,
      vector: this.vectorCache.size,
      preferences: this.userPreferencesCache.size
    };

    cleared = (before.knowledge - after.knowledge) +
              (before.query - after.query) +
              (before.vector - after.vector) +
              (before.preferences - after.preferences);

    if (cleared > 0) {
      console.log(`🧹 Cleared ${cleared} stale cache entries`);
      this.stats.deletes += cleared;
    }

    return cleared;
  }

  /**
   * Flush all caches
   */
  flushAll() {
    this.knowledgeCache.clear();
    this.queryCache.clear();
    this.vectorCache.clear();
    this.userPreferencesCache.clear();
    console.log('🚿 All caches flushed');
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const memory = performanceUtils.getMemoryUsage();
    
    return {
      ...this.stats,
      caches: {
        knowledge: {
          keys: this.knowledgeCache.size,
          size: this.knowledgeCache.calculatedSize || 0
        },
        query: {
          keys: this.queryCache.size,
          size: this.queryCache.calculatedSize || 0
        },
        vector: {
          keys: this.vectorCache.size,
          size: this.vectorCache.calculatedSize || 0
        },
        preferences: {
          keys: this.userPreferencesCache.size,
          size: this.userPreferencesCache.calculatedSize || 0
        }
      },
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      memory
    };
  }

  /**
   * Warm up cache with frequently used data
   */
  async warmUp(knowledgeBase) {
    console.log('🔥 Warming up CMO cache...');
    
    // Preload frequently used categories
    for (const category of performanceConfig.knowledgeLoading.preloadCategories) {
      const items = knowledgeBase.getByCategory(category);
      items.forEach(item => {
        this.setKnowledge(`item:${item.id}`, item);
      });
    }

    // Preload common templates
    const templates = knowledgeBase.getByType('template');
    templates.forEach(template => {
      this.setKnowledge(`template:${template.id}`, template);
    });

    const stats = this.getStats();
    console.log(`✅ Cache warmed up: ${stats.caches.knowledge.keys} items loaded`);
  }
}

// Export singleton instance
export const cmoCache = new CMOCache();