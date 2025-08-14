/**
 * Request Manager for Tala AI
 * Handles rate limiting, retries, and request queuing on the frontend
 */

import toast from 'react-hot-toast';

interface RequestConfig {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  priority?: 'low' | 'normal' | 'high';
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  skipQueue?: boolean;
}

interface QueuedRequest {
  id: string;
  config: RequestConfig;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  retryCount: number;
  timestamp: number;
  priority: number;
}

interface RateLimitInfo {
  endpoint: string;
  remaining: number;
  limit: number;
  resetTime: number;
}

class RequestManager {
  private requestQueue: QueuedRequest[] = [];
  private activeRequests = new Map<string, AbortController>();
  private rateLimitInfo = new Map<string, RateLimitInfo>();
  private isProcessing = false;
  private readonly maxConcurrentRequests = 3;
  private readonly defaultTimeout = 30000; // 30 seconds
  private readonly maxRetries = 3;
  private readonly baseRetryDelay = 1000; // 1 second
  
  // Priority weights
  private readonly priorities = {
    low: 0,
    normal: 1,
    high: 2
  };

  /**
   * Make a managed request with rate limiting and retry logic
   */
  async request<T = any>(config: RequestConfig): Promise<T> {
    // Check if we should queue this request
    if (!config.skipQueue && this.shouldQueueRequest(config.url)) {
      return this.queueRequest(config);
    }

    // Execute request immediately
    return this.executeRequest(config);
  }

  /**
   * Check if request should be queued based on rate limits
   */
  private shouldQueueRequest(url: string): boolean {
    const endpoint = this.getEndpointFromUrl(url);
    const rateLimitInfo = this.rateLimitInfo.get(endpoint);
    
    if (rateLimitInfo && rateLimitInfo.remaining <= 0) {
      const now = Date.now();
      if (now < rateLimitInfo.resetTime) {
        return true; // Queue if rate limited
      }
    }
    
    // Queue if too many concurrent requests
    return this.activeRequests.size >= this.maxConcurrentRequests;
  }

  /**
   * Queue a request for later execution
   */
  private queueRequest<T>(config: RequestConfig): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id: this.generateRequestId(),
        config,
        resolve,
        reject,
        retryCount: 0,
        timestamp: Date.now(),
        priority: this.priorities[config.priority || 'normal']
      };
      
      // Add to queue sorted by priority
      this.requestQueue.push(request);
      this.requestQueue.sort((a, b) => {
        // Higher priority first
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        // Earlier timestamp first for same priority
        return a.timestamp - b.timestamp;
      });
      
      // Process queue if not already processing
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process queued requests
   */
  private async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    while (this.requestQueue.length > 0) {
      // Check if we can process more requests
      if (this.activeRequests.size >= this.maxConcurrentRequests) {
        // Wait a bit before checking again
        await this.delay(100);
        continue;
      }
      
      // Get next request from queue
      const request = this.requestQueue.shift();
      if (!request) continue;
      
      // Check if request has expired (older than 1 minute)
      if (Date.now() - request.timestamp > 60000) {
        request.reject(new Error('Request expired in queue'));
        continue;
      }
      
      // Execute the request
      try {
        const result = await this.executeRequest(request.config, request.retryCount);
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
    }
    
    this.isProcessing = false;
  }

  /**
   * Execute a request with retry logic
   */
  private async executeRequest<T>(
    config: RequestConfig,
    retryCount = 0
  ): Promise<T> {
    const requestId = this.generateRequestId();
    const abortController = new AbortController();
    this.activeRequests.set(requestId, abortController);
    
    try {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, config.timeout || this.defaultTimeout);
      
      // Make the request
      const response = await fetch(config.url, {
        method: config.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers
        },
        body: config.body ? JSON.stringify(config.body) : undefined,
        signal: abortController.signal
      });
      
      clearTimeout(timeoutId);
      
      // Update rate limit info from headers
      this.updateRateLimitInfo(config.url, response);
      
      // Handle rate limit response
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
        const errorData = await response.json().catch(() => ({}));
        
        // Show user-friendly message
        if (retryCount === 0) {
          toast.error(
            errorData.message || `Rate limited. Please wait ${retryAfter} seconds.`,
            { duration: 5000 }
          );
        }
        
        // Retry if within retry limit
        if (retryCount < (config.maxRetries || this.maxRetries)) {
          await this.delay(retryAfter * 1000);
          return this.executeRequest(config, retryCount + 1);
        }
        
        throw new Error(errorData.message || 'Rate limit exceeded');
      }
      
      // Handle other error responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Retry on 5xx errors
        if (response.status >= 500 && retryCount < (config.maxRetries || this.maxRetries)) {
          const delay = this.calculateRetryDelay(retryCount);
          console.log(`Retrying request after ${delay}ms (attempt ${retryCount + 1})`);
          await this.delay(delay);
          return this.executeRequest(config, retryCount + 1);
        }
        
        throw new Error(errorData.message || `Request failed: ${response.statusText}`);
      }
      
      // Parse and return response
      const data = await response.json();
      return data as T;
      
    } catch (error: any) {
      // Handle abort errors
      if (error.name === 'AbortError') {
        // Retry on timeout if within retry limit
        if (retryCount < (config.maxRetries || this.maxRetries)) {
          const delay = this.calculateRetryDelay(retryCount);
          console.log(`Request timed out, retrying after ${delay}ms`);
          await this.delay(delay);
          return this.executeRequest(config, retryCount + 1);
        }
        throw new Error('Request timed out');
      }
      
      // Handle network errors
      if (error.message === 'Failed to fetch' || error.message.includes('NetworkError')) {
        // Retry on network errors
        if (retryCount < (config.maxRetries || this.maxRetries)) {
          const delay = this.calculateRetryDelay(retryCount);
          console.log(`Network error, retrying after ${delay}ms`);
          await this.delay(delay);
          return this.executeRequest(config, retryCount + 1);
        }
        throw new Error('Network error. Please check your connection.');
      }
      
      throw error;
      
    } finally {
      this.activeRequests.delete(requestId);
    }
  }

  /**
   * Update rate limit info from response headers
   */
  private updateRateLimitInfo(url: string, response: Response) {
    const endpoint = this.getEndpointFromUrl(url);
    const remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '100');
    const limit = parseInt(response.headers.get('X-RateLimit-Limit') || '100');
    const reset = response.headers.get('X-RateLimit-Reset');
    
    this.rateLimitInfo.set(endpoint, {
      endpoint,
      remaining,
      limit,
      resetTime: reset ? new Date(reset).getTime() : Date.now() + 60000
    });
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(retryCount: number): number {
    // Exponential backoff with jitter
    const baseDelay = this.baseRetryDelay * Math.pow(2, retryCount);
    const jitter = Math.random() * 1000; // Up to 1 second of jitter
    return Math.min(baseDelay + jitter, 30000); // Max 30 seconds
  }

  /**
   * Get endpoint from URL for rate limiting
   */
  private getEndpointFromUrl(url: string): string {
    try {
      const urlObj = new URL(url, window.location.origin);
      // Extract path without query params
      return urlObj.pathname;
    } catch {
      return url;
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cancel all active requests
   */
  cancelAllRequests() {
    for (const [id, controller] of this.activeRequests) {
      controller.abort();
      this.activeRequests.delete(id);
    }
  }

  /**
   * Clear request queue
   */
  clearQueue() {
    this.requestQueue.forEach(request => {
      request.reject(new Error('Queue cleared'));
    });
    this.requestQueue = [];
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.requestQueue.length;
  }

  /**
   * Get rate limit info for an endpoint
   */
  getRateLimitInfo(endpoint: string): RateLimitInfo | undefined {
    return this.rateLimitInfo.get(endpoint);
  }

  /**
   * Check if we're currently rate limited for an endpoint
   */
  isRateLimited(endpoint: string): boolean {
    const info = this.rateLimitInfo.get(endpoint);
    if (!info) return false;
    
    const now = Date.now();
    return info.remaining <= 0 && now < info.resetTime;
  }
}

// Create singleton instance
const requestManager = new RequestManager();

// Export convenience functions
export const managedFetch = requestManager.request.bind(requestManager);
export const cancelAllRequests = requestManager.cancelAllRequests.bind(requestManager);
export const clearRequestQueue = requestManager.clearQueue.bind(requestManager);
export const getQueueSize = requestManager.getQueueSize.bind(requestManager);
export const isRateLimited = requestManager.isRateLimited.bind(requestManager);
export const getRateLimitInfo = requestManager.getRateLimitInfo.bind(requestManager);

export default requestManager;