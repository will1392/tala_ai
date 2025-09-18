/**
 * Authentication Middleware
 * Simple auth middleware for the email-tasks routes
 */
import roleService from '../services/roleService.js';

/**
 * Authenticate user (mock implementation for testing)
 */
export const authenticate = async (req, res, next) => {
    // Get user ID from headers - support both x-user-id and x-mock-user-id
    const userId = req.headers['x-user-id'] || 
                   req.headers['x-mock-user-id'] || 
                   req.headers.authorization?.replace('Bearer ', '') || 
                   process.env.DEFAULT_USER_ID ||
                   '59b70373-ba68-4d89-8420-5c3723aef01f'; // Your Supabase user
    
    console.log('🔐 Auth middleware:', {
        'x-user-id': req.headers['x-user-id'],
        'x-mock-user-id': req.headers['x-mock-user-id'],
        'authorization': req.headers.authorization,
        'final userId': userId
    });
    
    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    // In production, you would verify the token/session here
    // For now, we'll accept any user ID
    req.userId = userId;
    req.organizationId = req.headers['x-organization-id'] || '00000000-0000-0000-0000-000000000001';
    
    // Fetch user role
    try {
        const userRole = await roleService.getUserRole(userId);
        req.userRole = userRole;
        console.log('🔐 User role:', userRole);
    } catch (error) {
        console.error('Error fetching user role:', error);
        req.userRole = 'agent'; // Default role if fetch fails
    }
    
    next();
};

/**
 * Optional authentication - doesn't fail if no auth provided
 */
export const optionalAuth = async (req, res, next) => {
    const userId = req.headers['x-user-id'] || req.headers.authorization?.replace('Bearer ', '');
    
    if (userId) {
        req.userId = userId;
        req.organizationId = req.headers['x-organization-id'] || '00000000-0000-0000-0000-000000000001';
        
        // Fetch user role
        try {
            const userRole = await roleService.getUserRole(userId);
            req.userRole = userRole;
        } catch (error) {
            console.error('Error fetching user role:', error);
            req.userRole = 'agent'; // Default role if fetch fails
        }
    }
    
    next();
};

/**
 * Require specific role
 */
export const requireRole = (requiredRoles) => {
    // Accept single role or array of roles
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    
    return async (req, res, next) => {
        // Ensure user is authenticated first
        if (!req.userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        // Get user role if not already set
        if (!req.userRole) {
            try {
                req.userRole = await roleService.getUserRole(req.userId);
            } catch (error) {
                console.error('Error fetching user role:', error);
                return res.status(500).json({ error: 'Failed to verify permissions' });
            }
        }
        
        // Check if user has required role
        const hasRequiredRole = roles.includes(req.userRole) || req.userRole === 'super_admin';
        
        if (!hasRequiredRole) {
            return res.status(403).json({ 
                error: 'Insufficient permissions',
                required: roles,
                actual: req.userRole
            });
        }
        
        next();
    };
};

// Support for test auth mode
export const requireTestAuth = (req, res, next) => {
    // For test mode, always authenticate
    req.userId = 'test_user_123';
    req.organizationId = '00000000-0000-0000-0000-000000000001';
    next();
};

// Export requireAuth that uses test auth in test mode
export const requireAuth = process.env.ALLOW_TEST_AUTH === 'true' 
  ? requireTestAuth 
  : authenticate;

export default {
    authenticate,
    optionalAuth,
    requireRole,
    requireAuth,
    requireTestAuth
};
