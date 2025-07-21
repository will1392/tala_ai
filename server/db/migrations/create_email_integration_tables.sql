-- Email Integration Schema
-- Tables for managing email connections, sync status, and analyzed emails

-- User email accounts table
CREATE TABLE IF NOT EXISTS user_email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider VARCHAR(50) NOT NULL, -- gmail, outlook, imap
  email_address VARCHAR(255) NOT NULL,
  settings JSONB DEFAULT '{}', -- Provider-specific settings
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  disconnected_at TIMESTAMP WITH TIME ZONE,
  last_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure unique email per provider per user
  UNIQUE(user_id, provider, email_address)
);

-- Email sync status table
CREATE TABLE IF NOT EXISTS email_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email_account_id UUID NOT NULL REFERENCES user_email_accounts(id) ON DELETE CASCADE,
  last_sync_start TIMESTAMP WITH TIME ZONE,
  last_sync_end TIMESTAMP WITH TIME ZONE,
  last_successful_sync TIMESTAMP WITH TIME ZONE,
  message_count INTEGER DEFAULT 0,
  unread_count INTEGER DEFAULT 0,
  sync_status VARCHAR(50) DEFAULT 'idle', -- idle, syncing, completed, failed
  last_error TEXT,
  sync_token TEXT, -- For incremental sync
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Analyzed emails table
CREATE TABLE IF NOT EXISTS analyzed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email_account_id UUID REFERENCES user_email_accounts(id) ON DELETE SET NULL,
  email_id VARCHAR(255) NOT NULL, -- Provider's email ID
  provider VARCHAR(50) NOT NULL,
  email_address VARCHAR(255) NOT NULL,
  thread_id VARCHAR(255),
  subject TEXT,
  from_email VARCHAR(255),
  to_emails TEXT[],
  cc_emails TEXT[],
  date_received TIMESTAMP WITH TIME ZONE,
  has_attachments BOOLEAN DEFAULT false,
  attachment_count INTEGER DEFAULT 0,
  analysis_result JSONB DEFAULT '{}',
  tasks_extracted JSONB DEFAULT '[]',
  entities_extracted JSONB DEFAULT '[]',
  email_type VARCHAR(100), -- booking_confirmation, inquiry, newsletter, etc.
  importance_score DECIMAL(3,2) DEFAULT 0.5,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Prevent duplicate analysis
  UNIQUE(user_id, email_id, provider)
);

-- Email tasks table
CREATE TABLE IF NOT EXISTS email_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email_id VARCHAR(255) NOT NULL,
  analyzed_email_id UUID REFERENCES analyzed_emails(id) ON DELETE CASCADE,
  task_id UUID, -- Reference to main tasks table if exists
  task_title TEXT NOT NULL,
  task_description TEXT,
  due_date DATE,
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(50) DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Email attachments metadata table
CREATE TABLE IF NOT EXISTS email_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analyzed_email_id UUID REFERENCES analyzed_emails(id) ON DELETE CASCADE,
  attachment_id VARCHAR(255) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100),
  size_bytes BIGINT,
  is_inline BOOLEAN DEFAULT false,
  document_id UUID, -- Reference to documents table if imported
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Email sync queue for background processing
CREATE TABLE IF NOT EXISTS email_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email_account_id UUID REFERENCES user_email_accounts(id) ON DELETE CASCADE,
  sync_type VARCHAR(50) NOT NULL, -- initial, incremental, full
  priority INTEGER DEFAULT 5,
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_user_email_accounts_user_id ON user_email_accounts(user_id);
CREATE INDEX idx_user_email_accounts_active ON user_email_accounts(is_active) WHERE is_active = true;
CREATE INDEX idx_email_sync_status_account ON email_sync_status(email_account_id);
CREATE INDEX idx_email_sync_status_user ON email_sync_status(user_id);
CREATE INDEX idx_analyzed_emails_user_id ON analyzed_emails(user_id);
CREATE INDEX idx_analyzed_emails_email_id ON analyzed_emails(email_id, provider);
CREATE INDEX idx_analyzed_emails_date ON analyzed_emails(date_received);
CREATE INDEX idx_analyzed_emails_type ON analyzed_emails(email_type);
CREATE INDEX idx_email_tasks_user_id ON email_tasks(user_id);
CREATE INDEX idx_email_tasks_status ON email_tasks(status);
CREATE INDEX idx_email_attachments_email ON email_attachments(analyzed_email_id);
CREATE INDEX idx_email_sync_queue_status ON email_sync_queue(status, priority);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_email_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_email_accounts_updated_at
  BEFORE UPDATE ON user_email_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_email_updated_at();

CREATE TRIGGER update_email_sync_status_updated_at
  BEFORE UPDATE ON email_sync_status
  FOR EACH ROW
  EXECUTE FUNCTION update_email_updated_at();

CREATE TRIGGER update_email_tasks_updated_at
  BEFORE UPDATE ON email_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_email_updated_at();

-- Add RLS policies
ALTER TABLE user_email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyzed_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_tasks ENABLE ROW LEVEL SECURITY;

-- Users can only see their own email data
CREATE POLICY user_email_accounts_policy ON user_email_accounts
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY email_sync_status_policy ON email_sync_status
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY analyzed_emails_policy ON analyzed_emails
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY email_tasks_policy ON email_tasks
  FOR ALL USING (user_id = auth.uid());

-- Comments
COMMENT ON TABLE user_email_accounts IS 'Stores user email account connections';
COMMENT ON TABLE email_sync_status IS 'Tracks email synchronization status';
COMMENT ON TABLE analyzed_emails IS 'Stores analyzed email data and extracted information';
COMMENT ON TABLE email_tasks IS 'Tasks extracted from emails';
COMMENT ON TABLE email_attachments IS 'Email attachment metadata';
COMMENT ON TABLE email_sync_queue IS 'Queue for background email synchronization';