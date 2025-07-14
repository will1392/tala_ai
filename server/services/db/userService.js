/**
 * User Service for Tala AI
 * 
 * Handles all database operations for users including:
 * - User CRUD operations with organization filtering
 * - Authentication integration
 * - Role and permission management
 * - User preferences and settings
 * - Activity tracking
 */

import { BaseService } from './baseService.js';
import cacheKeys from '../cache/cacheKeys.js';

export class UserService extends BaseService {
  constructor(options = {}) {
    super('users', {
      enableSoftDelete: true,
      enableLogging: true,
      enableCaching: true,
      cacheTTL: {
        short: 60,     // 1 minute for frequently changing data
        medium: 300,   // 5 minutes for user data
        long: 600      // 10 minutes for stable data
      },
      ...options
    });
  }

  /**
   * Create a new user
   * @param {Object} data - User data
   * @param {Object} options - Creation options
   * @returns {Object} Created user or error
   */
  async createUser(data, options = {}) {
    const {
      validateEmail = true,
      sendWelcomeEmail = false,
      setAsOwner = false
    } = options;

    // Validate required fields
    if (!data.organization_id || !data.email) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Organization ID and email are required'
        }
      };
    }

    // Validate email format
    if (validateEmail && !this.isValidEmail(data.email)) {
      return {
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: 'Invalid email format'
        }
      };
    }

    // Check if email already exists in organization
    const existingUser = await this.getUserByEmail(data.email, data.organization_id);
    if (existingUser.success) {
      return {
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'User with this email already exists in the organization'
        }
      };
    }

    try {
      // Prepare user data with defaults
      const userData = {
        organization_id: data.organization_id,
        auth_user_id: data.auth_user_id || null,
        email: data.email.toLowerCase(),
        email_verified: data.email_verified || false,
        first_name: data.first_name || null,
        last_name: data.last_name || null,
        display_name: data.display_name || this.generateDisplayName(data),
        avatar_url: data.avatar_url || null,
        bio: data.bio || null,
        role: setAsOwner ? 'owner' : (data.role || 'member'),
        permissions: data.permissions || [],
        preferences: data.preferences || {},
        llm_preferences: data.llm_preferences || {
          preferredModel: null,
          costOptimization: false,
          maxTokens: 1000,
          temperature: 0.7
        },
        status: data.status || 'active',
        metadata: data.metadata || {}
      };

      const result = await this.create(userData, { organizationId: data.organization_id });

      if (!result.success) {
        return result;
      }

      const user = result.data[0];

      // Remove sensitive data from response
      const safeUser = this.sanitizeUser(user);

      this.log(`Created user: ${user.email} (${user.id}) in org ${user.organization_id}`);

      return {
        success: true,
        data: safeUser,
        metadata: {
          welcomeEmailSent: sendWelcomeEmail,
          role: user.role
        }
      };

    } catch (error) {
      this.log(`Failed to create user: ${error.message}`, 'error');
      return {
        success: false,
        error: {
          code: 'CREATION_ERROR',
          message: error.message
        }
      };
    }
  }

  /**
   * Get user by email with caching
   * @param {string} email - User email
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Object} User or error
   */
  async getUserByEmail(email, organizationId, options = {}) {
    const {
      includeSensitive = false,
      bypassCache = false
    } = options;

    // Generate cache key using standardized keys
    const cacheKey = cacheKeys.user.pattern() + `:email_${email}:org_${organizationId}`;

    // Try cache first
    if (this.options.enableCaching && !bypassCache) {
      const cachedResult = await this.getCachedResult(cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }
    }

    // Query database
    const result = await this.executeQuery(async () => {
      let query = this.getAnonClient()
        .from(this.tableName)
        .select('*')
        .eq('email', email)
        .eq('organization_id', organizationId);

      query = this.applySoftDeleteFilter(query);

      return query.single();
    }, 'GET_BY_EMAIL');

    // Process result
    if (result.success && result.data) {
      const processedResult = {
        ...result,
        data: includeSensitive ? result.data : this.sanitizeUser(result.data)
      };

      // Cache successful results
      if (this.options.enableCaching) {
        await this.cacheResult(cacheKey, processedResult, this.options.cacheTTL.medium);
      }

      return processedResult;
    }

    return result;
  }

  /**
   * Get user by ID
   * @param {string} id - User ID
   * @param {Object} options - Query options
   * @returns {Object} User or error
   */
  async getUserById(id, options = {}) {
    const {
      organizationId = null,
      includeSensitive = false,
      includeActivity = false
    } = options;

    const result = await this.getById(id, { 
      organizationId,
      select: includeSensitive ? '*' : this.getSafeUserFields()
    });

    if (!result.success) {
      return result;
    }

    let user = result.data;

    // Add activity data if requested
    if (includeActivity) {
      const activity = await this.getUserActivity(id);
      if (activity.success) {
        user.activity = activity.data;
      }
    }

    // Sanitize user data if not including sensitive info
    if (!includeSensitive) {
      user = this.sanitizeUser(user);
    }

    return {
      success: true,
      data: user
    };
  }

  /**
   * Get user by email
   * @param {string} email - User email
   * @param {string} organizationId - Organization ID (optional)
   * @returns {Object} User or error
   */
  async getUserByEmail(email, organizationId = null) {
    return this.executeQuery(async () => {
      let query = this.getAnonClient()
        .from(this.tableName)
        .select(this.getSafeUserFields())
        .eq('email', email.toLowerCase());

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      query = this.applySoftDeleteFilter(query);

      return query.single();
    }, 'GET_BY_EMAIL');
  }

  /**
   * Get user by auth user ID (Supabase auth integration)
   * @param {string} authUserId - Auth user ID
   * @param {string} organizationId - Organization ID (optional)
   * @returns {Object} User or error
   */
  async getUserByAuthId(authUserId, organizationId = null) {
    return this.executeQuery(async () => {
      let query = this.getAnonClient()
        .from(this.tableName)
        .select('*')
        .eq('auth_user_id', authUserId);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      query = this.applySoftDeleteFilter(query);

      return query.single();
    }, 'GET_BY_AUTH_ID');
  }

  /**
   * Get users by organization
   * @param {string} orgId - Organization ID
   * @param {Object} options - Query options
   * @returns {Object} Users list or error
   */
  async getUsersByOrganization(orgId, options = {}) {
    const {
      pagination = { page: 1, pageSize: 50 },
      sort = { field: 'created_at', direction: 'desc' },
      search = {},
      filters = {},
      includeInactive = false
    } = options;

    // Add organization filter
    const orgFilters = {
      organization_id: orgId,
      ...filters
    };

    // Add active status filter unless including inactive users
    if (!includeInactive) {
      orgFilters.status = 'active';
    }

    // Define searchable fields
    if (search.term) {
      search.fields = search.fields || ['display_name', 'email', 'first_name', 'last_name'];
    }

    const result = await this.getMany(orgFilters, {
      pagination,
      sort,
      search,
      select: this.getSafeUserFields()
    });

    if (result.success) {
      // Sanitize all user data
      result.data = result.data.map(user => this.sanitizeUser(user));
    }

    return result;
  }

  /**
   * Update user
   * @param {string} id - User ID
   * @param {Object} data - Update data
   * @param {Object} options - Update options
   * @returns {Object} Updated user or error
   */
  async updateUser(id, data, options = {}) {
    const {
      organizationId = null,
      validateEmail = true,
      updateLastActive = true
    } = options;

    // Validate email if being updated
    if (data.email && validateEmail && !this.isValidEmail(data.email)) {
      return {
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: 'Invalid email format'
        }
      };
    }

    // Clean email
    if (data.email) {
      data.email = data.email.toLowerCase();
    }

    // Update last active timestamp if requested
    if (updateLastActive) {
      data.last_active_at = new Date().toISOString();
    }

    // Generate display name if name fields are being updated
    if ((data.first_name || data.last_name) && !data.display_name) {
      data.display_name = this.generateDisplayName(data);
    }

    const result = await this.update(id, data, { organizationId });

    if (result.success) {
      // Sanitize user data in response
      result.data = result.data.map(user => this.sanitizeUser(user));
      this.log(`Updated user: ${id}`);
    }

    return result;
  }

  /**
   * Update user preferences
   * @param {string} id - User ID
   * @param {Object} preferences - User preferences
   * @param {string} organizationId - Organization ID
   * @returns {Object} Update result
   */
  async updateUserPreferences(id, preferences, organizationId = null) {
    return this.executeQuery(async () => {
      let query = this.getClient()
        .from(this.tableName)
        .update({
          preferences: preferences,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      return query.select(this.getSafeUserFields());
    }, 'UPDATE_PREFERENCES');
  }

  /**
   * Update user LLM preferences
   * @param {string} id - User ID
   * @param {Object} llmPreferences - LLM preferences
   * @param {string} organizationId - Organization ID
   * @returns {Object} Update result
   */
  async updateLLMPreferences(id, llmPreferences, organizationId = null) {
    // Validate LLM preferences
    const validPrefs = this.validateLLMPreferences(llmPreferences);
    
    return this.executeQuery(async () => {
      let query = this.getClient()
        .from(this.tableName)
        .update({
          llm_preferences: validPrefs,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      return query.select(this.getSafeUserFields());
    }, 'UPDATE_LLM_PREFERENCES');
  }

  /**
   * Update user role
   * @param {string} id - User ID
   * @param {string} role - New role
   * @param {string} organizationId - Organization ID
   * @returns {Object} Update result
   */
  async updateUserRole(id, role, organizationId) {
    // Validate role
    const validRoles = ['owner', 'admin', 'member', 'viewer'];
    if (!validRoles.includes(role)) {
      return {
        success: false,
        error: {
          code: 'INVALID_ROLE',
          message: `Role must be one of: ${validRoles.join(', ')}`
        }
      };
    }

    return this.update(id, { role }, { organizationId });
  }

  /**
   * Update user status
   * @param {string} id - User ID
   * @param {string} status - New status
   * @param {string} organizationId - Organization ID
   * @returns {Object} Update result
   */
  async updateUserStatus(id, status, organizationId) {
    // Validate status
    const validStatuses = ['active', 'inactive', 'suspended'];
    if (!validStatuses.includes(status)) {
      return {
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `Status must be one of: ${validStatuses.join(', ')}`
        }
      };
    }

    return this.update(id, { status }, { organizationId });
  }

  /**
   * Record user login
   * @param {string} id - User ID
   * @param {Object} loginData - Login metadata
   * @returns {Object} Update result
   */
  async recordLogin(id, loginData = {}) {
    const updateData = {
      last_login_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
      login_count: loginData.incrementCount !== false ? 
        this.getClient().rpc('increment_login_count', { user_id: id }) : undefined
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    return this.executeQuery(async () => {
      return this.getClient()
        .from(this.tableName)
        .update(updateData)
        .eq('id', id)
        .select(this.getSafeUserFields());
    }, 'RECORD_LOGIN');
  }

  /**
   * Get user activity
   * @param {string} id - User ID
   * @returns {Object} User activity data
   */
  async getUserActivity(id) {
    try {
      // This would typically query conversation and document services
      // For now, return placeholder data
      const activity = {
        conversationsCount: 0,
        documentsCount: 0,
        lastConversation: null,
        lastDocument: null,
        totalLLMRequests: 0,
        averageSessionLength: 0
      };

      return {
        success: true,
        data: activity
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ACTIVITY_ERROR',
          message: error.message
        }
      };
    }
  }

  /**
   * Search users
   * @param {string} organizationId - Organization ID
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options
   * @returns {Object} Search results
   */
  async searchUsers(organizationId, searchTerm, options = {}) {
    const {
      pagination = { page: 1, pageSize: 20 },
      filters = {},
      includeInactive = false
    } = options;

    const searchFilters = {
      organization_id: organizationId,
      ...filters
    };

    if (!includeInactive) {
      searchFilters.status = 'active';
    }

    return this.getMany(searchFilters, {
      pagination,
      search: {
        term: searchTerm,
        fields: ['display_name', 'email', 'first_name', 'last_name']
      },
      select: this.getSafeUserFields()
    });
  }

  /**
   * Get safe user fields for public queries
   * @returns {string} Comma-separated field list
   */
  getSafeUserFields() {
    return `
      id, organization_id, email, email_verified,
      first_name, last_name, display_name, avatar_url, bio,
      role, status, preferences, llm_preferences,
      last_login_at, last_active_at, login_count,
      created_at, updated_at
    `;
  }

  /**
   * Sanitize user data (remove sensitive fields)
   * @param {Object} user - User object
   * @returns {Object} Sanitized user object
   */
  sanitizeUser(user) {
    if (!user) return null;

    const { 
      auth_user_id, 
      permissions, 
      metadata, 
      deleted_at,
      ...safeUser 
    } = user;

    return safeUser;
  }

  /**
   * Generate display name from user data
   * @param {Object} userData - User data
   * @returns {string} Generated display name
   */
  generateDisplayName(userData) {
    if (userData.first_name && userData.last_name) {
      return `${userData.first_name} ${userData.last_name}`;
    }
    
    if (userData.first_name) {
      return userData.first_name;
    }
    
    if (userData.email) {
      return userData.email.split('@')[0];
    }
    
    return 'User';
  }

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} Is valid email
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate LLM preferences
   * @param {Object} preferences - LLM preferences to validate
   * @returns {Object} Validated preferences
   */
  validateLLMPreferences(preferences) {
    const defaults = {
      preferredModel: null,
      costOptimization: false,
      maxTokens: 1000,
      temperature: 0.7,
      fastResponse: false
    };

    const validated = { ...defaults, ...preferences };

    // Validate ranges
    if (validated.temperature < 0 || validated.temperature > 2) {
      validated.temperature = 0.7;
    }

    if (validated.maxTokens < 1 || validated.maxTokens > 4000) {
      validated.maxTokens = 1000;
    }

    return validated;
  }
}

export default UserService;