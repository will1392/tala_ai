/**
 * Authorization Middleware for Tala AI
 * 
 * This middleware provides role-based access control (RBAC) for API endpoints.
 * It checks if the authenticated user has the required permissions to access
 * specific resources and perform specific actions.
 * 
 * Usage Examples:
 * - authorize('documents:read:own') - Single permission
 * - authorize(['documents:read:own', 'documents:read:shared'], 'OR') - Multiple permissions with OR logic
 * - authorize(['documents:update:own', 'analytics:view:own'], 'AND') - Multiple permissions with AND logic
 * - authorize('documents:read:own', { resource: 'documentId' }) - Resource-specific permission
 */

import { roleHasPermission, getEffectivePermissions, isRoleHigher } from '../auth/rbac/roles.js';
import { isValidPermission, parsePermission, getCriticalPermissions } from '../auth/rbac/permissions.js';

/**
 * Authorization middleware factory
 * @param {string|Array} requiredPermissions - Permission(s) required for access
 * @param {string} logic - Logic for multiple permissions ('AND' or 'OR'), defaults to 'OR'
 * @param {Object} options - Additional authorization options
 * @returns {Function} Express middleware function
 */
export function authorize(requiredPermissions, logic = 'OR', options = {}) {
  return async (req, res, next) => {
    try {
      // Ensure user is authenticated
      if (!req.user || !req.userId) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED',
          message: 'You must be logged in to access this resource'
        });
      }

      // Normalize permissions to array
      const permissions = Array.isArray(requiredPermissions) 
        ? requiredPermissions 
        : [requiredPermissions];

      // Validate all permissions exist
      const invalidPermissions = permissions.filter(p => !isValidPermission(p));
      if (invalidPermissions.length > 0) {
        console.error('Invalid permissions in authorization middleware:', invalidPermissions);
        return res.status(500).json({
          error: 'Invalid permission configuration',
          code: 'INVALID_PERMISSIONS',
          message: 'Server configuration error - invalid permissions defined'
        });
      }

      // Get user's roles and effective permissions
      const userRoles = req.userRoles || req.user.roles || [];
      const userPermissions = getUserEffectivePermissions(userRoles);
      
      // Check permission requirements
      const authResult = await checkPermissions({
        requiredPermissions: permissions,
        userPermissions,
        userRoles,
        logic,
        user: req.user,
        request: req,
        options
      });

      if (!authResult.authorized) {
        // Log authorization failure for security audit
        logAuthorizationFailure({
          userId: req.userId,
          requiredPermissions: permissions,
          userPermissions,
          userRoles,
          endpoint: req.originalUrl,
          method: req.method,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          reason: authResult.reason,
          timestamp: new Date().toISOString()
        });

        return res.status(403).json({
          error: 'Insufficient permissions',
          code: authResult.code,
          message: authResult.message,
          required: permissions,
          missing: authResult.missingPermissions || []
        });
      }

      // Log successful authorization for critical permissions
      if (hasCriticalPermissions(permissions)) {
        logCriticalPermissionAccess({
          userId: req.userId,
          permissions,
          endpoint: req.originalUrl,
          method: req.method,
          ip: req.ip,
          timestamp: new Date().toISOString()
        });
      }

      // Attach authorization context to request
      req.authContext = {
        permissions: userPermissions,
        roles: userRoles,
        authorizedFor: permissions,
        resourceAccess: authResult.resourceAccess || {}
      };

      next();

    } catch (error) {
      console.error('Authorization middleware error:', error);
      res.status(500).json({
        error: 'Authorization check failed',
        code: 'AUTHORIZATION_ERROR',
        message: 'An error occurred while checking permissions'
      });
    }
  };
}

/**
 * Check if user has required permissions
 * @param {Object} params - Check parameters
 * @returns {Object} Authorization result
 */
async function checkPermissions({
  requiredPermissions,
  userPermissions,
  userRoles,
  logic,
  user,
  request,
  options
}) {
  const results = [];
  const missingPermissions = [];
  const resourceAccess = {};

  for (const permission of requiredPermissions) {
    const result = await checkSinglePermission({
      permission,
      userPermissions,
      userRoles,
      user,
      request,
      options
    });

    results.push(result);
    
    if (!result.granted) {
      missingPermissions.push(permission);
    } else if (result.resourceAccess) {
      resourceAccess[permission] = result.resourceAccess;
    }
  }

  // Apply logic (AND/OR) to determine final authorization
  let authorized = false;
  let reason = '';
  let code = '';
  let message = '';

  if (logic === 'AND') {
    authorized = results.every(r => r.granted);
    if (!authorized) {
      reason = 'Missing required permissions (all required)';
      code = 'INSUFFICIENT_PERMISSIONS_AND';
      message = `You need all of the following permissions: ${missingPermissions.join(', ')}`;
    }
  } else { // OR logic
    authorized = results.some(r => r.granted);
    if (!authorized) {
      reason = 'Missing required permissions (any required)';
      code = 'INSUFFICIENT_PERMISSIONS_OR';
      message = `You need at least one of the following permissions: ${requiredPermissions.join(', ')}`;
    }
  }

  return {
    authorized,
    reason,
    code,
    message,
    missingPermissions,
    resourceAccess
  };
}

/**
 * Check a single permission for the user
 * @param {Object} params - Check parameters
 * @returns {Object} Permission check result
 */
async function checkSinglePermission({
  permission,
  userPermissions,
  userRoles,
  user,
  request,
  options
}) {
  const parsed = parsePermission(permission);
  
  // Basic permission check - does user have this permission?
  if (!userPermissions.includes(permission)) {
    return {
      granted: false,
      reason: `User does not have permission: ${permission}`,
      permission
    };
  }

  // Resource-specific permission checks
  if (options.resource || parsed.scope === 'own' || parsed.scope === 'assigned') {
    const resourceCheck = await checkResourcePermission({
      permission,
      parsed,
      user,
      request,
      options
    });
    
    if (!resourceCheck.granted) {
      return resourceCheck;
    }
  }

  // Organization/Agency scope checks
  if (parsed.scope === 'agency' || parsed.scope === 'all') {
    const orgCheck = checkOrganizationPermission({
      permission,
      parsed,
      user,
      request,
      options
    });
    
    if (!orgCheck.granted) {
      return orgCheck;
    }
  }

  // System-wide permission checks (highest level)
  if (parsed.scope === 'system') {
    const systemCheck = checkSystemPermission({
      permission,
      parsed,
      userRoles,
      options
    });
    
    if (!systemCheck.granted) {
      return systemCheck;
    }
  }

  return {
    granted: true,
    permission,
    resourceAccess: options.resource ? { resourceId: options.resource } : null
  };
}

/**
 * Check resource-specific permissions
 * @param {Object} params - Check parameters
 * @returns {Object} Resource permission result
 */
async function checkResourcePermission({ permission, parsed, user, request, options }) {
  const { resource: resourceType, action, scope } = parsed;
  
  // If specific resource ID is provided, check ownership/assignment
  if (options.resource) {
    const resourceId = options.resource;
    
    // For 'own' scope, check if user owns the resource
    if (scope === 'own') {
      const isOwner = await checkResourceOwnership(resourceType, resourceId, user.id);
      if (!isOwner) {
        return {
          granted: false,
          reason: `User does not own ${resourceType} with ID: ${resourceId}`,
          permission
        };
      }
    }
    
    // For 'assigned' scope, check if resource is assigned to user
    if (scope === 'assigned') {
      const isAssigned = await checkResourceAssignment(resourceType, resourceId, user.id);
      if (!isAssigned) {
        return {
          granted: false,
          reason: `${resourceType} with ID ${resourceId} is not assigned to user`,
          permission
        };
      }
    }
  }

  // Extract resource ID from request parameters if not explicitly provided
  if (!options.resource && (scope === 'own' || scope === 'assigned')) {
    const resourceId = extractResourceId(request, resourceType);
    if (resourceId) {
      // Recursive call with extracted resource ID
      return checkResourcePermission({
        permission,
        parsed,
        user,
        request,
        options: { ...options, resource: resourceId }
      });
    }
  }

  return { granted: true, permission };
}

/**
 * Check organization/agency-level permissions
 * @param {Object} params - Check parameters
 * @returns {Object} Organization permission result
 */
function checkOrganizationPermission({ permission, parsed, user, request, options }) {
  const { scope } = parsed;
  
  // For agency scope, ensure user belongs to an organization
  if (scope === 'agency') {
    if (!user.organizationId && !user.agencyId) {
      return {
        granted: false,
        reason: 'User must belong to an agency for agency-scoped permissions',
        permission
      };
    }
  }

  // Additional organization-specific checks can be added here
  // For example, checking if user has specific role within organization
  
  return { granted: true, permission };
}

/**
 * Check system-level permissions
 * @param {Object} params - Check parameters
 * @returns {Object} System permission result
 */
function checkSystemPermission({ permission, parsed, userRoles, options }) {
  const { scope } = parsed;
  
  // System permissions typically require SUPER_ADMIN role
  if (scope === 'system') {
    const hasSystemRole = userRoles.includes('SUPER_ADMIN');
    if (!hasSystemRole) {
      return {
        granted: false,
        reason: 'System permissions require SUPER_ADMIN role',
        permission
      };
    }
  }

  return { granted: true, permission };
}

/**
 * Get effective permissions for user roles
 * @param {Array} roles - User roles
 * @returns {Array} All effective permissions
 */
function getUserEffectivePermissions(roles) {
  const permissions = new Set();
  
  roles.forEach(role => {
    const rolePermissions = getEffectivePermissions(role);
    rolePermissions.forEach(p => permissions.add(p));
  });
  
  return Array.from(permissions);
}

/**
 * Check if user owns a specific resource
 * @param {string} resourceType - Type of resource
 * @param {string} resourceId - Resource ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Whether user owns resource
 */
async function checkResourceOwnership(resourceType, resourceId, userId) {
  // This would typically query the database to check ownership
  // For now, we'll implement basic logic that can be extended
  
  try {
    switch (resourceType) {
      case 'documents':
        // Check if user created/owns the document
        // Implementation would query documents table
        return true; // Placeholder
        
      case 'conversations':
        // Check if user owns the conversation
        // Implementation would query conversations table
        return true; // Placeholder
        
      case 'itineraries':
        // Check if user created the itinerary
        // Implementation would query itineraries table
        return true; // Placeholder
        
      default:
        console.warn(`Unknown resource type for ownership check: ${resourceType}`);
        return false;
    }
  } catch (error) {
    console.error(`Error checking resource ownership for ${resourceType}:${resourceId}:`, error);
    return false;
  }
}

/**
 * Check if resource is assigned to user
 * @param {string} resourceType - Type of resource
 * @param {string} resourceId - Resource ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Whether resource is assigned to user
 */
async function checkResourceAssignment(resourceType, resourceId, userId) {
  // This would typically query assignment tables in the database
  // For now, we'll implement basic logic that can be extended
  
  try {
    switch (resourceType) {
      case 'clients':
        // Check if client is assigned to user
        // Implementation would query client assignments
        return true; // Placeholder
        
      case 'conversations':
        // Check if conversation involves user
        // Implementation would check conversation participants
        return true; // Placeholder
        
      case 'itineraries':
        // Check if itinerary is assigned to user
        // Implementation would query itinerary assignments
        return true; // Placeholder
        
      default:
        console.warn(`Unknown resource type for assignment check: ${resourceType}`);
        return false;
    }
  } catch (error) {
    console.error(`Error checking resource assignment for ${resourceType}:${resourceId}:`, error);
    return false;
  }
}

/**
 * Extract resource ID from request parameters
 * @param {Object} request - Express request object
 * @param {string} resourceType - Type of resource
 * @returns {string|null} Extracted resource ID
 */
function extractResourceId(request, resourceType) {
  // Common parameter names for resource IDs
  const paramMappings = {
    documents: ['documentId', 'docId', 'id'],
    conversations: ['conversationId', 'convId', 'id'],
    itineraries: ['itineraryId', 'itinId', 'id'],
    clients: ['clientId', 'id'],
    users: ['userId', 'id']
  };
  
  const possibleParams = paramMappings[resourceType] || ['id'];
  
  // Check URL parameters first
  for (const param of possibleParams) {
    if (request.params[param]) {
      return request.params[param];
    }
  }
  
  // Check query parameters
  for (const param of possibleParams) {
    if (request.query[param]) {
      return request.query[param];
    }
  }
  
  // Check request body
  for (const param of possibleParams) {
    if (request.body && request.body[param]) {
      return request.body[param];
    }
  }
  
  return null;
}

/**
 * Check if any permissions are critical
 * @param {Array} permissions - Permissions to check
 * @returns {boolean} Whether any permissions are critical
 */
function hasCriticalPermissions(permissions) {
  const criticalPerms = getCriticalPermissions();
  return permissions.some(p => criticalPerms.includes(p));
}

/**
 * Log authorization failure for security audit
 * @param {Object} details - Failure details
 */
function logAuthorizationFailure(details) {
  // In production, this would send to security monitoring system
  console.warn('[SECURITY] Authorization Failure:', {
    userId: details.userId,
    endpoint: details.endpoint,
    method: details.method,
    requiredPermissions: details.requiredPermissions,
    reason: details.reason,
    ip: details.ip,
    timestamp: details.timestamp
  });
}

/**
 * Log critical permission access for security audit
 * @param {Object} details - Access details
 */
function logCriticalPermissionAccess(details) {
  // In production, this would send to security monitoring system
  console.info('[SECURITY] Critical Permission Access:', {
    userId: details.userId,
    permissions: details.permissions,
    endpoint: details.endpoint,
    method: details.method,
    ip: details.ip,
    timestamp: details.timestamp
  });
}

/**
 * Middleware for role-based authorization (simplified)
 * @param {string|Array} requiredRoles - Required role(s)
 * @param {string} logic - Logic for multiple roles ('AND' or 'OR')
 * @returns {Function} Express middleware function
 */
export function requireRole(requiredRoles, logic = 'OR') {
  return (req, res, next) => {
    if (!req.user || !req.userRoles) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }

    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    const userRoles = req.userRoles || [];

    let hasAccess = false;
    if (logic === 'AND') {
      hasAccess = roles.every(role => userRoles.includes(role));
    } else {
      hasAccess = roles.some(role => userRoles.includes(role));
    }

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Insufficient role permissions',
        code: 'INSUFFICIENT_ROLES',
        required: roles,
        current: userRoles
      });
    }

    next();
  };
}

/**
 * Middleware to check if user can access resource owned by another user
 * @param {string} targetUserParam - Parameter name containing target user ID
 * @returns {Function} Express middleware function
 */
export function canAccessUserResource(targetUserParam = 'userId') {
  return (req, res, next) => {
    const targetUserId = req.params[targetUserParam] || req.query[targetUserParam];
    const currentUserId = req.userId;
    const userRoles = req.userRoles || [];

    // Allow access to own resources
    if (targetUserId === currentUserId) {
      return next();
    }

    // Check if user has roles that allow accessing other users' resources
    const canAccessOthers = userRoles.some(role => 
      ['SUPER_ADMIN', 'AGENCY_OWNER', 'AGENCY_ADMIN'].includes(role)
    );

    if (!canAccessOthers) {
      return res.status(403).json({
        error: 'Cannot access other user\'s resources',
        code: 'CROSS_USER_ACCESS_DENIED'
      });
    }

    next();
  };
}

export default authorize;