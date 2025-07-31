-- Add metadata column to tasks table
-- This column stores additional information about tasks like source, agent ID, etc.

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add index for better query performance on metadata
CREATE INDEX IF NOT EXISTS idx_tasks_metadata ON tasks USING GIN (metadata);

-- Add comment explaining the column
COMMENT ON COLUMN tasks.metadata IS 'Additional task metadata including source, originalUserId, agentId, and other custom fields';