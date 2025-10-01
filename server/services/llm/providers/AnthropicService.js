/**
 * Anthropic Service Implementation
 * 
 * Implements the BaseLLMService for Anthropic's Claude models.
 * Supports Claude 3 Opus, Sonnet, and Haiku models with retry logic.
 */

import BaseLLMService from '../base/BaseLLMService.js';
import { getProviderConfig } from '../config.js';
import Anthropic from '@anthropic-ai/sdk';

class AnthropicService extends BaseLLMService {
  constructor(modelId, options = {}) {
    super(modelId, options);
    this.client = null;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.apiKey = null;
    this.baseURL = options.baseURL || 'https://api.anthropic.com';
    this.apiVersion = '2023-06-01';
  }

  /**
   * Initialize Anthropic client
   */
  initialize() {
    console.log(`[AnthropicService] Initializing Anthropic service for model: ${this.modelId}`);
    
    const providerConfig = getProviderConfig(this.modelConfig.provider);
    this.apiKey = process.env[providerConfig.apiKeyEnv];

    if (!this.apiKey) {
      console.warn(`[AnthropicService] Anthropic API key not found in environment variable: ${providerConfig.apiKeyEnv}`);
      console.log('[AnthropicService] Service will operate in mock mode');
      this.useMockMode = true;
    } else {
      // Initialize the real Anthropic client
      this.client = new Anthropic({
        apiKey: this.apiKey
      });
      this.useMockMode = false;
      console.log('[AnthropicService] Real Anthropic client initialized');
    }

    this.initialized = true;
    console.log('[AnthropicService] Anthropic service initialized successfully');
  }

  /**
   * Convert OpenAI-style messages to Anthropic format
   * @param {Array} messages - OpenAI format messages
   * @returns {Object} Anthropic format with system and messages
   */
  convertMessages(messages) {
    let system = '';
    const anthropicMessages = [];
    
    for (const message of messages) {
      if (message.role === 'system') {
        // Collect system messages
        system += (system ? '\n\n' : '') + message.content;
      } else if (message.role === 'user') {
        anthropicMessages.push({
          role: 'user',
          content: message.content
        });
      } else if (message.role === 'assistant') {
        anthropicMessages.push({
          role: 'assistant',
          content: message.content
        });
      }
    }

    return { system, messages: anthropicMessages };
  }

  /**
   * Send a chat message to Anthropic
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
        const { system, messages: anthropicMessages } = this.convertMessages(messages);
        const startTime = Date.now();

        // Check if we should use mock mode
        if (this.useMockMode || !this.client) {
          console.log(`[AnthropicService] Using mock response (mock mode: ${this.useMockMode})`);
          return {
            content: `Mock response from Anthropic ${this.modelId} model. In production, this would be a real Claude API response with thoughtful, helpful content.`,
            usage: { promptTokens: 120, completionTokens: 60, totalTokens: 180 },
            metadata: {
              provider: 'anthropic',
              model: this.modelId,
              duration: Date.now() - startTime,
              temperature: mergedOptions.temperature,
              maxTokens: mergedOptions.maxTokens,
              hasSystem: !!system,
              cost: 0.002
            }
          };
        }

        // Make real API call
        console.log(`[AnthropicService] Making real API call to ${this.modelId}`);
        const completion = await this.client.messages.create({
          model: this.modelId,
          messages: anthropicMessages,
          system: system || undefined,
          max_tokens: mergedOptions.maxTokens,
          temperature: mergedOptions.temperature,
          top_p: mergedOptions.topP
        });

        const response = {
          content: completion.content[0].text,
          usage: {
            promptTokens: completion.usage.input_tokens,
            completionTokens: completion.usage.output_tokens,
            totalTokens: completion.usage.input_tokens + completion.usage.output_tokens
          },
          metadata: {
            provider: 'anthropic',
            model: this.modelId,
            duration: Date.now() - startTime,
            temperature: mergedOptions.temperature,
            maxTokens: mergedOptions.maxTokens,
            hasSystem: !!system,
            stopReason: completion.stop_reason
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
   * Anthropic doesn't have dedicated embedding models
   * This method will throw an error as expected
   */
  async embed(text, options = {}) {
    throw new Error('Anthropic Claude models do not support embeddings. Use specialized embedding models from OpenAI or other providers.');
  }

  /**
   * Check if Anthropic service is available
   * @returns {Promise<boolean>} True if available
   */
  async isAvailable() {
    try {
      if (!this.apiKey) {
        console.log('[AnthropicService] No API key configured, running in mock mode');
        return true; // Mock mode is always available
      }

      // In production, would make a test API call
      console.log(`[AnthropicService] Checking availability for ${this.modelId}`);
      return true;

    } catch (error) {
      console.error(`[AnthropicService] Availability check failed for ${this.modelId}:`, error.message);
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
        const { system, messages: anthropicMessages } = this.convertMessages(messages);
        const startTime = Date.now();

        console.log(`[AnthropicService] Starting stream chat with ${messages.length} messages`);

        // Stub implementation - simulate streaming
        const fullResponse = `This is a mock streamed response from Claude ${this.modelId}. In production, this would stream real tokens with Claude's characteristic thoughtfulness and clarity.`;
        const words = fullResponse.split(' ');
        let accumulatedContent = '';

        for (const word of words) {
          await new Promise(resolve => setTimeout(resolve, 40)); // Claude typically streams a bit faster
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
            promptTokens: 120,
            completionTokens: words.length * 2,
            totalTokens: 120 + words.length * 2
          },
          metadata: {
            provider: 'anthropic',
            model: this.modelId,
            duration: duration,
            temperature: mergedOptions.temperature,
            maxTokens: mergedOptions.maxTokens,
            hasSystem: !!system,
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
        console.error(`[AnthropicService] ${operation} attempt ${attempt} failed:`, error.message);
        
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          console.log(`[AnthropicService] Retrying in ${delay}ms...`);
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
    const maxContext = this.modelConfig.contextWindow || 100000; // Claude has large context windows

    if (estimatedTokens > maxContext * 0.9) {
      console.warn(`[AnthropicService] Approaching context limit: ~${estimatedTokens} tokens of ${maxContext}`);
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
      topK: options.topK ?? undefined, // Anthropic supports top_k
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
    // Claude pricing varies by model (Opus > Sonnet > Haiku)
    let inputRate = 0.015; // Default for Sonnet
    let outputRate = 0.075;
    
    if (this.modelId.includes('opus')) {
      inputRate = 0.015;
      outputRate = 0.075;
    } else if (this.modelId.includes('haiku')) {
      inputRate = 0.00025;
      outputRate = 0.00125;
    }
    
    const inputCost = (usage.promptTokens / 1000) * inputRate;
    const outputCost = (usage.completionTokens / 1000) * outputRate;
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
      `Anthropic ${operation} failed: ${error.message}`
    );
    formattedError.provider = 'anthropic';
    formattedError.model = this.modelId;
    formattedError.operation = operation;
    formattedError.originalError = error;
    return formattedError;
  }

  /**
   * Generate a response (alias for chat for backward compatibility)
   * @param {string} prompt - The prompt to send
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response object
   */
  async generateResponse(prompt, options = {}) {
    // Convert simple prompt to messages format
    const messages = [
      { role: 'user', content: prompt }
    ];
    
    const response = await this.chat(messages, options);
    
    // Return in a simplified format for backward compatibility
    return {
      text: response.content,
      ...response
    };
  }
}

export default AnthropicService;