-- PostgreSQL version for creating integration_configs table
-- Run this in your Supabase SQL Editor

-- Create integration_configs table for OAuth token storage
CREATE TABLE IF NOT EXISTS integration_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    integration_id VARCHAR(50) NOT NULL,
    config TEXT NOT NULL, -- Encrypted OAuth tokens
    status VARCHAR(20) DEFAULT 'active',
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_sync_at TIMESTAMPTZ,
    
    -- Unique constraint to prevent duplicate integrations per user
    CONSTRAINT unique_user_integration UNIQUE (user_id, integration_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_integration ON integration_configs (user_id, integration_id);
CREATE INDEX IF NOT EXISTS idx_status ON integration_configs (status);
CREATE INDEX IF NOT EXISTS idx_enabled ON integration_configs (enabled);

-- Enable Row Level Security
ALTER TABLE integration_configs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust based on your auth setup)
-- For mock auth mode, we'll use simpler policies
CREATE POLICY "Enable all operations for authenticated users" ON integration_configs
    FOR ALL 
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- For development/testing without auth
CREATE POLICY "Enable all operations for anon users (dev only)" ON integration_configs
    FOR ALL 
    TO anon
    USING (true)
    WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_integration_configs_updated_at 
    BEFORE UPDATE ON integration_configs 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();