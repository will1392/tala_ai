/**
 * Basic Authentication Manager for Tala AI
 * Provides JWT token validation and session management
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export class AuthManager {
  constructor() {
    this.initialized = false;
    this.jwtSecret = process.env.JWT_SECRET || 'dev-secret-key';
    this.jwtIssuer = process.env.JWT_ISSUER || 'tala-ai';
    this.jwtAudience = process.env.JWT_AUDIENCE || 'tala-ai-users';
    this.sessions = new Map(); // In-memory sessions for development
  }

  async initialize() {
    if (this.initialized) return;
    console.log('🔐 Initializing AuthManager...');
    this.initialized = true;
  }

  /**
   * Create a JWT token
   */
  async createJWT(payload, options = {}) {
    const tokenPayload = {
      ...payload,
      iss: this.jwtIssuer,
      aud: this.jwtAudience,
      iat: Math.floor(Date.now() / 1000)
    };

    const tokenOptions = {
      expiresIn: options.expiresIn || process.env.JWT_EXPIRES_IN || '24h',
      ...options
    };

    return jwt.sign(tokenPayload, this.jwtSecret, tokenOptions);
  }

  /**
   * Validate a JWT token
   */
  async validateJWT(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: this.jwtIssuer,
        audience: this.jwtAudience
      });

      return {
        success: true,
        decoded,
        userId: decoded.userId,
        organizationId: decoded.organizationId,
        role: decoded.role
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a session
   */
  async createSession(sessionData) {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const session = {
      id: sessionId,
      ...sessionData,
      createdAt: new Date(),
      lastAccessedAt: new Date()
    };

    this.sessions.set(sessionId, session);
    return sessionId;
  }

  /**
   * Validate a session
   */
  async validateSession(sessionId) {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    // Update last accessed time
    session.lastAccessedAt = new Date();
    this.sessions.set(sessionId, session);

    return {
      success: true,
      session,
      userId: session.userId,
      organizationId: session.organizationId
    };
  }

  /**
   * Destroy a session
   */
  async destroySession(sessionId) {
    return this.sessions.delete(sessionId);
  }

  /**
   * Mock authentication for development
   */
  async mockAuthenticate(email, password, provider = 'mock') {
    if (provider === 'mock') {
      // Simple mock authentication
      const mockUser = {
        id: `mock-user-${crypto.randomBytes(8).toString('hex')}`,
        email: email,
        display_name: email.split('@')[0],
        organization_id: 'mock-org-123',
        role: 'member'
      };

      const token = await this.createJWT({
        userId: mockUser.id,
        organizationId: mockUser.organization_id,
        role: mockUser.role,
        email: mockUser.email
      });

      return {
        success: true,
        user: mockUser,
        token,
        authMethod: 'mock'
      };
    }

    return { success: false, error: 'Invalid provider' };
  }
}

export default AuthManager;