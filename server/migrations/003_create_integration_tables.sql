-- Integration Configuration Tables
-- Manages third-party task management integrations

-- Integration configurations per user
CREATE TABLE IF NOT EXISTS integration_configs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    integration_id VARCHAR(50) NOT NULL, -- 'notion', 'linear', etc.
    config JSON NOT NULL, -- Encrypted configuration data
    status VARCHAR(20) DEFAULT 'inactive', -- inactive, active, error, syncing, paused
    sync_direction VARCHAR(20) DEFAULT 'bidirectional', -- push, pull, bidirectional
    sync_mode VARCHAR(20) DEFAULT 'batch', -- realtime, batch, manual
    conflict_strategy VARCHAR(20) DEFAULT 'newest_wins', -- tala_wins, external_wins, newest_wins, manual, merge
    filters JSON, -- Sync filters
    enabled BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP,
    next_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user_integration (user_id, integration_id),
    INDEX idx_status (status),
    INDEX idx_enabled (enabled),
    INDEX idx_next_sync (next_sync_at)
);

-- Field mappings between Tala and external systems
CREATE TABLE IF NOT EXISTS field_mappings (
    id VARCHAR(36) PRIMARY KEY,
    config_id VARCHAR(36) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'task', 'project', etc.
    tala_field VARCHAR(100) NOT NULL,
    external_field VARCHAR(100) NOT NULL,
    transform JSON, -- Optional transformation rules
    bidirectional BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (config_id) REFERENCES integration_configs(id) ON DELETE CASCADE,
    UNIQUE KEY unique_mapping (config_id, entity_type, tala_field),
    INDEX idx_config_entity (config_id, entity_type)
);

-- Entity mappings between Tala and external IDs
CREATE TABLE IF NOT EXISTS entity_mappings (
    id VARCHAR(36) PRIMARY KEY,
    config_id VARCHAR(36) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    tala_id VARCHAR(36) NOT NULL,
    external_id VARCHAR(255) NOT NULL,
    external_url TEXT,
    sync_hash VARCHAR(64), -- For change detection
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (config_id) REFERENCES integration_configs(id) ON DELETE CASCADE,
    UNIQUE KEY unique_entity_mapping (config_id, entity_type, tala_id),
    UNIQUE KEY unique_external_mapping (config_id, entity_type, external_id),
    INDEX idx_tala_id (tala_id),
    INDEX idx_external_id (external_id)
);

-- Sync logs for tracking sync operations
CREATE TABLE IF NOT EXISTS sync_logs (
    id VARCHAR(36) PRIMARY KEY,
    config_id VARCHAR(36) NOT NULL,
    sync_type VARCHAR(20) NOT NULL, -- 'manual', 'scheduled', 'realtime'
    direction VARCHAR(20) NOT NULL, -- 'push', 'pull', 'bidirectional'
    status VARCHAR(20) NOT NULL, -- 'in_progress', 'completed', 'error'
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    items_synced INT DEFAULT 0,
    items_created INT DEFAULT 0,
    items_updated INT DEFAULT 0,
    items_deleted INT DEFAULT 0,
    conflicts_resolved INT DEFAULT 0,
    errors JSON,
    error_message TEXT,
    metadata JSON,
    
    FOREIGN KEY (config_id) REFERENCES integration_configs(id) ON DELETE CASCADE,
    INDEX idx_config_status (config_id, status),
    INDEX idx_started_at (started_at),
    INDEX idx_completed_at (completed_at)
);

-- Conflict resolutions for manual review
CREATE TABLE IF NOT EXISTS conflict_resolutions (
    id VARCHAR(36) PRIMARY KEY,
    config_id VARCHAR(36) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(36) NOT NULL,
    conflict_type VARCHAR(50) NOT NULL, -- 'update_conflict', 'delete_conflict', etc.
    tala_data JSON NOT NULL,
    external_data JSON NOT NULL,
    suggested_resolution JSON,
    resolution_strategy VARCHAR(20), -- Applied strategy
    resolved_data JSON, -- Final resolved data
    status VARCHAR(20) DEFAULT 'pending', -- pending, resolved, ignored
    resolved_by VARCHAR(36),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (config_id) REFERENCES integration_configs(id) ON DELETE CASCADE,
    INDEX idx_config_status (config_id, status),
    INDEX idx_entity (entity_type, entity_id)
);

-- Sync metadata for tracking entity sync state
CREATE TABLE IF NOT EXISTS sync_metadata (
    entity_id VARCHAR(36) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    config_id VARCHAR(36) NOT NULL,
    last_synced_at TIMESTAMP,
    sync_hash VARCHAR(64),
    sync_version INT DEFAULT 1,
    external_updated_at TIMESTAMP,
    metadata JSON,
    
    PRIMARY KEY (entity_id, entity_type, config_id),
    FOREIGN KEY (config_id) REFERENCES integration_configs(id) ON DELETE CASCADE,
    INDEX idx_last_synced (last_synced_at),
    INDEX idx_config (config_id)
);

-- Integration analytics for monitoring
CREATE TABLE IF NOT EXISTS integration_analytics (
    id VARCHAR(36) PRIMARY KEY,
    config_id VARCHAR(36) NOT NULL,
    date DATE NOT NULL,
    sync_count INT DEFAULT 0,
    success_count INT DEFAULT 0,
    error_count INT DEFAULT 0,
    items_pushed INT DEFAULT 0,
    items_pulled INT DEFAULT 0,
    conflicts_count INT DEFAULT 0,
    avg_sync_duration_ms INT,
    total_sync_duration_ms BIGINT DEFAULT 0,
    error_types JSON, -- Count by error type
    peak_hour INT, -- Hour with most syncs
    
    FOREIGN KEY (config_id) REFERENCES integration_configs(id) ON DELETE CASCADE,
    UNIQUE KEY unique_daily_analytics (config_id, date),
    INDEX idx_date (date)
);

-- Webhook configurations for real-time sync
CREATE TABLE IF NOT EXISTS webhook_configs (
    id VARCHAR(36) PRIMARY KEY,
    config_id VARCHAR(36) NOT NULL,
    webhook_url TEXT NOT NULL,
    secret VARCHAR(255),
    events JSON, -- Array of subscribed events
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, failed
    last_triggered_at TIMESTAMP,
    failure_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (config_id) REFERENCES integration_configs(id) ON DELETE CASCADE,
    INDEX idx_config (config_id),
    INDEX idx_status (status)
);

-- Queue for async sync operations
CREATE TABLE IF NOT EXISTS sync_queue (
    id VARCHAR(36) PRIMARY KEY,
    config_id VARCHAR(36) NOT NULL,
    operation VARCHAR(20) NOT NULL, -- 'sync', 'push', 'pull'
    entity_type VARCHAR(50),
    entity_id VARCHAR(36),
    priority INT DEFAULT 5, -- 1-10, lower is higher priority
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    scheduled_for TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    metadata JSON,
    
    FOREIGN KEY (config_id) REFERENCES integration_configs(id) ON DELETE CASCADE,
    INDEX idx_status_scheduled (status, scheduled_for),
    INDEX idx_config_status (config_id, status),
    INDEX idx_priority (priority, scheduled_for)
);

-- Create views for monitoring
CREATE OR REPLACE VIEW integration_health AS
SELECT 
    ic.id,
    ic.user_id,
    ic.integration_id,
    ic.status,
    ic.enabled,
    ic.last_sync_at,
    COUNT(DISTINCT em.id) as mapped_entities,
    COUNT(DISTINCT sl.id) as total_syncs,
    SUM(CASE WHEN sl.status = 'completed' THEN 1 ELSE 0 END) as successful_syncs,
    SUM(CASE WHEN sl.status = 'error' THEN 1 ELSE 0 END) as failed_syncs,
    MAX(sl.completed_at) as last_successful_sync,
    AVG(TIMESTAMPDIFF(SECOND, sl.started_at, sl.completed_at)) as avg_sync_duration_seconds
FROM integration_configs ic
LEFT JOIN entity_mappings em ON em.config_id = ic.id
LEFT JOIN sync_logs sl ON sl.config_id = ic.id AND sl.completed_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY ic.id;

-- Create view for sync performance
CREATE OR REPLACE VIEW sync_performance AS
SELECT 
    ic.integration_id,
    DATE(sl.started_at) as sync_date,
    COUNT(*) as sync_count,
    AVG(sl.items_synced) as avg_items_synced,
    AVG(TIMESTAMPDIFF(MILLISECOND, sl.started_at, sl.completed_at)) as avg_duration_ms,
    SUM(CASE WHEN sl.status = 'error' THEN 1 ELSE 0 END) as error_count,
    SUM(sl.conflicts_resolved) as total_conflicts
FROM sync_logs sl
JOIN integration_configs ic ON ic.id = sl.config_id
WHERE sl.started_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY ic.integration_id, DATE(sl.started_at);

-- Create stored procedure for cleanup
DELIMITER //
CREATE PROCEDURE cleanup_old_sync_data()
BEGIN
    -- Delete old sync logs (keep 90 days)
    DELETE FROM sync_logs 
    WHERE completed_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
    
    -- Delete old resolved conflicts (keep 30 days)
    DELETE FROM conflict_resolutions 
    WHERE status = 'resolved' AND resolved_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
    
    -- Delete old completed queue items (keep 7 days)
    DELETE FROM sync_queue 
    WHERE status IN ('completed', 'failed') AND completed_at < DATE_SUB(NOW(), INTERVAL 7 DAY);
    
    -- Archive old analytics (aggregate monthly after 90 days)
    INSERT INTO integration_analytics (
        id, config_id, date, sync_count, success_count, error_count,
        items_pushed, items_pulled, conflicts_count, avg_sync_duration_ms
    )
    SELECT 
        UUID() as id,
        config_id,
        DATE_FORMAT(date, '%Y-%m-01') as date,
        SUM(sync_count),
        SUM(success_count),
        SUM(error_count),
        SUM(items_pushed),
        SUM(items_pulled),
        SUM(conflicts_count),
        AVG(avg_sync_duration_ms)
    FROM integration_analytics
    WHERE date < DATE_SUB(NOW(), INTERVAL 90 DAY)
    GROUP BY config_id, DATE_FORMAT(date, '%Y-%m-01')
    ON DUPLICATE KEY UPDATE
        sync_count = VALUES(sync_count),
        success_count = VALUES(success_count),
        error_count = VALUES(error_count),
        items_pushed = VALUES(items_pushed),
        items_pulled = VALUES(items_pulled),
        conflicts_count = VALUES(conflicts_count),
        avg_sync_duration_ms = VALUES(avg_sync_duration_ms);
    
    DELETE FROM integration_analytics
    WHERE date < DATE_SUB(NOW(), INTERVAL 90 DAY)
    AND DAY(date) != 1;
END//
DELIMITER ;

-- Create event to run cleanup daily
CREATE EVENT IF NOT EXISTS integration_cleanup_event
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_DATE + INTERVAL 1 DAY + INTERVAL 2 HOUR
DO CALL cleanup_old_sync_data();

-- Sample data for testing (remove in production)
-- INSERT INTO integration_configs (id, user_id, integration_id, config, status, sync_direction, sync_mode)
-- VALUES 
-- ('config_1', 'user_123', 'notion', '{"apiKey": "encrypted_key", "databaseId": "db_123"}', 'active', 'bidirectional', 'batch'),
-- ('config_2', 'user_456', 'linear', '{"apiKey": "encrypted_key", "teamId": "team_123"}', 'active', 'push', 'realtime');