-- RBAC Database Migration for Tala AI
-- Creates tables for Role-Based Access Control system
-- 
-- This migration creates the necessary tables to support:
-- - User role assignments with organization scoping
-- - Role-permission mappings
-- - Resource-specific permissions
-- - Audit logging for role changes

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types for better data integrity
DO $$ BEGIN
    CREATE TYPE role_type AS ENUM (
        'CLIENT',
        'TRAVEL_AGENT', 
        'AGENCY_ADMIN',
        'AGENCY_OWNER',
        'SUPER_ADMIN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE permission_category AS ENUM (
        'documents',
        'conversations', 
        'itineraries',
        'clients',
        'users',
        'analytics',
        'settings',
        'billing',
        'security'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Table: user_roles
-- Stores role assignments for users within organizations
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    role role_type NOT NULL,
    organization_id UUID NULL,  -- NULL for system-wide roles
    assigned_by VARCHAR(255) NULL,  -- User who assigned this role
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE NULL,  -- NULL if still active
    revoked_by VARCHAR(255) NULL,  -- User who revoked this role
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',  -- Additional role-specific data
    
    -- Indexes for performance
    UNIQUE(user_id, role, organization_id),  -- Prevent duplicate assignments
    INDEX(user_id),
    INDEX(organization_id),
    INDEX(role),
    INDEX(assigned_at),
    INDEX(is_active)
);

-- Table: role_permissions  
-- Maps roles to their specific permissions (beyond inherited ones)
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role role_type NOT NULL,
    permission VARCHAR(255) NOT NULL,
    category permission_category NOT NULL,
    is_critical BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique role-permission combinations
    UNIQUE(role, permission),
    INDEX(role),
    INDEX(permission),
    INDEX(category),
    INDEX(is_critical)
);

-- Table: resource_permissions
-- Stores resource-specific permission overrides and assignments
CREATE TABLE IF NOT EXISTS resource_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_type VARCHAR(50) NOT NULL,  -- 'document', 'conversation', etc.
    resource_id VARCHAR(255) NOT NULL,   -- ID of the specific resource
    user_id VARCHAR(255) NOT NULL,       -- User being granted permission
    permissions TEXT[] NOT NULL,         -- Array of permission strings
    granted_by VARCHAR(255) NULL,        -- User who granted permission
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NULL,  -- NULL for permanent
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    
    -- Ensure unique resource-user combinations
    UNIQUE(resource_type, resource_id, user_id),
    INDEX(resource_type),
    INDEX(resource_id),
    INDEX(user_id),
    INDEX(granted_at),
    INDEX(expires_at),
    INDEX(is_active)
);

-- Table: organizations (for role scoping)
-- Basic organization/agency information for role management
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(50) DEFAULT 'agency',  -- 'agency', 'enterprise', etc.
    owner_id VARCHAR(255) NULL,         -- Primary owner user ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    settings JSONB DEFAULT '{}',
    
    INDEX(slug),
    INDEX(owner_id),
    INDEX(type),
    INDEX(is_active)
);

-- Table: role_change_audit
-- Audit log for all role changes (assignments, removals, modifications)
CREATE TABLE IF NOT EXISTS role_change_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(50) NOT NULL,         -- 'ASSIGN', 'REMOVE', 'MODIFY'
    user_id VARCHAR(255) NOT NULL,       -- User affected by change
    role role_type NOT NULL,
    organization_id UUID NULL,
    performed_by VARCHAR(255) NULL,      -- User who performed the action
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    old_values JSONB DEFAULT '{}',       -- Previous state
    new_values JSONB DEFAULT '{}',       -- New state
    reason TEXT NULL,                    -- Optional reason for change
    ip_address INET NULL,                -- IP address of performer
    user_agent TEXT NULL,                -- Browser/client info
    
    INDEX(user_id),
    INDEX(role),
    INDEX(organization_id),
    INDEX(performed_by),
    INDEX(performed_at),
    INDEX(action)
);

-- Table: permission_cache
-- Optional caching table for computed permissions (performance optimization)
CREATE TABLE IF NOT EXISTS permission_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    organization_id UUID NULL,
    permissions TEXT[] NOT NULL,         -- Cached effective permissions
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    UNIQUE(user_id, organization_id),
    INDEX(user_id),
    INDEX(organization_id),
    INDEX(expires_at)
);

-- Insert default role-permission mappings
-- This ensures the system has the correct permissions for each role

-- CLIENT permissions
INSERT INTO role_permissions (role, permission, category, is_critical) VALUES
('CLIENT', 'documents:read:own', 'documents', false),
('CLIENT', 'documents:read:shared', 'documents', false),
('CLIENT', 'conversations:create:own', 'conversations', false),
('CLIENT', 'conversations:read:own', 'conversations', false),
('CLIENT', 'conversations:update:own', 'conversations', false),
('CLIENT', 'itineraries:read:own', 'itineraries', false),
('CLIENT', 'itineraries:comment:own', 'itineraries', false),
('CLIENT', 'analytics:view:own', 'analytics', false),
('CLIENT', 'settings:update:own', 'settings', false),
('CLIENT', 'settings:read:own', 'settings', false),
('CLIENT', 'billing:view:own', 'billing', false)
ON CONFLICT (role, permission) DO NOTHING;

-- TRAVEL_AGENT permissions (inherits CLIENT + additional)
INSERT INTO role_permissions (role, permission, category, is_critical) VALUES
('TRAVEL_AGENT', 'documents:create', 'documents', false),
('TRAVEL_AGENT', 'documents:read:assigned', 'documents', false),
('TRAVEL_AGENT', 'documents:update:own', 'documents', false),
('TRAVEL_AGENT', 'documents:share:assigned', 'documents', false),
('TRAVEL_AGENT', 'documents:upload', 'documents', false),
('TRAVEL_AGENT', 'conversations:create', 'conversations', false),
('TRAVEL_AGENT', 'conversations:read:assigned', 'conversations', false),
('TRAVEL_AGENT', 'conversations:update:assigned', 'conversations', false),
('TRAVEL_AGENT', 'conversations:view:clients', 'conversations', false),
('TRAVEL_AGENT', 'itineraries:create', 'itineraries', false),
('TRAVEL_AGENT', 'itineraries:read:assigned', 'itineraries', false),
('TRAVEL_AGENT', 'itineraries:update:assigned', 'itineraries', false),
('TRAVEL_AGENT', 'itineraries:delete:own', 'itineraries', false),
('TRAVEL_AGENT', 'itineraries:publish:assigned', 'itineraries', false),
('TRAVEL_AGENT', 'itineraries:share:assigned', 'itineraries', false),
('TRAVEL_AGENT', 'clients:read:assigned', 'clients', false),
('TRAVEL_AGENT', 'clients:update:assigned', 'clients', false),
('TRAVEL_AGENT', 'clients:communicate', 'clients', false),
('TRAVEL_AGENT', 'analytics:view:assigned', 'analytics', false),
('TRAVEL_AGENT', 'settings:read:agency', 'settings', false),
('TRAVEL_AGENT', 'billing:view:assigned', 'billing', false)
ON CONFLICT (role, permission) DO NOTHING;

-- AGENCY_ADMIN permissions (inherits TRAVEL_AGENT + additional)
INSERT INTO role_permissions (role, permission, category, is_critical) VALUES
('AGENCY_ADMIN', 'documents:create:agency', 'documents', false),
('AGENCY_ADMIN', 'documents:read:agency', 'documents', false),
('AGENCY_ADMIN', 'documents:update:agency', 'documents', false),
('AGENCY_ADMIN', 'documents:delete:agency', 'documents', true),
('AGENCY_ADMIN', 'documents:share:agency', 'documents', false),
('AGENCY_ADMIN', 'documents:manage:folders', 'documents', false),
('AGENCY_ADMIN', 'conversations:read:agency', 'conversations', false),
('AGENCY_ADMIN', 'conversations:delete:agency', 'conversations', true),
('AGENCY_ADMIN', 'conversations:view:all:agency', 'conversations', false),
('AGENCY_ADMIN', 'conversations:export:agency', 'conversations', false),
('AGENCY_ADMIN', 'itineraries:read:agency', 'itineraries', false),
('AGENCY_ADMIN', 'itineraries:update:agency', 'itineraries', false),
('AGENCY_ADMIN', 'itineraries:delete:agency', 'itineraries', true),
('AGENCY_ADMIN', 'itineraries:publish:agency', 'itineraries', false),
('AGENCY_ADMIN', 'itineraries:approve:agency', 'itineraries', false),
('AGENCY_ADMIN', 'users:create:agent', 'users', false),
('AGENCY_ADMIN', 'users:read:agency', 'users', false),
('AGENCY_ADMIN', 'users:update:agency', 'users', false),
('AGENCY_ADMIN', 'users:deactivate:agency', 'users', true),
('AGENCY_ADMIN', 'users:assign:clients', 'users', false),
('AGENCY_ADMIN', 'analytics:view:agency', 'analytics', false),
('AGENCY_ADMIN', 'analytics:export:agency', 'analytics', false),
('AGENCY_ADMIN', 'analytics:reports:agency', 'analytics', false),
('AGENCY_ADMIN', 'settings:update:agency', 'settings', true),
('AGENCY_ADMIN', 'settings:read:system', 'settings', false),
('AGENCY_ADMIN', 'settings:manage:integrations', 'settings', true),
('AGENCY_ADMIN', 'billing:view:agency', 'billing', false),
('AGENCY_ADMIN', 'billing:manage:agency', 'billing', true),
('AGENCY_ADMIN', 'billing:reports:agency', 'billing', false)
ON CONFLICT (role, permission) DO NOTHING;

-- AGENCY_OWNER permissions (inherits AGENCY_ADMIN + additional)
INSERT INTO role_permissions (role, permission, category, is_critical) VALUES
('AGENCY_OWNER', 'documents:delete:any:agency', 'documents', true),
('AGENCY_OWNER', 'documents:transfer:ownership', 'documents', true),
('AGENCY_OWNER', 'documents:backup:agency', 'documents', true),
('AGENCY_OWNER', 'conversations:delete:any:agency', 'conversations', true),
('AGENCY_OWNER', 'conversations:transfer:ownership', 'conversations', true),
('AGENCY_OWNER', 'conversations:backup:agency', 'conversations', true),
('AGENCY_OWNER', 'itineraries:delete:any:agency', 'itineraries', true),
('AGENCY_OWNER', 'itineraries:transfer:ownership', 'itineraries', true),
('AGENCY_OWNER', 'itineraries:templates:manage', 'itineraries', false),
('AGENCY_OWNER', 'users:create:admin', 'users', true),
('AGENCY_OWNER', 'users:delete:agency', 'users', true),
('AGENCY_OWNER', 'users:transfer:ownership', 'users', true),
('AGENCY_OWNER', 'users:roles:manage:agency', 'users', true),
('AGENCY_OWNER', 'analytics:view:advanced', 'analytics', false),
('AGENCY_OWNER', 'analytics:configure:agency', 'analytics', false),
('AGENCY_OWNER', 'analytics:custom:reports', 'analytics', false),
('AGENCY_OWNER', 'settings:update:critical', 'settings', true),
('AGENCY_OWNER', 'settings:backup:agency', 'settings', true),
('AGENCY_OWNER', 'settings:restore:agency', 'settings', true),
('AGENCY_OWNER', 'settings:api:manage', 'settings', true),
('AGENCY_OWNER', 'billing:manage:subscription', 'billing', true),
('AGENCY_OWNER', 'billing:view:invoices', 'billing', false),
('AGENCY_OWNER', 'billing:update:payment', 'billing', true),
('AGENCY_OWNER', 'billing:cancel:subscription', 'billing', true)
ON CONFLICT (role, permission) DO NOTHING;

-- SUPER_ADMIN permissions (inherits AGENCY_OWNER + additional)
INSERT INTO role_permissions (role, permission, category, is_critical) VALUES
('SUPER_ADMIN', 'documents:read:all', 'documents', true),
('SUPER_ADMIN', 'documents:delete:any', 'documents', true),
('SUPER_ADMIN', 'documents:system:backup', 'documents', true),
('SUPER_ADMIN', 'documents:system:restore', 'documents', true),
('SUPER_ADMIN', 'conversations:read:all', 'conversations', true),
('SUPER_ADMIN', 'conversations:delete:any', 'conversations', true),
('SUPER_ADMIN', 'conversations:system:monitor', 'conversations', true),
('SUPER_ADMIN', 'conversations:system:backup', 'conversations', true),
('SUPER_ADMIN', 'itineraries:read:all', 'itineraries', true),
('SUPER_ADMIN', 'itineraries:delete:any', 'itineraries', true),
('SUPER_ADMIN', 'itineraries:system:templates', 'itineraries', true),
('SUPER_ADMIN', 'users:create:superadmin', 'users', true),
('SUPER_ADMIN', 'users:read:all', 'users', true),
('SUPER_ADMIN', 'users:update:any', 'users', true),
('SUPER_ADMIN', 'users:delete:any', 'users', true),
('SUPER_ADMIN', 'users:roles:manage:all', 'users', true),
('SUPER_ADMIN', 'users:impersonate', 'users', true),
('SUPER_ADMIN', 'analytics:view:system', 'analytics', true),
('SUPER_ADMIN', 'analytics:system:performance', 'analytics', true),
('SUPER_ADMIN', 'analytics:system:usage', 'analytics', true),
('SUPER_ADMIN', 'analytics:system:security', 'analytics', true),
('SUPER_ADMIN', 'settings:update:system', 'settings', true),
('SUPER_ADMIN', 'settings:system:backup', 'settings', true),
('SUPER_ADMIN', 'settings:system:restore', 'settings', true),
('SUPER_ADMIN', 'settings:system:maintenance', 'settings', true),
('SUPER_ADMIN', 'settings:system:monitoring', 'settings', true),
('SUPER_ADMIN', 'billing:view:all', 'billing', true),
('SUPER_ADMIN', 'billing:manage:all', 'billing', true),
('SUPER_ADMIN', 'billing:system:reports', 'billing', true),
('SUPER_ADMIN', 'billing:system:configuration', 'billing', true),
('SUPER_ADMIN', 'security:audit:logs', 'security', true),
('SUPER_ADMIN', 'security:system:monitor', 'security', true),
('SUPER_ADMIN', 'security:access:control', 'security', true),
('SUPER_ADMIN', 'security:backup:system', 'security', true)
ON CONFLICT (role, permission) DO NOTHING;

-- Create indexes for performance optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_roles_active_lookup 
ON user_roles (user_id, organization_id) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_role_permissions_lookup 
ON role_permissions (role, category);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_resource_permissions_lookup 
ON resource_permissions (resource_type, resource_id, user_id) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_recent 
ON role_change_audit (performed_at DESC) 
WHERE performed_at > (CURRENT_TIMESTAMP - INTERVAL '30 days');

-- Create functions for common operations

-- Function to get effective permissions for a user
CREATE OR REPLACE FUNCTION get_user_effective_permissions(
    p_user_id VARCHAR(255),
    p_organization_id UUID DEFAULT NULL
) RETURNS TEXT[] AS $$
DECLARE
    permissions TEXT[];
BEGIN
    SELECT ARRAY_AGG(DISTINCT rp.permission)
    INTO permissions
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = p_user_id
      AND ur.is_active = true
      AND (p_organization_id IS NULL OR ur.organization_id = p_organization_id OR ur.organization_id IS NULL);
    
    RETURN COALESCE(permissions, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION user_has_permission(
    p_user_id VARCHAR(255),
    p_permission VARCHAR(255),
    p_organization_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    has_perm BOOLEAN DEFAULT FALSE;
BEGIN
    SELECT EXISTS(
        SELECT 1
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role = rp.role
        WHERE ur.user_id = p_user_id
          AND ur.is_active = true
          AND rp.permission = p_permission
          AND (p_organization_id IS NULL OR ur.organization_id = p_organization_id OR ur.organization_id IS NULL)
    ) INTO has_perm;
    
    RETURN has_perm;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to audit role changes
CREATE OR REPLACE FUNCTION audit_role_change() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO role_change_audit (
            action, user_id, role, organization_id, performed_by, 
            new_values, performed_at
        ) VALUES (
            'ASSIGN', NEW.user_id, NEW.role, NEW.organization_id, NEW.assigned_by,
            to_jsonb(NEW), NEW.assigned_at
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO role_change_audit (
            action, user_id, role, organization_id, performed_by,
            old_values, new_values, performed_at
        ) VALUES (
            'MODIFY', NEW.user_id, NEW.role, NEW.organization_id, NEW.assigned_by,
            to_jsonb(OLD), to_jsonb(NEW), CURRENT_TIMESTAMP
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO role_change_audit (
            action, user_id, role, organization_id, performed_by,
            old_values, performed_at
        ) VALUES (
            'REMOVE', OLD.user_id, OLD.role, OLD.organization_id, OLD.revoked_by,
            to_jsonb(OLD), CURRENT_TIMESTAMP
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic audit logging
DROP TRIGGER IF EXISTS trigger_audit_role_changes ON user_roles;
CREATE TRIGGER trigger_audit_role_changes
    AFTER INSERT OR UPDATE OR DELETE ON user_roles
    FOR EACH ROW EXECUTE FUNCTION audit_role_change();

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_permission_cache() RETURNS VOID AS $$
BEGIN
    DELETE FROM permission_cache WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean cache (if pg_cron is available)
-- SELECT cron.schedule('clean-permission-cache', '0 */6 * * *', 'SELECT clean_permission_cache();');

-- Grant appropriate permissions to application role (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tala_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tala_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO tala_app_user;

-- Add comments for documentation
COMMENT ON TABLE user_roles IS 'Stores role assignments for users within organizations';
COMMENT ON TABLE role_permissions IS 'Maps roles to their specific permissions';
COMMENT ON TABLE resource_permissions IS 'Stores resource-specific permission overrides';
COMMENT ON TABLE organizations IS 'Basic organization/agency information for role scoping';
COMMENT ON TABLE role_change_audit IS 'Audit log for all role changes';
COMMENT ON TABLE permission_cache IS 'Optional caching table for computed permissions';

COMMENT ON FUNCTION get_user_effective_permissions(VARCHAR, UUID) IS 'Returns all effective permissions for a user';
COMMENT ON FUNCTION user_has_permission(VARCHAR, VARCHAR, UUID) IS 'Checks if user has a specific permission';
COMMENT ON FUNCTION audit_role_change() IS 'Trigger function to audit role changes';
COMMENT ON FUNCTION clean_permission_cache() IS 'Removes expired permission cache entries';

-- Migration completed successfully
SELECT 'RBAC tables created successfully' AS result;