/**
 * Test Auth Middleware
 * 
 * Simple auth middleware for testing email integration
 * DO NOT USE IN PRODUCTION
 */

export const testAuth = (req, res, next) => {
  // Check for test mode
  if (process.env.NODE_ENV === 'test' || process.env.ALLOW_TEST_AUTH === 'true') {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer test-')) {
      // Mock user for testing
      req.user = {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User'
      };
      return next();
    }
  }
  
  // Fall back to regular auth
  return next();
};

// Middleware that requires auth or test auth
export const requireTestAuth = (req, res, next) => {
  // Check if already authenticated
  if (req.user) {
    return next();
  }
  
  // Check for test auth
  const authHeader = req.headers.authorization;
  if (process.env.NODE_ENV === 'test' || process.env.ALLOW_TEST_AUTH === 'true') {
    if (authHeader && authHeader.startsWith('Bearer test-')) {
      req.user = {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User'
      };
      return next();
    }
  }
  
  // Not authenticated
  return res.status(401).json({ error: 'Authentication required' });
};