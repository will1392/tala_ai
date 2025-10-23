/**
 * Chat Service for Tala AI
 * 
 * Provides unified interface for chat functionality with support for both
 * OpenAI-only mode and multi-LLM routing. Maintains backward compatibility
 * while adding new capabilities.
 */

import OpenAI from 'openai';

class ChatService {
  constructor(options = {}) {
    this.enableMultiLLM = options.enableMultiLLM || false;
    this.llmRouter = options.llmRouter || null;
    this.openai = options.openai || null;
    this.enableLogging = options.enableLogging !== false;
    
    if (!this.enableMultiLLM && !this.openai) {
      throw new Error('OpenAI client is required when multi-LLM is disabled');
    }
    
    if (this.enableMultiLLM && !this.llmRouter) {
      throw new Error('LLM Router is required when multi-LLM is enabled');
    }
    
    this.log(`Chat Service initialized (Multi-LLM: ${this.enableMultiLLM})`);
  }

  /**
   * Generate chat response using appropriate LLM service
   * @param {Object} options - Chat options
   * @returns {Object} Chat response with metadata
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
      conversationId
    } = options;

    try {
      if (this.enableMultiLLM) {
        return await this.generateWithMultiLLM({
          message,
          systemPrompt,
          conversationContext,
          userPreferences,
          maxTokens,
          temperature,
          userId,
          conversationId
        });
      } else {
        return await this.generateWithOpenAI({
          message,
          systemPrompt,
          maxTokens,
          temperature
        });
      }
    } catch (error) {
      this.log(`Chat generation failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Generate response using multi-LLM router
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
      // Prepare context for LLM Router
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
          entityCount: conversationContext.entities?.length || 0,
          conversationLength: conversationContext.messageCount || 0,
          lastActivity: conversationContext.lastActivity,
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

      this.log(`Multi-LLM response generated in ${responseTime}ms using ${routerResponse.routing.selectedModel}`);

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
          budgetStatus: routerResponse.routing.budgetStatus,
          costSavings: routerResponse.routing.costSavings
        }
      };

    } catch (error) {
      this.log(`Multi-LLM generation failed: ${error.message}`, 'error');
      
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
          error: true
        }
      };
    }
  }

  /**
   * Generate response using OpenAI directly (backward compatibility)
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
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: maxTokens,
        temperature: temperature
      });

      const responseTime = Date.now() - startTime;
      const response = completion.choices[0].message.content;

      this.log(`OpenAI response generated in ${responseTime}ms`);

      return {
        content: response,
        model: 'gpt-4o-mini',
        provider: 'openai',
        routing: {
          queryType: 'unknown',
          modelSelected: 'gpt-4o-mini',
          fallbacksUsed: 0,
          costOptimized: false,
          reasoning: ['OpenAI-only mode']
        },
        usage: {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens,
          cost: this.calculateOpenAICost(completion.usage)
        },
        performance: {
          responseTime,
          successful: true
        },
        metadata: {
          timestamp: new Date().toISOString(),
          multiLLM: false
        }
      };

    } catch (error) {
      this.log(`OpenAI generation failed: ${error.message}`, 'error');
      
      return {
        content: null,
        error: error.message,
        model: 'gpt-4o-mini',
        provider: 'openai',
        routing: {
          queryType: 'unknown',
          modelSelected: 'gpt-4o-mini',
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
          multiLLM: false,
          error: true
        }
      };
    }
  }

  /**
   * Calculate OpenAI cost for backward compatibility
   * @param {Object} usage - Usage statistics
   * @returns {number} Cost in USD
   */
  calculateOpenAICost(usage) {
    // GPT-4o-mini pricing
    const inputCost = (usage.prompt_tokens / 1000000) * 0.15;
    const outputCost = (usage.completion_tokens / 1000000) * 0.6;
    return inputCost + outputCost;
  }

  /**
   * Get available models based on current configuration
   * @returns {Array} Available models
   */
  getAvailableModels() {
    if (this.enableMultiLLM && this.llmRouter) {
      // Get models from LLM Router
      return this.llmRouter.getAvailableModels ? this.llmRouter.getAvailableModels() : [
        'gpt-5-nano-2025-08-07',
        'claude-sonnet-4-20250514'
      ];
    } else {
      return ['gpt-4o-mini'];
    }
  }

  /**
   * Get service health status
   * @returns {Object} Health status
   */
  getHealthStatus() {
    if (this.enableMultiLLM && this.llmRouter) {
      return {
        multiLLM: true,
        healthy: this.llmRouter.getHealthyServiceCount() > 0,
        services: this.llmRouter.getHealthStatus(),
        totalQueries: this.llmRouter.routingStats.totalQueries,
        uptime: Date.now() - this.llmRouter.routingStats.uptime
      };
    } else {
      return {
        multiLLM: false,
        healthy: !!this.openai,
        services: {
          openai: { status: 'healthy', lastCheck: new Date().toISOString() }
        },
        totalQueries: 0,
        uptime: 0
      };
    }
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics() {
    if (this.enableMultiLLM && this.llmRouter && this.llmRouter.performanceMonitor) {
      return this.llmRouter.performanceMonitor.getPerformanceReport();
    } else {
      return {
        summary: {
          totalRequests: 0,
          successfulRequests: 0,
          avgResponseTime: 0,
          totalCost: 0
        },
        models: {}
      };
    }
  }

  /**
   * Get cost information
   * @returns {Object} Cost information
   */
  getCostInformation() {
    if (this.enableMultiLLM && this.llmRouter && this.llmRouter.costOptimizer) {
      return {
        budgetStatus: this.llmRouter.costOptimizer.getBudgetStatus(),
        costBreakdown: this.llmRouter.costOptimizer.getCostBreakdown(),
        projections: this.llmRouter.costOptimizer.getCostProjection(30)
      };
    } else {
      return {
        budgetStatus: null,
        costBreakdown: null,
        projections: null
      };
    }
  }

  /**
   * Update user preferences for model selection
   * @param {string} userId - User ID
   * @param {Object} preferences - User preferences
   */
  updateUserPreferences(userId, preferences) {
    // This could be extended to store user preferences persistently
    this.log(`Updated preferences for user ${userId}: ${JSON.stringify(preferences)}`);
  }

  /**
   * Gracefully shutdown the service
   */
  async shutdown() {
    if (this.enableMultiLLM && this.llmRouter) {
      await this.llmRouter.shutdown();
    }
    this.log('Chat Service shutdown completed');
  }

  /**
   * Log messages with appropriate level
   * @param {string} message - Log message
   * @param {string} level - Log level
   */
  log(message, level = 'info') {
    if (!this.enableLogging) return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[ChatService ${level.toUpperCase()}] ${timestamp}`;
    
    switch (level) {
      case 'error':
        console.error(`${prefix}: ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix}: ${message}`);
        break;
      default:
        console.log(`${prefix}: ${message}`);
    }
  }
}

export default ChatService;