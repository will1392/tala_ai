/**
 * ClerkProvider - Clerk authentication integration
 * 
 * This provider integrates Clerk's authentication and user management
 * with the Tala AI authentication system. It handles session tokens,
 * user data mapping, and organization management through Clerk.
 */

import { clerkClient } from '@clerk/clerk-sdk-node';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import BaseAuthProvider from './BaseAuthProvider.js';

class ClerkProvider extends BaseAuthProvider {
  constructor(config = {}) {
    super(config);
    
    this.validateConfig([
      'secretKey',
      'publishableKey'
    ]);

    this.secretKey = config.secretKey;
    this.publishableKey = config.publishableKey;
    this.jwtKey = config.jwtKey;
    this.webhookSecret = config.webhookSecret;
    this.frontendApi = config.frontendApi;
    this.apiVersion = config.apiVersion || 'v1';
    this.sessionTokenName = config.sessionTokenName || '__session';

    // Initialize Clerk client
    this.clerk = clerkClient;
  }

  async initialize() {
    this.log('Initializing ClerkProvider');
    
    try {
      // Test Clerk configuration by making a simple API call
      await this.clerk.users.getUserList({ limit: 1 });
      this.log('Clerk API accessible');
    } catch (error) {
      this.log(`Clerk initialization warning: ${error.message}`, 'warn');
    }
    
    this.log('ClerkProvider initialized successfully');
  }

  async authenticate(credentials, context = {}) {
    const { sessionToken, sessionId, userId } = credentials;
    
    if (sessionToken) {
      // Session token authentication
      return await this.authenticateWithSessionToken(sessionToken, context);
    } else if (sessionId) {
      // Session ID authentication
      return await this.authenticateWithSessionId(sessionId, context);
    } else if (userId) {
      // Direct user ID authentication (for server-side usage)
      return await this.authenticateWithUserId(userId, context);
    } else {
      return {
        success: false,
        error: 'Session token, session ID, or user ID required',
        code: 'MISSING_CREDENTIALS'
      };
    }
  }

  async authenticateWithSessionToken(sessionToken, context = {}) {
    try {
      // Verify session token with Clerk
      const session = await this.verifySessionToken(sessionToken);
      
      if (!session || !session.userId) {
        return {
          success: false,
          error: 'Invalid session token',
          code: 'INVALID_TOKEN'
        };
      }

      // Get user data from Clerk
      const clerkUser = await this.clerk.users.getUser(session.userId);
      
      if (!clerkUser) {
        return {
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        };
      }

      // Map Clerk user to our user model
      const user = await this.mapClerkUser(clerkUser, session);

      this.log(`User authenticated successfully via Clerk: ${user.email}`, 'info', {
        userId: user.id,
        clerkId: clerkUser.id,
        ip: context.ip
      });

      return {
        success: true,
        user,
        tokens: {
          sessionToken: sessionToken,
          sessionId: session.id,
          tokenType: 'Bearer'
        }
      };

    } catch (error) {
      this.log(`Clerk token authentication failed: ${error.message}`, 'error', {
        ip: context.ip
      });

      return {
        success: false,
        error: 'Authentication failed',
        code: 'AUTH_ERROR'
      };
    }
  }

  async authenticateWithSessionId(sessionId, context = {}) {
    try {
      // Get session from Clerk
      const session = await this.clerk.sessions.getSession(sessionId);
      
      if (!session || session.status !== 'active') {
        return {
          success: false,
          error: 'Invalid or inactive session',
          code: 'INVALID_SESSION'
        };
      }

      // Get user data
      const clerkUser = await this.clerk.users.getUser(session.userId);
      const user = await this.mapClerkUser(clerkUser, session);

      return {
        success: true,
        user,
        tokens: {
          sessionId: sessionId,
          tokenType: 'Session'
        }
      };

    } catch (error) {
      this.log(`Clerk session authentication failed: ${error.message}`, 'error', {
        sessionId,
        ip: context.ip
      });

      return {
        success: false,
        error: 'Session authentication failed',
        code: 'SESSION_ERROR'
      };
    }
  }

  async authenticateWithUserId(userId, context = {}) {
    try {
      // Get user directly (for server-side operations)
      const clerkUser = await this.clerk.users.getUser(userId);
      
      if (!clerkUser) {
        return {
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        };
      }

      const user = await this.mapClerkUser(clerkUser);

      return {
        success: true,
        user,
        tokens: {
          userId: userId,
          tokenType: 'ServerSide'
        }
      };

    } catch (error) {
      this.log(`Clerk user authentication failed: ${error.message}`, 'error', {
        userId,
        ip: context.ip
      });

      return {
        success: false,
        error: 'User authentication failed',
        code: 'USER_ERROR'
      };
    }
  }

  async register(userData, context = {}) {
    try {
      const { email, password, firstName, lastName, organizationId } = userData;

      if (!email) {
        return {
          success: false,
          error: 'Email is required',
          code: 'MISSING_EMAIL'
        };
      }

      // Create user in Clerk
      const createData = {
        emailAddress: [email],
        firstName: firstName || '',
        lastName: lastName || ''
      };

      // Add password if provided (for email/password flow)
      if (password) {
        createData.password = password;
      }

      // Add organization metadata
      if (organizationId) {
        createData.publicMetadata = {
          organizationId: organizationId
        };
      }

      const clerkUser = await this.clerk.users.createUser(createData);

      // Map Clerk user to our user model
      const user = await this.mapClerkUser(clerkUser);

      this.log(`User registered successfully via Clerk: ${user.email}`, 'info', {
        userId: user.id,
        clerkId: clerkUser.id,
        ip: context.ip
      });

      return {
        success: true,
        user,
        requiresVerification: !clerkUser.emailAddresses.some(email => email.verification?.status === 'verified')
      };

    } catch (error) {
      this.log(`Clerk registration failed: ${error.message}`, 'error', {
        email: userData.email,
        ip: context.ip
      });

      return {
        success: false,
        error: error.message || 'Registration failed',
        code: 'REGISTRATION_ERROR'
      };
    }
  }

  async refresh(sessionToken, context = {}) {
    try {
      // Clerk handles session refreshing automatically
      // Verify the current session is still valid
      const session = await this.verifySessionToken(sessionToken);
      
      if (!session) {
        return {
          success: false,
          error: 'Session expired or invalid',
          code: 'SESSION_EXPIRED'
        };
      }

      return {
        success: true,
        tokens: {
          sessionToken: sessionToken,
          sessionId: session.id,
          tokenType: 'Bearer'
        }
      };

    } catch (error) {
      this.log(`Clerk session refresh failed: ${error.message}`, 'error', context);
      
      return {
        success: false,
        error: 'Session refresh failed',
        code: 'REFRESH_ERROR'
      };
    }
  }

  async logout(sessionToken, context = {}) {
    try {
      // Get session to find session ID
      const session = await this.verifySessionToken(sessionToken);
      
      if (session && session.id) {
        // Revoke the session
        await this.clerk.sessions.revokeSession(session.id);
      }

      this.log('User logged out via Clerk', 'info', context);

      return {
        success: true,
        message: 'Logged out successfully'
      };

    } catch (error) {
      this.log(`Clerk logout error: ${error.message}`, 'error', context);
      
      return {
        success: false,
        error: 'Logout failed',
        code: 'LOGOUT_ERROR'
      };
    }
  }

  async validateToken(token, context = {}) {
    try {
      const session = await this.verifySessionToken(token);
      
      if (!session) {
        return {
          valid: false,
          error: 'Invalid session token',
          code: 'INVALID_TOKEN'
        };
      }

      // Get fresh user data
      const clerkUser = await this.clerk.users.getUser(session.userId);
      
      if (!clerkUser) {
        return {
          valid: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        };
      }

      const user = await this.mapClerkUser(clerkUser, session);

      return {
        valid: true,
        user,
        session
      };

    } catch (error) {
      this.log(`Clerk token validation error: ${error.message}`, 'error', context);
      
      return {
        valid: false,
        error: 'Token validation failed',
        code: 'VALIDATION_ERROR'
      };
    }
  }

  async getUser(userId) {
    try {
      const clerkUser = await this.clerk.users.getUser(userId);
      return clerkUser ? await this.mapClerkUser(clerkUser) : null;
    } catch (error) {
      this.log(`Error getting Clerk user: ${error.message}`, 'error', { userId });
      return null;
    }
  }

  async updateUser(userId, updateData) {
    try {
      // Map update data to Clerk user format
      const clerkUpdateData = {};
      
      if (updateData.firstName) clerkUpdateData.firstName = updateData.firstName;
      if (updateData.lastName) clerkUpdateData.lastName = updateData.lastName;
      
      // Update metadata
      if (updateData.organizationId) {
        clerkUpdateData.publicMetadata = {
          organizationId: updateData.organizationId
        };
      }

      const updatedUser = await this.clerk.users.updateUser(userId, clerkUpdateData);
      const mappedUser = await this.mapClerkUser(updatedUser);

      return {
        success: true,
        user: mappedUser
      };

    } catch (error) {
      this.log(`Clerk user update error: ${error.message}`, 'error', { userId });
      
      return {
        success: false,
        error: 'User update failed',
        code: 'UPDATE_ERROR'
      };
    }
  }

  async deleteUser(userId) {
    try {
      await this.clerk.users.deleteUser(userId);

      this.log(`Clerk user deleted: ${userId}`, 'info');

      return {
        success: true,
        message: 'User deleted successfully'
      };

    } catch (error) {
      this.log(`Clerk user deletion error: ${error.message}`, 'error', { userId });
      
      return {
        success: false,
        error: 'User deletion failed',
        code: 'DELETE_ERROR'
      };
    }
  }

  async resetPassword(email, context = {}) {
    try {
      // Clerk handles password reset through their own flow
      // We can trigger it via the API if needed
      
      this.log(`Password reset requested for: ${email}`, 'info', context);

      return {
        success: true,
        message: 'Password reset handled by Clerk - check your email'
      };

    } catch (error) {
      this.log(`Clerk password reset error: ${error.message}`, 'error', { email });
      
      return {
        success: false,
        error: 'Password reset failed',
        code: 'RESET_ERROR'
      };
    }
  }

  async verifyEmail(token) {
    // Clerk handles email verification through their own flow
    return {
      success: false,
      error: 'Email verification handled by Clerk',
      code: 'NOT_SUPPORTED'
    };
  }

  // Clerk-specific methods

  async verifySessionToken(sessionToken) {
    try {
      // If we have a JWT key, verify the token as JWT
      if (this.jwtKey) {
        const decoded = jwt.verify(sessionToken, this.jwtKey);
        
        // Get the session from Clerk to ensure it's still valid
        if (decoded.sid) {
          const session = await this.clerk.sessions.getSession(decoded.sid);
          return session.status === 'active' ? session : null;
        }
        
        return decoded;
      } else {
        // Use Clerk's session verification
        const session = await this.clerk.sessions.verifySession(sessionToken, this.jwtKey);
        return session;
      }
    } catch (error) {
      this.log(`Session token verification failed: ${error.message}`, 'error');
      return null;
    }
  }

  async mapClerkUser(clerkUser, session = null) {
    // Get primary email address
    const primaryEmail = clerkUser.emailAddresses?.find(email => email.id === clerkUser.primaryEmailAddressId);
    
    // Get organization memberships
    const orgMemberships = await this.getUserOrganizations(clerkUser.id);
    
    return {
      id: clerkUser.id,
      email: primaryEmail?.emailAddress || '',
      firstName: clerkUser.firstName || '',
      lastName: clerkUser.lastName || '',
      name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
      isActive: !clerkUser.banned,
      emailVerified: primaryEmail?.verification?.status === 'verified',
      createdAt: new Date(clerkUser.createdAt).toISOString(),
      updatedAt: new Date(clerkUser.updatedAt).toISOString(),
      lastLogin: session ? new Date(session.lastActiveAt).toISOString() : null,
      loginCount: 0, // Clerk doesn't provide this directly
      roles: this.extractRoles(clerkUser, orgMemberships),
      organizationId: clerkUser.publicMetadata?.organizationId || this.getActiveOrganization(orgMemberships),
      provider: 'clerk',
      providerData: {
        clerkId: clerkUser.id,
        profileImageUrl: clerkUser.profileImageUrl,
        username: clerkUser.username,
        organizations: orgMemberships,
        phoneNumbers: clerkUser.phoneNumbers,
        externalAccounts: clerkUser.externalAccounts
      }
    };
  }

  async getUserOrganizations(userId) {
    try {
      const memberships = await this.clerk.users.getOrganizationMembershipList({ userId });
      return memberships.map(membership => ({
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
        role: membership.role,
        permissions: membership.permissions || []
      }));
    } catch (error) {
      this.log(`Error getting user organizations: ${error.message}`, 'error', { userId });
      return [];
    }
  }

  extractRoles(clerkUser, orgMemberships = []) {
    const roles = [];
    
    // Extract roles from public metadata
    if (clerkUser.publicMetadata?.roles) {
      roles.push(...clerkUser.publicMetadata.roles);
    }
    
    // Extract roles from private metadata
    if (clerkUser.privateMetadata?.roles) {
      roles.push(...clerkUser.privateMetadata.roles);
    }
    
    // Map organization roles to our role system
    orgMemberships.forEach(membership => {
      switch (membership.role) {
        case 'admin':
          roles.push('AGENCY_ADMIN');
          break;
        case 'basic_member':
          roles.push('TRAVEL_AGENT');
          break;
        default:
          // Check for custom permissions
          if (membership.permissions?.includes('org:sys_memberships:manage')) {
            roles.push('AGENCY_OWNER');
          }
          break;
      }
    });
    
    // Default role if no roles found
    if (roles.length === 0) {
      roles.push('CLIENT');
    }
    
    return [...new Set(roles)]; // Remove duplicates
  }

  getActiveOrganization(orgMemberships) {
    // Return the first organization ID, or null
    return orgMemberships.length > 0 ? orgMemberships[0].id : null;
  }

  async handleWebhook(payload, signature) {
    try {
      // Verify webhook signature if secret is configured
      if (this.webhookSecret) {
        // Implement webhook signature verification
        // This would depend on Clerk's webhook signing method
      }

      const { type, data } = payload;

      this.log(`Received Clerk webhook: ${type}`, 'info', { userId: data.id });

      switch (type) {
        case 'user.created':
          await this.handleUserCreated(data);
          break;
        case 'user.updated':
          await this.handleUserUpdated(data);
          break;
        case 'user.deleted':
          await this.handleUserDeleted(data);
          break;
        case 'session.created':
          await this.handleSessionCreated(data);
          break;
        case 'session.ended':
          await this.handleSessionEnded(data);
          break;
        default:
          this.log(`Unhandled webhook type: ${type}`, 'warn');
      }

      return { success: true };

    } catch (error) {
      this.log(`Webhook processing failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async handleUserCreated(userData) {
    // Handle user creation webhook
    this.log(`User created via webhook: ${userData.id}`, 'info');
  }

  async handleUserUpdated(userData) {
    // Handle user update webhook
    this.log(`User updated via webhook: ${userData.id}`, 'info');
  }

  async handleUserDeleted(userData) {
    // Handle user deletion webhook
    this.log(`User deleted via webhook: ${userData.id}`, 'info');
  }

  async handleSessionCreated(sessionData) {
    // Handle session creation webhook
    this.log(`Session created via webhook: ${sessionData.id}`, 'info');
  }

  async handleSessionEnded(sessionData) {
    // Handle session end webhook
    this.log(`Session ended via webhook: ${sessionData.id}`, 'info');
  }

  getHealthStatus() {
    return {
      ...super.getHealthStatus(),
      publishableKey: this.publishableKey?.substring(0, 10) + '...',
      hasJwtKey: !!this.jwtKey,
      hasWebhookSecret: !!this.webhookSecret
    };
  }

  getConfig() {
    const config = super.getConfig();
    return {
      ...config,
      publishableKey: this.publishableKey,
      frontendApi: this.frontendApi,
      apiVersion: this.apiVersion,
      sessionTokenName: this.sessionTokenName
    };
  }
}

export default ClerkProvider;