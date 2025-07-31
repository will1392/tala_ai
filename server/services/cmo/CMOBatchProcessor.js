/**
 * CMO Batch Processor
 * 
 * Handles batch operations for improved performance
 */

import { performanceConfig } from '../../config/performance.js';

export class CMOBatchProcessor {
  constructor() {
    this.queues = {
      embeddings: [],
      searches: [],
      updates: []
    };
    
    this.processing = {
      embeddings: false,
      searches: false,
      updates: false
    };
    
    this.callbacks = new Map();
    
    // Start batch processing intervals
    if (performanceConfig.responseGeneration.parallelRetrieval) {
      this.startBatchProcessing();
    }
  }

  /**
   * Start batch processing intervals
   */
  startBatchProcessing() {
    // Process embedding batches every 100ms
    setInterval(() => this.processBatchEmbeddings(), 100);
    
    // Process search batches every 50ms
    setInterval(() => this.processBatchSearches(), 50);
    
    // Process update batches every second
    setInterval(() => this.processBatchUpdates(), 
      performanceConfig.modeContext.batchInterval);
  }

  /**
   * Add embedding request to batch
   */
  async batchEmbedding(text, callback) {
    return new Promise((resolve, reject) => {
      const id = Date.now() + Math.random();
      
      this.queues.embeddings.push({
        id,
        text,
        timestamp: Date.now()
      });
      
      this.callbacks.set(id, { resolve, reject });
    });
  }

  /**
   * Add search request to batch
   */
  async batchSearch(params, callback) {
    return new Promise((resolve, reject) => {
      const id = Date.now() + Math.random();
      
      this.queues.searches.push({
        id,
        params,
        timestamp: Date.now()
      });
      
      this.callbacks.set(id, { resolve, reject });
    });
  }

  /**
   * Add update request to batch
   */
  batchUpdate(type, data) {
    this.queues.updates.push({
      type,
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Process batch embeddings
   */
  async processBatchEmbeddings() {
    if (this.processing.embeddings || this.queues.embeddings.length === 0) {
      return;
    }
    
    this.processing.embeddings = true;
    
    try {
      // Get batch (up to configured size)
      const batch = this.queues.embeddings.splice(
        0, 
        performanceConfig.knowledgeLoading.batchSize
      );
      
      if (batch.length === 0) {
        return;
      }
      
      // Generate embeddings in parallel
      const texts = batch.map(item => item.text);
      const embeddings = await this.generateBatchEmbeddings(texts);
      
      // Resolve callbacks
      batch.forEach((item, index) => {
        const callback = this.callbacks.get(item.id);
        if (callback) {
          callback.resolve(embeddings[index]);
          this.callbacks.delete(item.id);
        }
      });
      
    } catch (error) {
      console.error('Batch embedding error:', error);
      
      // Reject all callbacks in batch
      batch.forEach(item => {
        const callback = this.callbacks.get(item.id);
        if (callback) {
          callback.reject(error);
          this.callbacks.delete(item.id);
        }
      });
    } finally {
      this.processing.embeddings = false;
    }
  }

  /**
   * Process batch searches
   */
  async processBatchSearches() {
    if (this.processing.searches || this.queues.searches.length === 0) {
      return;
    }
    
    this.processing.searches = true;
    
    try {
      // Get batch (up to max parallel queries)
      const batch = this.queues.searches.splice(
        0, 
        performanceConfig.responseGeneration.maxParallelQueries
      );
      
      if (batch.length === 0) {
        return;
      }
      
      // Execute searches in parallel
      const searchPromises = batch.map(item => 
        this.executeSearch(item.params)
      );
      
      const results = await Promise.all(searchPromises);
      
      // Resolve callbacks
      batch.forEach((item, index) => {
        const callback = this.callbacks.get(item.id);
        if (callback) {
          callback.resolve(results[index]);
          this.callbacks.delete(item.id);
        }
      });
      
    } catch (error) {
      console.error('Batch search error:', error);
      
      // Reject all callbacks in batch
      batch.forEach(item => {
        const callback = this.callbacks.get(item.id);
        if (callback) {
          callback.reject(error);
          this.callbacks.delete(item.id);
        }
      });
    } finally {
      this.processing.searches = false;
    }
  }

  /**
   * Process batch updates
   */
  async processBatchUpdates() {
    if (this.processing.updates || this.queues.updates.length === 0) {
      return;
    }
    
    this.processing.updates = true;
    
    try {
      // Get all pending updates
      const updates = [...this.queues.updates];
      this.queues.updates = [];
      
      // Group updates by type
      const grouped = updates.reduce((acc, update) => {
        if (!acc[update.type]) {
          acc[update.type] = [];
        }
        acc[update.type].push(update.data);
        return acc;
      }, {});
      
      // Process each type
      for (const [type, data] of Object.entries(grouped)) {
        await this.executeBatchUpdate(type, data);
      }
      
    } catch (error) {
      console.error('Batch update error:', error);
    } finally {
      this.processing.updates = false;
    }
  }

  /**
   * Generate batch embeddings (to be implemented with actual service)
   */
  async generateBatchEmbeddings(texts) {
    // This would call OpenAI's batch embedding API
    // For now, return mock embeddings
    return texts.map(() => new Array(1536).fill(0.1));
  }

  /**
   * Execute search (to be implemented with actual service)
   */
  async executeSearch(params) {
    // This would execute the actual search
    // For now, return mock results
    return [];
  }

  /**
   * Execute batch update (to be implemented with actual service)
   */
  async executeBatchUpdate(type, data) {
    // This would execute the actual batch update
    console.log(`Batch updating ${data.length} ${type} items`);
  }

  /**
   * Get queue statistics
   */
  getStats() {
    return {
      queues: {
        embeddings: this.queues.embeddings.length,
        searches: this.queues.searches.length,
        updates: this.queues.updates.length
      },
      processing: this.processing,
      pendingCallbacks: this.callbacks.size
    };
  }
}

// Export singleton instance
export const cmoBatchProcessor = new CMOBatchProcessor();