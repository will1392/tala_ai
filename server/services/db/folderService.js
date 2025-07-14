/**
 * Folder Service for Tala AI
 * 
 * Handles all database operations for folders including:
 * - Hierarchical folder CRUD operations with organization filtering
 * - Folder tree navigation and manipulation
 * - Folder sharing and permissions
 * - Primary folder management
 * - Folder statistics and content counts
 */

import { BaseService } from './baseService.js';
import cacheKeys from '../cache/cacheKeys.js';

export class FolderService extends BaseService {
  constructor(options = {}) {
    super('folders', {
      enableSoftDelete: true,
      enableLogging: true,
      enableCaching: true,
      cacheTTL: {
        short: 60,     // 1 minute for folder lists
        medium: 300,   // 5 minutes for folder details
        long: 600      // 10 minutes for folder trees
      },
      ...options
    });
  }

  /**
   * Create a new folder
   * @param {Object} data - Folder data
   * @param {Object} options - Creation options
   * @returns {Object} Created folder or error
   */
  async createFolder(data, options = {}) {
    const {
      validateParent = true,
      createPath = false
    } = options;

    // Validate required fields
    if (!data.organization_id || !data.user_id || !data.name) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Organization ID, user ID, and folder name are required'
        }
      };
    }

    // Validate parent folder if specified
    if (validateParent && data.parent_id) {
      const parentResult = await this.getFolder(data.parent_id, { 
        organizationId: data.organization_id,
        userId: data.user_id 
      });
      
      if (!parentResult.success) {
        return {
          success: false,
          error: {
            code: 'INVALID_PARENT',
            message: 'Parent folder not found or access denied'
          }
        };
      }

      // Check for circular reference
      const circularCheck = await this.checkCircularReference(data.parent_id, null, data.organization_id);
      if (!circularCheck.success) {
        return circularCheck;
      }
    }

    try {
      const transaction = await this.beginTransaction();

      // Prepare folder data with defaults
      const folderData = {
        organization_id: data.organization_id,
        user_id: data.user_id,
        name: data.name.trim(),
        description: data.description || null,
        parent_id: data.parent_id || null,
        visibility: data.visibility || 'private',
        color: data.color || null,
        icon: data.icon || null,
        sort_order: data.sort_order || 0,
        is_system: data.is_system || false,
        is_shared: data.is_shared || false,
        share_settings: data.share_settings || {
          allowEdit: false,
          allowAdd: false,
          allowDelete: false,
          expiresAt: null
        },
        metadata: data.metadata || {}
      };

      // Calculate folder path and depth
      if (folderData.parent_id) {
        const pathResult = await this.calculateFolderPath(folderData.parent_id, data.organization_id);
        if (pathResult.success) {
          folderData.path = `${pathResult.data.path}/${folderData.name}`;
          folderData.depth = pathResult.data.depth + 1;
        }
      } else {
        folderData.path = folderData.name;
        folderData.depth = 0;
      }

      // Validate maximum depth
      if (folderData.depth > 10) {
        await this.rollbackTransaction(transaction);
        return {
          success: false,
          error: {
            code: 'MAX_DEPTH_EXCEEDED',
            message: 'Maximum folder depth of 10 levels exceeded'
          }
        };
      }

      // Check for duplicate name at same level
      const duplicateCheck = await this.checkDuplicateName(
        folderData.name, 
        folderData.parent_id, 
        data.organization_id,
        null
      );
      
      if (!duplicateCheck.success) {
        await this.rollbackTransaction(transaction);
        return duplicateCheck;
      }

      // Create folder
      const folderResult = await this.create(folderData, { 
        organizationId: data.organization_id 
      });

      if (!folderResult.success) {
        await this.rollbackTransaction(transaction);
        return folderResult;
      }

      const folder = folderResult.data[0];

      await this.commitTransaction(transaction);

      this.log(`Created folder: ${folder.name} (${folder.id}) for user ${data.user_id}`);

      return {
        success: true,
        data: folder,
        metadata: {
          path: folder.path,
          depth: folder.depth,
          transaction: transaction.transactionId
        }
      };

    } catch (error) {
      this.log(`Failed to create folder: ${error.message}`, 'error');
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
   * Get folder by ID
   * @param {string} id - Folder ID
   * @param {Object} options - Query options
   * @returns {Object} Folder or error
   */
  async getFolder(id, options = {}) {
    const {
      organizationId = null,
      userId = null,
      includeChildren = false,
      includeContentCounts = false,
      includeParentChain = false
    } = options;

    const result = await this.getById(id, { 
      organizationId,
      select: '*'
    });

    if (!result.success) {
      return result;
    }

    let folder = result.data;

    // Apply user access control
    if (userId && !this.canUserAccessFolder(folder, userId)) {
      return {
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'User does not have access to this folder'
        }
      };
    }

    // Add additional data if requested
    if (includeChildren || includeContentCounts || includeParentChain) {
      const additionalData = await this.getFolderAdditionalData(id, {
        includeChildren,
        includeContentCounts,
        includeParentChain,
        organizationId,
        userId
      });

      if (additionalData.success) {
        Object.assign(folder, additionalData.data);
      }
    }

    return {
      success: true,
      data: folder
    };
  }

  /**
   * Get folders by user (root level by default)
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Object} Folders list or error
   */
  async getFoldersByUser(userId, options = {}) {
    const {
      organizationId = null,
      parentId = null,
      pagination = { page: 1, pageSize: 100 },
      sort = { field: 'name', direction: 'asc' },
      search = {},
      filters = {},
      includeShared = true
    } = options;

    // Build base filters
    let folderFilters = {
      parent_id: parentId,
      ...filters
    };

    // Apply user access filters
    if (includeShared) {
      // Include user's folders and shared folders
      folderFilters.or = `user_id.eq.${userId},is_shared.eq.true`;
    } else {
      // Only user's own folders
      folderFilters.user_id = userId;
    }

    // Define searchable fields
    if (search.term) {
      search.fields = search.fields || ['name', 'description'];
    }

    return this.getMany(folderFilters, {
      organizationId,
      pagination,
      sort,
      search,
      select: '*'
    });
  }

  /**
   * Get folder tree structure with caching
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Tree options
   * @returns {Object} Folder tree or error
   */
  async getFolderTree(organizationId, options = {}) {
    const {
      userId = null,
      rootFolderId = null,
      maxDepth = 5,
      includeContentCounts = false,
      bypassCache = false
    } = options;

    // Generate cache key for folder tree
    const cacheKey = cacheKeys.folder.tree(organizationId) + 
      (userId ? `:user_${userId}` : '') +
      (rootFolderId ? `:root_${rootFolderId}` : '') +
      `:depth_${maxDepth}:counts_${includeContentCounts}`;

    // Try cache first
    if (this.options.enableCaching && !bypassCache) {
      const cachedResult = await this.getCachedResult(cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }
    }

    try {
      // Get all folders for the organization
      const foldersResult = await this.getAllFolders(organizationId, { 
        userId,
        includeContentCounts 
      });

      if (!foldersResult.success) {
        return foldersResult;
      }

      const folders = foldersResult.data;

      // Build tree structure
      const tree = this.buildFolderTree(folders, rootFolderId, maxDepth);

      const result = {
        success: true,
        data: tree,
        metadata: {
          totalFolders: folders.length,
          maxDepth: Math.max(...folders.map(f => f.depth || 0))
        }
      };

      // Cache the result
      if (this.options.enableCaching) {
        await this.cacheResult(cacheKey, result, this.options.cacheTTL.long);
      }

      return result;

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TREE_BUILD_ERROR',
          message: error.message
        }
      };
    }
  }

  /**
   * Update folder
   * @param {string} id - Folder ID
   * @param {Object} data - Update data
   * @param {Object} options - Update options
   * @returns {Object} Updated folder or error
   */
  async updateFolder(id, data, options = {}) {
    const {
      organizationId = null,
      userId = null,
      updatePath = false
    } = options;

    // If userId provided, verify ownership or edit permissions
    if (userId) {
      const existingFolder = await this.getFolder(id, { organizationId, userId });
      if (!existingFolder.success) {
        return existingFolder;
      }

      if (!this.canUserEditFolder(existingFolder.data, userId)) {
        return {
          success: false,
          error: {
            code: 'EDIT_DENIED',
            message: 'User does not have edit permissions for this folder'
          }
        };
      }
    }

    // Handle parent_id changes (moving folders)
    if (data.parent_id !== undefined) {
      const moveResult = await this.validateFolderMove(id, data.parent_id, organizationId);
      if (!moveResult.success) {
        return moveResult;
      }
    }

    // Handle name changes that require path updates
    if (data.name && updatePath) {
      const pathUpdateResult = await this.updateFolderPaths(id, data, organizationId);
      if (!pathUpdateResult.success) {
        return pathUpdateResult;
      }
    }

    const result = await this.update(id, data, { organizationId });

    if (result.success) {
      this.log(`Updated folder: ${id}`);
    }

    return result;
  }

  /**
   * Move folder to new parent
   * @param {string} id - Folder ID
   * @param {string} newParentId - New parent folder ID (null for root)
   * @param {Object} options - Move options
   * @returns {Object} Move result
   */
  async moveFolder(id, newParentId, options = {}) {
    const {
      organizationId = null,
      userId = null,
      updatePaths = true
    } = options;

    try {
      const transaction = await this.beginTransaction();

      // Validate the move
      const moveValidation = await this.validateFolderMove(id, newParentId, organizationId);
      if (!moveValidation.success) {
        await this.rollbackTransaction(transaction);
        return moveValidation;
      }

      // Calculate new path and depth
      let newPath, newDepth;
      if (newParentId) {
        const parentResult = await this.getFolder(newParentId, { organizationId });
        if (!parentResult.success) {
          await this.rollbackTransaction(transaction);
          return parentResult;
        }
        
        const parentFolder = parentResult.data;
        const currentFolder = await this.getFolder(id, { organizationId });
        
        newPath = `${parentFolder.path}/${currentFolder.data.name}`;
        newDepth = parentFolder.depth + 1;
      } else {
        const currentFolder = await this.getFolder(id, { organizationId });
        newPath = currentFolder.data.name;
        newDepth = 0;
      }

      // Update folder
      const updateData = {
        parent_id: newParentId,
        path: newPath,
        depth: newDepth,
        moved_at: new Date().toISOString()
      };

      const updateResult = await this.update(id, updateData, { organizationId });
      if (!updateResult.success) {
        await this.rollbackTransaction(transaction);
        return updateResult;
      }

      // Update all descendant paths if needed
      if (updatePaths) {
        await this.updateDescendantPaths(id, newPath, organizationId);
      }

      await this.commitTransaction(transaction);

      this.log(`Moved folder: ${id} to parent: ${newParentId || 'root'}`);

      return {
        success: true,
        data: {
          folderId: id,
          newParentId,
          newPath,
          newDepth
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'MOVE_ERROR',
          message: error.message
        }
      };
    }
  }

  /**
   * Get folder contents (documents and subfolders)
   * @param {string} id - Folder ID
   * @param {Object} options - Content options
   * @returns {Object} Folder contents
   */
  async getFolderContents(id, options = {}) {
    const {
      organizationId = null,
      userId = null,
      includeDocuments = true,
      includeSubfolders = true,
      pagination = { page: 1, pageSize: 100 },
      sort = { field: 'name', direction: 'asc' }
    } = options;

    try {
      const contents = {
        folders: [],
        documents: [],
        totalFolders: 0,
        totalDocuments: 0
      };

      // Get subfolders
      if (includeSubfolders) {
        const subfoldersResult = await this.getFoldersByUser(userId, {
          organizationId,
          parentId: id,
          pagination,
          sort
        });

        if (subfoldersResult.success) {
          contents.folders = subfoldersResult.data;
          contents.totalFolders = subfoldersResult.count || 0;
        }
      }

      // Get documents (would use DocumentService)
      if (includeDocuments) {
        // Placeholder - would call DocumentService.getDocumentsByFolder()
        this.log(`Getting documents for folder: ${id}`);
        contents.documents = [];
        contents.totalDocuments = 0;
      }

      return {
        success: true,
        data: contents
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CONTENT_ERROR',
          message: error.message
        }
      };
    }
  }

  /**
   * Share folder with other users
   * @param {string} id - Folder ID
   * @param {Object} shareSettings - Share settings
   * @param {Object} options - Share options
   * @returns {Object} Share result
   */
  async shareFolder(id, shareSettings, options = {}) {
    const {
      organizationId = null,
      userId = null
    } = options;

    // Validate share settings
    const validatedSettings = this.validateShareSettings(shareSettings);
    if (!validatedSettings.success) {
      return validatedSettings;
    }

    const updateData = {
      is_shared: true,
      share_settings: validatedSettings.data,
      shared_at: new Date().toISOString()
    };

    return this.updateFolder(id, updateData, { organizationId, userId });
  }

  /**
   * Unshare folder
   * @param {string} id - Folder ID
   * @param {Object} options - Unshare options
   * @returns {Object} Unshare result
   */
  async unshareFolder(id, options = {}) {
    const {
      organizationId = null,
      userId = null
    } = options;

    const updateData = {
      is_shared: false,
      share_settings: null,
      shared_at: null
    };

    return this.updateFolder(id, updateData, { organizationId, userId });
  }

  /**
   * Get folder statistics
   * @param {string} organizationId - Organization ID
   * @param {string} userId - User ID (optional)
   * @returns {Object} Folder statistics
   */
  async getFolderStats(organizationId, userId = null) {
    try {
      const filters = { organization_id: organizationId };
      if (userId) {
        filters.user_id = userId;
      }

      const stats = {
        totalFolders: 0,
        sharedFolders: 0,
        privateFolders: 0,
        systemFolders: 0,
        maxDepth: 0,
        foldersWithDocuments: 0,
        emptyFolders: 0
      };

      // Get basic counts
      const totalResult = await this.count(filters);
      if (totalResult.success) {
        stats.totalFolders = totalResult.count;
      }

      const sharedResult = await this.count({ ...filters, is_shared: true });
      if (sharedResult.success) {
        stats.sharedFolders = sharedResult.count;
      }

      const systemResult = await this.count({ ...filters, is_system: true });
      if (systemResult.success) {
        stats.systemFolders = systemResult.count;
      }

      stats.privateFolders = stats.totalFolders - stats.sharedFolders;

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
   * Validate folder move operation
   * @param {string} folderId - Folder being moved
   * @param {string} newParentId - New parent folder ID
   * @param {string} organizationId - Organization ID
   * @returns {Object} Validation result
   */
  async validateFolderMove(folderId, newParentId, organizationId) {
    // Check for circular reference
    if (newParentId) {
      const circularCheck = await this.checkCircularReference(newParentId, folderId, organizationId);
      if (!circularCheck.success) {
        return circularCheck;
      }
    }

    // Check if new parent exists
    if (newParentId) {
      const parentResult = await this.getFolder(newParentId, { organizationId });
      if (!parentResult.success) {
        return {
          success: false,
          error: {
            code: 'INVALID_PARENT',
            message: 'Target parent folder not found'
          }
        };
      }
    }

    // Check for name conflicts at destination
    const currentFolder = await this.getFolder(folderId, { organizationId });
    if (currentFolder.success) {
      const duplicateCheck = await this.checkDuplicateName(
        currentFolder.data.name,
        newParentId,
        organizationId,
        folderId
      );
      
      if (!duplicateCheck.success) {
        return duplicateCheck;
      }
    }

    return { success: true };
  }

  /**
   * Check for circular reference in folder hierarchy
   * @param {string} parentId - Parent folder ID
   * @param {string} childId - Child folder ID
   * @param {string} organizationId - Organization ID
   * @returns {Object} Check result
   */
  async checkCircularReference(parentId, childId, organizationId) {
    try {
      let currentId = parentId;
      const visited = new Set();

      while (currentId) {
        if (currentId === childId || visited.has(currentId)) {
          return {
            success: false,
            error: {
              code: 'CIRCULAR_REFERENCE',
              message: 'Operation would create a circular reference in folder hierarchy'
            }
          };
        }

        visited.add(currentId);

        const folderResult = await this.getFolder(currentId, { organizationId });
        if (!folderResult.success) {
          break;
        }

        currentId = folderResult.data.parent_id;
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CIRCULAR_CHECK_ERROR',
          message: error.message
        }
      };
    }
  }

  /**
   * Check for duplicate folder name at same level
   * @param {string} name - Folder name
   * @param {string} parentId - Parent folder ID
   * @param {string} organizationId - Organization ID
   * @param {string} excludeId - Folder ID to exclude from check
   * @returns {Object} Check result
   */
  async checkDuplicateName(name, parentId, organizationId, excludeId = null) {
    return this.executeQuery(async () => {
      let query = this.getAnonClient()
        .from(this.tableName)
        .select('id')
        .eq('organization_id', organizationId)
        .eq('name', name.trim());

      if (parentId) {
        query = query.eq('parent_id', parentId);
      } else {
        query = query.is('parent_id', null);
      }

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      query = this.applySoftDeleteFilter(query);

      const result = await query.single();
      
      if (result) {
        return {
          success: false,
          error: {
            code: 'DUPLICATE_NAME',
            message: 'A folder with this name already exists at this location'
          }
        };
      }

      return { success: true };
    }, 'CHECK_DUPLICATE_NAME');
  }

  /**
   * Calculate folder path from parent chain
   * @param {string} parentId - Parent folder ID
   * @param {string} organizationId - Organization ID
   * @returns {Object} Path calculation result
   */
  async calculateFolderPath(parentId, organizationId) {
    try {
      const pathSegments = [];
      let currentId = parentId;
      let depth = 0;

      while (currentId && depth < 20) { // Safety limit
        const folderResult = await this.getFolder(currentId, { organizationId });
        if (!folderResult.success) {
          break;
        }

        pathSegments.unshift(folderResult.data.name);
        currentId = folderResult.data.parent_id;
        depth++;
      }

      return {
        success: true,
        data: {
          path: pathSegments.join('/'),
          depth: depth
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PATH_CALCULATION_ERROR',
          message: error.message
        }
      };
    }
  }

  /**
   * Helper method to check if user can access folder
   * @param {Object} folder - Folder object
   * @param {string} userId - User ID
   * @returns {boolean} Access allowed
   */
  canUserAccessFolder(folder, userId) {
    return folder.user_id === userId || 
           folder.is_shared || 
           folder.visibility === 'public';
  }

  /**
   * Helper method to check if user can edit folder
   * @param {Object} folder - Folder object
   * @param {string} userId - User ID
   * @returns {boolean} Edit allowed
   */
  canUserEditFolder(folder, userId) {
    if (folder.user_id === userId) {
      return true;
    }

    if (folder.is_shared && folder.share_settings?.allowEdit) {
      return true;
    }

    return false;
  }

  /**
   * Build hierarchical folder tree from flat array
   * @param {Array} folders - Flat array of folders
   * @param {string} rootId - Root folder ID
   * @param {number} maxDepth - Maximum depth to include
   * @returns {Array} Tree structure
   */
  buildFolderTree(folders, rootId = null, maxDepth = 5) {
    const folderMap = new Map(folders.map(f => [f.id, { ...f, children: [] }]));
    const tree = [];

    folders.forEach(folder => {
      if ((folder.depth || 0) > maxDepth) return;

      const folderNode = folderMap.get(folder.id);
      
      if (folder.parent_id === rootId) {
        tree.push(folderNode);
      } else if (folderMap.has(folder.parent_id)) {
        folderMap.get(folder.parent_id).children.push(folderNode);
      }
    });

    return tree;
  }

  /**
   * Get all folders for organization
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Object} All folders
   */
  async getAllFolders(organizationId, options = {}) {
    const { userId = null } = options;

    const filters = { organization_id: organizationId };
    
    if (userId) {
      filters.or = `user_id.eq.${userId},is_shared.eq.true`;
    }

    return this.getMany(filters, {
      pagination: { page: 1, pageSize: 1000 }, // Large page size for tree building
      sort: { field: 'path', direction: 'asc' },
      select: '*'
    });
  }

  /**
   * Get folder additional data
   * @param {string} id - Folder ID
   * @param {Object} options - Data options
   * @returns {Object} Additional data
   */
  async getFolderAdditionalData(id, options = {}) {
    const { includeChildren = false, includeContentCounts = false, includeParentChain = false } = options;
    
    const additionalData = {};

    if (includeChildren) {
      const childrenResult = await this.getFoldersByUser(null, {
        ...options,
        parentId: id
      });
      
      if (childrenResult.success) {
        additionalData.children = childrenResult.data;
        additionalData.childCount = childrenResult.count || 0;
      }
    }

    if (includeContentCounts) {
      // Would query document counts - placeholder
      additionalData.documentCount = 0;
      additionalData.totalSize = 0;
    }

    if (includeParentChain) {
      // Would build parent chain - placeholder
      additionalData.parentChain = [];
    }

    return {
      success: true,
      data: additionalData
    };
  }

  /**
   * Update descendant folder paths after parent move
   * @param {string} folderId - Parent folder ID
   * @param {string} newBasePath - New base path
   * @param {string} organizationId - Organization ID
   */
  async updateDescendantPaths(folderId, newBasePath, organizationId) {
    // This would update all descendant folder paths
    // Implementation would use recursive CTE or batch updates
    this.log(`Updating descendant paths for folder: ${folderId} with base: ${newBasePath}`);
  }

  /**
   * Update folder paths after name or parent change
   * @param {string} folderId - Folder ID
   * @param {Object} updateData - Update data
   * @param {string} organizationId - Organization ID
   */
  async updateFolderPaths(folderId, updateData, organizationId) {
    // This would recalculate and update folder paths
    this.log(`Updating folder paths for: ${folderId}`);
    return { success: true };
  }

  /**
   * Validate share settings
   * @param {Object} shareSettings - Share settings to validate
   * @returns {Object} Validation result
   */
  validateShareSettings(shareSettings) {
    const validSettings = {
      allowEdit: shareSettings.allowEdit === true,
      allowAdd: shareSettings.allowAdd === true,
      allowDelete: shareSettings.allowDelete === true,
      expiresAt: shareSettings.expiresAt || null
    };

    // Validate expiration date
    if (validSettings.expiresAt) {
      const expirationDate = new Date(validSettings.expiresAt);
      if (isNaN(expirationDate.getTime()) || expirationDate <= new Date()) {
        return {
          success: false,
          error: {
            code: 'INVALID_EXPIRATION',
            message: 'Expiration date must be a valid future date'
          }
        };
      }
    }

    return {
      success: true,
      data: validSettings
    };
  }

  /**
   * Override update to invalidate folder tree cache
   * @param {string} id - Record ID
   * @param {Object} data - Update data
   * @param {Object} options - Update options
   * @returns {Object} Updated record or error
   */
  async update(id, data, options = {}) {
    const result = await super.update(id, data, options);
    
    // Invalidate folder tree cache on successful update
    if (result.success && this.options.enableCaching && options.organizationId) {
      await this.invalidateFolderTreeCache(options.organizationId);
    }
    
    return result;
  }

  /**
   * Override delete to invalidate folder tree cache
   * @param {string} id - Record ID
   * @param {Object} options - Delete options
   * @returns {Object} Delete result or error
   */
  async delete(id, options = {}) {
    const result = await super.delete(id, options);
    
    // Invalidate folder tree cache on successful delete
    if (result.success && this.options.enableCaching && options.organizationId) {
      await this.invalidateFolderTreeCache(options.organizationId);
    }
    
    return result;
  }

  /**
   * Invalidate folder tree cache for organization
   * @param {string} organizationId - Organization ID
   */
  async invalidateFolderTreeCache(organizationId) {
    try {
      const patterns = [
        cacheKeys.folder.tree(organizationId) + '*',
        cacheKeys.folder.pattern() + '*tree*',
        `${this.tableName}:getAllFolders:*organizationId_${organizationId}*`
      ];

      let totalDeleted = 0;
      for (const pattern of patterns) {
        totalDeleted += await this.invalidateCache(pattern);
      }

      this.log(`Invalidated ${totalDeleted} folder tree cache entries for org ${organizationId}`);
      return totalDeleted;
    } catch (error) {
      this.log(`Error invalidating folder tree cache: ${error.message}`, 'warn');
      return 0;
    }
  }
}

export default FolderService;