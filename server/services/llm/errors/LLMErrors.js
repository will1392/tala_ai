/**
 * LLM Error Types for Tala AI
 * 
 * Comprehensive error classes for different types of LLM service failures.
 * These errors enable intelligent fallback decisions and better user experience.
 */

/**
 * Base class for all LLM-related errors
 */
export class LLMError extends Error {
  constructor(message, originalError = null, modelId = null, provider = null) {
    super(message);
    this.name = this.constructor.name;
    this.originalError = originalError;
    this.modelId = modelId;
    this.provider = provider;
    this.timestamp = new Date().toISOString();
    this.retryable = false;
    this.userFriendlyMessage = message;
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Get a user-friendly error message suitable for display
   */
  getUserMessage() {
    return this.userFriendlyMessage;
  }

  /**
   * Get technical details for logging
   */
  getTechnicalDetails() {
    return {
      name: this.name,
      message: this.message,
      modelId: this.modelId,
      provider: this.provider,
      timestamp: this.timestamp,
      retryable: this.retryable,
      originalError: this.originalError?.message || null
    };
  }
}

/**
 * Error thrown when API rate limits are exceeded
 */
export class RateLimitError extends LLMError {
  constructor(message, modelId, provider, retryAfter = null, originalError = null) {
    super(message, originalError, modelId, provider);
    this.retryable = true;
    this.retryAfter = retryAfter; // Seconds until retry is allowed
    this.userFriendlyMessage = "The AI service is temporarily busy. Please try again in a moment.";
  }

  /**
   * Calculate when the service can be retried
   */
  getRetryTime() {
    if (this.retryAfter) {
      return new Date(Date.now() + (this.retryAfter * 1000));
    }
    // Default exponential backoff starting at 1 minute
    return new Date(Date.now() + 60000);
  }
}

/**
 * Error thrown when API key is invalid, missing, or expired
 */
export class APIKeyError extends LLMError {
  constructor(message, modelId, provider, originalError = null) {
    super(message, originalError, modelId, provider);
    this.retryable = false;
    this.userFriendlyMessage = "Authentication failed for the AI service. Please check your configuration.";
  }
}

/**
 * Error thrown when a specific model is not available
 */
export class ModelNotAvailableError extends LLMError {
  constructor(message, modelId, provider, reason = null, originalError = null) {
    super(message, originalError, modelId, provider);
    this.retryable = true; // Might be temporary
    this.reason = reason; // 'maintenance', 'deprecated', 'overloaded', etc.
    this.userFriendlyMessage = `The requested AI model (${modelId}) is currently unavailable. Trying an alternative model.`;
  }

  /**
   * Determine if this is a permanent or temporary unavailability
   */
  isPermanent() {
    return ['deprecated', 'removed', 'invalid'].includes(this.reason);
  }
}

/**
 * Error thrown when input exceeds model's context length
 */
export class ContextLengthExceededError extends LLMError {
  constructor(message, modelId, provider, requestedTokens, maxTokens, originalError = null) {
    super(message, originalError, modelId, provider);
    this.retryable = false; // Need to modify input, not retry
    this.requestedTokens = requestedTokens;
    this.maxTokens = maxTokens;
    this.userFriendlyMessage = `Your request is too long for the current AI model. Please shorten your message or break it into smaller parts.`;
  }

  /**
   * Calculate how much the input needs to be reduced
   */
  getExcessTokens() {
    return this.requestedTokens - this.maxTokens;
  }

  /**
   * Get reduction percentage needed
   */
  getReductionPercentage() {
    return Math.ceil((this.getExcessTokens() / this.requestedTokens) * 100);
  }
}

/**
 * Error thrown for network-related issues
 */
export class NetworkError extends LLMError {
  constructor(message, modelId, provider, statusCode = null, originalError = null) {
    super(message, originalError, modelId, provider);
    this.retryable = true;
    this.statusCode = statusCode;
    this.userFriendlyMessage = "Unable to connect to the AI service. Please check your internet connection.";
  }

  /**
   * Determine if this network error is retryable
   */
  isRetryable() {
    // 5xx server errors are retryable, 4xx client errors are not
    if (this.statusCode) {
      return this.statusCode >= 500;
    }
    return true; // Default to retryable for network issues
  }
}

/**
 * Error thrown when service quota is exceeded
 */
export class QuotaExceededError extends LLMError {
  constructor(message, modelId, provider, quotaType = 'requests', resetTime = null, originalError = null) {
    super(message, originalError, modelId, provider);
    this.retryable = !!resetTime;
    this.quotaType = quotaType; // 'requests', 'tokens', 'daily', 'monthly'
    this.resetTime = resetTime;
    this.userFriendlyMessage = "The AI service quota has been exceeded. Please try again later.";
  }

  /**
   * Get when the quota resets
   */
  getQuotaResetTime() {
    return this.resetTime ? new Date(this.resetTime) : null;
  }
}

/**
 * Error thrown when request times out
 */
export class TimeoutError extends LLMError {
  constructor(message, modelId, provider, timeoutMs, originalError = null) {
    super(message, originalError, modelId, provider);
    this.retryable = true;
    this.timeoutMs = timeoutMs;
    this.userFriendlyMessage = "The AI service took too long to respond. Please try again.";
  }
}

/**
 * Error thrown when input content violates safety policies
 */
export class SafetyError extends LLMError {
  constructor(message, modelId, provider, reason = null, originalError = null) {
    super(message, originalError, modelId, provider);
    this.retryable = false; // Content needs to be modified
    this.reason = reason; // 'hate', 'violence', 'sexual', 'self-harm', etc.
    this.userFriendlyMessage = "Your request couldn't be processed due to content safety policies. Please revise your message.";
  }
}

/**
 * Error thrown for service-specific errors that don't fit other categories
 */
export class ServiceError extends LLMError {
  constructor(message, modelId, provider, errorCode = null, originalError = null) {
    super(message, originalError, modelId, provider);
    this.retryable = true; // Default to retryable for service errors
    this.errorCode = errorCode;
    this.userFriendlyMessage = "The AI service encountered an error. Trying an alternative service.";
  }
}

/**
 * Error thrown when all fallback options have been exhausted
 */
export class AllModelsFailedError extends LLMError {
  constructor(failures = [], originalQuery = null) {
    const message = `All LLM models failed after ${failures.length} attempts`;
    super(message, null, null, null);
    this.retryable = false;
    this.failures = failures; // Array of {modelId, error, timestamp}
    this.originalQuery = originalQuery;
    this.userFriendlyMessage = "All AI services are currently unavailable. Please try again later.";
  }

  /**
   * Get summary of all failures
   */
  getFailureSummary() {
    const summary = {};
    this.failures.forEach(failure => {
      const errorType = failure.error.constructor.name;
      summary[errorType] = (summary[errorType] || 0) + 1;
    });
    return summary;
  }

  /**
   * Get the most recent failure
   */
  getLastFailure() {
    return this.failures[this.failures.length - 1];
  }
}

/**
 * Utility functions for error handling
 */
export class ErrorUtils {
  /**
   * Classify an error from an API response
   */
  static classifyError(error, modelId, provider) {
    const message = error.message?.toLowerCase() || '';
    const statusCode = error.status || error.statusCode;

    // Rate limiting
    if (statusCode === 429 || message.includes('rate limit') || message.includes('too many requests')) {
      const retryAfter = error.headers?.['retry-after'] || error.retryAfter;
      return new RateLimitError(error.message, modelId, provider, retryAfter, error);
    }

    // Authentication errors
    if (statusCode === 401 || statusCode === 403 || 
        message.includes('api key') || message.includes('unauthorized') || message.includes('authentication')) {
      return new APIKeyError(error.message, modelId, provider, error);
    }

    // Model not available
    if (statusCode === 404 || message.includes('model not found') || 
        message.includes('not available') || message.includes('deprecated')) {
      return new ModelNotAvailableError(error.message, modelId, provider, 'not_found', error);
    }

    // Context length exceeded
    if (message.includes('context length') || message.includes('token limit') || 
        message.includes('maximum context') || message.includes('input too long')) {
      return new ContextLengthExceededError(error.message, modelId, provider, null, null, error);
    }

    // Quota exceeded
    if (message.includes('quota') || message.includes('billing') || message.includes('usage limit')) {
      return new QuotaExceededError(error.message, modelId, provider, 'requests', null, error);
    }

    // Timeout
    if (message.includes('timeout') || message.includes('timed out') || error.code === 'ECONNRESET') {
      return new TimeoutError(error.message, modelId, provider, null, error);
    }

    // Safety/content policy
    if (message.includes('safety') || message.includes('policy') || 
        message.includes('inappropriate') || message.includes('harmful')) {
      return new SafetyError(error.message, modelId, provider, null, error);
    }

    // Network errors
    if (statusCode >= 500 || error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' ||
        message.includes('network') || message.includes('connection')) {
      return new NetworkError(error.message, modelId, provider, statusCode, error);
    }

    // Default to service error
    return new ServiceError(error.message, modelId, provider, error.code, error);
  }

  /**
   * Determine if an error is retryable
   */
  static isRetryable(error) {
    if (error instanceof LLMError) {
      return error.retryable;
    }
    // Default to non-retryable for unknown errors
    return false;
  }

  /**
   * Get appropriate delay before retry
   */
  static getRetryDelay(error, attemptNumber = 1) {
    if (error instanceof RateLimitError && error.retryAfter) {
      return error.retryAfter * 1000; // Convert to milliseconds
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s (max 16s)
    const baseDelay = 1000;
    const maxDelay = 16000;
    const delay = Math.min(baseDelay * Math.pow(2, attemptNumber - 1), maxDelay);
    
    // Add jitter to avoid thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return delay + jitter;
  }

  /**
   * Create user-friendly error message
   */
  static getUserFriendlyMessage(error) {
    if (error instanceof LLMError) {
      return error.getUserMessage();
    }
    return "An unexpected error occurred. Please try again.";
  }
}

export default {
  LLMError,
  RateLimitError,
  APIKeyError,
  ModelNotAvailableError,
  ContextLengthExceededError,
  NetworkError,
  QuotaExceededError,
  TimeoutError,
  SafetyError,
  ServiceError,
  AllModelsFailedError,
  ErrorUtils
};