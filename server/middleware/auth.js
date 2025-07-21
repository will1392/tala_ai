/**
 * Authentication Middleware
 * Simple auth middleware for the email-tasks routes
 */

/**
 * Authenticate user (mock implementation for testing)
 */
export const authenticate = (req, res, next) => {
    // Get user ID from headers or mock it for testing
    const userId = req.headers['x-user-id'] || req.headers.authorization?.replace('Bearer ', '') || 'test_user_123';
    
    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    // In production, you would verify the token/session here
    // For now, we'll accept any user ID
    req.userId = userId;
    req.organizationId = req.headers['x-organization-id'] || 'test_org_123';
    
    next();
};

/**
 * Optional authentication - doesn't fail if no auth provided
 */
export const optionalAuth = (req, res, next) => {
    const userId = req.headers['x-user-id'] || req.headers.authorization?.replace('Bearer ', '');
    
    if (userId) {
        req.userId = userId;
        req.organizationId = req.headers['x-organization-id'] || 'test_org_123';
    }
    
    next();
};

/**
 * Require specific role (mock implementation)
 */
export const requireRole = (role) => {
    return (req, res, next) => {
        // In production, check user's role from database
        // For testing, we'll allow all roles
        next();
    };
};

// Support for test auth mode
export const requireTestAuth = (req, res, next) => {
    // For test mode, always authenticate
    req.userId = 'test_user_123';
    req.organizationId = 'test_org_123';
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
