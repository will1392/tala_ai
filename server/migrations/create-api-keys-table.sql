-- Migration: Create API Keys Table for Programmatic Access
-- This migration creates the necessary tables and structures for API key management

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for API key status
DO $$ BEGIN
    CREATE TYPE api_key_status AS ENUM ('active', 'inactive', 'revoked', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for rate limit periods
DO $$ BEGIN
    CREATE TYPE rate_limit_period AS ENUM ('minute', 'hour', 'day', 'month');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create API keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Key identification and storage
    key_hash VARCHAR(255) UNIQUE NOT NULL,  -- SHA-256 hash of the actual key
    key_prefix VARCHAR(20) NOT NULL,        -- Visible prefix for identification (e.g., 'tlai_live_abc123')
    
    -- Key metadata
    name VARCHAR(100) NOT NULL,             -- Human-readable name for the key
    description TEXT,                       -- Optional description of key purpose
    
    -- Ownership and organization
    organization_id VARCHAR(255),           -- Organization this key belongs to
    created_by_user_id VARCHAR(255) NOT NULL, -- User who created the key
    
    -- Permissions and access control
    permissions JSONB DEFAULT '[]'::jsonb,  -- Array of permission strings
    scopes JSONB DEFAULT '[]'::jsonb,       -- API scopes (read, write, admin, etc.)
    
    -- Rate limiting
    rate_limit_requests INTEGER DEFAULT 1000,                    -- Max requests per period
    rate_limit_period rate_limit_period DEFAULT 'hour',          -- Rate limit period
    rate_limit_burst INTEGER DEFAULT 100,                        -- Burst allowance
    requests_count INTEGER DEFAULT 0,                            -- Current period request count
    rate_limit_reset_at TIMESTAMP WITH TIME ZONE,                -- When rate limit resets
    
    -- Usage tracking
    last_used_at TIMESTAMP WITH TIME ZONE,                       -- Last time key was used
    last_used_ip INET,                                           -- Last IP address that used the key
    last_used_user_agent TEXT,                                   -- Last user agent that used the key
    total_requests INTEGER DEFAULT 0,                            -- Total lifetime requests
    
    -- Key lifecycle
    status api_key_status DEFAULT 'active',                      -- Current status of the key
    expires_at TIMESTAMP WITH TIME ZONE,                         -- Optional expiration date
    is_active BOOLEAN DEFAULT true,                              -- Quick active/inactive toggle
    
    -- Audit timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE,                         -- When key was revoked
    revoked_by_user_id VARCHAR(255),                             -- Who revoked the key
    revoked_reason TEXT,                                          -- Reason for revocation
    
    -- Constraints
    CONSTRAINT api_keys_name_length CHECK (char_length(name) >= 1),
    CONSTRAINT api_keys_rate_limit_positive CHECK (rate_limit_requests > 0),
    CONSTRAINT api_keys_expires_after_created CHECK (expires_at IS NULL OR expires_at > created_at),
    CONSTRAINT api_keys_revoked_when_status_revoked CHECK (
        (status = 'revoked' AND revoked_at IS NOT NULL) OR 
        (status != 'revoked' AND revoked_at IS NULL)
    )
);

-- Create API key usage logs table for detailed analytics
CREATE TABLE IF NOT EXISTS api_key_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    
    -- Request details
    endpoint VARCHAR(500) NOT NULL,                              -- API endpoint accessed
    method VARCHAR(10) NOT NULL,                                 -- HTTP method (GET, POST, etc.)
    status_code INTEGER NOT NULL,                                -- HTTP response status
    response_size INTEGER,                                       -- Response size in bytes
    response_time_ms INTEGER,                                    -- Response time in milliseconds
    
    -- Request context
    ip_address INET,                                             -- Client IP address
    user_agent TEXT,                                             -- Client user agent
    referer TEXT,                                                -- HTTP referer
    
    -- Error tracking
    error_code VARCHAR(50),                                      -- Application error code if any
    error_message TEXT,                                          -- Error message if any
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT api_key_usage_logs_status_code_valid CHECK (status_code >= 100 AND status_code < 600),
    CONSTRAINT api_key_usage_logs_response_time_positive CHECK (response_time_ms IS NULL OR response_time_ms >= 0)
);

-- Create API key rotation history table
CREATE TABLE IF NOT EXISTS api_key_rotation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    
    -- Old key information
    old_key_hash VARCHAR(255) NOT NULL,                         -- Hash of the rotated key
    old_key_prefix VARCHAR(20) NOT NULL,                        -- Prefix of the rotated key
    
    -- Rotation details
    rotated_by_user_id VARCHAR(255) NOT NULL,                   -- User who performed rotation
    rotation_reason TEXT,                                        -- Reason for rotation
    
    -- Timestamps
    rotated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance

-- API keys indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_organization_id ON api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_created_by_user_id ON api_keys(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON api_keys(expires_at);
CREATE INDEX IF NOT EXISTS idx_api_keys_last_used_at ON api_keys(last_used_at);
CREATE INDEX IF NOT EXISTS idx_api_keys_created_at ON api_keys(created_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_api_keys_active_lookup ON api_keys(key_hash, status, is_active) WHERE status = 'active' AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_keys_user_active ON api_keys(created_by_user_id, status, is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_org_active ON api_keys(organization_id, status, is_active);

-- Usage logs indexes
CREATE INDEX IF NOT EXISTS idx_api_key_usage_logs_api_key_id ON api_key_usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_logs_created_at ON api_key_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_logs_endpoint ON api_key_usage_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_logs_status_code ON api_key_usage_logs(status_code);

-- Composite index for analytics queries
CREATE INDEX IF NOT EXISTS idx_api_key_usage_analytics ON api_key_usage_logs(api_key_id, created_at, status_code);

-- Rotation history indexes
CREATE INDEX IF NOT EXISTS idx_api_key_rotation_history_api_key_id ON api_key_rotation_history(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_rotation_history_rotated_at ON api_key_rotation_history(rotated_at);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_api_key_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_api_key_updated_at ON api_keys;
CREATE TRIGGER trigger_update_api_key_updated_at
    BEFORE UPDATE ON api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_api_key_updated_at();

-- Create function to automatically update status based on expiration
CREATE OR REPLACE FUNCTION update_expired_api_keys()
RETURNS void AS $$
BEGIN
    UPDATE api_keys 
    SET status = 'expired', 
        is_active = false, 
        updated_at = CURRENT_TIMESTAMP
    WHERE status = 'active' 
      AND expires_at IS NOT NULL 
      AND expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Create function to reset rate limits
CREATE OR REPLACE FUNCTION reset_api_key_rate_limits()
RETURNS void AS $$
BEGIN
    UPDATE api_keys 
    SET requests_count = 0,
        rate_limit_reset_at = CASE 
            WHEN rate_limit_period = 'minute' THEN CURRENT_TIMESTAMP + INTERVAL '1 minute'
            WHEN rate_limit_period = 'hour' THEN CURRENT_TIMESTAMP + INTERVAL '1 hour'
            WHEN rate_limit_period = 'day' THEN CURRENT_TIMESTAMP + INTERVAL '1 day'
            WHEN rate_limit_period = 'month' THEN CURRENT_TIMESTAMP + INTERVAL '1 month'
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE rate_limit_reset_at IS NULL 
       OR rate_limit_reset_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Insert sample data for development (optional)
DO $$
BEGIN
    -- Only insert if this is a development environment
    IF current_setting('application_name', true) = 'development' OR 
       current_setting('server_version_num')::int < 130000 THEN -- Fallback check
        
        -- Sample API key for development
        INSERT INTO api_keys (
            key_hash,
            key_prefix,
            name,
            description,
            created_by_user_id,
            organization_id,
            permissions,
            scopes,
            rate_limit_requests,
            rate_limit_period
        ) VALUES (
            -- This is a hash of "tlai_test_1234567890abcdef1234567890abcdef"
            'a8b92c35d2b8c4c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8',
            'tlai_test_123456',
            'Development Test Key',
            'Test API key for development and testing purposes',
            'dev-user-1',
            'dev-org-1',
            '["documents:read", "documents:write", "analytics:read"]'::jsonb,
            '["read", "write"]'::jsonb,
            5000,
            'hour'
        ) ON CONFLICT (key_hash) DO NOTHING;
        
    END IF;
END $$;

-- Add helpful comments
COMMENT ON TABLE api_keys IS 'Stores API keys for programmatic access to the Tala AI platform';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hash of the actual API key for secure storage';
COMMENT ON COLUMN api_keys.key_prefix IS 'Visible prefix of the key for identification without exposing the full key';
COMMENT ON COLUMN api_keys.permissions IS 'JSON array of specific permissions granted to this key';
COMMENT ON COLUMN api_keys.scopes IS 'JSON array of API scopes (read, write, admin, etc.)';
COMMENT ON COLUMN api_keys.rate_limit_requests IS 'Maximum number of requests allowed per rate limit period';
COMMENT ON COLUMN api_keys.rate_limit_period IS 'Time period for rate limiting (minute, hour, day, month)';

COMMENT ON TABLE api_key_usage_logs IS 'Detailed logs of API key usage for analytics and monitoring';
COMMENT ON TABLE api_key_rotation_history IS 'History of API key rotations for security auditing';