/**
 * Fallback Manager for Tala AI LLM Services
 * 
 * Manages retry logic, circuit breaker patterns, and graceful degradation
 * for robust error handling across multiple LLM providers.
 */

import { 
  LLMError, 
  RateLimitError, 
  NetworkError, 
  ServiceError, 
  AllModelsFailedError,
  ErrorUtils 
} from './errors/LLMErrors.js';

/**
 * Circuit breaker states
 */
const CIRCUIT_STATES = {
  CLOSED: 'closed',     // Normal operation
  OPEN: 'open',         // Blocking requests due to failures
  HALF_OPEN: 'half_open' // Testing if service has recovered
};

/**
 * Circuit breaker for individual services
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 300000; // 5 minutes
    
    this.state = CIRCUIT_STATES.CLOSED;
    this.failures = [];
    this.successes = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
  }

  /**
   * Check if requests are allowed through the circuit breaker
   */
  canExecute() {
    this.cleanupOldFailures();
    
    switch (this.state) {
      case CIRCUIT_STATES.CLOSED:
        return true;
        
      case CIRCUIT_STATES.OPEN:
        if (Date.now() >= this.nextAttemptTime) {
          this.state = CIRCUIT_STATES.HALF_OPEN;
          return true;
        }
        return false;
        
      case CIRCUIT_STATES.HALF_OPEN:
        return true;
        
      default:
        return false;
    }
  }

  /**
   * Record a successful execution
   */
  recordSuccess() {
    this.successes++;
    
    if (this.state === CIRCUIT_STATES.HALF_OPEN) {
      this.state = CIRCUIT_STATES.CLOSED;
      this.failures = [];
    }
  }

  /**
   * Record a failed execution
   */
  recordFailure(error) {
    const now = Date.now();
    this.failures.push({
      timestamp: now,
      error: error
    });
    this.lastFailureTime = now;
    
    this.cleanupOldFailures();
    
    if (this.failures.length >= this.failureThreshold) {
      this.state = CIRCUIT_STATES.OPEN;
      this.nextAttemptTime = now + this.resetTimeout;
    }
  }

  /**
   * Remove failures older than monitoring period
   */
  cleanupOldFailures() {
    const cutoff = Date.now() - this.monitoringPeriod;
    this.failures = this.failures.filter(f => f.timestamp > cutoff);
  }

  /**
   * Get circuit breaker status
   */
  getStatus() {
    this.cleanupOldFailures();
    return {
      state: this.state,
      failures: this.failures.length,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      isHealthy: this.state === CIRCUIT_STATES.CLOSED
    };
  }

  /**
   * Force reset the circuit breaker
   */
  reset() {
    this.state = CIRCUIT_STATES.CLOSED;
    this.failures = [];
    this.successes = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
  }
}

/**
 * Manages fallback chains and robust error handling
 */
export class FallbackManager {
  constructor(options = {}) {
    this.options = {
      maxRetries: options.maxRetries || 3,
      baseDelay: options.baseDelay || 1000,
      maxDelay: options.maxDelay || 16000,
      jitterFactor: options.jitterFactor || 0.1,
      enableCircuitBreaker: options.enableCircuitBreaker !== false,
      enableLogging: options.enableLogging !== false,
      ...options
    };

    // Circuit breakers for each service
    this.circuitBreakers = new Map();
    
    // Fallback chain configurations for different query types (Updated with GPT-5)
    this.fallbackChains = {
      complexPlanning: [
        'gpt-5-2025-08-07',           // GPT-5 for heavy-duty work
        'gpt-5-mini-2025-08-07',      // Fallback to GPT-5 Mini
        'claude-opus-4-20250514',     // Then Claude 4 Opus
        'gemini-2.5-pro'              // Finally Gemini 2.5 Pro
      ],
      realTime: [
        'gpt-5-nano-2025-08-07',      // GPT-5 Nano for fast responses
        'grok-4-latest',              // Grok for real-time
        'gemini-2.5-flash',           // Gemini Flash for speed
        'claude-sonnet-4-20250514'    // Claude as backup
      ],
      documentAnalysis: [
        'gpt-5-2025-08-07',           // GPT-5 for best analysis
        'gpt-5-mini-2025-08-07',      // GPT-5 Mini as fallback
        'claude-sonnet-4-20250514',   // Claude 4 for analysis
        'gemini-2.5-pro'              // Gemini 2.5 Pro
      ],
      multimodal: [
        'gpt-5-mini-2025-08-07',      // GPT-5 Mini for multimodal
        'gemini-2.5-pro',             // Gemini 2.5 Pro for vision
        'claude-sonnet-4-20250514'    // Claude 4 as backup
      ],
      creative: [
        'claude-opus-4-20250514',     // Keep Claude for creative (pending GPT-5 testing)
        'gpt-5-mini-2025-08-07',      // Try GPT-5 Mini for creative
        'claude-sonnet-4-20250514',   // Claude Sonnet
        'gemini-2.5-flash'            // Gemini Flash
      ],
      factual: [
        'gpt-5-nano-2025-08-07',      // GPT-5 Nano for quick facts
        'gemini-2.5-flash',           // Gemini Flash
        'claude-sonnet-4-20250514'    // Claude as backup
      ],
      costOptimized: [
        'gpt-5-nano-2025-08-07',      // GPT-5 Nano is cost-effective
        'gemini-2.5-flash',           // Gemini Flash is cheap
        'gpt-4o-mini',                // Legacy GPT-4o Mini
        'grok-4-latest'               // Grok as final fallback
      ]
    };

    // Statistics tracking
    this.stats = {
      totalAttempts: 0,
      successfulAttempts: 0,
      failedAttempts: 0,
      retriesPerformed: 0,
      circuitBreakerTrips: 0,
      fallbacksUsed: 0,
      errorsByType: {},
      modelPerformance: {}
    };
  }

  /**
   * Execute a function with comprehensive fallback support
   */
  async executeWithFallback(executionFunction, fallbackChain, context = {}) {
    const failures = [];
    let lastError = null;
    
    this.stats.totalAttempts++;
    
    for (let i = 0; i < fallbackChain.length; i++) {
      const modelId = fallbackChain[i];
      const circuitBreaker = this.getCircuitBreaker(modelId);
      
      // Check circuit breaker
      if (this.options.enableCircuitBreaker && !circuitBreaker.canExecute()) {
        const skipError = new ServiceError(
          `Circuit breaker open for ${modelId}`,
          modelId,
          null,
          'circuit_breaker_open'
        );
        failures.push({
          modelId,
          error: skipError,
          timestamp: new Date().toISOString(),
          skipped: true
        });
        this.log(`Circuit breaker open for ${modelId}, skipping`, 'warn');
        continue;
      }

      try {
        this.log(`Attempting execution with ${modelId} (attempt ${i + 1}/${fallbackChain.length})`);
        
        // Execute with retry logic
        const result = await this.executeWithRetry(
          executionFunction,
          modelId,
          context
        );
        
        // Success!
        circuitBreaker.recordSuccess();
        this.recordSuccess(modelId);
        
        // Add metadata about fallback usage
        result.fallbackMetadata = {
          modelsAttempted: failures.length + 1,
          fallbacksUsed: i,
          failures: failures,
          finalModel: modelId,
          circuitBreakerStatus: this.getCircuitBreakerStatuses()
        };
        
        this.stats.successfulAttempts++;
        if (i > 0) {
          this.stats.fallbacksUsed++;
        }
        
        this.log(`Successfully executed with ${modelId} after ${i} fallbacks`);
        return result;
        
      } catch (error) {
        const classifiedError = ErrorUtils.classifyError(error, modelId, context.provider);
        lastError = classifiedError;
        
        // Record failure in circuit breaker
        circuitBreaker.recordFailure(classifiedError);
        
        // Record failure in stats
        this.recordFailure(modelId, classifiedError);
        
        failures.push({
          modelId,
          error: classifiedError,
          timestamp: new Date().toISOString(),
          retryable: classifiedError.retryable
        });
        
        this.log(`Model ${modelId} failed: ${classifiedError.message}`, 'error');
        
        // If this is the last model in the chain, don't continue
        if (i === fallbackChain.length - 1) {
          break;
        }
        
        // Check if we should continue based on error type
        if (!this.shouldContinueFallback(classifiedError)) {
          this.log(`Stopping fallback chain due to non-retryable error: ${classifiedError.constructor.name}`, 'warn');
          break;
        }
      }
    }
    
    // All models failed
    this.stats.failedAttempts++;
    const allFailedError = new AllModelsFailedError(failures, context.query);
    this.log(`All models failed after ${failures.length} attempts`, 'error');
    
    throw allFailedError;
  }

  /**
   * Execute with retry logic for a single model
   */
  async executeWithRetry(executionFunction, modelId, context) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        return await executionFunction(modelId);
        
      } catch (error) {
        const classifiedError = ErrorUtils.classifyError(error, modelId, context.provider);
        lastError = classifiedError;
        
        this.log(`Attempt ${attempt}/${this.options.maxRetries} failed for ${modelId}: ${classifiedError.message}`, 'warn');
        
        // Don't retry if error is not retryable
        if (!classifiedError.retryable) {
          throw classifiedError;
        }
        
        // Don't retry if this is the last attempt
        if (attempt === this.options.maxRetries) {
          throw classifiedError;
        }
        
        // Calculate delay and wait
        const delay = this.calculateRetryDelay(classifiedError, attempt);
        this.log(`Retrying ${modelId} in ${delay}ms`);
        await this.sleep(delay);
        
        this.stats.retriesPerformed++;
      }
    }
    
    throw lastError;
  }

  /**
   * Get or create circuit breaker for a model
   */
  getCircuitBreaker(modelId) {
    if (!this.circuitBreakers.has(modelId)) {
      this.circuitBreakers.set(modelId, new CircuitBreaker({
        failureThreshold: 5,
        resetTimeout: 60000,
        monitoringPeriod: 300000
      }));
    }
    return this.circuitBreakers.get(modelId);
  }

  /**
   * Get fallback chain for a query type
   */
  getFallbackChain(queryType, customChain = null) {
    if (customChain) {
      return [...customChain];
    }
    
    return [...(this.fallbackChains[queryType] || this.fallbackChains.factual)];
  }

  /**
   * Get cost-optimized fallback chain
   */
  getCostOptimizedChain() {
    return [...this.fallbackChains.costOptimized];
  }

  /**
   * Determine if fallback should continue based on error type
   */
  shouldContinueFallback(error) {
    // Don't continue for these error types
    // Check for context length errors by name since class might not be defined
    if (error && error.name === 'ContextLengthExceededError') {
      return false; // Need to modify input, not try different model
    }
    
    // Continue for retryable errors
    return error.retryable;
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  calculateRetryDelay(error, attemptNumber) {
    // Use error-specific delay if available
    const errorDelay = ErrorUtils.getRetryDelay(error, attemptNumber);
    if (errorDelay > 0) {
      return errorDelay;
    }
    
    // Exponential backoff
    const baseDelay = this.options.baseDelay;
    const maxDelay = this.options.maxDelay;
    const delay = Math.min(baseDelay * Math.pow(2, attemptNumber - 1), maxDelay);
    
    // Add jitter
    const jitter = Math.random() * this.options.jitterFactor * delay;
    return Math.floor(delay + jitter);
  }

  /**
   * Record successful execution in stats
   */
  recordSuccess(modelId) {
    if (!this.stats.modelPerformance[modelId]) {
      this.stats.modelPerformance[modelId] = {
        successes: 0,
        failures: 0,
        avgResponseTime: 0
      };
    }
    this.stats.modelPerformance[modelId].successes++;
  }

  /**
   * Record failed execution in stats
   */
  recordFailure(modelId, error) {
    if (!this.stats.modelPerformance[modelId]) {
      this.stats.modelPerformance[modelId] = {
        successes: 0,
        failures: 0,
        avgResponseTime: 0
      };
    }
    
    this.stats.modelPerformance[modelId].failures++;
    
    const errorType = error.constructor.name;
    this.stats.errorsByType[errorType] = (this.stats.errorsByType[errorType] || 0) + 1;
  }

  /**
   * Get circuit breaker statuses for all models
   */
  getCircuitBreakerStatuses() {
    const statuses = {};
    for (const [modelId, breaker] of this.circuitBreakers.entries()) {
      statuses[modelId] = breaker.getStatus();
    }
    return statuses;
  }

  /**
   * Reset circuit breaker for a specific model
   */
  resetCircuitBreaker(modelId) {
    const breaker = this.circuitBreakers.get(modelId);
    if (breaker) {
      breaker.reset();
      this.log(`Circuit breaker reset for ${modelId}`);
    }
  }

  /**
   * Reset all circuit breakers
   */
  resetAllCircuitBreakers() {
    for (const [modelId, breaker] of this.circuitBreakers.entries()) {
      breaker.reset();
    }
    this.log('All circuit breakers reset');
  }

  /**
   * Get comprehensive performance statistics
   */
  getStats() {
    const successRate = this.stats.totalAttempts > 0 
      ? (this.stats.successfulAttempts / this.stats.totalAttempts * 100).toFixed(2)
      : 0;
      
    return {
      ...this.stats,
      successRate: `${successRate}%`,
      circuitBreakerStatuses: this.getCircuitBreakerStatuses(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Clear all statistics
   */
  clearStats() {
    this.stats = {
      totalAttempts: 0,
      successfulAttempts: 0,
      failedAttempts: 0,
      retriesPerformed: 0,
      circuitBreakerTrips: 0,
      fallbacksUsed: 0,
      errorsByType: {},
      modelPerformance: {}
    };
    this.log('Statistics cleared');
  }

  /**
   * Sleep for specified milliseconds
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log messages with timestamp
   */
  log(message, level = 'info') {
    if (!this.options.enableLogging) return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[FallbackManager ${level.toUpperCase()}] ${timestamp}`;
    
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

export default FallbackManager;