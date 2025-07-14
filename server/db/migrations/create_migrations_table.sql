-- Create migrations table for tracking migration status
-- This should be run manually if the first migration fails to create it

CREATE TABLE IF NOT EXISTS migrations (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    applied_by VARCHAR(255),
    status VARCHAR(50) DEFAULT 'completed',
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_migrations_applied_at ON migrations(applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_migrations_status ON migrations(status);

-- Insert a comment to track when this was manually created
INSERT INTO migrations (
    id, 
    name, 
    description, 
    applied_by, 
    status,
    metadata
) VALUES (
    'manual_migrations_table',
    'Manual Migrations Table Creation',
    'Manually created migrations table for tracking',
    'manual-setup',
    'completed',
    '{"manual": true, "note": "Created via SQL script"}'
) ON CONFLICT (id) DO NOTHING;