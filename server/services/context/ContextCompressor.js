/**
 * ContextCompressor - Intelligent Context Compression for Tala AI
 * 
 * Compresses conversation context to fit within token limits while preserving
 * the most important information for maintaining conversation coherence.
 */

import ImportanceScorer from './ImportanceScorer.js';
import SummaryGenerator from './SummaryGenerator.js';
import { encoding_for_model } from 'tiktoken';

export class ContextCompressor {
  constructor(options = {}) {
    this.options = {
      defaultMaxTokens: options.defaultMaxTokens || 4000,
      compressionStrategies: options.compressionStrategies || [
        'sliding-window',
        'hierarchical',
        'entity-focused',
        'query-relevant'
      ],
      recentMessageCount: options.recentMessageCount || 10,
      minImportanceScore: options.minImportanceScore || 0.6,
      summaryRatio: options.summaryRatio || 0.3, // Summary takes 30% of available tokens
      ...options
    };
    
    // Initialize dependencies
    this.importanceScorer = new ImportanceScorer(options.scorerOptions);
    this.summaryGenerator = new SummaryGenerator(options.summaryOptions);
    
    // Token counting
    this.tokenizers = new Map();
    
    this.initialized = false;
  }

  /**
   * Initialize the context compressor
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      console.log('🗜️ Initializing ContextCompressor...');
      
      // Initialize dependencies
      await this.importanceScorer.initialize();
      await this.summaryGenerator.initialize();
      
      // Initialize tokenizers for common models
      const models = ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo'];
      for (const model of models) {
        try {
          this.tokenizers.set(model, encoding_for_model(model));
        } catch (error) {
          // Use cl100k_base as fallback
          this.tokenizers.set(model, encoding_for_model('cl100k_base'));
        }
      }
      
      this.initialized = true;
      console.log('✅ ContextCompressor initialized successfully');
      
    } catch (error) {
      console.error('❌ ContextCompressor initialization failed:', error);
      throw error;
    }
  }

  /**
   * Compress context to fit within token limits
   * @param {Array} messages - Conversation messages
   * @param {number} maxTokens - Maximum token limit
   * @param {Object} options - Compression options
   * @returns {Object} Compressed context
   */
  async compressContext(messages, maxTokens = null, options = {}) {
    try {
      this.ensureInitialized();
      
      const targetTokens = maxTokens || this.options.defaultMaxTokens;
      const strategy = options.strategy || this.selectBestStrategy(messages, targetTokens);
      
      console.log(`🗜️ Compressing ${messages.length} messages to fit within ${targetTokens} tokens using ${strategy} strategy`);
      
      // Calculate current token count
      const currentTokens = this.countTokens(messages, options.model);
      
      if (currentTokens <= targetTokens) {
        return {
          success: true,
          compressed: false,
          messages,
          strategy: 'none',
          tokenCount: currentTokens,
          compressionRatio: 1.0
        };
      }
      
      // Apply compression strategy
      let compressedResult;
      switch (strategy) {
        case 'sliding-window':
          compressedResult = await this.slidingWindowCompression(messages, targetTokens, options);
          break;
          
        case 'hierarchical':
          compressedResult = await this.hierarchicalCompression(messages, targetTokens, options);
          break;
          
        case 'entity-focused':
          compressedResult = await this.entityFocusedCompression(messages, targetTokens, options);
          break;
          
        case 'query-relevant':
          compressedResult = await this.queryRelevantCompression(messages, targetTokens, options);
          break;
          
        default:
          compressedResult = await this.slidingWindowCompression(messages, targetTokens, options);
      }
      
      // Ensure we're within token limit
      const finalTokens = this.countTokens(compressedResult.messages, options.model);
      
      return {
        success: true,
        compressed: true,
        messages: compressedResult.messages,
        summary: compressedResult.summary,
        strategy,
        originalCount: messages.length,
        compressedCount: compressedResult.messages.length,
        tokenCount: finalTokens,
        compressionRatio: finalTokens / currentTokens,
        droppedMessages: compressedResult.droppedMessages || []
      };
      
    } catch (error) {
      console.error('❌ Failed to compress context:', error);
      return {
        success: false,
        error: error.message,
        messages: messages.slice(-this.options.recentMessageCount) // Fallback to recent messages
      };
    }
  }

  /**
   * Extract key points from conversation
   * @param {Array} messages - Conversation messages
   * @returns {Object} Key points extracted
   */
  async extractKeyPoints(messages) {
    try {
      this.ensureInitialized();
      
      console.log(`🔑 Extracting key points from ${messages.length} messages`);
      
      const keyPoints = {
        decisions: [],
        preferences: [],
        constraints: [],
        entities: new Map(),
        questions: [],
        problems: []
      };
      
      // Score all messages
      const scoredMessages = await this.importanceScorer.scoreMessages(messages);
      
      // Extract from high-importance messages
      for (const scoredMsg of scoredMessages) {
        if (scoredMsg.score < this.options.minImportanceScore) continue;
        
        const msg = scoredMsg.message;
        
        // Extract decisions
        if (scoredMsg.categories.includes('decision')) {
          keyPoints.decisions.push({
            content: msg.content,
            timestamp: msg.created_at,
            importance: scoredMsg.score
          });
        }
        
        // Extract preferences
        if (scoredMsg.categories.includes('preference')) {
          keyPoints.preferences.push({
            content: this.extractPreference(msg.content),
            timestamp: msg.created_at,
            importance: scoredMsg.score
          });
        }
        
        // Extract constraints
        if (scoredMsg.categories.includes('constraint')) {
          keyPoints.constraints.push({
            content: this.extractConstraint(msg.content),
            timestamp: msg.created_at,
            importance: scoredMsg.score
          });
        }
        
        // Extract entities
        for (const entity of scoredMsg.entities) {
          if (!keyPoints.entities.has(entity.type)) {
            keyPoints.entities.set(entity.type, []);
          }
          keyPoints.entities.get(entity.type).push(entity);
        }
        
        // Extract unresolved questions
        if (msg.role === 'user' && msg.content.includes('?') && !this.hasResponse(msg, messages)) {
          keyPoints.questions.push({
            content: msg.content,
            timestamp: msg.created_at
          });
        }
        
        // Extract problems/issues
        if (scoredMsg.categories.includes('problem')) {
          keyPoints.problems.push({
            content: msg.content,
            timestamp: msg.created_at,
            resolved: this.isProblemResolved(msg, messages)
          });
        }
      }
      
      // Sort by importance and deduplicate
      Object.keys(keyPoints).forEach(key => {
        if (Array.isArray(keyPoints[key])) {
          keyPoints[key] = this.deduplicateAndSort(keyPoints[key]);
        }
      });
      
      return {
        success: true,
        keyPoints,
        messageCount: messages.length,
        extractedCount: Object.values(keyPoints).reduce((sum, items) => 
          sum + (Array.isArray(items) ? items.length : items.size), 0
        )
      };
      
    } catch (error) {
      console.error('❌ Failed to extract key points:', error);
      return {
        success: false,
        error: error.message,
        keyPoints: {}
      };
    }
  }

  /**
   * Prioritize information in messages
   * @param {Array} messages - Messages to prioritize
   * @returns {Array} Prioritized messages
   */
  async prioritizeInformation(messages) {
    try {
      this.ensureInitialized();
      
      console.log(`📊 Prioritizing ${messages.length} messages`);
      
      // Score all messages
      const scoredMessages = await this.importanceScorer.scoreMessages(messages);
      
      // Sort by importance score
      scoredMessages.sort((a, b) => b.score - a.score);
      
      // Group by priority tiers
      const prioritized = {
        critical: [],    // Score >= 0.9
        high: [],        // Score >= 0.7
        medium: [],      // Score >= 0.5
        low: []          // Score < 0.5
      };
      
      scoredMessages.forEach(scoredMsg => {
        if (scoredMsg.score >= 0.9) {
          prioritized.critical.push(scoredMsg);
        } else if (scoredMsg.score >= 0.7) {
          prioritized.high.push(scoredMsg);
        } else if (scoredMsg.score >= 0.5) {
          prioritized.medium.push(scoredMsg);
        } else {
          prioritized.low.push(scoredMsg);
        }
      });
      
      return {
        success: true,
        prioritized,
        stats: {
          total: messages.length,
          critical: prioritized.critical.length,
          high: prioritized.high.length,
          medium: prioritized.medium.length,
          low: prioritized.low.length
        }
      };
      
    } catch (error) {
      console.error('❌ Failed to prioritize information:', error);
      return {
        success: false,
        error: error.message,
        prioritized: { critical: [], high: [], medium: [], low: [] }
      };
    }
  }

  /**
   * Create context summary
   * @param {Array} messages - Messages to summarize
   * @param {Object} options - Summary options
   * @returns {Object} Context summary
   */
  async createContextSummary(messages, options = {}) {
    try {
      this.ensureInitialized();
      
      const maxLength = options.maxLength || 500;
      const style = options.style || 'comprehensive';
      
      console.log(`📝 Creating ${style} context summary for ${messages.length} messages`);
      
      // Extract key points first
      const keyPointsResult = await this.extractKeyPoints(messages);
      const keyPoints = keyPointsResult.success ? keyPointsResult.keyPoints : {};
      
      // Generate summary
      const summary = await this.summaryGenerator.generateSummary(messages, {
        maxLength,
        style,
        keyPoints,
        includeTimeline: options.includeTimeline !== false,
        includePlanning: true
      });
      
      return {
        success: true,
        summary: summary.text,
        metadata: {
          messageCount: messages.length,
          summaryLength: summary.text.length,
          keyDecisions: keyPoints.decisions?.length || 0,
          keyEntities: keyPoints.entities?.size || 0,
          style
        }
      };
      
    } catch (error) {
      console.error('❌ Failed to create context summary:', error);
      return {
        success: false,
        error: error.message,
        summary: 'Unable to generate summary'
      };
    }
  }

  /**
   * Select relevant messages based on current query
   * @param {Array} messages - All messages
   * @param {string} currentQuery - Current user query
   * @param {Object} options - Selection options
   * @returns {Array} Relevant messages
   */
  async selectRelevantMessages(messages, currentQuery, options = {}) {
    try {
      this.ensureInitialized();
      
      const maxMessages = options.maxMessages || 20;
      const minRelevance = options.minRelevance || 0.5;
      
      console.log(`🎯 Selecting messages relevant to: "${currentQuery.substring(0, 50)}..."`);
      
      // Extract topics from current query
      const queryTopics = await this.extractTopics(currentQuery);
      
      // Score messages for relevance
      const relevanceScores = await Promise.all(messages.map(async (msg, index) => {
        const score = await this.calculateRelevance(msg, currentQuery, queryTopics);
        const recencyBoost = this.calculateRecencyBoost(index, messages.length);
        
        return {
          message: msg,
          index,
          relevanceScore: score,
          recencyScore: recencyBoost,
          totalScore: (score * 0.7) + (recencyBoost * 0.3) // 70% relevance, 30% recency
        };
      }));
      
      // Sort by total score
      relevanceScores.sort((a, b) => b.totalScore - a.totalScore);
      
      // Select top relevant messages
      const selectedMessages = [];
      const selectedIndices = new Set();
      
      for (const scored of relevanceScores) {
        if (scored.totalScore >= minRelevance && selectedMessages.length < maxMessages) {
          selectedMessages.push(scored.message);
          selectedIndices.add(scored.index);
        }
      }
      
      // Ensure we include some recent messages for context continuity
      const recentCount = Math.min(3, messages.length);
      for (let i = messages.length - recentCount; i < messages.length; i++) {
        if (!selectedIndices.has(i) && selectedMessages.length < maxMessages) {
          selectedMessages.push(messages[i]);
          selectedIndices.add(i);
        }
      }
      
      // Sort selected messages chronologically
      selectedMessages.sort((a, b) => 
        new Date(a.created_at) - new Date(b.created_at)
      );
      
      return {
        success: true,
        messages: selectedMessages,
        stats: {
          totalMessages: messages.length,
          selectedCount: selectedMessages.length,
          queryTopics: queryTopics.length,
          averageRelevance: relevanceScores.reduce((sum, s) => sum + s.relevanceScore, 0) / relevanceScores.length
        }
      };
      
    } catch (error) {
      console.error('❌ Failed to select relevant messages:', error);
      return {
        success: false,
        error: error.message,
        messages: messages.slice(-this.options.recentMessageCount)
      };
    }
  }

  // Compression strategies

  async slidingWindowCompression(messages, maxTokens, options) {
    console.log('📊 Using sliding window compression strategy');
    
    const recentCount = options.recentCount || this.options.recentMessageCount;
    const summaryTokens = Math.floor(maxTokens * this.options.summaryRatio);
    const messageTokens = maxTokens - summaryTokens;
    
    // Always keep recent messages
    const recentMessages = messages.slice(-recentCount);
    let selectedMessages = [...recentMessages];
    let currentTokens = this.countTokens(recentMessages, options.model);
    
    // Score and add important older messages
    const olderMessages = messages.slice(0, -recentCount);
    const scoredOlder = await this.importanceScorer.scoreMessages(olderMessages);
    scoredOlder.sort((a, b) => b.score - a.score);
    
    for (const scored of scoredOlder) {
      const msgTokens = this.countTokens([scored.message], options.model);
      if (currentTokens + msgTokens <= messageTokens && scored.score >= this.options.minImportanceScore) {
        selectedMessages.unshift(scored.message);
        currentTokens += msgTokens;
      }
    }
    
    // Generate summary of dropped messages
    const droppedMessages = messages.filter(msg => !selectedMessages.includes(msg));
    let summary = null;
    
    if (droppedMessages.length > 0) {
      const summaryResult = await this.createContextSummary(droppedMessages, {
        maxLength: Math.floor(summaryTokens / 4) // Rough token to character estimate
      });
      
      if (summaryResult.success) {
        summary = {
          role: 'system',
          content: `[Previous conversation summary: ${summaryResult.summary}]`,
          metadata: { is_summary: true, message_count: droppedMessages.length }
        };
        selectedMessages.unshift(summary);
      }
    }
    
    return {
      messages: selectedMessages,
      summary,
      droppedMessages
    };
  }

  async hierarchicalCompression(messages, maxTokens, options) {
    console.log('📊 Using hierarchical summarization strategy');
    
    // Divide messages into time-based chunks
    const chunks = this.createTimeChunks(messages, options.chunkSize || 10);
    const compressedMessages = [];
    let totalTokens = 0;
    
    // Process chunks from most recent to oldest
    for (let i = chunks.length - 1; i >= 0; i--) {
      const chunk = chunks[i];
      const isRecent = i === chunks.length - 1;
      
      if (isRecent) {
        // Keep recent messages detailed
        compressedMessages.unshift(...chunk);
        totalTokens += this.countTokens(chunk, options.model);
      } else {
        // Summarize older chunks progressively more
        const compressionLevel = Math.min(0.8, 0.2 + (0.1 * (chunks.length - i - 1)));
        const chunkTokens = Math.floor((maxTokens - totalTokens) * compressionLevel / (i + 1));
        
        if (chunkTokens > 50) {
          const summary = await this.summaryGenerator.generateSummary(chunk, {
            maxLength: Math.floor(chunkTokens / 4),
            style: 'concise'
          });
          
          const summaryMsg = {
            role: 'system',
            content: `[Messages ${chunk[0].id}-${chunk[chunk.length-1].id} summary: ${summary.text}]`,
            metadata: { 
              is_summary: true, 
              message_count: chunk.length,
              time_range: {
                start: chunk[0].created_at,
                end: chunk[chunk.length-1].created_at
              }
            }
          };
          
          compressedMessages.unshift(summaryMsg);
          totalTokens += this.countTokens([summaryMsg], options.model);
        }
      }
      
      if (totalTokens >= maxTokens * 0.9) break;
    }
    
    return {
      messages: compressedMessages,
      summary: null,
      droppedMessages: messages.filter(msg => 
        !compressedMessages.some(cm => cm.id === msg.id)
      )
    };
  }

  async entityFocusedCompression(messages, maxTokens, options) {
    console.log('📊 Using entity-focused compression strategy');
    
    // Extract all entities from messages
    const entityMap = new Map();
    const entityMessages = new Map();
    
    for (const msg of messages) {
      const entities = await this.extractEntities(msg.content);
      for (const entity of entities) {
        if (!entityMap.has(entity.type)) {
          entityMap.set(entity.type, new Set());
        }
        entityMap.get(entity.type).add(entity.value);
        
        const key = `${entity.type}:${entity.value}`;
        if (!entityMessages.has(key)) {
          entityMessages.set(key, []);
        }
        entityMessages.get(key).push(msg);
      }
    }
    
    // Prioritize entities
    const prioritizedEntities = options.priorityEntities || ['destination', 'date', 'budget'];
    const selectedMessages = new Set();
    let currentTokens = 0;
    
    // First, include messages about priority entities
    for (const entityType of prioritizedEntities) {
      if (entityMap.has(entityType)) {
        for (const value of entityMap.get(entityType)) {
          const key = `${entityType}:${value}`;
          const msgs = entityMessages.get(key) || [];
          
          for (const msg of msgs) {
            if (!selectedMessages.has(msg)) {
              const msgTokens = this.countTokens([msg], options.model);
              if (currentTokens + msgTokens <= maxTokens * 0.7) {
                selectedMessages.add(msg);
                currentTokens += msgTokens;
              }
            }
          }
        }
      }
    }
    
    // Add recent messages
    const recentMessages = messages.slice(-5);
    for (const msg of recentMessages) {
      if (!selectedMessages.has(msg)) {
        const msgTokens = this.countTokens([msg], options.model);
        if (currentTokens + msgTokens <= maxTokens * 0.9) {
          selectedMessages.add(msg);
          currentTokens += msgTokens;
        }
      }
    }
    
    // Convert to array and sort chronologically
    const finalMessages = Array.from(selectedMessages).sort((a, b) => 
      new Date(a.created_at) - new Date(b.created_at)
    );
    
    // Add entity summary
    const entitySummary = this.createEntitySummary(entityMap);
    if (entitySummary) {
      finalMessages.unshift({
        role: 'system',
        content: entitySummary,
        metadata: { is_entity_summary: true }
      });
    }
    
    return {
      messages: finalMessages,
      summary: entitySummary,
      droppedMessages: messages.filter(msg => !selectedMessages.has(msg))
    };
  }

  async queryRelevantCompression(messages, maxTokens, options) {
    console.log('📊 Using query-relevant compression strategy');
    
    const currentQuery = options.currentQuery || messages[messages.length - 1]?.content || '';
    
    // Select relevant messages
    const relevantResult = await this.selectRelevantMessages(messages, currentQuery, {
      maxMessages: Math.floor(messages.length * 0.4)
    });
    
    if (!relevantResult.success) {
      return this.slidingWindowCompression(messages, maxTokens, options);
    }
    
    let selectedMessages = relevantResult.messages;
    let currentTokens = this.countTokens(selectedMessages, options.model);
    
    // If still over limit, apply secondary compression
    if (currentTokens > maxTokens) {
      const scored = await this.importanceScorer.scoreMessages(selectedMessages);
      scored.sort((a, b) => b.score - a.score);
      
      selectedMessages = [];
      currentTokens = 0;
      
      for (const scoredMsg of scored) {
        const msgTokens = this.countTokens([scoredMsg.message], options.model);
        if (currentTokens + msgTokens <= maxTokens * 0.9) {
          selectedMessages.push(scoredMsg.message);
          currentTokens += msgTokens;
        }
      }
      
      // Ensure we have recent context
      const lastMsg = messages[messages.length - 1];
      if (!selectedMessages.includes(lastMsg)) {
        selectedMessages.push(lastMsg);
      }
    }
    
    // Sort chronologically
    selectedMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    return {
      messages: selectedMessages,
      summary: null,
      droppedMessages: messages.filter(msg => !selectedMessages.includes(msg))
    };
  }

  // Helper methods

  selectBestStrategy(messages, maxTokens) {
    const messageCount = messages.length;
    const avgTokensPerMessage = this.countTokens(messages) / messageCount;
    const compressionRatio = (messageCount * avgTokensPerMessage) / maxTokens;
    
    if (compressionRatio < 2) {
      return 'sliding-window';
    } else if (compressionRatio < 5) {
      return 'hierarchical';
    } else if (this.hasStrongEntityFocus(messages)) {
      return 'entity-focused';
    } else {
      return 'query-relevant';
    }
  }

  countTokens(messages, model = 'gpt-4') {
    const tokenizer = this.tokenizers.get(model) || this.tokenizers.get('gpt-4');
    
    let totalTokens = 0;
    for (const msg of messages) {
      const content = msg.content || '';
      const role = msg.role || 'user';
      
      // Approximate token count including message structure
      totalTokens += tokenizer.encode(`${role}: ${content}`).length + 4;
    }
    
    return totalTokens;
  }

  extractPreference(content) {
    // Simple extraction - can be enhanced
    const preferencePatterns = [
      /i (?:prefer|like|want|love) (.+)/i,
      /my (?:preference|choice) is (.+)/i,
      /(?:would|i'd) rather (.+)/i
    ];
    
    for (const pattern of preferencePatterns) {
      const match = content.match(pattern);
      if (match) return match[1].trim();
    }
    
    return content.substring(0, 100);
  }

  extractConstraint(content) {
    // Extract constraints from content
    const constraintPatterns = [
      /(?:budget|cost|price) (?:is|of) (.+)/i,
      /(?:must|need to|have to) (.+)/i,
      /(?:can't|cannot|unable to) (.+)/i,
      /(?:limited to|restricted to) (.+)/i
    ];
    
    for (const pattern of constraintPatterns) {
      const match = content.match(pattern);
      if (match) return match[1].trim();
    }
    
    return content.substring(0, 100);
  }

  hasResponse(message, allMessages) {
    const msgIndex = allMessages.indexOf(message);
    return msgIndex < allMessages.length - 1 && 
           allMessages[msgIndex + 1].role === 'assistant';
  }

  isProblemResolved(message, allMessages) {
    const msgIndex = allMessages.indexOf(message);
    
    // Check subsequent messages for resolution indicators
    for (let i = msgIndex + 1; i < allMessages.length; i++) {
      const content = allMessages[i].content.toLowerCase();
      if (content.includes('resolved') || 
          content.includes('fixed') || 
          content.includes('sorted out') ||
          content.includes('taken care of')) {
        return true;
      }
    }
    
    return false;
  }

  deduplicateAndSort(items) {
    const seen = new Set();
    const unique = [];
    
    for (const item of items) {
      const key = typeof item === 'object' ? item.content : item;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }
    
    // Sort by importance if available
    if (unique.length > 0 && unique[0].importance !== undefined) {
      unique.sort((a, b) => b.importance - a.importance);
    }
    
    return unique;
  }

  createTimeChunks(messages, chunkSize) {
    const chunks = [];
    for (let i = 0; i < messages.length; i += chunkSize) {
      chunks.push(messages.slice(i, i + chunkSize));
    }
    return chunks;
  }

  async extractTopics(text) {
    // Simple topic extraction - can be enhanced with NLP
    const topics = [];
    
    // Extract destinations
    const destinations = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    topics.push(...destinations.map(d => ({ type: 'destination', value: d })));
    
    // Extract dates
    const dates = text.match(/\b(?:\d{4}[-/]\d{2}[-/]\d{2}|\d{1,2}[-/]\d{1,2}[-/]\d{4})\b/g) || [];
    topics.push(...dates.map(d => ({ type: 'date', value: d })));
    
    // Extract keywords
    const keywords = ['budget', 'hotel', 'flight', 'restaurant', 'activity', 'visa', 'weather'];
    keywords.forEach(keyword => {
      if (text.toLowerCase().includes(keyword)) {
        topics.push({ type: 'keyword', value: keyword });
      }
    });
    
    return topics;
  }

  async calculateRelevance(message, query, queryTopics) {
    const msgContent = message.content.toLowerCase();
    const queryLower = query.toLowerCase();
    
    let relevanceScore = 0;
    
    // Direct content match
    const words = queryLower.split(/\s+/);
    const matchingWords = words.filter(word => msgContent.includes(word));
    relevanceScore += matchingWords.length / words.length * 0.5;
    
    // Topic match
    const msgTopics = await this.extractTopics(message.content);
    const topicMatches = queryTopics.filter(qt => 
      msgTopics.some(mt => mt.type === qt.type && mt.value === qt.value)
    );
    
    if (queryTopics.length > 0) {
      relevanceScore += topicMatches.length / queryTopics.length * 0.5;
    }
    
    return Math.min(1.0, relevanceScore);
  }

  calculateRecencyBoost(index, totalMessages) {
    // Exponential decay for recency
    const position = index / totalMessages;
    return Math.pow(position, 2); // More recent messages get higher scores
  }

  async extractEntities(text) {
    // Simple entity extraction
    const entities = [];
    
    // Destinations
    const destinations = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    destinations.forEach(dest => {
      entities.push({ type: 'destination', value: dest });
    });
    
    // Dates
    const dates = text.match(/\b(?:\d{4}[-/]\d{2}[-/]\d{2}|\d{1,2}[-/]\d{1,2}[-/]\d{4})\b/g) || [];
    dates.forEach(date => {
      entities.push({ type: 'date', value: date });
    });
    
    // Budget amounts
    const amounts = text.match(/\$[\d,]+(?:\.\d{2})?/g) || [];
    amounts.forEach(amount => {
      entities.push({ type: 'budget', value: amount });
    });
    
    return entities;
  }

  createEntitySummary(entityMap) {
    if (entityMap.size === 0) return null;
    
    const parts = [];
    for (const [type, values] of entityMap) {
      const valueList = Array.from(values).slice(0, 5).join(', ');
      parts.push(`${type}: ${valueList}`);
    }
    
    return `[Key entities discussed - ${parts.join('; ')}]`;
  }

  hasStrongEntityFocus(messages) {
    // Check if conversation is heavily entity-focused
    let entityCount = 0;
    
    for (const msg of messages) {
      const content = msg.content.toLowerCase();
      if (content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) ||
          content.match(/\$[\d,]+/g) ||
          content.match(/\d{4}-\d{2}-\d{2}/g)) {
        entityCount++;
      }
    }
    
    return entityCount / messages.length > 0.6;
  }

  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('ContextCompressor not initialized. Call initialize() first.');
    }
  }
}

export default ContextCompressor;