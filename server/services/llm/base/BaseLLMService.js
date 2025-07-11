/**
 * Base LLM Service Class
 * 
 * Abstract base class that all LLM service implementations must extend.
 * Provides a consistent interface for interacting with different LLM providers.
 */

import { getModelConfig, calculateCost } from '../config.js';

class BaseLLMService {
  constructor(modelId, options = {}) {
    if (new.target === BaseLLMService) {
      throw new Error('BaseLLMService is an abstract class and cannot be instantiated directly');
    }

    this.modelId = modelId;
    this.modelConfig = getModelConfig(modelId);
    this.options = options;
    this.requestCount = 0;
    this.totalTokensUsed = 0;
    this.totalCost = 0;

    if (!this.modelConfig) {
      throw new Error(`Model configuration not found for: ${modelId}`);
    }

    // Initialize provider-specific settings
    this.initialize();
  }

  /**
   * Initialize provider-specific settings
   * Override in subclasses to set up API clients, etc.
   */
  initialize() {
    // Override in subclasses
  }

  /**
   * Send a chat message to the LLM
   * @param {Array} messages - Array of message objects with role and content
   * @param {Object} options - Request-specific options
   * @returns {Promise<Object>} Response object with content, usage, and metadata
   */
  async chat(messages, options = {}) {
    throw new Error('chat() method must be implemented by subclass');
  }

  /**
   * Generate embeddings for text
   * @param {string|Array} text - Text to embed (string or array of strings)
   * @param {Object} options - Request-specific options
   * @returns {Promise<Object>} Embedding response with vectors and metadata
   */
  async embed(text, options = {}) {
    if (!this.modelConfig.capabilities.embedding) {
      throw new Error(`Model ${this.modelId} does not support embeddings`);
    }
    throw new Error('embed() method must be implemented by subclass');
  }

  /**
   * Get the display name of the model
   * @returns {string} Human-readable model name
   */
  getName() {
    return this.modelConfig.name;
  }

  /**
   * Get the provider name
   * @returns {string} Provider name
   */
  getProvider() {
    return this.modelConfig.provider;
  }

  /**
   * Get current total cost
   * @returns {number} Total cost in USD
   */
  getCost() {
    return this.totalCost;
  }

  /**
   * Get maximum tokens for this model
   * @returns {number} Maximum token limit
   */
  getMaxTokens() {
    return this.modelConfig.maxTokens;
  }

  /**
   * Get context window size
   * @returns {number} Context window size in tokens
   */
  getContextWindow() {
    return this.modelConfig.contextWindow;
  }

  /**
   * Get model capabilities
   * @returns {Object} Capabilities object
   */
  getCapabilities() {
    return this.modelConfig.capabilities;
  }

  /**
   * Check if the model is available (API key configured, etc.)
   * @returns {boolean} True if model is available
   */
  async isAvailable() {
    try {
      // Override in subclasses for provider-specific availability checks
      return true;
    } catch (error) {
      console.error(`Model ${this.modelId} availability check failed:`, error);
      return false;
    }
  }

  /**
   * Get usage statistics
   * @returns {Object} Usage statistics
   */
  getUsageStats() {
    return {
      requestCount: this.requestCount,
      totalTokensUsed: this.totalTokensUsed,
      totalCost: this.totalCost,
      averageTokensPerRequest: this.requestCount > 0 ? this.totalTokensUsed / this.requestCount : 0,
      averageCostPerRequest: this.requestCount > 0 ? this.totalCost / this.requestCount : 0
    };
  }

  /**
   * Reset usage statistics
   */
  resetStats() {
    this.requestCount = 0;
    this.totalTokensUsed = 0;
    this.totalCost = 0;
  }

  /**
   * Validate message format
   * @param {Array} messages - Messages to validate
   * @returns {boolean} True if valid
   */
  validateMessages(messages) {
    if (!Array.isArray(messages)) {
      throw new Error('Messages must be an array');
    }

    for (const message of messages) {
      if (!message.role || !message.content) {
        throw new Error('Each message must have role and content properties');
      }

      if (!['system', 'user', 'assistant', 'function'].includes(message.role)) {
        throw new Error(`Invalid message role: ${message.role}`);
      }
    }

    return true;
  }

  /**
   * Merge options with model defaults
   * @param {Object} options - Request options
   * @returns {Object} Merged options
   */
  mergeOptions(options) {
    return {
      ...this.modelConfig.defaultParams,
      ...this.options,
      ...options
    };
  }

  /**
   * Track usage and cost for a request
   * @param {number} inputTokens - Input tokens used
   * @param {number} outputTokens - Output tokens used
   * @returns {Object} Usage and cost information
   */
  trackUsage(inputTokens, outputTokens) {
    this.requestCount++;
    this.totalTokensUsed += inputTokens + outputTokens;
    
    const requestCost = calculateCost(this.modelId, inputTokens, outputTokens);
    this.totalCost += requestCost;

    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      cost: requestCost,
      totalCost: this.totalCost
    };
  }

  /**
   * Handle errors consistently across providers
   * @param {Error} error - The error to handle
   * @param {string} operation - The operation that failed
   * @returns {Error} Standardized error
   */
  handleError(error, operation) {
    console.error(`${this.modelId} ${operation} error:`, error);

    // Standardize common error types
    if (error.message?.includes('rate limit')) {
      return new Error(`Rate limit exceeded for ${this.modelId}. Please try again later.`);
    }

    if (error.message?.includes('insufficient_quota') || error.message?.includes('billing')) {
      return new Error(`Billing/quota issue for ${this.modelId}. Please check your account.`);
    }

    if (error.message?.includes('unauthorized') || error.message?.includes('invalid_api_key')) {
      return new Error(`Authentication failed for ${this.modelId}. Please check your API key.`);
    }

    if (error.message?.includes('context_length_exceeded')) {
      return new Error(`Context length exceeded for ${this.modelId}. Please reduce input size.`);
    }

    // Return original error if not a known type
    return error;
  }

  /**
   * Estimate token count for text
   * @param {string} text - Text to estimate
   * @returns {number} Estimated token count
   */
  estimateTokens(text) {
    if (!text || typeof text !== 'string') return 0;
    
    // Rough estimation: ~4 characters per token for most models
    // This is a simplification - in production, use proper tokenizers
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if request would exceed context window
   * @param {Array} messages - Messages to check
   * @param {Object} options - Request options
   * @returns {boolean} True if within limits
   */
  checkContextLimits(messages, options = {}) {
    const totalText = messages.map(m => m.content).join('');
    const estimatedInputTokens = this.estimateTokens(totalText);
    const maxOutputTokens = options.maxTokens || this.modelConfig.defaultParams.maxTokens;
    
    const totalEstimatedTokens = estimatedInputTokens + maxOutputTokens;
    
    if (totalEstimatedTokens > this.modelConfig.contextWindow) {
      throw new Error(
        `Request would exceed context window. ` +
        `Estimated: ${totalEstimatedTokens}, Limit: ${this.modelConfig.contextWindow}`
      );
    }

    return true;
  }

  /**
   * Create a standardized response object
   * @param {string} content - Response content
   * @param {Object} usage - Usage information
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Standardized response
   */
  createResponse(content, usage, metadata = {}) {
    return {
      content,
      usage: {
        inputTokens: usage.inputTokens || 0,
        outputTokens: usage.outputTokens || 0,
        totalTokens: (usage.inputTokens || 0) + (usage.outputTokens || 0),
        cost: usage.cost || 0
      },
      metadata: {
        model: this.modelId,
        provider: this.modelConfig.provider,
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId(),
        ...metadata
      }
    };
  }

  /**
   * Generate a unique request ID
   * @returns {string} Unique request identifier
   */
  generateRequestId() {
    return `${this.modelId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default BaseLLMService;