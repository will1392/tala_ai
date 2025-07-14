/**
 * ThreadManager - Conversation Threading and Branching for Tala AI
 * 
 * Manages conversation branches, thread creation, navigation, and merging
 * to support exploratory travel planning and decision-making workflows.
 */

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

export class ThreadManager {
  constructor(options = {}) {
    this.options = {
      enableAutoSummary: options.enableAutoSummary !== false,
      enableBranchSuggestions: options.enableBranchSuggestions !== false,
      maxThreadDepth: options.maxThreadDepth || 10,
      summaryLength: options.summaryLength || 200,
      ...options
    };
    
    // Initialize database connection
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    this.initialized = false;
    
    // Cache for thread structures
    this.threadCache = new Map();
    this.treeCache = new Map();
  }

  /**
   * Initialize the thread manager
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      console.log('🧵 Initializing ThreadManager...');
      
      // Test database connection
      const { error } = await this.supabase
        .from('conversations')
        .select('count')
        .limit(1);
      
      if (error && !error.message.includes('relation "conversations" does not exist')) {
        throw new Error(`Database connection failed: ${error.message}`);
      }
      
      this.initialized = true;
      console.log('✅ ThreadManager initialized successfully');
      
    } catch (error) {
      console.error('❌ ThreadManager initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create a new thread branching from an existing conversation
   * @param {string} parentConversationId - Parent conversation ID
   * @param {Object} branchPoint - Information about where to branch
   * @returns {Object} New thread information
   */
  async createThread(parentConversationId, branchPoint = {}) {
    try {
      this.ensureInitialized();
      
      console.log(`🌿 Creating thread from conversation ${parentConversationId}`);
      
      // Validate parent conversation exists
      const parentConv = await this.getConversation(parentConversationId);
      if (!parentConv) {
        throw new Error('Parent conversation not found');
      }
      
      // Check thread depth limit
      const depth = await this.getThreadDepth(parentConversationId);
      if (depth >= this.options.maxThreadDepth) {
        throw new Error(`Maximum thread depth (${this.options.maxThreadDepth}) reached`);
      }
      
      // Create new thread conversation
      const threadData = {
        id: uuidv4(),
        parent_conversation_id: parentConversationId,
        user_id: parentConv.user_id,
        organization_id: parentConv.organization_id,
        
        // Thread metadata
        thread_metadata: {
          branch_reason: branchPoint.reason || 'Manual branch',
          created_from_message_id: branchPoint.messageId || null,
          branch_point_content: branchPoint.content || null,
          branch_type: branchPoint.type || 'exploration', // exploration, alternative, correction
          parent_summary: parentConv.summary || null,
          creation_context: branchPoint.context || {}
        },
        
        // Thread status
        thread_status: 'active',
        thread_summary: null,
        
        // Copy parent metadata with thread indication
        title: `${parentConv.title || 'Conversation'} - Branch ${new Date().toLocaleString()}`,
        summary: `Branch from: ${parentConv.summary || parentConv.title || 'Parent conversation'}`,
        metadata: {
          ...parentConv.metadata,
          is_thread: true,
          thread_depth: depth + 1,
          root_conversation_id: parentConv.metadata?.root_conversation_id || parentConversationId
        },
        
        // Timestamps
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Insert thread conversation
      const { data, error } = await this.supabase
        .from('conversations')
        .insert(threadData)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to create thread: ${error.message}`);
      }
      
      // Copy messages up to branch point if specified
      if (branchPoint.messageId) {
        await this.copyMessagesUntilBranchPoint(
          parentConversationId,
          data.id,
          branchPoint.messageId
        );
      }
      
      // Clear caches
      this.clearThreadCache(parentConversationId);
      
      console.log(`✅ Thread created: ${data.id}`);
      
      return {
        success: true,
        thread: data,
        parentId: parentConversationId,
        depth: depth + 1
      };
      
    } catch (error) {
      console.error(`❌ Failed to create thread from ${parentConversationId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all branch points in a conversation
   * @param {string} conversationId - Conversation ID
   * @returns {Array} Branch points with thread information
   */
  async getBranchPoints(conversationId) {
    try {
      this.ensureInitialized();
      
      console.log(`🔍 Getting branch points for conversation ${conversationId}`);
      
      // Get all threads branching from this conversation
      const { data: threads, error } = await this.supabase
        .from('conversations')
        .select('*')
        .eq('parent_conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (error) {
        throw new Error(`Failed to get threads: ${error.message}`);
      }
      
      // Extract branch points
      const branchPoints = threads.map(thread => ({
        threadId: thread.id,
        messageId: thread.thread_metadata?.created_from_message_id,
        reason: thread.thread_metadata?.branch_reason,
        type: thread.thread_metadata?.branch_type,
        content: thread.thread_metadata?.branch_point_content,
        status: thread.thread_status,
        createdAt: thread.created_at,
        summary: thread.thread_summary || thread.summary,
        messageCount: 0 // Will be populated if needed
      }));
      
      // Optionally get message counts for each thread
      for (const point of branchPoints) {
        const { count } = await this.supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', point.threadId);
        
        point.messageCount = count || 0;
      }
      
      return {
        success: true,
        branchPoints,
        totalBranches: branchPoints.length
      };
      
    } catch (error) {
      console.error(`❌ Failed to get branch points for ${conversationId}:`, error);
      return {
        success: false,
        error: error.message,
        branchPoints: []
      };
    }
  }

  /**
   * Get complete conversation tree structure
   * @param {string} rootConversationId - Root conversation ID
   * @returns {Object} Tree structure with all branches
   */
  async getConversationTree(rootConversationId) {
    try {
      this.ensureInitialized();
      
      console.log(`🌳 Building conversation tree for ${rootConversationId}`);
      
      // Check cache first
      if (this.treeCache.has(rootConversationId)) {
        return {
          success: true,
          tree: this.treeCache.get(rootConversationId),
          cached: true
        };
      }
      
      // Build tree recursively
      const tree = await this.buildTreeNode(rootConversationId);
      
      // Cache the result
      this.treeCache.set(rootConversationId, tree);
      
      // Calculate tree statistics
      const stats = this.calculateTreeStats(tree);
      
      return {
        success: true,
        tree,
        stats,
        cached: false
      };
      
    } catch (error) {
      console.error(`❌ Failed to get conversation tree for ${rootConversationId}:`, error);
      return {
        success: false,
        error: error.message,
        tree: null
      };
    }
  }

  /**
   * Merge multiple threads into one
   * @param {Array} threadIds - Thread IDs to merge
   * @param {Object} mergeOptions - Merge configuration
   * @returns {Object} Merge result
   */
  async mergeThreads(threadIds, mergeOptions = {}) {
    try {
      this.ensureInitialized();
      
      if (!Array.isArray(threadIds) || threadIds.length < 2) {
        throw new Error('At least 2 thread IDs required for merge');
      }
      
      console.log(`🔀 Merging threads: ${threadIds.join(', ')}`);
      
      // Get all thread conversations
      const { data: threads, error } = await this.supabase
        .from('conversations')
        .select('*')
        .in('id', threadIds);
      
      if (error) {
        throw new Error(`Failed to get threads: ${error.message}`);
      }
      
      if (threads.length !== threadIds.length) {
        throw new Error('Some thread IDs not found');
      }
      
      // Verify threads share common ancestor
      const commonAncestor = await this.findCommonAncestor(threads);
      if (!commonAncestor && !mergeOptions.forceeMerge) {
        throw new Error('Threads do not share a common ancestor');
      }
      
      // Determine primary thread (target for merge)
      const primaryThread = mergeOptions.primaryThreadId 
        ? threads.find(t => t.id === mergeOptions.primaryThreadId)
        : this.selectPrimaryThread(threads);
      
      if (!primaryThread) {
        throw new Error('Could not determine primary thread');
      }
      
      // Create merge record
      const mergeRecord = {
        id: uuidv4(),
        primary_thread_id: primaryThread.id,
        merged_thread_ids: threadIds.filter(id => id !== primaryThread.id),
        merge_type: mergeOptions.type || 'manual',
        merge_strategy: mergeOptions.strategy || 'chronological',
        conflicts_resolved: [],
        merge_metadata: {
          common_ancestor: commonAncestor,
          merge_reason: mergeOptions.reason || 'Manual merge',
          preserved_branches: mergeOptions.preserveBranches !== false,
          merge_summary: null
        },
        created_at: new Date().toISOString()
      };
      
      // Perform merge based on strategy
      const mergeResult = await this.performMerge(
        primaryThread,
        threads.filter(t => t.id !== primaryThread.id),
        mergeRecord,
        mergeOptions
      );
      
      // Update thread statuses
      await this.updateThreadStatuses(threadIds, primaryThread.id, 'merged');
      
      // Clear caches
      threadIds.forEach(id => this.clearThreadCache(id));
      
      console.log(`✅ Threads merged into ${primaryThread.id}`);
      
      return {
        success: true,
        mergeRecord,
        primaryThreadId: primaryThread.id,
        mergedThreadIds: mergeRecord.merged_thread_ids,
        conflicts: mergeResult.conflicts,
        summary: mergeResult.summary
      };
      
    } catch (error) {
      console.error(`❌ Failed to merge threads:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get complete thread history
   * @param {string} threadId - Thread ID
   * @param {Object} options - History options
   * @returns {Object} Thread history with ancestry
   */
  async getThreadHistory(threadId, options = {}) {
    try {
      this.ensureInitialized();
      
      console.log(`📜 Getting thread history for ${threadId}`);
      
      // Get the thread conversation
      const thread = await this.getConversation(threadId);
      if (!thread) {
        throw new Error('Thread not found');
      }
      
      // Build ancestry chain
      const ancestry = await this.buildAncestryChain(threadId);
      
      // Get messages for this thread
      const { data: messages, error } = await this.supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', threadId)
        .order('created_at', { ascending: true })
        .limit(options.messageLimit || 1000);
      
      if (error) {
        throw new Error(`Failed to get messages: ${error.message}`);
      }
      
      // Get branch information
      const branches = await this.getBranchPoints(threadId);
      
      // Build complete history
      const history = {
        thread: {
          id: thread.id,
          title: thread.title,
          summary: thread.thread_summary || thread.summary,
          status: thread.thread_status,
          metadata: thread.thread_metadata,
          createdAt: thread.created_at
        },
        ancestry,
        messages: messages || [],
        branches: branches.branchPoints || [],
        stats: {
          depth: ancestry.length - 1,
          messageCount: messages?.length || 0,
          branchCount: branches.branchPoints?.length || 0,
          isRoot: !thread.parent_conversation_id,
          isMerged: thread.thread_status === 'merged'
        }
      };
      
      // Include merge information if thread was merged
      if (thread.thread_status === 'merged') {
        history.mergeInfo = await this.getMergeInfo(threadId);
      }
      
      return {
        success: true,
        history
      };
      
    } catch (error) {
      console.error(`❌ Failed to get thread history for ${threadId}:`, error);
      return {
        success: false,
        error: error.message,
        history: null
      };
    }
  }

  // Helper methods

  async getConversation(conversationId) {
    const { data, error } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();
    
    return error ? null : data;
  }

  async getThreadDepth(conversationId) {
    let depth = 0;
    let currentId = conversationId;
    
    while (currentId && depth < this.options.maxThreadDepth) {
      const conv = await this.getConversation(currentId);
      if (!conv || !conv.parent_conversation_id) break;
      
      currentId = conv.parent_conversation_id;
      depth++;
    }
    
    return depth;
  }

  async copyMessagesUntilBranchPoint(sourceId, targetId, branchMessageId) {
    try {
      // Get messages up to branch point
      const { data: messages, error } = await this.supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', sourceId)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.warn('Failed to copy messages:', error.message);
        return;
      }
      
      // Find branch point index
      const branchIndex = messages.findIndex(m => m.id === branchMessageId);
      const messagesToCopy = branchIndex >= 0 
        ? messages.slice(0, branchIndex + 1)
        : messages;
      
      // Copy messages with new IDs
      const copiedMessages = messagesToCopy.map(msg => ({
        ...msg,
        id: uuidv4(),
        conversation_id: targetId,
        metadata: {
          ...msg.metadata,
          copied_from: msg.id,
          is_thread_copy: true
        }
      }));
      
      if (copiedMessages.length > 0) {
        await this.supabase
          .from('messages')
          .insert(copiedMessages);
      }
      
    } catch (error) {
      console.error('Error copying messages:', error);
    }
  }

  async buildTreeNode(conversationId, visited = new Set()) {
    if (visited.has(conversationId)) {
      return null; // Prevent circular references
    }
    
    visited.add(conversationId);
    
    const conversation = await this.getConversation(conversationId);
    if (!conversation) return null;
    
    // Get child threads
    const { data: children } = await this.supabase
      .from('conversations')
      .select('id')
      .eq('parent_conversation_id', conversationId);
    
    const childNodes = [];
    if (children) {
      for (const child of children) {
        const childNode = await this.buildTreeNode(child.id, visited);
        if (childNode) {
          childNodes.push(childNode);
        }
      }
    }
    
    return {
      id: conversation.id,
      title: conversation.title,
      summary: conversation.thread_summary || conversation.summary,
      status: conversation.thread_status || 'active',
      metadata: conversation.thread_metadata,
      createdAt: conversation.created_at,
      children: childNodes
    };
  }

  calculateTreeStats(tree) {
    const stats = {
      totalNodes: 0,
      maxDepth: 0,
      totalBranches: 0,
      activeThreads: 0,
      mergedThreads: 0
    };
    
    function traverse(node, depth = 0) {
      stats.totalNodes++;
      stats.maxDepth = Math.max(stats.maxDepth, depth);
      
      if (node.status === 'active') stats.activeThreads++;
      if (node.status === 'merged') stats.mergedThreads++;
      if (node.children.length > 0) stats.totalBranches++;
      
      node.children.forEach(child => traverse(child, depth + 1));
    }
    
    traverse(tree);
    return stats;
  }

  async findCommonAncestor(threads) {
    const ancestryChains = await Promise.all(
      threads.map(thread => this.buildAncestryChain(thread.id))
    );
    
    // Find common ancestor by comparing chains
    let commonAncestor = null;
    
    for (const ancestor of ancestryChains[0]) {
      if (ancestryChains.every(chain => chain.some(a => a.id === ancestor.id))) {
        commonAncestor = ancestor.id;
        break;
      }
    }
    
    return commonAncestor;
  }

  async buildAncestryChain(conversationId) {
    const chain = [];
    let currentId = conversationId;
    
    while (currentId) {
      const conv = await this.getConversation(currentId);
      if (!conv) break;
      
      chain.push({
        id: conv.id,
        title: conv.title,
        parentId: conv.parent_conversation_id
      });
      
      currentId = conv.parent_conversation_id;
    }
    
    return chain;
  }

  selectPrimaryThread(threads) {
    // Select thread with most activity or most recent update
    return threads.reduce((primary, thread) => {
      if (!primary) return thread;
      
      // Prefer active threads
      if (thread.thread_status === 'active' && primary.thread_status !== 'active') {
        return thread;
      }
      
      // Then prefer most recently updated
      if (new Date(thread.updated_at) > new Date(primary.updated_at)) {
        return thread;
      }
      
      return primary;
    }, null);
  }

  async performMerge(primaryThread, secondaryThreads, mergeRecord, options) {
    const conflicts = [];
    let mergedMessageCount = 0;
    
    for (const thread of secondaryThreads) {
      // Get messages from secondary thread
      const { data: messages } = await this.supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', thread.id)
        .order('created_at', { ascending: true });
      
      if (messages && messages.length > 0) {
        // Detect conflicts
        const threadConflicts = await this.detectMergeConflicts(
          primaryThread.id,
          messages,
          options
        );
        
        conflicts.push(...threadConflicts);
        
        // Copy non-conflicting messages
        const messagesToMerge = messages.filter(msg => 
          !threadConflicts.some(c => c.messageId === msg.id)
        );
        
        if (messagesToMerge.length > 0) {
          const mergedMessages = messagesToMerge.map(msg => ({
            ...msg,
            id: uuidv4(),
            conversation_id: primaryThread.id,
            metadata: {
              ...msg.metadata,
              merged_from: thread.id,
              original_message_id: msg.id,
              merge_timestamp: new Date().toISOString()
            }
          }));
          
          await this.supabase
            .from('messages')
            .insert(mergedMessages);
          
          mergedMessageCount += mergedMessages.length;
        }
      }
    }
    
    return {
      conflicts,
      summary: `Merged ${secondaryThreads.length} threads, ${mergedMessageCount} messages`,
      mergedMessageCount
    };
  }

  async detectMergeConflicts(primaryThreadId, messages, options) {
    // Simple conflict detection - can be enhanced
    const conflicts = [];
    
    // Check for duplicate timestamps or overlapping decision points
    for (const message of messages) {
      if (message.metadata?.is_decision_point) {
        conflicts.push({
          type: 'decision_conflict',
          messageId: message.id,
          content: message.content,
          resolution: options.conflictResolution || 'skip'
        });
      }
    }
    
    return conflicts;
  }

  async updateThreadStatuses(threadIds, primaryId, status) {
    for (const threadId of threadIds) {
      if (threadId !== primaryId) {
        await this.supabase
          .from('conversations')
          .update({
            thread_status: status,
            updated_at: new Date().toISOString(),
            thread_metadata: {
              merged_into: primaryId,
              merge_timestamp: new Date().toISOString()
            }
          })
          .eq('id', threadId);
      }
    }
  }

  async getMergeInfo(threadId) {
    // Query merge records or extract from metadata
    const conv = await this.getConversation(threadId);
    return conv?.thread_metadata?.merge_info || null;
  }

  clearThreadCache(conversationId) {
    this.threadCache.delete(conversationId);
    // Clear tree cache for any tree containing this conversation
    for (const [rootId, tree] of this.treeCache.entries()) {
      if (this.treeContainsConversation(tree, conversationId)) {
        this.treeCache.delete(rootId);
      }
    }
  }

  treeContainsConversation(tree, conversationId) {
    if (tree.id === conversationId) return true;
    return tree.children.some(child => this.treeContainsConversation(child, conversationId));
  }

  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('ThreadManager not initialized. Call initialize() first.');
    }
  }

  /**
   * Clear all caches
   */
  clearAllCaches() {
    this.threadCache.clear();
    this.treeCache.clear();
    console.log('🧹 Thread caches cleared');
  }
}

export default ThreadManager;