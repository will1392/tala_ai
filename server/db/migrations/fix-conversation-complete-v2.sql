-- Complete fix for conversation schema issues (v2)
-- This addresses UUID type mismatches, missing columns, and RLS policies

-- 1. First, disable RLS and drop all policies on conversations table
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on conversations
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can manage own conversations" ON conversations;

-- 2. Drop foreign key constraints
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_organization_id_fkey;
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_user_id_fkey;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey;

-- 3. Change ID types to support string IDs
ALTER TABLE conversations ALTER COLUMN user_id TYPE VARCHAR(255);
ALTER TABLE conversations ALTER COLUMN organization_id TYPE VARCHAR(255);

-- 4. Add missing columns that ConversationService expects
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS conversation_type VARCHAR(50) DEFAULT 'chat';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS llm_model VARCHAR(100);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS llm_temperature DECIMAL(3,2) DEFAULT 0.7;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS llm_max_tokens INTEGER DEFAULT 1000;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS folder_id UUID;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{"autoTitle": true, "saveHistory": true, "shareSettings": {"isPublic": false, "allowComments": false}}';

-- 5. Re-add foreign key for messages (conversation_id stays as UUID)
ALTER TABLE messages ADD CONSTRAINT messages_conversation_id_fkey 
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

-- 6. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_org_id ON conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(conversation_type);
CREATE INDEX IF NOT EXISTS idx_conversations_created ON conversations(created_at);

-- 7. Re-enable RLS with updated policies (optional - you can skip this if you don't need RLS)
-- ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- If you want to re-enable RLS, uncomment these:
-- CREATE POLICY "Users can view own conversations" ON conversations
--   FOR SELECT USING (user_id = current_setting('app.current_user_id', true));

-- CREATE POLICY "Users can create own conversations" ON conversations
--   FOR INSERT WITH CHECK (user_id = current_setting('app.current_user_id', true));

-- CREATE POLICY "Users can update own conversations" ON conversations
--   FOR UPDATE USING (user_id = current_setting('app.current_user_id', true));

-- CREATE POLICY "Users can delete own conversations" ON conversations
--   FOR DELETE USING (user_id = current_setting('app.current_user_id', true));

-- 8. Create temporary tables for testing (optional)
CREATE TABLE IF NOT EXISTS organizations_temp (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) DEFAULT 'Default Organization'
);

CREATE TABLE IF NOT EXISTS users_temp (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255),
  name VARCHAR(255)
);

-- Insert default records
INSERT INTO organizations_temp (id, name) 
VALUES ('default', 'Default Organization') 
ON CONFLICT (id) DO NOTHING;

INSERT INTO users_temp (id, email, name) 
VALUES ('anonymous', 'anonymous@system', 'Anonymous User') 
ON CONFLICT (id) DO NOTHING;