/**
 * ContextManager - Advanced Context Management for Tala AI
 * 
 * Provides comprehensive context management including conversation analysis,
 * memory extraction, entity recognition, and context summarization for
 * enhanced long-term conversation continuity.
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import contextConfig from '../../config/context.js';
import EntityExtractor from './EntityExtractor.js';
import MemoryIndexer from './MemoryIndexer.js';

export class ContextManager {
  constructor(options = {}) {
    this.options = {
      enableMemoryStorage: options.enableMemoryStorage !== false,
      enableEntityExtraction: options.enableEntityExtraction !== false,
      enableContextSummary: options.enableContextSummary !== false,
      autoUpdateProfile: options.autoUpdateProfile !== false,
      ...options
    };
    
    // Initialize database connection
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    // Initialize OpenAI for text analysis
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Initialize specialized services
    this.entityExtractor = new EntityExtractor();
    this.memoryIndexer = new MemoryIndexer();
    
    // Configuration
    this.config = contextConfig;
    
    // Cache for performance
    this.memoryCache = new Map();
    this.contextCache = new Map();
    
    this.initialized = false;
  }

  /**
   * Initialize the context manager
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      console.log('🧠 Initializing ContextManager...');
      
      // Initialize sub-services
      await this.entityExtractor.initialize();
      await this.memoryIndexer.initialize();
      
      // Validate configuration
      const configValidation = contextConfig.validateContextConfig();
      if (!configValidation.valid) {
        throw new Error(`Invalid context configuration: ${configValidation.errors.join(', ')}`);
      }
      
      // Test database connection
      const { data, error } = await this.supabase
        .from('conversation_contexts')
        .select('count')
        .limit(1);
      
      if (error && !error.message.includes('relation "conversation_contexts" does not exist')) {
        throw new Error(`Database connection failed: ${error.message}`);
      }
      
      this.initialized = true;
      console.log('✅ ContextManager initialized successfully');
      
    } catch (error) {
      console.error('❌ ContextManager initialization failed:', error);
      throw error;
    }
  }

  /**
   * Capture and analyze context from a conversation
   * @param {string} conversationId - The conversation ID
   * @param {Array} messages - Array of message objects
   * @param {Object} options - Additional options
   * @returns {Object} Context analysis results
   */
  async captureContext(conversationId, messages, options = {}) {
    try {
      this.ensureInitialized();
      
      console.log(`🔍 Capturing context for conversation ${conversationId} with ${messages.length} messages`);
      
      // Extract entities from messages
      const entities = await this.extractEntities(messages);
      
      // Generate context summary
      const summary = await this.summarizeContext(messages);
      
      // Extract and store memories
      const memories = await this.extractMemories(conversationId, messages, entities);
      
      // Calculate context quality metrics
      const qualityMetrics = this.calculateContextQuality(messages, entities, summary);
      
      // Store conversation context
      const contextData = await this.storeConversationContext(conversationId, {
        summary,
        entities,
        memories,
        qualityMetrics,
        messageCount: messages.length,
        totalTokens: this.calculateTokenCount(messages)
      });
      
      // Update user profile if enabled
      if (this.options.autoUpdateProfile && messages.length > 0) {
        const userId = messages[0].userId || messages[0].user_id;
        if (userId) {
          await this.updateUserProfile(userId, entities, memories);
        }
      }
      
      console.log(`✅ Context captured successfully for conversation ${conversationId}`);
      
      return {
        success: true,
        conversationId,
        context: contextData,
        entities: entities.length,
        memories: memories.length,
        qualityScore: qualityMetrics.overallScore
      };
      
    } catch (error) {
      console.error(`❌ Failed to capture context for conversation ${conversationId}:`, error);
      return {
        success: false,
        error: error.message,
        conversationId
      };
    }
  }

  /**
   * Generate a context summary from messages using LLM
   * @param {Array} messages - Array of message objects
   * @returns {string} Context summary
   */
  async summarizeContext(messages) {
    try {
      if (!messages || messages.length === 0) {
        return '';
      }
      
      // Prepare messages for summarization
      const conversationText = messages
        .filter(msg => msg.content && msg.content.trim())
        .map(msg => {
          const role = msg.role || (msg.isUser ? 'user' : 'assistant');
          return `${role}: ${msg.content}`;
        })
        .join('\n\n');
      
      if (!conversationText.trim()) {
        return '';
      }
      
      const prompt = `
        Analyze this travel conversation and create a comprehensive context summary. Focus on:
        1. Travel plans, destinations, and dates
        2. Personal preferences and requirements
        3. Important decisions made
        4. Key facts that should be remembered
        5. Any concerns or special needs mentioned
        
        Conversation:
        ${conversationText}
        
        Provide a concise but comprehensive summary (max 300 words) that captures the essential context for future conversations:
      `;
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert travel assistant with excellent memory and attention to detail. Create detailed, accurate summaries that preserve important context.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.config.CONTEXT_WINDOWS.MAX_CONTEXT_SUMMARY_TOKENS,
        temperature: 0.3
      });
      
      return response.choices[0]?.message?.content?.trim() || '';
      
    } catch (error) {
      console.error('Error generating context summary:', error);
      return `Context summary generation failed: ${error.message}`;
    }
  }

  /**
   * Extract entities from conversation messages
   * @param {Array} messages - Array of message objects
   * @returns {Array} Extracted entities
   */
  async extractEntities(messages) {
    try {
      if (!this.options.enableEntityExtraction) {
        return [];
      }
      
      const allEntities = [];
      
      for (const message of messages) {
        if (message.content && message.content.trim()) {
          const entities = await this.entityExtractor.extractFromText(
            message.content,
            {
              messageId: message.id,
              userId: message.userId || message.user_id,
              timestamp: message.createdAt || message.created_at
            }
          );
          
          allEntities.push(...entities);
        }
      }
      
      // Deduplicate and merge similar entities
      return this.deduplicateEntities(allEntities);
      
    } catch (error) {
      console.error('Error extracting entities:', error);
      return [];
    }
  }

  /**
   * Extract and store memories from conversation
   * @param {string} conversationId - Conversation ID
   * @param {Array} messages - Array of message objects
   * @param {Array} entities - Extracted entities
   * @returns {Array} Stored memories
   */
  async extractMemories(conversationId, messages, entities = []) {
    try {
      if (!this.options.enableMemoryStorage) {
        return [];
      }
      
      const memories = [];
      const userId = messages.find(m => m.userId || m.user_id)?.userId || 
                     messages.find(m => m.userId || m.user_id)?.user_id;
      
      if (!userId) {
        console.warn('No user ID found for memory extraction');
        return [];
      }
      
      // Extract memories from entities
      for (const entity of entities) {
        const memory = await this.createMemoryFromEntity(userId, conversationId, entity);
        if (memory) {
          memories.push(memory);
        }
      }
      
      // Extract memories from important statements using LLM
      const statementMemories = await this.extractMemoriesFromStatements(
        userId, 
        conversationId, 
        messages
      );
      memories.push(...statementMemories);
      
      // Store memories in database and vector store
      const storedMemories = [];
      for (const memory of memories) {
        try {
          const stored = await this.storeMemory(userId, memory, memory.importance);
          if (stored.success) {
            storedMemories.push(stored.memory);
          }
        } catch (error) {
          console.error('Error storing memory:', error);
        }
      }
      
      return storedMemories;
      
    } catch (error) {
      console.error('Error extracting memories:', error);
      return [];
    }
  }

  /**
   * Store a memory with importance scoring
   * @param {string} userId - User ID
   * @param {Object} memory - Memory object
   * @param {number} importance - Importance score (0-1)
   * @returns {Object} Storage result
   */
  async storeMemory(userId, memory, importance = 0.5) {
    try {
      this.ensureInitialized();
      
      // Calculate importance level
      const importanceLevel = this.calculateImportanceLevel(importance);
      
      // Generate embedding for the memory
      let embeddingId = null;
      if (this.memoryIndexer && memory.content) {
        const embeddingResult = await this.memoryIndexer.createEmbedding(
          memory.content,
          {
            userId,
            memoryType: memory.type,
            conversationId: memory.conversationId
          }
        );
        
        if (embeddingResult.success) {
          embeddingId = embeddingResult.embeddingId;
        }
      }
      
      // Calculate expiry date based on importance and type
      const expiryDate = this.calculateExpiryDate(memory.type, importanceLevel);
      
      // Store in database
      const { data, error } = await this.supabase
        .from('context_memories')
        .insert({
          user_id: userId,
          conversation_id: memory.conversationId,
          memory_type: memory.type,
          content: memory.content,
          extracted_entities: memory.entities || {},
          embedding_id: embeddingId,
          importance_score: importance,
          importance_level: importanceLevel,
          confidence_score: memory.confidence || 0.8,
          context_tags: memory.tags || [],
          source_message_id: memory.sourceMessageId,
          relevant_date: memory.relevantDate,
          expiry_date: expiryDate
        })
        .select()
        .single();
      
      if (error) {
        throw new Error(`Database insert failed: ${error.message}`);
      }
      
      // Update cache
      const cacheKey = `memory:${userId}:${importance}`;
      this.memoryCache.delete(cacheKey);
      
      return {
        success: true,
        memory: data,
        embeddingId
      };
      
    } catch (error) {
      console.error('Error storing memory:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Retrieve relevant memories for a user query
   * @param {string} userId - User ID
   * @param {string} query - Query text
   * @param {number} limit - Maximum number of memories to return
   * @param {Object} options - Additional options
   * @returns {Array} Relevant memories
   */
  async retrieveRelevantMemories(userId, query, limit = 10, options = {}) {
    try {
      this.ensureInitialized();
      
      const cacheKey = `memory:${userId}:${query}:${limit}`;
      
      // Check cache first
      if (this.memoryCache.has(cacheKey)) {
        return this.memoryCache.get(cacheKey);
      }
      
      let memories = [];
      
      // If we have a query and vector search is available
      if (query && this.memoryIndexer) {
        const vectorResults = await this.memoryIndexer.searchSimilar(
          query,
          {
            userId,
            limit: Math.min(limit * 2, 50), // Get more for filtering
            ...options
          }
        );
        
        if (vectorResults.success && vectorResults.results.length > 0) {
          const memoryIds = vectorResults.results.map(r => r.metadata?.memoryId).filter(Boolean);
          
          if (memoryIds.length > 0) {
            const { data, error } = await this.supabase
              .from('context_memories')
              .select('*')
              .in('id', memoryIds)
              .eq('user_id', userId)
              .order('importance_score', { ascending: false })
              .limit(limit);
            
            if (!error && data) {
              memories = data;
            }
          }
        }
      }
      
      // Fallback to database-only search if vector search didn't work
      if (memories.length === 0) {
        const { data, error } = await this.supabase
          .rpc('get_relevant_memories', {
            p_user_id: userId,
            p_limit: limit,
            p_min_importance: options.minImportance || 0.3
          });
        
        if (!error && data) {
          memories = data;
        }
      }
      
      // Update access tracking for retrieved memories
      for (const memory of memories) {
        await this.supabase.rpc('update_memory_access', {
          p_memory_id: memory.id
        });
      }
      
      // Cache results
      this.memoryCache.set(cacheKey, memories);
      
      return memories;
      
    } catch (error) {
      console.error('Error retrieving relevant memories:', error);
      return [];
    }
  }

  /**
   * Update user profile based on extracted information
   * @param {string} userId - User ID
   * @param {Array} entities - Extracted entities
   * @param {Array} memories - Extracted memories
   */
  async updateUserProfile(userId, entities = [], memories = []) {
    try {
      // Get existing profile
      const { data: existingProfile } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      // Analyze entities and memories to extract profile information
      const profileUpdates = this.analyzeForProfileUpdates(entities, memories, existingProfile);
      
      if (Object.keys(profileUpdates).length === 0) {
        return; // No updates needed
      }
      
      // Calculate new completeness score
      const completenessScore = await this.calculateProfileCompleteness(userId, profileUpdates);
      
      const updateData = {
        ...profileUpdates,
        profile_completeness_score: completenessScore,
        last_updated_source: 'context_manager',
        updated_at: new Date().toISOString()
      };
      
      if (existingProfile) {
        // Update existing profile
        await this.supabase
          .from('user_profiles')
          .update(updateData)
          .eq('user_id', userId);
      } else {
        // Create new profile
        await this.supabase
          .from('user_profiles')
          .insert({
            user_id: userId,
            ...updateData
          });
      }
      
      console.log(`✅ Updated profile for user ${userId}`);
      
    } catch (error) {
      console.error('Error updating user profile:', error);
    }
  }

  /**
   * Get context for a conversation to include in LLM prompts
   * @param {string} conversationId - Conversation ID
   * @param {string} userId - User ID
   * @param {string} currentQuery - Current user query
   * @returns {Object} Context for prompt injection
   */
  async getContextForPrompt(conversationId, userId, currentQuery = '') {
    try {
      const context = {
        conversationSummary: '',
        relevantMemories: [],
        userProfile: {},
        entities: []
      };
      
      // Get conversation context
      const { data: conversationContext } = await this.supabase
        .from('conversation_contexts')
        .select('*')
        .eq('conversation_id', conversationId)
        .single();
      
      if (conversationContext) {
        context.conversationSummary = conversationContext.context_summary || '';
        context.entities = conversationContext.key_entities || {};
      }
      
      // Get relevant memories
      if (currentQuery) {
        context.relevantMemories = await this.retrieveRelevantMemories(
          userId,
          currentQuery,
          this.config.CONTEXT_WINDOWS.MAX_MEMORIES_FOR_CONTEXT
        );
      }
      
      // Get user profile
      const { data: userProfile } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (userProfile) {
        context.userProfile = {
          travelPreferences: userProfile.travel_preferences || {},
          dietaryRestrictions: userProfile.dietary_restrictions || [],
          accessibilityNeeds: userProfile.accessibility_needs || [],
          budgetPreferences: userProfile.budget_preferences || {},
          favoriteDestinations: userProfile.favorite_destinations || [],
          loyaltyPrograms: userProfile.loyalty_programs || {}
        };
      }
      
      return context;
      
    } catch (error) {
      console.error('Error getting context for prompt:', error);
      return {
        conversationSummary: '',
        relevantMemories: [],
        userProfile: {},
        entities: []
      };
    }
  }

  // Helper methods

  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('ContextManager not initialized. Call initialize() first.');
    }
  }

  deduplicateEntities(entities) {
    const seen = new Map();
    const deduplicated = [];
    
    for (const entity of entities) {
      const key = `${entity.type}:${entity.value.toLowerCase()}`;
      const existing = seen.get(key);
      
      if (!existing || entity.confidence > existing.confidence) {
        seen.set(key, entity);
      }
    }
    
    return Array.from(seen.values());
  }

  calculateImportanceLevel(score) {
    const thresholds = this.config.MEMORY_IMPORTANCE.THRESHOLDS;
    
    if (score >= thresholds.CRITICAL) return 'critical';
    if (score >= thresholds.HIGH) return 'high';
    if (score >= thresholds.MEDIUM) return 'medium';
    return 'low';
  }

  calculateExpiryDate(memoryType, importanceLevel) {
    if (this.config.RETENTION_POLICIES.PERMANENT_MEMORY_TYPES.includes(memoryType)) {
      return null; // Never expires
    }
    
    const retentionDays = this.config.RETENTION_POLICIES.RETENTION_PERIODS[importanceLevel];
    if (!retentionDays) return null;
    
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + retentionDays);
    return expiryDate.toISOString().split('T')[0]; // Return YYYY-MM-DD format
  }

  calculateTokenCount(messages) {
    return messages.reduce((total, msg) => {
      return total + (msg.content ? msg.content.length / 4 : 0); // Rough token estimate
    }, 0);
  }

  calculateContextQuality(messages, entities, summary) {
    const messageCount = messages.length;
    const entityCount = entities.length;
    const summaryQuality = summary.length > 50 ? 0.8 : 0.4;
    
    const entityDensity = messageCount > 0 ? Math.min(entityCount / messageCount, 1) : 0;
    const completeness = Math.min((messageCount * 0.1) + (entityCount * 0.05) + summaryQuality, 1);
    
    return {
      overallScore: Math.round((completeness + entityDensity + summaryQuality) / 3 * 100) / 100,
      completeness,
      entityDensity,
      summaryQuality
    };
  }

  async storeConversationContext(conversationId, contextData) {
    const { data, error } = await this.supabase
      .from('conversation_contexts')
      .upsert({
        conversation_id: conversationId,
        context_summary: contextData.summary,
        key_entities: contextData.entities.reduce((acc, entity) => {
          acc[entity.type] = acc[entity.type] || [];
          acc[entity.type].push(entity.value);
          return acc;
        }, {}),
        message_count: contextData.messageCount,
        total_tokens: contextData.totalTokens,
        context_completeness_score: contextData.qualityMetrics.completeness,
        entity_extraction_confidence: contextData.qualityMetrics.entityDensity,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to store conversation context: ${error.message}`);
    }
    
    return data;
  }

  async createMemoryFromEntity(userId, conversationId, entity) {
    const baseImportance = this.config.MEMORY_IMPORTANCE.BASE_SCORES[entity.type] || 0.5;
    let importance = baseImportance * entity.confidence;
    
    // Apply boost factors
    if (entity.userEmphasized) {
      importance *= this.config.MEMORY_IMPORTANCE.BOOST_FACTORS.user_emphasized;
    }
    
    importance = Math.min(importance, 1.0);
    
    return {
      conversationId,
      type: entity.type,
      content: `${entity.type}: ${entity.value}${entity.context ? ` (${entity.context})` : ''}`,
      entities: { [entity.type]: entity.value },
      importance,
      confidence: entity.confidence,
      tags: [entity.type],
      sourceMessageId: entity.messageId,
      relevantDate: entity.extractedDate
    };
  }

  async extractMemoriesFromStatements(userId, conversationId, messages) {
    // This would use LLM to extract important statements
    // For now, return empty array - implement based on specific needs
    return [];
  }

  analyzeForProfileUpdates(entities, memories, existingProfile) {
    const updates = {};
    
    // Extract travel preferences from entities
    const destinations = entities.filter(e => e.type === 'destination').map(e => e.value);
    const airlines = entities.filter(e => e.type === 'airline').map(e => e.value);
    
    if (destinations.length > 0) {
      const existing = existingProfile?.favorite_destinations || [];
      const combined = [...new Set([...existing, ...destinations])];
      if (combined.length > existing.length) {
        updates.favorite_destinations = combined;
      }
    }
    
    if (airlines.length > 0) {
      const existing = existingProfile?.preferred_airlines || [];
      const combined = [...new Set([...existing, ...airlines])];
      if (combined.length > existing.length) {
        updates.preferred_airlines = combined;
      }
    }
    
    return updates;
  }

  async calculateProfileCompleteness(userId, updates) {
    // Use the database function
    const { data } = await this.supabase
      .rpc('calculate_profile_completeness', { p_user_id: userId });
    
    return data || 0.0;
  }
}

export default ContextManager;