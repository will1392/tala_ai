/**
 * Integration Manager - Core framework for third-party task management integrations
 * Handles multiple integrations, authentication, sync, and conflict resolution
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// Integration status constants
export const IntegrationStatus = {
    INACTIVE: 'inactive',
    ACTIVE: 'active',
    ERROR: 'error',
    SYNCING: 'syncing',
    PAUSED: 'paused'
};

// Sync direction constants
export const SyncDirection = {
    PUSH: 'push',         // Tala → External
    PULL: 'pull',         // External → Tala
    BIDIRECTIONAL: 'bidirectional'
};

// Conflict resolution strategies
export const ConflictStrategy = {
    TALA_WINS: 'tala_wins',
    EXTERNAL_WINS: 'external_wins',
    NEWEST_WINS: 'newest_wins',
    MANUAL: 'manual',
    MERGE: 'merge'
};

// Sync modes
export const SyncMode = {
    REALTIME: 'realtime',
    BATCH: 'batch',
    MANUAL: 'manual'
};

class IntegrationManager extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            enableLogging: true,
            syncInterval: 5 * 60 * 1000, // 5 minutes
            maxRetries: 3,
            retryDelay: 1000,
            batchSize: 50,
            ...options
        };
        
        this.integrations = new Map();
        this.syncQueues = new Map();
        this.activeSyncs = new Map();
        this.fieldMappings = new Map();
        this.syncTimers = new Map();
        
        this.db = options.db || null;
        this.taskManager = options.taskManager || null;
        this.logger = options.logger || console;
        
        this.initialized = false;
    }
    
    /**
     * Initialize the integration manager
     */
    async initialize() {
        if (this.initialized) return;
        
        try {
            // Load integration configs from database
            if (this.db) {
                await this.loadIntegrationConfigs();
                await this.loadFieldMappings();
            }
            
            // Start sync schedulers
            this.startSyncSchedulers();
            
            this.initialized = true;
            this.log('Integration Manager initialized');
            
        } catch (error) {
            this.logError('Failed to initialize Integration Manager:', error);
            throw error;
        }
    }
    
    /**
     * Register a new integration
     */
    registerIntegration(integration) {
        const { id, name, type } = integration;
        
        if (!id || !name || !type) {
            throw new Error('Integration must have id, name, and type');
        }
        
        this.integrations.set(id, integration);
        this.syncQueues.set(id, []);
        
        this.log(`Registered integration: ${name} (${id})`);
        this.emit('integration:registered', { id, name, type });
    }
    
    /**
     * Get integration by ID
     */
    getIntegration(integrationId) {
        return this.integrations.get(integrationId);
    }
    
    /**
     * Get all registered integrations
     */
    getAllIntegrations() {
        return Array.from(this.integrations.values());
    }
    
    /**
     * Enable an integration for a user/organization
     */
    async enableIntegration(userId, integrationId, config = {}) {
        const integration = this.getIntegration(integrationId);
        if (!integration) {
            throw new Error(`Integration ${integrationId} not found`);
        }
        
        try {
            // Validate configuration
            if (integration.validateConfig) {
                await integration.validateConfig(config);
            }
            
            // Test connection
            if (integration.testConnection) {
                await integration.testConnection(config);
            }
            
            // Encrypt sensitive data
            const encryptedConfig = this.encryptConfig(config);
            
            // Save to database
            const integrationConfig = {
                id: uuidv4(),
                user_id: userId,
                integration_id: integrationId,
                config: encryptedConfig,
                status: IntegrationStatus.ACTIVE,
                sync_direction: config.syncDirection || SyncDirection.BIDIRECTIONAL,
                sync_mode: config.syncMode || SyncMode.BATCH,
                conflict_strategy: config.conflictStrategy || ConflictStrategy.NEWEST_WINS,
                filters: config.filters || {},
                enabled: true,
                created_at: new Date()
            };
            
            if (this.db) {
                await this.db.saveIntegrationConfig(integrationConfig);
            }
            
            // Initialize field mappings
            if (config.fieldMappings) {
                await this.saveFieldMappings(integrationConfig.id, config.fieldMappings);
            }
            
            // Start sync if realtime
            if (config.syncMode === SyncMode.REALTIME) {
                this.startRealtimeSync(integrationConfig.id);
            }
            
            this.log(`Enabled integration ${integrationId} for user ${userId}`);
            this.emit('integration:enabled', { userId, integrationId, configId: integrationConfig.id });
            
            return integrationConfig;
            
        } catch (error) {
            this.logError(`Failed to enable integration ${integrationId}:`, error);
            throw error;
        }
    }
    
    /**
     * Disable an integration
     */
    async disableIntegration(userId, configId) {
        try {
            // Stop any active syncs
            this.stopSync(configId);
            
            // Update database
            if (this.db) {
                await this.db.updateIntegrationConfig(configId, {
                    status: IntegrationStatus.INACTIVE,
                    enabled: false,
                    updated_at: new Date()
                });
            }
            
            this.log(`Disabled integration config ${configId}`);
            this.emit('integration:disabled', { userId, configId });
            
        } catch (error) {
            this.logError(`Failed to disable integration ${configId}:`, error);
            throw error;
        }
    }
    
    /**
     * Sync tasks with external system
     */
    async syncTasks(configId, options = {}) {
        const config = await this.getIntegrationConfig(configId);
        if (!config || !config.enabled) {
            throw new Error('Integration config not found or disabled');
        }
        
        const integration = this.getIntegration(config.integration_id);
        if (!integration) {
            throw new Error('Integration not found');
        }
        
        // Check if sync is already in progress
        if (this.activeSyncs.has(configId)) {
            this.log(`Sync already in progress for ${configId}`);
            return { status: 'in_progress' };
        }
        
        const syncId = uuidv4();
        this.activeSyncs.set(configId, syncId);
        
        try {
            // Update status
            await this.updateIntegrationStatus(configId, IntegrationStatus.SYNCING);
            
            // Create sync log
            const syncLog = {
                id: syncId,
                config_id: configId,
                direction: config.sync_direction,
                started_at: new Date(),
                status: 'in_progress'
            };
            
            if (this.db) {
                await this.db.createSyncLog(syncLog);
            }
            
            let result;
            
            // Perform sync based on direction
            switch (config.sync_direction) {
                case SyncDirection.PUSH:
                    result = await this.pushToExternal(config, integration, options);
                    break;
                    
                case SyncDirection.PULL:
                    result = await this.pullFromExternal(config, integration, options);
                    break;
                    
                case SyncDirection.BIDIRECTIONAL:
                    result = await this.bidirectionalSync(config, integration, options);
                    break;
                    
                default:
                    throw new Error(`Unknown sync direction: ${config.sync_direction}`);
            }
            
            // Update sync log
            syncLog.completed_at = new Date();
            syncLog.status = 'completed';
            syncLog.items_synced = result.itemsSynced || 0;
            syncLog.errors = result.errors || [];
            
            if (this.db) {
                await this.db.updateSyncLog(syncLog);
            }
            
            // Update status
            await this.updateIntegrationStatus(configId, IntegrationStatus.ACTIVE);
            
            this.log(`Sync completed for ${configId}: ${syncLog.items_synced} items`);
            this.emit('sync:completed', { configId, syncId, result });
            
            return result;
            
        } catch (error) {
            // Log error
            if (this.db) {
                await this.db.updateSyncLog({
                    id: syncId,
                    completed_at: new Date(),
                    status: 'error',
                    error_message: error.message
                });
            }
            
            // Update status
            await this.updateIntegrationStatus(configId, IntegrationStatus.ERROR);
            
            this.logError(`Sync failed for ${configId}:`, error);
            this.emit('sync:error', { configId, syncId, error });
            
            throw error;
            
        } finally {
            this.activeSyncs.delete(configId);
        }
    }
    
    /**
     * Push tasks to external system
     */
    async pushToExternal(config, integration, options = {}) {
        const { since, taskIds, batchSize = this.options.batchSize } = options;
        
        // Get tasks to sync
        const tasks = await this.getTasksToSync(config.user_id, { since, taskIds, filters: config.filters });
        
        const results = {
            itemsSynced: 0,
            created: 0,
            updated: 0,
            errors: []
        };
        
        // Process in batches
        for (let i = 0; i < tasks.length; i += batchSize) {
            const batch = tasks.slice(i, i + batchSize);
            
            for (const task of batch) {
                try {
                    // Get field mappings
                    const mappings = await this.getFieldMappings(config.id, 'task');
                    
                    // Transform task data
                    const externalData = await this.transformForExternal(task, mappings, integration);
                    
                    // Check if task already exists in external system
                    const externalId = await this.getExternalId(config.id, 'task', task.id);
                    
                    let result;
                    if (externalId) {
                        // Update existing
                        result = await integration.updateTask(externalId, externalData, config.config);
                        results.updated++;
                    } else {
                        // Create new
                        result = await integration.createTask(externalData, config.config);
                        results.created++;
                        
                        // Save mapping
                        await this.saveMapping(config.id, 'task', task.id, result.id);
                    }
                    
                    results.itemsSynced++;
                    
                    // Update sync metadata
                    await this.updateSyncMetadata(task.id, 'task', {
                        last_synced: new Date(),
                        external_id: result.id,
                        sync_hash: this.generateSyncHash(task)
                    });
                    
                } catch (error) {
                    results.errors.push({
                        taskId: task.id,
                        error: error.message
                    });
                    this.logError(`Failed to sync task ${task.id}:`, error);
                }
            }
        }
        
        return results;
    }
    
    /**
     * Pull tasks from external system
     */
    async pullFromExternal(config, integration, options = {}) {
        const { since, limit = 100 } = options;
        
        const results = {
            itemsSynced: 0,
            created: 0,
            updated: 0,
            errors: []
        };
        
        try {
            // Get tasks from external system
            const externalTasks = await integration.getTasks({
                since,
                limit,
                filters: config.filters
            }, config.config);
            
            // Get field mappings
            const mappings = await this.getFieldMappings(config.id, 'task');
            
            for (const externalTask of externalTasks) {
                try {
                    // Transform to Tala format
                    const talaTask = await this.transformFromExternal(externalTask, mappings, integration);
                    
                    // Check if task already exists
                    const talaId = await this.getTalaId(config.id, 'task', externalTask.id);
                    
                    if (talaId) {
                        // Update existing
                        await this.taskManager.updateTask(talaId, talaTask);
                        results.updated++;
                    } else {
                        // Create new
                        talaTask.user_id = config.user_id;
                        talaTask.source = `integration:${integration.name}`;
                        const created = await this.taskManager.createTask(talaTask);
                        results.created++;
                        
                        // Save mapping
                        await this.saveMapping(config.id, 'task', created.id, externalTask.id);
                    }
                    
                    results.itemsSynced++;
                    
                } catch (error) {
                    results.errors.push({
                        externalId: externalTask.id,
                        error: error.message
                    });
                    this.logError(`Failed to import task ${externalTask.id}:`, error);
                }
            }
            
        } catch (error) {
            this.logError('Failed to fetch tasks from external system:', error);
            throw error;
        }
        
        return results;
    }
    
    /**
     * Bidirectional sync with conflict resolution
     */
    async bidirectionalSync(config, integration, options = {}) {
        const results = {
            itemsSynced: 0,
            pushed: { created: 0, updated: 0 },
            pulled: { created: 0, updated: 0 },
            conflicts: 0,
            errors: []
        };
        
        try {
            // Get last sync time
            const lastSync = await this.getLastSyncTime(config.id);
            
            // Get changes from both sides
            const [talaChanges, externalChanges] = await Promise.all([
                this.getTasksToSync(config.user_id, { since: lastSync }),
                integration.getTasks({ since: lastSync }, config.config)
            ]);
            
            // Build change maps
            const talaChangeMap = new Map();
            const externalChangeMap = new Map();
            
            for (const task of talaChanges) {
                const externalId = await this.getExternalId(config.id, 'task', task.id);
                if (externalId) {
                    talaChangeMap.set(externalId, task);
                }
            }
            
            for (const task of externalChanges) {
                externalChangeMap.set(task.id, task);
            }
            
            // Process conflicts
            const conflicts = [];
            for (const [externalId, talaTask] of talaChangeMap) {
                if (externalChangeMap.has(externalId)) {
                    conflicts.push({
                        talaTask,
                        externalTask: externalChangeMap.get(externalId)
                    });
                }
            }
            
            // Resolve conflicts
            for (const conflict of conflicts) {
                try {
                    const resolution = await this.resolveConflict(
                        conflict,
                        config.conflict_strategy,
                        integration
                    );
                    
                    if (resolution.action === 'update_tala') {
                        await this.taskManager.updateTask(
                            conflict.talaTask.id,
                            resolution.data
                        );
                        results.pulled.updated++;
                    } else if (resolution.action === 'update_external') {
                        await integration.updateTask(
                            conflict.externalTask.id,
                            resolution.data,
                            config.config
                        );
                        results.pushed.updated++;
                    }
                    
                    results.conflicts++;
                    
                } catch (error) {
                    results.errors.push({
                        type: 'conflict',
                        taskId: conflict.talaTask.id,
                        error: error.message
                    });
                }
            }
            
            // Push non-conflicting changes
            const pushResult = await this.pushToExternal(config, integration, {
                taskIds: talaChanges
                    .filter(t => !conflicts.some(c => c.talaTask.id === t.id))
                    .map(t => t.id)
            });
            
            results.pushed.created = pushResult.created;
            results.pushed.updated += pushResult.updated;
            
            // Pull non-conflicting changes
            const pullResult = await this.pullFromExternal(config, integration, {
                since: lastSync
            });
            
            results.pulled.created = pullResult.created;
            results.pulled.updated += pullResult.updated;
            
            results.itemsSynced = 
                results.pushed.created + results.pushed.updated +
                results.pulled.created + results.pulled.updated;
            
        } catch (error) {
            this.logError('Bidirectional sync failed:', error);
            throw error;
        }
        
        return results;
    }
    
    /**
     * Resolve sync conflict
     */
    async resolveConflict(conflict, strategy, integration) {
        const { talaTask, externalTask } = conflict;
        
        switch (strategy) {
            case ConflictStrategy.TALA_WINS:
                // Transform and return for external update
                const mappings = await this.getFieldMappings(
                    talaTask.integration_config_id,
                    'task'
                );
                return {
                    action: 'update_external',
                    data: await this.transformForExternal(talaTask, mappings, integration)
                };
                
            case ConflictStrategy.EXTERNAL_WINS:
                // Transform and return for Tala update
                const mappingsRev = await this.getFieldMappings(
                    talaTask.integration_config_id,
                    'task'
                );
                return {
                    action: 'update_tala',
                    data: await this.transformFromExternal(externalTask, mappingsRev, integration)
                };
                
            case ConflictStrategy.NEWEST_WINS:
                // Compare timestamps
                const talaUpdated = new Date(talaTask.updated_at);
                const externalUpdated = new Date(externalTask.updated_at);
                
                if (talaUpdated > externalUpdated) {
                    return this.resolveConflict(conflict, ConflictStrategy.TALA_WINS, integration);
                } else {
                    return this.resolveConflict(conflict, ConflictStrategy.EXTERNAL_WINS, integration);
                }
                
            case ConflictStrategy.MERGE:
                // Merge changes (implementation depends on integration)
                if (integration.mergeConflicts) {
                    const merged = await integration.mergeConflicts(talaTask, externalTask);
                    return {
                        action: 'update_both',
                        data: merged
                    };
                }
                // Fallback to newest wins
                return this.resolveConflict(conflict, ConflictStrategy.NEWEST_WINS, integration);
                
            case ConflictStrategy.MANUAL:
                // Store conflict for manual resolution
                await this.storeConflict(conflict);
                return { action: 'skip' };
                
            default:
                throw new Error(`Unknown conflict strategy: ${strategy}`);
        }
    }
    
    /**
     * Transform task data for external system
     */
    async transformForExternal(task, mappings, integration) {
        const transformed = {};
        
        // Apply field mappings
        for (const [talaField, externalField] of Object.entries(mappings)) {
            if (task[talaField] !== undefined) {
                transformed[externalField] = task[talaField];
            }
        }
        
        // Apply integration-specific transformations
        if (integration.transformForExternal) {
            return await integration.transformForExternal(transformed, task);
        }
        
        return transformed;
    }
    
    /**
     * Transform external data to Tala format
     */
    async transformFromExternal(externalData, mappings, integration) {
        const transformed = {};
        
        // Reverse field mappings
        const reverseMappings = {};
        for (const [talaField, externalField] of Object.entries(mappings)) {
            reverseMappings[externalField] = talaField;
        }
        
        // Apply mappings
        for (const [externalField, value] of Object.entries(externalData)) {
            const talaField = reverseMappings[externalField];
            if (talaField) {
                transformed[talaField] = value;
            }
        }
        
        // Apply integration-specific transformations
        if (integration.transformFromExternal) {
            return await integration.transformFromExternal(transformed, externalData);
        }
        
        return transformed;
    }
    
    /**
     * Start real-time sync for a config
     */
    startRealtimeSync(configId) {
        if (this.syncTimers.has(configId)) {
            return; // Already running
        }
        
        const timer = setInterval(async () => {
            try {
                await this.syncTasks(configId);
            } catch (error) {
                this.logError(`Real-time sync failed for ${configId}:`, error);
            }
        }, this.options.syncInterval);
        
        this.syncTimers.set(configId, timer);
        this.log(`Started real-time sync for ${configId}`);
    }
    
    /**
     * Stop sync for a config
     */
    stopSync(configId) {
        const timer = this.syncTimers.get(configId);
        if (timer) {
            clearInterval(timer);
            this.syncTimers.delete(configId);
            this.log(`Stopped sync for ${configId}`);
        }
    }
    
    /**
     * Save field mappings
     */
    async saveFieldMappings(configId, mappings) {
        if (!this.db) return;
        
        for (const [entityType, fields] of Object.entries(mappings)) {
            for (const [talaField, externalField] of Object.entries(fields)) {
                await this.db.saveFieldMapping({
                    id: uuidv4(),
                    config_id: configId,
                    entity_type: entityType,
                    tala_field: talaField,
                    external_field: externalField,
                    transform: null, // Could add transformation functions
                    created_at: new Date()
                });
            }
        }
        
        // Update cache
        this.fieldMappings.set(configId, mappings);
    }
    
    /**
     * Get field mappings for a config
     */
    async getFieldMappings(configId, entityType) {
        // Check cache
        const cached = this.fieldMappings.get(configId);
        if (cached && cached[entityType]) {
            return cached[entityType];
        }
        
        // Load from database
        if (this.db) {
            const mappings = await this.db.getFieldMappings(configId, entityType);
            const result = {};
            
            for (const mapping of mappings) {
                result[mapping.tala_field] = mapping.external_field;
            }
            
            return result;
        }
        
        return {};
    }
    
    /**
     * Save entity mapping
     */
    async saveMapping(configId, entityType, talaId, externalId) {
        if (!this.db) return;
        
        await this.db.saveEntityMapping({
            id: uuidv4(),
            config_id: configId,
            entity_type: entityType,
            tala_id: talaId,
            external_id: externalId,
            created_at: new Date()
        });
    }
    
    /**
     * Get external ID for a Tala entity
     */
    async getExternalId(configId, entityType, talaId) {
        if (!this.db) return null;
        
        const mapping = await this.db.getEntityMapping({
            config_id: configId,
            entity_type: entityType,
            tala_id: talaId
        });
        
        return mapping?.external_id;
    }
    
    /**
     * Get Tala ID for an external entity
     */
    async getTalaId(configId, entityType, externalId) {
        if (!this.db) return null;
        
        const mapping = await this.db.getEntityMapping({
            config_id: configId,
            entity_type: entityType,
            external_id: externalId
        });
        
        return mapping?.tala_id;
    }
    
    /**
     * Get tasks to sync
     */
    async getTasksToSync(userId, options = {}) {
        if (!this.taskManager) return [];
        
        const { since, taskIds, filters = {} } = options;
        
        const query = {
            user_id: userId,
            ...filters
        };
        
        if (since) {
            query.updated_after = since;
        }
        
        if (taskIds) {
            query.ids = taskIds;
        }
        
        return await this.taskManager.getTasks(query);
    }
    
    /**
     * Store conflict for manual resolution
     */
    async storeConflict(conflict) {
        if (!this.db) return;
        
        await this.db.saveConflict({
            id: uuidv4(),
            config_id: conflict.configId,
            entity_type: 'task',
            tala_data: conflict.talaTask,
            external_data: conflict.externalTask,
            status: 'pending',
            created_at: new Date()
        });
    }
    
    /**
     * Get integration config
     */
    async getIntegrationConfig(configId) {
        if (!this.db) return null;
        return await this.db.getIntegrationConfig(configId);
    }
    
    /**
     * Update integration status
     */
    async updateIntegrationStatus(configId, status) {
        if (!this.db) return;
        
        await this.db.updateIntegrationConfig(configId, {
            status,
            updated_at: new Date()
        });
    }
    
    /**
     * Get last sync time
     */
    async getLastSyncTime(configId) {
        if (!this.db) return null;
        
        const lastSync = await this.db.getLastSyncLog(configId);
        return lastSync?.completed_at;
    }
    
    /**
     * Update sync metadata
     */
    async updateSyncMetadata(entityId, entityType, metadata) {
        if (!this.db) return;
        
        await this.db.updateSyncMetadata({
            entity_id: entityId,
            entity_type: entityType,
            ...metadata
        });
    }
    
    /**
     * Generate sync hash for change detection
     */
    generateSyncHash(data) {
        const str = JSON.stringify(data, Object.keys(data).sort());
        return crypto.createHash('sha256').update(str).digest('hex');
    }
    
    /**
     * Load integration configs from database
     */
    async loadIntegrationConfigs() {
        if (!this.db) return;
        
        const configs = await this.db.getActiveIntegrationConfigs();
        
        for (const config of configs) {
            if (config.sync_mode === SyncMode.REALTIME) {
                this.startRealtimeSync(config.id);
            }
        }
    }
    
    /**
     * Load field mappings from database
     */
    async loadFieldMappings() {
        if (!this.db) return;
        
        const configs = await this.db.getActiveIntegrationConfigs();
        
        for (const config of configs) {
            const mappings = await this.db.getAllFieldMappings(config.id);
            const grouped = {};
            
            for (const mapping of mappings) {
                if (!grouped[mapping.entity_type]) {
                    grouped[mapping.entity_type] = {};
                }
                grouped[mapping.entity_type][mapping.tala_field] = mapping.external_field;
            }
            
            this.fieldMappings.set(config.id, grouped);
        }
    }
    
    /**
     * Start sync schedulers for batch syncs
     */
    startSyncSchedulers() {
        // Batch sync scheduler
        setInterval(async () => {
            if (!this.db) return;
            
            const configs = await this.db.getBatchSyncConfigs();
            
            for (const config of configs) {
                // Check if it's time to sync
                const lastSync = await this.getLastSyncTime(config.id);
                const timeSinceSync = lastSync ? Date.now() - lastSync.getTime() : Infinity;
                
                if (timeSinceSync >= this.options.syncInterval) {
                    // Queue sync
                    this.queueSync(config.id);
                }
            }
        }, 60000); // Check every minute
    }
    
    /**
     * Queue a sync operation
     */
    queueSync(configId) {
        const queue = this.syncQueues.get(configId) || [];
        
        // Avoid duplicate queued syncs
        if (!queue.length) {
            queue.push({
                configId,
                queuedAt: new Date()
            });
            
            // Process queue
            setImmediate(() => this.processSyncQueue(configId));
        }
    }
    
    /**
     * Process sync queue
     */
    async processSyncQueue(configId) {
        const queue = this.syncQueues.get(configId);
        if (!queue || !queue.length) return;
        
        const sync = queue.shift();
        
        try {
            await this.syncTasks(sync.configId);
        } catch (error) {
            this.logError(`Queue sync failed for ${configId}:`, error);
        }
        
        // Process next in queue
        if (queue.length) {
            setImmediate(() => this.processSyncQueue(configId));
        }
    }
    
    /**
     * Encrypt sensitive config data
     */
    encryptConfig(config) {
        const encrypted = { ...config };
        const sensitiveFields = ['apiKey', 'token', 'secret', 'password'];
        
        for (const field of sensitiveFields) {
            if (encrypted[field]) {
                encrypted[field] = this.encrypt(encrypted[field]);
            }
        }
        
        return encrypted;
    }
    
    /**
     * Decrypt config data
     */
    decryptConfig(config) {
        const decrypted = { ...config };
        const sensitiveFields = ['apiKey', 'token', 'secret', 'password'];
        
        for (const field of sensitiveFields) {
            if (decrypted[field]) {
                decrypted[field] = this.decrypt(decrypted[field]);
            }
        }
        
        return decrypted;
    }
    
    /**
     * Simple encryption (replace with proper encryption in production)
     */
    encrypt(text) {
        const algorithm = 'aes-256-gcm';
        const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-change-in-production', 'utf8');
        const iv = crypto.randomBytes(16);
        
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    }
    
    /**
     * Simple decryption
     */
    decrypt(encryptedText) {
        const algorithm = 'aes-256-gcm';
        const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-change-in-production', 'utf8');
        
        const parts = encryptedText.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encrypted = parts[2];
        
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }
    
    /**
     * Get sync statistics
     */
    async getSyncStats(configId) {
        if (!this.db) return null;
        
        const [logs, conflicts] = await Promise.all([
            this.db.getSyncLogs(configId, { limit: 100 }),
            this.db.getPendingConflicts(configId)
        ]);
        
        const stats = {
            totalSyncs: logs.length,
            successfulSyncs: logs.filter(l => l.status === 'completed').length,
            failedSyncs: logs.filter(l => l.status === 'error').length,
            itemsSynced: logs.reduce((sum, l) => sum + (l.items_synced || 0), 0),
            pendingConflicts: conflicts.length,
            lastSync: logs[0]?.completed_at,
            averageSyncTime: this.calculateAverageSyncTime(logs)
        };
        
        return stats;
    }
    
    /**
     * Calculate average sync time
     */
    calculateAverageSyncTime(logs) {
        const completedLogs = logs.filter(l => l.status === 'completed' && l.started_at && l.completed_at);
        if (!completedLogs.length) return 0;
        
        const totalTime = completedLogs.reduce((sum, log) => {
            const duration = new Date(log.completed_at) - new Date(log.started_at);
            return sum + duration;
        }, 0);
        
        return Math.round(totalTime / completedLogs.length);
    }
    
    /**
     * Log message
     */
    log(message, ...args) {
        if (this.options.enableLogging) {
            this.logger.log(`[IntegrationManager] ${message}`, ...args);
        }
    }
    
    /**
     * Log error
     */
    logError(message, error) {
        this.logger.error(`[IntegrationManager] ${message}`, error);
    }
}

export default IntegrationManager;