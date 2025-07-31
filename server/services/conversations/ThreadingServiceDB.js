/**
 * Threading Service - Database Implementation
 * 
 * Manages conversation threads with proper database persistence
 */

import { v4 as uuidv4 } from 'uuid';
import { ConversationService } from '../db/conversationService.js';
import userResolver from '../auth/UserResolver.js';

export class ThreadingServiceDB {
  constructor(options = {}) {
    this.options = options;
    this.conversationService = new ConversationService();
    this.initialized = false;
    // Cache for active threads to reduce DB calls
    this.threadCache = new Map();
  }
  
  async initialize() {
    this.initialized = true;
    console.log('🧵 Threading Service initialized (database-backed)');
  }
  
  async createThread(threadData) {
    // Generate proper UUID
    const conversationId = uuidv4();
    
    // Resolve user and org IDs to proper UUIDs
    const userId = await userResolver.resolveUserId(threadData.userId);
    const orgId = await userResolver.resolveOrgId(threadData.organizationId);
    
    // Create conversation in database
    const result = await this.conversationService.createConversation({
      id: conversationId, // Use UUID instead of string ID
      organization_id: orgId,
      user_id: userId,
      title: threadData.title || 'New Conversation',
      description: threadData.description || '',
      metadata: {
        originalUserId: threadData.userId, // Keep original for reference
        threadId: threadData.id, // Store original thread ID in metadata if needed
        source: 'chat',
        ...threadData.metadata
      }
    });
    
    if (!result.success) {
      throw new Error(`Failed to create conversation: ${result.error.message}`);
    }
    
    const thread = {
      id: conversationId, // Use the UUID
      userId: threadData.userId,
      conversationId: conversationId,
      messages: [],
      metadata: threadData.metadata || {},
      created: new Date(),
      updated: new Date()
    };
    
    // Cache the thread
    this.threadCache.set(conversationId, thread);
    
    return thread;
  }
  
  async getOrCreateThread(params) {
    const { userId, conversationId, organizationId, metadata } = params;
    
    // If conversationId is provided and is a valid UUID, try to get it
    if (conversationId && this.isValidUUID(conversationId)) {
      const result = await this.conversationService.getConversation(conversationId, {
        includeMessages: true
      });
      
      if (result.success) {
        const thread = {
          id: result.data.id,
          userId: result.data.user_id,
          conversationId: result.data.id,
          messages: result.data.messages || [],
          metadata: result.data.metadata || {},
          created: new Date(result.data.created_at),
          updated: new Date(result.data.updated_at)
        };
        
        // Update cache
        this.threadCache.set(conversationId, thread);
        return thread;
      }
    }
    
    // Create new thread with proper UUID resolution
    return this.createThread({
      userId,
      organizationId,
      title: metadata?.title || 'New Conversation',
      metadata
    });
  }
  
  async addMessage(threadId, message) {
    // Ensure threadId is a valid UUID
    const conversationId = this.isValidUUID(threadId) ? threadId : null;
    
    if (!conversationId) {
      // If threadId is not a UUID, try to find it in cache
      const cachedThread = Array.from(this.threadCache.values())
        .find(t => t.metadata?.threadId === threadId);
      
      if (!cachedThread) {
        throw new Error(`Thread ${threadId} not found`);
      }
      
      threadId = cachedThread.id;
    }
    
    // Add message to database
    const result = await this.conversationService.addMessage({
      conversation_id: threadId,
      role: message.role || 'user',
      content: message.content,
      metadata: {
        ...message.metadata,
        timestamp: new Date().toISOString()
      }
    });
    
    if (!result.success) {
      throw new Error(`Failed to add message: ${result.error.message}`);
    }
    
    // Update cache
    const thread = this.threadCache.get(threadId);
    if (thread) {
      thread.messages.push(result.data);
      thread.updated = new Date();
    }
    
    return result.data;
  }
  
  async getThreadMessages(threadId, options = {}) {
    // Ensure threadId is a valid UUID
    if (!this.isValidUUID(threadId)) {
      // Try to find in cache by original thread ID
      const cachedThread = Array.from(this.threadCache.values())
        .find(t => t.metadata?.threadId === threadId);
      
      if (cachedThread) {
        threadId = cachedThread.id;
      } else {
        return [];
      }
    }
    
    // Get conversation with messages
    const result = await this.conversationService.getConversation(threadId, {
      includeMessages: true,
      messageLimit: options.limit || 100
    });
    
    if (!result.success) {
      console.error('Failed to get messages:', result.error);
      return [];
    }
    
    return result.data.messages || [];
  }
  
  // Helper to validate UUID format
  isValidUUID(str) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }
  
  async shutdown() {
    this.threadCache.clear();
    this.initialized = false;
    console.log('🛑 Threading Service (DB) shut down');
  }
}

export default ThreadingServiceDB;