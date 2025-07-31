/**
 * Context Detection Optimizer
 * 
 * Provides caching, pattern optimization, and performance improvements
 */

import { contextDebugger } from './ContextDebugger.js';

// Simple LRU Cache implementation
class SimpleLRUCache {
  constructor(maxSize = 1000, ttl = 300000) { // 5 min default TTL
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.cache = new Map();
    this.timestamps = new Map();
  }
  
  get(key) {
    const timestamp = this.timestamps.get(key);
    if (timestamp && Date.now() - timestamp > this.ttl) {
      this.cache.delete(key);
      this.timestamps.delete(key);
      return undefined;
    }
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
      this.timestamps.set(key, Date.now());
    }
    return value;
  }
  
  set(key, value) {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      // Remove oldest
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      this.timestamps.delete(firstKey);
    }
    this.cache.delete(key); // Remove if exists to add at end
    this.cache.set(key, value);
    this.timestamps.set(key, Date.now());
  }
  
  has(key) {
    return this.get(key) !== undefined;
  }
  
  clear() {
    this.cache.clear();
    this.timestamps.clear();
  }
  
  get size() {
    return this.cache.size;
  }
}

class ContextOptimizer {
  constructor() {
    // Initialize simple LRU cache for detection results
    this.detectionCache = new SimpleLRUCache(1000, 1000 * 60 * 5); // 5 minute TTL
    
    // Cache for compiled regex patterns
    this.regexCache = new Map();
    
    // Common patterns cache
    this.commonPatternsCache = new Map([
      // Pre-cache very common queries
      ['improve seo', { context: 'seo', intent: 'optimize', confidence: 0.9 }],
      ['email marketing', { context: 'email', intent: 'general', confidence: 0.95 }],
      ['social media strategy', { context: 'social', intent: 'plan', confidence: 0.9 }],
      ['google ads', { context: 'ads', intent: 'general', confidence: 0.95 }],
      ['direct mail campaign', { context: 'directMail', intent: 'create', confidence: 0.9 }]
    ]);
    
    // Ambiguous query handlers
    this.ambiguousHandlers = {
      'traffic': this.handleTrafficQuery.bind(this),
      'conversion': this.handleConversionQuery.bind(this),
      'campaign': this.handleCampaignQuery.bind(this),
      'performance': this.handlePerformanceQuery.bind(this),
      'leads': this.handleLeadsQuery.bind(this)
    };
    
    // Performance metrics
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      optimizedQueries: 0
    };
  }
  
  /**
   * Get cached detection result
   */
  getCachedResult(query) {
    const normalizedQuery = this.normalizeQuery(query);
    const cached = this.detectionCache.get(normalizedQuery);
    
    if (cached) {
      this.metrics.cacheHits++;
      contextDebugger.logCacheAccess(query, true);
      return cached;
    }
    
    this.metrics.cacheMisses++;
    contextDebugger.logCacheAccess(query, false);
    return null;
  }
  
  /**
   * Cache detection result
   */
  cacheResult(query, result) {
    const normalizedQuery = this.normalizeQuery(query);
    this.detectionCache.set(normalizedQuery, result);
  }
  
  /**
   * Normalize query for caching
   */
  normalizeQuery(query) {
    return query
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '');
  }
  
  /**
   * Optimize pattern matching
   */
  getOptimizedRegex(pattern) {
    if (!this.regexCache.has(pattern)) {
      // Create optimized regex with word boundaries
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      this.regexCache.set(pattern, regex);
    }
    return this.regexCache.get(pattern);
  }
  
  /**
   * Fast keyword matching using optimized patterns
   */
  matchKeywords(text, keywords) {
    const matches = [];
    const lowerText = text.toLowerCase();
    
    for (const keyword of keywords) {
      // Use simple indexOf for short keywords
      if (keyword.length <= 5) {
        if (lowerText.includes(keyword.toLowerCase())) {
          matches.push(keyword);
        }
      } else {
        // Use regex for longer keywords
        const regex = this.getOptimizedRegex(keyword);
        if (regex.test(text)) {
          matches.push(keyword);
        }
      }
    }
    
    return matches;
  }
  
  /**
   * Handle ambiguous traffic query
   */
  handleTrafficQuery(query, tokens) {
    const contexts = [];
    
    // Check for modifiers
    if (query.match(/organic|search|seo/i)) {
      contexts.push({ context: 'seo', confidence: 0.8 });
    }
    if (query.match(/paid|ads|ppc|adwords/i)) {
      contexts.push({ context: 'ads', confidence: 0.8 });
    }
    if (query.match(/social|facebook|instagram|twitter/i)) {
      contexts.push({ context: 'social', confidence: 0.7 });
    }
    if (query.match(/email|newsletter/i)) {
      contexts.push({ context: 'email', confidence: 0.6 });
    }
    
    // Default to SEO if no modifiers
    if (contexts.length === 0) {
      contexts.push({ context: 'seo', confidence: 0.5 });
      contexts.push({ context: 'ads', confidence: 0.4 });
    }
    
    return contexts.sort((a, b) => b.confidence - a.confidence);
  }
  
  /**
   * Handle ambiguous conversion query
   */
  handleConversionQuery(query, tokens) {
    const contexts = [];
    
    if (query.match(/landing|page|website/i)) {
      contexts.push({ context: 'seo', confidence: 0.7 });
    }
    if (query.match(/email|subscriber|list/i)) {
      contexts.push({ context: 'email', confidence: 0.8 });
    }
    if (query.match(/ad|campaign|click/i)) {
      contexts.push({ context: 'ads', confidence: 0.8 });
    }
    
    // Default to general conversion optimization
    if (contexts.length === 0) {
      contexts.push({ context: 'seo', confidence: 0.5 });
      contexts.push({ context: 'email', confidence: 0.4 });
      contexts.push({ context: 'ads', confidence: 0.4 });
    }
    
    return contexts.sort((a, b) => b.confidence - a.confidence);
  }
  
  /**
   * Handle ambiguous campaign query
   */
  handleCampaignQuery(query, tokens) {
    const contexts = [];
    
    if (query.match(/email|newsletter|drip/i)) {
      contexts.push({ context: 'email', confidence: 0.9 });
    }
    if (query.match(/google|search|ppc/i)) {
      contexts.push({ context: 'ads', confidence: 0.9 });
    }
    if (query.match(/social|facebook|instagram/i)) {
      contexts.push({ context: 'social', confidence: 0.9 });
    }
    if (query.match(/mail|postcard|flyer/i)) {
      contexts.push({ context: 'directMail', confidence: 0.9 });
    }
    
    // If no specific type mentioned, return all possibilities
    if (contexts.length === 0) {
      contexts.push({ context: 'email', confidence: 0.4 });
      contexts.push({ context: 'ads', confidence: 0.4 });
      contexts.push({ context: 'social', confidence: 0.3 });
      contexts.push({ context: 'directMail', confidence: 0.3 });
    }
    
    return contexts.sort((a, b) => b.confidence - a.confidence);
  }
  
  /**
   * Handle ambiguous performance query
   */
  handlePerformanceQuery(query, tokens) {
    const contexts = [];
    
    if (query.match(/rank|position|visibility/i)) {
      contexts.push({ context: 'seo', confidence: 0.8 });
    }
    if (query.match(/open|click|unsubscribe/i)) {
      contexts.push({ context: 'email', confidence: 0.8 });
    }
    if (query.match(/cpc|ctr|quality score/i)) {
      contexts.push({ context: 'ads', confidence: 0.8 });
    }
    if (query.match(/engagement|reach|follower/i)) {
      contexts.push({ context: 'social', confidence: 0.8 });
    }
    
    // Default to asking for clarification
    if (contexts.length === 0) {
      return null; // Signal that clarification is needed
    }
    
    return contexts.sort((a, b) => b.confidence - a.confidence);
  }
  
  /**
   * Handle ambiguous leads query
   */
  handleLeadsQuery(query, tokens) {
    const contexts = [];
    
    // Lead generation can happen across all channels
    contexts.push({ context: 'seo', confidence: 0.6 });
    contexts.push({ context: 'email', confidence: 0.5 });
    contexts.push({ context: 'ads', confidence: 0.7 });
    contexts.push({ context: 'social', confidence: 0.5 });
    
    // Look for channel hints
    if (query.match(/organic|search/i)) {
      contexts.find(c => c.context === 'seo').confidence = 0.9;
    }
    if (query.match(/paid|advertising/i)) {
      contexts.find(c => c.context === 'ads').confidence = 0.9;
    }
    
    return contexts.sort((a, b) => b.confidence - a.confidence);
  }
  
  /**
   * Process ambiguous query
   */
  processAmbiguousQuery(query, tokens) {
    // Check each ambiguous handler
    for (const [keyword, handler] of Object.entries(this.ambiguousHandlers)) {
      if (query.toLowerCase().includes(keyword)) {
        const contexts = handler(query, tokens);
        if (contexts) {
          return {
            isAmbiguous: true,
            contexts,
            suggestedClarification: this.generateClarification(keyword, contexts)
          };
        }
      }
    }
    
    return null;
  }
  
  /**
   * Generate clarification question
   */
  generateClarification(keyword, contexts) {
    const topContexts = contexts.slice(0, 3).map(c => c.context);
    
    const clarifications = {
      'traffic': `Are you interested in ${topContexts.join(', ')} traffic?`,
      'conversion': `Which type of conversions: ${topContexts.join(', ')}?`,
      'campaign': `What type of campaign: ${topContexts.join(', ')}?`,
      'performance': `Which channel's performance: ${topContexts.join(', ')}?`,
      'leads': `How would you like to generate leads: ${topContexts.join(', ')}?`
    };
    
    return clarifications[keyword] || 'Could you be more specific about which marketing channel?';
  }
  
  /**
   * Optimize detection with early exit
   */
  quickDetect(query) {
    const lowerQuery = query.toLowerCase();
    
    // Quick channel detection for obvious queries
    const quickPatterns = [
      { pattern: /\b(seo|search engine|google rank|serp)\b/i, context: 'seo' },
      { pattern: /\b(email|newsletter|mailchimp|campaign monitor)\b/i, context: 'email' },
      { pattern: /\b(social media|facebook|instagram|twitter|linkedin)\b/i, context: 'social' },
      { pattern: /\b(direct mail|postcard|flyer|usps)\b/i, context: 'directMail' },
      { pattern: /\b(google ads|ppc|adwords|paid search)\b/i, context: 'ads' }
    ];
    
    for (const { pattern, context } of quickPatterns) {
      if (pattern.test(lowerQuery)) {
        this.metrics.optimizedQueries++;
        return {
          context,
          confidence: 0.9,
          method: 'quick_detect'
        };
      }
    }
    
    return null;
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.detectionCache.size,
      cacheHitRate: (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100).toFixed(1),
      optimizedQueries: this.metrics.optimizedQueries,
      regexCacheSize: this.regexCache.size
    };
  }
  
  /**
   * Clear caches
   */
  clearCaches() {
    this.detectionCache.clear();
    this.regexCache.clear();
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      optimizedQueries: 0
    };
  }
  
  /**
   * Warm up cache with common queries
   */
  warmUpCache(queries) {
    queries.forEach(query => {
      if (!this.detectionCache.has(this.normalizeQuery(query))) {
        // Cache would be populated by actual detection
        this.commonPatternsCache.set(this.normalizeQuery(query), true);
      }
    });
  }
}

// Export singleton instance
export const contextOptimizer = new ContextOptimizer();
export default ContextOptimizer;