/**
 * Role-Based Access Control (RBAC) - Role Definitions
 * 
 * This file defines the hierarchical role system for Tala AI.
 * Roles inherit permissions from lower-level roles, creating a clear
 * permission hierarchy that simplifies access control management.
 * 
 * Role Hierarchy (from highest to lowest authority):
 * SUPER_ADMIN → AGENCY_OWNER → AGENCY_ADMIN → TRAVEL_AGENT → CLIENT
 * 
 * Each role automatically inherits all permissions from roles below it.
 */

/**
 * Role hierarchy levels - used for inheritance calculations
 * Higher numbers indicate higher authority levels
 */
export const ROLE_HIERARCHY = {
  CLIENT: 1,
  TRAVEL_AGENT: 2,
  AGENCY_ADMIN: 3,
  AGENCY_OWNER: 4,
  SUPER_ADMIN: 5
};

/**
 * Role definitions with their specific permissions
 * Each role defines its own permissions, and will inherit from lower roles
 */
export const ROLES = {
  /**
   * CLIENT - Travel clients/customers
   * Lowest privilege level - can only access their own data
   */
  CLIENT: {
    name: 'CLIENT',
    displayName: 'Client',
    description: 'Travel clients who can view their own itineraries and conversations',
    level: ROLE_HIERARCHY.CLIENT,
    color: '#10b981', // Green
    icon: 'User',
    isSystemRole: false,
    
    // Client-specific permissions (most restrictive)
    permissions: [
      // Document permissions - can only view shared documents
      'documents:read:own',
      'documents:read:shared',
      
      // Conversation permissions - can only manage own conversations
      'conversations:create:own',
      'conversations:read:own',
      'conversations:update:own',
      
      // Itinerary permissions - can only view their own itineraries
      'itineraries:read:own',
      'itineraries:comment:own',
      
      // Analytics - can view their own travel analytics
      'analytics:view:own',
      
      // Settings - can update their own profile
      'settings:update:own',
      'settings:read:own',
      
      // Billing - can view their own invoices
      'billing:view:own'
    ],
    
    // Scope limitations
    scope: {
      organization: false,  // Cannot access organization-wide data
      crossClient: false,   // Cannot access other clients' data
      systemWide: false     // Cannot access system-wide data
    }
  },

  /**
   * TRAVEL_AGENT - Regular travel agents
   * Can manage clients and create travel content
   */
  TRAVEL_AGENT: {
    name: 'TRAVEL_AGENT',
    displayName: 'Travel Agent',
    description: 'Travel agents who can manage clients and create travel itineraries',
    level: ROLE_HIERARCHY.TRAVEL_AGENT,
    color: '#3b82f6', // Blue
    icon: 'Briefcase',
    isSystemRole: false,
    
    // Travel agent specific permissions
    permissions: [
      // Document permissions - can create and manage documents
      'documents:create',
      'documents:read:assigned',
      'documents:update:own',
      'documents:share:assigned',
      'documents:upload',
      
      // Conversation permissions - can manage client conversations
      'conversations:create',
      'conversations:read:assigned',
      'conversations:update:assigned',
      'conversations:view:clients',
      
      // Itinerary permissions - full itinerary management for assigned clients
      'itineraries:create',
      'itineraries:read:assigned',
      'itineraries:update:assigned',
      'itineraries:delete:own',
      'itineraries:publish:assigned',
      'itineraries:share:assigned',
      
      // Client management
      'clients:read:assigned',
      'clients:update:assigned',
      'clients:communicate',
      
      // Analytics - can view their own performance and assigned clients
      'analytics:view:own',
      'analytics:view:assigned',
      
      // Settings - can update own profile and some preferences
      'settings:update:own',
      'settings:read:agency',
      
      // Billing - can view assigned client billing
      'billing:view:assigned'
    ],
    
    scope: {
      organization: false,  // Limited organization access
      crossClient: true,    // Can access assigned clients
      systemWide: false     // No system-wide access
    }
  },

  /**
   * AGENCY_ADMIN - Agency administrators
   * Can manage agency operations and all agents/clients within their agency
   */
  AGENCY_ADMIN: {
    name: 'AGENCY_ADMIN',
    displayName: 'Agency Administrator',
    description: 'Agency administrators who can manage agents, clients, and agency operations',
    level: ROLE_HIERARCHY.AGENCY_ADMIN,
    color: '#f59e0b', // Amber
    icon: 'Shield',
    isSystemRole: false,
    
    // Agency admin specific permissions
    permissions: [
      // Document permissions - full document management within agency
      'documents:create:agency',
      'documents:read:agency',
      'documents:update:agency',
      'documents:delete:agency',
      'documents:share:agency',
      'documents:manage:folders',
      
      // Conversation permissions - can view all agency conversations
      'conversations:read:agency',
      'conversations:delete:agency',
      'conversations:view:all:agency',
      'conversations:export:agency',
      
      // Itinerary permissions - full agency itinerary management
      'itineraries:read:agency',
      'itineraries:update:agency',
      'itineraries:delete:agency',
      'itineraries:publish:agency',
      'itineraries:approve:agency',
      
      // User management within agency
      'users:create:agent',
      'users:read:agency',
      'users:update:agency',
      'users:deactivate:agency',
      'users:assign:clients',
      
      // Analytics - full agency analytics
      'analytics:view:agency',
      'analytics:export:agency',
      'analytics:reports:agency',
      
      // Settings - agency-wide settings management
      'settings:update:agency',
      'settings:read:system',
      'settings:manage:integrations',
      
      // Billing - agency billing management
      'billing:view:agency',
      'billing:manage:agency',
      'billing:reports:agency'
    ],
    
    scope: {
      organization: true,   // Full organization access
      crossClient: true,    // Can access all clients in agency
      systemWide: false     // No system-wide access
    }
  },

  /**
   * AGENCY_OWNER - Agency owners
   * Owns the travel agency and has full control over their organization
   */
  AGENCY_OWNER: {
    name: 'AGENCY_OWNER',
    displayName: 'Agency Owner',
    description: 'Agency owners with full control over their travel agency',
    level: ROLE_HIERARCHY.AGENCY_OWNER,
    color: '#8b5cf6', // Purple
    icon: 'Crown',
    isSystemRole: false,
    
    // Agency owner specific permissions
    permissions: [
      // Full document control
      'documents:delete:any:agency',
      'documents:transfer:ownership',
      'documents:backup:agency',
      
      // Full conversation control
      'conversations:delete:any:agency',
      'conversations:transfer:ownership',
      'conversations:backup:agency',
      
      // Full itinerary control
      'itineraries:delete:any:agency',
      'itineraries:transfer:ownership',
      'itineraries:templates:manage',
      
      // Full user management
      'users:create:admin',
      'users:delete:agency',
      'users:transfer:ownership',
      'users:roles:manage:agency',
      
      // Advanced analytics
      'analytics:view:advanced',
      'analytics:configure:agency',
      'analytics:custom:reports',
      
      // Full agency settings control
      'settings:update:critical',
      'settings:backup:agency',
      'settings:restore:agency',
      'settings:api:manage',
      
      // Full billing control
      'billing:manage:subscription',
      'billing:view:invoices',
      'billing:update:payment',
      'billing:cancel:subscription'
    ],
    
    scope: {
      organization: true,   // Full organization control
      crossClient: true,    // Full client access
      systemWide: false     // No system-wide access
    }
  },

  /**
   * SUPER_ADMIN - System administrators
   * Highest privilege level with full system access
   */
  SUPER_ADMIN: {
    name: 'SUPER_ADMIN',
    displayName: 'Super Administrator',
    description: 'System administrators with full platform access and control',
    level: ROLE_HIERARCHY.SUPER_ADMIN,
    color: '#ef4444', // Red
    icon: 'Settings',
    isSystemRole: true,
    
    // Super admin specific permissions (highest level)
    permissions: [
      // System-wide document control
      'documents:read:all',
      'documents:delete:any',
      'documents:system:backup',
      'documents:system:restore',
      
      // System-wide conversation control
      'conversations:read:all',
      'conversations:delete:any',
      'conversations:system:monitor',
      'conversations:system:backup',
      
      // System-wide itinerary control
      'itineraries:read:all',
      'itineraries:delete:any',
      'itineraries:system:templates',
      
      // Full user management across all agencies
      'users:create:superadmin',
      'users:read:all',
      'users:update:any',
      'users:delete:any',
      'users:roles:manage:all',
      'users:impersonate',
      
      // System analytics and monitoring
      'analytics:view:system',
      'analytics:system:performance',
      'analytics:system:usage',
      'analytics:system:security',
      
      // System configuration and maintenance
      'settings:update:system',
      'settings:system:backup',
      'settings:system:restore',
      'settings:system:maintenance',
      'settings:system:monitoring',
      
      // System billing and subscriptions
      'billing:view:all',
      'billing:manage:all',
      'billing:system:reports',
      'billing:system:configuration',
      
      // Security and audit
      'security:audit:logs',
      'security:system:monitor',
      'security:access:control',
      'security:backup:system'
    ],
    
    scope: {
      organization: true,   // Access to all organizations
      crossClient: true,    // Access to all clients
      systemWide: true      // Full system access
    }
  }
};

/**
 * Get role definition by name
 * @param {string} roleName - Role name
 * @returns {Object|null} Role definition or null if not found
 */
export function getRole(roleName) {
  return ROLES[roleName] || null;
}

/**
 * Get all available roles
 * @returns {Array} Array of all role definitions
 */
export function getAllRoles() {
  return Object.values(ROLES);
}

/**
 * Get roles at or below a certain hierarchy level
 * @param {number} maxLevel - Maximum hierarchy level
 * @returns {Array} Array of role definitions
 */
export function getRolesByMaxLevel(maxLevel) {
  return Object.values(ROLES).filter(role => role.level <= maxLevel);
}

/**
 * Get roles that a given role can assign (lower hierarchy levels)
 * @param {string} roleName - Role name
 * @returns {Array} Array of assignable role names
 */
export function getAssignableRoles(roleName) {
  const role = getRole(roleName);
  if (!role) return [];
  
  return Object.values(ROLES)
    .filter(r => r.level < role.level)
    .map(r => r.name);
}

/**
 * Check if a role can assign another role
 * @param {string} assignerRole - Role doing the assignment
 * @param {string} targetRole - Role being assigned
 * @returns {boolean} Whether assignment is allowed
 */
export function canAssignRole(assignerRole, targetRole) {
  const assigner = getRole(assignerRole);
  const target = getRole(targetRole);
  
  if (!assigner || !target) return false;
  
  // Can only assign roles at lower hierarchy levels
  return assigner.level > target.level;
}

/**
 * Get effective permissions for a role (including inherited permissions)
 * @param {string} roleName - Role name
 * @returns {Array} Array of all effective permissions
 */
export function getEffectivePermissions(roleName) {
  const role = getRole(roleName);
  if (!role) return [];
  
  const permissions = new Set();
  
  // Add permissions from all roles at or below this level
  Object.values(ROLES)
    .filter(r => r.level <= role.level)
    .forEach(r => {
      r.permissions.forEach(permission => permissions.add(permission));
    });
  
  return Array.from(permissions).sort();
}

/**
 * Check if a role has a specific permission (including inherited)
 * @param {string} roleName - Role name
 * @param {string} permission - Permission to check
 * @returns {boolean} Whether role has the permission
 */
export function roleHasPermission(roleName, permission) {
  const effectivePermissions = getEffectivePermissions(roleName);
  return effectivePermissions.includes(permission);
}

/**
 * Get role hierarchy path (all roles this role inherits from)
 * @param {string} roleName - Role name
 * @returns {Array} Array of role names in hierarchy order
 */
export function getRoleHierarchy(roleName) {
  const role = getRole(roleName);
  if (!role) return [];
  
  return Object.values(ROLES)
    .filter(r => r.level <= role.level)
    .sort((a, b) => a.level - b.level)
    .map(r => r.name);
}

/**
 * Check if one role is higher than another in hierarchy
 * @param {string} role1 - First role
 * @param {string} role2 - Second role
 * @returns {boolean} Whether role1 is higher than role2
 */
export function isRoleHigher(role1, role2) {
  const r1 = getRole(role1);
  const r2 = getRole(role2);
  
  if (!r1 || !r2) return false;
  return r1.level > r2.level;
}

/**
 * Get the highest role from an array of roles
 * @param {Array} roleNames - Array of role names
 * @returns {string|null} Highest role name or null
 */
export function getHighestRole(roleNames) {
  if (!Array.isArray(roleNames) || roleNames.length === 0) return null;
  
  let highestRole = null;
  let highestLevel = 0;
  
  roleNames.forEach(roleName => {
    const role = getRole(roleName);
    if (role && role.level > highestLevel) {
      highestLevel = role.level;
      highestRole = role.name;
    }
  });
  
  return highestRole;
}

/**
 * Validate role name
 * @param {string} roleName - Role name to validate
 * @returns {boolean} Whether role name is valid
 */
export function isValidRole(roleName) {
  return ROLES.hasOwnProperty(roleName);
}

/**
 * Get roles that can be displayed to a user (for role assignment UI)
 * @param {string} userRole - Current user's role
 * @param {boolean} includeSystemRoles - Whether to include system roles
 * @returns {Array} Array of displayable roles
 */
export function getDisplayableRoles(userRole, includeSystemRoles = false) {
  const assignableRoles = getAssignableRoles(userRole);
  
  return Object.values(ROLES)
    .filter(role => {
      // Include assignable roles
      if (assignableRoles.includes(role.name)) return true;
      
      // Include current user's role
      if (role.name === userRole) return true;
      
      // Filter system roles based on flag
      if (role.isSystemRole && !includeSystemRoles) return false;
      
      return false;
    })
    .sort((a, b) => b.level - a.level); // Sort by hierarchy descending
}

export default ROLES;