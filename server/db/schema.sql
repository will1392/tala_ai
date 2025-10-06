-- =============================================================================
-- Tala AI Database Schema
-- PostgreSQL/Supabase Schema for Multi-Tenant Travel Assistant
-- =============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA extensions;  -- For text search performance
CREATE EXTENSION IF NOT EXISTS "unaccent" WITH SCHEMA extensions; -- For accent-insensitive search
ALTER EXTENSION "pg_trgm" SET SCHEMA extensions;
ALTER EXTENSION "unaccent" SET SCHEMA extensions;

-- =============================================================================
-- ORGANIZATIONS TABLE
-- Purpose: Multi-tenancy support, each organization has isolated data
-- =============================================================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL, -- URL-friendly identifier
    description TEXT,
    
    -- Subscription and limits
    plan_type VARCHAR(50) DEFAULT 'free', -- free, pro, enterprise
    max_users INTEGER DEFAULT 10,
    max_documents INTEGER DEFAULT 1000,
    max_monthly_llm_requests INTEGER DEFAULT 1000,
    
    -- Feature flags
    features JSONB DEFAULT '{}', -- Flexible feature configuration
    
    -- Branding
    logo_url TEXT,
    primary_color VARCHAR(7), -- Hex color code
    
    -- Billing
    stripe_customer_id VARCHAR(255),
    billing_email VARCHAR(255),
    
    -- Metadata
    settings JSONB DEFAULT '{}', -- Organization-specific settings
    metadata JSONB DEFAULT '{}', -- Additional flexible data
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_plan_type CHECK (plan_type IN ('free', 'pro', 'enterprise')),
    CONSTRAINT positive_limits CHECK (
        max_users > 0 AND 
        max_documents > 0 AND 
        max_monthly_llm_requests > 0
    )
);

-- =============================================================================
-- USERS TABLE  
-- Purpose: User accounts within organizations, authentication and preferences
-- =============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Authentication (Supabase Auth integration)
    auth_user_id UUID, -- Links to Supabase auth.users
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    
    -- Profile information
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    display_name VARCHAR(200),
    avatar_url TEXT,
    bio TEXT,
    
    -- Role and permissions
    role VARCHAR(50) DEFAULT 'member', -- owner, admin, member, viewer
    permissions JSONB DEFAULT '[]', -- Granular permissions array
    
    -- User preferences
    preferences JSONB DEFAULT '{}', -- UI preferences, language, etc.
    llm_preferences JSONB DEFAULT '{}', -- Model preferences, cost settings
    
    -- Activity tracking
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_active_at TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, suspended
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_role CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'suspended'))
);

-- =============================================================================
-- CONVERSATIONS TABLE
-- Purpose: Chat conversation sessions with metadata and settings
-- =============================================================================

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Conversation details
    title VARCHAR(500) NOT NULL,
    description TEXT,
    
    -- Status and settings
    status VARCHAR(20) DEFAULT 'active', -- active, archived, deleted
    is_pinned BOOLEAN DEFAULT FALSE,
    is_shared BOOLEAN DEFAULT FALSE,
    share_token VARCHAR(255) UNIQUE, -- For public sharing
    
    -- Conversation context and memory
    context_enabled BOOLEAN DEFAULT TRUE,
    context_reset BOOLEAN DEFAULT FALSE,
    persist_context BOOLEAN DEFAULT TRUE,
    conversation_state JSONB DEFAULT '{}', -- Entity memory, user preferences
    
    -- AI model preferences for this conversation
    preferred_model VARCHAR(100),
    cost_optimization_enabled BOOLEAN DEFAULT FALSE,
    max_tokens INTEGER,
    temperature DECIMAL(3,2),
    
    -- Analytics
    message_count INTEGER DEFAULT 0,
    total_tokens_used INTEGER DEFAULT 0,
    total_cost DECIMAL(10,6) DEFAULT 0,
    avg_response_time INTEGER, -- milliseconds
    
    -- Activity tracking
    last_message_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata
    tags TEXT[], -- Simple tags array
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_status CHECK (status IN ('active', 'archived', 'deleted')),
    CONSTRAINT valid_temperature CHECK (temperature >= 0 AND temperature <= 2),
    CONSTRAINT positive_tokens CHECK (max_tokens IS NULL OR max_tokens > 0)
);

-- =============================================================================
-- MESSAGES TABLE
-- Purpose: Individual messages within conversations with AI metadata
-- =============================================================================

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    
    -- Message content
    content TEXT NOT NULL,
    sender VARCHAR(20) NOT NULL, -- 'user', 'assistant'
    
    -- Message metadata
    message_index INTEGER NOT NULL, -- Order within conversation
    parent_message_id UUID REFERENCES messages(id), -- For threading/edits
    
    -- AI model information (for assistant messages)
    model_used VARCHAR(100),
    provider VARCHAR(50),
    
    -- Token and cost tracking
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    cost DECIMAL(10,6),
    
    -- Performance metrics
    response_time_ms INTEGER,
    processing_time_ms INTEGER,
    
    -- AI routing information
    query_type VARCHAR(50),
    routing_reasoning JSONB,
    fallbacks_used INTEGER DEFAULT 0,
    cost_optimized BOOLEAN DEFAULT FALSE,
    
    -- Context and sources
    context_used JSONB DEFAULT '[]', -- Documents/sources referenced
    entities_extracted JSONB DEFAULT '[]', -- NLP entities
    
    -- Message status
    status VARCHAR(20) DEFAULT 'sent', -- sent, delivered, failed, retrying
    error_message TEXT,
    
    -- User interaction
    user_rating INTEGER, -- 1-5 rating
    user_feedback TEXT,
    is_bookmarked BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_sender CHECK (sender IN ('user', 'assistant')),
    CONSTRAINT valid_status CHECK (status IN ('sent', 'delivered', 'failed', 'retrying')),
    CONSTRAINT valid_rating CHECK (user_rating IS NULL OR (user_rating >= 1 AND user_rating <= 5)),
    CONSTRAINT positive_tokens CHECK (
        prompt_tokens IS NULL OR prompt_tokens >= 0 AND
        completion_tokens IS NULL OR completion_tokens >= 0 AND
        total_tokens IS NULL OR total_tokens >= 0
    )
);

-- =============================================================================
-- FOLDERS TABLE
-- Purpose: Hierarchical document organization within organizations
-- =============================================================================

CREATE TABLE folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL for shared folders
    
    -- Folder hierarchy
    parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    
    -- Folder details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7), -- Hex color code
    icon VARCHAR(50), -- Icon identifier
    
    -- Folder settings
    is_system BOOLEAN DEFAULT FALSE, -- System-managed folders
    is_public BOOLEAN DEFAULT FALSE, -- Public within organization
    is_shared BOOLEAN DEFAULT FALSE, -- Shared with specific users
    
    -- Access control
    visibility VARCHAR(20) DEFAULT 'private', -- private, organization, public
    allowed_user_ids UUID[], -- Specific user access
    
    -- Organization and sorting
    sort_order INTEGER DEFAULT 0,
    path TEXT, -- Computed path for efficient queries (/folder1/subfolder2/)
    depth INTEGER DEFAULT 0, -- Tree depth for queries
    
    -- Document count (denormalized for performance)
    document_count INTEGER DEFAULT 0,
    total_size_bytes BIGINT DEFAULT 0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_visibility CHECK (visibility IN ('private', 'organization', 'public')),
    CONSTRAINT no_self_reference CHECK (id != parent_id)
);

-- =============================================================================
-- PRIMARY_FOLDERS TABLE
-- Purpose: System-level default folders, templates for new organizations
-- =============================================================================

CREATE TABLE primary_folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Folder template details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7),
    
    -- Template settings
    is_default BOOLEAN DEFAULT TRUE, -- Created for new organizations
    is_required BOOLEAN DEFAULT FALSE, -- Cannot be deleted
    category VARCHAR(50), -- travel, documents, personal, etc.
    
    -- Default permissions
    default_visibility VARCHAR(20) DEFAULT 'organization',
    
    -- Organization and display
    sort_order INTEGER DEFAULT 0,
    parent_template_id UUID REFERENCES primary_folders(id),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_default_visibility CHECK (default_visibility IN ('private', 'organization', 'public'))
);

-- =============================================================================
-- DOCUMENTS TABLE
-- Purpose: Document storage with metadata, vector embeddings via Qdrant
-- =============================================================================

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Original uploader
    
    -- File information
    original_name VARCHAR(500) NOT NULL,
    file_name VARCHAR(500) NOT NULL, -- Stored file name
    file_path TEXT, -- Local/cloud storage path
    file_size_bytes BIGINT,
    file_type VARCHAR(100), -- MIME type
    file_extension VARCHAR(10),
    
    -- Cloud storage information
    storage_provider VARCHAR(50) DEFAULT 'local', -- local, aws, azure, gcp
    storage_key TEXT, -- Cloud storage key/path
    storage_url TEXT, -- Direct access URL
    
    -- Document content
    content_text TEXT, -- Extracted text content
    content_summary TEXT, -- AI-generated summary
    language_code VARCHAR(10) DEFAULT 'en',
    
    -- Vector embeddings (Qdrant integration)
    qdrant_collection VARCHAR(100), -- Qdrant collection name
    qdrant_point_id UUID, -- Point ID in Qdrant
    embedding_model VARCHAR(100), -- Model used for embeddings
    embedding_status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed
    
    -- Document processing
    processing_status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    extraction_method VARCHAR(50), -- pdf-parse, mammoth, etc.
    ocr_applied BOOLEAN DEFAULT FALSE,
    
    -- Document metadata
    title VARCHAR(500), -- Extracted or user-provided title
    description TEXT,
    author VARCHAR(255),
    subject VARCHAR(255),
    keywords TEXT[],
    
    -- Document analysis
    page_count INTEGER,
    word_count INTEGER,
    character_count INTEGER,
    reading_time_minutes INTEGER,
    
    -- Access control
    visibility VARCHAR(20) DEFAULT 'private',
    is_shared BOOLEAN DEFAULT FALSE,
    shared_with_user_ids UUID[],
    
    -- Activity tracking
    view_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    
    -- Version control
    version INTEGER DEFAULT 1,
    previous_version_id UUID REFERENCES documents(id),
    is_latest_version BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_visibility CHECK (visibility IN ('private', 'organization', 'public')),
    CONSTRAINT valid_processing_status CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    CONSTRAINT valid_embedding_status CHECK (embedding_status IN ('pending', 'completed', 'failed')),
    CONSTRAINT positive_metrics CHECK (
        file_size_bytes >= 0 AND
        view_count >= 0 AND
        download_count >= 0 AND
        version >= 1
    )
);

-- =============================================================================
-- TAGS TABLE
-- Purpose: Flexible tagging system for documents and other entities
-- =============================================================================

CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Tag details
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL, -- URL-friendly version
    description TEXT,
    color VARCHAR(7), -- Hex color code
    
    -- Tag categorization
    category VARCHAR(50), -- travel, document-type, priority, etc.
    is_system BOOLEAN DEFAULT FALSE, -- System-managed tags
    
    -- Usage statistics
    usage_count INTEGER DEFAULT 0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(organization_id, slug)
);

-- =============================================================================
-- DOCUMENT_TAGS TABLE
-- Purpose: Many-to-many relationship between documents and tags
-- =============================================================================

CREATE TABLE document_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    
    -- Relationship metadata
    applied_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    confidence_score DECIMAL(5,4), -- For AI-applied tags (0.0-1.0)
    is_ai_generated BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(document_id, tag_id)
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Organization-based indexes (multi-tenancy)
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_conversations_organization_id ON conversations(organization_id);
CREATE INDEX idx_documents_organization_id ON documents(organization_id);
CREATE INDEX idx_folders_organization_id ON folders(organization_id);
CREATE INDEX idx_tags_organization_id ON tags(organization_id);

-- User-based indexes
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_folders_user_id ON folders(user_id);

-- Conversation and message relationships
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_conversation_index ON messages(conversation_id, message_index);

-- Folder hierarchy indexes
CREATE INDEX idx_folders_parent_id ON folders(parent_id);
CREATE INDEX idx_folders_path ON folders USING gin(path gin_trgm_ops);
CREATE INDEX idx_documents_folder_id ON documents(folder_id);

-- Tagging indexes
CREATE INDEX idx_document_tags_document_id ON document_tags(document_id);
CREATE INDEX idx_document_tags_tag_id ON document_tags(tag_id);

-- Timestamp indexes for sorting and filtering
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX idx_documents_updated_at ON documents(updated_at DESC);

-- Activity tracking indexes
CREATE INDEX idx_conversations_last_activity ON conversations(last_activity_at DESC);
CREATE INDEX idx_users_last_active ON users(last_active_at DESC);
CREATE INDEX idx_documents_last_accessed ON documents(last_accessed_at DESC);

-- Search indexes using trigram matching
CREATE INDEX idx_documents_name_search ON documents USING gin(original_name gin_trgm_ops);
CREATE INDEX idx_documents_content_search ON documents USING gin(content_text gin_trgm_ops);
CREATE INDEX idx_conversations_title_search ON conversations USING gin(title gin_trgm_ops);
CREATE INDEX idx_users_name_search ON users USING gin(display_name gin_trgm_ops);
CREATE INDEX idx_tags_name_search ON tags USING gin(name gin_trgm_ops);

-- Status and filtering indexes
CREATE INDEX idx_conversations_status ON conversations(status) WHERE status != 'deleted';
CREATE INDEX idx_documents_processing_status ON documents(processing_status);
CREATE INDEX idx_documents_visibility ON documents(visibility);
CREATE INDEX idx_users_status ON users(status) WHERE status = 'active';

-- Composite indexes for common queries
CREATE INDEX idx_conversations_user_status ON conversations(user_id, status, updated_at DESC);
CREATE INDEX idx_documents_org_folder ON documents(organization_id, folder_id, created_at DESC);
CREATE INDEX idx_messages_conv_sender ON messages(conversation_id, sender, created_at);

-- JSON field indexes (for JSONB columns)
CREATE INDEX idx_users_preferences ON users USING gin(preferences);
CREATE INDEX idx_conversations_state ON conversations USING gin(conversation_state);
CREATE INDEX idx_messages_context ON messages USING gin(context_used);
CREATE INDEX idx_documents_metadata ON documents USING gin(metadata);

-- =============================================================================
-- FUNCTIONS FOR AUTOMATIC UPDATES
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Function to update conversation message count
CREATE OR REPLACE FUNCTION update_conversation_message_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE conversations
        SET message_count = message_count + 1,
            last_message_at = NEW.created_at,
            last_activity_at = NEW.created_at
        WHERE id = NEW.conversation_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE conversations
        SET message_count = message_count - 1
        WHERE id = OLD.conversation_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- Function to update folder document count
CREATE OR REPLACE FUNCTION update_folder_document_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE folders
        SET document_count = document_count + 1,
            total_size_bytes = total_size_bytes + COALESCE(NEW.file_size_bytes, 0)
        WHERE id = NEW.folder_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE folders
        SET document_count = document_count - 1,
            total_size_bytes = total_size_bytes - COALESCE(OLD.file_size_bytes, 0)
        WHERE id = OLD.folder_id;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle folder changes
        IF OLD.folder_id != NEW.folder_id THEN
            -- Remove from old folder
            IF OLD.folder_id IS NOT NULL THEN
                UPDATE folders
                SET document_count = document_count - 1,
                    total_size_bytes = total_size_bytes - COALESCE(OLD.file_size_bytes, 0)
                WHERE id = OLD.folder_id;
            END IF;
            -- Add to new folder
            IF NEW.folder_id IS NOT NULL THEN
                UPDATE folders
                SET document_count = document_count + 1,
                    total_size_bytes = total_size_bytes + COALESCE(NEW.file_size_bytes, 0)
                WHERE id = NEW.folder_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

-- Function to update tag usage count
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE tags SET usage_count = usage_count - 1 WHERE id = OLD.tag_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Updated_at triggers
CREATE TRIGGER trigger_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_folders_updated_at BEFORE UPDATE ON folders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Conversation message count triggers
CREATE TRIGGER trigger_messages_conversation_count AFTER INSERT OR DELETE ON messages FOR EACH ROW EXECUTE FUNCTION update_conversation_message_count();

-- Folder document count triggers
CREATE TRIGGER trigger_documents_folder_count AFTER INSERT OR DELETE OR UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_folder_document_count();

-- Tag usage count triggers
CREATE TRIGGER trigger_document_tags_usage_count AFTER INSERT OR DELETE ON document_tags FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE primary_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_version ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON migrations FROM anon, authenticated;
REVOKE ALL ON schema_version FROM anon, authenticated;
GRANT SELECT ON migrations TO service_role;
GRANT SELECT ON schema_version TO service_role;

-- Organizations: Users can only see their own organization
CREATE POLICY "Users can view own organization" ON organizations FOR SELECT USING (
    id IN (SELECT organization_id FROM users WHERE auth_user_id = auth.uid())
);

-- Users: Can view users in same organization  
CREATE POLICY "Users can view organization members" ON users FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE auth_user_id = auth.uid())
);

-- Conversations: Users can only access their own conversations
CREATE POLICY "Users can manage own conversations" ON conversations FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
);

-- Messages: Users can access messages from their conversations
CREATE POLICY "Users can access own conversation messages" ON messages FOR ALL USING (
    conversation_id IN (
        SELECT id FROM conversations WHERE user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    )
);

-- Documents: Users can access documents in their organization (with visibility rules)
CREATE POLICY "Users can access organization documents" ON documents FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE auth_user_id = auth.uid())
    AND (
        visibility = 'organization' OR
        visibility = 'public' OR
        (visibility = 'private' AND user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()))
    )
);

-- Folders: Restrict access to authorized members of the organization
CREATE POLICY "Users can view accessible folders" ON folders FOR SELECT USING (
    auth.role() = 'service_role'
    OR EXISTS (
        SELECT 1
        FROM users current_user
        WHERE current_user.auth_user_id = auth.uid()
          AND current_user.organization_id = folders.organization_id
          AND (
              folders.visibility IN ('organization', 'public')
              OR folders.user_id = current_user.id
              OR (folders.allowed_user_ids IS NOT NULL AND current_user.id = ANY(folders.allowed_user_ids))
          )
    )
);

CREATE POLICY "Users can manage own folders" ON folders FOR INSERT WITH CHECK (
    auth.role() = 'service_role'
    OR EXISTS (
        SELECT 1
        FROM users current_user
        WHERE current_user.auth_user_id = auth.uid()
          AND current_user.id = folders.user_id
          AND current_user.organization_id = folders.organization_id
    )
);

CREATE POLICY "Users can update own folders" ON folders FOR UPDATE USING (
    auth.role() = 'service_role'
    OR EXISTS (
        SELECT 1
        FROM users current_user
        WHERE current_user.auth_user_id = auth.uid()
          AND current_user.id = folders.user_id
          AND current_user.organization_id = folders.organization_id
    )
) WITH CHECK (
    auth.role() = 'service_role'
    OR EXISTS (
        SELECT 1
        FROM users current_user
        WHERE current_user.auth_user_id = auth.uid()
          AND current_user.id = folders.user_id
          AND current_user.organization_id = folders.organization_id
    )
);

CREATE POLICY "Users can delete own folders" ON folders FOR DELETE USING (
    auth.role() = 'service_role'
    OR EXISTS (
        SELECT 1
        FROM users current_user
        WHERE current_user.auth_user_id = auth.uid()
          AND current_user.id = folders.user_id
          AND current_user.organization_id = folders.organization_id
    )
);

-- Tags: Organization-level access with admin controls for writes
CREATE POLICY "Users can view organization tags" ON tags FOR SELECT USING (
    auth.role() = 'service_role'
    OR EXISTS (
        SELECT 1 FROM users current_user
        WHERE current_user.auth_user_id = auth.uid()
          AND current_user.organization_id = tags.organization_id
    )
);

CREATE POLICY "Admins manage organization tags" ON tags FOR ALL USING (
    auth.role() = 'service_role'
    OR EXISTS (
        SELECT 1 FROM users current_user
        WHERE current_user.auth_user_id = auth.uid()
          AND current_user.organization_id = tags.organization_id
          AND current_user.role IN ('owner', 'admin')
    )
) WITH CHECK (
    auth.role() = 'service_role'
    OR EXISTS (
        SELECT 1 FROM users current_user
        WHERE current_user.auth_user_id = auth.uid()
          AND current_user.organization_id = tags.organization_id
          AND current_user.role IN ('owner', 'admin')
    )
);

-- Document tags: Allow viewing and management based on document access
CREATE POLICY "Users can view document tags" ON document_tags FOR SELECT USING (
    auth.role() = 'service_role'
    OR EXISTS (
        SELECT 1
        FROM users current_user
        JOIN documents d ON d.id = document_tags.document_id
        WHERE current_user.auth_user_id = auth.uid()
          AND current_user.organization_id = d.organization_id
          AND (
              d.visibility IN ('organization', 'public')
              OR d.user_id = current_user.id
              OR (d.is_shared AND d.shared_with_user_ids IS NOT NULL AND current_user.id = ANY(d.shared_with_user_ids))
          )
    )
);

CREATE POLICY "Users can modify owned document tags" ON document_tags FOR ALL USING (
    auth.role() = 'service_role'
    OR EXISTS (
        SELECT 1
        FROM users current_user
        JOIN documents d ON d.id = document_tags.document_id
        WHERE current_user.auth_user_id = auth.uid()
          AND current_user.id = d.user_id
    )
) WITH CHECK (
    auth.role() = 'service_role'
    OR EXISTS (
        SELECT 1
        FROM users current_user
        JOIN documents d ON d.id = document_tags.document_id
        WHERE current_user.auth_user_id = auth.uid()
          AND current_user.id = d.user_id
    )
);

-- Primary folders: readable by authenticated users, managed by service role
CREATE POLICY "Authenticated users can read primary folders" ON primary_folders FOR SELECT USING (
    auth.role() IN ('authenticated', 'service_role')
);

CREATE POLICY "Service role manages primary folders" ON primary_folders FOR ALL USING (
    auth.role() = 'service_role'
) WITH CHECK (auth.role() = 'service_role');

-- Migration tables restricted to service role
CREATE POLICY "Service role reads migrations" ON migrations FOR SELECT USING (
    auth.role() = 'service_role'
);

CREATE POLICY "Service role manages migrations" ON migrations FOR ALL USING (
    auth.role() = 'service_role'
) WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role reads schema version" ON schema_version FOR SELECT USING (
    auth.role() = 'service_role'
);

CREATE POLICY "Service role manages schema version" ON schema_version FOR ALL USING (
    auth.role() = 'service_role'
) WITH CHECK (auth.role() = 'service_role');

-- =============================================================================
-- INITIAL DATA
-- =============================================================================

-- Insert default primary folders
INSERT INTO primary_folders (name, description, icon, category, sort_order, is_default, is_required) VALUES
('Travel Documents', 'Passports, visas, and official travel documents', 'passport', 'travel', 1, true, true),
('Flight Information', 'Boarding passes, tickets, and airline communications', 'plane', 'travel', 2, true, false),
('Accommodation', 'Hotel bookings, rental confirmations, and lodging details', 'bed', 'travel', 3, true, false),
('Insurance', 'Travel insurance policies and medical documents', 'shield', 'travel', 4, true, false),
('Financial', 'Bank statements, credit cards, and financial documents', 'credit-card', 'documents', 5, true, false),
('Personal', 'Personal documents and miscellaneous files', 'user', 'personal', 6, true, false);

-- =============================================================================
-- VIEWS FOR COMMON QUERIES
-- =============================================================================

-- View for conversation summaries with latest message scoped to the caller
CREATE OR REPLACE VIEW conversation_summaries AS
SELECT
    c.*,
    owner.display_name AS owner_display_name,
    latest_msg.content AS latest_message,
    latest_msg.created_at AS latest_message_at,
    latest_msg.sender AS latest_message_sender
FROM conversations c
JOIN users owner ON owner.id = c.user_id
LEFT JOIN LATERAL (
    SELECT content, created_at, sender
    FROM messages
    WHERE conversation_id = c.id
    ORDER BY created_at DESC
    LIMIT 1
) latest_msg ON TRUE
WHERE c.deleted_at IS NULL
  AND (
      auth.role() = 'service_role'
      OR EXISTS (
          SELECT 1
          FROM users current_user
          WHERE current_user.auth_user_id = auth.uid()
            AND current_user.id = c.user_id
      )
  );
ALTER VIEW conversation_summaries SET (security_invoker = true);
REVOKE ALL ON conversation_summaries FROM anon;
GRANT SELECT ON conversation_summaries TO authenticated;

-- View of documents the caller is allowed to access
CREATE OR REPLACE VIEW accessible_documents AS
SELECT
    d.*
FROM documents d
WHERE d.deleted_at IS NULL
  AND (
      auth.role() = 'service_role'
      OR EXISTS (
          SELECT 1
          FROM users current_user
          WHERE current_user.auth_user_id = auth.uid()
            AND current_user.organization_id = d.organization_id
            AND (
                d.visibility IN ('organization', 'public')
                OR d.user_id = current_user.id
                OR (d.is_shared AND d.shared_with_user_ids IS NOT NULL AND current_user.id = ANY(d.shared_with_user_ids))
            )
      )
  );
ALTER VIEW accessible_documents SET (security_invoker = true);
REVOKE ALL ON accessible_documents FROM anon;
GRANT SELECT ON accessible_documents TO authenticated;

-- View for document search with folder information limited by access rules
CREATE OR REPLACE VIEW document_search AS
SELECT
    d.*,
    f.name AS folder_name,
    f.path AS folder_path,
    owner.display_name AS uploader_name,
    ARRAY_AGG(t.name) FILTER (WHERE t.name IS NOT NULL) AS tag_names
FROM accessible_documents d
LEFT JOIN folders f ON d.folder_id = f.id
LEFT JOIN users owner ON d.user_id = owner.id
LEFT JOIN document_tags dt ON d.id = dt.document_id
LEFT JOIN tags t ON dt.tag_id = t.id
GROUP BY d.id, f.name, f.path, owner.display_name;
ALTER VIEW document_search SET (security_invoker = true);
REVOKE ALL ON document_search FROM anon;
GRANT SELECT ON document_search TO authenticated;

-- View exposing details about the current user only
CREATE OR REPLACE VIEW user_details AS
SELECT
    u.id,
    u.organization_id,
    u.email,
    u.first_name,
    u.last_name,
    u.display_name,
    u.avatar_url,
    u.role,
    u.status,
    u.preferences,
    u.metadata,
    u.created_at,
    u.updated_at
FROM users u
WHERE
    auth.role() = 'service_role'
    OR u.auth_user_id = auth.uid();
ALTER VIEW user_details SET (security_invoker = true);
REVOKE ALL ON user_details FROM anon;
GRANT SELECT ON user_details TO authenticated;

-- View for organization usage scoped to the requesting tenant
CREATE OR REPLACE VIEW agency_usage_summary AS
SELECT
    u.organization_id,
    u.id AS user_id,
    u.display_name,
    u.email,
    u.role,
    u.status,
    u.plan_type,
    COALESCE(uc.monthly_allocation, 0) AS total_credits,
    GREATEST(COALESCE(uc.monthly_allocation, 0) - COALESCE(uc.balance, 0), 0) AS used_credits,
    0::INTEGER AS bonus_credits,
    COALESCE(uc.balance, 0) AS available_credits,
    (u.status = 'active') AS active,
    u.updated_at AS last_activity_at
FROM users u
LEFT JOIN user_credits uc ON uc.user_id = u.id::text
WHERE
    auth.role() = 'service_role'
    OR EXISTS (
        SELECT 1
        FROM users current_user
        WHERE current_user.auth_user_id = auth.uid()
          AND current_user.organization_id = u.organization_id
          AND (
              current_user.role IN ('owner', 'admin')
              OR current_user.id = u.id
          )
    );
ALTER VIEW agency_usage_summary SET (security_invoker = true);
REVOKE ALL ON agency_usage_summary FROM anon;
GRANT SELECT ON agency_usage_summary TO authenticated;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE organizations IS 'Multi-tenant organizations with subscription and feature management';
COMMENT ON TABLE users IS 'User accounts within organizations with roles and preferences';
COMMENT ON TABLE conversations IS 'Chat conversation sessions with AI model preferences and analytics';
COMMENT ON TABLE messages IS 'Individual messages with AI routing and performance metadata';
COMMENT ON TABLE documents IS 'Document storage with cloud integration and vector embedding support';
COMMENT ON TABLE folders IS 'Hierarchical document organization with access controls';
COMMENT ON TABLE primary_folders IS 'System-wide folder templates for new organizations';
COMMENT ON TABLE tags IS 'Flexible tagging system for document categorization';
COMMENT ON TABLE document_tags IS 'Many-to-many relationship between documents and tags';

COMMENT ON COLUMN documents.qdrant_collection IS 'Qdrant collection name for vector embeddings';
COMMENT ON COLUMN documents.qdrant_point_id IS 'Point ID in Qdrant vector database';
COMMENT ON COLUMN messages.routing_reasoning IS 'JSON array of LLM routing decision factors';
COMMENT ON COLUMN conversations.conversation_state IS 'Persistent conversation context and entity memory';

-- =============================================================================
-- MIGRATIONS TRACKING
-- =============================================================================

CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for migrations table
CREATE INDEX IF NOT EXISTS idx_migrations_name ON migrations(name);
CREATE INDEX IF NOT EXISTS idx_migrations_applied_at ON migrations(applied_at);

-- Helper functions for migrations
CREATE OR REPLACE FUNCTION create_migration_table()
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
END;
$$;

CREATE OR REPLACE FUNCTION drop_table_if_exists(table_name text)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', table_name);
END;
$$;

CREATE OR REPLACE FUNCTION drop_type_if_exists(type_name text)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    EXECUTE format('DROP TYPE IF EXISTS %I CASCADE', type_name);
END;
$$;

-- =============================================================================
-- SCHEMA VERSION
-- =============================================================================

CREATE TABLE schema_version (
    version VARCHAR(20) PRIMARY KEY,
    description TEXT,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO schema_version (version, description) VALUES 
('1.0.0', 'Initial Tala AI database schema with multi-tenancy and LLM integration');