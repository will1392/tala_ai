/**
 * Auth0Provider - Auth0 authentication integration
 * 
 * This provider integrates Auth0's OpenID Connect authentication with
 * the Tala AI authentication system. It handles JWT validation,
 * user data mapping, and organization management through Auth0.
 */

import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import fetch from 'node-fetch';
import BaseAuthProvider from './BaseAuthProvider.js';

class Auth0Provider extends BaseAuthProvider {
  constructor(config = {}) {
    super(config);
    
    this.validateConfig([
      'domain',
      'clientId', 
      'clientSecret',
      'audience'
    ]);

    this.domain = config.domain;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.audience = config.audience;
    this.scope = config.scope || 'openid profile email';
    this.connection = config.connection || 'Username-Password-Authentication';
    this.leeway = config.leeway || 60;
    
    // JWKS client for JWT validation
    this.jwksClient = jwksClient({
      jwksUri: `https://${this.domain}/.well-known/jwks.json`,
      requestHeaders: {},
      timeout: 30000,
      cacheMaxEntries: 5,
      cacheMaxAge: 600000 // 10 minutes
    });

    // Auth0 Management API client
    this.managementToken = null;
    this.managementTokenExpiry = null;
  }

  async initialize() {
    this.log('Initializing Auth0Provider');
    
    try {
      // Test Auth0 configuration by fetching JWKS
      await this.getJwksKey('test-key-id');
      this.log('Auth0 JWKS endpoint accessible');
    } catch (error) {
      this.log(`Auth0 initialization warning: ${error.message}`, 'warn');
    }
    
    this.log('Auth0Provider initialized successfully');
  }

  async authenticate(credentials, context = {}) {
    const { token, email, password } = credentials;
    
    if (token) {
      // JWT token authentication
      return await this.authenticateWithToken(token, context);
    } else if (email && password) {
      // Email/password authentication
      return await this.authenticateWithPassword(email, password, context);
    } else {
      return {
        success: false,
        error: 'Token or email/password required',
        code: 'MISSING_CREDENTIALS'
      };
    }
  }

  async authenticateWithToken(token, context = {}) {
    try {
      // Validate and decode JWT
      const decoded = await this.validateJWT(token);
      
      if (!decoded) {
        return {
          success: false,
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        };
      }

      // Get user profile from Auth0
      const userProfile = await this.getUserProfile(decoded.sub);
      
      if (!userProfile) {
        return {
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        };
      }

      // Map Auth0 user to our user model
      const user = await this.mapAuth0User(userProfile, decoded);

      this.log(`User authenticated successfully via Auth0: ${user.email}`, 'info', {
        userId: user.id,
        auth0Id: userProfile.user_id,
        ip: context.ip
      });

      return {
        success: true,
        user,
        tokens: {
          accessToken: token,
          tokenType: 'Bearer',
          expiresIn: decoded.exp - Math.floor(Date.now() / 1000)
        }
      };

    } catch (error) {
      this.log(`Auth0 token authentication failed: ${error.message}`, 'error', {
        ip: context.ip
      });

      return {
        success: false,
        error: 'Authentication failed',
        code: 'AUTH_ERROR'
      };
    }
  }

  async authenticateWithPassword(email, password, context = {}) {
    try {
      // Use Auth0 Resource Owner Password Grant
      const response = await fetch(`https://${this.domain}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          grant_type: 'password',
          username: email,
          password: password,
          audience: this.audience,
          scope: this.scope,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          connection: this.connection
        })
      });

      const tokenData = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: tokenData.error_description || 'Authentication failed',
          code: tokenData.error || 'AUTH_ERROR'
        };
      }

      // Validate the received token and get user data
      const authResult = await this.authenticateWithToken(tokenData.access_token, context);
      
      if (authResult.success) {
        // Add refresh token if available
        if (tokenData.refresh_token) {
          authResult.tokens.refreshToken = tokenData.refresh_token;
        }
      }

      return authResult;

    } catch (error) {
      this.log(`Auth0 password authentication failed: ${error.message}`, 'error', {
        email,
        ip: context.ip
      });

      return {
        success: false,
        error: 'Authentication failed',
        code: 'AUTH_ERROR'
      };
    }
  }

  async register(userData, context = {}) {
    try {
      const { email, password, firstName, lastName, organizationId } = userData;

      if (!email || !password) {
        return {
          success: false,
          error: 'Email and password are required',
          code: 'MISSING_CREDENTIALS'
        };
      }

      // Get Management API token
      const managementToken = await this.getManagementToken();
      
      // Create user in Auth0
      const response = await fetch(`https://${this.domain}/api/v2/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${managementToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          connection: this.connection,
          email: email,
          password: password,
          given_name: firstName,
          family_name: lastName,
          name: `${firstName} ${lastName}`,
          user_metadata: {
            organizationId: organizationId
          },
          app_metadata: {
            tala_user: true,
            created_via: 'api'
          }
        })
      });

      const auth0User = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: auth0User.message || 'Registration failed',
          code: auth0User.error || 'REGISTRATION_ERROR'
        };
      }

      // Map Auth0 user to our user model
      const user = await this.mapAuth0User(auth0User);

      this.log(`User registered successfully via Auth0: ${user.email}`, 'info', {
        userId: user.id,
        auth0Id: auth0User.user_id,
        ip: context.ip
      });

      return {
        success: true,
        user,
        requiresVerification: !auth0User.email_verified
      };

    } catch (error) {
      this.log(`Auth0 registration failed: ${error.message}`, 'error', {
        email: userData.email,
        ip: context.ip
      });

      return {
        success: false,
        error: 'Registration failed',
        code: 'REGISTRATION_ERROR'
      };
    }
  }

  async refresh(refreshToken, context = {}) {
    try {
      const response = await fetch(`https://${this.domain}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: refreshToken
        })
      });

      const tokenData = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: tokenData.error_description || 'Token refresh failed',
          code: tokenData.error || 'REFRESH_ERROR'
        };
      }

      return {
        success: true,
        tokens: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          tokenType: 'Bearer',
          expiresIn: tokenData.expires_in
        }
      };

    } catch (error) {
      this.log(`Auth0 token refresh failed: ${error.message}`, 'error', context);
      
      return {
        success: false,
        error: 'Token refresh failed',
        code: 'REFRESH_ERROR'
      };
    }
  }

  async logout(token, context = {}) {
    try {
      // Auth0 logout - revoke the token
      const response = await fetch(`https://${this.domain}/oauth/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          token: token
        })
      });

      // Auth0 revoke endpoint returns 200 even for invalid tokens
      this.log('User logged out via Auth0', 'info', context);

      return {
        success: true,
        message: 'Logged out successfully'
      };

    } catch (error) {
      this.log(`Auth0 logout error: ${error.message}`, 'error', context);
      
      return {
        success: false,
        error: 'Logout failed',
        code: 'LOGOUT_ERROR'
      };
    }
  }

  async validateToken(token, context = {}) {
    try {
      const decoded = await this.validateJWT(token);
      
      if (!decoded) {
        return {
          valid: false,
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        };
      }

      // Get fresh user data
      const userProfile = await this.getUserProfile(decoded.sub);
      
      if (!userProfile) {
        return {
          valid: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        };
      }

      const user = await this.mapAuth0User(userProfile, decoded);

      return {
        valid: true,
        user,
        decoded
      };

    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return {
          valid: false,
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        };
      } else if (error.name === 'JsonWebTokenError') {
        return {
          valid: false,
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        };
      }

      this.log(`Auth0 token validation error: ${error.message}`, 'error', context);
      
      return {
        valid: false,
        error: 'Token validation failed',
        code: 'VALIDATION_ERROR'
      };
    }
  }

  async getUser(userId) {
    try {
      // userId should be the Auth0 user ID (sub claim)
      const userProfile = await this.getUserProfile(userId);
      return userProfile ? await this.mapAuth0User(userProfile) : null;
    } catch (error) {
      this.log(`Error getting Auth0 user: ${error.message}`, 'error', { userId });
      return null;
    }
  }

  async updateUser(userId, updateData) {
    try {
      const managementToken = await this.getManagementToken();
      
      // Map update data to Auth0 user format
      const auth0UpdateData = {};
      
      if (updateData.firstName) auth0UpdateData.given_name = updateData.firstName;
      if (updateData.lastName) auth0UpdateData.family_name = updateData.lastName;
      if (updateData.firstName || updateData.lastName) {
        auth0UpdateData.name = `${updateData.firstName || ''} ${updateData.lastName || ''}`.trim();
      }
      
      // Update user metadata
      if (updateData.organizationId) {
        auth0UpdateData.user_metadata = {
          ...auth0UpdateData.user_metadata,
          organizationId: updateData.organizationId
        };
      }

      const response = await fetch(`https://${this.domain}/api/v2/users/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${managementToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(auth0UpdateData)
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Update failed',
          code: 'UPDATE_ERROR'
        };
      }

      const updatedUser = await response.json();
      const mappedUser = await this.mapAuth0User(updatedUser);

      return {
        success: true,
        user: mappedUser
      };

    } catch (error) {
      this.log(`Auth0 user update error: ${error.message}`, 'error', { userId });
      
      return {
        success: false,
        error: 'User update failed',
        code: 'UPDATE_ERROR'
      };
    }
  }

  async deleteUser(userId) {
    try {
      const managementToken = await this.getManagementToken();
      
      const response = await fetch(`https://${this.domain}/api/v2/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${managementToken}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Deletion failed',
          code: 'DELETE_ERROR'
        };
      }

      this.log(`Auth0 user deleted: ${userId}`, 'info');

      return {
        success: true,
        message: 'User deleted successfully'
      };

    } catch (error) {
      this.log(`Auth0 user deletion error: ${error.message}`, 'error', { userId });
      
      return {
        success: false,
        error: 'User deletion failed',
        code: 'DELETE_ERROR'
      };
    }
  }

  async resetPassword(email, context = {}) {
    try {
      const response = await fetch(`https://${this.domain}/dbconnections/change_password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: this.clientId,
          email: email,
          connection: this.connection
        })
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error_description || 'Password reset failed',
          code: error.error || 'RESET_ERROR'
        };
      }

      this.log(`Password reset initiated for: ${email}`, 'info', context);

      return {
        success: true,
        message: 'Password reset email sent'
      };

    } catch (error) {
      this.log(`Auth0 password reset error: ${error.message}`, 'error', { email });
      
      return {
        success: false,
        error: 'Password reset failed',
        code: 'RESET_ERROR'
      };
    }
  }

  async verifyEmail(token) {
    // Auth0 handles email verification through their own flow
    // This method is kept for interface compatibility
    return {
      success: false,
      error: 'Email verification handled by Auth0',
      code: 'NOT_SUPPORTED'
    };
  }

  // Auth0-specific methods

  async validateJWT(token) {
    return new Promise((resolve, reject) => {
      // Get the header to find the key ID
      const decoded = jwt.decode(token, { complete: true });
      
      if (!decoded || !decoded.header || !decoded.header.kid) {
        return reject(new Error('Invalid token structure'));
      }

      // Get the signing key
      this.jwksClient.getSigningKey(decoded.header.kid, (err, key) => {
        if (err) {
          return reject(err);
        }

        const signingKey = key.getPublicKey();

        // Verify the token
        jwt.verify(token, signingKey, {
          audience: this.audience,
          issuer: `https://${this.domain}/`,
          algorithms: ['RS256'],
          clockTolerance: this.leeway
        }, (err, decoded) => {
          if (err) {
            return reject(err);
          }
          resolve(decoded);
        });
      });
    });
  }

  async getJwksKey(kid) {
    return new Promise((resolve, reject) => {
      this.jwksClient.getSigningKey(kid, (err, key) => {
        if (err) {
          return reject(err);
        }
        resolve(key.getPublicKey());
      });
    });
  }

  async getManagementToken() {
    // Check if we have a valid cached token
    if (this.managementToken && this.managementTokenExpiry > Date.now()) {
      return this.managementToken;
    }

    try {
      const response = await fetch(`https://${this.domain}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          audience: `https://${this.domain}/api/v2/`,
          grant_type: 'client_credentials'
        })
      });

      const tokenData = await response.json();

      if (!response.ok) {
        throw new Error(tokenData.error_description || 'Failed to get management token');
      }

      // Cache the token with a safety margin
      this.managementToken = tokenData.access_token;
      this.managementTokenExpiry = Date.now() + ((tokenData.expires_in - 60) * 1000);

      return this.managementToken;

    } catch (error) {
      this.log(`Failed to get Auth0 management token: ${error.message}`, 'error');
      throw error;
    }
  }

  async getUserProfile(userId) {
    try {
      const managementToken = await this.getManagementToken();
      
      const response = await fetch(`https://${this.domain}/api/v2/users/${encodeURIComponent(userId)}`, {
        headers: {
          'Authorization': `Bearer ${managementToken}`
        }
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();

    } catch (error) {
      this.log(`Error fetching Auth0 user profile: ${error.message}`, 'error', { userId });
      return null;
    }
  }

  async mapAuth0User(auth0User, jwtPayload = {}) {
    return {
      id: auth0User.user_id,
      email: auth0User.email,
      firstName: auth0User.given_name || '',
      lastName: auth0User.family_name || '',
      name: auth0User.name || '',
      isActive: !auth0User.blocked,
      emailVerified: auth0User.email_verified,
      createdAt: auth0User.created_at,
      updatedAt: auth0User.updated_at,
      lastLogin: auth0User.last_login,
      loginCount: auth0User.logins_count || 0,
      roles: this.extractRoles(auth0User, jwtPayload),
      organizationId: auth0User.user_metadata?.organizationId || jwtPayload.org_id,
      provider: 'auth0',
      providerData: {
        auth0Id: auth0User.user_id,
        picture: auth0User.picture,
        locale: auth0User.locale,
        identities: auth0User.identities
      }
    };
  }

  extractRoles(auth0User, jwtPayload = {}) {
    // Extract roles from Auth0 app_metadata, user_metadata, or JWT claims
    const roles = [];
    
    // Check app_metadata for roles
    if (auth0User.app_metadata?.roles) {
      roles.push(...auth0User.app_metadata.roles);
    }
    
    // Check JWT payload for roles (custom claims)
    if (jwtPayload['https://tala.ai/roles']) {
      roles.push(...jwtPayload['https://tala.ai/roles']);
    }
    
    // Check for organization roles
    if (jwtPayload.org_roles) {
      roles.push(...jwtPayload.org_roles);
    }
    
    // Default role if no roles found
    if (roles.length === 0) {
      roles.push('CLIENT');
    }
    
    return [...new Set(roles)]; // Remove duplicates
  }

  getHealthStatus() {
    return {
      ...super.getHealthStatus(),
      domain: this.domain,
      jwksUri: `https://${this.domain}/.well-known/jwks.json`,
      managementTokenCached: !!this.managementToken
    };
  }

  getConfig() {
    const config = super.getConfig();
    return {
      ...config,
      domain: this.domain,
      clientId: this.clientId,
      audience: this.audience,
      scope: this.scope,
      connection: this.connection
    };
  }
}

export default Auth0Provider;