/**
 * BaseAgent - Abstract base class for all specialized AI agents
 * 
 * Provides common functionality and interface that all agents must implement
 * for the multi-agent orchestration system.
 */

import { v4 as uuidv4 } from 'uuid';
import LLMManager from '../llm/LLMManager.js';

export class BaseAgent {
  constructor(options = {}) {
    // Agent identification
    this.id = options.id || this.constructor.name.toLowerCase().replace('agent', '');
    this.name = options.name || this.constructor.name;
    this.version = options.version || '1.0.0';
    
    // Agent configuration
    this.options = {
      timeout: options.timeout || 30000,
      maxRetries: options.maxRetries || 2,
      confidence_threshold: options.confidence_threshold || 0.7,
      preferredLLM: options.preferredLLM || this.getPreferredLLM(),
      fallbackLLMs: options.fallbackLLMs || ['gpt-4o-mini', 'claude-3-haiku'],
      temperature: options.temperature || 0.7,
      ...options
    };
    
    // LLM Manager for AI operations (singleton instance)
    this.llmManager = options.llmManager || LLMManager;
    
    // Agent state
    this.initialized = false;
    this.capabilities = null;
    this.specialization = null;
    
    // Performance tracking
    this.metrics = {
      tasksHandled: 0,
      successfulTasks: 0,
      failedTasks: 0,
      averageExecutionTime: 0,
      lastExecutionTime: null
    };
  }

  /**
   * Initialize the agent
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      console.log(`🤖 Initializing ${this.name}...`);
      
      // Initialize LLM manager if needed
      if (!this.llmManager.initialized) {
        await this.llmManager.initialize();
      }
      
      // Load capabilities and specialization
      this.capabilities = this.getCapabilities();
      this.specialization = this.getSpecialization();
      
      // Perform agent-specific initialization
      await this.onInitialize();
      
      this.initialized = true;
      console.log(`✅ ${this.name} initialized successfully`);
      
    } catch (error) {
      console.error(`❌ ${this.name} initialization failed:`, error);
      throw error;
    }
  }

  /**
   * Check if the agent can handle a specific task
   * @param {Object} task - Task to evaluate
   * @returns {boolean|number} true/false or confidence score (0-1)
   */
  async canHandle(task) {
    try {
      // Basic type checking
      const supportedTypes = this.getSupportedTaskTypes();
      if (task.type && !supportedTypes.includes(task.type)) {
        return false;
      }
      
      // Check required capabilities
      if (task.requiredCapabilities) {
        const hasAllCapabilities = task.requiredCapabilities.every(cap => 
          this.capabilities.includes(cap)
        );
        if (!hasAllCapabilities) {
          return false;
        }
      }
      
      // Agent-specific evaluation
      const confidence = await this.evaluateTask(task);
      
      // Return boolean or confidence score
      if (typeof confidence === 'number') {
        return confidence;
      }
      
      return confidence ? this.options.confidence_threshold : false;
      
    } catch (error) {
      console.error(`Error evaluating task in ${this.name}:`, error);
      return false;
    }
  }

  /**
   * Execute a task
   * @param {Object} task - Task to execute
   * @param {Object} context - Execution context
   * @returns {Object} Execution result
   */
  async execute(task, context = {}) {
    const startTime = Date.now();
    const executionId = context.executionId || uuidv4();
    
    try {
      this.ensureInitialized();
      
      console.log(`🚀 ${this.name} executing task: ${task.type || 'unknown'}`);
      
      // Update metrics
      this.metrics.tasksHandled++;
      
      // Validate task
      const validation = await this.validateTask(task);
      if (!validation.valid) {
        throw new Error(`Invalid task: ${validation.reason}`);
      }
      
      // Prepare execution context
      const executionContext = {
        ...context,
        agent: {
          id: this.id,
          name: this.name,
          version: this.version
        },
        executionId,
        startTime
      };
      
      // Execute with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Execution timeout')), this.options.timeout);
      });
      
      const executionPromise = this.performTask(task, executionContext);
      
      const result = await Promise.race([executionPromise, timeoutPromise]);
      
      // Post-process result
      const processedResult = await this.postProcessResult(result, task, executionContext);
      
      // Update metrics
      const executionTime = Date.now() - startTime;
      this.updateMetrics(true, executionTime);
      
      // Build final result
      const finalResult = {
        success: true,
        data: processedResult,
        metadata: {
          agentId: this.id,
          agentName: this.name,
          executionId,
          executionTime,
          confidence: processedResult.confidence || 1.0,
          llmUsed: context.llmUsed || this.options.preferredLLM,
          ...processedResult.metadata
        }
      };
      
      console.log(`✅ ${this.name} completed task in ${executionTime}ms`);
      return finalResult;
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.updateMetrics(false, executionTime);
      
      console.error(`❌ ${this.name} task execution failed:`, error);
      
      // Build error result
      const errorResult = {
        success: false,
        error: error.message,
        metadata: {
          agentId: this.id,
          agentName: this.name,
          executionId,
          executionTime,
          errorType: error.constructor.name
        }
      };
      
      // Attempt recovery if configured
      if (context.attempt < this.options.maxRetries) {
        console.log(`🔄 Attempting recovery...`);
        const recovery = await this.attemptRecovery(error, task, context);
        if (recovery.success) {
          return recovery;
        }
      }
      
      throw error;
    }
  }

  /**
   * Validate the result of task execution
   * @param {Object} result - Result to validate
   * @returns {Object} Validation result
   */
  async validateResult(result) {
    try {
      // Basic validation
      if (!result) {
        return { valid: false, reason: 'No result provided' };
      }
      
      if (result.error) {
        return { valid: false, reason: `Error in result: ${result.error}` };
      }
      
      // Check for required fields
      const requiredFields = this.getRequiredResultFields();
      for (const field of requiredFields) {
        if (!result[field] && !result.data?.[field]) {
          return { valid: false, reason: `Missing required field: ${field}` };
        }
      }
      
      // Agent-specific validation
      const agentValidation = await this.performResultValidation(result);
      if (!agentValidation.valid) {
        return agentValidation;
      }
      
      return { valid: true };
      
    } catch (error) {
      console.error(`Error validating result in ${this.name}:`, error);
      return { valid: false, reason: error.message };
    }
  }

  /**
   * Get agent capabilities
   * @returns {Array<string>} List of capabilities
   */
  getCapabilities() {
    // Override in subclasses
    return [
      'text-processing',
      'data-extraction',
      'analysis'
    ];
  }

  /**
   * Get agent specialization
   * @returns {string} Specialization description
   */
  getSpecialization() {
    // Override in subclasses
    return 'general-purpose';
  }

  /**
   * Get preferred LLM for this agent
   * @returns {string} LLM identifier
   */
  getPreferredLLM() {
    // Override in subclasses
    return 'gpt-4o-mini';
  }

  /**
   * Get supported task types
   * @returns {Array<string>} Supported task types
   */
  getSupportedTaskTypes() {
    // Override in subclasses
    return ['general'];
  }

  /**
   * Get required result fields
   * @returns {Array<string>} Required fields
   */
  getRequiredResultFields() {
    // Override in subclasses
    return [];
  }

  /**
   * Get timeout for this agent
   * @returns {number} Timeout in milliseconds
   */
  getTimeout() {
    return this.options.timeout;
  }

  // Abstract methods to be implemented by subclasses

  /**
   * Agent-specific initialization
   */
  async onInitialize() {
    // Override in subclasses
  }

  /**
   * Evaluate if agent can handle task (agent-specific)
   * @param {Object} task - Task to evaluate
   * @returns {boolean|number} Confidence in handling task
   */
  async evaluateTask(task) {
    // Override in subclasses
    return true;
  }

  /**
   * Validate task before execution (agent-specific)
   * @param {Object} task - Task to validate
   * @returns {Object} Validation result
   */
  async validateTask(task) {
    // Override in subclasses
    return { valid: true };
  }

  /**
   * Perform the actual task (agent-specific)
   * @param {Object} task - Task to perform
   * @param {Object} context - Execution context
   * @returns {Object} Task result
   */
  async performTask(task, context) {
    // Must be implemented by subclasses
    throw new Error(`${this.name} must implement performTask method`);
  }

  /**
   * Post-process the result (agent-specific)
   * @param {Object} result - Raw result
   * @param {Object} task - Original task
   * @param {Object} context - Execution context
   * @returns {Object} Processed result
   */
  async postProcessResult(result, task, context) {
    // Override in subclasses for custom processing
    return result;
  }

  /**
   * Validate result (agent-specific validation)
   * @param {Object} result - Result to validate
   * @returns {Object} Validation result
   */
  async performResultValidation(result) {
    // Override in subclasses
    return { valid: true };
  }

  /**
   * Attempt to recover from error
   * @param {Error} error - Error that occurred
   * @param {Object} task - Original task
   * @param {Object} context - Execution context
   * @returns {Object} Recovery result
   */
  async attemptRecovery(error, task, context) {
    // Override in subclasses for custom recovery
    return { success: false };
  }

  // Helper methods

  /**
   * Call LLM with fallback support
   * @param {string} prompt - Prompt for LLM
   * @param {Object} options - LLM options
   * @returns {Object} LLM response
   */
  async callLLM(prompt, options = {}) {
    try {
      const llmOptions = {
        model: options.model || this.options.preferredLLM,
        temperature: options.temperature || this.options.temperature,
        maxTokens: options.maxTokens || 1000,
        ...options
      };
      
      // Convert prompt to messages format
      const messages = [
        { role: 'user', content: prompt }
      ];
      
      // Try preferred LLM first
      try {
        const response = await this.llmManager.chat(messages, {
          ...llmOptions,
          preferredProvider: this.getLLMProvider(llmOptions.model)
        });
        
        return response;
        
      } catch (error) {
        console.warn(`Primary LLM failed, trying fallbacks...`);
        
        // Try fallback LLMs
        for (const fallbackLLM of this.options.fallbackLLMs) {
          try {
            const response = await this.llmManager.chat(messages, {
              ...llmOptions,
              model: fallbackLLM,
              preferredProvider: this.getLLMProvider(fallbackLLM)
            });
            
            console.log(`✅ Fallback to ${fallbackLLM} successful`);
            return response;
            
          } catch (fallbackError) {
            console.warn(`Fallback ${fallbackLLM} also failed`);
          }
        }
        
        throw error;
      }
      
    } catch (error) {
      console.error(`All LLMs failed for ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Get LLM provider from model name
   */
  getLLMProvider(model) {
    if (model.includes('gpt')) return 'openai';
    if (model.includes('claude')) return 'anthropic';
    if (model.includes('gemini')) return 'google';
    if (model.includes('llama')) return 'ollama';
    return 'openai'; // default
  }

  /**
   * Update performance metrics
   */
  updateMetrics(success, executionTime) {
    if (success) {
      this.metrics.successfulTasks++;
    } else {
      this.metrics.failedTasks++;
    }
    
    // Update average execution time
    const totalTasks = this.metrics.successfulTasks + this.metrics.failedTasks;
    this.metrics.averageExecutionTime = 
      (this.metrics.averageExecutionTime * (totalTasks - 1) + executionTime) / totalTasks;
    
    this.metrics.lastExecutionTime = new Date();
  }

  /**
   * Get agent status
   */
  getStatus() {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      initialized: this.initialized,
      capabilities: this.capabilities,
      specialization: this.specialization,
      metrics: { ...this.metrics },
      health: this.calculateHealth()
    };
  }

  /**
   * Calculate agent health score
   */
  calculateHealth() {
    if (this.metrics.tasksHandled === 0) return 1.0;
    
    const successRate = this.metrics.successfulTasks / this.metrics.tasksHandled;
    const performanceScore = Math.min(1.0, 5000 / this.metrics.averageExecutionTime);
    
    return (successRate * 0.7) + (performanceScore * 0.3);
  }

  /**
   * Ensure agent is initialized
   */
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error(`${this.name} not initialized. Call initialize() first.`);
    }
  }

  /**
   * Parse AI response safely
   */
  parseAIResponse(response) {
    try {
      // If response has a content field (from LLM response)
      if (response && typeof response === 'object' && response.content) {
        response = response.content;
      }
      
      if (typeof response === 'string') {
        // Try to extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        // If no JSON found, return the string as-is
        return response;
      }
      return response;
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return {};
    }
  }

  /**
   * Shutdown the agent
   */
  async shutdown() {
    console.log(`🛑 Shutting down ${this.name}...`);
    this.initialized = false;
  }
}

export default BaseAgent;