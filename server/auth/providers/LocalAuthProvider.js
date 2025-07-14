/**
 * LocalAuthProvider - Local email/password authentication
 * 
 * Implements email/password authentication with JWT tokens,
 * password hashing, and session management.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import BaseAuthProvider from './BaseAuthProvider.js';

class LocalAuthProvider extends BaseAuthProvider {
  constructor(config = {}) {
    super(config);
    
    this.validateConfig([
      'jwtSecret',
      'jwtExpiresIn',
      'bcryptRounds'
    ]);

    this.users = new Map(); // In-memory user store (replace with database)
    this.refreshTokens = new Map(); // Store refresh tokens
    this.passwordResetTokens = new Map(); // Store password reset tokens
    this.emailVerificationTokens = new Map(); // Store email verification tokens
    
    this.jwtSecret = config.jwtSecret;
    this.jwtExpiresIn = config.jwtExpiresIn || '1h';
    this.refreshTokenExpiresIn = config.refreshTokenExpiresIn || '7d';
    this.bcryptRounds = config.bcryptRounds || 12;
    this.requireEmailVerification = config.requireEmailVerification || false;
  }

  async initialize() {
    this.log('Initializing LocalAuthProvider');
    
    // Create default admin user if enabled
    if (this.config.createDefaultAdmin) {
      await this.createDefaultAdmin();
    }
    
    this.log('LocalAuthProvider initialized successfully');
  }

  async authenticate(credentials, context = {}) {
    const { email, password } = credentials;
    
    if (!email || !password) {
      return {
        success: false,
        error: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      };
    }

    try {
      // Find user by email
      const user = this.findUserByEmail(email);
      if (!user) {
        return {
          success: false,
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        };
      }

      // Check if account is active
      if (!user.isActive) {
        return {
          success: false,
          error: 'Account is deactivated',
          code: 'ACCOUNT_DEACTIVATED'
        };
      }

      // Check email verification if required
      if (this.requireEmailVerification && !user.emailVerified) {
        return {
          success: false,
          error: 'Email address not verified',
          code: 'EMAIL_NOT_VERIFIED'
        };
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        // Log failed attempt
        this.logFailedAttempt(user.id, context);
        
        return {
          success: false,
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        };
      }

      // Check for account lockout
      if (this.isAccountLocked(user)) {
        return {
          success: false,
          error: 'Account is temporarily locked due to too many failed attempts',
          code: 'ACCOUNT_LOCKED'
        };
      }

      // Generate tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);

      // Update user login info
      user.lastLogin = new Date().toISOString();
      user.loginCount = (user.loginCount || 0) + 1;
      user.failedAttempts = 0; // Reset failed attempts
      
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
          expiresIn: this.jwtExpiresIn
        }
      };

    } catch (error) {
      this.log(`Authentication error: ${error.message}`, 'error', {
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
    const { email, password, firstName, lastName } = userData;
    
    if (!email || !password) {
      return {
        success: false,
        error: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      };
    }

    // Validate email format
    if (!this.isValidEmail(email)) {
      return {
        success: false,
        error: 'Invalid email format',
        code: 'INVALID_EMAIL'
      };
    }

    // Validate password strength
    const passwordValidation = this.validatePassword(password);
    if (!passwordValidation.valid) {
      return {
        success: false,
        error: passwordValidation.error,
        code: 'WEAK_PASSWORD'
      };
    }

    try {
      // Check if user already exists
      if (this.findUserByEmail(email)) {
        return {
          success: false,
          error: 'User already exists with this email',
          code: 'USER_EXISTS'
        };
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, this.bcryptRounds);
      
      // Create user
      const user = {
        id: crypto.randomUUID(),
        email: email.toLowerCase(),
        passwordHash,
        firstName: firstName || '',
        lastName: lastName || '',
        isActive: true,
        emailVerified: !this.requireEmailVerification,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        loginCount: 0,
        failedAttempts: 0,
        roles: ['user']
      };

      this.users.set(user.id, user);

      // Generate email verification token if required
      let emailVerificationToken = null;
      if (this.requireEmailVerification) {
        emailVerificationToken = this.generateEmailVerificationToken(user.id);
      }

      this.log(`User registered successfully: ${user.email}`, 'info', {
        userId: user.id,
        ip: context.ip
      });

      return {
        success: true,
        user: this.sanitizeUser(user),
        emailVerificationToken: emailVerificationToken
      };

    } catch (error) {
      this.log(`Registration error: ${error.message}`, 'error', {
        email,
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
          expiresIn: this.jwtExpiresIn
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
      // Decode token to get user info
      const decoded = jwt.decode(token);
      if (decoded && decoded.userId) {
        // Remove all refresh tokens for this user
        for (const [tokenKey, tokenData] of this.refreshTokens.entries()) {
          if (tokenData.userId === decoded.userId) {
            this.refreshTokens.delete(tokenKey);
          }
        }
        
        this.log(`User logged out: ${decoded.userId}`, 'info', context);
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
      const decoded = jwt.verify(token, this.jwtSecret);
      const user = this.users.get(decoded.userId);
      
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
      // Handle password update
      if (updateData.password) {
        const passwordValidation = this.validatePassword(updateData.password);
        if (!passwordValidation.valid) {
          return {
            success: false,
            error: passwordValidation.error,
            code: 'WEAK_PASSWORD'
          };
        }
        updateData.passwordHash = await bcrypt.hash(updateData.password, this.bcryptRounds);
        delete updateData.password;
      }

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

    // Remove user and related tokens
    this.users.delete(userId);
    
    // Remove refresh tokens
    for (const [tokenKey, tokenData] of this.refreshTokens.entries()) {
      if (tokenData.userId === userId) {
        this.refreshTokens.delete(tokenKey);
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
      // Don't reveal if email exists
      return {
        success: true,
        message: 'If the email exists, a reset link has been sent'
      };
    }

    try {
      const resetToken = this.generatePasswordResetToken(user.id);
      
      this.log(`Password reset requested: ${user.email}`, 'info', {
        userId: user.id,
        ip: context.ip
      });

      return {
        success: true,
        resetToken,
        message: 'Password reset token generated'
      };

    } catch (error) {
      this.log(`Password reset error: ${error.message}`, 'error', { email });
      
      return {
        success: false,
        error: 'Password reset failed',
        code: 'RESET_ERROR'
      };
    }
  }

  async verifyEmail(token) {
    try {
      const userId = this.emailVerificationTokens.get(token);
      if (!userId) {
        return {
          success: false,
          error: 'Invalid verification token',
          code: 'INVALID_TOKEN'
        };
      }

      const user = this.users.get(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        };
      }

      user.emailVerified = true;
      user.updatedAt = new Date().toISOString();
      
      // Remove verification token
      this.emailVerificationTokens.delete(token);

      this.log(`Email verified: ${user.email}`, 'info', { userId });

      return {
        success: true,
        message: 'Email verified successfully'
      };

    } catch (error) {
      this.log(`Email verification error: ${error.message}`, 'error');
      
      return {
        success: false,
        error: 'Email verification failed',
        code: 'VERIFICATION_ERROR'
      };
    }
  }

  // Helper methods

  findUserByEmail(email) {
    for (const user of this.users.values()) {
      if (user.email === email.toLowerCase()) {
        return user;
      }
    }
    return null;
  }

  generateAccessToken(user) {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        roles: user.roles
      },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn }
    );
  }

  generateRefreshToken(user) {
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setTime(expiresAt.getTime() + this.parseTimeToMs(this.refreshTokenExpiresIn));
    
    this.refreshTokens.set(refreshToken, {
      userId: user.id,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString()
    });
    
    return refreshToken;
  }

  generatePasswordResetToken(userId) {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setTime(expiresAt.getTime() + (60 * 60 * 1000)); // 1 hour
    
    this.passwordResetTokens.set(resetToken, {
      userId,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString()
    });
    
    return resetToken;
  }

  generateEmailVerificationToken(userId) {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    this.emailVerificationTokens.set(verificationToken, userId);
    return verificationToken;
  }

  sanitizeUser(user) {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validatePassword(password) {
    const minLength = this.config.minPasswordLength || 8;
    const requireUppercase = this.config.requireUppercase !== false;
    const requireLowercase = this.config.requireLowercase !== false;
    const requireNumbers = this.config.requireNumbers !== false;
    const requireSpecialChars = this.config.requireSpecialChars !== false;

    if (password.length < minLength) {
      return {
        valid: false,
        error: `Password must be at least ${minLength} characters long`
      };
    }

    if (requireUppercase && !/[A-Z]/.test(password)) {
      return {
        valid: false,
        error: 'Password must contain at least one uppercase letter'
      };
    }

    if (requireLowercase && !/[a-z]/.test(password)) {
      return {
        valid: false,
        error: 'Password must contain at least one lowercase letter'
      };
    }

    if (requireNumbers && !/\d/.test(password)) {
      return {
        valid: false,
        error: 'Password must contain at least one number'
      };
    }

    if (requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return {
        valid: false,
        error: 'Password must contain at least one special character'
      };
    }

    return { valid: true };
  }

  logFailedAttempt(userId, context) {
    const user = this.users.get(userId);
    if (user) {
      user.failedAttempts = (user.failedAttempts || 0) + 1;
      user.lastFailedAttempt = new Date().toISOString();
    }
  }

  isAccountLocked(user) {
    const maxFailedAttempts = this.config.maxFailedAttempts || 5;
    const lockoutDuration = this.config.lockoutDuration || 15 * 60 * 1000; // 15 minutes
    
    if (user.failedAttempts >= maxFailedAttempts) {
      const lastFailedAttempt = new Date(user.lastFailedAttempt || 0);
      const lockoutExpires = new Date(lastFailedAttempt.getTime() + lockoutDuration);
      return new Date() < lockoutExpires;
    }
    
    return false;
  }

  parseTimeToMs(timeString) {
    const units = {
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000
    };
    
    const match = timeString.match(/^(\d+)([smhd])$/);
    if (match) {
      const [, amount, unit] = match;
      return parseInt(amount) * units[unit];
    }
    
    return parseInt(timeString) || 3600000; // Default to 1 hour
  }

  async createDefaultAdmin() {
    const adminEmail = this.config.defaultAdminEmail || 'admin@tala.ai';
    const adminPassword = this.config.defaultAdminPassword || 'admin123';
    
    if (!this.findUserByEmail(adminEmail)) {
      await this.register({
        email: adminEmail,
        password: adminPassword,
        firstName: 'Admin',
        lastName: 'User'
      });
      
      // Update admin user with admin role
      const adminUser = this.findUserByEmail(adminEmail);
      if (adminUser) {
        adminUser.roles = ['admin', 'user'];
        adminUser.emailVerified = true;
        this.log(`Default admin user created: ${adminEmail}`);
      }
    }
  }

  getHealthStatus() {
    return {
      ...super.getHealthStatus(),
      userCount: this.users.size,
      activeTokens: this.refreshTokens.size
    };
  }
}

export default LocalAuthProvider;