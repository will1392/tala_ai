/**
 * Performance Optimization Configuration
 * 
 * Settings for optimizing CMO mode performance
 */

export const performanceConfig = {
  // Knowledge Base Caching
  knowledgeCache: {
    enabled: true,
    ttl: 3600, // 1 hour in seconds
    maxSize: 1000, // Maximum number of cached items
    checkPeriod: 600 // Check for expired cache items every 10 minutes
  },

  // Query Result Caching
  queryCache: {
    enabled: true,
    ttl: 1800, // 30 minutes
    maxSize: 500,
    // Cache keys to ignore (dynamic queries)
    ignoredPatterns: [
      /^generate/i,
      /^create/i,
      /^write/i
    ]
  },

  // Vector Search Optimization
  vectorSearch: {
    // Pre-filter by category before vector search
    preFilterEnabled: true,
    // Batch embedding generation
    batchSize: 10,
    // Parallel search across collections
    parallelSearches: 3,
    // Result caching
    cacheResults: true,
    cacheTTL: 900 // 15 minutes
  },

  // Mode Context Optimization
  modeContext: {
    // Lazy load sub-contexts
    lazyLoadSubContexts: true,
    // Cache user preferences
    cacheUserPreferences: true,
    preferencesCacheTTL: 7200, // 2 hours
    // Batch database updates
    batchUpdates: true,
    batchInterval: 1000 // 1 second
  },

  // Knowledge Loading
  knowledgeLoading: {
    // Load knowledge files asynchronously
    asyncLoad: true,
    // Preload frequently used categories
    preloadCategories: ['seo', 'email'],
    // Compress knowledge in memory
    compressInMemory: true,
    // Index optimization
    buildIndexOnStartup: true
  },

  // Response Generation
  responseGeneration: {
    // Stream responses for better perceived performance
    streamingEnabled: true,
    // Cache common response templates
    cacheTemplates: true,
    // Parallel knowledge retrieval
    parallelRetrieval: true,
    maxParallelQueries: 3
  },

  // Database Optimization
  database: {
    // Connection pooling
    poolSize: 10,
    // Query timeout
    queryTimeout: 5000,
    // Batch inserts
    batchInserts: true,
    batchSize: 100,
    // Index hints
    useIndexHints: true
  },

  // Memory Management
  memory: {
    // Maximum memory usage (MB)
    maxHeapUsage: 512,
    // Garbage collection threshold
    gcThreshold: 0.8,
    // Clear unused caches
    autoClearCaches: true,
    clearInterval: 3600 // 1 hour
  },

  // API Rate Limiting
  rateLimiting: {
    // Requests per minute per user
    requestsPerMinute: 60,
    // Burst allowance
    burstAllowance: 10,
    // Cache rate limit data
    cacheRateLimits: true
  },

  // Monitoring
  monitoring: {
    // Enable performance tracking
    enabled: true,
    // Sample rate (percentage)
    sampleRate: 0.1,
    // Log slow queries
    logSlowQueries: true,
    slowQueryThreshold: 1000, // 1 second
    // Memory usage alerts
    memoryAlertThreshold: 0.9
  }
};

// Performance utilities
export const performanceUtils = {
  /**
   * Create cache key from query
   */
  createCacheKey(query, options = {}) {
    const baseKey = query.toLowerCase().trim();
    const optionsKey = JSON.stringify(options, Object.keys(options).sort());
    return `${baseKey}:${optionsKey}`;
  },

  /**
   * Check if query should be cached
   */
  shouldCacheQuery(query) {
    return !performanceConfig.queryCache.ignoredPatterns.some(
      pattern => pattern.test(query)
    );
  },

  /**
   * Get memory usage
   */
  getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024),
      percentage: usage.heapUsed / usage.heapTotal
    };
  },

  /**
   * Check if memory threshold exceeded
   */
  isMemoryHigh() {
    const usage = this.getMemoryUsage();
    return usage.percentage > performanceConfig.memory.gcThreshold;
  }
};