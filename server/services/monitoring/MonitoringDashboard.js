/**
 * Monitoring Dashboard API
 * 
 * Provides endpoints and real-time data for pipeline monitoring
 */

import express from 'express';
import { Server } from 'socket.io';
import PipelineMonitor from './PipelineMonitor.js';

class MonitoringDashboard {
  constructor(app, server, options = {}) {
    this.app = app;
    this.io = new Server(server);
    this.monitor = new PipelineMonitor(options);
    
    // Dashboard configuration
    this.config = {
      updateInterval: options.updateInterval || 5000, // 5 seconds
      metricsBuffer: options.metricsBuffer || 100,
      enableRealTime: options.enableRealTime !== false
    };
    
    // Real-time data buffers
    this.realtimeData = {
      processingMetrics: [],
      performanceMetrics: [],
      qualityMetrics: [],
      systemMetrics: [],
      alerts: []
    };
    
    // Initialize routes and WebSocket
    this.setupRoutes();
    this.setupWebSocket();
    this.startRealtimeUpdates();
  }

  /**
   * Setup Express routes for dashboard
   */
  setupRoutes() {
    const router = express.Router();
    
    // Get current metrics summary
    router.get('/metrics/summary', (req, res) => {
      const summary = this.monitor.getMetricsSummary();
      res.json(summary);
    });
    
    // Get historical metrics
    router.get('/metrics/history', (req, res) => {
      const { interval = 'hourly', limit = 24 } = req.query;
      const history = this.monitor.getHistoricalMetrics(interval, parseInt(limit));
      res.json(history);
    });
    
    // Get metrics by document type
    router.get('/metrics/by-type/:type', (req, res) => {
      const { type } = req.params;
      const metrics = this.getMetricsByType(type);
      res.json(metrics);
    });
    
    // Get stage performance metrics
    router.get('/metrics/stages', (req, res) => {
      const stages = this.monitor.metrics.performance.stageTimings;
      res.json(stages);
    });
    
    // Get API usage and costs
    router.get('/metrics/api', (req, res) => {
      const apiMetrics = {
        usage: this.monitor.metrics.api.calls,
        costs: this.monitor.metrics.api.costs,
        quotas: this.monitor.metrics.api.quotaUsage
      };
      res.json(apiMetrics);
    });
    
    // Get quality metrics
    router.get('/metrics/quality', (req, res) => {
      const quality = {
        average: this.monitor.getAverageQualityScore(),
        byType: this.monitor.metrics.quality.byDocumentType,
        distribution: this.getQualityDistribution(),
        trends: this.getQualityTrends()
      };
      res.json(quality);
    });
    
    // Get system metrics
    router.get('/metrics/system', (req, res) => {
      const system = this.monitor.metrics.system;
      res.json({
        memory: this.getLatestMetrics(system.memoryUsage, 20),
        cpu: this.getLatestMetrics(system.cpuUsage, 20),
        queue: this.getLatestMetrics(system.queueLength, 20),
        workers: this.getLatestMetrics(system.activeWorkers, 20)
      });
    });
    
    // Get active alerts
    router.get('/alerts', (req, res) => {
      const alerts = this.monitor.getActiveAlerts();
      res.json(alerts);
    });
    
    // Get performance report
    router.get('/report', (req, res) => {
      const { start, end } = req.query;
      const startDate = start ? new Date(start) : new Date(Date.now() - 86400000); // Default: last 24h
      const endDate = end ? new Date(end) : new Date();
      
      const report = this.monitor.generateReport(startDate, endDate);
      res.json(report);
    });
    
    // Export metrics
    router.post('/export', async (req, res) => {
      try {
        const { format = 'json' } = req.body;
        const filepath = await this.monitor.exportMetrics(format);
        res.json({ success: true, filepath });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Get realtime data buffer
    router.get('/realtime/:metric', (req, res) => {
      const { metric } = req.params;
      const data = this.realtimeData[metric] || [];
      res.json(data);
    });
    
    // Mount routes
    this.app.use('/api/monitoring', router);
  }

  /**
   * Setup WebSocket for real-time updates
   */
  setupWebSocket() {
    const monitorNamespace = this.io.of('/monitor');
    
    monitorNamespace.on('connection', (socket) => {
      console.log('Monitoring dashboard connected');
      
      // Send initial data
      socket.emit('initial-data', {
        summary: this.monitor.getMetricsSummary(),
        realtime: this.realtimeData
      });
      
      // Handle client requests
      socket.on('get-metrics', (type) => {
        const metrics = this.getSpecificMetrics(type);
        socket.emit('metrics-update', { type, data: metrics });
      });
      
      socket.on('set-update-interval', (interval) => {
        if (interval >= 1000 && interval <= 60000) {
          this.config.updateInterval = interval;
        }
      });
      
      socket.on('disconnect', () => {
        console.log('Monitoring dashboard disconnected');
      });
    });
    
    // Forward monitor events to WebSocket
    this.monitor.on('processing:start', (data) => {
      this.updateRealtimeBuffer('processingMetrics', data);
      monitorNamespace.emit('processing:start', data);
    });
    
    this.monitor.on('stage:complete', (data) => {
      monitorNamespace.emit('stage:complete', data);
    });
    
    this.monitor.on('processing:complete', (data) => {
      this.updateRealtimeBuffer('processingMetrics', data);
      monitorNamespace.emit('processing:complete', data);
    });
    
    this.monitor.on('alert:quality', (data) => {
      this.updateRealtimeBuffer('alerts', { ...data, type: 'quality', timestamp: Date.now() });
      monitorNamespace.emit('alert', { type: 'quality', data });
    });
    
    this.monitor.on('alert:errorRate', (data) => {
      this.updateRealtimeBuffer('alerts', { ...data, type: 'errorRate', timestamp: Date.now() });
      monitorNamespace.emit('alert', { type: 'errorRate', data });
    });
    
    this.monitor.on('alert:processingTime', (data) => {
      this.updateRealtimeBuffer('alerts', { ...data, type: 'processingTime', timestamp: Date.now() });
      monitorNamespace.emit('alert', { type: 'processingTime', data });
    });
    
    this.monitor.on('alert:costs', (data) => {
      this.updateRealtimeBuffer('alerts', { ...data, type: 'costs', timestamp: Date.now() });
      monitorNamespace.emit('alert', { type: 'costs', data });
    });
  }

  /**
   * Start real-time updates
   */
  startRealtimeUpdates() {
    if (!this.config.enableRealTime) return;
    
    setInterval(() => {
      // Update performance metrics
      const perfData = {
        timestamp: Date.now(),
        avgProcessingTime: this.monitor.getAverageProcessingTime(),
        throughput: this.monitor.metrics.performance.throughput[this.monitor.metrics.performance.throughput.length - 1]?.documentsPerHour || 0,
        queueLength: this.monitor.metrics.system.queueLength[this.monitor.metrics.system.queueLength.length - 1]?.value || 0
      };
      this.updateRealtimeBuffer('performanceMetrics', perfData);
      
      // Update quality metrics
      const qualityData = {
        timestamp: Date.now(),
        avgQuality: this.monitor.getAverageQualityScore(),
        lowQualityCount: this.monitor.metrics.quality.lowQualityCount
      };
      this.updateRealtimeBuffer('qualityMetrics', qualityData);
      
      // Emit summary update
      const summary = this.monitor.getMetricsSummary();
      this.io.of('/monitor').emit('summary-update', summary);
      
    }, this.config.updateInterval);
  }

  /**
   * Update real-time data buffer
   * @param {string} metric - Metric type
   * @param {Object} data - Data to add
   */
  updateRealtimeBuffer(metric, data) {
    if (!this.realtimeData[metric]) {
      this.realtimeData[metric] = [];
    }
    
    this.realtimeData[metric].push(data);
    
    // Maintain buffer size
    if (this.realtimeData[metric].length > this.config.metricsBuffer) {
      this.realtimeData[metric].shift();
    }
  }

  /**
   * Get metrics by document type
   * @param {string} type - Document type
   * @returns {Object} Type-specific metrics
   */
  getMetricsByType(type) {
    const processing = this.monitor.metrics.processing.byDocumentType[type] || {};
    const quality = this.monitor.metrics.quality.byDocumentType[type] || {};
    
    // Get recent processing times for this type
    const recentProcessing = this.monitor.metrics.performance.processingTimes
      .filter(p => p.documentType === type)
      .slice(-50);
    
    return {
      documentType: type,
      processing: {
        ...processing,
        recentTimes: recentProcessing.map(p => ({
          duration: p.duration,
          timestamp: p.timestamp
        }))
      },
      quality,
      costEstimate: this.estimateCostByType(type)
    };
  }

  /**
   * Get quality score distribution
   * @returns {Object} Quality distribution
   */
  getQualityDistribution() {
    const scores = this.monitor.metrics.quality.scores;
    const distribution = {
      excellent: 0, // 9-10
      good: 0,      // 7-8.9
      fair: 0,      // 5-6.9
      poor: 0       // <5
    };
    
    scores.forEach(({ score }) => {
      if (score >= 9) distribution.excellent++;
      else if (score >= 7) distribution.good++;
      else if (score >= 5) distribution.fair++;
      else distribution.poor++;
    });
    
    return distribution;
  }

  /**
   * Get quality trends over time
   * @returns {Array} Quality trends
   */
  getQualityTrends() {
    const hourlyTrends = [];
    const now = Date.now();
    
    // Calculate hourly averages for last 24 hours
    for (let i = 23; i >= 0; i--) {
      const hourStart = now - (i + 1) * 3600000;
      const hourEnd = now - i * 3600000;
      
      const hourScores = this.monitor.metrics.quality.scores.filter(
        q => q.timestamp >= hourStart && q.timestamp < hourEnd
      );
      
      if (hourScores.length > 0) {
        const avgScore = hourScores.reduce((sum, q) => sum + q.score, 0) / hourScores.length;
        hourlyTrends.push({
          hour: new Date(hourEnd).toISOString(),
          avgScore,
          count: hourScores.length
        });
      }
    }
    
    return hourlyTrends;
  }

  /**
   * Get latest metrics from array
   * @param {Array} metrics - Metrics array
   * @param {number} count - Number of items
   * @returns {Array} Latest metrics
   */
  getLatestMetrics(metrics, count) {
    return metrics.slice(-count).map(m => ({
      value: m.value,
      timestamp: new Date(m.timestamp).toISOString()
    }));
  }

  /**
   * Get specific metrics by type
   * @param {string} type - Metric type
   * @returns {Object} Specific metrics
   */
  getSpecificMetrics(type) {
    switch (type) {
      case 'processing':
        return {
          current: this.monitor.metrics.processing,
          trends: this.getProcessingTrends()
        };
      
      case 'performance':
        return {
          stages: this.monitor.metrics.performance.stageTimings,
          trends: this.getPerformanceTrends()
        };
      
      case 'quality':
        return {
          current: this.monitor.metrics.quality,
          distribution: this.getQualityDistribution(),
          trends: this.getQualityTrends()
        };
      
      case 'costs':
        return {
          current: this.monitor.metrics.api.costs,
          projection: this.projectMonthlyCosts(),
          breakdown: this.getCostBreakdown()
        };
      
      default:
        return null;
    }
  }

  /**
   * Get processing trends
   * @returns {Object} Processing trends
   */
  getProcessingTrends() {
    const hourly = [];
    const now = Date.now();
    
    for (let i = 23; i >= 0; i--) {
      const hourStart = now - (i + 1) * 3600000;
      const hourEnd = now - i * 3600000;
      
      const hourProcessing = this.monitor.metrics.performance.processingTimes.filter(
        p => p.timestamp >= hourStart && p.timestamp < hourEnd
      );
      
      hourly.push({
        hour: new Date(hourEnd).toISOString(),
        count: hourProcessing.length,
        avgTime: hourProcessing.length > 0
          ? hourProcessing.reduce((sum, p) => sum + p.duration, 0) / hourProcessing.length
          : 0
      });
    }
    
    return { hourly };
  }

  /**
   * Get performance trends by stage
   * @returns {Object} Performance trends
   */
  getPerformanceTrends() {
    const stages = {};
    
    Object.entries(this.monitor.metrics.performance.stageTimings).forEach(([stage, metrics]) => {
      stages[stage] = {
        avgTime: metrics.avgTime,
        successRate: metrics.count > 0 ? ((metrics.count - metrics.failures) / metrics.count) * 100 : 100,
        trend: this.calculateTrend(metrics)
      };
    });
    
    return stages;
  }

  /**
   * Calculate performance trend
   * @param {Object} metrics - Stage metrics
   * @returns {string} Trend direction
   */
  calculateTrend(metrics) {
    // Simple trend based on min/max times
    if (metrics.count < 10) return 'insufficient_data';
    
    const range = metrics.maxTime - metrics.minTime;
    const avgRange = range / metrics.avgTime;
    
    if (avgRange < 0.2) return 'stable';
    if (metrics.avgTime > (metrics.minTime + metrics.maxTime) / 2) return 'degrading';
    return 'improving';
  }

  /**
   * Estimate cost by document type
   * @param {string} type - Document type
   * @returns {number} Estimated cost
   */
  estimateCostByType(type) {
    const processing = this.monitor.metrics.processing.byDocumentType[type];
    if (!processing || processing.total === 0) return 0;
    
    // Rough estimate based on typical operations per document type
    const costPerDoc = {
      passport: 0.0065, // Vision + OCR + possible translation
      ticket: 0.004,    // Vision + OCR
      hotel: 0.003,     // OCR mainly
      itinerary: 0.008, // Vision + OCR + translation likely
      other: 0.005      // Average
    };
    
    return processing.total * (costPerDoc[type] || costPerDoc.other);
  }

  /**
   * Project monthly costs based on current usage
   * @returns {Object} Cost projection
   */
  projectMonthlyCosts() {
    const dailyCost = this.monitor.getDailyCosts();
    const daysInMonth = 30;
    
    return {
      daily: dailyCost,
      projected: dailyCost * daysInMonth,
      breakdown: this.getCostBreakdown(),
      recommendations: this.getCostRecommendations(dailyCost * daysInMonth)
    };
  }

  /**
   * Get cost breakdown by service
   * @returns {Object} Cost breakdown
   */
  getCostBreakdown() {
    const costs = this.monitor.metrics.api.costs;
    const total = this.monitor.getTotalCosts();
    
    const breakdown = {};
    Object.entries(costs).forEach(([service, cost]) => {
      breakdown[service] = {
        total: cost.total,
        percentage: total > 0 ? (cost.total / total) * 100 : 0,
        daily: cost.today
      };
    });
    
    return breakdown;
  }

  /**
   * Get cost optimization recommendations
   * @param {number} projectedMonthly - Projected monthly cost
   * @returns {Array} Recommendations
   */
  getCostRecommendations(projectedMonthly) {
    const recommendations = [];
    
    if (projectedMonthly > 1000) {
      recommendations.push({
        priority: 'high',
        action: 'Consider implementing result caching to reduce API calls'
      });
    }
    
    const breakdown = this.getCostBreakdown();
    
    // Check which service is most expensive
    const mostExpensive = Object.entries(breakdown)
      .sort((a, b) => b[1].percentage - a[1].percentage)[0];
    
    if (mostExpensive && mostExpensive[1].percentage > 50) {
      recommendations.push({
        priority: 'medium',
        action: `${mostExpensive[0]} accounts for ${mostExpensive[1].percentage.toFixed(1)}% of costs. Consider optimizing usage.`
      });
    }
    
    return recommendations;
  }

  /**
   * Get monitoring dashboard status
   * @returns {Object} Dashboard status
   */
  getStatus() {
    return {
      connected: this.io.of('/monitor').sockets.size,
      updateInterval: this.config.updateInterval,
      bufferSize: this.config.metricsBuffer,
      realtimeEnabled: this.config.enableRealTime,
      metricsCount: {
        processing: this.monitor.metrics.processing.total,
        quality: this.monitor.metrics.quality.scores.length,
        system: this.monitor.metrics.system.memoryUsage.length
      }
    };
  }
}

export default MonitoringDashboard;