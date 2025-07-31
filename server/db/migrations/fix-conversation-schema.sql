-- Migration to fix conversation schema for string IDs instead of UUIDs
-- This allows the system to work with string user IDs like 'test_user_123'

-- 1. Drop foreign key constraints
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_organization_id_fkey;
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_user_id_fkey;

-- 2. Change column types to VARCHAR
ALTER TABLE conversations ALTER COLUMN user_id TYPE VARCHAR(255);
ALTER TABLE conversations ALTER COLUMN organization_id TYPE VARCHAR(255);

-- 3. Update messages table to match
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey;

-- 4. Re-add the foreign key for conversation_id (this stays as UUID)
ALTER TABLE messages ADD CONSTRAINT messages_conversation_id_fkey 
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

-- 5. Add index for performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_org_id ON conversations(organization_id);

-- Note: In a production system, you might want to:
-- 1. Create new users and organizations tables with VARCHAR IDs
-- 2. Re-add foreign keys to those tables
-- For now, we're just removing the constraints to allow flexibility