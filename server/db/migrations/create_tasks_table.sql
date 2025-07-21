-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date TIMESTAMPTZ,
  assignee TEXT,
  tags TEXT[],
  source TEXT DEFAULT 'manual' CHECK (source IN ('email', 'manual', 'automation', 'chat')),
  source_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Indexes for performance
  INDEX idx_tasks_user_id (user_id),
  INDEX idx_tasks_organization_id (organization_id),
  INDEX idx_tasks_status (status),
  INDEX idx_tasks_due_date (due_date),
  INDEX idx_tasks_created_at (created_at)
);

-- Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own tasks" ON tasks
  FOR SELECT USING (user_id = auth.uid() OR organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create tasks" ON tasks
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own tasks" ON tasks
  FOR UPDATE USING (user_id = auth.uid() OR assignee = auth.uid());

CREATE POLICY "Users can delete their own tasks" ON tasks
  FOR DELETE USING (user_id = auth.uid());

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();