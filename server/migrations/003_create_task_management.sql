-- Migration: Create Task Management System Tables
-- Version: 003
-- Description: Creates tables for native task management including tasks, assignments, dependencies, reminders, history, and attachments

-- 1. Tasks table - Core task information
CREATE TABLE IF NOT EXISTS tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold')),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date TIMESTAMP,
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Travel-specific fields
    travel_type VARCHAR(50), -- flight, hotel, activity, document, etc.
    booking_reference VARCHAR(100),
    location_data JSONB, -- Store location-related information
    
    -- Email integration
    source_email_id VARCHAR(255), -- Reference to email that created this task
    extracted_from_email BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    tags TEXT[], -- Array of tags for categorization
    custom_fields JSONB, -- Flexible storage for additional data
    estimated_duration INTEGER, -- Duration in minutes
    actual_duration INTEGER, -- Actual time spent in minutes
    
    -- Indexes
    INDEX idx_tasks_status (status),
    INDEX idx_tasks_priority (priority),
    INDEX idx_tasks_due_date (due_date),
    INDEX idx_tasks_created_by (created_by),
    INDEX idx_tasks_source_email (source_email_id)
);

-- 2. Task assignments - Who's responsible for tasks
CREATE TABLE IF NOT EXISTS task_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'assignee' CHECK (role IN ('assignee', 'reviewer', 'watcher', 'approver')),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID NOT NULL,
    
    -- Unique constraint to prevent duplicate assignments
    UNIQUE(task_id, user_id, role),
    
    -- Indexes
    INDEX idx_assignments_task (task_id),
    INDEX idx_assignments_user (user_id)
);

-- 3. Task dependencies - Task relationships
CREATE TABLE IF NOT EXISTS task_dependencies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) DEFAULT 'blocks' CHECK (dependency_type IN ('blocks', 'relates_to', 'parent_of', 'child_of')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Prevent circular dependencies and self-references
    CHECK (task_id != depends_on_task_id),
    
    -- Unique constraint to prevent duplicate dependencies
    UNIQUE(task_id, depends_on_task_id),
    
    -- Indexes
    INDEX idx_dependencies_task (task_id),
    INDEX idx_dependencies_depends_on (depends_on_task_id)
);

-- 4. Task reminders - Notification scheduling
CREATE TABLE IF NOT EXISTS task_reminders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    reminder_time TIMESTAMP NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'email' CHECK (type IN ('email', 'sms', 'push', 'in_app')),
    recipient_id UUID NOT NULL,
    message TEXT,
    sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP,
    
    -- Reminder configuration
    reminder_offset INTEGER, -- Minutes before due date
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern VARCHAR(50), -- daily, weekly, custom
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'failed', 'cancelled')),
    failure_reason TEXT,
    
    -- Indexes
    INDEX idx_reminders_task (task_id),
    INDEX idx_reminders_time (reminder_time),
    INDEX idx_reminders_status (status)
);

-- 5. Task history - Audit trail
CREATE TABLE IF NOT EXISTS task_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL, -- created, updated, status_changed, assigned, commented, etc.
    user_id UUID NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Change details
    field_name VARCHAR(100), -- Which field was changed
    old_value TEXT,
    new_value TEXT,
    
    -- Additional context
    comment TEXT,
    metadata JSONB, -- Store additional action-specific data
    
    -- Indexes
    INDEX idx_history_task (task_id),
    INDEX idx_history_user (user_id),
    INDEX idx_history_timestamp (timestamp)
);

-- 6. Task attachments - Link to documents and emails
CREATE TABLE IF NOT EXISTS task_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    document_id VARCHAR(255), -- Reference to document in knowledge base
    email_id VARCHAR(255), -- Reference to email
    attachment_type VARCHAR(50) NOT NULL CHECK (attachment_type IN ('document', 'email', 'image', 'link')),
    
    -- File information
    file_name VARCHAR(255),
    file_size INTEGER,
    mime_type VARCHAR(100),
    url TEXT,
    
    -- Metadata
    uploaded_by UUID NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    
    -- Indexes
    INDEX idx_attachments_task (task_id),
    INDEX idx_attachments_document (document_id),
    INDEX idx_attachments_email (email_id)
);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to check for circular dependencies
CREATE OR REPLACE FUNCTION check_circular_dependency()
RETURNS TRIGGER AS $$
DECLARE
    has_circular BOOLEAN;
BEGIN
    WITH RECURSIVE dep_tree AS (
        SELECT depends_on_task_id, task_id
        FROM task_dependencies
        WHERE task_id = NEW.depends_on_task_id
        
        UNION ALL
        
        SELECT td.depends_on_task_id, td.task_id
        FROM task_dependencies td
        JOIN dep_tree dt ON td.task_id = dt.depends_on_task_id
    )
    SELECT EXISTS (
        SELECT 1 FROM dep_tree WHERE depends_on_task_id = NEW.task_id
    ) INTO has_circular;
    
    IF has_circular THEN
        RAISE EXCEPTION 'Circular dependency detected';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_circular_dependencies
    BEFORE INSERT OR UPDATE ON task_dependencies
    FOR EACH ROW
    EXECUTE FUNCTION check_circular_dependency();

-- Create views for common queries

-- Active tasks view
CREATE VIEW active_tasks AS
SELECT 
    t.*,
    array_agg(DISTINCT ta.user_id) FILTER (WHERE ta.role = 'assignee') as assignees,
    COUNT(DISTINCT td.depends_on_task_id) as dependency_count,
    COUNT(DISTINCT tr.id) FILTER (WHERE tr.status = 'scheduled') as pending_reminders
FROM tasks t
LEFT JOIN task_assignments ta ON t.id = ta.task_id
LEFT JOIN task_dependencies td ON t.id = td.task_id
LEFT JOIN task_reminders tr ON t.id = tr.task_id
WHERE t.status NOT IN ('completed', 'cancelled')
GROUP BY t.id;

-- Task completion statistics view
CREATE VIEW task_completion_stats AS
SELECT 
    created_by as user_id,
    COUNT(*) as total_tasks,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tasks,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
    AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600)::INTEGER as avg_completion_hours
FROM tasks
GROUP BY created_by;

-- Overdue tasks view
CREATE VIEW overdue_tasks AS
SELECT 
    t.*,
    EXTRACT(DAY FROM (CURRENT_TIMESTAMP - t.due_date)) as days_overdue
FROM tasks t
WHERE t.due_date < CURRENT_TIMESTAMP 
    AND t.status NOT IN ('completed', 'cancelled')
ORDER BY t.due_date;

-- Add comments for documentation
COMMENT ON TABLE tasks IS 'Core task management table storing all task information';
COMMENT ON TABLE task_assignments IS 'Tracks who is responsible for each task and in what capacity';
COMMENT ON TABLE task_dependencies IS 'Defines relationships and dependencies between tasks';
COMMENT ON TABLE task_reminders IS 'Stores scheduled reminders and notifications for tasks';
COMMENT ON TABLE task_history IS 'Audit trail of all changes made to tasks';
COMMENT ON TABLE task_attachments IS 'Links tasks to related documents and emails';

-- Grant permissions (adjust based on your user roles)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tala_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tala_app;