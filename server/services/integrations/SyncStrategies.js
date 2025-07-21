/**
 * Sync Strategies - Various synchronization strategies for integrations
 * Handles one-way, two-way, and selective sync with conflict resolution
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// Sync strategy types
export const SyncStrategyType = {
    ONE_WAY_PUSH: 'one_way_push',
    ONE_WAY_PULL: 'one_way_pull',
    TWO_WAY_SYNC: 'two_way_sync',
    SELECTIVE_SYNC: 'selective_sync',
    MIRROR_SYNC: 'mirror_sync'
};

// Conflict resolution approaches
export const ConflictResolution = {
    SKIP: 'skip',
    OVERWRITE: 'overwrite',
    MERGE: 'merge',
    DUPLICATE: 'duplicate',
    ASK_USER: 'ask_user'
};

/**
 * Base Sync Strategy class
 */
class BaseSyncStrategy extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            batchSize: 50,
            maxRetries: 3,
            retryDelay: 1000,
            enableLogging: true,
            ...options
        };
        
        this.stats = {
            started: 0,
            completed: 0,
            failed: 0,
            skipped: 0,
            conflicts: 0
        };
    }
    
    /**
     * Execute sync operation
     */
    async execute(config, integration, manager) {
        throw new Error('execute() must be implemented by subclass');
    }
    
    /**
     * Generate change signature for comparison
     */
    generateSignature(data) {
        const normalized = this.normalizeData(data);
        const str = JSON.stringify(normalized);
        return crypto.createHash('sha256').update(str).digest('hex');
    }
    
    /**
     * Normalize data for comparison
     */
    normalizeData(data) {
        const normalized = {};
        const keys = Object.keys(data).sort();
        
        for (const key of keys) {
            // Skip metadata fields
            if (['id', 'created_at', 'updated_at', 'sync_hash'].includes(key)) {
                continue;
            }
            
            const value = data[key];
            if (value !== null && value !== undefined) {
                normalized[key] = value;
            }
        }
        
        return normalized;
    }
    
    /**
     * Check if data has changed
     */
    hasChanged(currentData, lastSyncHash) {
        const currentHash = this.generateSignature(currentData);
        return currentHash !== lastSyncHash;
    }
    
    /**
     * Log message
     */
    log(message, data = null) {
        if (this.options.enableLogging) {
            console.log(`[${this.constructor.name}] ${message}`, data || '');
        }
        this.emit('log', { message, data });
    }
    
    /**
     * Log error
     */
    logError(message, error) {
        console.error(`[${this.constructor.name}] ${message}`, error);
        this.emit('error', { message, error });
    }
    
    /**
     * Update progress
     */
    updateProgress(current, total, message) {
        const progress = {
            current,
            total,
            percentage: Math.round((current / total) * 100),
            message
        };
        
        this.emit('progress', progress);
    }
}

/**
 * One-Way Push Strategy (Tala → External)
 */
export class OneWayPushStrategy extends BaseSyncStrategy {
    async execute(config, integration, manager) {
        this.log('Starting one-way push sync');
        
        const results = {
            strategy: SyncStrategyType.ONE_WAY_PUSH,
            started: new Date(),
            itemsSynced: 0,
            created: 0,
            updated: 0,
            deleted: 0,
            errors: []
        };
        
        try {
            // Get items to push from Tala
            const talaItems = await this.getTalaItems(config, manager);
            this.log(`Found ${talaItems.length} items to sync`);
            
            let processed = 0;
            
            // Process in batches
            for (let i = 0; i < talaItems.length; i += this.options.batchSize) {
                const batch = talaItems.slice(i, i + this.options.batchSize);
                
                for (const item of batch) {
                    try {
                        const result = await this.pushItem(item, config, integration, manager);
                        
                        if (result.created) results.created++;
                        else if (result.updated) results.updated++;
                        
                        results.itemsSynced++;
                        
                    } catch (error) {
                        results.errors.push({
                            itemId: item.id,
                            error: error.message
                        });
                        this.logError(`Failed to push item ${item.id}:`, error);
                    }
                    
                    processed++;
                    this.updateProgress(processed, talaItems.length, `Pushing item ${processed}/${talaItems.length}`);
                }
            }
            
            // Handle deletions
            const deletions = await this.handleDeletions(config, integration, manager);
            results.deleted = deletions;
            
        } catch (error) {
            this.logError('Push sync failed:', error);
            throw error;
        }
        
        results.completed = new Date();
        this.log('Push sync completed', results);
        
        return results;
    }
    
    async getTalaItems(config, manager) {
        // Get items modified since last sync
        const lastSync = await manager.getLastSyncTime(config.id);
        
        const query = {
            user_id: config.user_id,
            updated_after: lastSync
        };
        
        // Apply filters
        if (config.filters) {
            Object.assign(query, config.filters);
        }
        
        return await manager.taskManager.getTasks(query);
    }
    
    async pushItem(item, config, integration, manager) {
        // Get field mappings
        const mappings = await manager.getFieldMappings(config.id, 'task');
        
        // Transform data
        const externalData = await manager.transformForExternal(item, mappings, integration);
        
        // Check if already exists
        const externalId = await manager.getExternalId(config.id, 'task', item.id);
        
        let result;
        if (externalId) {
            // Check if update needed
            const syncMetadata = await manager.db.getSyncMetadata({
                entity_id: item.id,
                entity_type: 'task',
                config_id: config.id
            });
            
            if (syncMetadata && !this.hasChanged(item, syncMetadata.sync_hash)) {
                return { skipped: true };
            }
            
            // Update existing
            result = await integration.updateTask(externalId, externalData, config.config);
            result.updated = true;
        } else {
            // Create new
            result = await integration.createTask(externalData, config.config);
            result.created = true;
            
            // Save mapping
            await manager.saveMapping(config.id, 'task', item.id, result.id);
        }
        
        // Update sync metadata
        await manager.updateSyncMetadata(item.id, 'task', {
            last_synced: new Date(),
            sync_hash: this.generateSignature(item),
            external_id: result.id
        });
        
        return result;
    }
    
    async handleDeletions(config, integration, manager) {
        // Get all mapped items
        const mappings = await manager.db.getEntityMappings({
            config_id: config.id,
            entity_type: 'task'
        });
        
        let deleted = 0;
        
        for (const mapping of mappings) {
            // Check if still exists in Tala
            const exists = await manager.taskManager.taskExists(mapping.tala_id);
            
            if (!exists) {
                try {
                    // Delete from external system
                    await integration.deleteTask(mapping.external_id, config.config);
                    
                    // Remove mapping
                    await manager.db.deleteEntityMapping(mapping.id);
                    
                    deleted++;
                } catch (error) {
                    this.logError(`Failed to delete external task ${mapping.external_id}:`, error);
                }
            }
        }
        
        return deleted;
    }
}

/**
 * One-Way Pull Strategy (External → Tala)
 */
export class OneWayPullStrategy extends BaseSyncStrategy {
    async execute(config, integration, manager) {
        this.log('Starting one-way pull sync');
        
        const results = {
            strategy: SyncStrategyType.ONE_WAY_PULL,
            started: new Date(),
            itemsSynced: 0,
            created: 0,
            updated: 0,
            deleted: 0,
            errors: []
        };
        
        try {
            // Get items from external system
            const lastSync = await manager.getLastSyncTime(config.id);
            const externalItems = await integration.getTasks({
                since: lastSync,
                filters: config.filters
            }, config.config);
            
            this.log(`Found ${externalItems.length} items to sync`);
            
            let processed = 0;
            
            for (const externalItem of externalItems) {
                try {
                    const result = await this.pullItem(externalItem, config, integration, manager);
                    
                    if (result.created) results.created++;
                    else if (result.updated) results.updated++;
                    
                    results.itemsSynced++;
                    
                } catch (error) {
                    results.errors.push({
                        externalId: externalItem.id,
                        error: error.message
                    });
                    this.logError(`Failed to pull item ${externalItem.id}:`, error);
                }
                
                processed++;
                this.updateProgress(processed, externalItems.length, `Pulling item ${processed}/${externalItems.length}`);
            }
            
            // Handle deletions (items that exist in Tala but not in external)
            if (config.sync_deletions) {
                const deletions = await this.handleDeletions(config, integration, manager, externalItems);
                results.deleted = deletions;
            }
            
        } catch (error) {
            this.logError('Pull sync failed:', error);
            throw error;
        }
        
        results.completed = new Date();
        this.log('Pull sync completed', results);
        
        return results;
    }
    
    async pullItem(externalItem, config, integration, manager) {
        // Get field mappings
        const mappings = await manager.getFieldMappings(config.id, 'task');
        
        // Transform data
        const talaData = await manager.transformFromExternal(externalItem, mappings, integration);
        
        // Check if already exists
        const talaId = await manager.getTalaId(config.id, 'task', externalItem.id);
        
        let result;
        if (talaId) {
            // Update existing
            await manager.taskManager.updateTask(talaId, talaData);
            result = { updated: true, id: talaId };
        } else {
            // Create new
            talaData.user_id = config.user_id;
            talaData.source = `integration:${integration.name}`;
            const created = await manager.taskManager.createTask(talaData);
            result = { created: true, id: created.id };
            
            // Save mapping
            await manager.saveMapping(config.id, 'task', created.id, externalItem.id);
        }
        
        // Update sync metadata
        await manager.updateSyncMetadata(result.id, 'task', {
            last_synced: new Date(),
            sync_hash: this.generateSignature(talaData),
            external_id: externalItem.id
        });
        
        return result;
    }
    
    async handleDeletions(config, integration, manager, externalItems) {
        const externalIds = new Set(externalItems.map(item => item.id));
        
        // Get all mapped items
        const mappings = await manager.db.getEntityMappings({
            config_id: config.id,
            entity_type: 'task'
        });
        
        let deleted = 0;
        
        for (const mapping of mappings) {
            if (!externalIds.has(mapping.external_id)) {
                try {
                    // Delete from Tala
                    await manager.taskManager.deleteTask(mapping.tala_id);
                    
                    // Remove mapping
                    await manager.db.deleteEntityMapping(mapping.id);
                    
                    deleted++;
                } catch (error) {
                    this.logError(`Failed to delete Tala task ${mapping.tala_id}:`, error);
                }
            }
        }
        
        return deleted;
    }
}

/**
 * Two-Way Sync Strategy with Conflict Resolution
 */
export class TwoWaySyncStrategy extends BaseSyncStrategy {
    async execute(config, integration, manager) {
        this.log('Starting two-way sync');
        
        const results = {
            strategy: SyncStrategyType.TWO_WAY_SYNC,
            started: new Date(),
            itemsSynced: 0,
            pushed: { created: 0, updated: 0 },
            pulled: { created: 0, updated: 0 },
            conflicts: { resolved: 0, pending: 0 },
            deleted: 0,
            errors: []
        };
        
        try {
            const lastSync = await manager.getLastSyncTime(config.id);
            
            // Get changes from both sides
            const [talaChanges, externalChanges] = await Promise.all([
                this.getTalaChanges(config, manager, lastSync),
                integration.getTasks({ since: lastSync }, config.config)
            ]);
            
            this.log(`Found ${talaChanges.length} Tala changes and ${externalChanges.length} external changes`);
            
            // Build mapping lookup
            const mappingLookup = await this.buildMappingLookup(config, manager);
            
            // Identify conflicts
            const conflicts = await this.identifyConflicts(
                talaChanges,
                externalChanges,
                mappingLookup,
                config,
                manager
            );
            
            this.log(`Identified ${conflicts.length} conflicts`);
            
            // Resolve conflicts
            for (const conflict of conflicts) {
                try {
                    const resolution = await this.resolveConflict(conflict, config, integration, manager);
                    
                    if (resolution.resolved) {
                        results.conflicts.resolved++;
                    } else {
                        results.conflicts.pending++;
                    }
                    
                } catch (error) {
                    results.errors.push({
                        type: 'conflict_resolution',
                        error: error.message,
                        conflict
                    });
                }
            }
            
            // Sync non-conflicting changes
            const conflictIds = new Set(conflicts.map(c => c.id));
            
            // Push Tala changes
            const talaPushItems = talaChanges.filter(item => !conflictIds.has(item.id));
            for (const item of talaPushItems) {
                try {
                    const result = await this.syncTalaToExternal(item, config, integration, manager, mappingLookup);
                    
                    if (result.created) results.pushed.created++;
                    else if (result.updated) results.pushed.updated++;
                    
                    results.itemsSynced++;
                    
                } catch (error) {
                    results.errors.push({
                        type: 'push',
                        itemId: item.id,
                        error: error.message
                    });
                }
            }
            
            // Pull external changes
            const externalPullItems = externalChanges.filter(item => 
                !conflicts.some(c => c.externalId === item.id)
            );
            
            for (const item of externalPullItems) {
                try {
                    const result = await this.syncExternalToTala(item, config, integration, manager, mappingLookup);
                    
                    if (result.created) results.pulled.created++;
                    else if (result.updated) results.pulled.updated++;
                    
                    results.itemsSynced++;
                    
                } catch (error) {
                    results.errors.push({
                        type: 'pull',
                        externalId: item.id,
                        error: error.message
                    });
                }
            }
            
            // Handle deletions
            if (config.sync_deletions) {
                const deletions = await this.handleDeletions(
                    config,
                    integration,
                    manager,
                    talaChanges,
                    externalChanges,
                    mappingLookup
                );
                results.deleted = deletions;
            }
            
        } catch (error) {
            this.logError('Two-way sync failed:', error);
            throw error;
        }
        
        results.completed = new Date();
        this.log('Two-way sync completed', results);
        
        return results;
    }
    
    async getTalaChanges(config, manager, since) {
        const query = {
            user_id: config.user_id
        };
        
        if (since) {
            query.updated_after = since;
        }
        
        if (config.filters) {
            Object.assign(query, config.filters);
        }
        
        return await manager.taskManager.getTasks(query);
    }
    
    async buildMappingLookup(config, manager) {
        const mappings = await manager.db.getEntityMappings({
            config_id: config.id,
            entity_type: 'task'
        });
        
        const lookup = {
            talaToExternal: new Map(),
            externalToTala: new Map()
        };
        
        for (const mapping of mappings) {
            lookup.talaToExternal.set(mapping.tala_id, mapping.external_id);
            lookup.externalToTala.set(mapping.external_id, mapping.tala_id);
        }
        
        return lookup;
    }
    
    async identifyConflicts(talaChanges, externalChanges, mappingLookup, config, manager) {
        const conflicts = [];
        
        // Build change maps
        const talaChangeMap = new Map();
        const externalChangeMap = new Map();
        
        for (const item of talaChanges) {
            const externalId = mappingLookup.talaToExternal.get(item.id);
            if (externalId) {
                talaChangeMap.set(externalId, item);
            }
        }
        
        for (const item of externalChanges) {
            externalChangeMap.set(item.id, item);
        }
        
        // Find items changed in both systems
        for (const [externalId, talaItem] of talaChangeMap) {
            if (externalChangeMap.has(externalId)) {
                const externalItem = externalChangeMap.get(externalId);
                
                // Check if they actually conflict
                const syncMetadata = await manager.db.getSyncMetadata({
                    entity_id: talaItem.id,
                    entity_type: 'task',
                    config_id: config.id
                });
                
                if (syncMetadata) {
                    const talaChanged = this.hasChanged(talaItem, syncMetadata.sync_hash);
                    const externalChanged = new Date(externalItem.updated_at) > new Date(syncMetadata.last_synced_at);
                    
                    if (talaChanged && externalChanged) {
                        conflicts.push({
                            id: talaItem.id,
                            externalId: externalId,
                            talaItem,
                            externalItem,
                            type: 'update_conflict'
                        });
                    }
                }
            }
        }
        
        return conflicts;
    }
    
    async resolveConflict(conflict, config, integration, manager) {
        const strategy = config.conflict_strategy || 'newest_wins';
        
        let resolution;
        
        switch (strategy) {
            case 'tala_wins':
                resolution = await this.resolveTalaWins(conflict, config, integration, manager);
                break;
                
            case 'external_wins':
                resolution = await this.resolveExternalWins(conflict, config, integration, manager);
                break;
                
            case 'newest_wins':
                resolution = await this.resolveNewestWins(conflict, config, integration, manager);
                break;
                
            case 'merge':
                resolution = await this.resolveMerge(conflict, config, integration, manager);
                break;
                
            case 'manual':
                resolution = await this.resolveManual(conflict, config, manager);
                break;
                
            default:
                throw new Error(`Unknown conflict strategy: ${strategy}`);
        }
        
        return resolution;
    }
    
    async resolveTalaWins(conflict, config, integration, manager) {
        // Push Tala version to external
        const mappings = await manager.getFieldMappings(config.id, 'task');
        const externalData = await manager.transformForExternal(conflict.talaItem, mappings, integration);
        
        await integration.updateTask(conflict.externalId, externalData, config.config);
        
        // Update sync metadata
        await manager.updateSyncMetadata(conflict.id, 'task', {
            last_synced: new Date(),
            sync_hash: this.generateSignature(conflict.talaItem)
        });
        
        return { resolved: true, winner: 'tala' };
    }
    
    async resolveExternalWins(conflict, config, integration, manager) {
        // Pull external version to Tala
        const mappings = await manager.getFieldMappings(config.id, 'task');
        const talaData = await manager.transformFromExternal(conflict.externalItem, mappings, integration);
        
        await manager.taskManager.updateTask(conflict.id, talaData);
        
        // Update sync metadata
        await manager.updateSyncMetadata(conflict.id, 'task', {
            last_synced: new Date(),
            sync_hash: this.generateSignature(talaData)
        });
        
        return { resolved: true, winner: 'external' };
    }
    
    async resolveNewestWins(conflict, config, integration, manager) {
        const talaUpdated = new Date(conflict.talaItem.updated_at);
        const externalUpdated = new Date(conflict.externalItem.updated_at);
        
        if (talaUpdated > externalUpdated) {
            return await this.resolveTalaWins(conflict, config, integration, manager);
        } else {
            return await this.resolveExternalWins(conflict, config, integration, manager);
        }
    }
    
    async resolveMerge(conflict, config, integration, manager) {
        // Let integration handle merge if supported
        if (integration.mergeConflicts) {
            const merged = await integration.mergeConflicts(
                conflict.talaItem,
                conflict.externalItem
            );
            
            // Update both sides
            await manager.taskManager.updateTask(conflict.id, merged);
            
            const mappings = await manager.getFieldMappings(config.id, 'task');
            const externalData = await manager.transformForExternal(merged, mappings, integration);
            await integration.updateTask(conflict.externalId, externalData, config.config);
            
            // Update sync metadata
            await manager.updateSyncMetadata(conflict.id, 'task', {
                last_synced: new Date(),
                sync_hash: this.generateSignature(merged)
            });
            
            return { resolved: true, winner: 'merge' };
        }
        
        // Fallback to newest wins
        return await this.resolveNewestWins(conflict, config, integration, manager);
    }
    
    async resolveManual(conflict, config, manager) {
        // Store conflict for manual resolution
        await manager.storeConflict({
            ...conflict,
            configId: config.id
        });
        
        return { resolved: false, pending: true };
    }
    
    async syncTalaToExternal(item, config, integration, manager, mappingLookup) {
        const externalId = mappingLookup.talaToExternal.get(item.id);
        const mappings = await manager.getFieldMappings(config.id, 'task');
        const externalData = await manager.transformForExternal(item, mappings, integration);
        
        let result;
        if (externalId) {
            result = await integration.updateTask(externalId, externalData, config.config);
            result.updated = true;
        } else {
            result = await integration.createTask(externalData, config.config);
            result.created = true;
            
            await manager.saveMapping(config.id, 'task', item.id, result.id);
        }
        
        await manager.updateSyncMetadata(item.id, 'task', {
            last_synced: new Date(),
            sync_hash: this.generateSignature(item),
            external_id: result.id
        });
        
        return result;
    }
    
    async syncExternalToTala(externalItem, config, integration, manager, mappingLookup) {
        const talaId = mappingLookup.externalToTala.get(externalItem.id);
        const mappings = await manager.getFieldMappings(config.id, 'task');
        const talaData = await manager.transformFromExternal(externalItem, mappings, integration);
        
        let result;
        if (talaId) {
            await manager.taskManager.updateTask(talaId, talaData);
            result = { updated: true, id: talaId };
        } else {
            talaData.user_id = config.user_id;
            talaData.source = `integration:${integration.name}`;
            const created = await manager.taskManager.createTask(talaData);
            result = { created: true, id: created.id };
            
            await manager.saveMapping(config.id, 'task', created.id, externalItem.id);
        }
        
        await manager.updateSyncMetadata(result.id, 'task', {
            last_synced: new Date(),
            sync_hash: this.generateSignature(talaData),
            external_id: externalItem.id
        });
        
        return result;
    }
    
    async handleDeletions(config, integration, manager, talaChanges, externalChanges, mappingLookup) {
        let deleted = 0;
        
        // Get all current mappings
        const allMappings = await manager.db.getEntityMappings({
            config_id: config.id,
            entity_type: 'task'
        });
        
        const currentTalaIds = new Set(talaChanges.map(item => item.id));
        const currentExternalIds = new Set(externalChanges.map(item => item.id));
        
        for (const mapping of allMappings) {
            // Check if deleted from Tala
            if (!currentTalaIds.has(mapping.tala_id)) {
                const talaExists = await manager.taskManager.taskExists(mapping.tala_id);
                if (!talaExists) {
                    // Delete from external
                    await integration.deleteTask(mapping.external_id, config.config);
                    await manager.db.deleteEntityMapping(mapping.id);
                    deleted++;
                    continue;
                }
            }
            
            // Check if deleted from external
            if (!currentExternalIds.has(mapping.external_id)) {
                // Delete from Tala
                await manager.taskManager.deleteTask(mapping.tala_id);
                await manager.db.deleteEntityMapping(mapping.id);
                deleted++;
            }
        }
        
        return deleted;
    }
}

/**
 * Selective Sync Strategy with Filters
 */
export class SelectiveSyncStrategy extends TwoWaySyncStrategy {
    async execute(config, integration, manager) {
        this.log('Starting selective sync');
        
        // Validate filters
        if (!config.filters || Object.keys(config.filters).length === 0) {
            throw new Error('Selective sync requires filters to be configured');
        }
        
        // Use two-way sync with filters already applied
        return await super.execute(config, integration, manager);
    }
    
    async getTalaChanges(config, manager, since) {
        const changes = await super.getTalaChanges(config, manager, since);
        
        // Apply additional selective filters
        return changes.filter(item => this.matchesFilters(item, config.filters));
    }
    
    matchesFilters(item, filters) {
        for (const [field, value] of Object.entries(filters)) {
            if (Array.isArray(value)) {
                // Array filter (e.g., tags)
                if (!value.some(v => item[field]?.includes(v))) {
                    return false;
                }
            } else if (typeof value === 'object') {
                // Complex filter
                if (!this.matchesComplexFilter(item[field], value)) {
                    return false;
                }
            } else {
                // Simple equality
                if (item[field] !== value) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    matchesComplexFilter(value, filter) {
        if (filter.gt && value <= filter.gt) return false;
        if (filter.gte && value < filter.gte) return false;
        if (filter.lt && value >= filter.lt) return false;
        if (filter.lte && value > filter.lte) return false;
        if (filter.in && !filter.in.includes(value)) return false;
        if (filter.notIn && filter.notIn.includes(value)) return false;
        if (filter.contains && !value?.includes(filter.contains)) return false;
        
        return true;
    }
}

/**
 * Mirror Sync Strategy - Keep external as exact copy of Tala
 */
export class MirrorSyncStrategy extends BaseSyncStrategy {
    async execute(config, integration, manager) {
        this.log('Starting mirror sync');
        
        const results = {
            strategy: SyncStrategyType.MIRROR_SYNC,
            started: new Date(),
            itemsSynced: 0,
            created: 0,
            updated: 0,
            deleted: 0,
            errors: []
        };
        
        try {
            // Get all Tala items (not just changed)
            const talaItems = await this.getAllTalaItems(config, manager);
            const externalItems = await integration.getTasks({}, config.config);
            
            // Build lookup maps
            const mappingLookup = await this.buildMappingLookup(config, manager);
            const externalMap = new Map(externalItems.map(item => [item.id, item]));
            
            // Sync all Tala items to external
            for (const talaItem of talaItems) {
                try {
                    const externalId = mappingLookup.talaToExternal.get(talaItem.id);
                    const mappings = await manager.getFieldMappings(config.id, 'task');
                    const externalData = await manager.transformForExternal(talaItem, mappings, integration);
                    
                    let result;
                    if (externalId) {
                        // Update
                        result = await integration.updateTask(externalId, externalData, config.config);
                        results.updated++;
                        
                        // Remove from external map (for deletion tracking)
                        externalMap.delete(externalId);
                    } else {
                        // Create
                        result = await integration.createTask(externalData, config.config);
                        results.created++;
                        
                        await manager.saveMapping(config.id, 'task', talaItem.id, result.id);
                    }
                    
                    results.itemsSynced++;
                    
                } catch (error) {
                    results.errors.push({
                        itemId: talaItem.id,
                        error: error.message
                    });
                }
            }
            
            // Delete items that exist in external but not in Tala
            for (const [externalId, externalItem] of externalMap) {
                try {
                    await integration.deleteTask(externalId, config.config);
                    
                    // Remove mapping
                    const mapping = await manager.db.getEntityMapping({
                        config_id: config.id,
                        entity_type: 'task',
                        external_id: externalId
                    });
                    
                    if (mapping) {
                        await manager.db.deleteEntityMapping(mapping.id);
                    }
                    
                    results.deleted++;
                    
                } catch (error) {
                    results.errors.push({
                        externalId,
                        error: error.message
                    });
                }
            }
            
        } catch (error) {
            this.logError('Mirror sync failed:', error);
            throw error;
        }
        
        results.completed = new Date();
        this.log('Mirror sync completed', results);
        
        return results;
    }
    
    async getAllTalaItems(config, manager) {
        const query = {
            user_id: config.user_id
        };
        
        if (config.filters) {
            Object.assign(query, config.filters);
        }
        
        return await manager.taskManager.getTasks(query);
    }
    
    async buildMappingLookup(config, manager) {
        const mappings = await manager.db.getEntityMappings({
            config_id: config.id,
            entity_type: 'task'
        });
        
        const lookup = {
            talaToExternal: new Map(),
            externalToTala: new Map()
        };
        
        for (const mapping of mappings) {
            lookup.talaToExternal.set(mapping.tala_id, mapping.external_id);
            lookup.externalToTala.set(mapping.external_id, mapping.tala_id);
        }
        
        return lookup;
    }
}

// Export strategy factory
export function createSyncStrategy(type, options = {}) {
    switch (type) {
        case SyncStrategyType.ONE_WAY_PUSH:
            return new OneWayPushStrategy(options);
            
        case SyncStrategyType.ONE_WAY_PULL:
            return new OneWayPullStrategy(options);
            
        case SyncStrategyType.TWO_WAY_SYNC:
            return new TwoWaySyncStrategy(options);
            
        case SyncStrategyType.SELECTIVE_SYNC:
            return new SelectiveSyncStrategy(options);
            
        case SyncStrategyType.MIRROR_SYNC:
            return new MirrorSyncStrategy(options);
            
        default:
            throw new Error(`Unknown sync strategy type: ${type}`);
    }
}