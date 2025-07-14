-- Migration: Create Audit Logs Table for Comprehensive Security Logging
-- This migration creates the audit_logs table for tracking all security-relevant events

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for audit event categories
DO $$ BEGIN
    CREATE TYPE audit_category AS ENUM (
        'authentication', 'api_key', 'document', 'encryption', 
        'permission', 'organization', 'security', 'admin', 'system'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for risk levels
DO $$ BEGIN
    CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(32) PRIMARY KEY,
    
    -- Event identification
    event_type VARCHAR(100) NOT NULL,
    category audit_category NOT NULL,
    
    -- User and session context
    user_id VARCHAR(255),
    session_id VARCHAR(255),
    organization_id VARCHAR(255),
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(255),
    correlation_id VARCHAR(255),
    
    -- Resource information
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    
    -- Event details
    event_data JSONB DEFAULT '{}'::jsonb,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    
    -- Risk assessment
    risk_level risk_level DEFAULT 'low',
    
    -- Timing
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT audit_logs_event_type_length CHECK (char_length(event_type) > 0),
    CONSTRAINT audit_logs_valid_timestamp CHECK (timestamp IS NOT NULL)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_audit_logs_risk_level ON audit_logs(risk_level);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON audit_logs(success);
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON audit_logs(session_id);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category_timestamp ON audit_logs(category, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_risk_timestamp ON audit_logs(risk_level, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_timestamp ON audit_logs(organization_id, timestamp DESC);

-- GIN index for event_data JSONB queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_data ON audit_logs USING GIN (event_data);

-- Partial indexes for specific use cases
CREATE INDEX IF NOT EXISTS idx_audit_logs_failed_events ON audit_logs(timestamp DESC) WHERE success = false;
CREATE INDEX IF NOT EXISTS idx_audit_logs_high_risk ON audit_logs(timestamp DESC) WHERE risk_level IN ('high', 'critical');
CREATE INDEX IF NOT EXISTS idx_audit_logs_auth_events ON audit_logs(timestamp DESC) WHERE category = 'authentication';
CREATE INDEX IF NOT EXISTS idx_audit_logs_security_events ON audit_logs(timestamp DESC) WHERE category = 'security';

-- Create function for audit log statistics
CREATE OR REPLACE FUNCTION get_audit_stats(
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '24 hours',
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    total_events BIGINT,
    success_rate NUMERIC,
    category_stats JSONB,
    risk_stats JSONB,
    top_users JSONB,
    top_ips JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT 
            COUNT(*) as total_events,
            ROUND(
                (COUNT(*) FILTER (WHERE success = true)::NUMERIC / COUNT(*)::NUMERIC) * 100, 
                2
            ) as success_rate,
            
            -- Category statistics
            jsonb_object_agg(
                DISTINCT category, 
                COUNT(*) FILTER (WHERE a.category = audit_logs.category)
            ) as category_stats,
            
            -- Risk level statistics
            jsonb_object_agg(
                DISTINCT risk_level, 
                COUNT(*) FILTER (WHERE a.risk_level = audit_logs.risk_level)
            ) as risk_stats
            
        FROM audit_logs a
        WHERE a.timestamp BETWEEN p_start_date AND p_end_date
    ),
    user_stats AS (
        SELECT jsonb_object_agg(user_id, event_count) as top_users
        FROM (
            SELECT user_id, COUNT(*) as event_count
            FROM audit_logs
            WHERE timestamp BETWEEN p_start_date AND p_end_date
              AND user_id IS NOT NULL
            GROUP BY user_id
            ORDER BY event_count DESC
            LIMIT 10
        ) t
    ),
    ip_stats AS (
        SELECT jsonb_object_agg(ip_address::text, event_count) as top_ips
        FROM (
            SELECT ip_address, COUNT(*) as event_count
            FROM audit_logs
            WHERE timestamp BETWEEN p_start_date AND p_end_date
              AND ip_address IS NOT NULL
            GROUP BY ip_address
            ORDER BY event_count DESC
            LIMIT 10
        ) t
    )
    
    SELECT 
        s.total_events,
        s.success_rate,
        s.category_stats,
        s.risk_stats,
        u.top_users,
        i.top_ips
    FROM stats s
    CROSS JOIN user_stats u
    CROSS JOIN ip_stats i;
END;
$$ LANGUAGE plpgsql;

-- Create function for security incident detection
CREATE OR REPLACE FUNCTION detect_security_incidents(
    p_time_window INTERVAL DEFAULT '1 hour',
    p_threshold INTEGER DEFAULT 5
)
RETURNS TABLE (
    ip_address INET,
    user_id VARCHAR(255),
    event_count BIGINT,
    latest_event TIMESTAMP WITH TIME ZONE,
    event_types TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    WITH incident_candidates AS (
        SELECT 
            a.ip_address,
            a.user_id,
            COUNT(*) as event_count,
            MAX(a.timestamp) as latest_event,
            array_agg(DISTINCT a.event_type) as event_types
        FROM audit_logs a
        WHERE a.timestamp >= NOW() - p_time_window
          AND (
              a.success = false 
              OR a.risk_level IN ('high', 'critical')
              OR a.category = 'security'
          )
        GROUP BY a.ip_address, a.user_id
        HAVING COUNT(*) >= p_threshold
    )
    
    SELECT 
        i.ip_address,
        i.user_id,
        i.event_count,
        i.latest_event,
        i.event_types
    FROM incident_candidates i
    ORDER BY i.event_count DESC, i.latest_event DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function for audit log cleanup
CREATE OR REPLACE FUNCTION cleanup_audit_logs(
    p_retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_logs 
    WHERE timestamp < NOW() - (p_retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup action
    INSERT INTO audit_logs (
        id, event_type, category, event_data, timestamp
    ) VALUES (
        gen_random_uuid()::text,
        'audit_cleanup',
        'system',
        jsonb_build_object(
            'deleted_count', deleted_count,
            'retention_days', p_retention_days
        ),
        NOW()
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function for real-time security monitoring
CREATE OR REPLACE FUNCTION get_security_alerts(
    p_minutes INTEGER DEFAULT 15
)
RETURNS TABLE (
    alert_type TEXT,
    severity risk_level,
    count BIGINT,
    latest_occurrence TIMESTAMP WITH TIME ZONE,
    affected_resources TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    WITH recent_events AS (
        SELECT *
        FROM audit_logs
        WHERE timestamp >= NOW() - (p_minutes || ' minutes')::INTERVAL
    ),
    
    -- Failed authentication attempts
    auth_failures AS (
        SELECT 
            'authentication_failures' as alert_type,
            'medium'::risk_level as severity,
            COUNT(*) as count,
            MAX(timestamp) as latest_occurrence,
            array_agg(DISTINCT ip_address::text) as affected_resources
        FROM recent_events
        WHERE category = 'authentication' 
          AND success = false
        HAVING COUNT(*) >= 3
    ),
    
    -- High risk events
    high_risk_events AS (
        SELECT 
            'high_risk_events' as alert_type,
            'high'::risk_level as severity,
            COUNT(*) as count,
            MAX(timestamp) as latest_occurrence,
            array_agg(DISTINCT event_type) as affected_resources
        FROM recent_events
        WHERE risk_level IN ('high', 'critical')
        HAVING COUNT(*) >= 1
    ),
    
    -- Suspicious IP activity
    suspicious_ips AS (
        SELECT 
            'suspicious_ip_activity' as alert_type,
            'medium'::risk_level as severity,
            COUNT(*) as count,
            MAX(timestamp) as latest_occurrence,
            array_agg(DISTINCT ip_address::text) as affected_resources
        FROM recent_events
        WHERE ip_address IS NOT NULL
        GROUP BY ip_address
        HAVING COUNT(*) >= 20
    )
    
    SELECT * FROM auth_failures
    UNION ALL
    SELECT * FROM high_risk_events
    UNION ALL
    SELECT * FROM suspicious_ips
    ORDER BY severity DESC, count DESC;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic partitioning (for high-volume installations)
-- This can be uncommented and customized based on volume requirements
/*
CREATE OR REPLACE FUNCTION create_monthly_audit_partition()
RETURNS TRIGGER AS $$
DECLARE
    partition_date DATE;
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    partition_date := DATE_TRUNC('month', NEW.timestamp);
    partition_name := 'audit_logs_' || TO_CHAR(partition_date, 'YYYY_MM');
    start_date := partition_date;
    end_date := partition_date + INTERVAL '1 month';
    
    -- Create partition if it doesn't exist
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_logs
        FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (commented out - enable if partitioning is needed)
-- CREATE TRIGGER audit_logs_partition_trigger
--     BEFORE INSERT ON audit_logs
--     FOR EACH ROW EXECUTE FUNCTION create_monthly_audit_partition();
*/

-- Create view for security dashboard
CREATE OR REPLACE VIEW security_dashboard AS
SELECT 
    DATE_TRUNC('hour', timestamp) as hour,
    category,
    risk_level,
    success,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT ip_address) as unique_ips
FROM audit_logs
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY 
    DATE_TRUNC('hour', timestamp),
    category,
    risk_level,
    success
ORDER BY hour DESC;

-- Create view for user activity summary
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT 
    user_id,
    organization_id,
    DATE_TRUNC('day', timestamp) as activity_date,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE success = true) as successful_events,
    COUNT(*) FILTER (WHERE success = false) as failed_events,
    COUNT(DISTINCT event_type) as unique_event_types,
    MAX(timestamp) as last_activity,
    array_agg(DISTINCT category) as categories_accessed
FROM audit_logs
WHERE user_id IS NOT NULL
  AND timestamp >= NOW() - INTERVAL '30 days'
GROUP BY user_id, organization_id, DATE_TRUNC('day', timestamp)
ORDER BY activity_date DESC, total_events DESC;

-- Add helpful comments
COMMENT ON TABLE audit_logs IS 'Comprehensive audit logging for all security-relevant events';
COMMENT ON COLUMN audit_logs.event_type IS 'Specific type of event (e.g., login_success, document_created)';
COMMENT ON COLUMN audit_logs.category IS 'High-level category of the event';
COMMENT ON COLUMN audit_logs.event_data IS 'Additional structured data about the event';
COMMENT ON COLUMN audit_logs.risk_level IS 'Assessed risk level of the event';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type of resource involved (e.g., document, user, api_key)';
COMMENT ON COLUMN audit_logs.resource_id IS 'ID of the specific resource involved';

COMMENT ON FUNCTION get_audit_stats IS 'Generate comprehensive audit statistics for a time period';
COMMENT ON FUNCTION detect_security_incidents IS 'Detect potential security incidents based on event patterns';
COMMENT ON FUNCTION cleanup_audit_logs IS 'Remove old audit logs based on retention policy';
COMMENT ON FUNCTION get_security_alerts IS 'Get real-time security alerts based on recent events';

COMMENT ON VIEW security_dashboard IS 'Hourly security metrics for dashboard visualization';
COMMENT ON VIEW user_activity_summary IS 'Daily summary of user activity for the past 30 days';

-- Grant permissions (adjust as needed for your user)
-- GRANT SELECT, INSERT ON audit_logs TO your_app_user;
-- GRANT USAGE ON TYPE audit_category, risk_level TO your_app_user;
-- GRANT EXECUTE ON FUNCTION get_audit_stats, detect_security_incidents, cleanup_audit_logs, get_security_alerts TO your_app_user;