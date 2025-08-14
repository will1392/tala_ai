/**
 * Hybrid Threading Service
 * 
 * Works with or without database - falls back to in-memory storage
 * This ensures conversations work even without Supabase configured
 */

import { v4 as uuidv4 } from 'uuid';

export class ThreadingServiceHybrid {
  constructor(options = {}) {
    this.options = options;
    this.initialized = false;
    
    // In-memory storage (always available)
    this.memoryStore = {
      threads: new Map(),
      messages: new Map()
    };
    
    // Try to load database service
    this.dbAvailable = false;
    this.conversationService = null;
  }
  
  async initialize() {
    console.log('🧵 Initializing Hybrid Threading Service...');
    
    // Try to initialize database
    try {
      const { ConversationService } = await import('../db/conversationService.js');
      const { getSupabaseService } = await import('../../db/supabaseClient.js');
      
      // Test if database is available
      const supabase = getSupabaseService();
      const { error } = await supabase.from('conversations').select('id').limit(1);
      
      if (!error) {
        this.conversationService = new ConversationService();
        this.dbAvailable = true;
        console.log('✅ Database available - using persistent storage');
      } else {
        throw new Error('Database not accessible');
      }
    } catch (error) {
      console.log('⚠️ Database not available - using in-memory storage');
      console.log('   (This means conversations won\'t persist after server restart)');
      this.dbAvailable = false;
    }
    
    this.initialized = true;
    console.log('✅ Hybrid Threading Service ready');
  }
  
  async createThread(threadData) {
    const threadId = threadData.id || uuidv4();
    
    // Always store in memory
    const thread = {
      id: threadId,
      userId: threadData.userId || 'admin-1',
      organizationId: threadData.organizationId || 'default',
      title: threadData.title || 'New Conversation',
      messages: [],
      metadata: threadData.metadata || {},
      created: new Date(),
      updated: new Date()
    };
    
    this.memoryStore.threads.set(threadId, thread);
    console.log(`📝 Created thread in memory: ${threadId}`);
    
    // Try to persist to database if available
    if (this.dbAvailable && this.conversationService) {
      try {
        // Resolve user IDs
        const { default: userResolver } = await import('../auth/UserResolver.js');
        await userResolver.initialize();
        const userId = await userResolver.resolveUserId(threadData.userId);
        const orgId = await userResolver.resolveOrgId(threadData.organizationId);
        
        await this.conversationService.createConversation({
          id: threadId,
          organization_id: orgId,
          user_id: userId,
          title: thread.title,
          metadata: thread.metadata
        });
        console.log(`💾 Persisted thread to database: ${threadId}`);
      } catch (error) {
        console.warn('⚠️ Could not persist to database:', error.message);
      }
    }
    
    return thread;
  }
  
  async getOrCreateThread(params) {
    const { userId, conversationId, organizationId, metadata } = params;
    
    // Look for existing thread in memory
    const threadId = conversationId || `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Check if thread exists
    const existing = await this.getThread(threadId);
    if (existing) {
      return existing;
    }
    
    // Create new thread
    return this.createThread({
      id: threadId,
      userId,
      organizationId,
      title: `Conversation ${new Date().toISOString()}`,
      metadata: {
        conversationId,
        ...metadata
      }
    });
  }
  
  async getThread(threadId) {
    // Check memory first
    if (this.memoryStore.threads.has(threadId)) {
      return this.memoryStore.threads.get(threadId);
    }
    
    // Try database if available
    if (this.dbAvailable && this.conversationService) {
      try {
        const result = await this.conversationService.getById(threadId);
        if (result.success && result.data) {
          // Cache in memory
          const thread = {
            id: result.data.id,
            userId: result.data.user_id,
            title: result.data.title,
            messages: [],
            metadata: result.data.metadata || {},
            created: new Date(result.data.created_at),
            updated: new Date(result.data.updated_at)
          };
          this.memoryStore.threads.set(threadId, thread);
          return thread;
        }
      } catch (error) {
        console.warn('Could not fetch from database:', error.message);
      }
    }
    
    return null; // Return null instead of throwing error for getOrCreateThread to work
  }
  
  async addMessage(threadId, message) {
    // Ensure thread exists
    const thread = await this.getThread(threadId);
    
    const messageData = {
      id: uuidv4(),
      threadId,
      role: message.role || 'user',
      content: message.content,
      timestamp: new Date(),
      metadata: message.metadata || {}
    };
    
    // Store in memory
    if (!this.memoryStore.messages.has(threadId)) {
      this.memoryStore.messages.set(threadId, []);
    }
    this.memoryStore.messages.get(threadId).push(messageData);
    
    // Update thread
    thread.messages.push(messageData);
    thread.updated = new Date();
    
    console.log(`💬 Added message to thread ${threadId} (${messageData.role})`);
    
    // Try to persist to database
    if (this.dbAvailable && this.conversationService) {
      try {
        await this.conversationService.addMessage({
          conversation_id: threadId,
          role: messageData.role,
          content: messageData.content,
          metadata: messageData.metadata
        });
        console.log(`💾 Persisted message to database`);
      } catch (error) {
        console.warn('⚠️ Could not persist message:', error.message);
      }
    }
    
    return messageData;
  }
  
  async getThreadMessages(threadId, options = {}) {
    console.log(`📨 Getting messages for thread: ${threadId}`);
    
    // Check memory first
    if (this.memoryStore.messages.has(threadId)) {
      const messages = this.memoryStore.messages.get(threadId);
      console.log(`   Found ${messages.length} messages in memory`);
      
      if (options.limit) {
        return messages.slice(-options.limit);
      }
      return messages;
    }
    
    // Try database if available
    if (this.dbAvailable && this.conversationService) {
      try {
        const result = await this.conversationService.getMessages(threadId, {
          limit: options.limit || 100
        });
        
        if (result.success && result.data) {
          // Convert and cache
          const messages = result.data.map(msg => ({
            id: msg.id,
            threadId,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.created_at),
            metadata: msg.metadata || {}
          }));
          
          // Cache in memory
          this.memoryStore.messages.set(threadId, messages);
          console.log(`   Found ${messages.length} messages in database`);
          return messages;
        }
      } catch (error) {
        console.warn('Could not fetch messages from database:', error.message);
      }
    }
    
    console.log(`   No messages found for thread ${threadId}`);
    return [];
  }
  
  async getUserThreads(userId, options = {}) {
    const threads = [];
    
    // Get from memory
    for (const [id, thread] of this.memoryStore.threads) {
      if (thread.userId === userId) {
        threads.push(thread);
      }
    }
    
    // Try database if available
    if (this.dbAvailable && this.conversationService) {
      try {
        // Resolve user ID
        const { default: userResolver } = await import('../auth/UserResolver.js');
        await userResolver.initialize();
        const resolvedUserId = await userResolver.resolveUserId(userId);
        
        const result = await this.conversationService.getMany(
          { user_id: resolvedUserId }, // filters
          {
            pagination: { pageSize: options.limit || 50 }
          }
        );
        
        if (result.success && result.data) {
          // Merge with memory threads
          result.data.forEach(conv => {
            if (!threads.find(t => t.id === conv.id)) {
              threads.push({
                id: conv.id,
                userId: conv.user_id,
                title: conv.title,
                metadata: conv.metadata || {},
                created: new Date(conv.created_at),
                updated: new Date(conv.updated_at)
              });
            }
          });
        }
      } catch (error) {
        console.warn('Could not fetch threads from database:', error.message);
      }
    }
    
    // Sort by updated date
    threads.sort((a, b) => b.updated - a.updated);
    
    if (options.limit) {
      return threads.slice(0, options.limit);
    }
    
    return threads;
  }
  
  async shutdown() {
    this.initialized = false;
    console.log('🛑 Hybrid Threading Service shut down');
  }
}

export default ThreadingServiceHybrid;