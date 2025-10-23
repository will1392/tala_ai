/**
 * Pipeline Monitoring System
 * 
 * Tracks processing metrics, success rates, API usage, costs, and quality scores
 */

import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';

class PipelineMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      metricsRetentionDays: options.metricsRetentionDays || 30,
      aggregationIntervals: options.aggregationIntervals || ['1h', '24h', '7d', '30d'],
      alertThresholds: {
        errorRate: options.errorRateThreshold || 0.1, // 10%
        avgProcessingTime: options.processingTimeThreshold || 10000, // 10 seconds
        apiCostDaily: options.dailyCostThreshold || 100, // $100
        qualityScore: options.qualityThreshold || 6 // min acceptable quality
      },
      exportPath: options.exportPath || './metrics/exports'
    };
    
    // Real-time metrics
    this.metrics = {
      processing: {
        total: 0,
        succeeded: 0,
        failed: 0,
        inProgress: 0,
        byDocumentType: {},
        byStage: {}
      },
      performance: {
        processingTimes: [],
        stageTimings: {},
        queueWaitTimes: [],
        throughput: []
      },
      quality: {
        scores: [],
        byDocumentType: {},
        lowQualityCount: 0
      },
      api: {
        calls: {},
        costs: {},
        quotaUsage: {},
        errors: {}
      },
      system: {
        memoryUsage: [],
        cpuUsage: [],
        queueLength: [],
        activeWorkers: []
      }
    };
    
    // Historical data storage
    this.history = {
      hourly: [],
      daily: [],
      weekly: [],
      monthly: []
    };
    
    // Cost tracking
    this.costModel = {
      vision: {
        perRequest: 0.0025,
        freeQuota: 1000,
        used: 0
      },
      translation: {
        perCharacter: 0.00002,
        freeQuota: 500000,
        used: 0
      },
      ocr: {
        perPage: 0.0015,
        freeQuota: 1000,
        used: 0
      },
      storage: {
        perGB: 0.023,
        used: 0
      }
    };
    
    // Start periodic aggregation
    this.startAggregation();
  }

  /**
   * Record document processing start
   * @param {Object} document - Document being processed
   * @param {string} processingId - Processing job ID
   */
  recordProcessingStart(document, processingId) {
    const timestamp = Date.now();
    
    this.metrics.processing.total++;
    this.metrics.processing.inProgress++;
    
    const docType = document.document_type || 'unknown';
    if (!this.metrics.processing.byDocumentType[docType]) {
      this.metrics.processing.byDocumentType[docType] = {
        total: 0,
        succeeded: 0,
        failed: 0,
        avgTime: 0
      };
    }
    this.metrics.processing.byDocumentType[docType].total++;
    
    // Store start time for duration calculation
    this.activeProcessing = this.activeProcessing || {};
    this.activeProcessing[processingId] = {
      startTime: timestamp,
      documentType: docType,
      stageTimings: {}
    };
    
    this.emit('processing:start', {
      processingId,
      documentType: docType,
      timestamp
    });
  }

  /**
   * Record processing stage completion
   * @param {string} processingId - Processing job ID
   * @param {string} stage - Stage name
   * @param {Object} result - Stage result
   */
  recordStageComplete(processingId, stage, result) {
    const timestamp = Date.now();
    const processing = this.activeProcessing[processingId];
    
    if (!processing) return;
    
    // Calculate stage duration
    const stageStart = processing.lastStageEnd || processing.startTime;
    const duration = timestamp - stageStart;
    
    processing.stageTimings[stage] = {
      duration,
      success: result.success !== false,
      timestamp
    };
    processing.lastStageEnd = timestamp;
    
    // Update stage metrics
    if (!this.metrics.performance.stageTimings[stage]) {
      this.metrics.performance.stageTimings[stage] = {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        minTime: Infinity,
        maxTime: 0,
        failures: 0
      };
    }
    
    const stageMetrics = this.metrics.performance.stageTimings[stage];
    stageMetrics.count++;
    stageMetrics.totalTime += duration;
    stageMetrics.avgTime = stageMetrics.totalTime / stageMetrics.count;
    stageMetrics.minTime = Math.min(stageMetrics.minTime, duration);
    stageMetrics.maxTime = Math.max(stageMetrics.maxTime, duration);
    
    if (!result.success) {
      stageMetrics.failures++;
    }
    
    // Track API usage and costs
    this.trackAPIUsage(stage, result);
    
    this.emit('stage:complete', {
      processingId,
      stage,
      duration,
      success: result.success !== false,
      timestamp
    });
  }

  /**
   * Record document processing completion
   * @param {string} processingId - Processing job ID
   * @param {Object} result - Processing result
   */
  recordProcessingComplete(processingId, result) {
    const timestamp = Date.now();
    const processing = this.activeProcessing[processingId];
    
    if (!processing) return;
    
    const totalDuration = timestamp - processing.startTime;
    
    this.metrics.processing.inProgress--;
    
    if (result.success) {
      this.metrics.processing.succeeded++;
      this.metrics.processing.byDocumentType[processing.documentType].succeeded++;
    } else {
      this.metrics.processing.failed++;
      this.metrics.processing.byDocumentType[processing.documentType].failed++;
    }
    
    // Record processing time
    this.metrics.performance.processingTimes.push({
      duration: totalDuration,
      documentType: processing.documentType,
      timestamp
    });
    
    // Update document type average time
    const docTypeMetrics = this.metrics.processing.byDocumentType[processing.documentType];
    const successCount = docTypeMetrics.succeeded;
    if (successCount > 0) {
      docTypeMetrics.avgTime = (docTypeMetrics.avgTime * (successCount - 1) + totalDuration) / successCount;
    }
    
    // Record quality score
    if (result.quality) {
      this.recordQualityScore(processing.documentType, result.quality);
    }
    
    // Calculate throughput
    this.updateThroughput();
    
    // Check for alerts
    this.checkAlerts();
    
    // Clean up
    delete this.activeProcessing[processingId];
    
    this.emit('processing:complete', {
      processingId,
      documentType: processing.documentType,
      duration: totalDuration,
      success: result.success,
      timestamp
    });
  }

  /**
   * Track API usage and costs
   * @param {string} stage - Processing stage
   * @param {Object} result - Stage result
   */
  trackAPIUsage(stage, result) {
    const apiMap = {
      visual_analysis: 'vision',
      ocr: 'ocr',
      translation: 'translation'
    };
    
    const api = apiMap[stage];
    if (!api) return;
    
    // Initialize API metrics
    if (!this.metrics.api.calls[api]) {
      this.metrics.api.calls[api] = { total: 0, failed: 0, today: 0 };
      this.metrics.api.costs[api] = { total: 0, today: 0 };
    }
    
    // Track calls
    this.metrics.api.calls[api].total++;
    this.metrics.api.calls[api].today++;
    
    if (!result.success) {
      this.metrics.api.calls[api].failed++;
    }
    
    // Calculate costs
    let cost = 0;
    const model = this.costModel[api];
    
    if (api === 'vision') {
      model.used++;
      if (model.used > model.freeQuota) {
        cost = model.perRequest;
      }
    } else if (api === 'translation' && result.characterCount) {
      model.used += result.characterCount;
      if (model.used > model.freeQuota) {
        cost = (result.characterCount * model.perCharacter);
      }
    } else if (api === 'ocr' && result.pageCount) {
      model.used += result.pageCount;
      if (model.used > model.freeQuota) {
        cost = (result.pageCount * model.perPage);
      }
    }
    
    this.metrics.api.costs[api].total += cost;
    this.metrics.api.costs[api].today += cost;
    
    // Update quota usage
    this.metrics.api.quotaUsage[api] = {
      used: model.used,
      quota: model.freeQuota,
      percentage: (model.used / model.freeQuota) * 100
    };
  }

  /**
   * Record quality score
   * @param {string} documentType - Document type
   * @param {number} score - Quality score (0-10)
   */
  recordQualityScore(documentType, score) {
    this.metrics.quality.scores.push({
      score,
      documentType,
      timestamp: Date.now()
    });
    
    if (!this.metrics.quality.byDocumentType[documentType]) {
      this.metrics.quality.byDocumentType[documentType] = {
        count: 0,
        total: 0,
        average: 0,
        min: 10,
        max: 0
      };
    }
    
    const typeQuality = this.metrics.quality.byDocumentType[documentType];
    typeQuality.count++;
    typeQuality.total += score;
    typeQuality.average = typeQuality.total / typeQuality.count;
    typeQuality.min = Math.min(typeQuality.min, score);
    typeQuality.max = Math.max(typeQuality.max, score);
    
    if (score < this.config.alertThresholds.qualityScore) {
      this.metrics.quality.lowQualityCount++;
      this.emit('alert:quality', {
        documentType,
        score,
        threshold: this.config.alertThresholds.qualityScore
      });
    }
  }

  /**
   * Update throughput metrics
   */
  updateThroughput() {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    
    // Calculate documents processed in last hour
    const recentProcessing = this.metrics.performance.processingTimes.filter(
      p => p.timestamp > oneHourAgo
    ).length;
    
    this.metrics.performance.throughput.push({
      documentsPerHour: recentProcessing,
      timestamp: now
    });
    
    // Keep only recent throughput data
    this.metrics.performance.throughput = this.metrics.performance.throughput.filter(
      t => t.timestamp > oneHourAgo
    );
  }

  /**
   * Record system metrics
   * @param {Object} systemStats - System statistics
   */
  recordSystemMetrics(systemStats) {
    const timestamp = Date.now();
    
    this.metrics.system.memoryUsage.push({
      value: systemStats.memoryUsage,
      timestamp
    });
    
    this.metrics.system.cpuUsage.push({
      value: systemStats.cpuUsage,
      timestamp
    });
    
    this.metrics.system.queueLength.push({
      value: systemStats.queueLength,
      timestamp
    });
    
    this.metrics.system.activeWorkers.push({
      value: systemStats.activeWorkers,
      timestamp
    });
    
    // Keep only recent data (last hour)
    const oneHourAgo = timestamp - 3600000;
    ['memoryUsage', 'cpuUsage', 'queueLength', 'activeWorkers'].forEach(metric => {
      this.metrics.system[metric] = this.metrics.system[metric].filter(
        m => m.timestamp > oneHourAgo
      );
    });
  }

  /**
   * Check alert thresholds
   */
  checkAlerts() {
    // Check error rate
    const errorRate = this.getErrorRate();
    if (errorRate > this.config.alertThresholds.errorRate) {
      this.emit('alert:errorRate', {
        current: errorRate,
        threshold: this.config.alertThresholds.errorRate
      });
    }
    
    // Check average processing time
    const avgProcessingTime = this.getAverageProcessingTime();
    if (avgProcessingTime > this.config.alertThresholds.avgProcessingTime) {
      this.emit('alert:processingTime', {
        current: avgProcessingTime,
        threshold: this.config.alertThresholds.avgProcessingTime
      });
    }
    
    // Check daily API costs
    const dailyCosts = this.getDailyCosts();
    if (dailyCosts > this.config.alertThresholds.apiCostDaily) {
      this.emit('alert:costs', {
        current: dailyCosts,
        threshold: this.config.alertThresholds.apiCostDaily
      });
    }
  }

  /**
   * Get current error rate
   * @returns {number} Error rate (0-1)
   */
  getErrorRate() {
    const total = this.metrics.processing.succeeded + this.metrics.processing.failed;
    return total > 0 ? this.metrics.processing.failed / total : 0;
  }

  /**
   * Get average processing time
   * @returns {number} Average time in milliseconds
   */
  getAverageProcessingTime() {
    const recent = this.metrics.performance.processingTimes.slice(-100);
    if (recent.length === 0) return 0;
    
    const totalTime = recent.reduce((sum, p) => sum + p.duration, 0);
    return totalTime / recent.length;
  }

  /**
   * Get total daily costs
   * @returns {number} Total cost for today
   */
  getDailyCosts() {
    return Object.values(this.metrics.api.costs).reduce(
      (total, api) => total + (api.today || 0), 
      0
    );
  }

  /**
   * Get comprehensive metrics summary
   * @returns {Object} Metrics summary
   */
  getMetricsSummary() {
    return {
      processing: {
        total: this.metrics.processing.total,
        succeeded: this.metrics.processing.succeeded,
        failed: this.metrics.processing.failed,
        inProgress: this.metrics.processing.inProgress,
        successRate: this.metrics.processing.total > 0 
          ? (this.metrics.processing.succeeded / this.metrics.processing.total) * 100 
          : 0,
        errorRate: this.getErrorRate() * 100,
        byDocumentType: this.metrics.processing.byDocumentType
      },
      performance: {
        averageProcessingTime: this.getAverageProcessingTime(),
        currentThroughput: this.metrics.performance.throughput[this.metrics.performance.throughput.length - 1]?.documentsPerHour || 0,
        stagePerformance: this.metrics.performance.stageTimings,
        processingTrend: this.getProcessingTrend()
      },
      quality: {
        averageScore: this.getAverageQualityScore(),
        byDocumentType: this.metrics.quality.byDocumentType,
        lowQualityCount: this.metrics.quality.lowQualityCount,
        qualityTrend: this.getQualityTrend()
      },
      api: {
        usage: this.metrics.api.calls,
        costs: {
          today: this.getDailyCosts(),
          total: this.getTotalCosts(),
          byService: this.metrics.api.costs
        },
        quotaUsage: this.metrics.api.quotaUsage
      },
      system: {
        currentMemoryUsage: this.metrics.system.memoryUsage[this.metrics.system.memoryUsage.length - 1]?.value || 0,
        currentCPUUsage: this.metrics.system.cpuUsage[this.metrics.system.cpuUsage.length - 1]?.value || 0,
        currentQueueLength: this.metrics.system.queueLength[this.metrics.system.queueLength.length - 1]?.value || 0,
        activeWorkers: this.metrics.system.activeWorkers[this.metrics.system.activeWorkers.length - 1]?.value || 0
      },
      alerts: this.getActiveAlerts()
    };
  }

  /**
   * Get average quality score
   * @returns {number} Average quality score
   */
  getAverageQualityScore() {
    const recent = this.metrics.quality.scores.slice(-100);
    if (recent.length === 0) return 0;
    
    const total = recent.reduce((sum, q) => sum + q.score, 0);
    return total / recent.length;
  }

  /**
   * Get total costs across all services
   * @returns {number} Total costs
   */
  getTotalCosts() {
    return Object.values(this.metrics.api.costs).reduce(
      (total, api) => total + (api.total || 0), 
      0
    );
  }

  /**
   * Get processing time trend
   * @returns {string} Trend direction
   */
  getProcessingTrend() {
    const times = this.metrics.performance.processingTimes.slice(-20);
    if (times.length < 10) return 'insufficient_data';
    
    const firstHalf = times.slice(0, 10).reduce((sum, p) => sum + p.duration, 0) / 10;
    const secondHalf = times.slice(10).reduce((sum, p) => sum + p.duration, 0) / 10;
    
    if (secondHalf < firstHalf * 0.9) return 'improving';
    if (secondHalf > firstHalf * 1.1) return 'degrading';
    return 'stable';
  }

  /**
   * Get quality score trend
   * @returns {string} Trend direction
   */
  getQualityTrend() {
    const scores = this.metrics.quality.scores.slice(-20);
    if (scores.length < 10) return 'insufficient_data';
    
    const firstHalf = scores.slice(0, 10).reduce((sum, q) => sum + q.score, 0) / 10;
    const secondHalf = scores.slice(10).reduce((sum, q) => sum + q.score, 0) / 10;
    
    if (secondHalf > firstHalf * 1.05) return 'improving';
    if (secondHalf < firstHalf * 0.95) return 'degrading';
    return 'stable';
  }

  /**
   * Get active alerts
   * @returns {Array} Active alerts
   */
  getActiveAlerts() {
    const alerts = [];
    
    if (this.getErrorRate() > this.config.alertThresholds.errorRate) {
      alerts.push({
        type: 'error_rate',
        severity: 'high',
        message: `Error rate (${(this.getErrorRate() * 100).toFixed(1)}%) exceeds threshold`
      });
    }
    
    if (this.getAverageProcessingTime() > this.config.alertThresholds.avgProcessingTime) {
      alerts.push({
        type: 'processing_time',
        severity: 'medium',
        message: `Average processing time (${(this.getAverageProcessingTime() / 1000).toFixed(1)}s) exceeds threshold`
      });
    }
    
    if (this.getDailyCosts() > this.config.alertThresholds.apiCostDaily) {
      alerts.push({
        type: 'daily_cost',
        severity: 'high',
        message: `Daily API costs ($${this.getDailyCosts().toFixed(2)}) exceed threshold`
      });
    }
    
    return alerts;
  }

  /**
   * Export metrics to file
   * @param {string} format - Export format (json, csv)
   * @returns {string} Export file path
   */
  async exportMetrics(format = 'json') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `pipeline-metrics-${timestamp}.${format}`;
    const filepath = path.join(this.config.exportPath, filename);
    
    // Ensure export directory exists
    await fs.mkdir(this.config.exportPath, { recursive: true });
    
    const summary = this.getMetricsSummary();
    
    if (format === 'json') {
      await fs.writeFile(filepath, JSON.stringify(summary, null, 2));
    } else if (format === 'csv') {
      const csv = this.convertToCSV(summary);
      await fs.writeFile(filepath, csv);
    }
    
    return filepath;
  }

  /**
   * Convert metrics to CSV format
   * @param {Object} metrics - Metrics object
   * @returns {string} CSV content
   */
  convertToCSV(metrics) {
    const rows = [];
    
    // Processing metrics
    rows.push(['Metric', 'Value']);
    rows.push(['Total Documents', metrics.processing.total]);
    rows.push(['Succeeded', metrics.processing.succeeded]);
    rows.push(['Failed', metrics.processing.failed]);
    rows.push(['Success Rate', `${metrics.processing.successRate.toFixed(2)}%`]);
    rows.push(['Error Rate', `${metrics.processing.errorRate.toFixed(2)}%`]);
    rows.push(['Average Processing Time', `${(metrics.performance.averageProcessingTime / 1000).toFixed(2)}s`]);
    rows.push(['Current Throughput', `${metrics.performance.currentThroughput} docs/hour`]);
    rows.push(['Average Quality Score', metrics.quality.averageScore.toFixed(2)]);
    rows.push(['Today\'s Cost', `$${metrics.api.costs.today.toFixed(2)}`]);
    rows.push(['Total Cost', `$${metrics.api.costs.total.toFixed(2)}`]);
    
    // Document type breakdown
    rows.push(['']);
    rows.push(['Document Type', 'Total', 'Succeeded', 'Failed', 'Avg Time (s)']);
    for (const [type, stats] of Object.entries(metrics.processing.byDocumentType)) {
      rows.push([
        type,
        stats.total,
        stats.succeeded,
        stats.failed,
        (stats.avgTime / 1000).toFixed(2)
      ]);
    }
    
    return rows.map(row => row.join(',')).join('\n');
  }

  /**
   * Start periodic metrics aggregation
   */
  startAggregation() {
    // Hourly aggregation
    setInterval(() => {
      this.aggregateMetrics('hourly');
    }, 3600000); // 1 hour
    
    // Daily aggregation
    setInterval(() => {
      this.aggregateMetrics('daily');
      this.resetDailyMetrics();
    }, 86400000); // 24 hours
  }

  /**
   * Aggregate metrics for historical storage
   * @param {string} interval - Aggregation interval
   */
  aggregateMetrics(interval) {
    const snapshot = {
      timestamp: Date.now(),
      interval,
      metrics: this.getMetricsSummary()
    };
    
    this.history[interval].push(snapshot);
    
    // Maintain retention policy
    const retentionMs = this.config.metricsRetentionDays * 86400000;
    const cutoff = Date.now() - retentionMs;
    
    this.history[interval] = this.history[interval].filter(
      s => s.timestamp > cutoff
    );
    
    this.emit('metrics:aggregated', { interval, snapshot });
  }

  /**
   * Reset daily metrics
   */
  resetDailyMetrics() {
    // Reset daily API costs
    Object.values(this.metrics.api.costs).forEach(api => {
      api.today = 0;
    });
    
    // Reset daily API calls
    Object.values(this.metrics.api.calls).forEach(api => {
      api.today = 0;
    });
  }

  /**
   * Get historical metrics
   * @param {string} interval - Time interval
   * @param {number} limit - Number of records
   * @returns {Array} Historical metrics
   */
  getHistoricalMetrics(interval = 'hourly', limit = 24) {
    return this.history[interval].slice(-limit);
  }

  /**
   * Generate performance report
   * @param {Date} startDate - Report start date
   * @param {Date} endDate - Report end date
   * @returns {Object} Performance report
   */
  generateReport(startDate, endDate) {
    const start = startDate.getTime();
    const end = endDate.getTime();
    
    // Filter metrics within date range
    const processingInRange = this.metrics.performance.processingTimes.filter(
      p => p.timestamp >= start && p.timestamp <= end
    );
    
    const qualityInRange = this.metrics.quality.scores.filter(
      q => q.timestamp >= start && q.timestamp <= end
    );
    
    return {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days: Math.ceil((end - start) / 86400000)
      },
      summary: {
        totalDocuments: processingInRange.length,
        averageProcessingTime: processingInRange.reduce((sum, p) => sum + p.duration, 0) / processingInRange.length,
        averageQualityScore: qualityInRange.reduce((sum, q) => sum + q.score, 0) / qualityInRange.length
      },
      breakdown: this.getDetailedBreakdown(processingInRange, qualityInRange),
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Get detailed breakdown for report
   * @param {Array} processing - Processing records
   * @param {Array} quality - Quality records
   * @returns {Object} Detailed breakdown
   */
  getDetailedBreakdown(processing, quality) {
    const byType = {};
    
    processing.forEach(p => {
      if (!byType[p.documentType]) {
        byType[p.documentType] = {
          count: 0,
          totalTime: 0,
          qualities: []
        };
      }
      byType[p.documentType].count++;
      byType[p.documentType].totalTime += p.duration;
    });
    
    quality.forEach(q => {
      if (byType[q.documentType]) {
        byType[q.documentType].qualities.push(q.score);
      }
    });
    
    // Calculate averages
    Object.values(byType).forEach(type => {
      type.avgTime = type.totalTime / type.count;
      type.avgQuality = type.qualities.length > 0
        ? type.qualities.reduce((sum, q) => sum + q, 0) / type.qualities.length
        : 0;
    });
    
    return byType;
  }

  /**
   * Generate performance recommendations
   * @returns {Array} Recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    // Check error rate
    if (this.getErrorRate() > 0.05) {
      recommendations.push({
        type: 'error_rate',
        priority: 'high',
        message: 'High error rate detected. Consider reviewing failed documents and improving error handling.'
      });
    }
    
    // Check processing time
    const avgTime = this.getAverageProcessingTime();
    if (avgTime > 5000) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: 'Processing times are higher than optimal. Consider enabling caching or optimizing pipeline stages.'
      });
    }
    
    // Check quality scores
    const avgQuality = this.getAverageQualityScore();
    if (avgQuality < 7) {
      recommendations.push({
        type: 'quality',
        priority: 'medium',
        message: 'Quality scores are below target. Consider improving image preprocessing or OCR accuracy.'
      });
    }
    
    // Check API costs
    const dailyCost = this.getDailyCosts();
    if (dailyCost > this.config.alertThresholds.apiCostDaily * 0.8) {
      recommendations.push({
        type: 'cost',
        priority: 'high',
        message: 'API costs approaching daily limit. Consider implementing more aggressive caching or batching.'
      });
    }
    
    return recommendations;
  }
}

export default PipelineMonitor;