/**
 * Enhanced Chat Service for Tala AI with Advanced Context Management
 * 
 * Extends the existing chat service with comprehensive context management,
 * memory retrieval, entity extraction, and conversation continuity.
 */

import OpenAI from 'openai';
import ContextManager from './context/ContextManager.js';
import contextConfig from '../config/context.js';

class EnhancedChatService {
  constructor(options = {}) {
    this.enableMultiLLM = options.enableMultiLLM || false;
    this.llmRouter = options.llmRouter || null;
    this.openai = options.openai || null;
    this.enableLogging = options.enableLogging !== false;
    this.enableContextManagement = options.enableContextManagement !== false;
    
    if (!this.enableMultiLLM && !this.openai) {
      throw new Error('OpenAI client is required when multi-LLM is disabled');
    }
    
    if (this.enableMultiLLM && !this.llmRouter) {
      throw new Error('LLM Router is required when multi-LLM is enabled');
    }
    
    // Initialize context manager
    if (this.enableContextManagement) {
      this.contextManager = new ContextManager({
        enableMemoryStorage: true,
        enableEntityExtraction: true,
        enableContextSummary: true,
        autoUpdateProfile: true
      });
    }
    
    this.config = contextConfig;
    this.initialized = false;
    
    this.log(`Enhanced Chat Service initialized (Multi-LLM: ${this.enableMultiLLM}, Context: ${this.enableContextManagement})`);
  }

  /**
   * Initialize the chat service
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      if (this.enableContextManagement) {
        await this.contextManager.initialize();
      }
      
      this.initialized = true;
      this.log('Enhanced Chat Service initialized successfully');
      
    } catch (error) {
      this.log(`Chat Service initialization failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Generate chat response with full context management
   * @param {Object} options - Chat options with context support
   * @returns {Object} Enhanced chat response with context data
   */
  async generateResponse(options) {
    const {
      message,
      systemPrompt,
      conversationContext = {},
      userPreferences = {},
      maxTokens = 1000,
      temperature = 0.7,
      userId,
      conversationId,
      messageHistory = [],
      enableContextRetrieval = true,
      enableContextCapture = true
    } = options;

    try {
      this.ensureInitialized();
      
      // Step 1: Retrieve relevant context if enabled
      let enhancedContext = conversationContext;
      if (this.enableContextManagement && enableContextRetrieval) {
        enhancedContext = await this.retrieveContext(
          userId, 
          conversationId, 
          message, 
          conversationContext
        );
      }
      
      // Step 2: Enhance system prompt with context
      const contextEnhancedPrompt = this.enhancePromptWithContext(
        systemPrompt, 
        enhancedContext
      );
      
      // Step 3: Generate response using appropriate LLM service
      let response;
      if (this.enableMultiLLM) {
        response = await this.generateWithMultiLLM({
          message,
          systemPrompt: contextEnhancedPrompt,
          conversationContext: enhancedContext,
          userPreferences,
          maxTokens,
          temperature,
          userId,
          conversationId
        });
      } else {
        response = await this.generateWithOpenAI({
          message,
          systemPrompt: contextEnhancedPrompt,
          maxTokens,
          temperature
        });
      }
      
      // Step 4: Capture context from the conversation if enabled
      if (this.enableContextManagement && enableContextCapture && response.content) {
        await this.captureConversationContext(
          conversationId,
          userId,
          message,
          response.content,
          messageHistory
        );
      }
      
      // Step 5: Enhance response with context metadata
      return this.enhanceResponseWithContext(response, enhancedContext);
      
    } catch (error) {
      this.log(`Enhanced chat generation failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Retrieve relevant context for the conversation
   * @param {string} userId - User ID
   * @param {string} conversationId - Conversation ID  
   * @param {string} currentMessage - Current user message
   * @param {Object} existingContext - Existing conversation context
   * @returns {Object} Enhanced context with memories and profile data
   */
  async retrieveContext(userId, conversationId, currentMessage, existingContext = {}) {
    try {
      if (!this.contextManager) {
        return existingContext;
      }
      
      // Get context for prompt injection
      const contextData = await this.contextManager.getContextForPrompt(
        conversationId,
        userId,
        currentMessage
      );
      
      // Merge with existing context
      const enhancedContext = {
        ...existingContext,
        conversationSummary: contextData.conversationSummary,
        relevantMemories: contextData.relevantMemories.slice(0, 10), // Limit for prompt size
        userProfile: contextData.userProfile,
        extractedEntities: contextData.entities,
        contextRetrievalTime: new Date().toISOString(),
        memoryCount: contextData.relevantMemories.length
      };
      
      this.log(`Retrieved context: ${contextData.relevantMemories.length} memories, profile completeness: ${Math.round((contextData.userProfile?.profileCompleteness || 0) * 100)}%`);
      
      return enhancedContext;
      
    } catch (error) {
      this.log(`Context retrieval failed: ${error.message}`, 'error');
      return existingContext;
    }
  }

  /**
   * Enhance system prompt with relevant context
   * @param {string} basePrompt - Base system prompt
   * @param {Object} context - Retrieved context data
   * @returns {string} Enhanced prompt with context
   */
  enhancePromptWithContext(basePrompt, context) {
    if (!context || !this.enableContextManagement) {
      return basePrompt;
    }
    
    let contextSection = '';
    
    // Add conversation summary
    if (context.conversationSummary) {
      contextSection += `\n## Conversation Context:\n${context.conversationSummary}\n`;
    }
    
    // Add user profile information
    if (context.userProfile && Object.keys(context.userProfile).length > 0) {
      contextSection += '\n## User Profile:\n';
      
      if (context.userProfile.travelPreferences && Object.keys(context.userProfile.travelPreferences).length > 0) {
        contextSection += `Travel Preferences: ${JSON.stringify(context.userProfile.travelPreferences)}\n`;
      }
      
      if (context.userProfile.dietaryRestrictions && context.userProfile.dietaryRestrictions.length > 0) {
        contextSection += `Dietary Restrictions: ${context.userProfile.dietaryRestrictions.join(', ')}\n`;
      }
      
      if (context.userProfile.budgetPreferences && Object.keys(context.userProfile.budgetPreferences).length > 0) {
        contextSection += `Budget Preferences: ${JSON.stringify(context.userProfile.budgetPreferences)}\n`;
      }
      
      if (context.userProfile.favoriteDestinations && context.userProfile.favoriteDestinations.length > 0) {
        contextSection += `Favorite Destinations: ${context.userProfile.favoriteDestinations.join(', ')}\n`;
      }
    }
    
    // Add relevant memories
    if (context.relevantMemories && context.relevantMemories.length > 0) {
      contextSection += '\n## Relevant Memories:\n';
      context.relevantMemories.forEach((memory, index) => {
        if (memory.content) {
          contextSection += `${index + 1}. ${memory.content} (Importance: ${Math.round(memory.importance_score * 100)}%)\n`;
        }
      });
    }
    
    // Add important entities
    if (context.extractedEntities && Object.keys(context.extractedEntities).length > 0) {
      contextSection += '\n## Key Information:\n';
      Object.entries(context.extractedEntities).forEach(([type, values]) => {
        if (Array.isArray(values) && values.length > 0) {
          contextSection += `${type}: ${values.join(', ')}\n`;
        }
      });
    }
    
    // Construct enhanced prompt
    if (contextSection.trim()) {
      return `${basePrompt}\n\n${contextSection}\n## Instructions:\nUse the above context to provide personalized, relevant responses. Reference specific memories and preferences when appropriate, but don't overwhelm the user with too much recalled information.`;
    }
    
    return basePrompt;
  }

  /**
   * Capture context from the conversation
   * @param {string} conversationId - Conversation ID
   * @param {string} userId - User ID
   * @param {string} userMessage - User's message
   * @param {string} assistantResponse - Assistant's response
   * @param {Array} messageHistory - Previous messages in conversation
   */
  async captureConversationContext(conversationId, userId, userMessage, assistantResponse, messageHistory = []) {
    try {
      if (!this.contextManager) {
        return;
      }
      
      // Build complete message list for context analysis
      const messages = [
        ...messageHistory,
        {
          id: `msg-${Date.now()}-user`,
          content: userMessage,
          role: 'user',
          userId: userId,
          createdAt: new Date().toISOString()
        },
        {
          id: `msg-${Date.now()}-assistant`,
          content: assistantResponse,
          role: 'assistant',
          createdAt: new Date().toISOString()
        }
      ];
      
      // Only capture context if we have enough meaningful content
      const meaningfulMessages = messages.filter(m => 
        m.content && m.content.trim().length > 10
      );
      
      if (meaningfulMessages.length >= 2) {
        // Capture context asynchronously to avoid blocking response
        setImmediate(async () => {
          try {
            await this.contextManager.captureContext(conversationId, meaningfulMessages);
            this.log(`Context captured for conversation ${conversationId}`);
          } catch (error) {
            this.log(`Context capture failed: ${error.message}`, 'error');
          }
        });
      }
      
    } catch (error) {
      this.log(`Context capture preparation failed: ${error.message}`, 'error');
    }
  }

  /**
   * Enhance response with context metadata
   * @param {Object} response - Original LLM response
   * @param {Object} context - Context data used
   * @returns {Object} Enhanced response with context metadata
   */
  enhanceResponseWithContext(response, context) {
    if (!this.enableContextManagement || !context) {
      return response;
    }
    
    return {
      ...response,
      contextMetadata: {
        memoriesUsed: context.relevantMemories?.length || 0,
        profileDataAvailable: !!(context.userProfile && Object.keys(context.userProfile).length > 0),
        conversationSummaryAvailable: !!context.conversationSummary,
        entitiesAvailable: !!(context.extractedEntities && Object.keys(context.extractedEntities).length > 0),
        contextRetrievalTime: context.contextRetrievalTime,
        contextEnhanced: true
      }
    };
  }

  /**
   * Generate response using multi-LLM router with context
   * @param {Object} options - Generation options
   * @returns {Object} Response with routing metadata
   */
  async generateWithMultiLLM(options) {
    const {
      message,
      systemPrompt,
      conversationContext,
      userPreferences,
      maxTokens,
      temperature,
      userId,
      conversationId
    } = options;

    const startTime = Date.now();

    try {
      // Prepare enhanced context for LLM Router
      const routerContext = {
        userId,
        conversationId,
        userPreferences: {
          costOptimization: userPreferences.costOptimization || false,
          fastResponse: userPreferences.fastResponse || false,
          preferredModel: userPreferences.preferredModel || null,
          ...userPreferences
        },
        conversationContext: {
          hasDocumentContext: !!conversationContext.documentContext,
          entityCount: conversationContext.extractedEntities ? 
            Object.keys(conversationContext.extractedEntities).length : 0,
          conversationLength: conversationContext.messageCount || 0,
          lastActivity: conversationContext.lastActivity,
          hasMemories: !!(conversationContext.relevantMemories && conversationContext.relevantMemories.length > 0),
          profileCompleteness: conversationContext.userProfile?.profileCompleteness || 0,
          contextEnhanced: true,
          ...conversationContext
        }
      };

      // Use LLM Router to generate response
      const routerResponse = await this.llmRouter.routeQuery(
        message,
        routerContext,
        {
          systemPrompt,
          maxTokens,
          temperature
        }
      );

      const responseTime = Date.now() - startTime;

      this.log(`Enhanced multi-LLM response generated in ${responseTime}ms using ${routerResponse.routing.selectedModel}`);

      return {
        content: routerResponse.response,
        model: routerResponse.routing.selectedModel,
        provider: routerResponse.routing.provider,
        routing: {
          queryType: routerResponse.routing.queryType,
          modelSelected: routerResponse.routing.selectedModel,
          fallbacksUsed: routerResponse.routing.fallbacksUsed,
          costOptimized: routerResponse.routing.costOptimized,
          reasoning: routerResponse.routing.reasoning || []
        },
        usage: {
          promptTokens: routerResponse.usage.promptTokens,
          completionTokens: routerResponse.usage.completionTokens,
          totalTokens: routerResponse.usage.totalTokens,
          cost: routerResponse.usage.cost
        },
        performance: {
          responseTime,
          successful: true
        },
        metadata: {
          timestamp: new Date().toISOString(),
          multiLLM: true,
          enhanced: true,
          budgetStatus: routerResponse.routing.budgetStatus,
          costSavings: routerResponse.routing.costSavings
        }
      };

    } catch (error) {
      this.log(`Enhanced multi-LLM generation failed: ${error.message}`, 'error');
      
      return {
        content: null,
        error: error.message,
        model: null,
        provider: null,
        routing: {
          queryType: 'unknown',
          modelSelected: null,
          fallbacksUsed: 0,
          costOptimized: false,
          reasoning: [`Error: ${error.message}`]
        },
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          cost: 0
        },
        performance: {
          responseTime: Date.now() - startTime,
          successful: false
        },
        metadata: {
          timestamp: new Date().toISOString(),
          multiLLM: true,
          enhanced: true,
          error: true
        }
      };
    }
  }

  /**
   * Generate response using OpenAI directly with context
   * @param {Object} options - Generation options
   * @returns {Object} Response with basic metadata
   */
  async generateWithOpenAI(options) {
    const {
      message,
      systemPrompt,
      maxTokens,
      temperature
    } = options;

    const startTime = Date.now();

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user', 
            content: message
          }
        ],
        max_tokens: maxTokens,
        temperature: temperature
      });

      const responseTime = Date.now() - startTime;
      const response = completion.choices[0]?.message?.content;

      this.log(`Enhanced OpenAI response generated in ${responseTime}ms`);

      return {
        content: response,
        model: completion.model,
        provider: 'openai',
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
          cost: 0 // Would need pricing calculation
        },
        performance: {
          responseTime,
          successful: true
        },
        metadata: {
          timestamp: new Date().toISOString(),
          enhanced: true,
          multiLLM: false
        }
      };

    } catch (error) {
      this.log(`Enhanced OpenAI generation failed: ${error.message}`, 'error');
      
      return {
        content: null,
        error: error.message,
        model: null,
        provider: 'openai',
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          cost: 0
        },
        performance: {
          responseTime: Date.now() - startTime,
          successful: false
        },
        metadata: {
          timestamp: new Date().toISOString(),
          enhanced: true,
          multiLLM: false,
          error: true
        }
      };
    }
  }

  /**
   * Get context manager instance for external use
   * @returns {ContextManager|null} Context manager instance
   */
  getContextManager() {
    return this.contextManager || null;
  }

  /**
   * Enable or disable context management at runtime
   * @param {boolean} enabled - Whether to enable context management
   */
  setContextManagement(enabled) {
    this.enableContextManagement = enabled;
    this.log(`Context management ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Helper methods

  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('Enhanced Chat Service not initialized. Call initialize() first.');
    }
  }

  log(message, level = 'info') {
    if (this.enableLogging) {
      const timestamp = new Date().toISOString();
      console.log(`[ChatService ${level.toUpperCase()}] ${timestamp}: ${message}`);
    }
  }
}

export default EnhancedChatService;