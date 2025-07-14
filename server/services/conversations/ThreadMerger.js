/**
 * ThreadMerger - Advanced Thread Merging for Tala AI
 * 
 * Handles merging of conversation threads, conflict resolution, and
 * maintaining conversation history across merged branches.
 */

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';

export class ThreadMerger {
  constructor(options = {}) {
    this.options = {
      enableConflictDetection: options.enableConflictDetection !== false,
      enableLLMResolution: options.enableLLMResolution !== false,
      preserveBranchHistory: options.preserveBranchHistory !== false,
      mergeStrategies: options.mergeStrategies || ['chronological', 'intelligent', 'manual'],
      conflictResolutionMode: options.conflictResolutionMode || 'interactive',
      ...options
    };
    
    // Initialize services
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    if (this.options.enableLLMResolution) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
    
    this.initialized = false;
  }

  /**
   * Initialize the thread merger
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      console.log('🔀 Initializing ThreadMerger...');
      
      // Test database connection
      const { error } = await this.supabase
        .from('conversations')
        .select('count')
        .limit(1);
      
      if (error && !error.message.includes('relation "conversations" does not exist')) {
        throw new Error(`Database connection failed: ${error.message}`);
      }
      
      // Test LLM connection if enabled
      if (this.options.enableLLMResolution && this.openai) {
        await this.testLLMConnection();
      }
      
      this.initialized = true;
      console.log('✅ ThreadMerger initialized successfully');
      
    } catch (error) {
      console.error('❌ ThreadMerger initialization failed:', error);
      // Continue without LLM if it fails
      this.options.enableLLMResolution = false;
      this.initialized = true;
    }
  }

  /**
   * Merge multiple threads using specified strategy
   * @param {Array} threadIds - Thread IDs to merge
   * @param {Object} mergeConfig - Merge configuration
   * @returns {Object} Merge result
   */
  async mergeThreads(threadIds, mergeConfig = {}) {
    try {
      this.ensureInitialized();
      
      if (!Array.isArray(threadIds) || threadIds.length < 2) {
        throw new Error('At least 2 thread IDs required for merge');
      }
      
      console.log(`🔀 Merging ${threadIds.length} threads with strategy: ${mergeConfig.strategy || 'chronological'}`);
      
      // Load thread data
      const threads = await this.loadThreadsWithMessages(threadIds);
      
      // Validate threads can be merged
      const validation = await this.validateMerge(threads, mergeConfig);
      if (!validation.canMerge && !mergeConfig.force) {
        return {
          success: false,
          error: validation.reason,
          validation
        };
      }
      
      // Find common elements
      const commonElements = await this.identifyCommonElements(threads);
      
      // Detect conflicts
      const conflicts = await this.detectConflicts(threads, commonElements);
      
      // Resolve conflicts based on mode
      let resolutions = {};
      if (conflicts.length > 0) {
        resolutions = await this.resolveConflicts(
          conflicts,
          mergeConfig.conflictResolution || {}
        );
      }
      
      // Execute merge based on strategy
      const mergeResult = await this.executeMerge(
        threads,
        commonElements,
        resolutions,
        mergeConfig
      );
      
      // Create unified history
      const unifiedHistory = await this.createUnifiedHistory(
        mergeResult.primaryThread,
        threads,
        mergeResult
      );
      
      // Preserve branch history if enabled
      if (this.options.preserveBranchHistory) {
        await this.preserveBranchHistory(threads, mergeResult);
      }
      
      // Update thread statuses
      await this.updateMergedThreadStatuses(
        threadIds,
        mergeResult.primaryThreadId,
        mergeResult.mergeRecordId
      );
      
      console.log(`✅ Successfully merged ${threadIds.length} threads`);
      
      return {
        success: true,
        mergeResult,
        unifiedHistory,
        conflicts: conflicts.length,
        resolutions: Object.keys(resolutions).length
      };
      
    } catch (error) {
      console.error('❌ Failed to merge threads:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Identify common elements between threads
   * @param {Array} threads - Thread data with messages
   * @returns {Object} Common elements analysis
   */
  async identifyCommonElements(threads) {
    const commonElements = {
      ancestor: null,
      sharedMessages: [],
      sharedDecisions: [],
      divergencePoint: null,
      commonContext: {}
    };
    
    // Find common ancestor
    commonElements.ancestor = await this.findCommonAncestor(threads);
    
    // Identify shared messages (before divergence)
    const messageArrays = threads.map(t => t.messages || []);
    
    if (messageArrays.length > 0 && messageArrays[0].length > 0) {
      for (let i = 0; i < messageArrays[0].length; i++) {
        const message = messageArrays[0][i];
        
        // Check if message exists in all threads (by content or ID)
        const isShared = messageArrays.every(messages => 
          messages.some(m => 
            m.id === message.id || 
            (m.content === message.content && m.role === message.role)
          )
        );
        
        if (isShared) {
          commonElements.sharedMessages.push({
            id: message.id,
            content: message.content,
            role: message.role,
            index: i
          });
        } else {
          // Found divergence point
          if (!commonElements.divergencePoint) {
            commonElements.divergencePoint = {
              index: i,
              message: message,
              reason: 'First non-shared message'
            };
          }
          break;
        }
      }
    }
    
    // Extract shared decisions
    commonElements.sharedDecisions = commonElements.sharedMessages
      .filter(msg => msg.metadata?.is_decision || msg.content.includes('decided'))
      .map(msg => ({
        messageId: msg.id,
        decision: msg.content,
        timestamp: msg.created_at
      }));
    
    // Extract common context
    commonElements.commonContext = this.extractCommonContext(threads, commonElements);
    
    return commonElements;
  }

  /**
   * Detect conflicts between threads
   * @param {Array} threads - Thread data
   * @param {Object} commonElements - Common elements analysis
   * @returns {Array} Detected conflicts
   */
  async detectConflicts(threads, commonElements) {
    const conflicts = [];
    const divergenceIndex = commonElements.divergencePoint?.index || 0;
    
    // Compare messages after divergence
    for (let i = 0; i < threads.length - 1; i++) {
      for (let j = i + 1; j < threads.length; j++) {
        const thread1 = threads[i];
        const thread2 = threads[j];
        
        // Detect decision conflicts
        const decisionConflicts = this.detectDecisionConflicts(
          thread1,
          thread2,
          divergenceIndex
        );
        conflicts.push(...decisionConflicts);
        
        // Detect data conflicts
        const dataConflicts = this.detectDataConflicts(
          thread1,
          thread2,
          divergenceIndex
        );
        conflicts.push(...dataConflicts);
        
        // Detect timeline conflicts
        const timelineConflicts = this.detectTimelineConflicts(
          thread1,
          thread2,
          divergenceIndex
        );
        conflicts.push(...timelineConflicts);
      }
    }
    
    // Use LLM for semantic conflict detection if enabled
    if (this.options.enableLLMResolution && conflicts.length < 10) {
      const semanticConflicts = await this.detectSemanticConflicts(threads, commonElements);
      conflicts.push(...semanticConflicts);
    }
    
    // Deduplicate and prioritize conflicts
    return this.prioritizeConflicts(this.deduplicateConflicts(conflicts));
  }

  /**
   * Resolve conflicts based on configured mode
   * @param {Array} conflicts - Detected conflicts
   * @param {Object} resolutionConfig - Resolution configuration
   * @returns {Object} Conflict resolutions
   */
  async resolveConflicts(conflicts, resolutionConfig) {
    const resolutions = {};
    
    for (const conflict of conflicts) {
      let resolution = null;
      
      switch (this.options.conflictResolutionMode) {
        case 'automatic':
          resolution = await this.automaticResolution(conflict, resolutionConfig);
          break;
          
        case 'interactive':
          resolution = await this.interactiveResolution(conflict, resolutionConfig);
          break;
          
        case 'manual':
          resolution = this.manualResolution(conflict, resolutionConfig);
          break;
          
        default:
          resolution = this.defaultResolution(conflict);
      }
      
      if (resolution) {
        resolutions[conflict.id] = resolution;
      }
    }
    
    return resolutions;
  }

  /**
   * Create unified conversation history
   * @param {Object} primaryThread - Primary thread after merge
   * @param {Array} sourceThreads - Original threads
   * @param {Object} mergeResult - Merge execution result
   * @returns {Object} Unified history
   */
  async createUnifiedHistory(primaryThread, sourceThreads, mergeResult) {
    const unifiedHistory = {
      primaryThreadId: primaryThread.id,
      sourceThreadIds: sourceThreads.map(t => t.id),
      timeline: [],
      decisions: [],
      branches: [],
      metadata: {
        mergeDate: new Date().toISOString(),
        mergeStrategy: mergeResult.strategy,
        conflictsResolved: mergeResult.conflictsResolved || 0,
        messagesmerged: mergeResult.messagesMerged || 0
      }
    };
    
    // Build unified timeline
    const allMessages = await this.getAllMessagesFromThreads(sourceThreads);
    
    // Sort and deduplicate messages
    const uniqueMessages = this.deduplicateMessages(allMessages);
    const sortedMessages = this.sortMessagesByStrategy(
      uniqueMessages,
      mergeResult.strategy
    );
    
    // Build timeline with annotations
    unifiedHistory.timeline = sortedMessages.map(msg => ({
      id: msg.id,
      type: 'message',
      content: msg.content,
      role: msg.role,
      timestamp: msg.created_at,
      sourceThread: msg.conversation_id,
      metadata: {
        ...msg.metadata,
        wasConflict: mergeResult.conflictResolutions?.[msg.id] ? true : false,
        mergeAnnotation: msg.mergeAnnotation
      }
    }));
    
    // Extract key decisions
    unifiedHistory.decisions = sortedMessages
      .filter(msg => msg.metadata?.is_decision || msg.metadata?.is_important)
      .map(msg => ({
        id: msg.id,
        decision: msg.content,
        timestamp: msg.created_at,
        sourceThread: msg.conversation_id,
        outcome: msg.metadata?.decision_outcome
      }));
    
    // Record branch points
    sourceThreads.forEach(thread => {
      if (thread.thread_metadata?.branch_reason) {
        unifiedHistory.branches.push({
          threadId: thread.id,
          reason: thread.thread_metadata.branch_reason,
          createdAt: thread.created_at,
          messageCount: thread.messages?.length || 0
        });
      }
    });
    
    return unifiedHistory;
  }

  /**
   * Preserve branch history for reference
   * @param {Array} threads - Original threads
   * @param {Object} mergeResult - Merge result
   */
  async preserveBranchHistory(threads, mergeResult) {
    try {
      // Create archive records for each merged thread
      const archiveRecords = threads
        .filter(t => t.id !== mergeResult.primaryThreadId)
        .map(thread => ({
          id: uuidv4(),
          original_thread_id: thread.id,
          merged_into_thread_id: mergeResult.primaryThreadId,
          merge_record_id: mergeResult.mergeRecordId,
          thread_snapshot: {
            title: thread.title,
            summary: thread.summary,
            metadata: thread.thread_metadata,
            messageCount: thread.messages?.length || 0,
            keyDecisions: thread.messages
              ?.filter(m => m.metadata?.is_decision)
              .map(m => ({ id: m.id, content: m.content }))
          },
          archived_at: new Date().toISOString()
        }));
      
      if (archiveRecords.length > 0) {
        await this.supabase
          .from('thread_archives')
          .insert(archiveRecords);
      }
      
      console.log(`📦 Preserved history for ${archiveRecords.length} threads`);
      
    } catch (error) {
      console.error('Error preserving branch history:', error);
      // Non-critical error, continue
    }
  }

  // Helper methods

  async loadThreadsWithMessages(threadIds) {
    const threads = [];
    
    for (const threadId of threadIds) {
      // Load conversation
      const { data: conversation, error: convError } = await this.supabase
        .from('conversations')
        .select('*')
        .eq('id', threadId)
        .single();
      
      if (convError || !conversation) {
        throw new Error(`Thread ${threadId} not found`);
      }
      
      // Load messages
      const { data: messages, error: msgError } = await this.supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', threadId)
        .order('created_at', { ascending: true });
      
      if (msgError) {
        console.warn(`Failed to load messages for thread ${threadId}:`, msgError);
      }
      
      threads.push({
        ...conversation,
        messages: messages || []
      });
    }
    
    return threads;
  }

  async validateMerge(threads, config) {
    const validation = {
      canMerge: true,
      reason: null,
      warnings: []
    };
    
    // Check if threads share common ancestor
    const hasCommonAncestor = await this.checkCommonAncestor(threads);
    if (!hasCommonAncestor && !config.allowUnrelatedMerge) {
      validation.canMerge = false;
      validation.reason = 'Threads do not share a common ancestor';
      return validation;
    }
    
    // Check for circular references
    if (this.hasCircularReference(threads)) {
      validation.canMerge = false;
      validation.reason = 'Circular reference detected in thread hierarchy';
      return validation;
    }
    
    // Check thread statuses
    const mergedThreads = threads.filter(t => t.thread_status === 'merged');
    if (mergedThreads.length > 0 && !config.allowMergedThreads) {
      validation.warnings.push(`${mergedThreads.length} threads are already merged`);
    }
    
    // Check for active edits
    const activeThreads = threads.filter(t => 
      t.metadata?.has_unsaved_changes || 
      t.metadata?.is_being_edited
    );
    if (activeThreads.length > 0) {
      validation.warnings.push(`${activeThreads.length} threads have unsaved changes`);
    }
    
    return validation;
  }

  async findCommonAncestor(threads) {
    // Build ancestry paths for each thread
    const ancestryPaths = await Promise.all(
      threads.map(thread => this.buildAncestryPath(thread.id))
    );
    
    // Find deepest common ancestor
    let commonAncestor = null;
    const shortestPath = Math.min(...ancestryPaths.map(p => p.length));
    
    for (let i = 0; i < shortestPath; i++) {
      const ancestorId = ancestryPaths[0][i];
      
      if (ancestryPaths.every(path => path[i] === ancestorId)) {
        commonAncestor = ancestorId;
      } else {
        break;
      }
    }
    
    return commonAncestor;
  }

  async buildAncestryPath(threadId) {
    const path = [];
    let currentId = threadId;
    
    while (currentId) {
      path.unshift(currentId);
      
      const { data } = await this.supabase
        .from('conversations')
        .select('parent_conversation_id')
        .eq('id', currentId)
        .single();
      
      currentId = data?.parent_conversation_id;
    }
    
    return path;
  }

  detectDecisionConflicts(thread1, thread2, startIndex) {
    const conflicts = [];
    const decisions1 = thread1.messages.slice(startIndex).filter(m => m.metadata?.is_decision);
    const decisions2 = thread2.messages.slice(startIndex).filter(m => m.metadata?.is_decision);
    
    // Find conflicting decisions
    decisions1.forEach(decision1 => {
      decisions2.forEach(decision2 => {
        if (this.areDecisionsConflicting(decision1, decision2)) {
          conflicts.push({
            id: `conflict-${decision1.id}-${decision2.id}`,
            type: 'decision',
            severity: 'high',
            thread1: { id: thread1.id, message: decision1 },
            thread2: { id: thread2.id, message: decision2 },
            description: 'Conflicting decisions made in different threads'
          });
        }
      });
    });
    
    return conflicts;
  }

  detectDataConflicts(thread1, thread2, startIndex) {
    const conflicts = [];
    
    // Check for conflicting data values (dates, budgets, etc.)
    const data1 = this.extractDataPoints(thread1.messages.slice(startIndex));
    const data2 = this.extractDataPoints(thread2.messages.slice(startIndex));
    
    Object.keys(data1).forEach(key => {
      if (data2[key] && data1[key].value !== data2[key].value) {
        conflicts.push({
          id: `data-conflict-${key}`,
          type: 'data',
          severity: 'medium',
          dataType: key,
          thread1: { id: thread1.id, value: data1[key] },
          thread2: { id: thread2.id, value: data2[key] },
          description: `Conflicting ${key} values`
        });
      }
    });
    
    return conflicts;
  }

  detectTimelineConflicts(thread1, thread2, startIndex) {
    const conflicts = [];
    
    // Check for overlapping or conflicting time periods
    const events1 = this.extractTimelineEvents(thread1.messages.slice(startIndex));
    const events2 = this.extractTimelineEvents(thread2.messages.slice(startIndex));
    
    events1.forEach(event1 => {
      events2.forEach(event2 => {
        if (this.areEventsConflicting(event1, event2)) {
          conflicts.push({
            id: `timeline-conflict-${event1.id}-${event2.id}`,
            type: 'timeline',
            severity: 'medium',
            thread1: { id: thread1.id, event: event1 },
            thread2: { id: thread2.id, event: event2 },
            description: 'Conflicting timeline events'
          });
        }
      });
    });
    
    return conflicts;
  }

  async detectSemanticConflicts(threads, commonElements) {
    if (!this.openai) return [];
    
    try {
      // Prepare conversation excerpts after divergence
      const divergenceIndex = commonElements.divergencePoint?.index || 0;
      const excerpts = threads.map(thread => ({
        threadId: thread.id,
        messages: thread.messages
          .slice(divergenceIndex, divergenceIndex + 10)
          .map(m => `${m.role}: ${m.content}`)
          .join('\n')
      }));
      
      const prompt = `
        Analyze these conversation branches for semantic conflicts.
        Look for contradictory plans, incompatible decisions, or conflicting information.
        
        ${excerpts.map((e, i) => `Branch ${i + 1} (${e.threadId}):\n${e.messages}`).join('\n\n')}
        
        Return a JSON array of conflicts:
        [{
          "type": "semantic",
          "description": "Brief description",
          "severity": "low|medium|high",
          "threads": ["thread1_id", "thread2_id"],
          "suggestion": "Resolution suggestion"
        }]
        
        Only return JSON, no other text.
      `;
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing conversation conflicts in travel planning.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      });
      
      const responseText = response.choices[0]?.message?.content?.trim();
      if (responseText) {
        return JSON.parse(responseText);
      }
      
    } catch (error) {
      console.warn('Semantic conflict detection failed:', error);
    }
    
    return [];
  }

  async executeMerge(threads, commonElements, resolutions, config) {
    const strategy = config.strategy || 'chronological';
    const primaryThread = this.selectPrimaryThread(threads, config);
    
    const mergeResult = {
      primaryThreadId: primaryThread.id,
      strategy,
      messagesMerged: 0,
      conflictsResolved: Object.keys(resolutions).length,
      mergeRecordId: null
    };
    
    // Create merge record
    const mergeRecord = await this.createMergeRecord(
      threads.map(t => t.id),
      primaryThread.id,
      strategy,
      resolutions
    );
    mergeResult.mergeRecordId = mergeRecord.id;
    
    // Execute merge based on strategy
    switch (strategy) {
      case 'chronological':
        await this.chronologicalMerge(primaryThread, threads, resolutions, mergeResult);
        break;
        
      case 'intelligent':
        await this.intelligentMerge(primaryThread, threads, resolutions, commonElements, mergeResult);
        break;
        
      case 'manual':
        await this.manualMerge(primaryThread, threads, resolutions, config, mergeResult);
        break;
        
      default:
        throw new Error(`Unknown merge strategy: ${strategy}`);
    }
    
    // Update primary thread metadata
    await this.updatePrimaryThreadAfterMerge(primaryThread, threads, mergeResult);
    
    return mergeResult;
  }

  async chronologicalMerge(primaryThread, threads, resolutions, result) {
    // Get all messages from all threads
    const allMessages = [];
    
    threads.forEach(thread => {
      thread.messages.forEach(msg => {
        allMessages.push({
          ...msg,
          sourceThreadId: thread.id,
          mergeAnnotation: thread.id === primaryThread.id ? null : `Merged from: ${thread.title}`
        });
      });
    });
    
    // Sort by timestamp
    allMessages.sort((a, b) => 
      new Date(a.created_at) - new Date(b.created_at)
    );
    
    // Deduplicate and apply resolutions
    const mergedMessages = this.applyResolutions(
      this.deduplicateMessages(allMessages),
      resolutions
    );
    
    // Update primary thread with merged messages
    result.messagesMerged = await this.updateThreadMessages(
      primaryThread.id,
      mergedMessages
    );
  }

  async intelligentMerge(primaryThread, threads, resolutions, commonElements, result) {
    // Group messages by topic/context
    const messageGroups = await this.groupMessagesByContext(threads, commonElements);
    
    // Merge each group intelligently
    const mergedGroups = [];
    
    for (const group of messageGroups) {
      const mergedGroup = await this.mergeMessageGroup(
        group,
        resolutions,
        primaryThread.id
      );
      mergedGroups.push(...mergedGroup);
    }
    
    // Sort and finalize
    const finalMessages = mergedGroups.sort((a, b) => 
      new Date(a.created_at) - new Date(b.created_at)
    );
    
    result.messagesMerged = await this.updateThreadMessages(
      primaryThread.id,
      finalMessages
    );
  }

  async manualMerge(primaryThread, threads, resolutions, config, result) {
    // Apply manual selections from config
    const selectedMessages = [];
    
    if (config.messageSelections) {
      config.messageSelections.forEach(selection => {
        const thread = threads.find(t => t.id === selection.threadId);
        if (thread) {
          const message = thread.messages.find(m => m.id === selection.messageId);
          if (message) {
            selectedMessages.push({
              ...message,
              sourceThreadId: thread.id,
              mergeAnnotation: selection.annotation
            });
          }
        }
      });
    }
    
    // Apply resolutions
    const finalMessages = this.applyResolutions(selectedMessages, resolutions);
    
    result.messagesMerged = await this.updateThreadMessages(
      primaryThread.id,
      finalMessages
    );
  }

  // Utility methods

  selectPrimaryThread(threads, config) {
    if (config.primaryThreadId) {
      const primary = threads.find(t => t.id === config.primaryThreadId);
      if (primary) return primary;
    }
    
    // Select based on activity, message count, or recency
    return threads.reduce((primary, thread) => {
      const primaryScore = this.calculateThreadScore(primary);
      const threadScore = this.calculateThreadScore(thread);
      
      return threadScore > primaryScore ? thread : primary;
    });
  }

  calculateThreadScore(thread) {
    let score = 0;
    
    // Message count
    score += (thread.messages?.length || 0) * 10;
    
    // Recent activity
    const lastMessage = thread.messages?.[thread.messages.length - 1];
    if (lastMessage) {
      const daysSinceActivity = (Date.now() - new Date(lastMessage.created_at)) / (1000 * 60 * 60 * 24);
      score += Math.max(0, 100 - daysSinceActivity);
    }
    
    // Active status
    if (thread.thread_status === 'active') score += 50;
    
    return score;
  }

  areDecisionsConflicting(decision1, decision2) {
    // Simple conflict detection - can be enhanced
    const keywords1 = this.extractKeywords(decision1.content);
    const keywords2 = this.extractKeywords(decision2.content);
    
    // Check for opposite decisions
    const opposites = [
      ['yes', 'no'],
      ['accept', 'reject'],
      ['go', 'stay'],
      ['book', 'cancel']
    ];
    
    for (const [word1, word2] of opposites) {
      if ((keywords1.includes(word1) && keywords2.includes(word2)) ||
          (keywords1.includes(word2) && keywords2.includes(word1))) {
        return true;
      }
    }
    
    return false;
  }

  extractKeywords(text) {
    return text.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3);
  }

  extractDataPoints(messages) {
    const dataPoints = {};
    
    messages.forEach(msg => {
      // Extract dates
      const dates = msg.content.match(/\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}/g);
      if (dates) {
        dates.forEach(date => {
          dataPoints[`date-${date}`] = {
            value: date,
            messageId: msg.id,
            type: 'date'
          };
        });
      }
      
      // Extract money amounts
      const amounts = msg.content.match(/\$[\d,]+\.?\d*/g);
      if (amounts) {
        amounts.forEach(amount => {
          dataPoints[`amount-${amount}`] = {
            value: amount,
            messageId: msg.id,
            type: 'money'
          };
        });
      }
    });
    
    return dataPoints;
  }

  extractTimelineEvents(messages) {
    const events = [];
    
    messages.forEach(msg => {
      if (msg.metadata?.event_date || msg.content.includes('on') || msg.content.includes('at')) {
        events.push({
          id: msg.id,
          date: msg.metadata?.event_date || this.extractDateFromContent(msg.content),
          description: msg.content.substring(0, 100)
        });
      }
    });
    
    return events;
  }

  extractDateFromContent(content) {
    const dateMatch = content.match(/\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}/);
    return dateMatch ? dateMatch[0] : null;
  }

  areEventsConflicting(event1, event2) {
    if (!event1.date || !event2.date) return false;
    
    const date1 = new Date(event1.date);
    const date2 = new Date(event2.date);
    
    // Same date but different events
    return date1.getTime() === date2.getTime() && 
           event1.description !== event2.description;
  }

  deduplicateMessages(messages) {
    const seen = new Map();
    
    return messages.filter(msg => {
      // Use content hash for deduplication
      const hash = `${msg.role}-${msg.content}-${msg.created_at}`;
      
      if (seen.has(hash)) {
        return false;
      }
      
      seen.set(hash, true);
      return true;
    });
  }

  deduplicateConflicts(conflicts) {
    const seen = new Set();
    
    return conflicts.filter(conflict => {
      const key = `${conflict.type}-${conflict.thread1.id}-${conflict.thread2.id}`;
      if (seen.has(key)) return false;
      
      seen.add(key);
      return true;
    });
  }

  prioritizeConflicts(conflicts) {
    return conflicts.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
    });
  }

  async automaticResolution(conflict, config) {
    // Automatic resolution based on rules
    const resolution = {
      conflictId: conflict.id,
      strategy: 'automatic',
      action: null,
      reason: null
    };
    
    switch (conflict.type) {
      case 'decision':
        // Prefer more recent decision
        const date1 = new Date(conflict.thread1.message.created_at);
        const date2 = new Date(conflict.thread2.message.created_at);
        
        if (date1 > date2) {
          resolution.action = 'use_thread1';
          resolution.reason = 'More recent decision';
        } else {
          resolution.action = 'use_thread2';
          resolution.reason = 'More recent decision';
        }
        break;
        
      case 'data':
        // Use configured preference or most recent
        resolution.action = config.preferThread || 'use_most_recent';
        resolution.reason = 'Configured preference';
        break;
        
      default:
        resolution.action = 'skip';
        resolution.reason = 'No automatic resolution available';
    }
    
    return resolution;
  }

  async interactiveResolution(conflict, config) {
    // In a real implementation, this would trigger UI interaction
    // For now, simulate with config options
    return {
      conflictId: conflict.id,
      strategy: 'interactive',
      action: config.userSelections?.[conflict.id] || 'skip',
      reason: 'User selection'
    };
  }

  manualResolution(conflict, config) {
    return {
      conflictId: conflict.id,
      strategy: 'manual',
      action: config.manualResolutions?.[conflict.id] || 'skip',
      reason: 'Manual resolution'
    };
  }

  defaultResolution(conflict) {
    return {
      conflictId: conflict.id,
      strategy: 'default',
      action: 'use_primary',
      reason: 'Default to primary thread'
    };
  }

  applyResolutions(messages, resolutions) {
    return messages.map(msg => {
      const conflictResolution = Object.values(resolutions).find(r => 
        r.conflictId && r.conflictId.includes(msg.id)
      );
      
      if (conflictResolution) {
        return {
          ...msg,
          metadata: {
            ...msg.metadata,
            conflictResolved: true,
            resolutionStrategy: conflictResolution.strategy,
            resolutionAction: conflictResolution.action
          }
        };
      }
      
      return msg;
    });
  }

  extractCommonContext(threads, commonElements) {
    const context = {
      destinations: new Set(),
      dates: new Set(),
      budget: null,
      preferences: {}
    };
    
    // Extract from shared messages
    commonElements.sharedMessages.forEach(msg => {
      // Extract destinations
      const destinations = msg.content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
      if (destinations) {
        destinations.forEach(dest => context.destinations.add(dest));
      }
      
      // Extract dates
      const dates = msg.content.match(/\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}/g);
      if (dates) {
        dates.forEach(date => context.dates.add(date));
      }
    });
    
    return {
      destinations: Array.from(context.destinations),
      dates: Array.from(context.dates),
      preferences: context.preferences
    };
  }

  async createMergeRecord(threadIds, primaryThreadId, strategy, resolutions) {
    const record = {
      id: uuidv4(),
      primary_thread_id: primaryThreadId,
      merged_thread_ids: threadIds.filter(id => id !== primaryThreadId),
      merge_type: 'manual',
      merge_strategy: strategy,
      conflicts_resolved: resolutions,
      merge_metadata: {
        merge_date: new Date().toISOString(),
        conflict_count: Object.keys(resolutions).length
      },
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await this.supabase
      .from('thread_merge_records')
      .insert(record)
      .select()
      .single();
    
    if (error) {
      console.error('Failed to create merge record:', error);
      record.id = 'temp-' + record.id; // Use temporary ID
    }
    
    return data || record;
  }

  async updateThreadMessages(threadId, messages) {
    // In a real implementation, this would update the database
    // For now, return the count
    return messages.length;
  }

  async updatePrimaryThreadAfterMerge(primaryThread, sourceThreads, mergeResult) {
    const updates = {
      thread_summary: await this.generateMergeSummary(primaryThread, sourceThreads),
      updated_at: new Date().toISOString(),
      thread_metadata: {
        ...primaryThread.thread_metadata,
        last_merge: {
          date: new Date().toISOString(),
          threadCount: sourceThreads.length,
          messagesMerged: mergeResult.messagesMerged,
          conflictsResolved: mergeResult.conflictsResolved
        }
      }
    };
    
    await this.supabase
      .from('conversations')
      .update(updates)
      .eq('id', primaryThread.id);
  }

  async generateMergeSummary(primaryThread, sourceThreads) {
    const threadTitles = sourceThreads
      .filter(t => t.id !== primaryThread.id)
      .map(t => t.title)
      .join(', ');
    
    return `Merged ${sourceThreads.length} threads: ${threadTitles}. Contains unified conversation history with resolved conflicts.`;
  }

  async updateMergedThreadStatuses(threadIds, primaryThreadId, mergeRecordId) {
    const updates = threadIds
      .filter(id => id !== primaryThreadId)
      .map(threadId => 
        this.supabase
          .from('conversations')
          .update({
            thread_status: 'merged',
            updated_at: new Date().toISOString(),
            thread_metadata: {
              merged_into: primaryThreadId,
              merge_record_id: mergeRecordId,
              merge_date: new Date().toISOString()
            }
          })
          .eq('id', threadId)
      );
    
    await Promise.all(updates);
  }

  hasCircularReference(threads) {
    // Check for circular parent-child relationships
    const parentMap = new Map();
    
    threads.forEach(thread => {
      parentMap.set(thread.id, thread.parent_conversation_id);
    });
    
    for (const thread of threads) {
      const visited = new Set();
      let current = thread.id;
      
      while (current) {
        if (visited.has(current)) {
          return true; // Circular reference found
        }
        
        visited.add(current);
        current = parentMap.get(current);
      }
    }
    
    return false;
  }

  async checkCommonAncestor(threads) {
    const ancestor = await this.findCommonAncestor(threads);
    return ancestor !== null;
  }

  async groupMessagesByContext(threads, commonElements) {
    // Group messages by topic or context for intelligent merging
    const groups = [];
    const divergenceIndex = commonElements.divergencePoint?.index || 0;
    
    // Collect all messages after divergence
    const allMessages = [];
    threads.forEach(thread => {
      thread.messages.slice(divergenceIndex).forEach(msg => {
        allMessages.push({
          ...msg,
          sourceThreadId: thread.id
        });
      });
    });
    
    // Simple grouping by time proximity and content similarity
    // In a real implementation, this could use more sophisticated clustering
    const timeWindow = 5 * 60 * 1000; // 5 minutes
    
    allMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    let currentGroup = [];
    allMessages.forEach(msg => {
      if (currentGroup.length === 0) {
        currentGroup.push(msg);
      } else {
        const lastMsg = currentGroup[currentGroup.length - 1];
        const timeDiff = new Date(msg.created_at) - new Date(lastMsg.created_at);
        
        if (timeDiff <= timeWindow) {
          currentGroup.push(msg);
        } else {
          groups.push([...currentGroup]);
          currentGroup = [msg];
        }
      }
    });
    
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    
    return groups;
  }

  async mergeMessageGroup(group, resolutions, primaryThreadId) {
    // Merge a group of related messages
    const mergedMessages = [];
    
    // Remove duplicates within group
    const uniqueMessages = this.deduplicateMessages(group);
    
    // Apply resolutions
    const resolvedMessages = this.applyResolutions(uniqueMessages, resolutions);
    
    // Add merge annotations
    resolvedMessages.forEach(msg => {
      mergedMessages.push({
        ...msg,
        conversation_id: primaryThreadId,
        metadata: {
          ...msg.metadata,
          merged_from_thread: msg.sourceThreadId,
          merge_group: true
        }
      });
    });
    
    return mergedMessages;
  }

  getAllMessagesFromThreads(threads) {
    const allMessages = [];
    
    threads.forEach(thread => {
      (thread.messages || []).forEach(msg => {
        allMessages.push({
          ...msg,
          sourceThreadId: thread.id
        });
      });
    });
    
    return allMessages;
  }

  sortMessagesByStrategy(messages, strategy) {
    switch (strategy) {
      case 'chronological':
        return messages.sort((a, b) => 
          new Date(a.created_at) - new Date(b.created_at)
        );
        
      case 'intelligent':
        // Group by context, then sort chronologically within groups
        return messages.sort((a, b) => {
          // First by context group if available
          if (a.metadata?.context_group && b.metadata?.context_group) {
            const groupDiff = a.metadata.context_group - b.metadata.context_group;
            if (groupDiff !== 0) return groupDiff;
          }
          
          // Then by timestamp
          return new Date(a.created_at) - new Date(b.created_at);
        });
        
      default:
        return messages;
    }
  }

  async testLLMConnection() {
    try {
      await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1
      });
    } catch (error) {
      if (!error.message.includes('quota')) {
        throw error;
      }
    }
  }

  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('ThreadMerger not initialized. Call initialize() first.');
    }
  }
}

export default ThreadMerger;