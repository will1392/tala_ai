-- Temporarily disable RLS for testing
-- Run this in Supabase SQL Editor

-- Disable RLS on all task-related tables
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_reminders DISABLE ROW LEVEL SECURITY;

-- Note: In production, you should use proper RLS policies instead!