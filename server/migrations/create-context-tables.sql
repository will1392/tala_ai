-- Migration: Create Context Management Tables for Advanced Memory and Conversation Handling
-- This migration creates tables for storing conversation contexts, user profiles, memories, and conversation threads

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types for context management
DO $$ BEGIN
    CREATE TYPE memory_type AS ENUM (
        'personal_preference', 'travel_history', 'dietary_restriction', 
        'passport_info', 'loyalty_program', 'budget_preference',
        'accessibility_need', 'contact_info', 'emergency_contact',
        'travel_companion', 'destination_preference', 'activity_preference',
        'accommodation_preference', 'transportation_preference', 'fact', 'note'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE importance_level AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE entity_type AS ENUM (
        'person', 'place', 'organization', 'date', 'time', 'destination',
        'airline', 'hotel', 'restaurant', 'activity', 'document', 'preference',
        'restriction', 'contact', 'financial', 'medical', 'emergency'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Table: conversation_contexts
-- Stores contextual summaries and key information for conversations
CREATE TABLE IF NOT EXISTS conversation_contexts (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    conversation_id VARCHAR(36) NOT NULL,
    
    -- Context summary and analysis
    context_summary TEXT,
    key_topics TEXT[],
    key_entities JSONB DEFAULT '{}'::jsonb,
    important_dates JSONB DEFAULT '{}'::jsonb,
    sentiment_analysis JSONB DEFAULT '{}'::jsonb,
    
    -- Conversation metadata
    message_count INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    duration_minutes INTEGER,
    
    -- Context quality metrics
    context_completeness_score DECIMAL(3,2) DEFAULT 0.0,
    entity_extraction_confidence DECIMAL(3,2) DEFAULT 0.0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT conversation_contexts_conversation_id_key UNIQUE (conversation_id),
    CONSTRAINT conversation_contexts_completeness_score_range 
        CHECK (context_completeness_score >= 0.0 AND context_completeness_score <= 1.0),
    CONSTRAINT conversation_contexts_confidence_range 
        CHECK (entity_extraction_confidence >= 0.0 AND entity_extraction_confidence <= 1.0)
);

-- Table: user_profiles
-- Stores comprehensive user profiles with preferences and travel history
CREATE TABLE IF NOT EXISTS user_profiles (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id VARCHAR(36) NOT NULL,
    
    -- Personal preferences
    travel_preferences JSONB DEFAULT '{}'::jsonb,
    dietary_restrictions TEXT[],
    accessibility_needs TEXT[],
    language_preferences TEXT[],
    
    -- Travel history and patterns
    travel_history JSONB DEFAULT '{}'::jsonb,
    favorite_destinations TEXT[],
    preferred_airlines TEXT[],
    preferred_hotels TEXT[],
    loyalty_programs JSONB DEFAULT '{}'::jsonb,
    
    -- Budget and financial preferences
    budget_preferences JSONB DEFAULT '{}'::jsonb,
    payment_methods TEXT[],
    
    -- Contact and emergency information
    emergency_contacts JSONB DEFAULT '{}'::jsonb,
    passport_info JSONB DEFAULT '{}'::jsonb,
    
    -- Communication preferences
    communication_style VARCHAR(50) DEFAULT 'balanced',
    notification_preferences JSONB DEFAULT '{}'::jsonb,
    
    -- Profile metadata
    profile_completeness_score DECIMAL(3,2) DEFAULT 0.0,
    last_updated_source VARCHAR(100),
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT user_profiles_user_id_key UNIQUE (user_id),
    CONSTRAINT user_profiles_completeness_range 
        CHECK (profile_completeness_score >= 0.0 AND profile_completeness_score <= 1.0),
    CONSTRAINT user_profiles_communication_style_valid 
        CHECK (communication_style IN ('formal', 'casual', 'balanced', 'technical', 'friendly'))
);

-- Table: context_memories
-- Stores individual memories extracted from conversations with embeddings
CREATE TABLE IF NOT EXISTS context_memories (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id VARCHAR(36) NOT NULL,
    conversation_id VARCHAR(36),
    
    -- Memory content
    memory_type memory_type NOT NULL,
    content TEXT NOT NULL,
    extracted_entities JSONB DEFAULT '{}'::jsonb,
    
    -- Vector embedding reference
    embedding_id VARCHAR(36),
    vector_collection VARCHAR(100) DEFAULT 'memories',
    
    -- Importance and relevance
    importance_score DECIMAL(3,2) NOT NULL DEFAULT 0.5,
    importance_level importance_level NOT NULL DEFAULT 'medium',
    confidence_score DECIMAL(3,2) DEFAULT 0.0,
    
    -- Context and relationships
    related_memory_ids VARCHAR(36)[],
    context_tags TEXT[],
    source_message_id VARCHAR(36),
    
    -- Temporal information
    relevant_date DATE,
    expiry_date DATE,
    
    -- Usage tracking
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    last_updated_reason VARCHAR(200),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT context_memories_importance_score_range 
        CHECK (importance_score >= 0.0 AND importance_score <= 1.0),
    CONSTRAINT context_memories_confidence_score_range 
        CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    CONSTRAINT context_memories_content_not_empty 
        CHECK (char_length(content) > 0),
    CONSTRAINT context_memories_expiry_after_relevant 
        CHECK (expiry_date IS NULL OR relevant_date IS NULL OR expiry_date >= relevant_date)
);

-- Table: conversation_threads
-- Manages conversation branching and threading for context continuity
CREATE TABLE IF NOT EXISTS conversation_threads (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    parent_conversation_id VARCHAR(36) NOT NULL,
    child_conversation_id VARCHAR(36) NOT NULL,
    
    -- Branching information
    branch_point_message_id VARCHAR(36),
    branch_reason VARCHAR(500),
    branch_type VARCHAR(50) DEFAULT 'continuation',
    
    -- Context inheritance
    inherited_context_ids VARCHAR(36)[],
    context_summary TEXT,
    context_similarity_score DECIMAL(3,2),
    
    -- Thread metadata
    thread_depth INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    priority_level INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT conversation_threads_unique_child UNIQUE (child_conversation_id),
    CONSTRAINT conversation_threads_no_self_reference 
        CHECK (parent_conversation_id != child_conversation_id),
    CONSTRAINT conversation_threads_similarity_range 
        CHECK (context_similarity_score IS NULL OR 
               (context_similarity_score >= 0.0 AND context_similarity_score <= 1.0)),
    CONSTRAINT conversation_threads_branch_type_valid 
        CHECK (branch_type IN ('continuation', 'tangent', 'clarification', 'new_topic', 'followup'))
);

-- Table: entity_extractions
-- Stores extracted entities with their relationships and confidence scores
CREATE TABLE IF NOT EXISTS entity_extractions (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    conversation_id VARCHAR(36) NOT NULL,
    message_id VARCHAR(36),
    
    -- Entity information
    entity_type entity_type NOT NULL,
    entity_value TEXT NOT NULL,
    entity_context TEXT,
    normalized_value TEXT,
    
    -- Extraction metadata
    confidence_score DECIMAL(3,2) NOT NULL DEFAULT 0.0,
    extraction_method VARCHAR(50) DEFAULT 'llm',
    
    -- Entity relationships
    related_entities JSONB DEFAULT '{}'::jsonb,
    entity_properties JSONB DEFAULT '{}'::jsonb,
    
    -- Validation and verification
    is_verified BOOLEAN DEFAULT false,
    verification_source VARCHAR(100),
    verification_date TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT entity_extractions_confidence_range 
        CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    CONSTRAINT entity_extractions_value_not_empty 
        CHECK (char_length(entity_value) > 0),
    CONSTRAINT entity_extractions_method_valid 
        CHECK (extraction_method IN ('llm', 'regex', 'nlp', 'manual', 'api', 'hybrid'))
);

-- Create indexes for efficient querying

-- Conversation contexts indexes
CREATE INDEX IF NOT EXISTS idx_conversation_contexts_conversation_id 
    ON conversation_contexts(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_contexts_created_at 
    ON conversation_contexts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_contexts_last_activity 
    ON conversation_contexts(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_contexts_key_entities 
    ON conversation_contexts USING GIN (key_entities);

-- User profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id 
    ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_updated_at 
    ON user_profiles(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_travel_preferences 
    ON user_profiles USING GIN (travel_preferences);
CREATE INDEX IF NOT EXISTS idx_user_profiles_completeness 
    ON user_profiles(profile_completeness_score DESC);

-- Context memories indexes
CREATE INDEX IF NOT EXISTS idx_context_memories_user_id 
    ON context_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_context_memories_conversation_id 
    ON context_memories(conversation_id);
CREATE INDEX IF NOT EXISTS idx_context_memories_type 
    ON context_memories(memory_type);
CREATE INDEX IF NOT EXISTS idx_context_memories_importance 
    ON context_memories(importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_context_memories_created_at 
    ON context_memories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_context_memories_relevant_date 
    ON context_memories(relevant_date DESC) WHERE relevant_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_context_memories_active 
    ON context_memories(user_id, importance_score DESC) 
    WHERE expiry_date IS NULL OR expiry_date > CURRENT_DATE;
CREATE INDEX IF NOT EXISTS idx_context_memories_embedding_id 
    ON context_memories(embedding_id) WHERE embedding_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_context_memories_entities 
    ON context_memories USING GIN (extracted_entities);
CREATE INDEX IF NOT EXISTS idx_context_memories_tags 
    ON context_memories USING GIN (context_tags);

-- Conversation threads indexes
CREATE INDEX IF NOT EXISTS idx_conversation_threads_parent 
    ON conversation_threads(parent_conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_threads_child 
    ON conversation_threads(child_conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_threads_active 
    ON conversation_threads(is_active, priority_level DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_threads_depth 
    ON conversation_threads(thread_depth);

-- Entity extractions indexes
CREATE INDEX IF NOT EXISTS idx_entity_extractions_conversation_id 
    ON entity_extractions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_entity_extractions_type_value 
    ON entity_extractions(entity_type, entity_value);
CREATE INDEX IF NOT EXISTS idx_entity_extractions_confidence 
    ON entity_extractions(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_entity_extractions_verified 
    ON entity_extractions(is_verified, confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_entity_extractions_properties 
    ON entity_extractions USING GIN (entity_properties);

-- Create utility functions for context management

-- Function to calculate profile completeness score
CREATE OR REPLACE FUNCTION calculate_profile_completeness(
    p_user_id VARCHAR(36)
)
RETURNS DECIMAL(3,2) AS $$
DECLARE
    completeness_score DECIMAL(3,2) := 0.0;
    profile_record RECORD;
BEGIN
    SELECT * INTO profile_record 
    FROM user_profiles 
    WHERE user_id = p_user_id;
    
    IF profile_record IS NULL THEN
        RETURN 0.0;
    END IF;
    
    -- Basic information (20%)
    IF jsonb_array_length(COALESCE(profile_record.travel_preferences, '[]'::jsonb)) > 0 THEN
        completeness_score := completeness_score + 0.20;
    END IF;
    
    -- Travel history (20%)
    IF jsonb_array_length(COALESCE(profile_record.travel_history, '[]'::jsonb)) > 0 THEN
        completeness_score := completeness_score + 0.20;
    END IF;
    
    -- Preferences and restrictions (20%)
    IF array_length(profile_record.dietary_restrictions, 1) > 0 OR 
       array_length(profile_record.accessibility_needs, 1) > 0 THEN
        completeness_score := completeness_score + 0.20;
    END IF;
    
    -- Emergency contacts (20%)
    IF jsonb_array_length(COALESCE(profile_record.emergency_contacts, '[]'::jsonb)) > 0 THEN
        completeness_score := completeness_score + 0.20;
    END IF;
    
    -- Loyalty programs and preferences (20%)
    IF jsonb_array_length(COALESCE(profile_record.loyalty_programs, '[]'::jsonb)) > 0 OR
       array_length(profile_record.preferred_airlines, 1) > 0 THEN
        completeness_score := completeness_score + 0.20;
    END IF;
    
    RETURN completeness_score;
END;
$$ LANGUAGE plpgsql;

-- Function to get relevant memories for a user
CREATE OR REPLACE FUNCTION get_relevant_memories(
    p_user_id VARCHAR(36),
    p_memory_types memory_type[] DEFAULT NULL,
    p_limit INTEGER DEFAULT 10,
    p_min_importance DECIMAL(3,2) DEFAULT 0.3
)
RETURNS TABLE (
    memory_id VARCHAR(36),
    memory_type memory_type,
    content TEXT,
    importance_score DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE,
    context_tags TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cm.id,
        cm.memory_type,
        cm.content,
        cm.importance_score,
        cm.created_at,
        cm.context_tags
    FROM context_memories cm
    WHERE cm.user_id = p_user_id
      AND (p_memory_types IS NULL OR cm.memory_type = ANY(p_memory_types))
      AND cm.importance_score >= p_min_importance
      AND (cm.expiry_date IS NULL OR cm.expiry_date > CURRENT_DATE)
    ORDER BY cm.importance_score DESC, cm.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to update memory access tracking
CREATE OR REPLACE FUNCTION update_memory_access(
    p_memory_id VARCHAR(36)
)
RETURNS VOID AS $$
BEGIN
    UPDATE context_memories 
    SET 
        access_count = access_count + 1,
        last_accessed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_memory_id;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired memories
CREATE OR REPLACE FUNCTION cleanup_expired_memories()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM context_memories 
    WHERE expiry_date IS NOT NULL 
      AND expiry_date < CURRENT_DATE
      AND importance_level IN ('low', 'medium');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers to all tables
CREATE TRIGGER update_conversation_contexts_updated_at 
    BEFORE UPDATE ON conversation_contexts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_context_memories_updated_at 
    BEFORE UPDATE ON context_memories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversation_threads_updated_at 
    BEFORE UPDATE ON conversation_threads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_entity_extractions_updated_at 
    BEFORE UPDATE ON entity_extractions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create views for common queries

-- View: active_user_memories
CREATE OR REPLACE VIEW active_user_memories AS
SELECT 
    cm.*,
    up.communication_style,
    cc.context_summary
FROM context_memories cm
LEFT JOIN user_profiles up ON cm.user_id = up.user_id
LEFT JOIN conversation_contexts cc ON cm.conversation_id = cc.conversation_id
WHERE (cm.expiry_date IS NULL OR cm.expiry_date > CURRENT_DATE)
  AND cm.importance_score >= 0.3;

-- View: conversation_context_summary
CREATE OR REPLACE VIEW conversation_context_summary AS
SELECT 
    cc.*,
    COUNT(cm.id) as memory_count,
    AVG(cm.importance_score) as avg_memory_importance,
    COUNT(ee.id) as entity_count
FROM conversation_contexts cc
LEFT JOIN context_memories cm ON cc.conversation_id = cm.conversation_id
LEFT JOIN entity_extractions ee ON cc.conversation_id = ee.conversation_id
GROUP BY cc.id;

-- Add helpful comments
COMMENT ON TABLE conversation_contexts IS 'Stores contextual summaries and analysis for conversations';
COMMENT ON TABLE user_profiles IS 'Comprehensive user profiles with travel preferences and history';
COMMENT ON TABLE context_memories IS 'Individual memories extracted from conversations with vector embeddings';
COMMENT ON TABLE conversation_threads IS 'Manages conversation branching and threading for context continuity';
COMMENT ON TABLE entity_extractions IS 'Extracted entities with confidence scores and relationships';

COMMENT ON FUNCTION calculate_profile_completeness IS 'Calculates completeness score for user profiles';
COMMENT ON FUNCTION get_relevant_memories IS 'Retrieves relevant memories for a user with filtering options';
COMMENT ON FUNCTION update_memory_access IS 'Updates access tracking for memories';
COMMENT ON FUNCTION cleanup_expired_memories IS 'Removes expired memories based on retention policies';

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON conversation_contexts TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON user_profiles TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON context_memories TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON conversation_threads TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON entity_extractions TO your_app_user;
-- GRANT EXECUTE ON FUNCTION calculate_profile_completeness TO your_app_user;
-- GRANT EXECUTE ON FUNCTION get_relevant_memories TO your_app_user;
-- GRANT EXECUTE ON FUNCTION update_memory_access TO your_app_user;