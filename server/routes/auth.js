/**
 * Authentication Routes for Tala AI
 * 
 * This module provides RESTful authentication endpoints that work with
 * multiple authentication providers (Local, Auth0, Clerk, Mock).
 * All routes are provider-agnostic and handle authentication through
 * the AuthManager.
 */

import express from 'express';
import authManager from '../auth/AuthManager.js';
import { getAuthConfig } from '../config/auth.js';

const router = express.Router();

/**
 * POST /auth/login
 * Authenticate user with email/password or token
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password, token, provider, remember = false } = req.body;
    
    if (!email && !password && !token) {
      return res.status(400).json({
        error: 'Email/password or token required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    const credentials = token ? { token } : { email, password };
    const options = {
      provider,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      remember
    };

    const result = await authManager.authenticate(credentials, options);

    if (!result.success) {
      return res.status(401).json({
        error: result.error,
        code: result.code
      });
    }

    // Set secure cookies if remember is true
    if (remember && result.tokens?.refreshToken) {
      res.cookie('refresh_token', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
    }

    res.json({
      success: true,
      user: result.user,
      tokens: result.tokens,
      provider: result.provider || provider || authManager.defaultProvider
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
});

/**
 * POST /auth/register
 * Register new user
 */
router.post('/register', async (req, res) => {
  try {
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      organizationId, 
      provider,
      metadata = {} 
    } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email is required',
        code: 'MISSING_EMAIL'
      });
    }

    const userData = {
      email,
      password,
      firstName,
      lastName,
      organizationId,
      ...metadata
    };

    const options = {
      provider,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const result = await authManager.register(userData, options);

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        code: result.code
      });
    }

    res.status(201).json({
      success: true,
      user: result.user,
      requiresVerification: result.requiresVerification,
      emailVerificationToken: result.emailVerificationToken,
      provider: result.provider || provider || authManager.defaultProvider
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      code: 'REGISTRATION_ERROR'
    });
  }
});

/**
 * POST /auth/logout
 * Logout user and invalidate tokens
 */
router.post('/logout', authManager.middleware({ required: false }), async (req, res) => {
  try {
    const token = authManager.extractToken(req);
    const provider = req.body.provider || req.authProvider;

    if (token) {
      const options = {
        provider,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      };

      await authManager.logout(token, options);
    }

    // Clear refresh token cookie
    res.clearCookie('refresh_token');

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
});

/**
 * POST /auth/refresh
 * Refresh authentication tokens
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken: bodyRefreshToken, provider } = req.body;
    const cookieRefreshToken = req.cookies?.refresh_token;
    
    const refreshToken = bodyRefreshToken || cookieRefreshToken;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token required',
        code: 'MISSING_REFRESH_TOKEN'
      });
    }

    const options = {
      provider,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const result = await authManager.refresh(refreshToken, options);

    if (!result.success) {
      // Clear invalid refresh token cookie
      res.clearCookie('refresh_token');
      
      return res.status(401).json({
        error: result.error,
        code: result.code
      });
    }

    // Update refresh token cookie if new one provided
    if (result.tokens?.refreshToken && cookieRefreshToken) {
      res.cookie('refresh_token', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
    }

    res.json({
      success: true,
      tokens: result.tokens,
      provider: result.provider || provider
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Token refresh failed',
      code: 'REFRESH_ERROR'
    });
  }
});

/**
 * GET /auth/me
 * Get current authenticated user
 */
router.get('/me', authManager.middleware({ autoDetect: true }), async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user,
      provider: req.authProvider,
      permissions: req.userRoles
    });

  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      error: 'Failed to get user information',
      code: 'USER_INFO_ERROR'
    });
  }
});

/**
 * GET /auth/providers
 * Get available authentication providers
 */
router.get('/providers', async (req, res) => {
  try {
    const providers = authManager.getAvailableProviders();
    const authConfig = getAuthConfig();

    res.json({
      success: true,
      providers: providers,
      default: authManager.defaultProvider,
      multiProvider: authConfig.global.multiProvider
    });

  } catch (error) {
    console.error('Get providers error:', error);
    res.status(500).json({
      error: 'Failed to get provider information',
      code: 'PROVIDERS_ERROR'
    });
  }
});

/**
 * GET /auth/callback/:provider
 * Handle OAuth callbacks from external providers
 */
router.get('/callback/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const callbackData = { ...req.query, ...req.body };

    const options = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      signature: req.get('svix-signature') || req.get('clerk-signature') // For webhooks
    };

    const result = await authManager.handleCallback(provider, callbackData, options);

    if (!result.success) {
      // Redirect to frontend with error
      const errorUrl = `${process.env.CORS_ORIGIN}/auth/error?error=${encodeURIComponent(result.error)}&code=${result.code}`;
      return res.redirect(errorUrl);
    }

    // For successful callbacks, redirect to frontend with tokens or success indicator
    if (result.tokens) {
      // Include tokens in redirect (for development - in production, use secure methods)
      const successUrl = `${process.env.CORS_ORIGIN}/auth/success?provider=${provider}&token=${result.tokens.accessToken}`;
      return res.redirect(successUrl);
    } else {
      // Generic success redirect
      const successUrl = `${process.env.CORS_ORIGIN}/auth/success?provider=${provider}`;
      return res.redirect(successUrl);
    }

  } catch (error) {
    console.error('OAuth callback error:', error);
    
    const errorUrl = `${process.env.CORS_ORIGIN}/auth/error?error=${encodeURIComponent('Callback processing failed')}&code=CALLBACK_ERROR`;
    res.redirect(errorUrl);
  }
});

/**
 * POST /auth/callback/:provider
 * Handle webhook callbacks from external providers (like Clerk)
 */
router.post('/callback/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const callbackData = req.body;

    const options = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      signature: req.get('svix-signature') || req.get('clerk-signature')
    };

    const result = await authManager.handleCallback(provider, callbackData, options);

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        code: result.code
      });
    }

    res.json({
      success: true,
      message: 'Callback processed successfully'
    });

  } catch (error) {
    console.error('Webhook callback error:', error);
    res.status(500).json({
      error: 'Callback processing failed',
      code: 'CALLBACK_ERROR'
    });
  }
});

/**
 * POST /auth/password/reset
 * Request password reset
 */
router.post('/password/reset', async (req, res) => {
  try {
    const { email, provider } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email is required',
        code: 'MISSING_EMAIL'
      });
    }

    const options = {
      provider,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const result = await authManager.resetPassword(email, options);

    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: 'If the email exists, a reset link has been sent'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      error: 'Password reset failed',
      code: 'RESET_ERROR'
    });
  }
});

/**
 * POST /auth/email/verify
 * Verify email address
 */
router.post('/email/verify', async (req, res) => {
  try {
    const { token, provider } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Verification token is required',
        code: 'MISSING_TOKEN'
      });
    }

    const options = { provider };
    const result = await authManager.verifyEmail(token, options);

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        code: result.code
      });
    }

    res.json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      error: 'Email verification failed',
      code: 'VERIFICATION_ERROR'
    });
  }
});

/**
 * GET /auth/health
 * Get authentication system health status
 */
router.get('/health', async (req, res) => {
  try {
    const health = authManager.getHealthStatus();
    const statusCode = health.status === 'healthy' ? 200 : 503;

    res.status(statusCode).json({
      success: health.status === 'healthy',
      ...health,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Auth health check error:', error);
    res.status(500).json({
      success: false,
      status: 'error',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Development/Testing Routes
 */
if (process.env.NODE_ENV === 'development') {
  
  /**
   * POST /auth/dev/simulate-role
   * Simulate user role (mock provider only)
   */
  router.post('/dev/simulate-role', authManager.middleware(), async (req, res) => {
    try {
      const { userId, roles } = req.body;
      const provider = authManager.getProvider('mock');
      
      if (provider && typeof provider.simulateRole === 'function') {
        const success = await provider.simulateRole(userId || req.userId, roles);
        
        res.json({
          success,
          message: success ? 'Role simulation applied' : 'Role simulation failed'
        });
      } else {
        res.status(400).json({
          error: 'Role simulation only available with mock provider',
          code: 'NOT_SUPPORTED'
        });
      }

    } catch (error) {
      console.error('Role simulation error:', error);
      res.status(500).json({
        error: 'Role simulation failed',
        code: 'SIMULATION_ERROR'
      });
    }
  });

  /**
   * GET /auth/dev/users
   * Get all mock users (development only)
   */
  router.get('/dev/users', async (req, res) => {
    try {
      const provider = authManager.getProvider('mock');
      
      if (provider && typeof provider.getAllUsers === 'function') {
        const users = provider.getAllUsers();
        
        res.json({
          success: true,
          users,
          count: users.length
        });
      } else {
        res.status(400).json({
          error: 'User listing only available with mock provider',
          code: 'NOT_SUPPORTED'
        });
      }

    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        error: 'Failed to get users',
        code: 'GET_USERS_ERROR'
      });
    }
  });

  /**
   * POST /auth/dev/reset
   * Reset mock provider to default state
   */
  router.post('/dev/reset', async (req, res) => {
    try {
      const provider = authManager.getProvider('mock');
      
      if (provider && typeof provider.reset === 'function') {
        provider.reset();
        
        res.json({
          success: true,
          message: 'Mock provider reset to default state'
        });
      } else {
        res.status(400).json({
          error: 'Reset only available with mock provider',
          code: 'NOT_SUPPORTED'
        });
      }

    } catch (error) {
      console.error('Reset error:', error);
      res.status(500).json({
        error: 'Reset failed',
        code: 'RESET_ERROR'
      });
    }
  });
}

export default router;