/**
 * Basic RBAC Manager for Tala AI
 * Provides role-based access control functionality
 */

export class RBACManager {
  constructor() {
    this.initialized = false;
    this.roles = new Map();
    this.userRoles = new Map();
    this.permissions = new Map();
    this.resourceAccess = new Map();
    
    // Initialize default roles and permissions
    this.initializeDefaultRoles();
  }

  async initialize() {
    if (this.initialized) return;
    console.log('👥 Initializing RBACManager...');
    this.initialized = true;
  }

  initializeDefaultRoles() {
    // Define role hierarchy (higher numbers = more permissions)
    const roleHierarchy = {
      'viewer': 1,
      'member': 2,
      'admin': 3,
      'owner': 4
    };

    // Define permissions for each role
    const rolePermissions = {
      'viewer': ['documents:read'],
      'member': ['documents:read', 'documents:write', 'documents:share'],
      'admin': ['documents:*', 'users:read', 'users:write', 'encryption:read'],
      'owner': ['*'] // All permissions
    };

    // Store roles and permissions
    Object.entries(roleHierarchy).forEach(([role, level]) => {
      this.roles.set(role, { level, permissions: rolePermissions[role] });
    });
  }

  /**
   * Check if user has a specific role
   */
  async userHasRole(userId, requiredRole) {
    const userRole = this.userRoles.get(userId) || 'member'; // Default to member
    const userRoleLevel = this.roles.get(userRole)?.level || 2;
    const requiredRoleLevel = this.roles.get(requiredRole)?.level || 1;
    
    return userRoleLevel >= requiredRoleLevel;
  }

  /**
   * Check if user has a specific permission
   */
  async userHasPermission(userId, permission) {
    const userRole = this.userRoles.get(userId) || 'member';
    const roleData = this.roles.get(userRole);
    
    if (!roleData) return false;
    
    // Check if user has wildcard permission
    if (roleData.permissions.includes('*')) return true;
    
    // Check for exact permission match
    if (roleData.permissions.includes(permission)) return true;
    
    // Check for wildcard in category (e.g., 'documents:*')
    const [category] = permission.split(':');
    if (roleData.permissions.includes(`${category}:*`)) return true;
    
    return false;
  }

  /**
   * Assign role to user
   */
  async assignRole(userId, role) {
    if (!this.roles.has(role)) {
      throw new Error(`Role '${role}' does not exist`);
    }
    
    this.userRoles.set(userId, role);
    return true;
  }

  /**
   * Grant resource access to user
   */
  async grantResourceAccess(userId, resourceType, resourceId, permissions = ['read']) {
    const key = `${userId}:${resourceType}:${resourceId}`;
    this.resourceAccess.set(key, permissions);
    return true;
  }

  /**
   * Check if user has access to specific resource
   */
  async userHasResourceAccess(userId, resourceType, resourceId, permission = 'read') {
    const key = `${userId}:${resourceType}:${resourceId}`;
    const resourcePermissions = this.resourceAccess.get(key);
    
    if (!resourcePermissions) return false;
    
    return resourcePermissions.includes(permission) || resourcePermissions.includes('*');
  }

  /**
   * Revoke resource access from user
   */
  async revokeResourceAccess(userId, resourceType, resourceId) {
    const key = `${userId}:${resourceType}:${resourceId}`;
    return this.resourceAccess.delete(key);
  }

  /**
   * Create a new role
   */
  async createRole(roleName, description, permissions) {
    this.roles.set(roleName, {
      level: this.roles.size + 1,
      permissions,
      description
    });
    return true;
  }

  /**
   * Get user's role
   */
  getUserRole(userId) {
    return this.userRoles.get(userId) || 'member';
  }
}

export default RBACManager;