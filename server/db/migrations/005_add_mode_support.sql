-- Migration: Add mode support to conversations and users tables
-- This enables multi-mode functionality (travel, CMO, etc.)

-- 1. Create mode enum type
DO $$ BEGIN
    CREATE TYPE conversation_mode AS ENUM ('travel', 'cmo');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add mode columns to conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS mode conversation_mode DEFAULT 'travel',
ADD COLUMN IF NOT EXISTS sub_mode VARCHAR(50),
ADD COLUMN IF NOT EXISTS mode_context JSONB DEFAULT '{}';

-- 3. Add user preferences to users table (if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS user_preferences JSONB DEFAULT '{"default_mode": "travel", "mode_settings": {}}';
    ELSE
        -- Create users table if it doesn't exist
        CREATE TABLE users (
            id VARCHAR(255) PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255),
            user_preferences JSONB DEFAULT '{"default_mode": "travel", "mode_settings": {}}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_users_email ON users(email);
    END IF;
END $$;

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_mode ON conversations(mode);
CREATE INDEX IF NOT EXISTS idx_conversations_sub_mode ON conversations(sub_mode);
CREATE INDEX IF NOT EXISTS idx_conversations_mode_context ON conversations USING GIN (mode_context);

-- 5. Add mode tracking to messages table for context
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS mode_context JSONB DEFAULT '{}';

-- 6. Create function to auto-set mode based on conversation context
CREATE OR REPLACE FUNCTION auto_detect_conversation_mode()
RETURNS TRIGGER AS $$
BEGIN
    -- This function can be enhanced later to auto-detect mode based on message content
    -- For now, it just ensures mode_context is initialized
    IF NEW.mode_context IS NULL THEN
        NEW.mode_context = '{}'::jsonb;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger for auto-detection (optional, disabled by default)
-- DROP TRIGGER IF EXISTS conversation_mode_detector ON conversations;
-- CREATE TRIGGER conversation_mode_detector
-- BEFORE INSERT OR UPDATE ON conversations
-- FOR EACH ROW
-- EXECUTE FUNCTION auto_detect_conversation_mode();

-- 8. Update existing conversations to have default mode
UPDATE conversations 
SET mode = 'travel' 
WHERE mode IS NULL;

-- 9. Add comment documentation
COMMENT ON COLUMN conversations.mode IS 'The primary mode of the conversation (travel, cmo)';
COMMENT ON COLUMN conversations.sub_mode IS 'Sub-mode within the primary mode (e.g., seo, email, social for CMO mode)';
COMMENT ON COLUMN conversations.mode_context IS 'JSON data specific to the conversation mode';
COMMENT ON COLUMN users.user_preferences IS 'User preferences including default mode and mode-specific settings';