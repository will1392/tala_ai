/**
 * CMO Cache Service
 * Implements caching strategies for CMO mode performance optimization
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
  hits: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache size in entries
  persist?: boolean; // Persist to localStorage
  compress?: boolean; // Compress data before storing
}

class CMOCacheService {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private cacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes
  private readonly maxCacheSize = 100;
  private readonly storagePrefix = 'cmo_cache_';

  constructor() {
    this.loadPersistedCache();
    this.startCleanupInterval();
  }

  /**
   * Set cache entry
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const ttl = options.ttl || this.defaultTTL;
    const entry: CacheEntry<T> = {
      data: options.compress ? this.compress(data) : data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl,
      hits: 0
    };

    // Check cache size and evict if necessary
    if (this.memoryCache.size >= (options.maxSize || this.maxCacheSize)) {
      this.evictLRU();
    }

    this.memoryCache.set(key, entry);

    // Persist to localStorage if requested
    if (options.persist) {
      this.persistEntry(key, entry);
    }
  }

  /**
   * Get cache entry
   */
  get<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);

    if (!entry) {
      this.cacheStats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiry) {
      this.memoryCache.delete(key);
      this.removePersistedEntry(key);
      this.cacheStats.misses++;
      return null;
    }

    // Update stats
    entry.hits++;
    this.cacheStats.hits++;

    return entry.data;
  }

  /**
   * Cache knowledge base queries
   */
  async cacheQuery<T>(
    queryKey: string,
    queryFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Check cache first
    const cached = this.get<T>(queryKey);
    if (cached !== null) {
      return cached;
    }

    // Execute query
    const result = await queryFn();

    // Cache result
    this.set(queryKey, result, {
      ttl: options.ttl || 10 * 60 * 1000, // 10 minutes for queries
      persist: options.persist !== false, // Persist by default
      ...options
    });

    return result;
  }

  /**
   * Cache tool preferences
   */
  setToolPreferences(userId: string, preferences: any): void {
    const key = `tool_prefs_${userId}`;
    this.set(key, preferences, {
      ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
      persist: true
    });
  }

  getToolPreferences(userId: string): any {
    return this.get(`tool_prefs_${userId}`);
  }

  /**
   * Cache recent actions
   */
  addRecentAction(userId: string, action: any): void {
    const key = `recent_actions_${userId}`;
    const actions = this.get<any[]>(key) || [];
    
    // Add new action and limit to last 50
    actions.unshift(action);
    if (actions.length > 50) {
      actions.pop();
    }

    this.set(key, actions, {
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
      persist: true
    });
  }

  getRecentActions(userId: string, limit: number = 10): any[] {
    const actions = this.get<any[]>(`recent_actions_${userId}`) || [];
    return actions.slice(0, limit);
  }

  /**
   * Implement offline capability
   */
  async withOfflineSupport<T>(
    key: string,
    onlineFn: () => Promise<T>,
    offlineFallback?: T
  ): Promise<T> {
    try {
      // Try online first
      const result = await onlineFn();
      
      // Cache for offline use
      this.set(key, result, {
        ttl: 24 * 60 * 60 * 1000, // 24 hours
        persist: true
      });
      
      return result;
    } catch (error) {
      // If offline, try cache
      const cached = this.get<T>(key);
      if (cached !== null) {
        console.log('Using offline cache for:', key);
        return cached;
      }
      
      // Use fallback if provided
      if (offlineFallback !== undefined) {
        return offlineFallback;
      }
      
      throw error;
    }
  }

  /**
   * Clear cache
   */
  clear(pattern?: string): void {
    if (pattern) {
      // Clear entries matching pattern
      const keysToDelete: string[] = [];
      this.memoryCache.forEach((_, key) => {
        if (key.includes(pattern)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => {
        this.memoryCache.delete(key);
        this.removePersistedEntry(key);
      });
    } else {
      // Clear all
      this.memoryCache.clear();
      this.clearPersistedCache();
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
    evictions: number;
  } {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = total > 0 ? (this.cacheStats.hits / total) * 100 : 0;

    return {
      size: this.memoryCache.size,
      ...this.cacheStats,
      hitRate: Math.round(hitRate)
    };
  }

  /**
   * Private methods
   */
  private evictLRU(): void {
    let lruKey = '';
    let lruHits = Infinity;
    let lruTimestamp = Infinity;

    // Find least recently used entry
    this.memoryCache.forEach((entry, key) => {
      if (entry.hits < lruHits || 
          (entry.hits === lruHits && entry.timestamp < lruTimestamp)) {
        lruKey = key;
        lruHits = entry.hits;
        lruTimestamp = entry.timestamp;
      }
    });

    if (lruKey) {
      this.memoryCache.delete(lruKey);
      this.removePersistedEntry(lruKey);
      this.cacheStats.evictions++;
    }
  }

  private compress(data: any): string {
    // Simple compression using JSON stringify
    // In production, use a proper compression library
    return JSON.stringify(data);
  }

  private decompress(data: string): any {
    return JSON.parse(data);
  }

  private persistEntry(key: string, entry: CacheEntry<any>): void {
    try {
      localStorage.setItem(
        this.storagePrefix + key,
        JSON.stringify(entry)
      );
    } catch (error) {
      console.error('Failed to persist cache entry:', error);
    }
  }

  private removePersistedEntry(key: string): void {
    try {
      localStorage.removeItem(this.storagePrefix + key);
    } catch (error) {
      console.error('Failed to remove persisted entry:', error);
    }
  }

  private loadPersistedCache(): void {
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.storagePrefix)
      );

      keys.forEach(storageKey => {
        const key = storageKey.replace(this.storagePrefix, '');
        const data = localStorage.getItem(storageKey);
        
        if (data) {
          try {
            const entry = JSON.parse(data) as CacheEntry<any>;
            
            // Only load if not expired
            if (Date.now() < entry.expiry) {
              this.memoryCache.set(key, entry);
            } else {
              localStorage.removeItem(storageKey);
            }
          } catch (error) {
            console.error('Failed to parse cached entry:', error);
            localStorage.removeItem(storageKey);
          }
        }
      });
    } catch (error) {
      console.error('Failed to load persisted cache:', error);
    }
  }

  private clearPersistedCache(): void {
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.storagePrefix)
      );
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Failed to clear persisted cache:', error);
    }
  }

  private startCleanupInterval(): void {
    // Clean up expired entries every minute
    setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];

      this.memoryCache.forEach((entry, key) => {
        if (now > entry.expiry) {
          keysToDelete.push(key);
        }
      });

      keysToDelete.forEach(key => {
        this.memoryCache.delete(key);
        this.removePersistedEntry(key);
      });
    }, 60 * 1000);
  }
}

// Create specialized cache instances
class QueryCache extends CMOCacheService {
  async fetchWithCache<T>(
    endpoint: string,
    options: RequestInit = {},
    cacheOptions: CacheOptions = {}
  ): Promise<T> {
    const cacheKey = `api_${endpoint}_${JSON.stringify(options)}`;
    
    return this.cacheQuery(cacheKey, async () => {
      const response = await fetch(endpoint, options);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      return response.json();
    }, cacheOptions);
  }
}

// Export singleton instances
export const cmoCache = new CMOCacheService();
export const queryCache = new QueryCache();

// Export types
export type { CacheEntry, CacheOptions };