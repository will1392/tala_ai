/**
 * MockAuthProvider - Mock authentication for development and testing
 * 
 * This provider simulates authentication functionality for development
 * and testing purposes. It maintains the current mock functionality
 * while providing a complete BaseAuthProvider implementation.
 */

import crypto from 'crypto';
import BaseAuthProvider from './BaseAuthProvider.js';

class MockAuthProvider extends BaseAuthProvider {
  constructor(config = {}) {
    super(config);
    
    // Mock users database
    this.users = new Map();
    this.sessions = new Map();
    this.refreshTokens = new Map();
    
    // Configuration
    this.tokenExpiry = config.tokenExpiry || 3600; // 1 hour in seconds
    this.enableLogging = config.enableLogging !== false;
    this.simulateLatency = config.simulateLatency || false;
    this.latencyMs = config.latencyMs || 100;
    this.failureRate = config.failureRate || 0; // 0-1, probability of random failures
    
    // Pre-populate with default users
    this.createDefaultUsers();
  }

  async initialize() {
    this.log('Initializing MockAuthProvider');
    
    if (this.simulateLatency) {
      await this.delay(this.latencyMs);
    }
    
    this.log('MockAuthProvider initialized successfully');
  }

  async authenticate(credentials, context = {}) {
    if (this.simulateLatency) {
      await this.delay(this.latencyMs);
    }
    
    // Simulate random failures if configured
    if (this.shouldSimulateFailure()) {
      return {
        success: false,
        error: 'Simulated authentication failure',
        code: 'MOCK_FAILURE'
      };
    }
    
    const { email, password, token, userId } = credentials;
    
    if (token) {
      // Token authentication
      return await this.authenticateWithToken(token, context);
    } else if (userId) {
      // Direct user ID authentication (for testing)
      return await this.authenticateWithUserId(userId, context);
    } else if (email && password) {
      // Email/password authentication
      return await this.authenticateWithPassword(email, password, context);
    } else {
      return {
        success: false,
        error: 'Email/password, token, or userId required',
        code: 'MISSING_CREDENTIALS'
      };
    }
  }

  async authenticateWithPassword(email, password, context = {}) {
    const user = this.findUserByEmail(email);
    
    if (!user) {
      return {
        success: false,
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      };
    }
    
    if (!user.isActive) {
      return {
        success: false,
        error: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      };
    }
    
    // Simple password check (in real implementation, use bcrypt)
    if (user.password !== password) {
      return {
        success: false,
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      };
    }
    
    // Generate mock tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);
    
    // Update user login info
    user.lastLogin = new Date().toISOString();
    user.loginCount = (user.loginCount || 0) + 1;
    
    this.log(`User authenticated successfully: ${user.email}`, 'info', {
      userId: user.id,
      ip: context.ip
    });
    
    return {
      success: true,
      user: this.sanitizeUser(user),
      tokens: {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: this.tokenExpiry
      }
    };
  }

  async authenticateWithToken(token, context = {}) {
    try {
      const session = this.sessions.get(token);
      
      if (!session) {
        return {
          success: false,
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        };
      }
      
      // Check if token is expired
      if (new Date() > new Date(session.expiresAt)) {
        this.sessions.delete(token);
        return {
          success: false,
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        };
      }
      
      const user = this.users.get(session.userId);
      
      if (!user || !user.isActive) {
        return {
          success: false,
          error: 'User not found or inactive',
          code: 'USER_NOT_FOUND'
        };
      }
      
      return {
        success: true,
        user: this.sanitizeUser(user),
        tokens: {
          accessToken: token,
          tokenType: 'Bearer',
          expiresIn: Math.floor((new Date(session.expiresAt) - new Date()) / 1000)
        }
      };
      
    } catch (error) {
      this.log(`Token authentication error: ${error.message}`, 'error', context);
      
      return {
        success: false,
        error: 'Authentication failed',
        code: 'AUTH_ERROR'
      };
    }
  }

  async authenticateWithUserId(userId, context = {}) {
    const user = this.users.get(userId);
    
    if (!user) {
      return {
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      };
    }
    
    if (!user.isActive) {
      return {
        success: false,
        error: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      };
    }
    
    // Generate mock token
    const accessToken = this.generateAccessToken(user);
    
    return {
      success: true,
      user: this.sanitizeUser(user),
      tokens: {
        accessToken,
        tokenType: 'Bearer',
        expiresIn: this.tokenExpiry
      }
    };
  }

  async register(userData, context = {}) {
    if (this.simulateLatency) {
      await this.delay(this.latencyMs);
    }
    
    const { email, password, firstName, lastName, role, organizationId } = userData;
    
    if (!email || !password) {
      return {
        success: false,
        error: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      };
    }
    
    // Check if user already exists
    if (this.findUserByEmail(email)) {
      return {
        success: false,
        error: 'User already exists with this email',
        code: 'USER_EXISTS'
      };
    }
    
    // Create new user
    const user = {
      id: `mock-user-${crypto.randomUUID()}`,
      email: email.toLowerCase(),
      password: password, // In real implementation, hash this
      firstName: firstName || '',
      lastName: lastName || '',
      name: `${firstName || ''} ${lastName || ''}`.trim(),
      isActive: true,
      emailVerified: true, // Mock always verified
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLogin: null,
      loginCount: 0,
      roles: role ? [role] : ['CLIENT'],
      organizationId: organizationId || null,
      provider: 'mock',
      providerData: {
        mockId: `mock-user-${crypto.randomUUID()}`,
        createdVia: 'registration'
      }
    };
    
    this.users.set(user.id, user);
    
    this.log(`User registered successfully: ${user.email}`, 'info', {
      userId: user.id,
      ip: context.ip
    });
    
    return {
      success: true,
      user: this.sanitizeUser(user),
      requiresVerification: false // Mock doesn't require verification
    };
  }

  async refresh(refreshToken, context = {}) {
    if (this.simulateLatency) {
      await this.delay(this.latencyMs);
    }
    
    try {
      const tokenData = this.refreshTokens.get(refreshToken);
      
      if (!tokenData) {
        return {
          success: false,
          error: 'Invalid refresh token',
          code: 'INVALID_REFRESH_TOKEN'
        };
      }
      
      // Check if token is expired
      if (new Date() > new Date(tokenData.expiresAt)) {
        this.refreshTokens.delete(refreshToken);
        return {
          success: false,
          error: 'Refresh token expired',
          code: 'REFRESH_TOKEN_EXPIRED'
        };
      }
      
      const user = this.users.get(tokenData.userId);
      
      if (!user || !user.isActive) {
        return {
          success: false,
          error: 'User not found or inactive',
          code: 'USER_NOT_FOUND'
        };
      }
      
      // Generate new tokens
      const newAccessToken = this.generateAccessToken(user);
      const newRefreshToken = this.generateRefreshToken(user);
      
      // Remove old refresh token
      this.refreshTokens.delete(refreshToken);
      
      return {
        success: true,
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          tokenType: 'Bearer',
          expiresIn: this.tokenExpiry
        }
      };
      
    } catch (error) {
      this.log(`Token refresh error: ${error.message}`, 'error', context);
      
      return {
        success: false,
        error: 'Token refresh failed',
        code: 'REFRESH_ERROR'
      };
    }
  }

  async logout(token, context = {}) {
    try {
      // Remove session
      const session = this.sessions.get(token);
      if (session) {
        this.sessions.delete(token);
        
        // Remove associated refresh tokens
        for (const [refreshToken, tokenData] of this.refreshTokens.entries()) {
          if (tokenData.userId === session.userId) {
            this.refreshTokens.delete(refreshToken);
          }
        }
        
        this.log(`User logged out: ${session.userId}`, 'info', context);
      }
      
      return {
        success: true,
        message: 'Logged out successfully'
      };
      
    } catch (error) {
      this.log(`Logout error: ${error.message}`, 'error', context);
      
      return {
        success: false,
        error: 'Logout failed',
        code: 'LOGOUT_ERROR'
      };
    }
  }

  async validateToken(token, context = {}) {
    try {
      const session = this.sessions.get(token);
      
      if (!session) {
        return {
          valid: false,
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        };
      }
      
      // Check if token is expired
      if (new Date() > new Date(session.expiresAt)) {
        this.sessions.delete(token);
        return {
          valid: false,
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        };
      }
      
      const user = this.users.get(session.userId);
      
      if (!user || !user.isActive) {
        return {
          valid: false,
          error: 'User not found or inactive',
          code: 'USER_NOT_FOUND'
        };
      }
      
      return {
        valid: true,
        user: this.sanitizeUser(user),
        session
      };
      
    } catch (error) {
      this.log(`Token validation error: ${error.message}`, 'error', context);
      
      return {
        valid: false,
        error: 'Token validation failed',
        code: 'VALIDATION_ERROR'
      };
    }
  }

  async getUser(userId) {
    const user = this.users.get(userId);
    return user ? this.sanitizeUser(user) : null;
  }

  async updateUser(userId, updateData) {
    const user = this.users.get(userId);
    
    if (!user) {
      return {
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      };
    }
    
    try {
      // Update user data
      Object.assign(user, updateData, {
        updatedAt: new Date().toISOString()
      });
      
      return {
        success: true,
        user: this.sanitizeUser(user)
      };
      
    } catch (error) {
      this.log(`User update error: ${error.message}`, 'error', { userId });
      
      return {
        success: false,
        error: 'User update failed',
        code: 'UPDATE_ERROR'
      };
    }
  }

  async deleteUser(userId) {
    const user = this.users.get(userId);
    
    if (!user) {
      return {
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      };
    }
    
    // Remove user and related data
    this.users.delete(userId);
    
    // Remove sessions
    for (const [token, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(token);
      }
    }
    
    // Remove refresh tokens
    for (const [refreshToken, tokenData] of this.refreshTokens.entries()) {
      if (tokenData.userId === userId) {
        this.refreshTokens.delete(refreshToken);
      }
    }
    
    this.log(`User deleted: ${userId}`, 'info');
    
    return {
      success: true,
      message: 'User deleted successfully'
    };
  }

  async resetPassword(email, context = {}) {
    const user = this.findUserByEmail(email);
    
    if (!user) {
      // Don't reveal if email exists (security best practice)
      return {
        success: true,
        message: 'If the email exists, a reset link has been sent'
      };
    }
    
    // Generate mock reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    this.log(`Password reset requested: ${user.email}`, 'info', {
      userId: user.id,
      resetToken,
      ip: context.ip
    });
    
    return {
      success: true,
      resetToken,
      message: 'Password reset token generated (mock)'
    };
  }

  async verifyEmail(token) {
    // Mock email verification - always succeeds
    this.log('Email verification requested (mock)', 'info', { token });
    
    return {
      success: true,
      message: 'Email verified successfully (mock)'
    };
  }

  // Mock-specific methods

  generateAccessToken(user) {
    const token = `mock-access-${crypto.randomBytes(32).toString('hex')}`;
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + this.tokenExpiry);
    
    // Store session
    this.sessions.set(token, {
      userId: user.id,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      lastActivity: new Date().toISOString()
    });
    
    return token;
  }

  generateRefreshToken(user) {
    const refreshToken = `mock-refresh-${crypto.randomBytes(32).toString('hex')}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    
    // Store refresh token
    this.refreshTokens.set(refreshToken, {
      userId: user.id,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString()
    });
    
    return refreshToken;
  }

  findUserByEmail(email) {
    for (const user of this.users.values()) {
      if (user.email === email.toLowerCase()) {
        return user;
      }
    }
    return null;
  }

  sanitizeUser(user) {
    const { password, ...sanitized } = user;
    return sanitized;
  }

  createDefaultUsers() {
    // Default admin user
    const admin = {
      id: 'mock-admin-1',
      email: 'admin@tala.ai',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'User',
      name: 'Admin User',
      isActive: true,
      emailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLogin: null,
      loginCount: 0,
      roles: ['SUPER_ADMIN'],
      organizationId: 'mock-org-1',
      provider: 'mock',
      providerData: {
        mockId: 'mock-admin-1',
        isDefault: true
      }
    };
    
    // Default agency owner
    const owner = {
      id: 'mock-owner-1',
      email: 'owner@agency.com',
      password: 'owner123',
      firstName: 'Agency',
      lastName: 'Owner',
      name: 'Agency Owner',
      isActive: true,
      emailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLogin: null,
      loginCount: 0,
      roles: ['AGENCY_OWNER'],
      organizationId: 'mock-org-1',
      provider: 'mock',
      providerData: {
        mockId: 'mock-owner-1',
        isDefault: true
      }
    };
    
    // Default travel agent
    const agent = {
      id: 'mock-agent-1',
      email: 'agent@agency.com',
      password: 'agent123',
      firstName: 'Travel',
      lastName: 'Agent',
      name: 'Travel Agent',
      isActive: true,
      emailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLogin: null,
      loginCount: 0,
      roles: ['TRAVEL_AGENT'],
      organizationId: 'mock-org-1',
      provider: 'mock',
      providerData: {
        mockId: 'mock-agent-1',
        isDefault: true
      }
    };
    
    // Default client
    const client = {
      id: 'mock-client-1',
      email: 'client@example.com',
      password: 'client123',
      firstName: 'Test',
      lastName: 'Client',
      name: 'Test Client',
      isActive: true,
      emailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLogin: null,
      loginCount: 0,
      roles: ['CLIENT'],
      organizationId: null,
      provider: 'mock',
      providerData: {
        mockId: 'mock-client-1',
        isDefault: true
      }
    };
    
    // Add users to mock database
    this.users.set(admin.id, admin);
    this.users.set(owner.id, owner);
    this.users.set(agent.id, agent);
    this.users.set(client.id, client);
    
    this.log(`Created ${this.users.size} default mock users`);
  }

  // Test utilities

  async simulateRole(userId, roles) {
    const user = this.users.get(userId);
    if (user) {
      user.roles = Array.isArray(roles) ? roles : [roles];
      user.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  async simulateOrganization(userId, organizationId) {
    const user = this.users.get(userId);
    if (user) {
      user.organizationId = organizationId;
      user.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  async simulateDeactivation(userId) {
    const user = this.users.get(userId);
    if (user) {
      user.isActive = false;
      user.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  shouldSimulateFailure() {
    return Math.random() < this.failureRate;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getHealthStatus() {
    return {
      ...super.getHealthStatus(),
      userCount: this.users.size,
      activeSessions: this.sessions.size,
      activeRefreshTokens: this.refreshTokens.size,
      simulateLatency: this.simulateLatency,
      failureRate: this.failureRate
    };
  }

  getConfig() {
    const config = super.getConfig();
    return {
      ...config,
      tokenExpiry: this.tokenExpiry,
      simulateLatency: this.simulateLatency,
      latencyMs: this.latencyMs,
      failureRate: this.failureRate
    };
  }

  // Development utilities

  getAllUsers() {
    return Array.from(this.users.values()).map(user => this.sanitizeUser(user));
  }

  getAllSessions() {
    return Array.from(this.sessions.entries()).map(([token, session]) => ({
      token: token.substring(0, 20) + '...',
      ...session
    }));
  }

  clearAllSessions() {
    this.sessions.clear();
    this.refreshTokens.clear();
    this.log('All sessions cleared');
  }

  reset() {
    this.users.clear();
    this.sessions.clear();
    this.refreshTokens.clear();
    this.createDefaultUsers();
    this.log('Mock provider reset to default state');
  }
}

export default MockAuthProvider;