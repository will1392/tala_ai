-- Migration: Create Encryption Tables for End-to-End Encryption
-- This migration creates the necessary tables for user key management and document encryption

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for key algorithms
DO $$ BEGIN
    CREATE TYPE key_algorithm AS ENUM ('RSA', 'ECDSA', 'ECDH');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for encryption status
DO $$ BEGIN
    CREATE TYPE encryption_status AS ENUM ('active', 'inactive', 'rotated', 'revoked', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- User encryption keys table
CREATE TABLE IF NOT EXISTS user_encryption_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User identification
    user_id VARCHAR(255) NOT NULL,
    
    -- Key data
    public_key TEXT NOT NULL,                    -- Public key in PEM format
    encrypted_private_key TEXT NOT NULL,        -- Double-encrypted private key
    key_fingerprint VARCHAR(64) NOT NULL,       -- Key fingerprint for identification
    salt VARCHAR(255) NOT NULL,                 -- Salt for key derivation (base64)
    
    -- Key metadata
    algorithm key_algorithm DEFAULT 'RSA',      -- Key algorithm
    key_size INTEGER DEFAULT 4096,              -- Key size in bits
    version INTEGER DEFAULT 1,                  -- Key version for rotation
    
    -- Status and lifecycle
    is_active BOOLEAN DEFAULT true,             -- Whether key is currently active
    status encryption_status DEFAULT 'active',  -- Current key status
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    rotated_at TIMESTAMP WITH TIME ZONE,        -- When key was rotated
    replaced_at TIMESTAMP WITH TIME ZONE,       -- When key was replaced
    expires_at TIMESTAMP WITH TIME ZONE,        -- Optional expiration
    
    -- Rotation/replacement tracking
    rotation_reason TEXT,                        -- Reason for rotation
    replacement_reason TEXT,                     -- Reason for replacement
    replaced_by_key_id UUID,                    -- ID of replacement key
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb,         -- Additional key metadata
    
    -- Constraints
    CONSTRAINT user_encryption_keys_user_id_length CHECK (char_length(user_id) > 0),
    CONSTRAINT user_encryption_keys_fingerprint_length CHECK (char_length(key_fingerprint) > 0),
    CONSTRAINT user_encryption_keys_key_size_valid CHECK (key_size >= 2048),
    CONSTRAINT user_encryption_keys_version_positive CHECK (version > 0),
    
    -- Only one active key per user
    CONSTRAINT user_encryption_keys_one_active_per_user EXCLUDE (user_id WITH =) WHERE (is_active = true)
);

-- Key backups table
CREATE TABLE IF NOT EXISTS key_backups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User and key identification
    user_id VARCHAR(255) NOT NULL,
    key_fingerprint VARCHAR(64) NOT NULL,
    
    -- Backup data
    encrypted_backup TEXT NOT NULL,              -- Encrypted backup data
    backup_salt VARCHAR(255) NOT NULL,          -- Salt for backup encryption
    includes_private_key BOOLEAN DEFAULT true,   -- Whether backup includes private key
    
    -- Backup metadata
    backup_reason TEXT DEFAULT 'manual_backup',  -- Reason for backup
    backup_type VARCHAR(50) DEFAULT 'full',     -- Type of backup (full, partial)
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    accessed_at TIMESTAMP WITH TIME ZONE,       -- Last time backup was accessed
    
    -- Constraints
    CONSTRAINT key_backups_user_id_length CHECK (char_length(user_id) > 0),
    CONSTRAINT key_backups_fingerprint_length CHECK (char_length(key_fingerprint) > 0)
);

-- Document encryption metadata table
CREATE TABLE IF NOT EXISTS document_encryption (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Document identification
    document_id VARCHAR(255) NOT NULL UNIQUE,   -- Reference to main documents table
    
    -- Encryption metadata
    is_encrypted BOOLEAN DEFAULT false,          -- Whether document is encrypted
    encryption_algorithm VARCHAR(50) DEFAULT 'AES-256-GCM', -- Encryption algorithm
    key_algorithm VARCHAR(50) DEFAULT 'RSA-OAEP', -- Key encryption algorithm
    encryption_version INTEGER DEFAULT 1,        -- Encryption version for upgrades
    
    -- Document key information
    document_key_id UUID,                        -- Unique ID for this document's key
    content_fingerprint VARCHAR(64),            -- Fingerprint of original content
    
    -- Encryption metadata
    encryption_metadata JSONB DEFAULT '{}'::jsonb, -- Structured encryption data
    
    -- Access control
    created_by_user_id VARCHAR(255) NOT NULL,   -- User who encrypted the document
    encrypted_for_users JSONB DEFAULT '[]'::jsonb, -- Array of user IDs with access
    
    -- Timestamps
    encrypted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_shared_at TIMESTAMP WITH TIME ZONE,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    
    -- Re-encryption tracking
    re_encrypted_at TIMESTAMP WITH TIME ZONE,
    re_encryption_reason TEXT,
    
    -- Constraints
    CONSTRAINT document_encryption_document_id_length CHECK (char_length(document_id) > 0),
    CONSTRAINT document_encryption_created_by_length CHECK (char_length(created_by_user_id) > 0),
    CONSTRAINT document_encryption_version_positive CHECK (encryption_version > 0)
);

-- Document key shares table (tracks who has access to each document)
CREATE TABLE IF NOT EXISTS document_key_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Document and user identification
    document_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    recipient_key_fingerprint VARCHAR(64) NOT NULL,
    
    -- Encrypted document key for this user
    encrypted_document_key TEXT NOT NULL,       -- Document key encrypted with user's public key
    key_encryption_algorithm VARCHAR(50) DEFAULT 'RSA-OAEP',
    
    -- Share metadata
    shared_by_user_id VARCHAR(255) NOT NULL,    -- Who shared access
    share_permissions JSONB DEFAULT '["read"]'::jsonb, -- Permissions granted
    
    -- Timestamps
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    
    -- Revocation tracking
    revoked_by_user_id VARCHAR(255),
    revocation_reason TEXT,
    
    -- Constraints
    CONSTRAINT document_key_shares_document_id_length CHECK (char_length(document_id) > 0),
    CONSTRAINT document_key_shares_user_id_length CHECK (char_length(user_id) > 0),
    CONSTRAINT document_key_shares_shared_by_length CHECK (char_length(shared_by_user_id) > 0),
    
    -- Unique constraint: one share per document per user
    CONSTRAINT document_key_shares_unique_user_document UNIQUE (document_id, user_id)
);

-- Encryption audit log table
CREATE TABLE IF NOT EXISTS encryption_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Event identification
    event_type VARCHAR(50) NOT NULL,            -- Type of encryption event
    entity_type VARCHAR(50) NOT NULL,           -- Type of entity (document, key, etc.)
    entity_id VARCHAR(255) NOT NULL,            -- ID of the entity
    
    -- User context
    user_id VARCHAR(255),                       -- User performing the action
    user_fingerprint VARCHAR(64),              -- User's key fingerprint
    
    -- Event details
    event_data JSONB DEFAULT '{}'::jsonb,      -- Structured event data
    success BOOLEAN DEFAULT true,               -- Whether operation succeeded
    error_message TEXT,                         -- Error message if failed
    
    -- Request context
    ip_address INET,                            -- IP address of request
    user_agent TEXT,                            -- User agent string
    request_id VARCHAR(255),                    -- Request tracking ID
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT encryption_audit_log_event_type_length CHECK (char_length(event_type) > 0),
    CONSTRAINT encryption_audit_log_entity_type_length CHECK (char_length(entity_type) > 0),
    CONSTRAINT encryption_audit_log_entity_id_length CHECK (char_length(entity_id) > 0)
);

-- Create indexes for performance

-- User encryption keys indexes
CREATE INDEX IF NOT EXISTS idx_user_encryption_keys_user_id ON user_encryption_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_encryption_keys_fingerprint ON user_encryption_keys(key_fingerprint);
CREATE INDEX IF NOT EXISTS idx_user_encryption_keys_active ON user_encryption_keys(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_encryption_keys_status ON user_encryption_keys(status);
CREATE INDEX IF NOT EXISTS idx_user_encryption_keys_created_at ON user_encryption_keys(created_at);

-- Key backups indexes
CREATE INDEX IF NOT EXISTS idx_key_backups_user_id ON key_backups(user_id);
CREATE INDEX IF NOT EXISTS idx_key_backups_fingerprint ON key_backups(key_fingerprint);
CREATE INDEX IF NOT EXISTS idx_key_backups_created_at ON key_backups(created_at);

-- Document encryption indexes
CREATE INDEX IF NOT EXISTS idx_document_encryption_document_id ON document_encryption(document_id);
CREATE INDEX IF NOT EXISTS idx_document_encryption_created_by ON document_encryption(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_document_encryption_encrypted ON document_encryption(is_encrypted);
CREATE INDEX IF NOT EXISTS idx_document_encryption_encrypted_at ON document_encryption(encrypted_at);

-- Document key shares indexes
CREATE INDEX IF NOT EXISTS idx_document_key_shares_document_id ON document_key_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_document_key_shares_user_id ON document_key_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_document_key_shares_shared_by ON document_key_shares(shared_by_user_id);
CREATE INDEX IF NOT EXISTS idx_document_key_shares_shared_at ON document_key_shares(shared_at);
CREATE INDEX IF NOT EXISTS idx_document_key_shares_revoked ON document_key_shares(revoked_at) WHERE revoked_at IS NULL;

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_encryption_audit_log_event_type ON encryption_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_encryption_audit_log_entity ON encryption_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_encryption_audit_log_user_id ON encryption_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_encryption_audit_log_created_at ON encryption_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_encryption_audit_log_success ON encryption_audit_log(success);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_encryption_key_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_encryption_key_updated_at ON user_encryption_keys;
CREATE TRIGGER trigger_update_encryption_key_updated_at
    BEFORE UPDATE ON user_encryption_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_encryption_key_updated_at();

-- Create function to audit encryption events
CREATE OR REPLACE FUNCTION audit_encryption_event(
    p_event_type VARCHAR(50),
    p_entity_type VARCHAR(50), 
    p_entity_id VARCHAR(255),
    p_user_id VARCHAR(255) DEFAULT NULL,
    p_event_data JSONB DEFAULT '{}'::jsonb,
    p_success BOOLEAN DEFAULT true,
    p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    audit_id UUID;
BEGIN
    INSERT INTO encryption_audit_log (
        event_type,
        entity_type,
        entity_id,
        user_id,
        event_data,
        success,
        error_message
    ) VALUES (
        p_event_type,
        p_entity_type,
        p_entity_id,
        p_user_id,
        p_event_data,
        p_success,
        p_error_message
    ) RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM encryption_audit_log 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user's active encryption key
CREATE OR REPLACE FUNCTION get_user_active_key(p_user_id VARCHAR(255))
RETURNS TABLE (
    key_id UUID,
    public_key TEXT,
    key_fingerprint VARCHAR(64),
    algorithm key_algorithm,
    key_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uek.id,
        uek.public_key,
        uek.key_fingerprint,
        uek.algorithm,
        uek.key_size,
        uek.created_at
    FROM user_encryption_keys uek
    WHERE uek.user_id = p_user_id 
      AND uek.is_active = true
      AND uek.status = 'active'
    ORDER BY uek.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Create function to check if user has access to document
CREATE OR REPLACE FUNCTION user_has_document_access(
    p_user_id VARCHAR(255),
    p_document_id VARCHAR(255)
)
RETURNS BOOLEAN AS $$
DECLARE
    has_access BOOLEAN := false;
BEGIN
    -- Check if user has a valid key share for the document
    SELECT EXISTS(
        SELECT 1 
        FROM document_key_shares dks
        WHERE dks.user_id = p_user_id 
          AND dks.document_id = p_document_id
          AND dks.revoked_at IS NULL
    ) INTO has_access;
    
    -- Also check if user is the creator
    IF NOT has_access THEN
        SELECT EXISTS(
            SELECT 1
            FROM document_encryption de
            WHERE de.document_id = p_document_id
              AND de.created_by_user_id = p_user_id
        ) INTO has_access;
    END IF;
    
    RETURN has_access;
END;
$$ LANGUAGE plpgsql;

-- Add helpful comments
COMMENT ON TABLE user_encryption_keys IS 'Stores user RSA key pairs for end-to-end encryption';
COMMENT ON TABLE key_backups IS 'Encrypted backups of user encryption keys';
COMMENT ON TABLE document_encryption IS 'Metadata for encrypted documents';
COMMENT ON TABLE document_key_shares IS 'Tracks document key sharing between users';
COMMENT ON TABLE encryption_audit_log IS 'Audit trail for all encryption operations';

COMMENT ON COLUMN user_encryption_keys.encrypted_private_key IS 'Private key encrypted with user password (double encryption)';
COMMENT ON COLUMN user_encryption_keys.salt IS 'Salt used for password-based key derivation';
COMMENT ON COLUMN document_encryption.encryption_metadata IS 'Structured data about document encryption (IV, auth tags, etc.)';
COMMENT ON COLUMN document_key_shares.encrypted_document_key IS 'Document AES key encrypted with recipient RSA public key';

-- Grant permissions (adjust as needed for your user)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;