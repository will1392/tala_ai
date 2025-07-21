/**
 * Integration Monitoring and Analytics System
 * Tracks performance, health, and usage of all integrations
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

// Metric types
export const MetricType = {
    SYNC_STARTED: 'sync_started',
    SYNC_COMPLETED: 'sync_completed',
    SYNC_FAILED: 'sync_failed',
    ITEM_CREATED: 'item_created',
    ITEM_UPDATED: 'item_updated',
    ITEM_DELETED: 'item_deleted',
    CONFLICT_DETECTED: 'conflict_detected',
    CONFLICT_RESOLVED: 'conflict_resolved',
    API_CALL: 'api_call',
    API_ERROR: 'api_error',
    RATE_LIMIT: 'rate_limit'
};

// Health status levels
export const HealthStatus = {
    HEALTHY: 'healthy',
    WARNING: 'warning',
    CRITICAL: 'critical',
    UNKNOWN: 'unknown'
};

class IntegrationMonitoring extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            metricsRetention: 90 * 24 * 60 * 60 * 1000, // 90 days
            aggregationInterval: 5 * 60 * 1000, // 5 minutes
            healthCheckInterval: 60 * 1000, // 1 minute
            alertThresholds: {
                errorRate: 0.1, // 10% error rate
                syncDuration: 300000, // 5 minutes
                apiLatency: 5000, // 5 seconds
                conflictRate: 0.2 // 20% conflict rate
            },
            enableRealTimeMetrics: true,
            enableAlerting: true,
            ...options
        };
        
        this.db = options.db || null;
        this.logger = options.logger || console;
        
        // In-memory metrics buffer
        this.metricsBuffer = [];
        this.aggregatedMetrics = new Map();
        
        // Real-time dashboards
        this.dashboards = new Map();
        
        // Alert state
        this.activeAlerts = new Map();
        this.alertHistory = [];
        
        // Start monitoring
        this.startMonitoring();
    }
    
    /**
     * Record a metric
     */
    async recordMetric(metric) {
        const fullMetric = {
            id: uuidv4(),
            timestamp: new Date(),
            ...metric
        };
        
        // Add to buffer
        this.metricsBuffer.push(fullMetric);
        
        // Emit for real-time processing
        if (this.options.enableRealTimeMetrics) {
            this.emit('metric', fullMetric);
        }
        
        // Check for alerts
        if (this.options.enableAlerting) {
            await this.checkAlerts(fullMetric);
        }
        
        // Persist if buffer is large
        if (this.metricsBuffer.length >= 100) {
            await this.flushMetrics();
        }
        
        return fullMetric;
    }
    
    /**
     * Record sync operation
     */
    async recordSync(configId, operation, result) {
        const metrics = [];
        
        // Start metric
        if (operation === 'start') {
            metrics.push({
                type: MetricType.SYNC_STARTED,
                configId,
                integrationId: result.integrationId,
                syncType: result.syncType,
                direction: result.direction
            });
        }
        
        // Completion metric
        if (operation === 'complete') {
            metrics.push({
                type: MetricType.SYNC_COMPLETED,
                configId,
                integrationId: result.integrationId,
                duration: result.duration,
                itemsSynced: result.itemsSynced,
                created: result.created || 0,
                updated: result.updated || 0,
                deleted: result.deleted || 0,
                conflicts: result.conflicts || 0
            });
            
            // Item-level metrics
            if (result.created > 0) {
                metrics.push({
                    type: MetricType.ITEM_CREATED,
                    configId,
                    count: result.created
                });
            }
            
            if (result.updated > 0) {
                metrics.push({
                    type: MetricType.ITEM_UPDATED,
                    configId,
                    count: result.updated
                });
            }
            
            if (result.deleted > 0) {
                metrics.push({
                    type: MetricType.ITEM_DELETED,
                    configId,
                    count: result.deleted
                });
            }
            
            if (result.conflicts > 0) {
                metrics.push({
                    type: MetricType.CONFLICT_DETECTED,
                    configId,
                    count: result.conflicts
                });
            }
        }
        
        // Failure metric
        if (operation === 'fail') {
            metrics.push({
                type: MetricType.SYNC_FAILED,
                configId,
                integrationId: result.integrationId,
                error: result.error,
                errorType: result.errorType
            });
        }
        
        // Record all metrics
        for (const metric of metrics) {
            await this.recordMetric(metric);
        }
    }
    
    /**
     * Record API call
     */
    async recordApiCall(integrationId, operation, duration, success, error = null) {
        const metric = {
            type: success ? MetricType.API_CALL : MetricType.API_ERROR,
            integrationId,
            operation,
            duration,
            success
        };
        
        if (error) {
            metric.error = error.message;
            metric.errorType = error.code || 'unknown';
            
            // Check for rate limiting
            if (error.code === 429 || error.message.includes('rate limit')) {
                await this.recordMetric({
                    type: MetricType.RATE_LIMIT,
                    integrationId,
                    operation
                });
            }
        }
        
        await this.recordMetric(metric);
    }
    
    /**
     * Get integration health
     */
    async getIntegrationHealth(configId) {
        const now = new Date();
        const past24h = new Date(now - 24 * 60 * 60 * 1000);
        const past1h = new Date(now - 60 * 60 * 1000);
        
        // Get metrics from database
        const metrics = await this.getMetrics({
            configId,
            startTime: past24h,
            endTime: now
        });
        
        // Calculate health indicators
        const health = {
            configId,
            timestamp: now,
            status: HealthStatus.HEALTHY,
            indicators: {}
        };
        
        // Success rate
        const syncs = metrics.filter(m => 
            m.type === MetricType.SYNC_COMPLETED || 
            m.type === MetricType.SYNC_FAILED
        );
        
        const successCount = syncs.filter(m => m.type === MetricType.SYNC_COMPLETED).length;
        const totalSyncs = syncs.length;
        
        health.indicators.successRate = totalSyncs > 0 ? successCount / totalSyncs : 1;
        
        // Error rate (last hour)
        const recentMetrics = metrics.filter(m => m.timestamp > past1h);
        const errors = recentMetrics.filter(m => 
            m.type === MetricType.SYNC_FAILED || 
            m.type === MetricType.API_ERROR
        );
        
        health.indicators.errorRate = recentMetrics.length > 0 
            ? errors.length / recentMetrics.length 
            : 0;
        
        // Average sync duration
        const completedSyncs = metrics
            .filter(m => m.type === MetricType.SYNC_COMPLETED && m.duration)
            .map(m => m.duration);
        
        health.indicators.avgSyncDuration = completedSyncs.length > 0
            ? completedSyncs.reduce((a, b) => a + b, 0) / completedSyncs.length
            : 0;
        
        // Conflict rate
        const conflicts = metrics.filter(m => m.type === MetricType.CONFLICT_DETECTED);
        const items = metrics.filter(m => 
            m.type === MetricType.ITEM_CREATED || 
            m.type === MetricType.ITEM_UPDATED
        );
        
        const totalItems = items.reduce((sum, m) => sum + (m.count || 1), 0);
        const totalConflicts = conflicts.reduce((sum, m) => sum + (m.count || 1), 0);
        
        health.indicators.conflictRate = totalItems > 0 
            ? totalConflicts / totalItems 
            : 0;
        
        // API performance
        const apiCalls = metrics.filter(m => m.type === MetricType.API_CALL);
        if (apiCalls.length > 0) {
            const durations = apiCalls.map(m => m.duration || 0);
            health.indicators.avgApiLatency = 
                durations.reduce((a, b) => a + b, 0) / durations.length;
        }
        
        // Determine overall health status
        if (health.indicators.errorRate > this.options.alertThresholds.errorRate) {
            health.status = HealthStatus.CRITICAL;
            health.issues = health.issues || [];
            health.issues.push(`High error rate: ${(health.indicators.errorRate * 100).toFixed(1)}%`);
        }
        
        if (health.indicators.avgSyncDuration > this.options.alertThresholds.syncDuration) {
            health.status = health.status === HealthStatus.CRITICAL 
                ? HealthStatus.CRITICAL 
                : HealthStatus.WARNING;
            health.issues = health.issues || [];
            health.issues.push(`Slow sync performance: ${Math.round(health.indicators.avgSyncDuration / 1000)}s average`);
        }
        
        if (health.indicators.conflictRate > this.options.alertThresholds.conflictRate) {
            health.status = health.status === HealthStatus.CRITICAL 
                ? HealthStatus.CRITICAL 
                : HealthStatus.WARNING;
            health.issues = health.issues || [];
            health.issues.push(`High conflict rate: ${(health.indicators.conflictRate * 100).toFixed(1)}%`);
        }
        
        // Last successful sync
        const lastSuccess = syncs
            .filter(m => m.type === MetricType.SYNC_COMPLETED)
            .sort((a, b) => b.timestamp - a.timestamp)[0];
        
        if (lastSuccess) {
            health.lastSuccessfulSync = lastSuccess.timestamp;
            
            // Check if sync is stale
            const hoursSinceSync = (now - lastSuccess.timestamp) / (60 * 60 * 1000);
            if (hoursSinceSync > 24) {
                health.status = HealthStatus.WARNING;
                health.issues = health.issues || [];
                health.issues.push(`No successful sync in ${Math.round(hoursSinceSync)} hours`);
            }
        }
        
        return health;
    }
    
    /**
     * Get dashboard data
     */
    async getDashboard(integrationId, timeRange = '24h') {
        const now = new Date();
        const ranges = {
            '1h': 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000
        };
        
        const startTime = new Date(now - (ranges[timeRange] || ranges['24h']));
        
        // Get all configs for this integration
        const configs = await this.db.getIntegrationConfigs({
            integration_id: integrationId
        });
        
        const dashboard = {
            integrationId,
            timeRange,
            timestamp: now,
            summary: {
                totalConfigs: configs.length,
                activeConfigs: 0,
                totalSyncs: 0,
                successfulSyncs: 0,
                failedSyncs: 0,
                itemsSynced: 0,
                conflictsResolved: 0,
                avgSyncDuration: 0,
                avgApiLatency: 0
            },
            timeSeries: [],
            topErrors: [],
            configHealth: []
        };
        
        // Aggregate metrics across all configs
        for (const config of configs) {
            const metrics = await this.getMetrics({
                configId: config.id,
                startTime,
                endTime: now
            });
            
            // Update summary
            const syncs = metrics.filter(m => m.type === MetricType.SYNC_COMPLETED);
            const failures = metrics.filter(m => m.type === MetricType.SYNC_FAILED);
            
            dashboard.summary.totalSyncs += syncs.length + failures.length;
            dashboard.summary.successfulSyncs += syncs.length;
            dashboard.summary.failedSyncs += failures.length;
            
            const itemsSynced = syncs.reduce((sum, m) => sum + (m.itemsSynced || 0), 0);
            dashboard.summary.itemsSynced += itemsSynced;
            
            const conflicts = metrics
                .filter(m => m.type === MetricType.CONFLICT_RESOLVED)
                .reduce((sum, m) => sum + (m.count || 1), 0);
            dashboard.summary.conflictsResolved += conflicts;
            
            // Config health
            const health = await this.getIntegrationHealth(config.id);
            dashboard.configHealth.push({
                configId: config.id,
                userId: config.user_id,
                status: health.status,
                indicators: health.indicators
            });
            
            if (health.status === HealthStatus.HEALTHY || health.status === HealthStatus.WARNING) {
                dashboard.summary.activeConfigs++;
            }
        }
        
        // Calculate averages
        if (dashboard.summary.totalSyncs > 0) {
            const allSyncDurations = [];
            const allApiLatencies = [];
            
            for (const config of configs) {
                const metrics = await this.getMetrics({
                    configId: config.id,
                    startTime,
                    endTime: now
                });
                
                metrics
                    .filter(m => m.type === MetricType.SYNC_COMPLETED && m.duration)
                    .forEach(m => allSyncDurations.push(m.duration));
                
                metrics
                    .filter(m => m.type === MetricType.API_CALL && m.duration)
                    .forEach(m => allApiLatencies.push(m.duration));
            }
            
            if (allSyncDurations.length > 0) {
                dashboard.summary.avgSyncDuration = 
                    allSyncDurations.reduce((a, b) => a + b, 0) / allSyncDurations.length;
            }
            
            if (allApiLatencies.length > 0) {
                dashboard.summary.avgApiLatency = 
                    allApiLatencies.reduce((a, b) => a + b, 0) / allApiLatencies.length;
            }
        }
        
        // Generate time series data
        dashboard.timeSeries = await this.generateTimeSeries(
            integrationId,
            startTime,
            now,
            timeRange
        );
        
        // Get top errors
        dashboard.topErrors = await this.getTopErrors(integrationId, startTime, now);
        
        return dashboard;
    }
    
    /**
     * Generate time series data
     */
    async generateTimeSeries(integrationId, startTime, endTime, timeRange) {
        const intervals = {
            '1h': 5 * 60 * 1000, // 5 minutes
            '24h': 60 * 60 * 1000, // 1 hour
            '7d': 6 * 60 * 60 * 1000, // 6 hours
            '30d': 24 * 60 * 60 * 1000 // 1 day
        };
        
        const interval = intervals[timeRange] || intervals['24h'];
        const points = [];
        
        let currentTime = new Date(startTime);
        while (currentTime < endTime) {
            const nextTime = new Date(currentTime.getTime() + interval);
            
            const metrics = await this.getMetrics({
                integrationId,
                startTime: currentTime,
                endTime: nextTime
            });
            
            const point = {
                timestamp: currentTime,
                syncs: metrics.filter(m => m.type === MetricType.SYNC_COMPLETED).length,
                errors: metrics.filter(m => 
                    m.type === MetricType.SYNC_FAILED || 
                    m.type === MetricType.API_ERROR
                ).length,
                items: metrics
                    .filter(m => 
                        m.type === MetricType.ITEM_CREATED || 
                        m.type === MetricType.ITEM_UPDATED
                    )
                    .reduce((sum, m) => sum + (m.count || 1), 0),
                conflicts: metrics
                    .filter(m => m.type === MetricType.CONFLICT_DETECTED)
                    .reduce((sum, m) => sum + (m.count || 1), 0)
            };
            
            points.push(point);
            currentTime = nextTime;
        }
        
        return points;
    }
    
    /**
     * Get top errors
     */
    async getTopErrors(integrationId, startTime, endTime) {
        const errors = await this.getMetrics({
            integrationId,
            type: [MetricType.SYNC_FAILED, MetricType.API_ERROR],
            startTime,
            endTime
        });
        
        // Group by error type
        const errorCounts = {};
        
        for (const error of errors) {
            const key = error.errorType || 'unknown';
            errorCounts[key] = (errorCounts[key] || 0) + 1;
        }
        
        // Sort and return top 5
        return Object.entries(errorCounts)
            .map(([errorType, count]) => ({ errorType, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }
    
    /**
     * Get metrics from database
     */
    async getMetrics(query) {
        if (!this.db) {
            // Return from buffer if no database
            return this.metricsBuffer.filter(m => {
                if (query.configId && m.configId !== query.configId) return false;
                if (query.integrationId && m.integrationId !== query.integrationId) return false;
                if (query.type && !query.type.includes(m.type)) return false;
                if (query.startTime && m.timestamp < query.startTime) return false;
                if (query.endTime && m.timestamp > query.endTime) return false;
                return true;
            });
        }
        
        return await this.db.getMetrics(query);
    }
    
    /**
     * Flush metrics to database
     */
    async flushMetrics() {
        if (!this.db || this.metricsBuffer.length === 0) return;
        
        try {
            await this.db.insertMetrics(this.metricsBuffer);
            
            // Clear buffer
            this.metricsBuffer = [];
            
        } catch (error) {
            this.logger.error('Failed to flush metrics:', error);
        }
    }
    
    /**
     * Check for alert conditions
     */
    async checkAlerts(metric) {
        const alerts = [];
        
        // Check error rate
        if (metric.type === MetricType.SYNC_FAILED || metric.type === MetricType.API_ERROR) {
            const recentErrors = this.metricsBuffer
                .filter(m => 
                    m.configId === metric.configId &&
                    (m.type === MetricType.SYNC_FAILED || m.type === MetricType.API_ERROR) &&
                    m.timestamp > new Date(Date.now() - 60 * 60 * 1000)
                ).length;
            
            const recentTotal = this.metricsBuffer
                .filter(m => 
                    m.configId === metric.configId &&
                    m.timestamp > new Date(Date.now() - 60 * 60 * 1000)
                ).length;
            
            if (recentTotal > 10 && recentErrors / recentTotal > this.options.alertThresholds.errorRate) {
                alerts.push({
                    type: 'high_error_rate',
                    severity: 'critical',
                    message: `High error rate detected: ${Math.round(recentErrors / recentTotal * 100)}%`,
                    configId: metric.configId
                });
            }
        }
        
        // Check sync duration
        if (metric.type === MetricType.SYNC_COMPLETED && metric.duration > this.options.alertThresholds.syncDuration) {
            alerts.push({
                type: 'slow_sync',
                severity: 'warning',
                message: `Slow sync detected: ${Math.round(metric.duration / 1000)}s`,
                configId: metric.configId
            });
        }
        
        // Check API latency
        if (metric.type === MetricType.API_CALL && metric.duration > this.options.alertThresholds.apiLatency) {
            alerts.push({
                type: 'high_api_latency',
                severity: 'warning',
                message: `High API latency: ${metric.duration}ms for ${metric.operation}`,
                integrationId: metric.integrationId
            });
        }
        
        // Process alerts
        for (const alert of alerts) {
            await this.processAlert(alert);
        }
    }
    
    /**
     * Process an alert
     */
    async processAlert(alert) {
        const alertKey = `${alert.type}_${alert.configId || alert.integrationId}`;
        
        // Check if alert is already active
        if (this.activeAlerts.has(alertKey)) {
            const existing = this.activeAlerts.get(alertKey);
            existing.count++;
            existing.lastOccurrence = new Date();
            return;
        }
        
        // Create new alert
        const fullAlert = {
            id: uuidv4(),
            ...alert,
            timestamp: new Date(),
            count: 1,
            status: 'active'
        };
        
        this.activeAlerts.set(alertKey, fullAlert);
        this.alertHistory.push(fullAlert);
        
        // Emit alert
        this.emit('alert', fullAlert);
        
        // Persist alert
        if (this.db) {
            await this.db.createAlert(fullAlert);
        }
        
        this.logger.warn(`Alert triggered: ${alert.type} - ${alert.message}`);
    }
    
    /**
     * Get active alerts
     */
    getActiveAlerts(configId = null) {
        const alerts = Array.from(this.activeAlerts.values());
        
        if (configId) {
            return alerts.filter(a => a.configId === configId);
        }
        
        return alerts;
    }
    
    /**
     * Acknowledge an alert
     */
    async acknowledgeAlert(alertId) {
        const alert = Array.from(this.activeAlerts.values())
            .find(a => a.id === alertId);
        
        if (!alert) {
            throw new Error('Alert not found');
        }
        
        alert.status = 'acknowledged';
        alert.acknowledgedAt = new Date();
        
        if (this.db) {
            await this.db.updateAlert(alertId, {
                status: 'acknowledged',
                acknowledged_at: alert.acknowledgedAt
            });
        }
        
        this.emit('alert:acknowledged', alert);
    }
    
    /**
     * Start monitoring processes
     */
    startMonitoring() {
        // Periodic metrics flush
        setInterval(() => {
            this.flushMetrics();
        }, 30000); // 30 seconds
        
        // Periodic aggregation
        setInterval(() => {
            this.aggregateMetrics();
        }, this.options.aggregationInterval);
        
        // Health checks
        setInterval(() => {
            this.performHealthChecks();
        }, this.options.healthCheckInterval);
        
        // Cleanup old data
        setInterval(() => {
            this.cleanupOldData();
        }, 24 * 60 * 60 * 1000); // Daily
    }
    
    /**
     * Aggregate metrics for performance
     */
    async aggregateMetrics() {
        if (!this.db) return;
        
        try {
            // Get configs to aggregate
            const configs = await this.db.getActiveIntegrationConfigs();
            
            for (const config of configs) {
                const hourlyStats = await this.calculateHourlyStats(config.id);
                
                // Save to analytics table
                await this.db.saveIntegrationAnalytics({
                    config_id: config.id,
                    date: new Date(),
                    ...hourlyStats
                });
            }
            
        } catch (error) {
            this.logger.error('Failed to aggregate metrics:', error);
        }
    }
    
    /**
     * Calculate hourly statistics
     */
    async calculateHourlyStats(configId) {
        const now = new Date();
        const oneHourAgo = new Date(now - 60 * 60 * 1000);
        
        const metrics = await this.getMetrics({
            configId,
            startTime: oneHourAgo,
            endTime: now
        });
        
        const stats = {
            sync_count: metrics.filter(m => 
                m.type === MetricType.SYNC_STARTED
            ).length,
            success_count: metrics.filter(m => 
                m.type === MetricType.SYNC_COMPLETED
            ).length,
            error_count: metrics.filter(m => 
                m.type === MetricType.SYNC_FAILED || 
                m.type === MetricType.API_ERROR
            ).length,
            items_pushed: metrics
                .filter(m => m.type === MetricType.ITEM_CREATED && m.direction === 'push')
                .reduce((sum, m) => sum + (m.count || 1), 0),
            items_pulled: metrics
                .filter(m => m.type === MetricType.ITEM_CREATED && m.direction === 'pull')
                .reduce((sum, m) => sum + (m.count || 1), 0),
            conflicts_count: metrics
                .filter(m => m.type === MetricType.CONFLICT_DETECTED)
                .reduce((sum, m) => sum + (m.count || 1), 0)
        };
        
        // Calculate average sync duration
        const syncDurations = metrics
            .filter(m => m.type === MetricType.SYNC_COMPLETED && m.duration)
            .map(m => m.duration);
        
        if (syncDurations.length > 0) {
            stats.avg_sync_duration_ms = Math.round(
                syncDurations.reduce((a, b) => a + b, 0) / syncDurations.length
            );
            stats.total_sync_duration_ms = syncDurations.reduce((a, b) => a + b, 0);
        }
        
        // Error types breakdown
        const errorTypes = {};
        metrics
            .filter(m => m.type === MetricType.SYNC_FAILED || m.type === MetricType.API_ERROR)
            .forEach(m => {
                const type = m.errorType || 'unknown';
                errorTypes[type] = (errorTypes[type] || 0) + 1;
            });
        
        stats.error_types = errorTypes;
        
        // Find peak hour
        const hourCounts = {};
        metrics.forEach(m => {
            const hour = m.timestamp.getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });
        
        const peakHour = Object.entries(hourCounts)
            .sort((a, b) => b[1] - a[1])[0];
        
        if (peakHour) {
            stats.peak_hour = parseInt(peakHour[0]);
        }
        
        return stats;
    }
    
    /**
     * Perform health checks
     */
    async performHealthChecks() {
        if (!this.db) return;
        
        try {
            const configs = await this.db.getActiveIntegrationConfigs();
            
            for (const config of configs) {
                const health = await this.getIntegrationHealth(config.id);
                
                // Update status in database
                if (health.status === HealthStatus.CRITICAL) {
                    await this.db.updateIntegrationConfig(config.id, {
                        status: 'error',
                        updated_at: new Date()
                    });
                }
                
                // Clear resolved alerts
                const alertKey = `integration_health_${config.id}`;
                if (health.status === HealthStatus.HEALTHY && this.activeAlerts.has(alertKey)) {
                    const alert = this.activeAlerts.get(alertKey);
                    alert.status = 'resolved';
                    alert.resolvedAt = new Date();
                    
                    this.activeAlerts.delete(alertKey);
                    this.emit('alert:resolved', alert);
                }
                
                // Create new alerts for issues
                if (health.issues && health.issues.length > 0) {
                    await this.processAlert({
                        type: 'integration_health',
                        severity: health.status === HealthStatus.CRITICAL ? 'critical' : 'warning',
                        message: `Integration health issues: ${health.issues.join(', ')}`,
                        configId: config.id,
                        details: health
                    });
                }
            }
            
        } catch (error) {
            this.logger.error('Health check failed:', error);
        }
    }
    
    /**
     * Clean up old data
     */
    async cleanupOldData() {
        if (!this.db) return;
        
        try {
            const cutoffDate = new Date(Date.now() - this.options.metricsRetention);
            
            // Clean up old metrics
            await this.db.deleteOldMetrics(cutoffDate);
            
            // Clean up resolved alerts older than 30 days
            const alertCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            await this.db.deleteOldAlerts(alertCutoff);
            
            // Clean buffer
            this.metricsBuffer = this.metricsBuffer.filter(m => m.timestamp > cutoffDate);
            
            this.logger.info(`Cleaned up data older than ${cutoffDate.toISOString()}`);
            
        } catch (error) {
            this.logger.error('Cleanup failed:', error);
        }
    }
    
    /**
     * Export metrics for analysis
     */
    async exportMetrics(query) {
        const metrics = await this.getMetrics(query);
        
        return {
            query,
            count: metrics.length,
            startTime: metrics[0]?.timestamp,
            endTime: metrics[metrics.length - 1]?.timestamp,
            metrics: metrics
        };
    }
    
    /**
     * Get email processing metrics
     */
    async getEmailMetrics(timeRange = '24h') {
        const ranges = {
            '1h': 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000
        };
        
        const startTime = new Date(Date.now() - (ranges[timeRange] || ranges['24h']));
        
        // This would integrate with email processing metrics
        const emailMetrics = {
            timeRange,
            emailsProcessed: 0,
            tasksExtracted: 0,
            extractionAccuracy: 0,
            averageProcessingTime: 0,
            topEmailTypes: [],
            suggestionAccuracy: {
                priority: 0,
                dueDate: 0,
                assignee: 0
            }
        };
        
        // Would query actual email processing data
        return emailMetrics;
    }
}

export default IntegrationMonitoring;