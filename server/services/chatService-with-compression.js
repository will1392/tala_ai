/**
 * Enhanced Chat Service with Context Compression
 * 
 * Extends the existing chat service to include intelligent context compression
 * for handling longer conversations within token limits.
 */

import ChatService from './chatService.js';
import ContextCompressor from './context/ContextCompressor.js';
import { encoding_for_model } from 'tiktoken';

export class EnhancedChatService extends ChatService {
  constructor(options = {}) {
    super(options);
    
    // Initialize context compression
    this.compressionOptions = {
      enabled: options.compressionEnabled !== false,
      maxContextTokens: options.maxContextTokens || 4000,
      compressionStrategy: options.compressionStrategy || 'auto',
      minMessagesToCompress: options.minMessagesToCompress || 20,
      compressionThreshold: options.compressionThreshold || 0.8, // Compress when at 80% of limit
      ...options.compressionOptions
    };
    
    // Initialize compressor
    this.contextCompressor = new ContextCompressor({
      defaultMaxTokens: this.compressionOptions.maxContextTokens,
      compressionStrategies: ['sliding-window', 'hierarchical', 'entity-focused', 'query-relevant'],
      recentMessageCount: 10,
      minImportanceScore: 0.6
    });
    
    // Token counter
    this.tokenizer = null;
    
    this.compressionInitialized = false;
  }

  /**
   * Initialize compression components
   */
  async initializeCompression() {
    if (this.compressionInitialized) return;
    
    try {
      console.log('🗜️ Initializing context compression for chat service...');
      
      // Initialize compressor
      await this.contextCompressor.initialize();
      
      // Initialize tokenizer
      try {
        this.tokenizer = encoding_for_model('gpt-4');
      } catch (error) {
        console.warn('⚠️  Failed to load tokenizer, using estimates');
      }
      
      this.compressionInitialized = true;
      console.log('✅ Context compression initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize compression:', error);
      this.compressionOptions.enabled = false;
    }
  }

  /**
   * Override sendMessage to include compression
   */
  async sendMessage(message, options = {}) {
    try {
      // Initialize compression if needed
      if (this.compressionOptions.enabled && !this.compressionInitialized) {
        await this.initializeCompression();
      }
      
      // Get conversation history
      const conversationId = options.conversationId;
      let messages = [];
      
      if (conversationId) {
        const history = await this.getConversationHistory(conversationId);
        messages = history.messages || [];
      }
      
      // Add current message
      messages.push({
        role: 'user',
        content: message,
        created_at: new Date().toISOString()
      });
      
      // Check if compression is needed
      let processedMessages = messages;
      let compressionResult = null;
      
      if (this.shouldCompress(messages)) {
        compressionResult = await this.compressContext(messages, message, options);
        processedMessages = compressionResult.messages;
        
        // Log compression stats
        if (compressionResult.compressed) {
          console.log(`🗜️ Compressed ${compressionResult.originalCount} messages to ${compressionResult.compressedCount}`);
          console.log(`   Token reduction: ${Math.round((1 - compressionResult.compressionRatio) * 100)}%`);
          console.log(`   Strategy used: ${compressionResult.strategy}`);
        }
      }
      
      // Call parent sendMessage with processed messages
      const response = await super.sendMessage(message, {
        ...options,
        messages: processedMessages,
        compressionApplied: compressionResult?.compressed || false
      });
      
      // Add compression metadata to response if applicable
      if (compressionResult?.compressed) {
        response.compressionMetadata = {
          strategy: compressionResult.strategy,
          originalMessageCount: compressionResult.originalCount,
          compressedMessageCount: compressionResult.compressedCount,
          tokenSavings: Math.round((1 - compressionResult.compressionRatio) * 100)
        };
      }
      
      return response;
      
    } catch (error) {
      console.error('❌ Error in enhanced chat service:', error);
      
      // Fallback to parent implementation
      return super.sendMessage(message, options);
    }
  }

  /**
   * Check if compression should be applied
   */
  shouldCompress(messages) {
    if (!this.compressionOptions.enabled) return false;
    
    // Check message count
    if (messages.length < this.compressionOptions.minMessagesToCompress) {
      return false;
    }
    
    // Estimate token count
    const estimatedTokens = this.estimateTokenCount(messages);
    const threshold = this.compressionOptions.maxContextTokens * this.compressionOptions.compressionThreshold;
    
    return estimatedTokens > threshold;
  }

  /**
   * Compress conversation context
   */
  async compressContext(messages, currentQuery, options = {}) {
    try {
      // Determine compression strategy
      const strategy = this.selectCompressionStrategy(messages, currentQuery, options);
      
      // Apply compression
      const result = await this.contextCompressor.compressContext(
        messages,
        this.compressionOptions.maxContextTokens,
        {
          strategy,
          currentQuery,
          model: options.model || 'gpt-4',
          preserveSystemMessages: true,
          includeTimeline: true,
          priorityEntities: this.extractPriorityEntities(currentQuery)
        }
      );
      
      return result;
      
    } catch (error) {
      console.error('❌ Compression failed:', error);
      
      // Fallback to simple truncation
      return {
        success: true,
        compressed: true,
        messages: messages.slice(-this.compressionOptions.minMessagesToCompress),
        strategy: 'fallback-truncation',
        originalCount: messages.length,
        compressedCount: this.compressionOptions.minMessagesToCompress,
        compressionRatio: 0.5
      };
    }
  }

  /**
   * Select best compression strategy
   */
  selectCompressionStrategy(messages, currentQuery, options) {
    // Override with user preference
    if (options.compressionStrategy && options.compressionStrategy !== 'auto') {
      return options.compressionStrategy;
    }
    
    // Auto-select based on heuristics
    const strategy = this.compressionOptions.compressionStrategy;
    if (strategy !== 'auto') return strategy;
    
    // Analyze conversation characteristics
    const hasStrongEntityFocus = this.analyzeEntityDensity(messages) > 0.6;
    const hasQueryContext = currentQuery && currentQuery.length > 50;
    const conversationLength = messages.length;
    
    // Select strategy based on analysis
    if (hasQueryContext && conversationLength > 50) {
      return 'query-relevant';
    } else if (hasStrongEntityFocus) {
      return 'entity-focused';
    } else if (conversationLength > 100) {
      return 'hierarchical';
    } else {
      return 'sliding-window';
    }
  }

  /**
   * Analyze entity density in messages
   */
  analyzeEntityDensity(messages) {
    let entityCount = 0;
    
    messages.forEach(msg => {
      const content = msg.content || '';
      
      // Check for travel entities
      if (content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) ||
          content.match(/\$[\d,]+/g) ||
          content.match(/\d{4}-\d{2}-\d{2}/g)) {
        entityCount++;
      }
    });
    
    return entityCount / messages.length;
  }

  /**
   * Extract priority entities from query
   */
  extractPriorityEntities(query) {
    const entities = [];
    
    // Look for specific entity types in query
    if (query.match(/\b(?:Paris|Rome|Barcelona|London|Tokyo)\b/i)) {
      entities.push('destination');
    }
    
    if (query.match(/\b(?:budget|cost|price|expensive|cheap)\b/i)) {
      entities.push('budget');
    }
    
    if (query.match(/\b(?:date|when|june|july|august)\b/i)) {
      entities.push('date');
    }
    
    if (query.match(/\b(?:hotel|accommodation|stay|airbnb)\b/i)) {
      entities.push('hotel');
    }
    
    return entities;
  }

  /**
   * Estimate token count for messages
   */
  estimateTokenCount(messages) {
    if (this.tokenizer) {
      // Accurate count using tiktoken
      let tokens = 0;
      messages.forEach(msg => {
        const content = `${msg.role}: ${msg.content}`;
        tokens += this.tokenizer.encode(content).length + 4;
      });
      return tokens;
    } else {
      // Rough estimate: ~4 characters per token
      let characters = 0;
      messages.forEach(msg => {
        characters += (msg.role?.length || 0) + (msg.content?.length || 0) + 10;
      });
      return Math.ceil(characters / 4);
    }
  }

  /**
   * Get compression analytics
   */
  async getCompressionAnalytics(conversationId) {
    try {
      const history = await this.getConversationHistory(conversationId);
      const messages = history.messages || [];
      
      // Analyze different compression strategies
      const strategies = ['sliding-window', 'hierarchical', 'entity-focused', 'query-relevant'];
      const results = {};
      
      for (const strategy of strategies) {
        const result = await this.contextCompressor.compressContext(
          messages,
          this.compressionOptions.maxContextTokens,
          { strategy }
        );
        
        results[strategy] = {
          compressedCount: result.compressedCount || result.messages.length,
          tokenCount: result.tokenCount,
          compressionRatio: result.compressionRatio,
          hasSummary: !!result.summary
        };
      }
      
      // Extract key points for insight
      const keyPoints = await this.contextCompressor.extractKeyPoints(messages);
      
      return {
        conversationId,
        messageCount: messages.length,
        estimatedTokens: this.estimateTokenCount(messages),
        compressionStrategies: results,
        keyPoints: {
          decisions: keyPoints.keyPoints?.decisions?.length || 0,
          preferences: keyPoints.keyPoints?.preferences?.length || 0,
          entities: keyPoints.keyPoints?.entities?.size || 0,
          questions: keyPoints.keyPoints?.questions?.length || 0
        },
        recommendations: this.generateCompressionRecommendations(messages, results)
      };
      
    } catch (error) {
      console.error('❌ Failed to generate compression analytics:', error);
      return {
        error: error.message
      };
    }
  }

  /**
   * Generate compression recommendations
   */
  generateCompressionRecommendations(messages, strategyResults) {
    const recommendations = [];
    
    // Find most efficient strategy
    let bestStrategy = null;
    let bestRatio = 1.0;
    
    Object.entries(strategyResults).forEach(([strategy, result]) => {
      if (result.compressionRatio < bestRatio) {
        bestRatio = result.compressionRatio;
        bestStrategy = strategy;
      }
    });
    
    if (bestStrategy) {
      recommendations.push({
        type: 'strategy',
        message: `Use '${bestStrategy}' strategy for best compression (${Math.round((1 - bestRatio) * 100)}% reduction)`
      });
    }
    
    // Message count recommendations
    if (messages.length > 100) {
      recommendations.push({
        type: 'archival',
        message: 'Consider archiving older messages to maintain performance'
      });
    }
    
    // Entity-based recommendations
    const entityDensity = this.analyzeEntityDensity(messages);
    if (entityDensity > 0.7) {
      recommendations.push({
        type: 'strategy',
        message: 'High entity density detected - entity-focused compression recommended'
      });
    }
    
    return recommendations;
  }

  /**
   * Get conversation history (stub - should connect to actual storage)
   */
  async getConversationHistory(conversationId) {
    // This should be implemented to fetch from your actual storage
    // For now, returning empty history
    return {
      messages: []
    };
  }
}

export default EnhancedChatService;