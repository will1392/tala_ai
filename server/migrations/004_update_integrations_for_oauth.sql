-- Update integration_configs table for OAuth token storage

-- Add new columns for OAuth integrations
ALTER TABLE integration_configs 
ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS provider_account_id VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS access_token TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS refresh_token TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP DEFAULT NULL,
ADD COLUMN IF NOT EXISTS metadata JSON DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_sync TIMESTAMP DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;

-- Add indexes for OAuth providers
CREATE INDEX IF NOT EXISTS idx_provider ON integration_configs(provider);
CREATE INDEX IF NOT EXISTS idx_provider_account ON integration_configs(provider_account_id);
CREATE INDEX IF NOT EXISTS idx_user_provider ON integration_configs(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_is_deleted ON integration_configs(is_deleted);

-- Update existing data to have provider field
UPDATE integration_configs 
SET provider = integration_id 
WHERE provider IS NULL;

-- Add comment
COMMENT ON TABLE integration_configs IS 'Stores both OAuth tokens and third-party integration configurations';