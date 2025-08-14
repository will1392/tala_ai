-- Create user learning profiles table
-- Stores personalized learning data for each user
-- This is ADDITIVE only - does not affect core functionality

CREATE TABLE IF NOT EXISTS user_learning_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  profile JSONB NOT NULL DEFAULT '{}',
  interactions INTEGER DEFAULT 0,
  confidence DECIMAL(3,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_learning_profiles_user_id ON user_learning_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_learning_profiles_updated_at ON user_learning_profiles(updated_at);

-- Add RLS policies for security
ALTER TABLE user_learning_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only access their own learning profile
CREATE POLICY user_learning_profiles_select_policy ON user_learning_profiles
  FOR SELECT USING (user_id = current_setting('app.current_user')::TEXT);

CREATE POLICY user_learning_profiles_insert_policy ON user_learning_profiles
  FOR INSERT WITH CHECK (user_id = current_setting('app.current_user')::TEXT);

CREATE POLICY user_learning_profiles_update_policy ON user_learning_profiles
  FOR UPDATE USING (user_id = current_setting('app.current_user')::TEXT);

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_user_learning_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating timestamp
CREATE TRIGGER user_learning_profiles_updated_at_trigger
  BEFORE UPDATE ON user_learning_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_learning_profiles_updated_at();

-- Create user interaction history table for detailed tracking
CREATE TABLE IF NOT EXISTS user_interaction_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  interaction_type TEXT NOT NULL, -- 'chat', 'task', 'feedback'
  message TEXT,
  response TEXT,
  metadata JSONB DEFAULT '{}',
  satisfaction_score DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_user_interaction_history_user_id ON user_interaction_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interaction_history_created_at ON user_interaction_history(created_at);
CREATE INDEX IF NOT EXISTS idx_user_interaction_history_type ON user_interaction_history(interaction_type);

-- RLS for interaction history
ALTER TABLE user_interaction_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_interaction_history_select_policy ON user_interaction_history
  FOR SELECT USING (user_id = current_setting('app.current_user')::TEXT);

CREATE POLICY user_interaction_history_insert_policy ON user_interaction_history
  FOR INSERT WITH CHECK (user_id = current_setting('app.current_user')::TEXT);

-- Add comment for documentation
COMMENT ON TABLE user_learning_profiles IS 'Stores personalized learning profiles for each user to enhance AI responses';
COMMENT ON TABLE user_interaction_history IS 'Tracks user interactions for learning and improvement';