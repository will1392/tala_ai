/**
 * RoleManager - Comprehensive Role and Permission Management
 * 
 * This class handles all role-based access control operations including:
 * - Role assignment and removal
 * - Permission checking and validation
 * - Organization-scoped role management
 * - User role queries and effective permissions
 * 
 * The RoleManager integrates with the database to persist role assignments
 * and provides caching for performance optimization.
 */

import { 
  getRole, 
  getAllRoles, 
  canAssignRole, 
  getEffectivePermissions,
  roleHasPermission,
  getHighestRole,
  isValidRole
} from './roles.js';
import { 
  isValidPermission, 
  parsePermission, 
  getCriticalPermissions 
} from './permissions.js';

class RoleManager {
  constructor(options = {}) {
    this.options = {
      enableCaching: options.enableCaching !== false,
      cacheExpiryMs: options.cacheExpiryMs || 5 * 60 * 1000, // 5 minutes
      enableAuditLog: options.enableAuditLog !== false,
      enableValidation: options.enableValidation !== false,
      ...options
    };
    
    // In-memory cache for user roles and permissions
    this.userRoleCache = new Map();
    this.permissionCache = new Map();
    this.lastCacheUpdate = new Map();
    
    // Database connection (would be injected in production)
    this.db = options.database || null;
    
    this.log('RoleManager initialized with options:', this.options);
  }

  /**
   * Assign a role to a user within an organization
   * @param {string} userId - User ID
   * @param {string} role - Role name to assign
   * @param {string} organizationId - Organization/Agency ID (optional)
   * @param {string} assignedBy - ID of user assigning the role
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Assignment result
   */
  async assignRole(userId, role, organizationId = null, assignedBy = null, options = {}) {
    try {
      // Validation
      if (!userId || !role) {
        return {
          success: false,
          error: 'User ID and role are required',
          code: 'MISSING_PARAMETERS'
        };
      }

      if (!isValidRole(role)) {
        return {
          success: false,
          error: `Invalid role: ${role}`,
          code: 'INVALID_ROLE'
        };
      }

      // Check if assigner has permission to assign this role
      if (assignedBy && this.options.enableValidation) {
        const canAssign = await this.canUserAssignRole(assignedBy, role, organizationId);
        if (!canAssign.allowed) {
          return {
            success: false,
            error: canAssign.reason,
            code: 'ASSIGNMENT_NOT_ALLOWED'
          };
        }
      }

      // Check if user already has this role in this organization
      const existingRoles = await this.getUserRoles(userId, organizationId);
      if (existingRoles.includes(role)) {
        return {
          success: false,
          error: 'User already has this role',
          code: 'ROLE_ALREADY_ASSIGNED'
        };
      }

      // Perform the assignment
      const assignmentData = {
        userId,
        role,
        organizationId,
        assignedBy,
        assignedAt: new Date().toISOString(),
        isActive: true,
        metadata: options.metadata || {}
      };

      // Save to database
      const assignmentId = await this.saveRoleAssignment(assignmentData);

      // Clear cache for this user
      this.clearUserCache(userId);

      // Log the assignment
      if (this.options.enableAuditLog) {
        await this.logRoleChange({
          action: 'ASSIGN_ROLE',
          userId,
          role,
          organizationId,
          assignedBy,
          assignmentId,
          timestamp: assignmentData.assignedAt
        });
      }

      this.log(`Role assigned successfully: ${role} to user ${userId}`, 'info', {
        userId,
        role,
        organizationId,
        assignedBy
      });

      return {
        success: true,
        assignmentId,
        role,
        userId,
        organizationId,
        assignedAt: assignmentData.assignedAt
      };

    } catch (error) {
      this.log(`Error assigning role: ${error.message}`, 'error', {
        userId,
        role,
        organizationId,
        assignedBy
      });

      return {
        success: false,
        error: 'Failed to assign role',
        code: 'ASSIGNMENT_ERROR',
        details: error.message
      };
    }
  }

  /**
   * Remove a role from a user
   * @param {string} userId - User ID
   * @param {string} role - Role name to remove
   * @param {string} organizationId - Organization/Agency ID (optional)
   * @param {string} removedBy - ID of user removing the role
   * @returns {Promise<Object>} Removal result
   */
  async removeRole(userId, role, organizationId = null, removedBy = null) {
    try {
      // Validation
      if (!userId || !role) {
        return {
          success: false,
          error: 'User ID and role are required',
          code: 'MISSING_PARAMETERS'
        };
      }

      // Check if user has this role
      const userRoles = await this.getUserRoles(userId, organizationId);
      if (!userRoles.includes(role)) {
        return {
          success: false,
          error: 'User does not have this role',
          code: 'ROLE_NOT_ASSIGNED'
        };
      }

      // Check if remover has permission to remove this role
      if (removedBy && this.options.enableValidation) {
        const canRemove = await this.canUserRemoveRole(removedBy, role, userId, organizationId);
        if (!canRemove.allowed) {
          return {
            success: false,
            error: canRemove.reason,
            code: 'REMOVAL_NOT_ALLOWED'
          };
        }
      }

      // Perform the removal
      const removed = await this.removeRoleAssignment(userId, role, organizationId);
      if (!removed) {
        return {
          success: false,
          error: 'Failed to remove role assignment',
          code: 'REMOVAL_FAILED'
        };
      }

      // Clear cache for this user
      this.clearUserCache(userId);

      // Log the removal
      if (this.options.enableAuditLog) {
        await this.logRoleChange({
          action: 'REMOVE_ROLE',
          userId,
          role,
          organizationId,
          removedBy,
          timestamp: new Date().toISOString()
        });
      }

      this.log(`Role removed successfully: ${role} from user ${userId}`, 'info', {
        userId,
        role,
        organizationId,
        removedBy
      });

      return {
        success: true,
        role,
        userId,
        organizationId,
        removedAt: new Date().toISOString()
      };

    } catch (error) {
      this.log(`Error removing role: ${error.message}`, 'error', {
        userId,
        role,
        organizationId,
        removedBy
      });

      return {
        success: false,
        error: 'Failed to remove role',
        code: 'REMOVAL_ERROR',
        details: error.message
      };
    }
  }

  /**
   * Get all roles assigned to a user
   * @param {string} userId - User ID
   * @param {string} organizationId - Organization ID (optional)
   * @returns {Promise<Array>} Array of role names
   */
  async getUserRoles(userId, organizationId = null) {
    try {
      if (!userId) {
        return [];
      }

      // Check cache first
      const cacheKey = `${userId}:${organizationId || 'global'}`;
      if (this.options.enableCaching && this.isCacheValid(cacheKey)) {
        return this.userRoleCache.get(cacheKey) || [];
      }

      // Query database
      const roles = await this.queryUserRoles(userId, organizationId);

      // Cache the result
      if (this.options.enableCaching) {
        this.userRoleCache.set(cacheKey, roles);
        this.lastCacheUpdate.set(cacheKey, Date.now());
      }

      return roles;

    } catch (error) {
      this.log(`Error getting user roles: ${error.message}`, 'error', { userId, organizationId });
      return [];
    }
  }

  /**
   * Check if user has a specific permission
   * @param {string} userId - User ID
   * @param {string} permission - Permission to check
   * @param {string} resourceId - Resource ID (optional)
   * @param {string} organizationId - Organization ID (optional)
   * @returns {Promise<Object>} Permission check result
   */
  async hasPermission(userId, permission, resourceId = null, organizationId = null) {
    try {
      if (!userId || !permission) {
        return {
          hasPermission: false,
          reason: 'User ID and permission are required'
        };
      }

      if (!isValidPermission(permission)) {
        return {
          hasPermission: false,
          reason: `Invalid permission: ${permission}`
        };
      }

      // Get user's roles
      const userRoles = await this.getUserRoles(userId, organizationId);
      if (userRoles.length === 0) {
        return {
          hasPermission: false,
          reason: 'User has no assigned roles'
        };
      }

      // Check if any of the user's roles have this permission
      for (const role of userRoles) {
        if (roleHasPermission(role, permission)) {
          // Additional checks for resource-specific permissions
          if (resourceId) {
            const resourceCheck = await this.checkResourcePermission(
              userId, 
              permission, 
              resourceId, 
              organizationId
            );
            
            if (resourceCheck.allowed) {
              return {
                hasPermission: true,
                grantedBy: role,
                resourceAccess: resourceCheck.access
              };
            }
          } else {
            return {
              hasPermission: true,
              grantedBy: role
            };
          }
        }
      }

      return {
        hasPermission: false,
        reason: `None of user's roles (${userRoles.join(', ')}) have permission: ${permission}`
      };

    } catch (error) {
      this.log(`Error checking permission: ${error.message}`, 'error', {
        userId,
        permission,
        resourceId,
        organizationId
      });

      return {
        hasPermission: false,
        reason: 'Error checking permission',
        error: error.message
      };
    }
  }

  /**
   * Get all effective permissions for a user
   * @param {string} userId - User ID
   * @param {string} organizationId - Organization ID (optional)
   * @returns {Promise<Array>} Array of permission strings
   */
  async getEffectivePermissions(userId, organizationId = null) {
    try {
      if (!userId) {
        return [];
      }

      // Check cache first
      const cacheKey = `perms:${userId}:${organizationId || 'global'}`;
      if (this.options.enableCaching && this.isCacheValid(cacheKey)) {
        return this.permissionCache.get(cacheKey) || [];
      }

      // Get user's roles
      const userRoles = await this.getUserRoles(userId, organizationId);
      
      // Collect all effective permissions
      const permissions = new Set();
      userRoles.forEach(role => {
        const rolePermissions = getEffectivePermissions(role);
        rolePermissions.forEach(p => permissions.add(p));
      });

      const effectivePermissions = Array.from(permissions).sort();

      // Cache the result
      if (this.options.enableCaching) {
        this.permissionCache.set(cacheKey, effectivePermissions);
        this.lastCacheUpdate.set(cacheKey, Date.now());
      }

      return effectivePermissions;

    } catch (error) {
      this.log(`Error getting effective permissions: ${error.message}`, 'error', {
        userId,
        organizationId
      });
      return [];
    }
  }

  /**
   * Get user's highest role (for display purposes)
   * @param {string} userId - User ID
   * @param {string} organizationId - Organization ID (optional)
   * @returns {Promise<string|null>} Highest role name or null
   */
  async getUserHighestRole(userId, organizationId = null) {
    try {
      const userRoles = await this.getUserRoles(userId, organizationId);
      return getHighestRole(userRoles);
    } catch (error) {
      this.log(`Error getting highest role: ${error.message}`, 'error', { userId, organizationId });
      return null;
    }
  }

  /**
   * Check if a user can assign a specific role
   * @param {string} assignerId - ID of user doing the assignment
   * @param {string} role - Role to be assigned
   * @param {string} organizationId - Organization ID (optional)
   * @returns {Promise<Object>} Check result
   */
  async canUserAssignRole(assignerId, role, organizationId = null) {
    try {
      const assignerRoles = await this.getUserRoles(assignerId, organizationId);
      const assignerHighestRole = getHighestRole(assignerRoles);
      
      if (!assignerHighestRole) {
        return {
          allowed: false,
          reason: 'Assigner has no roles'
        };
      }

      if (!canAssignRole(assignerHighestRole, role)) {
        return {
          allowed: false,
          reason: `Role ${assignerHighestRole} cannot assign role ${role}`
        };
      }

      return {
        allowed: true,
        assignerRole: assignerHighestRole
      };

    } catch (error) {
      this.log(`Error checking role assignment permission: ${error.message}`, 'error');
      return {
        allowed: false,
        reason: 'Error checking assignment permission'
      };
    }
  }

  /**
   * Check if a user can remove a specific role
   * @param {string} removerId - ID of user doing the removal
   * @param {string} role - Role to be removed
   * @param {string} targetUserId - ID of user having role removed
   * @param {string} organizationId - Organization ID (optional)
   * @returns {Promise<Object>} Check result
   */
  async canUserRemoveRole(removerId, role, targetUserId, organizationId = null) {
    try {
      // Users can remove roles from themselves (with some restrictions)
      if (removerId === targetUserId) {
        // Don't allow removing the last admin role
        const userRoles = await this.getUserRoles(targetUserId, organizationId);
        const adminRoles = userRoles.filter(r => ['SUPER_ADMIN', 'AGENCY_OWNER', 'AGENCY_ADMIN'].includes(r));
        
        if (adminRoles.length === 1 && adminRoles[0] === role) {
          return {
            allowed: false,
            reason: 'Cannot remove last admin role'
          };
        }
        
        return { allowed: true, reason: 'Self-removal allowed' };
      }

      // Check if remover can assign this role (same logic)
      return await this.canUserAssignRole(removerId, role, organizationId);

    } catch (error) {
      this.log(`Error checking role removal permission: ${error.message}`, 'error');
      return {
        allowed: false,
        reason: 'Error checking removal permission'
      };
    }
  }

  /**
   * Check resource-specific permission
   * @param {string} userId - User ID
   * @param {string} permission - Permission string
   * @param {string} resourceId - Resource ID
   * @param {string} organizationId - Organization ID (optional)
   * @returns {Promise<Object>} Resource permission result
   */
  async checkResourcePermission(userId, permission, resourceId, organizationId = null) {
    const parsed = parsePermission(permission);
    const { resource: resourceType, scope } = parsed;

    try {
      // For 'own' scope, check if user owns the resource
      if (scope === 'own') {
        const isOwner = await this.checkResourceOwnership(resourceType, resourceId, userId);
        return {
          allowed: isOwner,
          access: isOwner ? 'owner' : null,
          reason: isOwner ? 'User owns resource' : 'User does not own resource'
        };
      }

      // For 'assigned' scope, check if resource is assigned to user
      if (scope === 'assigned') {
        const isAssigned = await this.checkResourceAssignment(resourceType, resourceId, userId);
        return {
          allowed: isAssigned,
          access: isAssigned ? 'assigned' : null,
          reason: isAssigned ? 'Resource is assigned to user' : 'Resource is not assigned to user'
        };
      }

      // For 'agency' scope, check if resource belongs to user's organization
      if (scope === 'agency') {
        const inAgency = await this.checkResourceInAgency(resourceType, resourceId, organizationId);
        return {
          allowed: inAgency,
          access: inAgency ? 'agency' : null,
          reason: inAgency ? 'Resource belongs to user\'s agency' : 'Resource does not belong to user\'s agency'
        };
      }

      // Default allow for system-wide permissions
      return {
        allowed: true,
        access: 'system',
        reason: 'System-wide access granted'
      };

    } catch (error) {
      this.log(`Error checking resource permission: ${error.message}`, 'error');
      return {
        allowed: false,
        reason: 'Error checking resource permission'
      };
    }
  }

  /**
   * Clear cache for a specific user
   * @param {string} userId - User ID
   */
  clearUserCache(userId) {
    if (!this.options.enableCaching) return;

    // Remove all cache entries for this user
    for (const key of this.userRoleCache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.userRoleCache.delete(key);
        this.lastCacheUpdate.delete(key);
      }
    }

    for (const key of this.permissionCache.keys()) {
      if (key.includes(`${userId}:`)) {
        this.permissionCache.delete(key);
        this.lastCacheUpdate.delete(key);
      }
    }
  }

  /**
   * Clear all caches
   */
  clearAllCaches() {
    this.userRoleCache.clear();
    this.permissionCache.clear();
    this.lastCacheUpdate.clear();
    this.log('All caches cleared');
  }

  /**
   * Check if cache entry is still valid
   * @param {string} cacheKey - Cache key
   * @returns {boolean} Whether cache is valid
   */
  isCacheValid(cacheKey) {
    const lastUpdate = this.lastCacheUpdate.get(cacheKey);
    if (!lastUpdate) return false;
    
    return (Date.now() - lastUpdate) < this.options.cacheExpiryMs;
  }

  /**
   * Database Methods (to be implemented with actual database)
   */

  async saveRoleAssignment(assignmentData) {
    // Placeholder for database save
    // In production, this would insert into user_roles table
    return `assignment_${Date.now()}`;
  }

  async removeRoleAssignment(userId, role, organizationId) {
    // Placeholder for database removal
    // In production, this would delete from user_roles table
    return true;
  }

  async queryUserRoles(userId, organizationId) {
    // Placeholder for database query
    // In production, this would query user_roles table
    
    // For testing, return some default roles
    if (userId === 'admin-1') {
      return ['AGENCY_OWNER'];
    }
    if (userId === 'mock-user-id') {
      return ['CLIENT'];
    }
    return ['CLIENT']; // Default role
  }

  async checkResourceOwnership(resourceType, resourceId, userId) {
    // Placeholder for resource ownership check
    // In production, this would query the appropriate table
    return true; // Default allow for testing
  }

  async checkResourceAssignment(resourceType, resourceId, userId) {
    // Placeholder for resource assignment check
    // In production, this would query assignment tables
    return true; // Default allow for testing
  }

  async checkResourceInAgency(resourceType, resourceId, organizationId) {
    // Placeholder for agency resource check
    // In production, this would check if resource belongs to organization
    return true; // Default allow for testing
  }

  async logRoleChange(changeData) {
    // Placeholder for audit logging
    // In production, this would save to audit_log table
    this.log('Role change logged:', changeData);
  }

  /**
   * Get role management statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    return {
      cacheSize: {
        userRoles: this.userRoleCache.size,
        permissions: this.permissionCache.size
      },
      cacheEnabled: this.options.enableCaching,
      auditEnabled: this.options.enableAuditLog,
      validationEnabled: this.options.enableValidation
    };
  }

  /**
   * Log messages with appropriate level
   * @param {string} message - Log message
   * @param {string} level - Log level
   * @param {Object} metadata - Additional metadata
   */
  log(message, level = 'info', metadata = {}) {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      component: 'RoleManager',
      level,
      message,
      ...metadata
    };

    switch (level) {
      case 'error':
        console.error('[RoleManager]', logData);
        break;
      case 'warn':
        console.warn('[RoleManager]', logData);
        break;
      default:
        console.log('[RoleManager]', logData);
    }
  }
}

// Export singleton instance
const roleManager = new RoleManager();
export default roleManager;