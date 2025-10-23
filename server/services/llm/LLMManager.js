/**
 * LLM Manager
 * 
 * Central orchestrator for all LLM services.
 * Handles service selection, load balancing, fallbacks, and cost tracking.
 */

import OpenAIService from './providers/OpenAIService.js';
import AnthropicService from './providers/AnthropicService.js';
import MockLLMService from './providers/MockLLMService.js';

import { 
  LLM_PROVIDERS, 
  getModelConfig, 
  getDefaultModel, 
  isModelAvailable,
  LOAD_BALANCING,
  COST_TRACKING,
  LLM_MODELS
} from './config.js';

class LLMManager {
  constructor() {
    this.services = new Map();
    this.totalCost = 0;
    this.requestCount = 0;
    this.serviceStats = new Map();
    this.fallbackChain = LOAD_BALANCING.fallbackChain;
    this.loadBalancingStrategy = 'least_cost'; // Default strategy
  }

  /**
   * Initialize the LLM Manager
   */
  async initialize() {
    console.log('🚀 Initializing LLM Manager...');
    
    // Check if we're in mock mode
    if (process.env.USE_MOCK_LLM === 'true' || process.env.MOCK_ENABLED === 'true') {
      console.log('🎭 Using Mock LLM Service for testing');
      this.useMockMode = true;
      return true;
    }
    
    // Check availability of all configured models
    const availabilityChecks = [];
    
    // Test each provider's default model
    for (const [provider, models] of Object.entries({
      [LLM_PROVIDERS.OPENAI]: ['gpt-5-nano-2025-08-07', 'text-embedding-3-small'],
      [LLM_PROVIDERS.ANTHROPIC]: ['claude-sonnet-4-20250514']
    })) {
      for (const modelId of models) {
        availabilityChecks.push(this.checkModelAvailability(modelId));
      }
    }

    const results = await Promise.allSettled(availabilityChecks);
    const available = results.filter(r => r.status === 'fulfilled' && r.value).length;
    
    console.log(`✅ LLM Manager initialized. ${available}/${results.length} models available.`);
    return true;
  }

  /**
   * Get or create a service instance for a model
   * @param {string} modelId - The model identifier
   * @returns {BaseLLMService} Service instance
   */
  getService(modelId) {
    // Return mock service if in mock mode
    if (this.useMockMode) {
      if (!this.mockService) {
        this.mockService = new MockLLMService(modelId, {
          simulateDelay: process.env.MOCK_LLM_DELAY ? parseInt(process.env.MOCK_LLM_DELAY) : 100
        });
        this.mockService.initialize();
      }
      return this.mockService;
    }
    
    if (this.services.has(modelId)) {
      return this.services.get(modelId);
    }

    const modelConfig = getModelConfig(modelId);
    if (!modelConfig) {
      throw new Error(`Model configuration not found: ${modelId}`);
    }

    let service;
    switch (modelConfig.provider) {
      case LLM_PROVIDERS.OPENAI:
        service = new OpenAIService(modelId);
        break;
      case LLM_PROVIDERS.ANTHROPIC:
        service = new AnthropicService(modelId);
        break;
      default:
        throw new Error(`Unsupported provider: ${modelConfig.provider}`);
    }

    this.services.set(modelId, service);
    return service;
  }

  /**
   * Send a chat message using the best available model
   * @param {Array} messages - Array of message objects
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response object
   */
  async chat(messages, options = {}) {
    const modelId = options.model || this.selectBestModel('chat', options);
    const service = this.getService(modelId);

    try {
      const response = await service.chat(messages, options);
      this.trackRequest(modelId, response.usage.cost);
      return response;
    } catch (error) {
      console.error(`Chat failed with ${modelId}:`, error.message);
      
      // Try fallback if enabled
      if (options.enableFallback !== false) {
        return this.chatWithFallback(messages, options, modelId);
      }
      
      throw error;
    }
  }

  /**
   * Chat with automatic fallback to other models
   * @param {Array} messages - Array of message objects
   * @param {Object} options - Request options
   * @param {string} failedModel - Model that failed
   * @returns {Promise<Object>} Response object
   */
  async chatWithFallback(messages, options, failedModel) {
    const fallbackModels = this.fallbackChain.filter(model => 
      model !== failedModel && isModelAvailable(model)
    );

    for (const modelId of fallbackModels) {
      try {
        console.log(`🔄 Trying fallback model: ${modelId}`);
        const service = this.getService(modelId);
        const response = await service.chat(messages, { ...options, model: modelId });
        
        this.trackRequest(modelId, response.usage.cost);
        response.metadata.fallback = true;
        response.metadata.originalModel = failedModel;
        
        return response;
      } catch (error) {
        console.error(`Fallback ${modelId} also failed:`, error.message);
        continue;
      }
    }

    throw new Error(`All models failed. Last attempted: ${failedModel}`);
  }

  /**
   * Generate embeddings
   * @param {string|Array} text - Text to embed
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Embedding response
   */
  async embed(text, options = {}) {
    const modelId = options.model || getDefaultModel('embedding');
    const service = this.getService(modelId);

    try {
      const response = await service.embed(text, options);
      this.trackRequest(modelId, response.usage.cost);
      return response;
    } catch (error) {
      console.error(`Embedding failed with ${modelId}:`, error.message);
      throw error;
    }
  }

  /**
   * Stream chat completion
   * @param {Array} messages - Array of message objects
   * @param {Object} options - Request options
   * @param {Function} onChunk - Callback for each chunk
   * @returns {Promise<Object>} Final response object
   */
  async streamChat(messages, options = {}, onChunk = null) {
    const modelId = options.model || this.selectBestModel('chat', options);
    const service = this.getService(modelId);

    try {
      const response = await service.streamChat(messages, options, onChunk);
      this.trackRequest(modelId, response.usage.cost);
      return response;
    } catch (error) {
      console.error(`Stream chat failed with ${modelId}:`, error.message);
      throw error;
    }
  }

  /**
   * Select the best model based on strategy and requirements
   * @param {string} useCase - The use case (chat, embedding, etc.)
   * @param {Object} options - Selection criteria
   * @returns {string} Selected model ID
   */
  selectBestModel(useCase, options = {}) {
    if (options.model) {
      return options.model;
    }

    const availableModels = this.getAvailableModels(useCase);
    
    if (availableModels.length === 0) {
      throw new Error(`No available models for use case: ${useCase}`);
    }

    switch (this.loadBalancingStrategy) {
      case 'least_cost':
        return this.selectLeastCostModel(availableModels, options);
      case 'fastest_response':
        return this.selectFastestModel(availableModels);
      case 'round_robin':
        return this.selectRoundRobinModel(availableModels);
      case 'random':
        return availableModels[Math.floor(Math.random() * availableModels.length)];
      default:
        return getDefaultModel(useCase);
    }
  }

  /**
   * Select model with lowest cost
   * @param {Array} models - Available models
   * @param {Object} options - Request options for cost estimation
   * @returns {string} Model ID
   */
  selectLeastCostModel(models, options) {
    const estimatedInputTokens = options.estimatedTokens || 1000;
    const estimatedOutputTokens = options.estimatedOutputTokens || 500;

    let bestModel = models[0];
    let lowestCost = Infinity;

    for (const modelId of models) {
      const config = getModelConfig(modelId);
      if (!config) continue;

      const cost = (estimatedInputTokens / 1000) * config.pricing.input + 
                   (estimatedOutputTokens / 1000) * config.pricing.output;

      if (cost < lowestCost) {
        lowestCost = cost;
        bestModel = modelId;
      }
    }

    return bestModel;
  }

  /**
   * Select fastest model (simplified - could use historical data)
   * @param {Array} models - Available models
   * @returns {string} Model ID
   */
  selectFastestModel(models) {
    // Prioritize models known for speed
    const speedPriority = ['gpt-5-nano-2025-08-07', 'claude-sonnet-4-20250514'];
    
    for (const fastModel of speedPriority) {
      if (models.includes(fastModel)) {
        return fastModel;
      }
    }
    
    return models[0];
  }

  /**
   * Select model using round-robin
   * @param {Array} models - Available models
   * @returns {string} Model ID
   */
  selectRoundRobinModel(models) {
    if (!this.roundRobinIndex) {
      this.roundRobinIndex = 0;
    }
    
    const modelId = models[this.roundRobinIndex % models.length];
    this.roundRobinIndex++;
    
    return modelId;
  }

  /**
   * Get available models for a use case
   * @param {string} useCase - The use case
   * @returns {Array} Array of available model IDs
   */
  getAvailableModels(useCase) {
    const models = [];
    
    for (const [modelId, config] of Object.entries(LLM_MODELS)) {
      if (useCase === 'embedding' && !config.capabilities.embedding) continue;
      if (useCase === 'chat' && !config.capabilities.chat) continue;
      if (isModelAvailable(modelId)) {
        models.push(modelId);
      }
    }

    return models;
  }

  /**
   * Check if a specific model is available
   * @param {string} modelId - Model to check
   * @returns {Promise<boolean>} Availability status
   */
  async checkModelAvailability(modelId) {
    try {
      const service = this.getService(modelId);
      return await service.isAvailable();
    } catch (error) {
      console.error(`Availability check failed for ${modelId}:`, error.message);
      return false;
    }
  }

  /**
   * Track request statistics
   * @param {string} modelId - Model used
   * @param {number} cost - Request cost
   */
  trackRequest(modelId, cost) {
    this.requestCount++;
    this.totalCost += cost;

    if (!this.serviceStats.has(modelId)) {
      this.serviceStats.set(modelId, {
        requests: 0,
        totalCost: 0,
        avgCost: 0
      });
    }

    const stats = this.serviceStats.get(modelId);
    stats.requests++;
    stats.totalCost += cost;
    stats.avgCost = stats.totalCost / stats.requests;
  }

  /**
   * Get usage statistics
   * @returns {Object} Usage statistics
   */
  getUsageStats() {
    return {
      totalRequests: this.requestCount,
      totalCost: this.totalCost,
      avgCostPerRequest: this.requestCount > 0 ? this.totalCost / this.requestCount : 0,
      serviceBreakdown: Object.fromEntries(this.serviceStats),
      budgetStatus: this.getBudgetStatus()
    };
  }

  /**
   * Get budget status
   * @returns {Object} Budget information
   */
  getBudgetStatus() {
    const daily = COST_TRACKING.budgetLimits.daily;
    const weekly = COST_TRACKING.budgetLimits.weekly;
    const monthly = COST_TRACKING.budgetLimits.monthly;

    return {
      daily: {
        spent: this.totalCost, // Simplified - would track by day in production
        limit: daily,
        percentage: (this.totalCost / daily) * 100,
        remaining: Math.max(0, daily - this.totalCost)
      },
      weekly: {
        spent: this.totalCost,
        limit: weekly,
        percentage: (this.totalCost / weekly) * 100,
        remaining: Math.max(0, weekly - this.totalCost)
      },
      monthly: {
        spent: this.totalCost,
        limit: monthly,
        percentage: (this.totalCost / monthly) * 100,
        remaining: Math.max(0, monthly - this.totalCost)
      }
    };
  }

  /**
   * Set load balancing strategy
   * @param {string} strategy - Strategy name
   */
  setLoadBalancingStrategy(strategy) {
    if (!Object.values(LOAD_BALANCING.strategies).includes(strategy)) {
      throw new Error(`Invalid load balancing strategy: ${strategy}`);
    }
    this.loadBalancingStrategy = strategy;
  }

  /**
   * Reset all statistics
   */
  resetStats() {
    this.totalCost = 0;
    this.requestCount = 0;
    this.serviceStats.clear();
    
    // Reset individual service stats
    for (const service of this.services.values()) {
      service.resetStats();
    }
  }

  /**
   * Health check for all services
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    const health = {
      timestamp: new Date().toISOString(),
      overall: 'healthy',
      services: {}
    };

    for (const [modelId] of this.services) {
      try {
        const available = await this.checkModelAvailability(modelId);
        health.services[modelId] = {
          status: available ? 'healthy' : 'unavailable',
          provider: getModelConfig(modelId)?.provider
        };
      } catch (error) {
        health.services[modelId] = {
          status: 'error',
          error: error.message,
          provider: getModelConfig(modelId)?.provider
        };
      }
    }

    const healthyCount = Object.values(health.services).filter(s => s.status === 'healthy').length;
    const totalCount = Object.keys(health.services).length;

    if (healthyCount === 0) {
      health.overall = 'critical';
    } else if (healthyCount < totalCount) {
      health.overall = 'degraded';
    }

    return health;
  }
}

// Export singleton instance
export default new LLMManager();