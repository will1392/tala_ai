-- Create direct_mail_campaigns table for storing campaign questionnaires and data
CREATE TABLE IF NOT EXISTS direct_mail_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'direct_mail',
  status VARCHAR(50) DEFAULT 'consultation',
  name VARCHAR(255) DEFAULT 'Direct Mail Campaign',
  
  -- Campaign sections and responses (JSON)
  sections JSONB DEFAULT '{}',
  responses JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  archived_at TIMESTAMP WITH TIME ZONE,
  
  -- Indexes
  INDEX idx_campaigns_user_id (user_id),
  INDEX idx_campaigns_status (status),
  INDEX idx_campaigns_created_at (created_at)
);

-- Add RLS policies
ALTER TABLE direct_mail_campaigns ENABLE ROW LEVEL SECURITY;

-- Users can only see their own campaigns
CREATE POLICY "Users can view own campaigns" ON direct_mail_campaigns
  FOR SELECT USING (auth.uid()::text = user_id);

-- Users can create their own campaigns
CREATE POLICY "Users can create own campaigns" ON direct_mail_campaigns
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own campaigns
CREATE POLICY "Users can update own campaigns" ON direct_mail_campaigns
  FOR UPDATE USING (auth.uid()::text = user_id);

-- Users can delete their own campaigns
CREATE POLICY "Users can delete own campaigns" ON direct_mail_campaigns
  FOR DELETE USING (auth.uid()::text = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_direct_mail_campaigns_updated_at 
  BEFORE UPDATE ON direct_mail_campaigns 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();