/**
 * Integrated Authentication Middleware for Tala AI
 * 
 * Provides comprehensive authentication with multiple methods:
 * - Session-based authentication
 * - API key authentication
 * - JWT token validation
 * - Role-based access control (RBAC)
 * - Permission validation
 * - Security headers and protection
 */

import { UserService } from '../services/db/userService.js';
import { OrganizationService } from '../services/db/organizationService.js';
import { AuthManager } from '../security/AuthManager.js';
import { RBACManager } from '../security/RBACManager.js';
import { APIKeyManager } from '../security/APIKeyManager.js';
import { generateSecureToken } from '../utils/crypto.js';
import { auditLog } from '../utils/audit.js';
import { rateLimiter } from '../security/SecurityManager.js';

const userService = new UserService();
const organizationService = new OrganizationService();
const authManager = new AuthManager();
const rbacManager = new RBACManager();
const apiKeyManager = new APIKeyManager();

// Initialize auth services
let authInitialized = false;

const environment = (process.env.NODE_ENV || '').toLowerCase();
const mockAuthExplicitlyEnabled = process.env.MOCK_AUTH === 'true';
const mockAuthEnabled = ['development', 'test'].includes(environment) || mockAuthExplicitlyEnabled;

if (!environment && !mockAuthExplicitlyEnabled) {
  console.warn('⚠️  NODE_ENV is not set. Mock authentication will remain disabled until explicitly enabled.');
}

if (environment === 'production' && mockAuthExplicitlyEnabled) {
  console.warn('⚠️  Mock authentication has been explicitly enabled in production. Proceed with extreme caution.');
}

async function initializeAuthServices() {
  if (authInitialized) return;
  
  try {
    await authManager.initialize();
    await rbacManager.initialize();
    await apiKeyManager.initialize();
    authInitialized = true;
    console.log('✅ Authentication services initialized');
  } catch (error) {
    console.error('❌ Failed to initialize auth services:', error);
    throw error;
  }
}

/**
 * Mock authentication configuration
 */
const MOCK_AUTH_CONFIG = {
  enabled: mockAuthEnabled,
  defaultOrgId: process.env.DEFAULT_ORG_ID || null,
  defaultUserId: process.env.DEFAULT_USER_ID || null,
  
  // Mock user data
  mockUser: {
    id: null, // Will be set from database
    email: 'admin@localhost',
    displayName: 'Admin User',
    role: 'owner',
    permissions: ['read', 'write', 'admin']
  }
};

/**
 * Get or create default organization
 */
async function getDefaultOrganization() {
  try {
    // Try to get existing default organization
    const orgsResult = await organizationService.getMany({}, {
      pagination: { page: 1, pageSize: 1 }
    });

    if (orgsResult.success && orgsResult.data.length > 0) {
      return orgsResult.data[0];
    }

    // Create default organization if none exists
    console.log('🏢 Creating default organization for mock auth...');
    const createResult = await organizationService.create({
      name: 'Default Organization',
      slug: 'default',
      description: 'Default organization for development',
      plan_type: 'free'
    });

    if (createResult.success) {
      return createResult.data[0];
    }

    throw new Error('Failed to create default organization');
  } catch (error) {
    console.warn('⚠️  Database unavailable, using fallback organization for mock auth');
    // Return a fallback organization when database is not available
    return {
      id: 'mock-org-id',
      name: 'Mock Organization',
      slug: 'mock',
      description: 'Fallback organization for development'
    };
  }
}

/**
 * Get or create default user
 */
async function getDefaultUser(organizationId) {
  try {
    // Try to get existing admin user
    const usersResult = await userService.getMany(
      { organization_id: organizationId, role: 'owner' },
      { pagination: { page: 1, pageSize: 1 } }
    );

    if (usersResult.success && usersResult.data.length > 0) {
      return usersResult.data[0];
    }

    // Create default admin user if none exists
    console.log('👤 Creating default admin user for mock auth...');
    const createResult = await userService.createUser({
      organization_id: organizationId,
      email: MOCK_AUTH_CONFIG.mockUser.email,
      display_name: MOCK_AUTH_CONFIG.mockUser.displayName,
      role: MOCK_AUTH_CONFIG.mockUser.role,
      status: 'active',
      email_verified: true
    });

    if (createResult.success) {
      return createResult.data;
    }

    throw new Error('Failed to create default user');
  } catch (error) {
    console.warn('⚠️  Database unavailable, using fallback user for mock auth');
    // Return a fallback user when database is not available
    return {
      id: 'mock-user-id',
      organization_id: organizationId,
      email: MOCK_AUTH_CONFIG.mockUser.email,
      display_name: MOCK_AUTH_CONFIG.mockUser.displayName,
      role: MOCK_AUTH_CONFIG.mockUser.role,
      status: 'active'
    };
  }
}

/**
 * Initialize mock authentication data
 */
let mockAuthData = null;

async function initializeMockAuth() {
  if (mockAuthData || !MOCK_AUTH_CONFIG.enabled) {
    return mockAuthData;
  }

  try {
    console.log('🔐 Initializing mock authentication...');
    
    const organization = await getDefaultOrganization();
    const user = await getDefaultUser(organization.id);

    mockAuthData = {
      organization,
      user,
      initialized: true
    };

    console.log(`✅ Mock auth initialized - Org: ${organization.name}, User: ${user.display_name}`);
    return mockAuthData;
  } catch (error) {
    console.error('❌ Failed to initialize mock auth:', error.message);
    throw error;
  }
}

/**
 * Extract authentication credentials from request
 */
function extractAuthCredentials(req) {
  const credentials = {
    token: null,
    apiKey: null,
    sessionId: null,
    type: null
  };
  
  // Check for Bearer token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    credentials.token = authHeader.substring(7);
    credentials.type = 'jwt';
  }
  
  // Check for API key
  if (req.headers['x-api-key']) {
    credentials.apiKey = req.headers['x-api-key'];
    credentials.type = 'api_key';
  }
  
  // Check for session cookie
  if (req.session && req.session.userId) {
    credentials.sessionId = req.session.id;
    credentials.type = 'session';
  }
  
  return credentials;
}

/**
 * Validate authentication credentials
 */
async function validateCredentials(credentials, req) {
  await initializeAuthServices();
  
  try {
    switch (credentials.type) {
      case 'jwt':
        return await authManager.validateJWT(credentials.token, {
          issuer: process.env.JWT_ISSUER,
          audience: process.env.JWT_AUDIENCE,
          checkBlacklist: true
        });
        
      case 'api_key':
        const apiKeyResult = await apiKeyManager.validateAPIKey(credentials.apiKey, {
          checkRateLimit: true,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        });
        
        if (apiKeyResult.success) {
          // Check rate limits for API key
          const rateLimitResult = await rateLimiter.checkAPIKeyLimit(
            credentials.apiKey,
            req.ip
          );
          
          if (!rateLimitResult.allowed) {
            return {
              success: false,
              error: 'RATE_LIMIT_EXCEEDED',
              message: 'API key rate limit exceeded'
            };
          }
        }
        
        return apiKeyResult;
        
      case 'session':
        return await authManager.validateSession(credentials.sessionId, {
          checkExpiry: true,
          updateLastActivity: true
        });
        
      default:
        if (MOCK_AUTH_CONFIG.enabled) {
          return { success: true, mockAuth: true };
        }
        return {
          success: false,
          error: 'NO_CREDENTIALS',
          message: 'No valid authentication credentials provided'
        };
    }
  } catch (error) {
    console.error('Credential validation error:', error);
    return {
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Authentication validation failed'
    };
  }
}

/**
 * Get user from authentication credentials
 */
async function getUserFromCredentials(credentials, validationResult, req) {
  try {
    let userId = null;
    let organizationId = null;
    
    if (MOCK_AUTH_CONFIG.enabled && validationResult.mockAuth) {
      await initializeMockAuth();
      return mockAuthData;
    }
    
    switch (credentials.type) {
      case 'jwt':
        const decoded = validationResult.decoded;
        userId = decoded.sub || decoded.userId;
        organizationId = decoded.orgId || decoded.organizationId;
        break;
        
      case 'api_key':
        userId = validationResult.userId;
        organizationId = validationResult.organizationId;
        break;
        
      case 'session':
        userId = validationResult.userId;
        organizationId = validationResult.organizationId;
        break;
        
      default:
        throw new Error('Unknown credential type');
    }
    
    if (!userId) {
      throw new Error('No user ID found in credentials');
    }
    
    // Get user data from database
    const userResult = await userService.getUserById(userId, {
      organizationId,
      includePermissions: true,
      includeRoles: true
    });
    
    if (!userResult.success) {
      throw new Error('User not found');
    }
    
    // Get organization data
    const orgResult = await organizationService.getById(organizationId || userResult.data.organization_id);
    
    if (!orgResult.success) {
      throw new Error('Organization not found');
    }
    
    return {
      user: userResult.data,
      organization: orgResult.data,
      authType: credentials.type,
      validationResult
    };
    
  } catch (error) {
    console.error('Error getting user from credentials:', error);
    return null;
  }
}

/**
 * Comprehensive authentication middleware
 */
export async function authenticate(req, res, next) {
  try {
    // Add security headers
    addSecurityHeaders(res);
    
    // Extract authentication credentials
    const credentials = extractAuthCredentials(req);
    
    // Check rate limiting
    const rateLimitResult = await rateLimiter.checkRequest(req.ip, req.userId);
    if (!rateLimitResult.allowed) {
      await auditLog('rate_limit_exceeded', 'authentication', null, req.ip, {
        limit: rateLimitResult.limit,
        remaining: rateLimitResult.remaining
      });
      
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        retryAfter: rateLimitResult.retryAfter
      });
    }
    
    if (!credentials.type && !MOCK_AUTH_CONFIG.enabled) {
      await auditLog('authentication_failed', 'authentication', null, req.ip, {
        reason: 'no_credentials',
        userAgent: req.headers['user-agent']
      });
      
      return res.status(401).json({
        error: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication credentials required'
      });
    }
    
    // Validate credentials
    const validationResult = await validateCredentials(credentials, req);
    
    if (!validationResult.success) {
      await auditLog('authentication_failed', 'authentication', null, req.ip, {
        reason: validationResult.error,
        authType: credentials.type,
        userAgent: req.headers['user-agent']
      });
      
      return res.status(401).json({
        error: validationResult.error,
        message: validationResult.message
      });
    }
    
    // Get user data
    const authData = await getUserFromCredentials(credentials, validationResult, req);
    
    if (!authData) {
      await auditLog('user_lookup_failed', 'authentication', null, req.ip, {
        authType: credentials.type
      });
      
      return res.status(401).json({
        error: 'USER_NOT_FOUND',
        message: 'Unable to authenticate user'
      });
    }
    
    // Check if user is active
    if (authData.user.status !== 'active') {
      await auditLog('inactive_user_access', 'authentication', authData.user.id, req.ip, {
        userStatus: authData.user.status
      });
      
      return res.status(403).json({
        error: 'USER_INACTIVE',
        message: 'User account is not active'
      });
    }
    
    // Attach user and organization data to request
    req.user = authData.user;
    req.organization = authData.organization;
    req.isAuthenticated = true;
    req.isMockAuth = MOCK_AUTH_CONFIG.enabled;
    req.authType = authData.authType;
    
    // Add convenience properties
    req.userId = authData.user.id;
    req.organizationId = authData.organization.id;
    req.userRole = authData.user.role;
    req.userPermissions = authData.user.permissions || [];
    
    // Log successful authentication
    await auditLog('authentication_success', 'authentication', authData.user.id, req.ip, {
      authType: credentials.type,
      userAgent: req.headers['user-agent'],
      organizationId: authData.organization.id
    });
    
    next();
    
  } catch (error) {
    console.error('Authentication error:', error);
    
    await auditLog('authentication_error', 'authentication', null, req.ip, {
      error: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({
      error: 'AUTHENTICATION_ERROR',
      message: 'Internal authentication error'
    });
  }
}

/**
 * Optional authentication middleware (doesn't fail if no auth)
 */
export async function optionalAuth(req, res, next) {
  try {
    const token = extractToken(req);
    
    if (!token) {
      // No token provided, continue without authentication
      req.isAuthenticated = false;
      return next();
    }
    
    // Try to authenticate
    return authenticate(req, res, next);
    
  } catch (error) {
    // Authentication failed, but continue without auth
    req.isAuthenticated = false;
    next();
  }
}

/**
 * Enhanced role-based authorization middleware
 */
export function requireRole(requiredRole) {
  return async (req, res, next) => {
    if (!req.isAuthenticated) {
      return res.status(401).json({
        error: 'AUTHENTICATION_REQUIRED',
        message: 'You must be logged in to access this resource'
      });
    }
    
    try {
      const hasRole = await rbacManager.userHasRole(req.userId, requiredRole, req.organizationId);
      
      if (!hasRole) {
        await auditLog('authorization_failed', 'rbac', req.userId, req.ip, {
          requiredRole,
          userRole: req.userRole,
          resource: req.originalUrl
        });
        
        return res.status(403).json({
          error: 'INSUFFICIENT_PERMISSIONS',
          message: `This action requires ${requiredRole} role or higher`
        });
      }
      
      next();
      
    } catch (error) {
      console.error('Role authorization error:', error);
      return res.status(500).json({
        error: 'AUTHORIZATION_ERROR',
        message: 'Failed to verify permissions'
      });
    }
  };
}

/**
 * Permission-based authorization middleware
 */
export function requirePermission(permission) {
  return async (req, res, next) => {
    if (!req.isAuthenticated) {
      return res.status(401).json({
        error: 'AUTHENTICATION_REQUIRED',
        message: 'You must be logged in to access this resource'
      });
    }
    
    try {
      const hasPermission = await rbacManager.userHasPermission(
        req.userId,
        permission,
        req.organizationId
      );
      
      if (!hasPermission) {
        await auditLog('authorization_failed', 'rbac', req.userId, req.ip, {
          requiredPermission: permission,
          userPermissions: req.userPermissions,
          resource: req.originalUrl
        });
        
        return res.status(403).json({
          error: 'INSUFFICIENT_PERMISSIONS',
          message: `This action requires '${permission}' permission`
        });
      }
      
      next();
      
    } catch (error) {
      console.error('Permission authorization error:', error);
      return res.status(500).json({
        error: 'AUTHORIZATION_ERROR',
        message: 'Failed to verify permissions'
      });
    }
  };
}

/**
 * Resource-based authorization middleware
 */
export function requireResourceAccess(resourceType, resourceIdParam = 'id') {
  return async (req, res, next) => {
    if (!req.isAuthenticated) {
      return res.status(401).json({
        error: 'AUTHENTICATION_REQUIRED',
        message: 'You must be logged in to access this resource'
      });
    }
    
    try {
      const resourceId = req.params[resourceIdParam];
      
      if (!resourceId) {
        return res.status(400).json({
          error: 'RESOURCE_ID_REQUIRED',
          message: 'Resource ID is required'
        });
      }
      
      const hasAccess = await rbacManager.userHasResourceAccess(
        req.userId,
        resourceType,
        resourceId,
        req.organizationId
      );
      
      if (!hasAccess) {
        await auditLog('resource_access_denied', 'rbac', req.userId, req.ip, {
          resourceType,
          resourceId,
          resource: req.originalUrl
        });
        
        return res.status(403).json({
          error: 'RESOURCE_ACCESS_DENIED',
          message: 'You do not have access to this resource'
        });
      }
      
      // Log resource access
      await auditLog('resource_accessed', resourceType, req.userId, req.ip, {
        resourceId,
        method: req.method,
        resource: req.originalUrl
      });
      
      next();
      
    } catch (error) {
      console.error('Resource authorization error:', error);
      return res.status(500).json({
        error: 'AUTHORIZATION_ERROR',
        message: 'Failed to verify resource access'
      });
    }
  };
}

/**
 * Organization isolation middleware
 * Ensures users can only access data from their organization
 */
export function requireOrganization(req, res, next) {
  if (!req.isAuthenticated) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'You must be logged in to access this resource'
    });
  }
  
  if (!req.organizationId) {
    return res.status(403).json({
      error: 'No organization',
      message: 'User must belong to an organization'
    });
  }
  
  next();
}

/**
 * API key authentication middleware
 */
export async function authenticateApiKey(req, res, next) {
  try {
    addSecurityHeaders(res);
    
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      await auditLog('api_key_missing', 'api_auth', null, req.ip, {
        userAgent: req.headers['user-agent']
      });
      
      return res.status(401).json({
        error: 'API_KEY_REQUIRED',
        message: 'X-API-Key header is required'
      });
    }
    
    // Check rate limiting for API key
    const rateLimitResult = await rateLimiter.checkAPIKeyLimit(apiKey, req.ip);
    if (!rateLimitResult.allowed) {
      await auditLog('api_key_rate_limited', 'api_auth', null, req.ip, {
        apiKey: apiKey.substring(0, 8) + '...',
        limit: rateLimitResult.limit
      });
      
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'API key rate limit exceeded',
        retryAfter: rateLimitResult.retryAfter
      });
    }
    
    // Validate API key
    const validationResult = await apiKeyManager.validateAPIKey(apiKey, {
      checkRateLimit: false, // Already checked above
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    if (!validationResult.success) {
      await auditLog('api_key_invalid', 'api_auth', null, req.ip, {
        apiKey: apiKey.substring(0, 8) + '...',
        reason: validationResult.error
      });
      
      return res.status(401).json({
        error: 'INVALID_API_KEY',
        message: validationResult.message || 'The provided API key is invalid'
      });
    }
    
    // Get user and organization data
    const userResult = await userService.getUserById(validationResult.userId, {
      organizationId: validationResult.organizationId,
      includePermissions: true
    });
    
    if (!userResult.success) {
      await auditLog('api_key_user_not_found', 'api_auth', validationResult.userId, req.ip, {
        apiKey: apiKey.substring(0, 8) + '...'
      });
      
      return res.status(401).json({
        error: 'USER_NOT_FOUND',
        message: 'API key user not found'
      });
    }
    
    const orgResult = await organizationService.getById(validationResult.organizationId);
    
    if (!orgResult.success) {
      return res.status(401).json({
        error: 'ORGANIZATION_NOT_FOUND',
        message: 'API key organization not found'
      });
    }
    
    // Attach data to request
    req.user = userResult.data;
    req.organization = orgResult.data;
    req.isAuthenticated = true;
    req.isApiKeyAuth = true;
    req.authType = 'api_key';
    req.apiKey = validationResult;
    req.userId = userResult.data.id;
    req.organizationId = orgResult.data.id;
    req.userPermissions = userResult.data.permissions || [];
    
    // Log successful API key authentication
    await auditLog('api_key_success', 'api_auth', userResult.data.id, req.ip, {
      apiKeyId: validationResult.keyId,
      userAgent: req.headers['user-agent'],
      organizationId: orgResult.data.id
    });
    
    next();
    
  } catch (error) {
    console.error('API key authentication error:', error);
    
    await auditLog('api_key_error', 'api_auth', null, req.ip, {
      error: error.message
    });
    
    return res.status(500).json({
      error: 'API_KEY_ERROR',
      message: 'Internal API key authentication error'
    });
  }
}

/**
 * Get current user info endpoint
 */
export async function getCurrentUser(req, res) {
  if (!req.isAuthenticated) {
    return res.status(401).json({
      error: 'Not authenticated',
      message: 'User is not authenticated'
    });
  }
  
  try {
    // Get fresh user data from database
    const userResult = await userService.getUserById(req.userId, {
      organizationId: req.organizationId,
      includeSensitive: false
    });
    
    if (!userResult.success) {
      return res.status(404).json({
        error: 'User not found',
        message: 'Current user not found in database'
      });
    }
    
    res.json({
      user: userResult.data,
      organization: req.organization,
      isMockAuth: req.isMockAuth || false
    });
    
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({
      error: 'Internal error',
      message: 'Failed to get user information'
    });
  }
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(res) {
  // Basic security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Remove sensitive headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
}

/**
 * Initialize authentication system
 */
export async function initializeAuth() {
  try {
    await initializeAuthServices();
    
    if (MOCK_AUTH_CONFIG.enabled) {
      console.log('🔐 Authentication: Mock mode enabled for development');
      await initializeMockAuth();
    } else {
      console.log('🔐 Authentication: Production mode - full security enabled');
    }
    
    console.log('✅ Authentication system initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize authentication system:', error);
    throw error;
  }
}

/**
 * Export configuration for external use
 */
export { MOCK_AUTH_CONFIG };

// Export all authentication and authorization functions
export default {
  authenticate,
  optionalAuth,
  requireRole,
  requirePermission,
  requireResourceAccess,
  requireOrganization,
  authenticateApiKey,
  getCurrentUser,
  initializeAuth,
  addSecurityHeaders
};