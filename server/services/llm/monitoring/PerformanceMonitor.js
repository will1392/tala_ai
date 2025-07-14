/**
 * Performance Monitor for Tala AI LLM Services
 * 
 * Tracks and analyzes performance metrics across all LLM models including
 * response times, token usage, success rates, costs, and model selection patterns.
 */

export class PerformanceMonitor {
  constructor(options = {}) {
    this.options = {
      enableLogging: options.enableLogging !== false,
      retentionPeriod: options.retentionPeriod || 7 * 24 * 60 * 60 * 1000, // 7 days
      aggregationWindow: options.aggregationWindow || 60 * 60 * 1000, // 1 hour
      maxMetricsInMemory: options.maxMetricsInMemory || 10000,
      ...options
    };

    // Real-time metrics storage
    this.metrics = {
      requests: [],           // Individual request metrics
      models: new Map(),      // Per-model aggregated metrics
      queryTypes: new Map(),  // Per-query-type metrics
      hourlyStats: new Map(), // Hourly aggregated stats
      dailyStats: new Map()   // Daily aggregated stats
    };

    // Performance tracking state
    this.activeRequests = new Map(); // Track ongoing requests
    this.startTime = Date.now();

    this.log('Performance Monitor initialized');
  }

  /**
   * Start tracking a new request
   * @param {string} requestId - Unique request identifier
   * @param {Object} context - Request context
   */
  startRequest(requestId, context = {}) {
    const timestamp = Date.now();
    
    this.activeRequests.set(requestId, {
      startTime: timestamp,
      modelId: context.modelId,
      queryType: context.queryType,
      userId: context.userId,
      sessionId: context.sessionId,
      queryLength: context.queryLength || 0,
      estimatedTokens: context.estimatedTokens || 0
    });

    this.log(`Started tracking request ${requestId} for model ${context.modelId}`);
  }

  /**
   * Complete request tracking with results
   * @param {string} requestId - Request identifier
   * @param {Object} result - Request result data
   */
  completeRequest(requestId, result = {}) {
    const activeRequest = this.activeRequests.get(requestId);
    if (!activeRequest) {
      this.log(`Warning: No active request found for ${requestId}`, 'warn');
      return null;
    }

    const endTime = Date.now();
    const responseTime = endTime - activeRequest.startTime;

    // Create comprehensive metrics record
    const metrics = {
      requestId,
      timestamp: endTime,
      modelId: result.modelId || activeRequest.modelId,
      queryType: activeRequest.queryType,
      userId: activeRequest.userId,
      sessionId: activeRequest.sessionId,
      
      // Performance metrics
      responseTime,
      queryLength: activeRequest.queryLength,
      
      // Token usage
      tokensUsed: result.tokensUsed || 0,
      inputTokens: result.inputTokens || 0,
      outputTokens: result.outputTokens || 0,
      estimatedTokens: activeRequest.estimatedTokens,
      
      // Cost metrics
      cost: result.cost || 0,
      inputCost: result.inputCost || 0,
      outputCost: result.outputCost || 0,
      
      // Success metrics
      success: result.success !== false,
      errorType: result.errorType || null,
      fallbacksUsed: result.fallbacksUsed || 0,
      modelsAttempted: result.modelsAttempted || 1,
      
      // Additional context
      contentLength: result.contentLength || 0,
      userFeedback: result.userFeedback || null
    };

    // Store the metrics
    this.recordMetrics(metrics);
    
    // Clean up active request
    this.activeRequests.delete(requestId);
    
    this.log(`Completed tracking request ${requestId}: ${responseTime}ms, ${metrics.tokensUsed} tokens, $${metrics.cost.toFixed(6)}`);
    
    return metrics;
  }

  /**
   * Record metrics and update aggregations
   * @param {Object} metrics - Complete metrics record
   */
  recordMetrics(metrics) {
    // Add to request history
    this.metrics.requests.push(metrics);
    
    // Update model-specific metrics
    this.updateModelMetrics(metrics);
    
    // Update query type metrics
    this.updateQueryTypeMetrics(metrics);
    
    // Update time-based aggregations
    this.updateTimeBasedMetrics(metrics);
    
    // Cleanup old metrics if needed
    this.cleanupOldMetrics();
  }

  /**
   * Update per-model aggregated metrics
   * @param {Object} metrics - Request metrics
   */
  updateModelMetrics(metrics) {
    const modelId = metrics.modelId;
    
    if (!this.metrics.models.has(modelId)) {
      this.metrics.models.set(modelId, {
        modelId,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalResponseTime: 0,
        totalTokensUsed: 0,
        totalCost: 0,
        avgResponseTime: 0,
        avgTokensPerRequest: 0,
        avgCostPerRequest: 0,
        successRate: 0,
        errorTypes: {},
        lastUsed: null,
        firstUsed: null,
        
        // Performance percentiles (will be calculated)
        responseTimeP50: 0,
        responseTimeP95: 0,
        responseTimeP99: 0,
        
        // Recent performance (last 100 requests)
        recentResponseTimes: [],
        recentCosts: [],
        recentTokenUsage: []
      });
    }

    const modelStats = this.metrics.models.get(modelId);
    
    // Update counters
    modelStats.totalRequests++;
    if (metrics.success) {
      modelStats.successfulRequests++;
    } else {
      modelStats.failedRequests++;
      const errorType = metrics.errorType || 'unknown';
      modelStats.errorTypes[errorType] = (modelStats.errorTypes[errorType] || 0) + 1;
    }
    
    // Update totals
    modelStats.totalResponseTime += metrics.responseTime;
    modelStats.totalTokensUsed += metrics.tokensUsed;
    modelStats.totalCost += metrics.cost;
    
    // Update averages
    modelStats.avgResponseTime = modelStats.totalResponseTime / modelStats.totalRequests;
    modelStats.avgTokensPerRequest = modelStats.totalTokensUsed / modelStats.totalRequests;
    modelStats.avgCostPerRequest = modelStats.totalCost / modelStats.totalRequests;
    modelStats.successRate = (modelStats.successfulRequests / modelStats.totalRequests) * 100;
    
    // Update timestamps
    modelStats.lastUsed = metrics.timestamp;
    if (!modelStats.firstUsed) {
      modelStats.firstUsed = metrics.timestamp;
    }
    
    // Update recent performance arrays (keep last 100)
    modelStats.recentResponseTimes.push(metrics.responseTime);
    modelStats.recentCosts.push(metrics.cost);
    modelStats.recentTokenUsage.push(metrics.tokensUsed);
    
    if (modelStats.recentResponseTimes.length > 100) {
      modelStats.recentResponseTimes.shift();
      modelStats.recentCosts.shift();
      modelStats.recentTokenUsage.shift();
    }
    
    // Calculate percentiles
    this.updatePercentiles(modelStats);
  }

  /**
   * Update query type aggregated metrics
   * @param {Object} metrics - Request metrics
   */
  updateQueryTypeMetrics(metrics) {
    const queryType = metrics.queryType || 'unknown';
    
    if (!this.metrics.queryTypes.has(queryType)) {
      this.metrics.queryTypes.set(queryType, {
        queryType,
        totalRequests: 0,
        successfulRequests: 0,
        avgResponseTime: 0,
        avgTokensUsed: 0,
        avgCost: 0,
        modelDistribution: {},
        totalCost: 0,
        totalTokens: 0,
        totalResponseTime: 0
      });
    }

    const queryStats = this.metrics.queryTypes.get(queryType);
    
    queryStats.totalRequests++;
    if (metrics.success) {
      queryStats.successfulRequests++;
    }
    
    queryStats.totalResponseTime += metrics.responseTime;
    queryStats.totalTokens += metrics.tokensUsed;
    queryStats.totalCost += metrics.cost;
    
    // Update averages
    queryStats.avgResponseTime = queryStats.totalResponseTime / queryStats.totalRequests;
    queryStats.avgTokensUsed = queryStats.totalTokens / queryStats.totalRequests;
    queryStats.avgCost = queryStats.totalCost / queryStats.totalRequests;
    
    // Update model distribution
    const modelId = metrics.modelId;
    queryStats.modelDistribution[modelId] = (queryStats.modelDistribution[modelId] || 0) + 1;
  }

  /**
   * Update time-based aggregated metrics
   * @param {Object} metrics - Request metrics
   */
  updateTimeBasedMetrics(metrics) {
    const timestamp = metrics.timestamp;
    const hourKey = Math.floor(timestamp / this.options.aggregationWindow);
    const dayKey = Math.floor(timestamp / (24 * 60 * 60 * 1000));
    
    // Update hourly stats
    if (!this.metrics.hourlyStats.has(hourKey)) {
      this.metrics.hourlyStats.set(hourKey, {
        timestamp: hourKey * this.options.aggregationWindow,
        requests: 0,
        successfulRequests: 0,
        totalCost: 0,
        totalTokens: 0,
        totalResponseTime: 0,
        models: new Set()
      });
    }
    
    const hourlyStats = this.metrics.hourlyStats.get(hourKey);
    hourlyStats.requests++;
    if (metrics.success) hourlyStats.successfulRequests++;
    hourlyStats.totalCost += metrics.cost;
    hourlyStats.totalTokens += metrics.tokensUsed;
    hourlyStats.totalResponseTime += metrics.responseTime;
    hourlyStats.models.add(metrics.modelId);
    
    // Update daily stats
    if (!this.metrics.dailyStats.has(dayKey)) {
      this.metrics.dailyStats.set(dayKey, {
        date: new Date(dayKey * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        requests: 0,
        successfulRequests: 0,
        totalCost: 0,
        totalTokens: 0,
        uniqueUsers: new Set(),
        uniqueModels: new Set()
      });
    }
    
    const dailyStats = this.metrics.dailyStats.get(dayKey);
    dailyStats.requests++;
    if (metrics.success) dailyStats.successfulRequests++;
    dailyStats.totalCost += metrics.cost;
    dailyStats.totalTokens += metrics.tokensUsed;
    if (metrics.userId) dailyStats.uniqueUsers.add(metrics.userId);
    dailyStats.uniqueModels.add(metrics.modelId);
  }

  /**
   * Calculate performance percentiles for a model
   * @param {Object} modelStats - Model statistics object
   */
  updatePercentiles(modelStats) {
    if (modelStats.recentResponseTimes.length === 0) return;
    
    const sorted = [...modelStats.recentResponseTimes].sort((a, b) => a - b);
    const length = sorted.length;
    
    modelStats.responseTimeP50 = sorted[Math.floor(length * 0.5)];
    modelStats.responseTimeP95 = sorted[Math.floor(length * 0.95)];
    modelStats.responseTimeP99 = sorted[Math.floor(length * 0.99)];
  }

  /**
   * Get comprehensive performance report
   * @param {Object} options - Report options
   * @returns {Object} Performance report
   */
  getPerformanceReport(options = {}) {
    const {
      timeRange = 24 * 60 * 60 * 1000, // Last 24 hours
      includeRaw = false
    } = options;
    
    const now = Date.now();
    const cutoff = now - timeRange;
    
    // Filter recent requests
    const recentRequests = this.metrics.requests.filter(r => r.timestamp >= cutoff);
    
    return {
      summary: {
        totalRequests: recentRequests.length,
        successfulRequests: recentRequests.filter(r => r.success).length,
        totalCost: recentRequests.reduce((sum, r) => sum + r.cost, 0),
        totalTokens: recentRequests.reduce((sum, r) => sum + r.tokensUsed, 0),
        avgResponseTime: recentRequests.length > 0 
          ? recentRequests.reduce((sum, r) => sum + r.responseTime, 0) / recentRequests.length 
          : 0,
        timeRange: { start: cutoff, end: now }
      },
      
      modelPerformance: Array.from(this.metrics.models.values())
        .map(model => ({
          ...model,
          recentResponseTimes: undefined, // Exclude from report
          recentCosts: undefined,
          recentTokenUsage: undefined
        }))
        .sort((a, b) => b.totalRequests - a.totalRequests),
      
      queryTypeDistribution: Array.from(this.metrics.queryTypes.values())
        .sort((a, b) => b.totalRequests - a.totalRequests),
      
      hourlyTrends: Array.from(this.metrics.hourlyStats.entries())
        .filter(([key, _]) => key * this.options.aggregationWindow >= cutoff)
        .map(([_, stats]) => ({
          ...stats,
          models: Array.from(stats.models),
          avgResponseTime: stats.requests > 0 ? stats.totalResponseTime / stats.requests : 0,
          successRate: stats.requests > 0 ? (stats.successfulRequests / stats.requests) * 100 : 0
        }))
        .sort((a, b) => a.timestamp - b.timestamp),
      
      dailyTrends: Array.from(this.metrics.dailyStats.entries())
        .map(([_, stats]) => ({
          ...stats,
          uniqueUsers: stats.uniqueUsers.size,
          uniqueModels: Array.from(stats.uniqueModels),
          successRate: stats.requests > 0 ? (stats.successfulRequests / stats.requests) * 100 : 0
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      
      activeRequests: this.activeRequests.size,
      
      ...(includeRaw && { rawMetrics: recentRequests })
    };
  }

  /**
   * Get model comparison report
   * @param {Array} modelIds - Models to compare
   * @returns {Object} Comparison report
   */
  compareModels(modelIds = []) {
    const models = modelIds.length > 0 
      ? modelIds.filter(id => this.metrics.models.has(id)).map(id => this.metrics.models.get(id))
      : Array.from(this.metrics.models.values());
    
    if (models.length === 0) return null;
    
    return {
      models: models.map(model => ({
        modelId: model.modelId,
        totalRequests: model.totalRequests,
        successRate: model.successRate,
        avgResponseTime: model.avgResponseTime,
        avgCostPerRequest: model.avgCostPerRequest,
        avgTokensPerRequest: model.avgTokensPerRequest,
        responseTimeP95: model.responseTimeP95
      })),
      
      rankings: {
        fastest: [...models].sort((a, b) => a.avgResponseTime - b.avgResponseTime)[0]?.modelId,
        cheapest: [...models].sort((a, b) => a.avgCostPerRequest - b.avgCostPerRequest)[0]?.modelId,
        mostReliable: [...models].sort((a, b) => b.successRate - a.successRate)[0]?.modelId,
        mostUsed: [...models].sort((a, b) => b.totalRequests - a.totalRequests)[0]?.modelId
      }
    };
  }

  /**
   * Clean up old metrics to prevent memory leaks
   */
  cleanupOldMetrics() {
    const now = Date.now();
    const cutoff = now - this.options.retentionPeriod;
    
    // Limit in-memory requests
    if (this.metrics.requests.length > this.options.maxMetricsInMemory) {
      const toRemove = this.metrics.requests.length - this.options.maxMetricsInMemory;
      this.metrics.requests.splice(0, toRemove);
    }
    
    // Clean up old hourly stats
    for (const [key, _] of this.metrics.hourlyStats) {
      if (key * this.options.aggregationWindow < cutoff) {
        this.metrics.hourlyStats.delete(key);
      }
    }
    
    // Clean up old daily stats (keep longer retention for daily)
    const dailyCutoff = now - (30 * 24 * 60 * 60 * 1000); // 30 days
    for (const [key, _] of this.metrics.dailyStats) {
      if (key * 24 * 60 * 60 * 1000 < dailyCutoff) {
        this.metrics.dailyStats.delete(key);
      }
    }
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset() {
    this.metrics = {
      requests: [],
      models: new Map(),
      queryTypes: new Map(),
      hourlyStats: new Map(),
      dailyStats: new Map()
    };
    this.activeRequests.clear();
    this.log('Performance metrics reset');
  }

  /**
   * Get current system status
   */
  getStatus() {
    return {
      uptime: Date.now() - this.startTime,
      totalRequests: this.metrics.requests.length,
      activeRequests: this.activeRequests.size,
      modelsTracked: this.metrics.models.size,
      queryTypesTracked: this.metrics.queryTypes.size,
      memoryUsage: {
        requests: this.metrics.requests.length,
        maxRequests: this.options.maxMetricsInMemory
      }
    };
  }

  /**
   * Log messages with timestamp
   * @param {string} message - Log message
   * @param {string} level - Log level
   */
  log(message, level = 'info') {
    if (!this.options.enableLogging) return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[PerformanceMonitor ${level.toUpperCase()}] ${timestamp}`;
    
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

export default PerformanceMonitor;