-- Migration: Create views and functions for mode-aware querying

-- 1. Create function to get user's current mode preference
CREATE OR REPLACE FUNCTION get_user_default_mode(p_user_id VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    v_mode VARCHAR;
BEGIN
    SELECT 
        COALESCE(
            user_preferences->>'default_mode',
            'travel'
        ) INTO v_mode
    FROM users
    WHERE id = p_user_id;
    
    RETURN COALESCE(v_mode, 'travel');
END;
$$ LANGUAGE plpgsql;

-- 2. Create function to get conversations by mode
CREATE OR REPLACE FUNCTION get_user_conversations_by_mode(
    p_user_id VARCHAR,
    p_mode conversation_mode DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id VARCHAR,
    title VARCHAR,
    mode conversation_mode,
    sub_mode VARCHAR,
    mode_context JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    last_message_at TIMESTAMP WITH TIME ZONE,
    message_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.user_id,
        c.title,
        c.mode,
        c.sub_mode,
        c.mode_context,
        c.created_at,
        c.updated_at,
        MAX(m.created_at) as last_message_at,
        COUNT(m.id) as message_count
    FROM conversations c
    LEFT JOIN messages m ON m.conversation_id = c.id
    WHERE 
        c.user_id = p_user_id
        AND (p_mode IS NULL OR c.mode = p_mode)
    GROUP BY 
        c.id, c.user_id, c.title, c.mode, 
        c.sub_mode, c.mode_context, c.created_at, c.updated_at
    ORDER BY 
        MAX(m.created_at) DESC NULLS LAST,
        c.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- 3. Create view for mode statistics
CREATE OR REPLACE VIEW user_mode_statistics AS
SELECT 
    user_id,
    mode,
    sub_mode,
    COUNT(*) as conversation_count,
    COUNT(DISTINCT DATE_TRUNC('day', created_at)) as active_days,
    MAX(created_at) as last_activity,
    AVG(CASE 
        WHEN mode_context->>'satisfaction_rating' IS NOT NULL 
        THEN (mode_context->>'satisfaction_rating')::NUMERIC 
        ELSE NULL 
    END) as avg_satisfaction
FROM conversations
GROUP BY user_id, mode, sub_mode;

-- 4. Create function to auto-create conversation with mode
CREATE OR REPLACE FUNCTION create_conversation_with_mode(
    p_user_id VARCHAR,
    p_title VARCHAR,
    p_mode VARCHAR DEFAULT 'travel',
    p_sub_mode VARCHAR DEFAULT NULL,
    p_mode_context JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_conversation_id UUID;
    v_user_mode conversation_mode;
BEGIN
    -- Validate and convert mode
    BEGIN
        v_user_mode := p_mode::conversation_mode;
    EXCEPTION
        WHEN invalid_text_representation THEN
            v_user_mode := 'travel'::conversation_mode;
    END;
    
    -- Create conversation
    INSERT INTO conversations (
        user_id, 
        title, 
        mode, 
        sub_mode, 
        mode_context
    ) VALUES (
        p_user_id, 
        p_title, 
        v_user_mode, 
        p_sub_mode, 
        p_mode_context
    ) RETURNING id INTO v_conversation_id;
    
    RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Create function to switch conversation mode
CREATE OR REPLACE FUNCTION switch_conversation_mode(
    p_conversation_id UUID,
    p_user_id VARCHAR,
    p_new_mode VARCHAR,
    p_new_sub_mode VARCHAR DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_mode conversation_mode;
    v_old_mode VARCHAR;
    v_old_sub_mode VARCHAR;
BEGIN
    -- Get current mode
    SELECT mode::VARCHAR, sub_mode 
    INTO v_old_mode, v_old_sub_mode
    FROM conversations
    WHERE id = p_conversation_id AND user_id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Validate new mode
    BEGIN
        v_mode := p_new_mode::conversation_mode;
    EXCEPTION
        WHEN invalid_text_representation THEN
            RETURN FALSE;
    END;
    
    -- Update conversation
    UPDATE conversations
    SET 
        mode = v_mode,
        sub_mode = p_new_sub_mode,
        mode_context = mode_context || 
            jsonb_build_object(
                'mode_history', 
                COALESCE(mode_context->'mode_history', '[]'::jsonb) || 
                jsonb_build_array(
                    jsonb_build_object(
                        'from_mode', v_old_mode,
                        'from_sub_mode', v_old_sub_mode,
                        'to_mode', p_new_mode,
                        'to_sub_mode', p_new_sub_mode,
                        'switched_at', CURRENT_TIMESTAMP
                    )
                )
            ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_conversation_id AND user_id = p_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 6. Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_conversations_user_mode 
ON conversations(user_id, mode);

CREATE INDEX IF NOT EXISTS idx_conversations_user_mode_date 
ON conversations(user_id, mode, created_at DESC);

-- 7. Create helper function for mode-specific message context
CREATE OR REPLACE FUNCTION add_mode_context_to_message(
    p_message_id UUID,
    p_context_key VARCHAR,
    p_context_value JSONB
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE messages
    SET mode_context = 
        CASE 
            WHEN mode_context IS NULL THEN jsonb_build_object(p_context_key, p_context_value)
            ELSE mode_context || jsonb_build_object(p_context_key, p_context_value)
        END
    WHERE id = p_message_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 8. Add comment documentation
COMMENT ON FUNCTION get_user_conversations_by_mode IS 'Retrieves conversations filtered by mode with message statistics';
COMMENT ON FUNCTION create_conversation_with_mode IS 'Creates a new conversation with specified mode and context';
COMMENT ON FUNCTION switch_conversation_mode IS 'Switches the mode of an existing conversation and tracks history';
COMMENT ON VIEW user_mode_statistics IS 'Aggregated statistics for user activity across different modes';