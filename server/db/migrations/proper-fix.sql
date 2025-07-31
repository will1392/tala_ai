-- Proper fix that maintains database integrity
-- This adds missing columns without breaking the schema

-- 1. Add missing columns that ConversationService expects (this is fine to do)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS conversation_type VARCHAR(50) DEFAULT 'chat';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS llm_model VARCHAR(100);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS llm_temperature DECIMAL(3,2) DEFAULT 0.7;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS llm_max_tokens INTEGER DEFAULT 1000;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS folder_id UUID;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{"autoTitle": true, "saveHistory": true, "shareSettings": {"isPublic": false, "allowComments": false}}';

-- 2. Create proper test users and organizations with UUIDs
-- First, ensure we have at least one organization
INSERT INTO organizations (id, name, slug, settings)
VALUES 
  ('00000000-0000-0000-0000-000000000001'::UUID, 'Default Organization', 'default', '{}')
ON CONFLICT (id) DO NOTHING;

-- Create test users with proper UUIDs
INSERT INTO users (id, email, name, organization_id, role, settings)
VALUES 
  ('00000000-0000-0000-0000-000000000002'::UUID, 'test@example.com', 'Test User', '00000000-0000-0000-0000-000000000001'::UUID, 'user', '{}'),
  ('00000000-0000-0000-0000-000000000003'::UUID, 'demo@example.com', 'Demo User', '00000000-0000-0000-0000-000000000001'::UUID, 'user', '{}')
ON CONFLICT (id) DO NOTHING;

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(conversation_type);
CREATE INDEX IF NOT EXISTS idx_conversations_created ON conversations(created_at);

-- The schema remains intact with proper UUIDs and foreign keys!