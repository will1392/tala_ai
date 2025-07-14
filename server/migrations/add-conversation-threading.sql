-- Migration: Add Conversation Threading Support
-- This migration adds threading and branching capabilities to conversations

-- Add threading columns to conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS parent_conversation_id VARCHAR(36),
ADD COLUMN IF NOT EXISTS thread_metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS thread_status VARCHAR(50) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS thread_summary TEXT;

-- Add foreign key constraint for parent conversation
ALTER TABLE conversations
ADD CONSTRAINT conversations_parent_conversation_fk 
FOREIGN KEY (parent_conversation_id) 
REFERENCES conversations(id) ON DELETE SET NULL;

-- Add indexes for efficient thread queries
CREATE INDEX IF NOT EXISTS idx_conversations_parent_id 
ON conversations(parent_conversation_id) 
WHERE parent_conversation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_thread_status 
ON conversations(thread_status);

CREATE INDEX IF NOT EXISTS idx_conversations_thread_metadata_branch_type 
ON conversations((thread_metadata->>'branch_type')) 
WHERE thread_metadata IS NOT NULL;

-- Create thread_merge_records table for tracking merges
CREATE TABLE IF NOT EXISTS thread_merge_records (
    id VARCHAR(36) PRIMARY KEY,
    primary_thread_id VARCHAR(36) NOT NULL,
    merged_thread_ids TEXT[] NOT NULL,
    merge_type VARCHAR(50) NOT NULL DEFAULT 'manual',
    merge_strategy VARCHAR(50) NOT NULL DEFAULT 'chronological',
    conflicts_resolved JSONB DEFAULT '[]'::jsonb,
    merge_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    
    -- Constraints
    CONSTRAINT thread_merge_primary_thread_fk 
        FOREIGN KEY (primary_thread_id) 
        REFERENCES conversations(id) ON DELETE CASCADE
);

-- Create indexes for merge records
CREATE INDEX IF NOT EXISTS idx_thread_merge_primary 
ON thread_merge_records(primary_thread_id);

CREATE INDEX IF NOT EXISTS idx_thread_merge_created_at 
ON thread_merge_records(created_at DESC);

-- Create branch_points view for easy access to branch information
CREATE OR REPLACE VIEW conversation_branch_points AS
SELECT 
    c.id AS thread_id,
    c.parent_conversation_id,
    c.title AS thread_title,
    c.thread_status,
    c.thread_metadata->>'branch_reason' AS branch_reason,
    c.thread_metadata->>'branch_type' AS branch_type,
    c.thread_metadata->>'created_from_message_id' AS branch_message_id,
    c.created_at AS branch_created_at,
    c.thread_summary,
    p.title AS parent_title
FROM conversations c
LEFT JOIN conversations p ON c.parent_conversation_id = p.id
WHERE c.parent_conversation_id IS NOT NULL
ORDER BY c.created_at DESC;

-- Create conversation_trees view for hierarchical queries
CREATE OR REPLACE VIEW conversation_trees AS
WITH RECURSIVE conversation_hierarchy AS (
    -- Base case: root conversations
    SELECT 
        id,
        title,
        parent_conversation_id,
        thread_status,
        thread_metadata,
        created_at,
        0 AS depth,
        ARRAY[id] AS path,
        id AS root_id
    FROM conversations
    WHERE parent_conversation_id IS NULL
    
    UNION ALL
    
    -- Recursive case: child conversations
    SELECT 
        c.id,
        c.title,
        c.parent_conversation_id,
        c.thread_status,
        c.thread_metadata,
        c.created_at,
        ch.depth + 1,
        ch.path || c.id,
        ch.root_id
    FROM conversations c
    INNER JOIN conversation_hierarchy ch ON c.parent_conversation_id = ch.id
    WHERE ch.depth < 10 -- Prevent infinite recursion
)
SELECT * FROM conversation_hierarchy;

-- Function to get thread statistics
CREATE OR REPLACE FUNCTION get_thread_statistics(conversation_id VARCHAR(36))
RETURNS TABLE (
    total_threads INTEGER,
    active_threads INTEGER,
    merged_threads INTEGER,
    abandoned_threads INTEGER,
    max_depth INTEGER,
    total_messages INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH thread_stats AS (
        SELECT 
            COUNT(*) AS total_threads,
            COUNT(*) FILTER (WHERE thread_status = 'active') AS active_threads,
            COUNT(*) FILTER (WHERE thread_status = 'merged') AS merged_threads,
            COUNT(*) FILTER (WHERE thread_status = 'abandoned') AS abandoned_threads,
            MAX(depth) AS max_depth
        FROM conversation_trees
        WHERE root_id = conversation_id OR id = conversation_id
    ),
    message_stats AS (
        SELECT COUNT(*) AS total_messages
        FROM messages m
        INNER JOIN conversation_trees ct ON m.conversation_id = ct.id
        WHERE ct.root_id = conversation_id OR ct.id = conversation_id
    )
    SELECT 
        ts.total_threads,
        ts.active_threads,
        ts.merged_threads,
        ts.abandoned_threads,
        ts.max_depth,
        ms.total_messages
    FROM thread_stats ts, message_stats ms;
END;
$$ LANGUAGE plpgsql;

-- Function to check if conversations share common ancestor
CREATE OR REPLACE FUNCTION find_common_ancestor(
    conversation_id1 VARCHAR(36),
    conversation_id2 VARCHAR(36)
)
RETURNS VARCHAR(36) AS $$
DECLARE
    path1 VARCHAR(36)[];
    path2 VARCHAR(36)[];
    common_ancestor VARCHAR(36);
BEGIN
    -- Get paths for both conversations
    SELECT path INTO path1
    FROM conversation_trees
    WHERE id = conversation_id1;
    
    SELECT path INTO path2
    FROM conversation_trees
    WHERE id = conversation_id2;
    
    -- Find common ancestor by comparing paths
    FOR i IN 1..LEAST(array_length(path1, 1), array_length(path2, 1)) LOOP
        IF path1[i] = path2[i] THEN
            common_ancestor := path1[i];
        ELSE
            EXIT;
        END IF;
    END LOOP;
    
    RETURN common_ancestor;
END;
$$ LANGUAGE plpgsql;

-- Function to update thread summary
CREATE OR REPLACE FUNCTION update_thread_summary(
    thread_id VARCHAR(36),
    summary TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE conversations
    SET 
        thread_summary = summary,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = thread_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate thread depth on insert
CREATE OR REPLACE FUNCTION check_thread_depth()
RETURNS TRIGGER AS $$
DECLARE
    current_depth INTEGER;
    max_allowed_depth INTEGER := 10;
BEGIN
    IF NEW.parent_conversation_id IS NOT NULL THEN
        -- Calculate current depth
        WITH RECURSIVE thread_chain AS (
            SELECT id, parent_conversation_id, 1 AS depth
            FROM conversations
            WHERE id = NEW.parent_conversation_id
            
            UNION ALL
            
            SELECT c.id, c.parent_conversation_id, tc.depth + 1
            FROM conversations c
            INNER JOIN thread_chain tc ON c.id = tc.parent_conversation_id
        )
        SELECT MAX(depth) INTO current_depth FROM thread_chain;
        
        IF current_depth >= max_allowed_depth THEN
            RAISE EXCEPTION 'Maximum thread depth (%) exceeded', max_allowed_depth;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_thread_depth
BEFORE INSERT ON conversations
FOR EACH ROW
EXECUTE FUNCTION check_thread_depth();

-- Add comments for documentation
COMMENT ON COLUMN conversations.parent_conversation_id IS 'References parent conversation for threading';
COMMENT ON COLUMN conversations.thread_metadata IS 'Stores branch reason, type, and other thread-specific data';
COMMENT ON COLUMN conversations.thread_status IS 'Status of thread: active, merged, abandoned';
COMMENT ON COLUMN conversations.thread_summary IS 'AI-generated summary specific to this thread branch';

COMMENT ON TABLE thread_merge_records IS 'Tracks merge operations between conversation threads';
COMMENT ON VIEW conversation_branch_points IS 'Easy access to all branch points in conversations';
COMMENT ON VIEW conversation_trees IS 'Hierarchical view of conversation threads';

-- Sample data for testing (commented out for production)
/*
-- Create a root conversation
INSERT INTO conversations (id, user_id, title, summary)
VALUES ('root-conv-1', 'test-user', 'Planning Europe Trip', 'Initial planning for Europe vacation');

-- Create a branch
INSERT INTO conversations (id, user_id, parent_conversation_id, title, thread_metadata, thread_status)
VALUES (
    'branch-conv-1', 
    'test-user',
    'root-conv-1',
    'Europe Trip - Paris Focus',
    '{"branch_reason": "Exploring Paris-centric itinerary", "branch_type": "exploration"}'::jsonb,
    'active'
);

-- Create another branch
INSERT INTO conversations (id, user_id, parent_conversation_id, title, thread_metadata, thread_status)
VALUES (
    'branch-conv-2',
    'test-user', 
    'root-conv-1',
    'Europe Trip - Budget Option',
    '{"branch_reason": "Exploring budget-friendly alternatives", "branch_type": "alternative"}'::jsonb,
    'active'
);
*/