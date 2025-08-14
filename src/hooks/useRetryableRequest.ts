/**
 * useRetryableRequest Hook
 * 
 * Provides automatic retry with exponential backoff,
 * offline queue management, and connection status monitoring
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  onRetry?: (attemptNumber: number) => void;
  onSuccess?: (data: any) => void;
  onFailure?: (error: Error) => void;
  enableOfflineQueue?: boolean;
}

interface QueuedRequest {
  id: string;
  request: () => Promise<any>;
  timestamp: Date;
  retryCount: number;
}

export function useRetryableRequest(defaultOptions: RetryOptions = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    enableOfflineQueue = true
  } = defaultOptions;

  // Connection status
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'connecting'>('online');
  
  // Request queue for offline mode
  const [requestQueue, setRequestQueue] = useState<QueuedRequest[]>([]);
  const processingQueue = useRef(false);
  
  // Retry state
  const [retryingRequests, setRetryingRequests] = useState<Set<string>>(new Set());
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  // Monitor connection status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setConnectionStatus('online');
      toast.success('Connection restored');
      processQueue(); // Process queued requests
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectionStatus('offline');
      toast.error('Connection lost - messages will be queued');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection periodically
    const interval = setInterval(() => {
      checkConnection();
    }, 30000); // Every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  /**
   * Check connection by pinging the server
   */
  const checkConnection = useCallback(async () => {
    try {
      const response = await fetch('/api/health', {
        method: 'HEAD',
        mode: 'no-cors'
      });
      
      if (!isOnline) {
        setIsOnline(true);
        setConnectionStatus('online');
        processQueue();
      }
    } catch (error) {
      if (isOnline) {
        setIsOnline(false);
        setConnectionStatus('offline');
      }
    }
  }, [isOnline]);

  /**
   * Execute request with retry logic
   */
  const executeWithRetry = useCallback(async <T,>(
    requestFn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> => {
    const opts = { ...defaultOptions, ...options };
    const requestId = `req-${Date.now()}-${Math.random()}`;
    
    // If offline and queue enabled, add to queue
    if (!isOnline && enableOfflineQueue) {
      return new Promise((resolve, reject) => {
        const queuedRequest: QueuedRequest = {
          id: requestId,
          request: async () => {
            try {
              const result = await requestFn();
              resolve(result);
              return result;
            } catch (error) {
              reject(error);
              throw error;
            }
          },
          timestamp: new Date(),
          retryCount: 0
        };
        
        setRequestQueue(prev => [...prev, queuedRequest]);
        toast.loading('Message queued - will send when connection is restored');
      });
    }

    // Create abort controller for this request
    const abortController = new AbortController();
    abortControllers.current.set(requestId, abortController);

    let lastError: Error = new Error('Unknown error');
    let delay = opts.initialDelay || initialDelay;

    // Add request to retrying set
    setRetryingRequests(prev => new Set(prev).add(requestId));

    try {
      for (let attempt = 0; attempt <= (opts.maxRetries || maxRetries); attempt++) {
        try {
          // Check if request was aborted
          if (abortController.signal.aborted) {
            throw new Error('Request aborted');
          }

          // Add slight jitter to prevent thundering herd
          const jitteredDelay = delay * (0.9 + Math.random() * 0.2);
          
          if (attempt > 0) {
            setConnectionStatus('connecting');
            console.log(`🔄 Retry attempt ${attempt} after ${Math.round(jitteredDelay)}ms`);
            
            if (opts.onRetry) {
              opts.onRetry(attempt);
            }
            
            // Show retry toast only for first retry
            if (attempt === 1) {
              toast.loading(`Retrying... (attempt ${attempt}/${opts.maxRetries || maxRetries})`);
            }
            
            await sleep(jitteredDelay);
          }

          // Execute the request
          const result = await requestFn();
          
          // Success!
          setConnectionStatus('online');
          if (opts.onSuccess) {
            opts.onSuccess(result);
          }
          
          // Clear any retry toasts
          if (attempt > 0) {
            toast.success('Request succeeded');
          }
          
          return result;
          
        } catch (error: any) {
          lastError = error;
          
          // Don't retry on certain errors
          if (shouldNotRetry(error)) {
            throw error;
          }
          
          // Last attempt failed
          if (attempt === (opts.maxRetries || maxRetries)) {
            throw error;
          }
          
          // Calculate next delay with exponential backoff
          delay = Math.min(delay * (opts.backoffMultiplier || backoffMultiplier), opts.maxDelay || maxDelay);
        }
      }
      
      throw lastError;
      
    } catch (error: any) {
      console.error('❌ Request failed after all retries:', error);
      
      if (opts.onFailure) {
        opts.onFailure(error);
      }
      
      // If still offline, offer to queue
      if (!isOnline && enableOfflineQueue) {
        const shouldQueue = await confirmQueue();
        if (shouldQueue) {
          return executeWithRetry(requestFn, { ...opts, maxRetries: 0 });
        }
      }
      
      throw error;
      
    } finally {
      // Cleanup
      setRetryingRequests(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
      abortControllers.current.delete(requestId);
    }
  }, [isOnline, enableOfflineQueue, maxRetries, initialDelay, maxDelay, backoffMultiplier]);

  /**
   * Process queued requests
   */
  const processQueue = useCallback(async () => {
    if (processingQueue.current || requestQueue.length === 0) {
      return;
    }
    
    processingQueue.current = true;
    console.log(`📤 Processing ${requestQueue.length} queued requests`);
    
    const queue = [...requestQueue];
    setRequestQueue([]);
    
    for (const item of queue) {
      try {
        await item.request();
        toast.success('Queued message sent successfully');
      } catch (error) {
        console.error('Failed to process queued request:', error);
        
        // Re-queue if still offline
        if (!isOnline && item.retryCount < maxRetries) {
          setRequestQueue(prev => [...prev, { ...item, retryCount: item.retryCount + 1 }]);
        }
      }
    }
    
    processingQueue.current = false;
  }, [requestQueue, isOnline, maxRetries]);

  /**
   * Cancel a specific request
   */
  const cancelRequest = useCallback((requestId: string) => {
    const controller = abortControllers.current.get(requestId);
    if (controller) {
      controller.abort();
      abortControllers.current.delete(requestId);
    }
  }, []);

  /**
   * Cancel all pending requests
   */
  const cancelAllRequests = useCallback(() => {
    abortControllers.current.forEach(controller => controller.abort());
    abortControllers.current.clear();
    setRetryingRequests(new Set());
  }, []);

  /**
   * Clear the request queue
   */
  const clearQueue = useCallback(() => {
    setRequestQueue([]);
    toast.success('Request queue cleared');
  }, []);

  /**
   * Helper functions
   */
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  const shouldNotRetry = (error: any): boolean => {
    // Don't retry on client errors (4xx) except 429 (rate limit)
    if (error.status && error.status >= 400 && error.status < 500 && error.status !== 429) {
      return true;
    }
    
    // Don't retry on abort
    if (error.name === 'AbortError' || error.message === 'Request aborted') {
      return true;
    }
    
    return false;
  };
  
  const confirmQueue = async (): Promise<boolean> => {
    // In production, you might want to show a proper modal
    return true; // Auto-queue for now
  };

  return {
    // Main function
    executeWithRetry,
    
    // Connection status
    isOnline,
    connectionStatus,
    checkConnection,
    
    // Queue management
    requestQueue,
    processQueue,
    clearQueue,
    queueLength: requestQueue.length,
    
    // Request management
    retryingRequests: Array.from(retryingRequests),
    cancelRequest,
    cancelAllRequests,
    isRetrying: retryingRequests.size > 0
  };
}

export default useRetryableRequest;