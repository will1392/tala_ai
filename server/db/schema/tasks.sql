-- Tasks Database Schema for Tala AI
-- This creates all the tables needed for the task management system

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (be careful in production!)
DROP TABLE IF EXISTS task_reminders CASCADE;
DROP TABLE IF EXISTS task_attachments CASCADE;
DROP TABLE IF EXISTS task_dependencies CASCADE;
DROP TABLE IF EXISTS task_assignments CASCADE;
DROP TABLE IF EXISTS task_history CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;

-- Main tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMP WITH TIME ZONE,
  
  -- User tracking
  created_by VARCHAR(255) NOT NULL,
  organization_id VARCHAR(255),
  
  -- Travel-related fields
  travel_type VARCHAR(50),
  booking_reference VARCHAR(100),
  location_data JSONB,
  
  -- Source tracking
  source VARCHAR(50) DEFAULT 'manual' CHECK (source IN ('manual', 'email', 'chat', 'automation')),
  source_id VARCHAR(255), -- Reference to email, chat conversation, etc.
  source_email_id VARCHAR(255),
  extracted_from_email BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  estimated_duration INTEGER, -- in minutes
  actual_duration INTEGER, -- in minutes
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Indexes for performance
  INDEX idx_tasks_created_by (created_by),
  INDEX idx_tasks_status (status),
  INDEX idx_tasks_priority (priority),
  INDEX idx_tasks_due_date (due_date),
  INDEX idx_tasks_source (source),
  INDEX idx_tasks_created_at (created_at)
);

-- Task assignments (who is assigned to work on tasks)
CREATE TABLE task_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'assignee',
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  assigned_by VARCHAR(255),
  
  UNIQUE(task_id, user_id),
  INDEX idx_assignments_user (user_id),
  INDEX idx_assignments_task (task_id)
);

-- Task dependencies (task relationships)
CREATE TABLE task_dependencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  dependency_type VARCHAR(50) DEFAULT 'blocks' CHECK (dependency_type IN ('blocks', 'related', 'parent', 'child')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(task_id, depends_on_task_id),
  INDEX idx_dependencies_task (task_id),
  INDEX idx_dependencies_depends_on (depends_on_task_id)
);

-- Task history (audit trail)
CREATE TABLE task_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  changes JSONB,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_history_task (task_id),
  INDEX idx_history_user (user_id),
  INDEX idx_history_created (created_at)
);

-- Task attachments
CREATE TABLE task_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  document_id VARCHAR(255),
  email_id VARCHAR(255),
  file_name VARCHAR(255),
  file_url TEXT,
  file_size INTEGER,
  mime_type VARCHAR(100),
  attachment_type VARCHAR(50) DEFAULT 'document',
  uploaded_by VARCHAR(255),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_attachments_task (task_id),
  INDEX idx_attachments_document (document_id),
  INDEX idx_attachments_email (email_id)
);

-- Task reminders
CREATE TABLE task_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  reminder_type VARCHAR(50) DEFAULT 'deadline' CHECK (reminder_type IN ('deadline', 'custom', 'recurring')),
  reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
  message TEXT,
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'cancelled')),
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_reminders_task (task_id),
  INDEX idx_reminders_user (user_id),
  INDEX idx_reminders_time (reminder_time),
  INDEX idx_reminders_status (status)
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to get task with all relations
CREATE OR REPLACE FUNCTION get_task_with_relations(p_task_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'task', row_to_json(t.*),
    'assignments', COALESCE(json_agg(DISTINCT a.*) FILTER (WHERE a.id IS NOT NULL), '[]'::json),
    'dependencies', COALESCE(json_agg(DISTINCT d.*) FILTER (WHERE d.id IS NOT NULL), '[]'::json),
    'attachments', COALESCE(json_agg(DISTINCT att.*) FILTER (WHERE att.id IS NOT NULL), '[]'::json),
    'reminders', COALESCE(json_agg(DISTINCT r.*) FILTER (WHERE r.id IS NOT NULL), '[]'::json)
  )
  INTO result
  FROM tasks t
  LEFT JOIN task_assignments a ON t.id = a.task_id
  LEFT JOIN task_dependencies d ON t.id = d.task_id
  LEFT JOIN task_attachments att ON t.id = att.task_id
  LEFT JOIN task_reminders r ON t.id = r.task_id
  WHERE t.id = p_task_id
  GROUP BY t.id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust based on your Supabase setup)
GRANT ALL ON tasks TO authenticated;
GRANT ALL ON task_assignments TO authenticated;
GRANT ALL ON task_dependencies TO authenticated;
GRANT ALL ON task_history TO authenticated;
GRANT ALL ON task_attachments TO authenticated;
GRANT ALL ON task_reminders TO authenticated;

-- Row Level Security (RLS) policies
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_reminders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own tasks
CREATE POLICY "Users can view own tasks" ON tasks
  FOR SELECT USING (created_by = auth.uid()::text OR created_by = current_setting('app.current_user_id', true));

CREATE POLICY "Users can create own tasks" ON tasks
  FOR INSERT WITH CHECK (created_by = auth.uid()::text OR created_by = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update own tasks" ON tasks
  FOR UPDATE USING (created_by = auth.uid()::text OR created_by = current_setting('app.current_user_id', true));

CREATE POLICY "Users can delete own tasks" ON tasks
  FOR DELETE USING (created_by = auth.uid()::text OR created_by = current_setting('app.current_user_id', true));

-- Similar policies for related tables...

-- Create indexes for better performance
CREATE INDEX idx_tasks_full_text ON tasks USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Sample data for testing (optional)
-- INSERT INTO tasks (title, description, priority, created_by) VALUES
-- ('Sample Task 1', 'This is a test task', 'medium', 'test_user_123'),
-- ('Sample Task 2', 'Another test task', 'high', 'test_user_123');