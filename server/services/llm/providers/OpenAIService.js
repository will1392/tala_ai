/**
 * OpenAI Service Implementation
 * 
 * Implements the BaseLLMService for OpenAI's GPT models.
 * Supports GPT-4, GPT-4 Turbo, GPT-3.5 Turbo models with retry logic.
 */

import BaseLLMService from '../base/BaseLLMService.js';
import { getProviderConfig } from '../config.js';
import OpenAI from 'openai';

class OpenAIService extends BaseLLMService {
  constructor(modelId, options = {}) {
    super(modelId, options);
    this.client = null;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.apiKey = null;
    this.baseURL = options.baseURL || 'https://api.openai.com/v1';
  }

  /**
   * Initialize OpenAI client
   */
  initialize() {
    console.log(`[OpenAIService] Initializing OpenAI service for model: ${this.modelId}`);
    
    const providerConfig = getProviderConfig(this.modelConfig.provider);
    this.apiKey = process.env[providerConfig.apiKeyEnv];

    if (!this.apiKey) {
      console.warn(`[OpenAIService] OpenAI API key not found in environment variable: ${providerConfig.apiKeyEnv}`);
      console.log('[OpenAIService] Service will operate in mock mode');
      this.useMockMode = true;
    } else {
      // Initialize the real OpenAI client
      this.client = new OpenAI({
        apiKey: this.apiKey,
        baseURL: this.baseURL
      });
      this.useMockMode = false;
      console.log('[OpenAIService] Real OpenAI client initialized');
    }

    this.initialized = true;
    console.log('[OpenAIService] OpenAI service initialized successfully');
  }

  /**
   * Send a chat message to OpenAI
   * @param {Array} messages - Array of message objects with role and content
   * @param {Object} options - Request-specific options
   * @returns {Promise<Object>} Response object with content, usage, and metadata
   */
  async chat(messages, options = {}) {
    return this.withRetry(async () => {
      try {
        this.validateMessages(messages);
        this.checkContextLimits(messages, options);

        const mergedOptions = this.mergeOptions(options);
        const startTime = Date.now();

        // Check if we should use mock mode
        if (this.useMockMode || !this.client) {
          console.log(`[OpenAIService] Using mock response (mock mode: ${this.useMockMode})`);
          return {
            content: `Mock response from OpenAI ${this.modelId} model. In production, this would be a real API response.`,
            usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
            metadata: {
              provider: 'openai',
              model: this.modelId,
              duration: Date.now() - startTime,
              temperature: mergedOptions.temperature,
              maxTokens: mergedOptions.maxTokens,
              cost: 0.001
            }
          };
        }

        // Make real API call
        console.log(`[OpenAIService] Making real API call to ${this.modelId}`);
        
        // Use different parameter name for GPT-5 models
        const params = {
          model: this.modelId,
          messages: messages,
          temperature: mergedOptions.temperature,
          top_p: mergedOptions.topP,
          frequency_penalty: mergedOptions.frequencyPenalty || 0,
          presence_penalty: mergedOptions.presencePenalty || 0,
          stream: false
        };
        
        // GPT-5 models use 'max_completion_tokens' instead of 'max_tokens'
        if (this.modelId.includes('gpt-5')) {
          params.max_completion_tokens = mergedOptions.maxTokens;
        } else {
          params.max_tokens = mergedOptions.maxTokens;
        }
        
        const completion = await this.client.chat.completions.create(params);

        const response = {
          content: completion.choices[0].message.content,
          usage: {
            promptTokens: completion.usage.prompt_tokens,
            completionTokens: completion.usage.completion_tokens,
            totalTokens: completion.usage.total_tokens
          },
          metadata: {
            provider: 'openai',
            model: this.modelId,
            duration: Date.now() - startTime,
            temperature: mergedOptions.temperature,
            maxTokens: mergedOptions.maxTokens,
            finishReason: completion.choices[0].finish_reason
          }
        };

        // Update metrics
        this.requestCount++;
        this.totalTokensUsed += response.usage.totalTokens;
        
        // Calculate cost
        const cost = this.calculateCost(response.usage);
        this.totalCost += cost;
        response.metadata.cost = cost;

        return response;

      } catch (error) {
        throw this.handleError(error, 'chat');
      }
    }, 'chat');
  }

  /**
   * Generate embeddings using OpenAI
   * @param {string|Array} text - Text to embed
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Embedding response
   */
  async embed(text, options = {}) {
    if (!this.modelConfig.capabilities.embedding) {
      throw new Error(`Model ${this.modelId} does not support embeddings`);
    }

    return this.withRetry(async () => {
      try {
        const texts = Array.isArray(text) ? text : [text];
        const startTime = Date.now();

        console.log(`[OpenAIService] Generating embeddings for ${texts.length} text(s)`);

        // Stub implementation
        await new Promise(resolve => setTimeout(resolve, 50));

        const mockEmbeddings = texts.map(() => 
          Array(1536).fill(0).map(() => Math.random() * 2 - 1)
        );

        const mockResponse = {
          embeddings: mockEmbeddings,
          usage: {
            promptTokens: texts.join(' ').split(' ').length * 2,
            totalTokens: texts.join(' ').split(' ').length * 2
          },
          metadata: {
            provider: 'openai',
            model: this.modelId,
            duration: Date.now() - startTime,
            dimension: 1536
          }
        };

        this.requestCount++;
        this.totalTokensUsed += mockResponse.usage.totalTokens;

        return mockResponse;

      } catch (error) {
        throw this.handleError(error, 'embed');
      }
    }, 'embed');
  }

  /**
   * Check if OpenAI service is available
   * @returns {Promise<boolean>} True if available
   */
  async isAvailable() {
    try {
      if (!this.apiKey) {
        console.log('[OpenAIService] No API key configured, running in mock mode');
        return true; // Mock mode is always available
      }

      // In production, would make a test API call
      console.log(`[OpenAIService] Checking availability for ${this.modelId}`);
      return true;

    } catch (error) {
      console.error(`[OpenAIService] Availability check failed for ${this.modelId}:`, error.message);
      return false;
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
    return this.withRetry(async () => {
      try {
        this.validateMessages(messages);
        this.checkContextLimits(messages, options);

        const mergedOptions = this.mergeOptions(options);
        const startTime = Date.now();

        console.log(`[OpenAIService] Starting stream chat with ${messages.length} messages`);

        // Stub implementation - simulate streaming
        const fullResponse = `This is a mock streamed response from OpenAI ${this.modelId}. In production, this would stream real tokens.`;
        const words = fullResponse.split(' ');
        let accumulatedContent = '';

        for (const word of words) {
          await new Promise(resolve => setTimeout(resolve, 50));
          const chunk = word + ' ';
          accumulatedContent += chunk;

          if (onChunk) {
            onChunk({
              content: chunk,
              fullContent: accumulatedContent,
              isComplete: false
            });
          }
        }

        if (onChunk) {
          onChunk({
            content: '',
            fullContent: accumulatedContent,
            isComplete: true
          });
        }

        const duration = Date.now() - startTime;

        return {
          content: accumulatedContent.trim(),
          usage: {
            promptTokens: 100,
            completionTokens: words.length * 2,
            totalTokens: 100 + words.length * 2
          },
          metadata: {
            provider: 'openai',
            model: this.modelId,
            duration: duration,
            temperature: mergedOptions.temperature,
            maxTokens: mergedOptions.maxTokens,
            streamed: true
          }
        };

      } catch (error) {
        throw this.handleError(error, 'streamChat');
      }
    }, 'streamChat');
  }

  /**
   * Retry logic wrapper
   * @param {Function} fn - Function to retry
   * @param {string} operation - Operation name for logging
   * @returns {Promise<any>} Result of the function
   */
  async withRetry(fn, operation) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        console.error(`[OpenAIService] ${operation} attempt ${attempt} failed:`, error.message);
        
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          console.log(`[OpenAIService] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Validate messages array
   * @param {Array} messages - Messages to validate
   */
  validateMessages(messages) {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('Messages must be a non-empty array');
    }

    for (const message of messages) {
      if (!message.role || !message.content) {
        throw new Error('Each message must have a role and content');
      }
    }
  }

  /**
   * Check context limits
   * @param {Array} messages - Messages to check
   * @param {Object} options - Options that might affect limits
   */
  checkContextLimits(messages, options) {
    // Simplified check - in production would calculate actual tokens
    const estimatedTokens = JSON.stringify(messages).length / 4;
    const maxContext = this.modelConfig.contextWindow || 4096;

    if (estimatedTokens > maxContext * 0.9) {
      console.warn(`[OpenAIService] Approaching context limit: ~${estimatedTokens} tokens of ${maxContext}`);
    }
  }

  /**
   * Merge options with defaults
   * @param {Object} options - User options
   * @returns {Object} Merged options
   */
  mergeOptions(options) {
    return {
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? 1000,
      topP: options.topP ?? 1,
      frequencyPenalty: options.frequencyPenalty ?? 0,
      presencePenalty: options.presencePenalty ?? 0,
      ...options
    };
  }

  /**
   * Calculate cost for usage
   * @param {Object} usage - Usage object with token counts
   * @returns {number} Cost in USD
   */
  calculateCost(usage) {
    // Simplified cost calculation - would use actual pricing in production
    const inputCost = (usage.promptTokens / 1000) * 0.01;
    const outputCost = (usage.completionTokens / 1000) * 0.03;
    return inputCost + outputCost;
  }

  /**
   * Handle and format errors
   * @param {Error} error - Original error
   * @param {string} operation - Operation that failed
   * @returns {Error} Formatted error
   */
  handleError(error, operation) {
    const formattedError = new Error(
      `OpenAI ${operation} failed: ${error.message}`
    );
    formattedError.provider = 'openai';
    formattedError.model = this.modelId;
    formattedError.operation = operation;
    formattedError.originalError = error;
    return formattedError;
  }
}

export default OpenAIService;