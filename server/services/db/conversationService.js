/**
 * Conversation Service for Tala AI
 * 
 * Handles all database operations for conversations including:
 * - Conversation CRUD operations with organization filtering
 * - Message management and retrieval
 * - Conversation search and filtering
 * - Recent conversations and history
 * - LLM metadata tracking
 */

import { BaseService } from './baseService.js';

export class ConversationService extends BaseService {
  constructor(options = {}) {
    super('conversations', {
      enableSoftDelete: true,
      enableLogging: true,
      ...options
    });
  }

  /**
   * Create a new conversation
   * @param {Object} data - Conversation data
   * @param {Object} options - Creation options
   * @returns {Object} Created conversation or error
   */
  async createConversation(data, options = {}) {
    const {
      createInitialMessage = false,
      initialMessageContent = null
    } = options;

    // Validate required fields
    if (!data.organization_id || !data.user_id) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Organization ID and user ID are required'
        }
      };
    }

    try {
      const transaction = await this.beginTransaction();

      // Prepare conversation data with defaults
      const conversationData = {
        organization_id: data.organization_id,
        user_id: data.user_id,
        title: data.title || 'New Conversation',
        description: data.description || null,
        status: data.status || 'active',
        llm_model: data.llm_model || null,
        llm_temperature: data.llm_temperature || 0.7,
        llm_max_tokens: data.llm_max_tokens || 1000,
        conversation_type: data.conversation_type || 'chat',
        folder_id: data.folder_id || null,
        tags: data.tags || [],
        metadata: data.metadata || {},
        settings: data.settings || {
          autoTitle: true,
          saveHistory: true,
          shareSettings: {
            isPublic: false,
            allowComments: false
          }
        }
      };

      // Create conversation
      const convResult = await this.create(conversationData, { 
        organizationId: data.organization_id 
      });

      if (!convResult.success) {
        await this.rollbackTransaction(transaction);
        return convResult;
      }

      const conversation = convResult.data[0];

      // Create initial message if requested
      if (createInitialMessage && initialMessageContent) {
        await this.createInitialMessage(conversation.id, initialMessageContent, data.organization_id);
      }

      await this.commitTransaction(transaction);

      this.log(`Created conversation: ${conversation.title} (${conversation.id}) for user ${data.user_id}`);

      return {
        success: true,
        data: conversation,
        metadata: {
          initialMessageCreated: createInitialMessage,
          transaction: transaction.transactionId
        }
      };

    } catch (error) {
      this.log(`Failed to create conversation: ${error.message}`, 'error');
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
   * Get conversation by ID
   * @param {string} id - Conversation ID
   * @param {Object} options - Query options
   * @returns {Object} Conversation or error
   */
  async getConversation(id, options = {}) {
    const {
      organizationId = null,
      userId = null,
      includeMessages = false,
      includeMessageCount = true,
      includeTags = false
    } = options;

    const result = await this.getById(id, { 
      organizationId,
      select: '*'
    });

    if (!result.success) {
      return result;
    }

    let conversation = result.data;

    // Apply user filter if specified
    if (userId && conversation.user_id !== userId) {
      return {
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'User does not have access to this conversation'
        }
      };
    }

    // Add additional data if requested
    if (includeMessages || includeMessageCount || includeTags) {
      const additionalData = await this.getConversationAdditionalData(id, {
        includeMessages,
        includeMessageCount,
        includeTags,
        organizationId
      });

      if (additionalData.success) {
        Object.assign(conversation, additionalData.data);
      }
    }

    return {
      success: true,
      data: conversation
    };
  }

  /**
   * Get conversations by user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Object} Conversations list or error
   */
  async getConversationsByUser(userId, options = {}) {
    const {
      organizationId = null,
      pagination = { page: 1, pageSize: 20 },
      sort = { field: 'updated_at', direction: 'desc' },
      search = {},
      filters = {},
      includeMessageCount = true
    } = options;

    // Add user filter
    const userFilters = {
      user_id: userId,
      ...filters
    };

    // Define searchable fields
    if (search.term) {
      search.fields = search.fields || ['title', 'description'];
    }

    const result = await this.getMany(userFilters, {
      organizationId,
      pagination,
      sort,
      search,
      select: '*'
    });

    if (result.success && includeMessageCount) {
      // Add message count for each conversation
      for (const conversation of result.data) {
        const messageCount = await this.getMessageCount(conversation.id);
        if (messageCount.success) {
          conversation.message_count = messageCount.data.count;
        } else {
          conversation.message_count = 0;
        }
      }
    }

    return result;
  }

  /**
   * Get recent conversations by user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Object} Recent conversations or error
   */
  async getRecentConversations(userId, options = {}) {
    const {
      organizationId = null,
      limit = 10,
      includeMessageCount = true,
      daysBack = 30
    } = options;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    return this.executeQuery(async () => {
      let query = this.getAnonClient()
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .gte('updated_at', cutoffDate.toISOString())
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      query = this.applySoftDeleteFilter(query);

      return query;
    }, 'GET_RECENT_CONVERSATIONS');
  }

  /**
   * Update conversation
   * @param {string} id - Conversation ID
   * @param {Object} data - Update data
   * @param {Object} options - Update options
   * @returns {Object} Updated conversation or error
   */
  async updateConversation(id, data, options = {}) {
    const {
      organizationId = null,
      userId = null,
      updateLastActivity = true
    } = options;

    // Update last activity timestamp if requested
    if (updateLastActivity) {
      data.last_activity_at = new Date().toISOString();
    }

    // Validate LLM parameters if being updated
    if (data.llm_temperature !== undefined) {
      if (data.llm_temperature < 0 || data.llm_temperature > 2) {
        return {
          success: false,
          error: {
            code: 'INVALID_TEMPERATURE',
            message: 'LLM temperature must be between 0 and 2'
          }
        };
      }
    }

    if (data.llm_max_tokens !== undefined) {
      if (data.llm_max_tokens < 1 || data.llm_max_tokens > 4000) {
        return {
          success: false,
          error: {
            code: 'INVALID_MAX_TOKENS',
            message: 'LLM max tokens must be between 1 and 4000'
          }
        };
      }
    }

    // If userId provided, verify ownership before update
    if (userId) {
      const existingConv = await this.getConversation(id, { organizationId, userId });
      if (!existingConv.success) {
        return existingConv;
      }
    }

    const result = await this.update(id, data, { organizationId });

    if (result.success) {
      this.log(`Updated conversation: ${id}`);
    }

    return result;
  }

  /**
   * Update conversation title (auto-generated or manual)
   * @param {string} id - Conversation ID
   * @param {string} title - New title
   * @param {Object} options - Update options
   * @returns {Object} Update result
   */
  async updateConversationTitle(id, title, options = {}) {
    const {
      organizationId = null,
      userId = null,
      markAsManual = false
    } = options;

    const updateData = {
      title: title.trim(),
      last_activity_at: new Date().toISOString()
    };

    // Mark as manually set if requested
    if (markAsManual) {
      updateData.metadata = {
        titleManuallySet: true,
        titleUpdatedAt: new Date().toISOString()
      };
    }

    return this.updateConversation(id, updateData, { organizationId, userId });
  }

  /**
   * Archive conversation
   * @param {string} id - Conversation ID
   * @param {Object} options - Archive options
   * @returns {Object} Archive result
   */
  async archiveConversation(id, options = {}) {
    const {
      organizationId = null,
      userId = null
    } = options;

    return this.updateConversation(id, {
      status: 'archived',
      archived_at: new Date().toISOString()
    }, { organizationId, userId });
  }

  /**
   * Search conversations
   * @param {string} organizationId - Organization ID
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options
   * @returns {Object} Search results
   */
  async searchConversations(organizationId, searchTerm, options = {}) {
    const {
      userId = null,
      pagination = { page: 1, pageSize: 20 },
      filters = {},
      includeMessages = false
    } = options;

    const searchFilters = {
      organization_id: organizationId,
      ...filters
    };

    if (userId) {
      searchFilters.user_id = userId;
    }

    return this.getMany(searchFilters, {
      pagination,
      search: {
        term: searchTerm,
        fields: ['title', 'description']
      },
      sort: { field: 'updated_at', direction: 'desc' },
      select: '*'
    });
  }

  /**
   * Get conversation statistics
   * @param {string} organizationId - Organization ID
   * @param {string} userId - User ID (optional)
   * @returns {Object} Conversation statistics
   */
  async getConversationStats(organizationId, userId = null) {
    try {
      // This would typically involve aggregate queries
      const filters = { organization_id: organizationId };
      if (userId) {
        filters.user_id = userId;
      }

      const stats = {
        totalConversations: 0,
        activeConversations: 0,
        archivedConversations: 0,
        totalMessages: 0,
        averageMessagesPerConversation: 0,
        mostUsedLLMModel: null,
        conversationsLastWeek: 0,
        conversationsLastMonth: 0
      };

      // Get basic counts
      const totalResult = await this.count(filters);
      if (totalResult.success) {
        stats.totalConversations = totalResult.count;
      }

      const activeResult = await this.count({ ...filters, status: 'active' });
      if (activeResult.success) {
        stats.activeConversations = activeResult.count;
      }

      const archivedResult = await this.count({ ...filters, status: 'archived' });
      if (archivedResult.success) {
        stats.archivedConversations = archivedResult.count;
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
   * Get conversation additional data
   * @param {string} id - Conversation ID
   * @param {Object} options - Data options
   * @returns {Object} Additional data
   */
  async getConversationAdditionalData(id, options = {}) {
    const { includeMessages = false, includeMessageCount = false, includeTags = false } = options;
    
    const additionalData = {};

    if (includeMessageCount) {
      const messageCount = await this.getMessageCount(id);
      if (messageCount.success) {
        additionalData.message_count = messageCount.data.count;
      } else {
        additionalData.message_count = 0;
      }
    }

    if (includeMessages) {
      // Would query message service - placeholder for now
      additionalData.messages = [];
    }

    if (includeTags) {
      // Would query tag relationships - placeholder for now
      additionalData.tags = [];
    }

    return {
      success: true,
      data: additionalData
    };
  }

  /**
   * Get message count for conversation
   * @param {string} conversationId - Conversation ID
   * @returns {Object} Message count
   */
  async getMessageCount(conversationId) {
    // This would typically query the messages table
    return {
      success: true,
      data: { count: 0 }
    };
  }

  /**
   * Create initial message for conversation
   * @param {string} conversationId - Conversation ID
   * @param {string} content - Message content
   * @param {string} organizationId - Organization ID
   * @returns {Object} Creation result
   */
  async createInitialMessage(conversationId, content, organizationId) {
    try {
      // This would typically call the message service
      this.log(`Creating initial message for conversation: ${conversationId}`);
      
      return {
        success: true,
        data: { messageId: `msg_${Date.now()}` }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'MESSAGE_CREATION_ERROR',
          message: error.message
        }
      };
    }
  }

  /**
   * Get conversations by folder
   * @param {string} folderId - Folder ID
   * @param {Object} options - Query options
   * @returns {Object} Conversations in folder
   */
  async getConversationsByFolder(folderId, options = {}) {
    const {
      organizationId = null,
      userId = null,
      pagination = { page: 1, pageSize: 50 },
      sort = { field: 'updated_at', direction: 'desc' }
    } = options;

    const filters = { folder_id: folderId };
    if (userId) {
      filters.user_id = userId;
    }

    return this.getMany(filters, {
      organizationId,
      pagination,
      sort,
      select: '*'
    });
  }

  /**
   * Move conversation to folder
   * @param {string} id - Conversation ID
   * @param {string} folderId - Target folder ID (null to remove from folder)
   * @param {Object} options - Move options
   * @returns {Object} Move result
   */
  async moveConversationToFolder(id, folderId, options = {}) {
    const {
      organizationId = null,
      userId = null
    } = options;

    return this.updateConversation(id, {
      folder_id: folderId,
      moved_at: new Date().toISOString()
    }, { organizationId, userId });
  }

  /**
   * Duplicate conversation
   * @param {string} id - Source conversation ID
   * @param {Object} options - Duplication options
   * @returns {Object} Duplicated conversation
   */
  async duplicateConversation(id, options = {}) {
    const {
      organizationId = null,
      userId = null,
      newTitle = null,
      includeMessages = false
    } = options;

    try {
      // Get original conversation
      const originalResult = await this.getConversation(id, { organizationId, userId });
      if (!originalResult.success) {
        return originalResult;
      }

      const original = originalResult.data;

      // Prepare data for new conversation
      const newConversationData = {
        ...original,
        title: newTitle || `${original.title} (Copy)`,
        created_at: undefined,
        updated_at: undefined,
        id: undefined
      };

      delete newConversationData.id;
      delete newConversationData.created_at;
      delete newConversationData.updated_at;

      // Create new conversation
      const duplicateResult = await this.createConversation(newConversationData);

      if (duplicateResult.success) {
        this.log(`Duplicated conversation: ${id} -> ${duplicateResult.data.id}`);
      }

      return duplicateResult;

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DUPLICATION_ERROR',
          message: error.message
        }
      };
    }
  }
}

export default ConversationService;