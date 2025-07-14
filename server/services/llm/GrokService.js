/**
 * Grok Service Implementation
 * 
 * Implements the BaseLLMService for X.AI's Grok models.
 * Uses OpenAI-compatible API format.
 */

import OpenAI from 'openai';
import BaseLLMService from './base/BaseLLMService.js';
import { getProviderConfig } from './config.js';

class GrokService extends BaseLLMService {
  constructor(modelId, options = {}) {
    super(modelId, options);
    this.client = null;
  }

  /**
   * Initialize Grok client (uses direct fetch instead of OpenAI SDK)
   */
  initialize() {
    const providerConfig = getProviderConfig(this.modelConfig.provider);
    const apiKey = process.env[providerConfig.apiKeyEnv];

    if (!apiKey) {
      throw new Error(`Grok API key not found in environment variable: ${providerConfig.apiKeyEnv}`);
    }

    this.apiKey = apiKey;
    this.baseURL = providerConfig.baseURL;
    this.client = true; // Mark as initialized
  }

  /**
   * Send a chat message to Grok
   * @param {Array} messages - Array of message objects
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response object
   */
  async chat(messages, options = {}) {
    try {
      this.validateMessages(messages);
      this.checkContextLimits(messages, options);

      const mergedOptions = this.mergeOptions(options);
      
      // Use direct fetch instead of OpenAI SDK
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.modelId,
          messages: messages,
          temperature: mergedOptions.temperature,
          max_tokens: mergedOptions.maxTokens,
          top_p: mergedOptions.topP,
          stream: mergedOptions.stream || false
          // Note: Grok 4 doesn't support frequency_penalty or presence_penalty
        })
      });

      if (!response.ok) {
        let errorMessage = 'Unknown error';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || errorData.message || JSON.stringify(errorData);
        } catch (e) {
          errorMessage = await response.text();
        }
        throw new Error(`Grok API error: ${response.status} - ${errorMessage}`);
      }

      const data = await response.json();

      // Handle potential differences in usage reporting
      const inputTokens = data.usage?.prompt_tokens || this.estimateTokens(messages.map(m => m.content).join(''));
      const outputTokens = data.usage?.completion_tokens || 0;
      
      // Handle case where content might be empty (Grok 4 reasoning models)
      const content = data.choices[0]?.message?.content || '';
      
      // For empty content, estimate based on reasoning tokens if available
      const actualOutputTokens = outputTokens || (data.usage?.completion_tokens_details?.reasoning_tokens ? 0 : this.estimateTokens(content));

      const usage = this.trackUsage(inputTokens, actualOutputTokens);

      return this.createResponse(
        content,
        usage,
        {
          finishReason: data.choices[0]?.finish_reason,
          responseId: data.id,
          model: data.model,
          grokSpecific: true,
          reasoningTokens: data.usage?.completion_tokens_details?.reasoning_tokens || 0
        }
      );

    } catch (error) {
      throw this.handleError(error, 'chat');
    }
  }

  /**
   * Grok doesn't support embeddings
   */
  async embed(text, options = {}) {
    throw new Error('Grok models do not support embeddings. Use OpenAI or other providers for embeddings.');
  }

  /**
   * Check if Grok service is available
   * @returns {Promise<boolean>} True if available
   */
  async isAvailable() {
    try {
      if (!this.client) {
        this.initialize();
      }

      // Test with a minimal request to check availability
      const testResponse = await this.client.chat.completions.create({
        model: this.modelId,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 1
      });

      return !!testResponse.choices?.[0]?.message;

    } catch (error) {
      console.error(`Grok service availability check failed for ${this.modelId}:`, error.message);
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
    try {
      this.validateMessages(messages);
      this.checkContextLimits(messages, options);

      const mergedOptions = this.mergeOptions({ ...options, stream: true });
      
      const stream = await this.client.chat.completions.create({
        model: this.modelId,
        messages: messages,
        temperature: mergedOptions.temperature,
        max_tokens: mergedOptions.maxTokens,
        top_p: mergedOptions.topP,
        stream: true
      });

      let fullContent = '';
      let totalTokens = 0;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          fullContent += delta.content;
          
          if (onChunk) {
            onChunk({
              content: delta.content,
              fullContent: fullContent,
              isComplete: false
            });
          }
        }

        // Grok may provide usage in stream
        if (chunk.usage) {
          totalTokens = chunk.usage.total_tokens;
        }
      }

      // Estimate usage if not provided in stream
      const estimatedInputTokens = this.estimateTokens(messages.map(m => m.content).join(''));
      const estimatedOutputTokens = this.estimateTokens(fullContent);
      
      const usage = this.trackUsage(estimatedInputTokens, estimatedOutputTokens);

      const finalResponse = this.createResponse(fullContent, usage, {
        streamed: true,
        estimatedTokens: !totalTokens,
        grokSpecific: true
      });

      if (onChunk) {
        onChunk({
          content: '',
          fullContent: fullContent,
          isComplete: true,
          response: finalResponse
        });
      }

      return finalResponse;

    } catch (error) {
      throw this.handleError(error, 'streamChat');
    }
  }

  /**
   * Get Grok-specific model information
   * @returns {Promise<Object>} Model information
   */
  async getModelInfo() {
    try {
      if (!this.client) {
        this.initialize();
      }

      // Try to get model info (may not be available on all endpoints)
      try {
        const models = await this.client.models.list();
        const modelInfo = models.data.find(m => m.id === this.modelId);
        return modelInfo || { id: this.modelId, available: true };
      } catch (listError) {
        // If model listing fails, return basic info
        return { 
          id: this.modelId, 
          available: await this.isAvailable(),
          provider: 'grok'
        };
      }

    } catch (error) {
      throw this.handleError(error, 'getModelInfo');
    }
  }

  /**
   * Enhanced error handling for Grok-specific errors
   */
  handleError(error, operation) {
    // Handle Grok/X.AI-specific error types
    if (error.message?.includes('invalid_api_key') || error.message?.includes('unauthorized')) {
      return new Error(`Grok API authentication failed for ${this.modelId}. Please check your X.AI API key.`);
    }

    if (error.message?.includes('rate_limit')) {
      return new Error(`Grok rate limit exceeded for ${this.modelId}. Please try again later.`);
    }

    if (error.message?.includes('quota') || error.message?.includes('billing')) {
      return new Error(`Grok quota/billing issue for ${this.modelId}. Please check your X.AI account.`);
    }

    if (error.message?.includes('model_not_found')) {
      return new Error(`Grok model ${this.modelId} not found. Please check the model name.`);
    }

    if (error.message?.includes('context_length_exceeded')) {
      return new Error(`Context length exceeded for Grok ${this.modelId}. Please reduce input size.`);
    }

    if (error.message?.includes('content_filter')) {
      return new Error(`Content filtered by Grok for ${this.modelId}. Please modify your request.`);
    }

    // Handle network/connection errors specifically for Grok
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return new Error(`Cannot connect to Grok API for ${this.modelId}. Please check your internet connection.`);
    }

    // Fall back to base error handling
    return super.handleError(error, operation);
  }

  /**
   * Test Grok's unique capabilities (if any)
   * @param {string} prompt - Test prompt
   * @returns {Promise<Object>} Test response
   */
  async testCapabilities(prompt = "What makes Grok unique compared to other AI models?") {
    try {
      const response = await this.chat([
        { role: 'user', content: prompt }
      ], { maxTokens: 150 });

      return {
        success: true,
        response: response.content,
        capabilities: {
          chat: true,
          streaming: true,
          context: this.getContextWindow(),
          maxTokens: this.getMaxTokens()
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        capabilities: {
          chat: false,
          streaming: false
        }
      };
    }
  }
}

export default GrokService;