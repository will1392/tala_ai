/**
 * Google Gemini Service Implementation
 * 
 * Implements the BaseLLMService for Google's Gemini models.
 * Supports Gemini 2.0 Flash with multimodal capabilities and retry logic.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import BaseLLMService from '../base/BaseLLMService.js';
import { getProviderConfig } from '../config.js';

class GeminiService extends BaseLLMService {
  constructor(modelId, options = {}) {
    super(modelId, options);
    this.client = null;
    this.model = null;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
  }

  /**
   * Initialize Google AI client
   */
  initialize() {
    const providerConfig = getProviderConfig(this.modelConfig.provider);
    const apiKey = process.env[providerConfig.apiKeyEnv];

    if (!apiKey) {
      throw new Error(`Google AI API key not found in environment variable: ${providerConfig.apiKeyEnv}`);
    }

    this.client = new GoogleGenerativeAI(apiKey);
    
    // Configure model with safety settings
    this.model = this.client.getGenerativeModel({ 
      model: this.modelId,
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        }
      ]
    });
  }

  /**
   * Convert OpenAI-style messages to Google format
   * @param {Array} messages - OpenAI format messages
   * @returns {Array} Google format messages
   */
  convertMessages(messages) {
    const googleMessages = [];
    let systemContext = '';
    
    for (const message of messages) {
      let role;
      
      switch (message.role) {
        case 'system':
          // Collect system messages to prepend to first user message
          systemContext += (systemContext ? '\n\n' : '') + message.content;
          continue;
        case 'user':
          role = 'user';
          break;
        case 'assistant':
          role = 'model';
          break;
        default:
          continue; // Skip unknown roles
      }

      // Handle multimodal content
      const parts = [];
      
      if (typeof message.content === 'string') {
        parts.push({ text: message.content });
      } else if (Array.isArray(message.content)) {
        // Handle structured content (text + images)
        for (const part of message.content) {
          if (part.type === 'text') {
            parts.push({ text: part.text });
          } else if (part.type === 'image_url') {
            parts.push({
              inlineData: {
                data: part.image_url.url.split(',')[1], // Extract base64 from data URL
                mimeType: 'image/jpeg'
              }
            });
          }
        }
      }

      googleMessages.push({ role, parts });
    }

    // Handle system message by prepending to first user message
    if (systemContext && googleMessages.length > 0 && googleMessages[0].role === 'user') {
      googleMessages[0].parts[0].text = `${systemContext}\n\n${googleMessages[0].parts[0].text}`;
    }

    return googleMessages;
  }

  /**
   * Send a chat message to Google Gemini with retry logic
   * @param {Array} messages - Array of message objects
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response object
   */
  async chat(messages, options = {}) {
    return this.withRetry(async () => {
      try {
        this.validateMessages(messages);
        this.checkContextLimits(messages, options);

        const mergedOptions = this.mergeOptions(options);
        const googleMessages = this.convertMessages(messages);

        const startTime = Date.now();
        
        // Configure generation settings
        const generationConfig = {
          temperature: mergedOptions.temperature,
          topP: mergedOptions.topP,
          maxOutputTokens: mergedOptions.maxTokens,
          topK: mergedOptions.topK || 40,
          stopSequences: mergedOptions.stopSequences
        };

        let result;
        
        // For single message, use generateContent
        if (googleMessages.length === 1 && googleMessages[0].role === 'user') {
          result = await this.model.generateContent({
            contents: [googleMessages[0]],
            generationConfig
          });
        } else {
          // For multi-turn conversation, use chat
          const chat = this.model.startChat({
            generationConfig,
            history: googleMessages.slice(0, -1) // All but last message as history
          });

          const lastMessage = googleMessages[googleMessages.length - 1];
          result = await chat.sendMessage(lastMessage.parts.map(p => p.text || p).join(' '));
        }

        const duration = Date.now() - startTime;
        const response = result.response;
        const text = response.text();

        // Estimate token usage (Google doesn't always provide exact counts)
        const inputTokens = response.usageMetadata?.promptTokenCount || 
                          this.estimateTokens(messages.map(m => m.content).join(''));
        const outputTokens = response.usageMetadata?.candidatesTokenCount || 
                           this.estimateTokens(text);
        const usage = this.trackUsage(inputTokens, outputTokens);

        return this.createResponse(
          text,
          usage,
          {
            finishReason: response.candidates?.[0]?.finishReason,
            safetyRatings: response.candidates?.[0]?.safetyRatings,
            citationMetadata: response.candidates?.[0]?.citationMetadata,
            duration: duration,
            model: this.modelId
          }
        );

      } catch (error) {
        throw this.handleError(error, 'chat');
      }
    }, 'chat');
  }

  /**
   * Google doesn't have dedicated embedding models through this API
   * This method will throw an error as expected
   */
  async embed(text, options = {}) {
    throw new Error('Google Gemini models do not support embeddings through this API. Use specialized embedding models.');
  }

  /**
   * Check if Google service is available
   * @returns {Promise<boolean>} True if available
   */
  async isAvailable() {
    try {
      if (!this.client || !this.model) {
        this.initialize();
      }

      // Test with a minimal request
      const result = await this.model.generateContent('Hi');
      return !!result.response.text();

    } catch (error) {
      console.error(`Google service availability check failed for ${this.modelId}:`, error.message);
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
        const googleMessages = this.convertMessages(messages);

        const startTime = Date.now();
        const generationConfig = {
          temperature: mergedOptions.temperature,
          topP: mergedOptions.topP,
          maxOutputTokens: mergedOptions.maxTokens,
          topK: mergedOptions.topK || 40
        };

        let fullContent = '';
        let result;

        // For single message streaming
        if (googleMessages.length === 1 && googleMessages[0].role === 'user') {
          result = await this.model.generateContentStream({
            contents: [googleMessages[0]],
            generationConfig
          });
        } else {
          // For multi-turn conversation streaming
          const chat = this.model.startChat({
            generationConfig,
            history: googleMessages.slice(0, -1)
          });

          const lastMessage = googleMessages[googleMessages.length - 1];
          result = await chat.sendMessageStream(lastMessage.parts.map(p => p.text || p).join(' '));
        }

        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          fullContent += chunkText;

          if (onChunk) {
            onChunk({
              content: chunkText,
              fullContent: fullContent,
              isComplete: false
            });
          }
        }

        const duration = Date.now() - startTime;
        
        // Get final response for usage metadata
        const finalResponse = await result.response;
        
        // Estimate token usage
        const inputTokens = finalResponse.usageMetadata?.promptTokenCount || 
                          this.estimateTokens(messages.map(m => m.content).join(''));
        const outputTokens = finalResponse.usageMetadata?.candidatesTokenCount || 
                           this.estimateTokens(fullContent);
        const usage = this.trackUsage(inputTokens, outputTokens);

        const response = this.createResponse(fullContent, usage, {
          streamed: true,
          duration: duration,
          finishReason: finalResponse.candidates?.[0]?.finishReason,
          safetyRatings: finalResponse.candidates?.[0]?.safetyRatings
        });

        if (onChunk) {
          onChunk({
            content: '',
            fullContent: fullContent,
            isComplete: true,
            response: response
          });
        }

        return response;

      } catch (error) {
        throw this.handleError(error, 'streamChat');
      }
    }, 'streamChat');
  }

  /**
   * Generate content with images (multimodal)
   * @param {string} prompt - Text prompt
   * @param {Array} images - Array of image data (base64 or file paths)
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Response object
   */
  async generateWithImages(prompt, images, options = {}) {
    return this.withRetry(async () => {
      try {
        if (!this.client || !this.model) {
          this.initialize();
        }

        const mergedOptions = this.mergeOptions(options);
        const startTime = Date.now();

        const parts = [{ text: prompt }];
        
        // Add images
        for (const image of images) {
          if (typeof image === 'string') {
            // Handle base64 or data URL
            const base64Data = image.startsWith('data:') 
              ? image.split(',')[1] 
              : image;
            
            parts.push({
              inlineData: {
                data: base64Data,
                mimeType: options.imageMimeType || 'image/jpeg'
              }
            });
          } else if (image.data && image.mimeType) {
            // Handle structured image object
            parts.push({
              inlineData: {
                data: image.data,
                mimeType: image.mimeType
              }
            });
          }
        }

        const result = await this.model.generateContent({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            temperature: mergedOptions.temperature,
            topP: mergedOptions.topP,
            maxOutputTokens: mergedOptions.maxTokens
          }
        });

        const duration = Date.now() - startTime;
        const response = result.response;
        const text = response.text();

        const inputTokens = response.usageMetadata?.promptTokenCount || this.estimateTokens(prompt);
        const outputTokens = response.usageMetadata?.candidatesTokenCount || this.estimateTokens(text);
        const usage = this.trackUsage(inputTokens, outputTokens);

        return this.createResponse(
          text,
          usage,
          {
            multimodal: true,
            imageCount: images.length,
            finishReason: response.candidates?.[0]?.finishReason,
            safetyRatings: response.candidates?.[0]?.safetyRatings,
            duration: duration
          }
        );

      } catch (error) {
        throw this.handleError(error, 'generateWithImages');
      }
    }, 'generateWithImages');
  }

  /**
   * Retry logic wrapper
   * @param {Function} fn - Function to retry
   * @param {string} operation - Operation name for logging
   * @returns {Promise<*>} Result of the function
   */
  async withRetry(fn, operation) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain errors
        if (this.shouldNotRetry(error)) {
          throw error;
        }
        
        console.warn(`Gemini ${operation} attempt ${attempt}/${this.maxRetries} failed:`, error.message);
        
        if (attempt < this.maxRetries) {
          // Exponential backoff
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Check if error should not be retried
   * @param {Error} error - Error to check
   * @returns {boolean} True if should not retry
   */
  shouldNotRetry(error) {
    // Don't retry on authentication, safety, or quota errors
    const noRetryPatterns = [
      'API_KEY_INVALID',
      'QUOTA_EXCEEDED',
      'SAFETY',
      'RECITATION',
      'invalid_argument'
    ];
    
    const errorMessage = error.message?.toLowerCase() || '';
    
    return noRetryPatterns.some(pattern => 
      errorMessage.includes(pattern.toLowerCase())
    );
  }

  /**
   * Enhanced error handling for Google-specific errors
   */
  handleError(error, operation) {
    // Handle Google-specific error types
    if (error.message?.includes('API_KEY_INVALID')) {
      return new Error(`Google AI API key is invalid for ${this.modelId}. Please check your API key.`);
    }

    if (error.message?.includes('QUOTA_EXCEEDED')) {
      return new Error(`Google AI quota exceeded for ${this.modelId}. Please check your billing.`);
    }

    if (error.message?.includes('SAFETY')) {
      return new Error(`Content blocked by Google AI safety filters for ${this.modelId}.`);
    }

    if (error.message?.includes('RECITATION')) {
      return new Error(`Content blocked due to recitation policy for ${this.modelId}.`);
    }

    if (error.message?.includes('RESOURCE_EXHAUSTED')) {
      return new Error(`Rate limit exceeded for ${this.modelId}. Please try again later.`);
    }

    if (error.message?.includes('model not found')) {
      return new Error(`Google AI model ${this.modelId} not found. Please check the model name.`);
    }

    // Fall back to base error handling
    return super.handleError(error, operation);
  }

  /**
   * Get Gemini-specific model information
   * @returns {Object} Model information
   */
  getModelInfo() {
    return {
      ...super.getModelInfo(),
      geminiSpecific: {
        supportsMultimodal: true,
        supportsSystemInstruction: false, // System messages are prepended to user
        supportsFunctionCalling: true,
        safetyFilters: true,
        citationSupport: true
      }
    };
  }
}

export default GeminiService;