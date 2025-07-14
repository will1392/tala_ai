/**
 * Metrics Collector for Tala AI LLM Services
 * 
 * Stores metrics in JSON files, calculates performance analytics,
 * identifies usage patterns, and exports data for analysis.
 */

import fs from 'fs/promises';
import path from 'path';

export class MetricsCollector {
  constructor(options = {}) {
    this.options = {
      enableLogging: options.enableLogging !== false,
      dataDirectory: options.dataDirectory || './data/metrics',
      autoSave: options.autoSave !== false,
      saveInterval: options.saveInterval || 5 * 60 * 1000, // 5 minutes
      maxFileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB
      retentionDays: options.retentionDays || 90,
      compressionEnabled: options.compressionEnabled !== false,
      ...options
    };

    // Data storage
    this.data = {
      metadata: {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      },
      metrics: [],
      aggregations: {
        hourly: new Map(),
        daily: new Map(),
        weekly: new Map(),
        monthly: new Map()
      },
      patterns: {
        queryTypes: new Map(),
        userBehavior: new Map(),
        modelPerformance: new Map(),
        costTrends: new Map()
      }
    };

    // File paths
    this.files = {
      main: path.join(this.options.dataDirectory, 'metrics.json'),
      backup: path.join(this.options.dataDirectory, 'metrics.backup.json'),
      aggregations: path.join(this.options.dataDirectory, 'aggregations.json'),
      patterns: path.join(this.options.dataDirectory, 'patterns.json'),
      exports: path.join(this.options.dataDirectory, 'exports')
    };

    // Auto-save timer
    this.saveTimer = null;
    this.isLoaded = false;

    this.initializeStorage();
  }

  /**
   * Initialize storage directory and load existing data
   */
  async initializeStorage() {
    try {
      // Create directory if it doesn't exist
      await fs.mkdir(this.options.dataDirectory, { recursive: true });
      await fs.mkdir(this.files.exports, { recursive: true });

      // Load existing data
      await this.loadData();

      // Start auto-save if enabled
      if (this.options.autoSave) {
        this.startAutoSave();
      }

      this.isLoaded = true;
      this.log('Metrics Collector initialized successfully');

    } catch (error) {
      this.log(`Failed to initialize storage: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Load existing metrics data from files
   */
  async loadData() {
    try {
      // Load main metrics file
      const mainData = await this.loadJsonFile(this.files.main);
      if (mainData) {
        this.data = { ...this.data, ...mainData };
        
        // Convert Maps from JSON objects
        this.data.aggregations.hourly = new Map(Object.entries(mainData.aggregations?.hourly || {}));
        this.data.aggregations.daily = new Map(Object.entries(mainData.aggregations?.daily || {}));
        this.data.aggregations.weekly = new Map(Object.entries(mainData.aggregations?.weekly || {}));
        this.data.aggregations.monthly = new Map(Object.entries(mainData.aggregations?.monthly || {}));
        
        this.data.patterns.queryTypes = new Map(Object.entries(mainData.patterns?.queryTypes || {}));
        this.data.patterns.userBehavior = new Map(Object.entries(mainData.patterns?.userBehavior || {}));
        this.data.patterns.modelPerformance = new Map(Object.entries(mainData.patterns?.modelPerformance || {}));
        this.data.patterns.costTrends = new Map(Object.entries(mainData.patterns?.costTrends || {}));
      }

      this.log(`Loaded ${this.data.metrics.length} existing metrics`);

    } catch (error) {
      this.log(`Error loading data: ${error.message}`, 'warn');
      // Continue with empty data if load fails
    }
  }

  /**
   * Load JSON file safely
   * @param {string} filepath - Path to JSON file
   * @returns {Object|null} Parsed data or null
   */
  async loadJsonFile(filepath) {
    try {
      const fileContent = await fs.readFile(filepath, 'utf8');
      return JSON.parse(fileContent);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.log(`Error reading ${filepath}: ${error.message}`, 'warn');
      }
      return null;
    }
  }

  /**
   * Store a new metrics record
   * @param {Object} metrics - Metrics data to store
   */
  async storeMetrics(metrics) {
    if (!this.isLoaded) {
      this.log('Metrics collector not ready, queueing metrics', 'warn');
      return;
    }

    try {
      // Add timestamp if not present
      const enrichedMetrics = {
        ...metrics,
        timestamp: metrics.timestamp || Date.now(),
        id: metrics.id || this.generateId()
      };

      // Store the metrics
      this.data.metrics.push(enrichedMetrics);
      this.data.metadata.lastUpdated = new Date().toISOString();

      // Update aggregations
      this.updateAggregations(enrichedMetrics);

      // Update patterns
      this.updatePatterns(enrichedMetrics);

      // Clean up old data
      this.cleanupOldData();

      this.log(`Stored metrics for ${enrichedMetrics.modelId} (${enrichedMetrics.queryType})`);

    } catch (error) {
      this.log(`Error storing metrics: ${error.message}`, 'error');
    }
  }

  /**
   * Update time-based aggregations
   * @param {Object} metrics - Metrics to aggregate
   */
  updateAggregations(metrics) {
    const timestamp = metrics.timestamp;
    
    // Hourly aggregations
    const hourKey = Math.floor(timestamp / (60 * 60 * 1000));
    this.updateAggregation(this.data.aggregations.hourly, hourKey, metrics, 'hour');

    // Daily aggregations
    const dayKey = Math.floor(timestamp / (24 * 60 * 60 * 1000));
    this.updateAggregation(this.data.aggregations.daily, dayKey, metrics, 'day');

    // Weekly aggregations (Monday-based weeks)
    const weekKey = Math.floor((timestamp - 345600000) / (7 * 24 * 60 * 60 * 1000)); // Adjust for Monday start
    this.updateAggregation(this.data.aggregations.weekly, weekKey, metrics, 'week');

    // Monthly aggregations
    const date = new Date(timestamp);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    this.updateAggregation(this.data.aggregations.monthly, monthKey, metrics, 'month');
  }

  /**
   * Update a specific aggregation
   * @param {Map} aggregationMap - Map to update
   * @param {string|number} key - Aggregation key
   * @param {Object} metrics - Metrics to aggregate
   * @param {string} period - Time period type
   */
  updateAggregation(aggregationMap, key, metrics, period) {
    if (!aggregationMap.has(key)) {
      aggregationMap.set(key, {
        period,
        key,
        timestamp: metrics.timestamp,
        requests: 0,
        successfulRequests: 0,
        totalResponseTime: 0,
        totalCost: 0,
        totalTokens: 0,
        models: new Set(),
        queryTypes: new Set(),
        users: new Set(),
        errors: {}
      });
    }

    const agg = aggregationMap.get(key);
    agg.requests++;
    
    if (metrics.success) {
      agg.successfulRequests++;
    } else if (metrics.errorType) {
      agg.errors[metrics.errorType] = (agg.errors[metrics.errorType] || 0) + 1;
    }

    agg.totalResponseTime += metrics.responseTime || 0;
    agg.totalCost += metrics.cost || 0;
    agg.totalTokens += metrics.tokensUsed || 0;
    
    if (metrics.modelId) agg.models.add(metrics.modelId);
    if (metrics.queryType) agg.queryTypes.add(metrics.queryType);
    if (metrics.userId) agg.users.add(metrics.userId);
  }

  /**
   * Update pattern analysis
   * @param {Object} metrics - Metrics to analyze
   */
  updatePatterns(metrics) {
    // Query type patterns
    this.updateQueryTypePatterns(metrics);
    
    // User behavior patterns
    this.updateUserBehaviorPatterns(metrics);
    
    // Model performance patterns
    this.updateModelPerformancePatterns(metrics);
    
    // Cost trend patterns
    this.updateCostTrendPatterns(metrics);
  }

  /**
   * Update query type patterns
   * @param {Object} metrics - Metrics data
   */
  updateQueryTypePatterns(metrics) {
    const queryType = metrics.queryType || 'unknown';
    
    if (!this.data.patterns.queryTypes.has(queryType)) {
      this.data.patterns.queryTypes.set(queryType, {
        queryType,
        totalQueries: 0,
        avgResponseTime: 0,
        avgCost: 0,
        avgTokens: 0,
        preferredModels: {},
        timeOfDayDistribution: Array(24).fill(0),
        dayOfWeekDistribution: Array(7).fill(0),
        successRate: 100
      });
    }

    const pattern = this.data.patterns.queryTypes.get(queryType);
    pattern.totalQueries++;
    
    // Update averages (running average)
    const alpha = 1 / pattern.totalQueries; // Simple running average
    pattern.avgResponseTime = pattern.avgResponseTime * (1 - alpha) + (metrics.responseTime || 0) * alpha;
    pattern.avgCost = pattern.avgCost * (1 - alpha) + (metrics.cost || 0) * alpha;
    pattern.avgTokens = pattern.avgTokens * (1 - alpha) + (metrics.tokensUsed || 0) * alpha;
    
    // Update model preferences
    if (metrics.modelId) {
      pattern.preferredModels[metrics.modelId] = (pattern.preferredModels[metrics.modelId] || 0) + 1;
    }
    
    // Update time distributions
    const date = new Date(metrics.timestamp);
    pattern.timeOfDayDistribution[date.getHours()]++;
    pattern.dayOfWeekDistribution[date.getDay()]++;
    
    // Update success rate
    const successCount = pattern.totalQueries * (pattern.successRate / 100);
    const newSuccessCount = successCount + (metrics.success ? 1 : 0);
    pattern.successRate = (newSuccessCount / pattern.totalQueries) * 100;
  }

  /**
   * Update user behavior patterns
   * @param {Object} metrics - Metrics data
   */
  updateUserBehaviorPatterns(metrics) {
    if (!metrics.userId) return;
    
    const userId = metrics.userId;
    
    if (!this.data.patterns.userBehavior.has(userId)) {
      this.data.patterns.userBehavior.set(userId, {
        userId,
        totalQueries: 0,
        avgSessionLength: 0,
        preferredQueryTypes: {},
        preferredModels: {},
        totalCost: 0,
        avgCostPerQuery: 0,
        lastActive: metrics.timestamp,
        firstSeen: metrics.timestamp,
        sessionsCount: 0
      });
    }

    const behavior = this.data.patterns.userBehavior.get(userId);
    behavior.totalQueries++;
    behavior.totalCost += metrics.cost || 0;
    behavior.avgCostPerQuery = behavior.totalCost / behavior.totalQueries;
    behavior.lastActive = metrics.timestamp;
    
    // Update preferences
    if (metrics.queryType) {
      behavior.preferredQueryTypes[metrics.queryType] = (behavior.preferredQueryTypes[metrics.queryType] || 0) + 1;
    }
    if (metrics.modelId) {
      behavior.preferredModels[metrics.modelId] = (behavior.preferredModels[metrics.modelId] || 0) + 1;
    }
  }

  /**
   * Update model performance patterns
   * @param {Object} metrics - Metrics data
   */
  updateModelPerformancePatterns(metrics) {
    const modelId = metrics.modelId;
    if (!modelId) return;
    
    if (!this.data.patterns.modelPerformance.has(modelId)) {
      this.data.patterns.modelPerformance.set(modelId, {
        modelId,
        totalQueries: 0,
        avgResponseTime: 0,
        avgCost: 0,
        successRate: 100,
        performanceTrend: [], // Last 10 performance points
        costEfficiency: 0, // Cost per successful query
        reliabilityScore: 100
      });
    }

    const performance = this.data.patterns.modelPerformance.get(modelId);
    performance.totalQueries++;
    
    // Update running averages
    const alpha = 1 / performance.totalQueries;
    performance.avgResponseTime = performance.avgResponseTime * (1 - alpha) + (metrics.responseTime || 0) * alpha;
    performance.avgCost = performance.avgCost * (1 - alpha) + (metrics.cost || 0) * alpha;
    
    // Update success rate
    const successCount = performance.totalQueries * (performance.successRate / 100);
    const newSuccessCount = successCount + (metrics.success ? 1 : 0);
    performance.successRate = (newSuccessCount / performance.totalQueries) * 100;
    
    // Update performance trend (keep last 10 points)
    performance.performanceTrend.push({
      timestamp: metrics.timestamp,
      responseTime: metrics.responseTime || 0,
      success: metrics.success
    });
    
    if (performance.performanceTrend.length > 10) {
      performance.performanceTrend.shift();
    }
    
    // Calculate cost efficiency
    if (performance.successRate > 0) {
      performance.costEfficiency = performance.avgCost / (performance.successRate / 100);
    }
  }

  /**
   * Update cost trend patterns
   * @param {Object} metrics - Metrics data
   */
  updateCostTrendPatterns(metrics) {
    const date = new Date(metrics.timestamp);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!this.data.patterns.costTrends.has(monthKey)) {
      this.data.patterns.costTrends.set(monthKey, {
        month: monthKey,
        totalCost: 0,
        queriesCount: 0,
        avgCostPerQuery: 0,
        costByModel: {},
        costByQueryType: {},
        projectedMonthlyCost: 0
      });
    }

    const trend = this.data.patterns.costTrends.get(monthKey);
    trend.totalCost += metrics.cost || 0;
    trend.queriesCount++;
    trend.avgCostPerQuery = trend.totalCost / trend.queriesCount;
    
    // Update cost by model and query type
    if (metrics.modelId) {
      trend.costByModel[metrics.modelId] = (trend.costByModel[metrics.modelId] || 0) + (metrics.cost || 0);
    }
    if (metrics.queryType) {
      trend.costByQueryType[metrics.queryType] = (trend.costByQueryType[metrics.queryType] || 0) + (metrics.cost || 0);
    }
    
    // Calculate projected monthly cost
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const dayOfMonth = date.getDate();
    trend.projectedMonthlyCost = (trend.totalCost / dayOfMonth) * daysInMonth;
  }

  /**
   * Calculate comprehensive analytics
   * @param {Object} options - Analysis options
   * @returns {Object} Analytics report
   */
  calculateAnalytics(options = {}) {
    const {
      timeRange = 30 * 24 * 60 * 60 * 1000, // 30 days
      includePatterns = true,
      includeAggregations = true
    } = options;

    const now = Date.now();
    const cutoff = now - timeRange;
    
    // Filter recent metrics
    const recentMetrics = this.data.metrics.filter(m => m.timestamp >= cutoff);
    
    const analytics = {
      summary: {
        totalMetrics: this.data.metrics.length,
        recentMetrics: recentMetrics.length,
        timeRange: { start: cutoff, end: now },
        dataQuality: this.calculateDataQuality(recentMetrics)
      },
      
      performance: {
        avgResponseTime: this.calculateAverage(recentMetrics, 'responseTime'),
        responseTimePercentiles: this.calculatePercentiles(recentMetrics, 'responseTime'),
        successRate: this.calculateSuccessRate(recentMetrics),
        errorDistribution: this.calculateErrorDistribution(recentMetrics)
      },
      
      costs: {
        totalCost: this.calculateSum(recentMetrics, 'cost'),
        avgCostPerQuery: this.calculateAverage(recentMetrics, 'cost'),
        costTrend: this.calculateTrend(recentMetrics, 'cost'),
        mostExpensiveModels: this.getMostExpensiveModels(recentMetrics)
      },
      
      usage: {
        totalTokens: this.calculateSum(recentMetrics, 'tokensUsed'),
        avgTokensPerQuery: this.calculateAverage(recentMetrics, 'tokensUsed'),
        queryTypeDistribution: this.calculateDistribution(recentMetrics, 'queryType'),
        modelUsageDistribution: this.calculateDistribution(recentMetrics, 'modelId')
      }
    };

    // Include patterns if requested
    if (includePatterns) {
      analytics.patterns = {
        queryTypes: Object.fromEntries(this.data.patterns.queryTypes),
        userBehavior: Object.fromEntries(this.data.patterns.userBehavior),
        modelPerformance: Object.fromEntries(this.data.patterns.modelPerformance),
        costTrends: Object.fromEntries(this.data.patterns.costTrends)
      };
    }

    // Include aggregations if requested
    if (includeAggregations) {
      analytics.aggregations = {
        hourly: Object.fromEntries(this.data.aggregations.hourly),
        daily: Object.fromEntries(this.data.aggregations.daily),
        weekly: Object.fromEntries(this.data.aggregations.weekly),
        monthly: Object.fromEntries(this.data.aggregations.monthly)
      };
    }

    return analytics;
  }

  /**
   * Export metrics data for analysis
   * @param {Object} options - Export options
   * @returns {Object} Export result
   */
  async exportData(options = {}) {
    const {
      format = 'json',
      timeRange = null,
      includeRawData = false
    } = options;

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      let data = {};
      
      if (timeRange) {
        const cutoff = Date.now() - timeRange;
        data.metrics = this.data.metrics.filter(m => m.timestamp >= cutoff);
      } else {
        data.metrics = this.data.metrics;
      }

      // Always include analytics
      data.analytics = this.calculateAnalytics({ timeRange, includePatterns: true });
      
      // Include raw data if requested
      if (includeRawData) {
        data.raw = {
          aggregations: Object.fromEntries(this.data.aggregations.daily),
          patterns: Object.fromEntries(this.data.patterns.queryTypes)
        };
      }

      // Export based on format
      let filename, content;
      
      if (format === 'csv') {
        filename = `metrics-export-${timestamp}.csv`;
        content = this.convertToCSV(data.metrics);
      } else {
        filename = `metrics-export-${timestamp}.json`;
        content = JSON.stringify(data, null, 2);
      }

      const filepath = path.join(this.files.exports, filename);
      await fs.writeFile(filepath, content, 'utf8');

      this.log(`Exported ${data.metrics.length} metrics to ${filename}`);

      return {
        success: true,
        filename,
        filepath,
        recordCount: data.metrics.length,
        format
      };

    } catch (error) {
      this.log(`Export failed: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Convert metrics to CSV format
   * @param {Array} metrics - Metrics array
   * @returns {string} CSV content
   */
  convertToCSV(metrics) {
    if (metrics.length === 0) return '';

    const headers = Object.keys(metrics[0]).join(',');
    const rows = metrics.map(metric => 
      Object.values(metric).map(value => 
        typeof value === 'string' ? `"${value}"` : value
      ).join(',')
    );

    return [headers, ...rows].join('\n');
  }

  /**
   * Save data to files
   */
  async saveData() {
    if (!this.isLoaded) return;

    try {
      // Prepare data for JSON serialization
      const saveData = {
        ...this.data,
        aggregations: {
          hourly: Object.fromEntries(this.data.aggregations.hourly),
          daily: Object.fromEntries(this.data.aggregations.daily),
          weekly: Object.fromEntries(this.data.aggregations.weekly),
          monthly: Object.fromEntries(this.data.aggregations.monthly)
        },
        patterns: {
          queryTypes: Object.fromEntries(this.data.patterns.queryTypes),
          userBehavior: Object.fromEntries(this.data.patterns.userBehavior),
          modelPerformance: Object.fromEntries(this.data.patterns.modelPerformance),
          costTrends: Object.fromEntries(this.data.patterns.costTrends)
        }
      };

      // Create backup of current file
      try {
        await fs.copyFile(this.files.main, this.files.backup);
      } catch (error) {
        // Backup file might not exist yet
      }

      // Save main data
      await fs.writeFile(this.files.main, JSON.stringify(saveData, null, 2), 'utf8');

      this.log(`Saved ${this.data.metrics.length} metrics to storage`);

    } catch (error) {
      this.log(`Error saving data: ${error.message}`, 'error');
    }
  }

  /**
   * Start auto-save timer
   */
  startAutoSave() {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
    }

    this.saveTimer = setInterval(() => {
      this.saveData();
    }, this.options.saveInterval);

    this.log(`Auto-save enabled (${this.options.saveInterval / 1000}s interval)`);
  }

  /**
   * Stop auto-save timer
   */
  stopAutoSave() {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
      this.log('Auto-save disabled');
    }
  }

  /**
   * Clean up old data based on retention policy
   */
  cleanupOldData() {
    const cutoff = Date.now() - (this.options.retentionDays * 24 * 60 * 60 * 1000);
    
    const originalLength = this.data.metrics.length;
    this.data.metrics = this.data.metrics.filter(m => m.timestamp >= cutoff);
    
    const removed = originalLength - this.data.metrics.length;
    if (removed > 0) {
      this.log(`Cleaned up ${removed} old metrics (retention: ${this.options.retentionDays} days)`);
    }
  }

  // Helper methods for analytics calculations
  calculateAverage(metrics, field) {
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, m) => acc + (m[field] || 0), 0);
    return sum / metrics.length;
  }

  calculateSum(metrics, field) {
    return metrics.reduce((acc, m) => acc + (m[field] || 0), 0);
  }

  calculateSuccessRate(metrics) {
    if (metrics.length === 0) return 100;
    const successful = metrics.filter(m => m.success).length;
    return (successful / metrics.length) * 100;
  }

  calculatePercentiles(metrics, field) {
    const values = metrics.map(m => m[field] || 0).sort((a, b) => a - b);
    const len = values.length;
    
    return {
      p50: len > 0 ? values[Math.floor(len * 0.5)] : 0,
      p90: len > 0 ? values[Math.floor(len * 0.9)] : 0,
      p95: len > 0 ? values[Math.floor(len * 0.95)] : 0,
      p99: len > 0 ? values[Math.floor(len * 0.99)] : 0
    };
  }

  calculateDistribution(metrics, field) {
    const distribution = {};
    metrics.forEach(m => {
      const value = m[field] || 'unknown';
      distribution[value] = (distribution[value] || 0) + 1;
    });
    return distribution;
  }

  calculateErrorDistribution(metrics) {
    const errors = {};
    metrics.filter(m => !m.success && m.errorType).forEach(m => {
      errors[m.errorType] = (errors[m.errorType] || 0) + 1;
    });
    return errors;
  }

  calculateTrend(metrics, field) {
    // Simple linear regression for trend
    const points = metrics.map((m, i) => ({ x: i, y: m[field] || 0 }));
    if (points.length < 2) return { slope: 0, direction: 'stable' };
    
    const n = points.length;
    const sumX = points.reduce((acc, p) => acc + p.x, 0);
    const sumY = points.reduce((acc, p) => acc + p.y, 0);
    const sumXY = points.reduce((acc, p) => acc + p.x * p.y, 0);
    const sumXX = points.reduce((acc, p) => acc + p.x * p.x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    return {
      slope,
      direction: slope > 0.01 ? 'increasing' : slope < -0.01 ? 'decreasing' : 'stable'
    };
  }

  getMostExpensiveModels(metrics) {
    const modelCosts = {};
    metrics.forEach(m => {
      if (m.modelId && m.cost) {
        modelCosts[m.modelId] = (modelCosts[m.modelId] || 0) + m.cost;
      }
    });
    
    return Object.entries(modelCosts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([model, cost]) => ({ model, cost }));
  }

  calculateDataQuality(metrics) {
    if (metrics.length === 0) return 100;
    
    const requiredFields = ['timestamp', 'modelId', 'responseTime', 'cost', 'success'];
    let totalFields = 0;
    let completeFields = 0;
    
    metrics.forEach(m => {
      requiredFields.forEach(field => {
        totalFields++;
        if (m[field] !== undefined && m[field] !== null) {
          completeFields++;
        }
      });
    });
    
    return totalFields > 0 ? (completeFields / totalFields) * 100 : 100;
  }

  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gracefully shutdown the collector
   */
  async shutdown() {
    this.stopAutoSave();
    await this.saveData();
    this.log('Metrics Collector shutdown completed');
  }

  /**
   * Log messages with timestamp
   * @param {string} message - Log message
   * @param {string} level - Log level
   */
  log(message, level = 'info') {
    if (!this.options.enableLogging) return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[MetricsCollector ${level.toUpperCase()}] ${timestamp}`;
    
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

export default MetricsCollector;