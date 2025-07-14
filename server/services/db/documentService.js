/**
 * Document Service for Tala AI
 * 
 * Handles all database operations for documents including:
 * - Document CRUD operations with organization filtering
 * - File upload and metadata management
 * - Document search and filtering
 * - Vector embedding integration
 * - Tag management and relationships
 * - Folder organization
 */

import { BaseService } from './baseService.js';

export class DocumentService extends BaseService {
  constructor(options = {}) {
    super('documents', {
      enableSoftDelete: true,
      enableLogging: true,
      ...options
    });
  }

  /**
   * Create a new document
   * @param {Object} data - Document data
   * @param {Object} options - Creation options
   * @returns {Object} Created document or error
   */
  async createDocument(data, options = {}) {
    const {
      generateEmbeddings = false,
      extractContent = true,
      autoTag = false
    } = options;

    // Validate required fields
    if (!data.organization_id || !data.user_id || !data.title) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Organization ID, user ID, and title are required'
        }
      };
    }

    try {
      const transaction = await this.beginTransaction();

      // Prepare document data with defaults
      const documentData = {
        organization_id: data.organization_id,
        user_id: data.user_id,
        title: data.title,
        description: data.description || null,
        file_name: data.file_name || null,
        file_path: data.file_path || null,
        file_url: data.file_url || null,
        file_size: data.file_size || null,
        file_type: data.file_type || null,
        mime_type: data.mime_type || null,
        content: data.content || null,
        content_type: data.content_type || 'text',
        content_preview: data.content_preview || this.generatePreview(data.content),
        word_count: data.word_count || this.calculateWordCount(data.content),
        character_count: data.character_count || this.calculateCharacterCount(data.content),
        language: data.language || 'en',
        status: data.status || 'active',
        visibility: data.visibility || 'private',
        folder_id: data.folder_id || null,
        version: data.version || '1.0',
        checksum: data.checksum || null,
        embedding_status: generateEmbeddings ? 'pending' : 'none',
        vector_embedding: data.vector_embedding || null,
        metadata: data.metadata || {},
        search_vector: null, // Will be generated from content
        processing_status: data.processing_status || 'completed',
        extraction_metadata: data.extraction_metadata || {}
      };

      // Generate search vector from content if available
      if (documentData.content) {
        documentData.search_vector = this.generateSearchVector(documentData.content, documentData.title);
      }

      // Create document
      const docResult = await this.create(documentData, { 
        organizationId: data.organization_id 
      });

      if (!docResult.success) {
        await this.rollbackTransaction(transaction);
        return docResult;
      }

      const document = docResult.data[0];

      // Process document if needed
      if (generateEmbeddings) {
        await this.queueEmbeddingGeneration(document.id);
      }

      if (autoTag) {
        await this.generateAutoTags(document.id, document.content);
      }

      await this.commitTransaction(transaction);

      this.log(`Created document: ${document.title} (${document.id}) for user ${data.user_id}`);

      return {
        success: true,
        data: document,
        metadata: {
          embeddingsQueued: generateEmbeddings,
          autoTagged: autoTag,
          transaction: transaction.transactionId
        }
      };

    } catch (error) {
      this.log(`Failed to create document: ${error.message}`, 'error');
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
   * Get document by ID
   * @param {string} id - Document ID
   * @param {Object} options - Query options
   * @returns {Object} Document or error
   */
  async getDocument(id, options = {}) {
    const {
      organizationId = null,
      userId = null,
      includeContent = true,
      includeTags = false,
      includeVersions = false
    } = options;

    let select = includeContent ? '*' : `
      id, organization_id, user_id, title, description,
      file_name, file_path, file_url, file_size, file_type, mime_type,
      content_type, content_preview, word_count, character_count,
      language, status, visibility, folder_id, version, checksum,
      embedding_status, processing_status, metadata,
      created_at, updated_at, last_accessed_at
    `;

    const result = await this.getById(id, { 
      organizationId,
      select
    });

    if (!result.success) {
      return result;
    }

    let document = result.data;

    // Apply user filter if specified and document is private
    if (userId && document.visibility === 'private' && document.user_id !== userId) {
      return {
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'User does not have access to this document'
        }
      };
    }

    // Add additional data if requested
    if (includeTags || includeVersions) {
      const additionalData = await this.getDocumentAdditionalData(id, {
        includeTags,
        includeVersions,
        organizationId
      });

      if (additionalData.success) {
        Object.assign(document, additionalData.data);
      }
    }

    // Update last accessed timestamp
    await this.updateLastAccessed(id, organizationId);

    return {
      success: true,
      data: document
    };
  }

  /**
   * Get documents by user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Object} Documents list or error
   */
  async getDocumentsByUser(userId, options = {}) {
    const {
      organizationId = null,
      pagination = { page: 1, pageSize: 20 },
      sort = { field: 'updated_at', direction: 'desc' },
      search = {},
      filters = {},
      includeContent = false
    } = options;

    // Add user filter
    const userFilters = {
      user_id: userId,
      ...filters
    };

    // Define searchable fields
    if (search.term) {
      search.fields = search.fields || ['title', 'description', 'content_preview'];
    }

    const select = includeContent ? '*' : `
      id, organization_id, user_id, title, description,
      file_name, file_size, file_type, mime_type,
      content_type, content_preview, word_count,
      status, visibility, folder_id, version,
      embedding_status, processing_status,
      created_at, updated_at, last_accessed_at
    `;

    return this.getMany(userFilters, {
      organizationId,
      pagination,
      sort,
      search,
      select
    });
  }

  /**
   * Search documents with full-text search
   * @param {string} organizationId - Organization ID
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options
   * @returns {Object} Search results
   */
  async searchDocuments(organizationId, searchTerm, options = {}) {
    const {
      userId = null,
      pagination = { page: 1, pageSize: 20 },
      filters = {},
      includeContent = false,
      searchType = 'standard' // 'standard', 'semantic', 'hybrid'
    } = options;

    const searchFilters = {
      organization_id: organizationId,
      ...filters
    };

    if (userId) {
      // Include user's private documents and all public documents
      searchFilters.or = `user_id.eq.${userId},visibility.eq.public`;
    } else {
      // Only public documents for unauthenticated search
      searchFilters.visibility = 'public';
    }

    if (searchType === 'semantic' && searchTerm) {
      // Would implement semantic search using vector embeddings
      return this.semanticSearch(organizationId, searchTerm, options);
    } else {
      // Standard full-text search
      return this.executeQuery(async () => {
        let query = this.getAnonClient()
          .from(this.tableName)
          .select(includeContent ? '*' : this.getDocumentPreviewFields())
          .textSearch('search_vector', searchTerm, {
            type: 'websearch',
            config: 'english'
          });

        // Apply organization filter
        query = query.eq('organization_id', organizationId);

        // Apply user visibility filter
        if (userId) {
          query = query.or(`user_id.eq.${userId},visibility.eq.public`);
        } else {
          query = query.eq('visibility', 'public');
        }

        // Apply additional filters
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== null && value !== undefined && key !== 'or') {
            query = query.eq(key, value);
          }
        });

        // Apply soft delete filter
        query = this.applySoftDeleteFilter(query);

        // Apply pagination
        query = this.applyPagination(query, pagination);

        // Sort by relevance, then by updated_at
        query = query.order('updated_at', { ascending: false });

        return query;
      }, 'SEARCH_DOCUMENTS');
    }
  }

  /**
   * Semantic search using vector embeddings
   * @param {string} organizationId - Organization ID
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options
   * @returns {Object} Semantic search results
   */
  async semanticSearch(organizationId, searchTerm, options = {}) {
    try {
      // This would require generating an embedding for the search term
      // and using vector similarity search (e.g., cosine similarity)
      
      this.log(`Semantic search requested for: "${searchTerm}" in org ${organizationId}`);
      
      // Placeholder implementation - would use actual vector search
      const standardResults = await this.searchDocuments(organizationId, searchTerm, {
        ...options,
        searchType: 'standard'
      });

      return {
        ...standardResults,
        metadata: {
          ...standardResults.metadata,
          searchType: 'semantic',
          note: 'Semantic search not fully implemented - falling back to standard search'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SEMANTIC_SEARCH_ERROR',
          message: error.message
        }
      };
    }
  }

  /**
   * Update document
   * @param {string} id - Document ID
   * @param {Object} data - Update data
   * @param {Object} options - Update options
   * @returns {Object} Updated document or error
   */
  async updateDocument(id, data, options = {}) {
    const {
      organizationId = null,
      userId = null,
      updateVersion = false,
      regenerateEmbeddings = false
    } = options;

    // If userId provided, verify ownership or public visibility
    if (userId) {
      const existingDoc = await this.getDocument(id, { organizationId, userId, includeContent: false });
      if (!existingDoc.success) {
        return existingDoc;
      }
    }

    // Update content-related fields if content is being changed
    if (data.content !== undefined) {
      data.word_count = this.calculateWordCount(data.content);
      data.character_count = this.calculateCharacterCount(data.content);
      data.content_preview = this.generatePreview(data.content);
      data.search_vector = this.generateSearchVector(data.content, data.title || '');
      
      if (regenerateEmbeddings) {
        data.embedding_status = 'pending';
      }
    }

    // Update version if requested
    if (updateVersion) {
      const currentDoc = await this.getDocument(id, { organizationId, includeContent: false });
      if (currentDoc.success) {
        const currentVersion = parseFloat(currentDoc.data.version || '1.0');
        data.version = (currentVersion + 0.1).toFixed(1);
      }
    }

    const result = await this.update(id, data, { organizationId });

    if (result.success) {
      this.log(`Updated document: ${id}`);
      
      // Queue embedding generation if needed
      if (regenerateEmbeddings) {
        await this.queueEmbeddingGeneration(id);
      }
    }

    return result;
  }

  /**
   * Get documents by folder
   * @param {string} folderId - Folder ID
   * @param {Object} options - Query options
   * @returns {Object} Documents in folder
   */
  async getDocumentsByFolder(folderId, options = {}) {
    const {
      organizationId = null,
      userId = null,
      pagination = { page: 1, pageSize: 50 },
      sort = { field: 'title', direction: 'asc' }
    } = options;

    const filters = { folder_id: folderId };
    
    // Apply user visibility filter
    if (userId) {
      filters.or = `user_id.eq.${userId},visibility.eq.public`;
    } else {
      filters.visibility = 'public';
    }

    return this.getMany(filters, {
      organizationId,
      pagination,
      sort,
      select: this.getDocumentPreviewFields()
    });
  }

  /**
   * Move document to folder
   * @param {string} id - Document ID
   * @param {string} folderId - Target folder ID (null to remove from folder)
   * @param {Object} options - Move options
   * @returns {Object} Move result
   */
  async moveDocumentToFolder(id, folderId, options = {}) {
    const {
      organizationId = null,
      userId = null
    } = options;

    return this.updateDocument(id, {
      folder_id: folderId,
      moved_at: new Date().toISOString()
    }, { organizationId, userId });
  }

  /**
   * Add tags to document
   * @param {string} documentId - Document ID
   * @param {Array} tagIds - Array of tag IDs
   * @param {Object} options - Tagging options
   * @returns {Object} Tagging result
   */
  async addDocumentTags(documentId, tagIds, options = {}) {
    const { organizationId = null } = options;

    try {
      // This would insert into document_tags junction table
      this.log(`Adding tags to document: ${documentId}, tags: ${tagIds.join(', ')}`);
      
      // Placeholder implementation
      return {
        success: true,
        data: {
          documentId,
          tagsAdded: tagIds.length,
          tags: tagIds
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TAGGING_ERROR',
          message: error.message
        }
      };
    }
  }

  /**
   * Update document visibility
   * @param {string} id - Document ID
   * @param {string} visibility - New visibility ('private', 'public', 'organization')
   * @param {Object} options - Update options
   * @returns {Object} Update result
   */
  async updateDocumentVisibility(id, visibility, options = {}) {
    const validVisibilities = ['private', 'public', 'organization'];
    
    if (!validVisibilities.includes(visibility)) {
      return {
        success: false,
        error: {
          code: 'INVALID_VISIBILITY',
          message: `Visibility must be one of: ${validVisibilities.join(', ')}`
        }
      };
    }

    return this.updateDocument(id, { 
      visibility,
      visibility_updated_at: new Date().toISOString()
    }, options);
  }

  /**
   * Get document statistics
   * @param {string} organizationId - Organization ID
   * @param {string} userId - User ID (optional)
   * @returns {Object} Document statistics
   */
  async getDocumentStats(organizationId, userId = null) {
    try {
      const filters = { organization_id: organizationId };
      if (userId) {
        filters.user_id = userId;
      }

      const stats = {
        totalDocuments: 0,
        publicDocuments: 0,
        privateDocuments: 0,
        totalFileSize: 0,
        totalWordCount: 0,
        documentsByType: {},
        documentsWithEmbeddings: 0,
        documentsLastWeek: 0,
        documentsLastMonth: 0
      };

      // Get basic counts
      const totalResult = await this.count(filters);
      if (totalResult.success) {
        stats.totalDocuments = totalResult.count;
      }

      const publicResult = await this.count({ ...filters, visibility: 'public' });
      if (publicResult.success) {
        stats.publicDocuments = publicResult.count;
      }

      const privateResult = await this.count({ ...filters, visibility: 'private' });
      if (privateResult.success) {
        stats.privateDocuments = privateResult.count;
      }

      const embeddingResult = await this.count({ ...filters, embedding_status: 'completed' });
      if (embeddingResult.success) {
        stats.documentsWithEmbeddings = embeddingResult.count;
      }

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
   * Get document additional data
   * @param {string} id - Document ID
   * @param {Object} options - Data options
   * @returns {Object} Additional data
   */
  async getDocumentAdditionalData(id, options = {}) {
    const { includeTags = false, includeVersions = false } = options;
    
    const additionalData = {};

    if (includeTags) {
      // Would query document_tags table - placeholder for now
      additionalData.tags = [];
    }

    if (includeVersions) {
      // Would query document versions - placeholder for now
      additionalData.versions = [];
    }

    return {
      success: true,
      data: additionalData
    };
  }

  /**
   * Update last accessed timestamp
   * @param {string} id - Document ID
   * @param {string} organizationId - Organization ID
   */
  async updateLastAccessed(id, organizationId) {
    try {
      await this.update(id, {
        last_accessed_at: new Date().toISOString(),
        access_count: this.getClient().rpc('increment_access_count', { document_id: id })
      }, { organizationId, returnData: false });
    } catch (error) {
      // Non-critical operation - log but don't fail
      this.log(`Failed to update last accessed for document ${id}: ${error.message}`, 'warn');
    }
  }

  /**
   * Queue embedding generation for document
   * @param {string} documentId - Document ID
   */
  async queueEmbeddingGeneration(documentId) {
    try {
      this.log(`Queuing embedding generation for document: ${documentId}`);
      // Would integrate with embedding service/queue
      return { success: true, queued: true };
    } catch (error) {
      this.log(`Failed to queue embedding generation: ${error.message}`, 'warn');
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate auto tags for document
   * @param {string} documentId - Document ID
   * @param {string} content - Document content
   */
  async generateAutoTags(documentId, content) {
    try {
      this.log(`Generating auto tags for document: ${documentId}`);
      // Would integrate with AI tagging service
      return { success: true, tags: [] };
    } catch (error) {
      this.log(`Failed to generate auto tags: ${error.message}`, 'warn');
      return { success: false, error: error.message };
    }
  }

  /**
   * Get document preview fields
   * @returns {string} Field selection string
   */
  getDocumentPreviewFields() {
    return `
      id, organization_id, user_id, title, description,
      file_name, file_size, file_type, mime_type,
      content_type, content_preview, word_count, character_count,
      status, visibility, folder_id, version,
      embedding_status, processing_status,
      created_at, updated_at, last_accessed_at
    `;
  }

  /**
   * Generate content preview
   * @param {string} content - Full content
   * @returns {string} Preview text
   */
  generatePreview(content) {
    if (!content) return null;
    
    const maxLength = 500;
    const cleaned = content.replace(/\s+/g, ' ').trim();
    
    if (cleaned.length <= maxLength) {
      return cleaned;
    }
    
    return cleaned.substring(0, maxLength).trim() + '...';
  }

  /**
   * Calculate word count
   * @param {string} content - Content to count
   * @returns {number} Word count
   */
  calculateWordCount(content) {
    if (!content) return 0;
    return content.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Calculate character count
   * @param {string} content - Content to count
   * @returns {number} Character count
   */
  calculateCharacterCount(content) {
    if (!content) return 0;
    return content.length;
  }

  /**
   * Generate search vector for full-text search
   * @param {string} content - Document content
   * @param {string} title - Document title
   * @returns {string} Search vector content
   */
  generateSearchVector(content, title) {
    // Combine title and content for search, giving title higher weight
    const titleWeight = title ? `${title} ${title} ` : '';
    const contentText = content || '';
    return `${titleWeight}${contentText}`;
  }
}

export default DocumentService;