/**
 * Organization Service for Tala AI
 * 
 * Handles all database operations for organizations including:
 * - CRUD operations for organizations
 * - Subscription and billing management
 * - Feature flag management
 * - Organization settings and branding
 */

import { BaseService } from './baseService.js';

export class OrganizationService extends BaseService {
  constructor(options = {}) {
    super('organizations', {
      enableSoftDelete: true,
      enableLogging: true,
      ...options
    });
  }

  /**
   * Create a new organization
   * @param {Object} data - Organization data
   * @param {Object} options - Creation options
   * @returns {Object} Created organization or error
   */
  async createOrganization(data, options = {}) {
    const {
      createDefaultFolders = true,
      createOwnerUser = true
    } = options;

    // Validate required fields
    if (!data.name || !data.slug) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Organization name and slug are required'
        }
      };
    }

    try {
      // Start transaction (simulated)
      const transaction = await this.beginTransaction();

      // Prepare organization data with defaults
      const orgData = {
        name: data.name,
        slug: data.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        description: data.description || null,
        plan_type: data.plan_type || 'free',
        max_users: data.max_users || 10,
        max_documents: data.max_documents || 1000,
        max_monthly_llm_requests: data.max_monthly_llm_requests || 1000,
        features: data.features || {},
        logo_url: data.logo_url || null,
        primary_color: data.primary_color || null,
        stripe_customer_id: data.stripe_customer_id || null,
        billing_email: data.billing_email || null,
        settings: data.settings || {},
        metadata: data.metadata || {}
      };

      // Create organization
      const orgResult = await this.create(orgData);

      if (!orgResult.success) {
        await this.rollbackTransaction(transaction);
        return orgResult;
      }

      const organization = orgResult.data[0];

      // Create default folders if requested
      if (createDefaultFolders) {
        await this.createDefaultFolders(organization.id);
      }

      await this.commitTransaction(transaction);

      this.log(`Created organization: ${organization.name} (${organization.id})`);

      return {
        success: true,
        data: organization,
        metadata: {
          defaultFoldersCreated: createDefaultFolders,
          transaction: transaction.transactionId
        }
      };

    } catch (error) {
      this.log(`Failed to create organization: ${error.message}`, 'error');
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
   * Get organization by ID
   * @param {string} id - Organization ID
   * @param {Object} options - Query options
   * @returns {Object} Organization or error
   */
  async getOrganization(id, options = {}) {
    const {
      includeStats = false,
      includeUsers = false,
      includeSettings = true
    } = options;

    let select = '*';
    if (!includeSettings) {
      select = `
        id, name, slug, description, plan_type, 
        max_users, max_documents, max_monthly_llm_requests,
        logo_url, primary_color, created_at, updated_at
      `;
    }

    const result = await this.getById(id, { select });

    if (!result.success) {
      return result;
    }

    const organization = result.data;

    // Add additional data if requested
    if (includeStats || includeUsers) {
      const additionalData = await this.getOrganizationAdditionalData(id, {
        includeStats,
        includeUsers
      });

      if (additionalData.success) {
        Object.assign(organization, additionalData.data);
      }
    }

    return {
      success: true,
      data: organization
    };
  }

  /**
   * Get organization by slug
   * @param {string} slug - Organization slug
   * @param {Object} options - Query options
   * @returns {Object} Organization or error
   */
  async getOrganizationBySlug(slug, options = {}) {
    return this.executeQuery(async () => {
      let query = this.getAnonClient()
        .from(this.tableName)
        .select('*')
        .eq('slug', slug.toLowerCase());

      query = this.applySoftDeleteFilter(query);

      return query.single();
    }, 'GET_BY_SLUG');
  }

  /**
   * Update organization
   * @param {string} id - Organization ID
   * @param {Object} data - Update data
   * @param {Object} options - Update options
   * @returns {Object} Updated organization or error
   */
  async updateOrganization(id, data, options = {}) {
    const {
      validateSlugUnique = true
    } = options;

    // If updating slug, validate uniqueness
    if (data.slug && validateSlugUnique) {
      const existingOrg = await this.getOrganizationBySlug(data.slug);
      if (existingOrg.success && existingOrg.data.id !== id) {
        return {
          success: false,
          error: {
            code: 'SLUG_EXISTS',
            message: 'Organization slug already exists'
          }
        };
      }
    }

    // Clean slug if provided
    if (data.slug) {
      data.slug = data.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    }

    const result = await this.update(id, data);

    if (result.success) {
      this.log(`Updated organization: ${id}`);
    }

    return result;
  }

  /**
   * Delete organization (soft delete)
   * @param {string} id - Organization ID
   * @param {Object} options - Delete options
   * @returns {Object} Delete result or error
   */
  async deleteOrganization(id, options = {}) {
    const {
      hardDelete = false,
      deleteUsers = false,
      deleteData = false
    } = options;

    try {
      const transaction = await this.beginTransaction();

      // Get organization first to check if it exists
      const orgResult = await this.getOrganization(id);
      if (!orgResult.success) {
        return orgResult;
      }

      // If hard delete requested, clean up related data
      if (hardDelete && deleteData) {
        await this.deleteOrganizationData(id, { deleteUsers });
      }

      // Delete organization
      const deleteResult = await this.delete(id, { hardDelete });

      if (!deleteResult.success) {
        await this.rollbackTransaction(transaction);
        return deleteResult;
      }

      await this.commitTransaction(transaction);

      this.log(`Deleted organization: ${id} (hard: ${hardDelete})`);

      return {
        success: true,
        data: {
          id,
          hardDelete,
          dataDeleted: deleteData
        }
      };

    } catch (error) {
      this.log(`Failed to delete organization: ${error.message}`, 'error');
      return {
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: error.message
        }
      };
    }
  }

  /**
   * Get organizations with pagination and filtering
   * @param {Object} filters - Filter conditions
   * @param {Object} options - Query options
   * @returns {Object} Organizations list or error
   */
  async getOrganizations(filters = {}, options = {}) {
    const {
      pagination = { page: 1, pageSize: 20 },
      sort = { field: 'created_at', direction: 'desc' },
      search = {},
      includeStats = false
    } = options;

    // Define searchable fields
    if (search.term) {
      search.fields = search.fields || ['name', 'description', 'slug'];
    }

    const result = await this.getMany(filters, {
      pagination,
      sort,
      search,
      select: includeStats ? '*' : `
        id, name, slug, description, plan_type,
        max_users, logo_url, primary_color,
        created_at, updated_at
      `
    });

    if (result.success && includeStats) {
      // Add stats for each organization
      for (const org of result.data) {
        const stats = await this.getOrganizationStats(org.id);
        if (stats.success) {
          org.stats = stats.data;
        }
      }
    }

    return result;
  }

  /**
   * Update organization features
   * @param {string} id - Organization ID
   * @param {Object} features - Features to update
   * @returns {Object} Update result or error
   */
  async updateFeatures(id, features) {
    return this.executeQuery(async () => {
      return this.getClient()
        .from(this.tableName)
        .update({
          features: features,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();
    }, 'UPDATE_FEATURES');
  }

  /**
   * Update organization settings
   * @param {string} id - Organization ID
   * @param {Object} settings - Settings to update
   * @returns {Object} Update result or error
   */
  async updateSettings(id, settings) {
    return this.executeQuery(async () => {
      return this.getClient()
        .from(this.tableName)
        .update({
          settings: settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();
    }, 'UPDATE_SETTINGS');
  }

  /**
   * Check if organization slug is available
   * @param {string} slug - Slug to check
   * @param {string} excludeId - Organization ID to exclude from check
   * @returns {Object} Availability result
   */
  async isSlugAvailable(slug, excludeId = null) {
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    
    return this.executeQuery(async () => {
      let query = this.getAnonClient()
        .from(this.tableName)
        .select('id')
        .eq('slug', cleanSlug);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      return query.single();
    }, 'CHECK_SLUG');
  }

  /**
   * Get organization statistics
   * @param {string} id - Organization ID
   * @returns {Object} Organization statistics
   */
  async getOrganizationStats(id) {
    try {
      // This would typically involve queries to other tables
      // For now, returning a placeholder structure
      const stats = {
        userCount: 0,
        documentCount: 0,
        conversationCount: 0,
        monthlyLLMRequests: 0,
        storageUsed: 0
      };

      // In a real implementation, you would query other services:
      // const userService = new UserService();
      // stats.userCount = await userService.count({ organization_id: id });

      return {
        success: true,
        data: stats
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'STATS_ERROR',
          message: error.message
        }
      };
    }
  }

  /**
   * Get additional organization data
   * @param {string} id - Organization ID
   * @param {Object} options - Data options
   * @returns {Object} Additional data
   */
  async getOrganizationAdditionalData(id, options = {}) {
    const { includeStats = false, includeUsers = false } = options;
    
    const additionalData = {};

    if (includeStats) {
      const stats = await this.getOrganizationStats(id);
      if (stats.success) {
        additionalData.stats = stats.data;
      }
    }

    if (includeUsers) {
      // Would query user service
      additionalData.users = [];
    }

    return {
      success: true,
      data: additionalData
    };
  }

  /**
   * Create default folders for new organization
   * @param {string} organizationId - Organization ID
   * @returns {Object} Creation result
   */
  async createDefaultFolders(organizationId) {
    try {
      // This would typically call the folder service
      // For now, just log the action
      this.log(`Creating default folders for organization: ${organizationId}`);
      
      return {
        success: true,
        data: { foldersCreated: 0 }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FOLDER_CREATION_ERROR',
          message: error.message
        }
      };
    }
  }

  /**
   * Delete organization data
   * @param {string} id - Organization ID
   * @param {Object} options - Delete options
   * @returns {Object} Delete result
   */
  async deleteOrganizationData(id, options = {}) {
    const { deleteUsers = false } = options;

    try {
      this.log(`Deleting organization data: ${id} (users: ${deleteUsers})`);
      
      // This would cascade delete related data
      // Implementation would call other services
      
      return {
        success: true,
        data: { 
          deletedUsers: deleteUsers ? 0 : 'skipped',
          deletedDocuments: 0,
          deletedConversations: 0 
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATA_DELETE_ERROR',
          message: error.message
        }
      };
    }
  }
}

export default OrganizationService;