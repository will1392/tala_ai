-- Complete fix for conversation schema issues
-- This addresses both UUID type mismatches and missing columns

-- 1. First, drop foreign key constraints
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_organization_id_fkey;
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_user_id_fkey;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey;

-- 2. Change ID types to support string IDs
ALTER TABLE conversations ALTER COLUMN user_id TYPE VARCHAR(255);
ALTER TABLE conversations ALTER COLUMN organization_id TYPE VARCHAR(255);

-- 3. Add missing columns that ConversationService expects
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS conversation_type VARCHAR(50) DEFAULT 'chat';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS llm_model VARCHAR(100);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS llm_temperature DECIMAL(3,2) DEFAULT 0.7;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS llm_max_tokens INTEGER DEFAULT 1000;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS folder_id UUID;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{"autoTitle": true, "saveHistory": true, "shareSettings": {"isPublic": false, "allowComments": false}}';

-- 4. Re-add foreign key for messages (conversation_id stays as UUID)
ALTER TABLE messages ADD CONSTRAINT messages_conversation_id_fkey 
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

-- 5. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_org_id ON conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(conversation_type);
CREATE INDEX IF NOT EXISTS idx_conversations_created ON conversations(created_at);

-- 6. If organizations and users tables don't exist with string IDs, create minimal versions
-- (In production, you'd want full tables with proper fields)
CREATE TABLE IF NOT EXISTS organizations_temp (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) DEFAULT 'Default Organization'
);

CREATE TABLE IF NOT EXISTS users_temp (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255),
  name VARCHAR(255)
);

-- Insert default records if needed
INSERT INTO organizations_temp (id, name) 
VALUES ('default', 'Default Organization') 
ON CONFLICT (id) DO NOTHING;

INSERT INTO users_temp (id, email, name) 
VALUES ('anonymous', 'anonymous@system', 'Anonymous User') 
ON CONFLICT (id) DO NOTHING;

-- Note: This is a temporary solution. In production, you should:
-- 1. Properly migrate UUID-based tables to string-based IDs
-- 2. Or update the application to use UUIDs consistently
-- 3. Maintain referential integrity with proper foreign keys