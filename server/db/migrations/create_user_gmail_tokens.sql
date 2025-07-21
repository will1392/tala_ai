-- Create user_gmail_tokens table for storing Gmail OAuth tokens
CREATE TABLE IF NOT EXISTS user_gmail_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email_address VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL, -- Encrypted
  refresh_token TEXT, -- Encrypted
  id_token TEXT, -- Encrypted
  token_expiry TIMESTAMP WITH TIME ZONE NOT NULL,
  scopes TEXT[] NOT NULL,
  user_info JSONB, -- Store name, picture, etc.
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_refreshed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  disconnected_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure one connection per email per user
  UNIQUE(user_id, email_address)
);

-- Create indexes for performance
CREATE INDEX idx_user_gmail_tokens_user_id ON user_gmail_tokens(user_id);
CREATE INDEX idx_user_gmail_tokens_email ON user_gmail_tokens(email_address);
CREATE INDEX idx_user_gmail_tokens_active ON user_gmail_tokens(is_active) WHERE is_active = true;
CREATE INDEX idx_user_gmail_tokens_expiry ON user_gmail_tokens(token_expiry);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_gmail_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_user_gmail_tokens_updated_at
  BEFORE UPDATE ON user_gmail_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_user_gmail_tokens_updated_at();

-- Add RLS policies
ALTER TABLE user_gmail_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tokens
CREATE POLICY user_gmail_tokens_select_policy ON user_gmail_tokens
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can only insert their own tokens
CREATE POLICY user_gmail_tokens_insert_policy ON user_gmail_tokens
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can only update their own tokens
CREATE POLICY user_gmail_tokens_update_policy ON user_gmail_tokens
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can only delete their own tokens
CREATE POLICY user_gmail_tokens_delete_policy ON user_gmail_tokens
  FOR DELETE
  USING (user_id = auth.uid());

-- Add comment
COMMENT ON TABLE user_gmail_tokens IS 'Stores encrypted Gmail OAuth tokens for users';