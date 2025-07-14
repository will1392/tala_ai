/**
 * RBAC Utility Functions for Tala AI
 * 
 * This module provides helper functions for common role-based access control
 * operations throughout the application. These utilities simplify permission
 * checking and resource access validation.
 */

import roleManager from '../auth/rbac/RoleManager.js';
import { parsePermission } from '../auth/rbac/permissions.js';
import { getRole, isRoleHigher, getHighestRole } from '../auth/rbac/roles.js';

/**
 * Check if user can access a specific document
 * @param {string} userId - User ID
 * @param {string} documentId - Document ID
 * @param {string} action - Action to perform ('read', 'write', 'delete', 'share')
 * @param {string} organizationId - Organization ID (optional)
 * @returns {Promise<Object>} Access check result
 */
export async function canUserAccessDocument(userId, documentId, action = 'read', organizationId = null) {
  try {
    // Validate parameters
    if (!userId || !documentId || !action) {
      return {
        allowed: false,
        reason: 'Missing required parameters'
      };
    }

    // Map action to permission
    const permissionMap = {
      read: ['documents:read:own', 'documents:read:shared', 'documents:read:assigned', 'documents:read:agency'],
      write: ['documents:update:own', 'documents:update:assigned', 'documents:update:agency'],
      delete: ['documents:delete:own', 'documents:delete:agency', 'documents:delete:any:agency', 'documents:delete:any'],
      share: ['documents:share:assigned', 'documents:share:agency'],
      upload: ['documents:upload', 'documents:create', 'documents:create:agency']
    };

    const requiredPermissions = permissionMap[action];
    if (!requiredPermissions) {
      return {
        allowed: false,
        reason: `Invalid action: ${action}`
      };
    }

    // Check each permission until one is granted
    for (const permission of requiredPermissions) {
      const result = await roleManager.hasPermission(userId, permission, documentId, organizationId);
      if (result.hasPermission) {
        return {
          allowed: true,
          permission: permission,
          grantedBy: result.grantedBy,
          action: action,
          resourceType: 'document',
          resourceId: documentId
        };
      }
    }

    // Check resource-specific permissions
    const resourcePermission = await checkResourceSpecificPermission(
      userId, 
      'document', 
      documentId, 
      action,
      organizationId
    );

    if (resourcePermission.allowed) {
      return resourcePermission;
    }

    return {
      allowed: false,
      reason: `User does not have permission to ${action} document ${documentId}`,
      requiredPermissions
    };

  } catch (error) {
    console.error('Error checking document access:', error);
    return {
      allowed: false,
      reason: 'Error checking document access',
      error: error.message
    };
  }
}

/**
 * Check if user can manage an organization/agency
 * @param {string} userId - User ID
 * @param {string} orgId - Organization ID
 * @param {string} action - Management action ('view', 'edit', 'admin', 'owner')
 * @returns {Promise<Object>} Management check result
 */
export async function canUserManageOrganization(userId, orgId, action = 'view') {
  try {
    if (!userId || !orgId) {
      return {
        allowed: false,
        reason: 'Missing required parameters'
      };
    }

    // Get user's roles in this organization
    const userRoles = await roleManager.getUserRoles(userId, orgId);
    
    if (userRoles.length === 0) {
      return {
        allowed: false,
        reason: 'User has no roles in this organization'
      };
    }

    // Define required roles for each action
    const roleRequirements = {
      view: ['CLIENT', 'TRAVEL_AGENT', 'AGENCY_ADMIN', 'AGENCY_OWNER', 'SUPER_ADMIN'],
      edit: ['AGENCY_ADMIN', 'AGENCY_OWNER', 'SUPER_ADMIN'],
      admin: ['AGENCY_OWNER', 'SUPER_ADMIN'],
      owner: ['AGENCY_OWNER', 'SUPER_ADMIN'],
      delete: ['SUPER_ADMIN'] // Only super admins can delete organizations
    };

    const allowedRoles = roleRequirements[action];
    if (!allowedRoles) {
      return {
        allowed: false,
        reason: `Invalid management action: ${action}`
      };
    }

    // Check if user has any of the required roles
    const hasRequiredRole = userRoles.some(role => allowedRoles.includes(role));
    
    if (hasRequiredRole) {
      return {
        allowed: true,
        action: action,
        userRoles: userRoles,
        organizationId: orgId
      };
    }

    return {
      allowed: false,
      reason: `User roles (${userRoles.join(', ')}) insufficient for action: ${action}`,
      requiredRoles: allowedRoles
    };

  } catch (error) {
    console.error('Error checking organization management:', error);
    return {
      allowed: false,
      reason: 'Error checking organization management',
      error: error.message
    };
  }
}

/**
 * Filter an array of items based on user permissions
 * @param {Array} items - Items to filter
 * @param {string} userId - User ID
 * @param {string} permission - Permission required to access items
 * @param {string} organizationId - Organization ID (optional)
 * @param {Function} getResourceId - Function to extract resource ID from item
 * @returns {Promise<Array>} Filtered items
 */
export async function filterByPermissions(items, userId, permission, organizationId = null, getResourceId = null) {
  try {
    if (!Array.isArray(items) || items.length === 0) {
      return [];
    }

    if (!userId || !permission) {
      return [];
    }

    const filteredItems = [];

    for (const item of items) {
      let hasAccess = false;

      // If no resource ID extractor is provided, just check basic permission
      if (!getResourceId) {
        const result = await roleManager.hasPermission(userId, permission, null, organizationId);
        hasAccess = result.hasPermission;
      } else {
        // Extract resource ID and check resource-specific permission
        const resourceId = getResourceId(item);
        if (resourceId) {
          const result = await roleManager.hasPermission(userId, permission, resourceId, organizationId);
          hasAccess = result.hasPermission;
        }
      }

      if (hasAccess) {
        filteredItems.push(item);
      }
    }

    return filteredItems;

  } catch (error) {
    console.error('Error filtering by permissions:', error);
    return [];
  }
}

/**
 * Check if user can access another user's data
 * @param {string} accessorUserId - User requesting access
 * @param {string} targetUserId - User whose data is being accessed
 * @param {string} dataType - Type of data ('profile', 'conversations', 'documents', 'analytics')
 * @param {string} organizationId - Organization ID (optional)
 * @returns {Promise<Object>} Access check result
 */
export async function canUserAccessUserData(accessorUserId, targetUserId, dataType, organizationId = null) {
  try {
    // Users can always access their own data
    if (accessorUserId === targetUserId) {
      return {
        allowed: true,
        reason: 'Self-access allowed',
        accessType: 'self'
      };
    }

    // Get accessor's roles
    const accessorRoles = await roleManager.getUserRoles(accessorUserId, organizationId);
    
    if (accessorRoles.length === 0) {
      return {
        allowed: false,
        reason: 'Accessor has no roles'
      };
    }

    // Define access rules based on data type and roles
    const accessRules = {
      profile: {
        'SUPER_ADMIN': 'all',
        'AGENCY_OWNER': 'agency',
        'AGENCY_ADMIN': 'agency',
        'TRAVEL_AGENT': 'assigned'
      },
      conversations: {
        'SUPER_ADMIN': 'all',
        'AGENCY_OWNER': 'agency',
        'AGENCY_ADMIN': 'agency',
        'TRAVEL_AGENT': 'assigned'
      },
      documents: {
        'SUPER_ADMIN': 'all',
        'AGENCY_OWNER': 'agency',
        'AGENCY_ADMIN': 'agency',
        'TRAVEL_AGENT': 'shared'
      },
      analytics: {
        'SUPER_ADMIN': 'all',
        'AGENCY_OWNER': 'agency',
        'AGENCY_ADMIN': 'agency'
      }
    };

    const rules = accessRules[dataType];
    if (!rules) {
      return {
        allowed: false,
        reason: `Invalid data type: ${dataType}`
      };
    }

    // Check access based on highest role
    const highestRole = getHighestRole(accessorRoles);
    const accessLevel = rules[highestRole];

    if (!accessLevel) {
      return {
        allowed: false,
        reason: `Role ${highestRole} cannot access ${dataType} data`
      };
    }

    // Validate access level
    if (accessLevel === 'all') {
      return {
        allowed: true,
        reason: 'System-wide access granted',
        accessType: 'system',
        accessorRole: highestRole
      };
    }

    if (accessLevel === 'agency') {
      // Check if both users are in the same organization
      const targetRoles = await roleManager.getUserRoles(targetUserId, organizationId);
      if (targetRoles.length > 0) {
        return {
          allowed: true,
          reason: 'Agency-level access granted',
          accessType: 'agency',
          accessorRole: highestRole
        };
      }
    }

    if (accessLevel === 'assigned' || accessLevel === 'shared') {
      // Check if target user is assigned to accessor
      const isAssigned = await checkUserAssignment(accessorUserId, targetUserId, organizationId);
      if (isAssigned) {
        return {
          allowed: true,
          reason: 'Assigned user access granted',
          accessType: 'assigned',
          accessorRole: highestRole
        };
      }
    }

    return {
      allowed: false,
      reason: `Access level ${accessLevel} not satisfied for ${dataType} access`,
      accessorRole: highestRole,
      requiredAccess: accessLevel
    };

  } catch (error) {
    console.error('Error checking user data access:', error);
    return {
      allowed: false,
      reason: 'Error checking user data access',
      error: error.message
    };
  }
}

/**
 * Get user's effective permissions with organization context
 * @param {string} userId - User ID
 * @param {string} organizationId - Organization ID (optional)
 * @returns {Promise<Object>} User permissions summary
 */
export async function getUserPermissionSummary(userId, organizationId = null) {
  try {
    if (!userId) {
      return {
        permissions: [],
        roles: [],
        highestRole: null,
        organizationAccess: false
      };
    }

    const [permissions, roles] = await Promise.all([
      roleManager.getEffectivePermissions(userId, organizationId),
      roleManager.getUserRoles(userId, organizationId)
    ]);

    const highestRole = getHighestRole(roles);
    const roleDetails = highestRole ? getRole(highestRole) : null;

    // Categorize permissions
    const categorizedPermissions = {};
    permissions.forEach(permission => {
      const parsed = parsePermission(permission);
      if (!categorizedPermissions[parsed.resource]) {
        categorizedPermissions[parsed.resource] = [];
      }
      categorizedPermissions[parsed.resource].push(permission);
    });

    return {
      permissions,
      categorizedPermissions,
      roles,
      highestRole,
      roleDetails,
      organizationAccess: roles.length > 0,
      canManageUsers: permissions.some(p => p.startsWith('users:create') || p.startsWith('users:update')),
      canManageOrganization: permissions.some(p => p.includes('agency') || p.includes('system')),
      isCriticalUser: roleDetails?.isSystemRole || false
    };

  } catch (error) {
    console.error('Error getting user permission summary:', error);
    return {
      permissions: [],
      roles: [],
      highestRole: null,
      organizationAccess: false,
      error: error.message
    };
  }
}

/**
 * Check resource-specific permissions (e.g., shared documents, assigned conversations)
 * @param {string} userId - User ID
 * @param {string} resourceType - Type of resource
 * @param {string} resourceId - Resource ID
 * @param {string} action - Action being performed
 * @param {string} organizationId - Organization ID (optional)
 * @returns {Promise<Object>} Resource permission result
 */
export async function checkResourceSpecificPermission(userId, resourceType, resourceId, action, organizationId = null) {
  try {
    // This would typically query the resource_permissions table
    // For now, implement basic logic that can be extended
    
    // Check if resource is shared with user
    const isShared = await checkResourceSharing(resourceType, resourceId, userId);
    if (isShared && ['read', 'view'].includes(action)) {
      return {
        allowed: true,
        reason: 'Resource shared with user',
        accessType: 'shared'
      };
    }

    // Check if user owns the resource
    const isOwner = await checkResourceOwnership(resourceType, resourceId, userId);
    if (isOwner) {
      return {
        allowed: true,
        reason: 'User owns resource',
        accessType: 'owner'
      };
    }

    // Check if resource is assigned to user
    const isAssigned = await checkResourceAssignment(resourceType, resourceId, userId);
    if (isAssigned) {
      return {
        allowed: true,
        reason: 'Resource assigned to user',
        accessType: 'assigned'
      };
    }

    return {
      allowed: false,
      reason: 'No resource-specific permissions found'
    };

  } catch (error) {
    console.error('Error checking resource-specific permission:', error);
    return {
      allowed: false,
      reason: 'Error checking resource permission',
      error: error.message
    };
  }
}

/**
 * Validate role assignment request
 * @param {string} assignerId - User making the assignment
 * @param {string} targetUserId - User receiving the role
 * @param {string} role - Role being assigned
 * @param {string} organizationId - Organization ID
 * @returns {Promise<Object>} Validation result
 */
export async function validateRoleAssignment(assignerId, targetUserId, role, organizationId) {
  try {
    // Check if assigner can assign this role
    const canAssign = await roleManager.canUserAssignRole(assignerId, role, organizationId);
    if (!canAssign.allowed) {
      return {
        valid: false,
        reason: canAssign.reason
      };
    }

    // Check if target user already has this role
    const targetRoles = await roleManager.getUserRoles(targetUserId, organizationId);
    if (targetRoles.includes(role)) {
      return {
        valid: false,
        reason: 'User already has this role'
      };
    }

    // Check role conflicts (e.g., can't be both CLIENT and AGENCY_OWNER)
    const roleConflicts = {
      'CLIENT': ['TRAVEL_AGENT', 'AGENCY_ADMIN', 'AGENCY_OWNER', 'SUPER_ADMIN'],
      'TRAVEL_AGENT': ['CLIENT'],
      'AGENCY_ADMIN': ['CLIENT'],
      'AGENCY_OWNER': ['CLIENT'],
      'SUPER_ADMIN': ['CLIENT']
    };

    const conflicts = roleConflicts[role] || [];
    const hasConflict = targetRoles.some(existingRole => conflicts.includes(existingRole));
    
    if (hasConflict) {
      return {
        valid: false,
        reason: `Role ${role} conflicts with existing roles: ${targetRoles.join(', ')}`
      };
    }

    return {
      valid: true,
      assignerRole: canAssign.assignerRole
    };

  } catch (error) {
    console.error('Error validating role assignment:', error);
    return {
      valid: false,
      reason: 'Error validating role assignment',
      error: error.message
    };
  }
}

/**
 * Helper function to check if resource is shared with user
 * @param {string} resourceType - Resource type
 * @param {string} resourceId - Resource ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Whether resource is shared
 */
async function checkResourceSharing(resourceType, resourceId, userId) {
  // Placeholder implementation
  // In production, this would query the resource_permissions table
  return false;
}

/**
 * Helper function to check resource ownership
 * @param {string} resourceType - Resource type
 * @param {string} resourceId - Resource ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Whether user owns resource
 */
async function checkResourceOwnership(resourceType, resourceId, userId) {
  // Placeholder implementation
  // In production, this would query the appropriate resource table
  return true; // Default allow for testing
}

/**
 * Helper function to check resource assignment
 * @param {string} resourceType - Resource type
 * @param {string} resourceId - Resource ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Whether resource is assigned to user
 */
async function checkResourceAssignment(resourceType, resourceId, userId) {
  // Placeholder implementation
  // In production, this would query assignment tables
  return false;
}

/**
 * Helper function to check user assignment
 * @param {string} assignerId - User doing assignment
 * @param {string} targetUserId - User being checked
 * @param {string} organizationId - Organization ID
 * @returns {Promise<boolean>} Whether target user is assigned to assigner
 */
async function checkUserAssignment(assignerId, targetUserId, organizationId) {
  // Placeholder implementation
  // In production, this would query user assignment tables
  return false;
}

/**
 * Batch permission check for multiple resources
 * @param {string} userId - User ID
 * @param {Array} resources - Array of {type, id, action} objects
 * @param {string} organizationId - Organization ID (optional)
 * @returns {Promise<Object>} Batch check results
 */
export async function batchPermissionCheck(userId, resources, organizationId = null) {
  try {
    const results = {};
    
    for (const resource of resources) {
      const { type, id, action } = resource;
      const key = `${type}:${id}:${action}`;
      
      if (type === 'document') {
        results[key] = await canUserAccessDocument(userId, id, action, organizationId);
      } else {
        // Add other resource types as needed
        results[key] = {
          allowed: false,
          reason: `Unsupported resource type: ${type}`
        };
      }
    }
    
    return {
      success: true,
      results,
      summary: {
        total: resources.length,
        allowed: Object.values(results).filter(r => r.allowed).length,
        denied: Object.values(results).filter(r => !r.allowed).length
      }
    };
    
  } catch (error) {
    console.error('Error in batch permission check:', error);
    return {
      success: false,
      error: error.message,
      results: {}
    };
  }
}

export default {
  canUserAccessDocument,
  canUserManageOrganization,
  filterByPermissions,
  canUserAccessUserData,
  getUserPermissionSummary,
  checkResourceSpecificPermission,
  validateRoleAssignment,
  batchPermissionCheck
};