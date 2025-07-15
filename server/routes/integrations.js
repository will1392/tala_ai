/**
 * Integration API Routes
 * Manages third-party task management integrations
 */

import express from 'express';
import IntegrationManager from '../services/integrations/IntegrationManager.js';
import NotionIntegration from '../services/integrations/NotionIntegration.js';
import LinearIntegration from '../services/integrations/LinearIntegration.js';
import IntegrationMonitoring from '../services/integrations/IntegrationMonitoring.js';
import { SyncDirection, SyncMode, ConflictStrategy } from '../services/integrations/IntegrationManager.js';
import { createSyncStrategy } from '../services/integrations/SyncStrategies.js';

const router = express.Router();

// Initialize services
let integrationManager;
let integrationMonitoring;

// Initialize on first use
const ensureInitialized = async () => {
    if (!integrationManager) {
        integrationManager = new IntegrationManager({
            db: global.db || null, // Use global database connection
            taskManager: global.taskManager || null,
            enableLogging: true
        });
        
        // Register available integrations
        integrationManager.registerIntegration(new NotionIntegration());
        integrationManager.registerIntegration(new LinearIntegration());
        
        await integrationManager.initialize();
    }
    
    if (!integrationMonitoring) {
        integrationMonitoring = new IntegrationMonitoring({
            db: global.db || null,
            enableRealTimeMetrics: true,
            enableAlerting: true
        });
    }
};

/**
 * GET /api/integrations
 * List all available integrations
 */
router.get('/', async (req, res) => {
    try {
        await ensureInitialized();
        
        const integrations = integrationManager.getAllIntegrations();
        
        res.json({
            integrations: integrations.map(integration => ({
                id: integration.id,
                name: integration.name,
                type: integration.type,
                description: integration.description,
                features: integration.features,
                requiredConfig: integration.requiredConfig,
                optionalConfig: integration.optionalConfig
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/integrations/configs
 * Get user's integration configurations
 */
router.get('/configs', async (req, res) => {
    try {
        await ensureInitialized();
        
        const userId = req.userId || req.headers['x-user-id'];
        if (!userId) {
            return res.status(401).json({ error: 'User ID required' });
        }
        
        // Get configs from database
        const configs = await integrationManager.db?.getUserIntegrationConfigs(userId) || [];
        
        // Add health status to each config
        const configsWithHealth = await Promise.all(configs.map(async (config) => {
            const health = await integrationMonitoring.getIntegrationHealth(config.id);
            return {
                ...config,
                health: {
                    status: health.status,
                    lastSync: health.lastSuccessfulSync,
                    indicators: health.indicators
                }
            };
        }));
        
        res.json({ configs: configsWithHealth });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/integrations/:integrationId/enable
 * Enable an integration for the user
 */
router.post('/:integrationId/enable', async (req, res) => {
    try {
        await ensureInitialized();
        
        const { integrationId } = req.params;
        const userId = req.userId || req.headers['x-user-id'];
        
        if (!userId) {
            return res.status(401).json({ error: 'User ID required' });
        }
        
        const {
            config,
            syncDirection = SyncDirection.BIDIRECTIONAL,
            syncMode = SyncMode.BATCH,
            conflictStrategy = ConflictStrategy.NEWEST_WINS,
            filters = {},
            fieldMappings = {}
        } = req.body;
        
        // Validate integration exists
        const integration = integrationManager.getIntegration(integrationId);
        if (!integration) {
            return res.status(404).json({ error: 'Integration not found' });
        }
        
        // Enable the integration
        const integrationConfig = await integrationManager.enableIntegration(userId, integrationId, {
            ...config,
            syncDirection,
            syncMode,
            conflictStrategy,
            filters,
            fieldMappings
        });
        
        res.json({
            success: true,
            configId: integrationConfig.id,
            status: integrationConfig.status
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /api/integrations/configs/:configId/disable
 * Disable an integration configuration
 */
router.post('/configs/:configId/disable', async (req, res) => {
    try {
        await ensureInitialized();
        
        const { configId } = req.params;
        const userId = req.userId || req.headers['x-user-id'];
        
        if (!userId) {
            return res.status(401).json({ error: 'User ID required' });
        }
        
        await integrationManager.disableIntegration(userId, configId);
        
        res.json({
            success: true,
            message: 'Integration disabled'
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /api/integrations/:integrationId/test
 * Test integration connection
 */
router.post('/:integrationId/test', async (req, res) => {
    try {
        await ensureInitialized();
        
        const { integrationId } = req.params;
        const { config } = req.body;
        
        const integration = integrationManager.getIntegration(integrationId);
        if (!integration) {
            return res.status(404).json({ error: 'Integration not found' });
        }
        
        // Validate config
        await integration.validateConfig(config);
        
        // Test connection
        const result = await integration.testConnection(config);
        
        res.json({
            success: true,
            connection: result
        });
    } catch (error) {
        res.status(400).json({ 
            error: error.message,
            details: error.stack
        });
    }
});

/**
 * POST /api/integrations/configs/:configId/sync
 * Trigger manual sync
 */
router.post('/configs/:configId/sync', async (req, res) => {
    try {
        await ensureInitialized();
        
        const { configId } = req.params;
        const { options = {} } = req.body;
        
        // Start sync (async)
        integrationManager.syncTasks(configId, options)
            .then(result => {
                // Record metrics
                integrationMonitoring.recordSync(configId, 'complete', result);
            })
            .catch(error => {
                // Record failure
                integrationMonitoring.recordSync(configId, 'fail', {
                    error: error.message,
                    errorType: error.code
                });
            });
        
        res.json({
            success: true,
            message: 'Sync started',
            syncId: configId
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * GET /api/integrations/configs/:configId/sync/status
 * Get sync status
 */
router.get('/configs/:configId/sync/status', async (req, res) => {
    try {
        await ensureInitialized();
        
        const { configId } = req.params;
        
        // Get latest sync log
        const syncLogs = await integrationManager.db?.getSyncLogs(configId, { limit: 1 }) || [];
        const latestSync = syncLogs[0];
        
        // Get active sync if any
        const isActive = integrationManager.activeSyncs.has(configId);
        
        res.json({
            configId,
            isActive,
            lastSync: latestSync || null,
            health: await integrationMonitoring.getIntegrationHealth(configId)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/integrations/configs/:configId/logs
 * Get sync logs
 */
router.get('/configs/:configId/logs', async (req, res) => {
    try {
        await ensureInitialized();
        
        const { configId } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        
        const logs = await integrationManager.db?.getSyncLogs(configId, {
            limit: parseInt(limit),
            offset: parseInt(offset)
        }) || [];
        
        res.json({ logs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/integrations/configs/:configId/conflicts
 * Get unresolved conflicts
 */
router.get('/configs/:configId/conflicts', async (req, res) => {
    try {
        await ensureInitialized();
        
        const { configId } = req.params;
        
        const conflicts = await integrationManager.db?.getPendingConflicts(configId) || [];
        
        res.json({ conflicts });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/integrations/conflicts/:conflictId/resolve
 * Resolve a conflict
 */
router.post('/conflicts/:conflictId/resolve', async (req, res) => {
    try {
        await ensureInitialized();
        
        const { conflictId } = req.params;
        const { resolution, data } = req.body;
        
        // Get conflict details
        const conflict = await integrationManager.db?.getConflict(conflictId);
        if (!conflict) {
            return res.status(404).json({ error: 'Conflict not found' });
        }
        
        // Resolve based on chosen resolution
        let result;
        switch (resolution) {
            case 'use_tala':
                result = await integrationManager.resolveConflict(
                    conflict,
                    ConflictStrategy.TALA_WINS,
                    integrationManager.getIntegration(conflict.integration_id)
                );
                break;
                
            case 'use_external':
                result = await integrationManager.resolveConflict(
                    conflict,
                    ConflictStrategy.EXTERNAL_WINS,
                    integrationManager.getIntegration(conflict.integration_id)
                );
                break;
                
            case 'use_custom':
                // Apply custom data
                if (!data) {
                    return res.status(400).json({ error: 'Custom data required' });
                }
                // Update both sides with custom data
                await integrationManager.taskManager.updateTask(conflict.tala_id, data);
                break;
                
            default:
                return res.status(400).json({ error: 'Invalid resolution type' });
        }
        
        // Mark conflict as resolved
        await integrationManager.db?.updateConflictResolution(conflictId, {
            status: 'resolved',
            resolution_strategy: resolution,
            resolved_data: data || result.data,
            resolved_by: req.userId,
            resolved_at: new Date()
        });
        
        res.json({
            success: true,
            resolution: result
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * PUT /api/integrations/configs/:configId/mappings
 * Update field mappings
 */
router.put('/configs/:configId/mappings', async (req, res) => {
    try {
        await ensureInitialized();
        
        const { configId } = req.params;
        const { mappings } = req.body;
        
        await integrationManager.saveFieldMappings(configId, mappings);
        
        res.json({
            success: true,
            message: 'Field mappings updated'
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * GET /api/integrations/configs/:configId/mappings
 * Get field mappings
 */
router.get('/configs/:configId/mappings', async (req, res) => {
    try {
        await ensureInitialized();
        
        const { configId } = req.params;
        const { entityType = 'task' } = req.query;
        
        const mappings = await integrationManager.getFieldMappings(configId, entityType);
        
        res.json({ mappings });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/integrations/:integrationId/dashboard
 * Get integration dashboard data
 */
router.get('/:integrationId/dashboard', async (req, res) => {
    try {
        await ensureInitialized();
        
        const { integrationId } = req.params;
        const { timeRange = '24h' } = req.query;
        
        const dashboard = await integrationMonitoring.getDashboard(integrationId, timeRange);
        
        res.json(dashboard);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/integrations/configs/:configId/health
 * Get integration health status
 */
router.get('/configs/:configId/health', async (req, res) => {
    try {
        await ensureInitialized();
        
        const { configId } = req.params;
        
        const health = await integrationMonitoring.getIntegrationHealth(configId);
        
        res.json(health);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/integrations/alerts
 * Get active alerts
 */
router.get('/alerts', async (req, res) => {
    try {
        await ensureInitialized();
        
        const userId = req.userId || req.headers['x-user-id'];
        
        // Get user's configs
        const configs = await integrationManager.db?.getUserIntegrationConfigs(userId) || [];
        const configIds = configs.map(c => c.id);
        
        // Get alerts for user's configs
        const alerts = integrationMonitoring.getActiveAlerts()
            .filter(alert => !alert.configId || configIds.includes(alert.configId));
        
        res.json({ alerts });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/integrations/alerts/:alertId/acknowledge
 * Acknowledge an alert
 */
router.post('/alerts/:alertId/acknowledge', async (req, res) => {
    try {
        await ensureInitialized();
        
        const { alertId } = req.params;
        
        await integrationMonitoring.acknowledgeAlert(alertId);
        
        res.json({
            success: true,
            message: 'Alert acknowledged'
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * GET /api/integrations/metrics/email
 * Get email processing metrics
 */
router.get('/metrics/email', async (req, res) => {
    try {
        await ensureInitialized();
        
        const { timeRange = '24h' } = req.query;
        
        const metrics = await integrationMonitoring.getEmailMetrics(timeRange);
        
        res.json(metrics);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/integrations/configs/:configId/queue
 * Queue a sync operation
 */
router.post('/configs/:configId/queue', async (req, res) => {
    try {
        await ensureInitialized();
        
        const { configId } = req.params;
        const { priority = 5, entityType, entityId } = req.body;
        
        const queueItem = {
            id: uuidv4(),
            config_id: configId,
            operation: 'sync',
            entity_type: entityType,
            entity_id: entityId,
            priority,
            status: 'pending',
            scheduled_for: new Date()
        };
        
        if (integrationManager.db) {
            await integrationManager.db.addToSyncQueue(queueItem);
        }
        
        // Queue for processing
        integrationManager.queueSync(configId);
        
        res.json({
            success: true,
            queueId: queueItem.id
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * GET /api/integrations/supported-features
 * Get supported features matrix
 */
router.get('/supported-features', async (req, res) => {
    try {
        await ensureInitialized();
        
        const integrations = integrationManager.getAllIntegrations();
        
        const features = {
            syncStrategies: Object.values(SyncDirection),
            syncModes: Object.values(SyncMode),
            conflictStrategies: Object.values(ConflictStrategy),
            integrations: {}
        };
        
        for (const integration of integrations) {
            features.integrations[integration.id] = {
                name: integration.name,
                features: integration.features,
                supportedEntities: ['task'], // Could be expanded
                customFields: true,
                webhooks: integration.features.includes('webhooks'),
                realtime: integration.features.includes('realtime')
            };
        }
        
        res.json(features);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// WebSocket endpoint for real-time updates
router.ws('/ws', (ws, req) => {
    const userId = req.userId || req.headers['x-user-id'];
    
    if (!userId) {
        ws.close(1008, 'User ID required');
        return;
    }
    
    // Subscribe to integration events
    const handleMetric = (metric) => {
        ws.send(JSON.stringify({
            type: 'metric',
            data: metric
        }));
    };
    
    const handleAlert = (alert) => {
        ws.send(JSON.stringify({
            type: 'alert',
            data: alert
        }));
    };
    
    integrationMonitoring.on('metric', handleMetric);
    integrationMonitoring.on('alert', handleAlert);
    
    ws.on('close', () => {
        integrationMonitoring.off('metric', handleMetric);
        integrationMonitoring.off('alert', handleAlert);
    });
    
    // Send initial connection message
    ws.send(JSON.stringify({
        type: 'connected',
        userId
    }));
});

export default router;