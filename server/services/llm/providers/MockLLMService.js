/**
 * Mock LLM Service Implementation
 * 
 * Implements the BaseLLMService for testing purposes.
 * Returns predetermined responses and can simulate failures.
 */

import BaseLLMService from '../base/BaseLLMService.js';

class MockLLMService extends BaseLLMService {
  constructor(modelId = 'mock-model', options = {}) {
    // Skip parent constructor validation for mock service
    if (options.skipInit) {
      // Manual initialization for testing
      this.modelId = modelId;
      this.options = options;
      this.requestCount = 0;
      this.totalTokensUsed = 0;
      this.totalCost = 0;
      this.initialized = false;
    } else {
      // Use a valid model ID that exists in config
      super('gpt-4o-mini', options);
      this.modelId = modelId; // Override with mock model ID
    }
    
    // Mock-specific configuration
    this.responses = options.responses || this.getDefaultResponses();
    this.structuredResponses = this.getStructuredResponses();
    
    this.responseIndex = 0;
    this.simulateDelay = options.simulateDelay !== false;
    this.delayMs = options.delayMs || 500;
    this.failureRate = options.failureRate || 0;
    this.failureMode = options.failureMode || 'random'; // 'random', 'sequential', 'always'
    this.requestCount = 0;
    this.failAfter = options.failAfter || 3; // For sequential failure mode
  }

  /**
   * Initialize mock service (no-op for mock)
   */
  initialize() {
    // Mock service doesn't need initialization
    this.initialized = true;
  }

  /**
   * Simulate API delay
   */
  async simulateApiDelay() {
    if (this.simulateDelay) {
      const jitter = Math.random() * 200 - 100; // ±100ms jitter
      const delay = Math.max(100, this.delayMs + jitter);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  /**
   * Determine if this request should fail
   */
  shouldFail() {
    this.requestCount++;
    
    switch (this.failureMode) {
      case 'always':
        return true;
      
      case 'sequential':
        return this.requestCount > this.failAfter;
      
      case 'random':
      default:
        return Math.random() < this.failureRate;
    }
  }

  /**
   * Get next response from the mock responses
   */
  getNextResponse(messages) {
    // Check if this is a structured task request
    if (messages && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      const content = lastMessage.content?.toLowerCase() || '';
      
      // Check for task-specific patterns
      if (content.includes('parse') && content.includes('email')) {
        return JSON.stringify(this.structuredResponses['parse-email']);
      }
      if (content.includes('itinerary') || content.includes('plan')) {
        return JSON.stringify(this.structuredResponses['build-itinerary']);
      }
      if (content.includes('document') || content.includes('passport')) {
        return JSON.stringify(this.structuredResponses['analyze-document']);
      }
      if (content.includes('task') || content.includes('todo')) {
        return JSON.stringify(this.structuredResponses['extract-tasks']);
      }
    }
    
    // Default response
    const response = this.responses[this.responseIndex % this.responses.length];
    this.responseIndex++;
    return response;
  }

  /**
   * Send a mock chat message
   * @param {Array} messages - Array of message objects
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response object
   */
  async chat(messages, options = {}) {
    try {
      this.validateMessages(messages);
      
      // Simulate API delay
      await this.simulateApiDelay();
      
      // Check if we should simulate a failure
      if (this.shouldFail()) {
        throw this.createMockError();
      }
      
      // Get mock response
      let response = this.getNextResponse(messages);
      
      // If function calling is requested, return a function call
      if (options.tools || options.functions) {
        response = {
          content: "I'll help you with that function call.",
          toolCalls: [{
            id: "mock_call_1",
            type: "function",
            function: {
              name: options.tools?.[0]?.function?.name || "mock_function",
              arguments: JSON.stringify({ result: "mock result" })
            }
          }]
        };
      }
      
      // Calculate mock token usage
      const inputTokens = this.estimateTokens(messages.map(m => m.content).join(' '));
      const outputTokens = this.estimateTokens(
        typeof response === 'string' ? response : response.content
      );
      
      const usage = this.trackUsage(inputTokens, outputTokens);
      
      return this.createResponse(
        typeof response === 'string' ? response : response.content,
        usage,
        {
          mock: true,
          requestNumber: this.requestCount,
          finishReason: 'stop',
          model: this.modelId,
          ...(typeof response === 'object' ? response : {})
        }
      );
      
    } catch (error) {
      throw this.handleError(error, 'chat');
    }
  }

  /**
   * Generate mock embeddings
   * @param {string|Array} text - Text to embed
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Embedding response
   */
  async embed(text, options = {}) {
    try {
      await this.simulateApiDelay();
      
      if (this.shouldFail()) {
        throw this.createMockError();
      }
      
      const texts = Array.isArray(text) ? text : [text];
      const embeddings = texts.map(() => {
        // Generate mock embedding vector
        const dimensions = options.dimensions || 1536;
        return Array(dimensions).fill(0).map(() => Math.random() * 2 - 1);
      });
      
      const inputTokens = texts.reduce((sum, t) => sum + this.estimateTokens(t), 0);
      const usage = this.trackUsage(inputTokens, 0);
      
      return this.createResponse(
        embeddings,
        usage,
        {
          mock: true,
          embeddingModel: this.modelId,
          dimensions: embeddings[0].length
        }
      );
      
    } catch (error) {
      throw this.handleError(error, 'embed');
    }
  }

  /**
   * Check if mock service is available
   * @returns {Promise<boolean>} True if available (can be configured to fail)
   */
  async isAvailable() {
    await this.simulateApiDelay();
    
    if (this.failureMode === 'always') {
      return false;
    }
    
    return !this.shouldFail();
  }

  /**
   * Stream mock chat completion
   * @param {Array} messages - Array of message objects
   * @param {Object} options - Request options
   * @param {Function} onChunk - Callback for each chunk
   * @returns {Promise<Object>} Final response object
   */
  async streamChat(messages, options = {}, onChunk = null) {
    try {
      this.validateMessages(messages);
      
      if (this.shouldFail()) {
        throw this.createMockError();
      }
      
      const fullResponse = this.getNextResponse(messages);
      const words = fullResponse.split(' ');
      let accumulatedContent = '';
      
      // Simulate streaming by sending words in chunks
      for (let i = 0; i < words.length; i++) {
        await this.simulateApiDelay();
        
        const chunk = words[i] + (i < words.length - 1 ? ' ' : '');
        accumulatedContent += chunk;
        
        if (onChunk) {
          onChunk({
            content: chunk,
            fullContent: accumulatedContent,
            isComplete: false
          });
        }
      }
      
      const inputTokens = this.estimateTokens(messages.map(m => m.content).join(' '));
      const outputTokens = this.estimateTokens(fullResponse);
      const usage = this.trackUsage(inputTokens, outputTokens);
      
      const finalResponse = this.createResponse(fullResponse, usage, {
        mock: true,
        streamed: true,
        model: this.modelId
      });
      
      if (onChunk) {
        onChunk({
          content: '',
          fullContent: fullResponse,
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
   * Create a mock error for testing
   * @returns {Error} Mock error
   */
  createMockError() {
    const errors = [
      { 
        message: 'Mock rate limit exceeded',
        status: 429,
        type: 'rate_limit_error'
      },
      {
        message: 'Mock API key invalid',
        status: 401,
        type: 'authentication_error'
      },
      {
        message: 'Mock service temporarily unavailable',
        status: 503,
        type: 'service_error'
      },
      {
        message: 'Mock context length exceeded',
        status: 400,
        type: 'invalid_request_error'
      },
      {
        message: 'Mock quota exceeded',
        status: 402,
        type: 'insufficient_quota'
      }
    ];
    
    const errorConfig = errors[Math.floor(Math.random() * errors.length)];
    const error = new Error(errorConfig.message);
    error.status = errorConfig.status;
    error.type = errorConfig.type;
    
    return error;
  }

  /**
   * Get default responses for general queries
   */
  getDefaultResponses() {
    return [
      "This is a mock response from the Mock LLM Service.",
      "I'm a test model designed to help with testing.",
      "Mock response: Everything is working correctly!",
      "Test successful! The mock service is responding."
    ];
  }

  /**
   * Get structured responses for specific agent tasks
   */
  getStructuredResponses() {
    return {
      'parse-email': {
        bookingDetails: {
          confirmationNumber: 'ABC123',
          type: 'flight',
          airline: 'American Airlines',
          flightNumber: 'AA1234',
          departure: {
            airport: 'JFK',
            city: 'New York',
            date: '2025-06-15',
            time: '22:30',
            terminal: '8',
            gate: '42'
          },
          arrival: {
            airport: 'LHR',
            city: 'London',
            date: '2025-06-16',
            time: '10:15',
            terminal: '3'
          },
          passenger: 'John Smith',
          class: 'Economy',
          seat: '24A',
          price: 856.00,
          currency: 'USD'
        },
        actionItems: [
          'Arrive 3 hours before departure',
          'Check-in online 24 hours before',
          'Baggage: 1 checked (23kg), 1 carry-on'
        ]
      },
      'build-itinerary': {
        overview: {
          totalDays: 14,
          totalCost: 4500,
          destinations: ['Paris', 'Rome', 'Barcelona'],
          highlights: ['Eiffel Tower', 'Colosseum', 'Sagrada Familia']
        },
        days: [
          {
            date: '2025-07-01',
            day: 1,
            location: 'Paris',
            accommodation: {
              name: 'Hotel Le Marais',
              type: 'hotel',
              cost: 150,
              checkIn: '15:00',
              checkOut: '11:00'
            },
            activities: [
              {
                time: '10:00',
                duration: '3 hours',
                name: 'Eiffel Tower',
                description: 'Visit the iconic tower',
                cost: 30,
                location: 'Champ de Mars',
                bookingRequired: true
              }
            ],
            meals: [
              {
                type: 'lunch',
                time: '13:00',
                restaurant: 'Café de Flore',
                cuisine: 'French',
                cost: 40
              }
            ],
            transportation: [],
            notes: ['Remember to book Eiffel Tower tickets in advance']
          }
        ],
        logistics: {
          visaRequirements: ['Schengen visa for non-EU citizens'],
          vaccinations: ['None required'],
          currency: ['EUR'],
          weather: ['Summer: warm and pleasant'],
          packingList: ['Comfortable walking shoes', 'Light jacket']
        },
        alternatives: []
      },
      'analyze-document': {
        passportData: {
          documentType: 'passport',
          passportNumber: '123456789',
          country: 'USA',
          surname: 'SMITH',
          givenNames: 'JOHN MICHAEL',
          nationality: 'UNITED STATES OF AMERICA',
          dateOfBirth: '1985-03-15',
          sex: 'M',
          placeOfBirth: 'NEW YORK, USA',
          dateOfIssue: '2020-01-20',
          dateOfExpiry: '2030-01-19',
          authority: 'DEPARTMENT OF STATE'
        },
        expiryStatus: {
          status: 'valid',
          monthsRemaining: 60,
          needsRenewal: false
        }
      },
      'extract-tasks': {
        tasks: [
          {
            id: 'task_1',
            description: 'Renew passport before May 2025',
            category: 'documentation',
            priority: 'high',
            deadline: '2025-04-01',
            status: 'pending'
          },
          {
            id: 'task_2',
            description: 'Book flights for Japan trip',
            category: 'booking',
            priority: 'high',
            deadline: '2025-03-15',
            status: 'pending'
          },
          {
            id: 'task_3',
            description: 'Research visa requirements for Japan',
            category: 'research',
            priority: 'medium',
            deadline: '2025-02-15',
            status: 'pending'
          }
        ]
      }
    };
  }

  /**
   * Configure mock service behavior
   * @param {Object} config - Configuration options
   */
  configure(config) {
    if (config.responses) this.responses = config.responses;
    if (config.failureRate !== undefined) this.failureRate = config.failureRate;
    if (config.failureMode) this.failureMode = config.failureMode;
    if (config.delayMs !== undefined) this.delayMs = config.delayMs;
    if (config.simulateDelay !== undefined) this.simulateDelay = config.simulateDelay;
    if (config.failAfter !== undefined) this.failAfter = config.failAfter;
  }

  /**
   * Reset mock service state
   */
  reset() {
    this.responseIndex = 0;
    this.requestCount = 0;
    this.totalCost = 0;
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
  }

  /**
   * Get mock service statistics
   * @returns {Object} Service statistics
   */
  getStats() {
    return {
      ...super.getStats(),
      mock: true,
      failureRate: this.failureRate,
      failureMode: this.failureMode,
      responseCount: this.responses.length,
      currentResponseIndex: this.responseIndex % this.responses.length
    };
  }
}

export default MockLLMService;