/**
 * MemoryIndexer - Vector Embedding and Storage for Context Memories
 * 
 * Creates embeddings for memories, stores them in Qdrant vector database,
 * and provides similarity search capabilities for memory retrieval.
 */

import { QdrantClient } from '@qdrant/qdrant-js';
import OpenAI from 'openai';
import crypto from 'crypto';
import contextConfig from '../../config/context.js';

export class MemoryIndexer {
  constructor(options = {}) {
    this.options = {
      enableVectorStorage: options.enableVectorStorage !== false,
      enableBatchProcessing: options.enableBatchProcessing !== false,
      batchSize: options.batchSize || 50,
      retryAttempts: options.retryAttempts || 3,
      ...options
    };
    
    // Initialize Qdrant client
    this.qdrant = new QdrantClient({
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY
    });
    
    // Initialize OpenAI for embeddings
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.config = contextConfig;
    this.initialized = false;
    
    // Collection names
    this.collections = {
      memories: this.config.EMBEDDING_CONFIG.COLLECTIONS.memories,
      entities: this.config.EMBEDDING_CONFIG.COLLECTIONS.entities,
      contexts: this.config.EMBEDDING_CONFIG.COLLECTIONS.contexts
    };
    
    // Cache for embeddings and search results
    this.embeddingCache = new Map();
    this.searchCache = new Map();
    
    // Batch processing queue
    this.embeddingQueue = [];
    this.processingBatch = false;
  }

  /**
   * Initialize the memory indexer
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      console.log('🔢 Initializing MemoryIndexer...');
      
      // Test Qdrant connection
      await this.testQdrantConnection();
      
      // Create collections if they don't exist
      await this.ensureCollections();
      
      // Test OpenAI embeddings
      await this.testEmbeddingService();
      
      this.initialized = true;
      console.log('✅ MemoryIndexer initialized successfully');
      
    } catch (error) {
      console.error('❌ MemoryIndexer initialization failed:', error);
      
      // Disable vector storage if initialization fails
      this.options.enableVectorStorage = false;
      console.warn('⚠️ Vector storage disabled due to initialization failure');
      
      this.initialized = true; // Allow operation without vector storage
    }
  }

  /**
   * Create embedding for memory content and store in vector database
   * @param {string} content - Memory content to embed
   * @param {Object} metadata - Additional metadata for the memory
   * @returns {Object} Result with embedding ID and success status
   */
  async createEmbedding(content, metadata = {}) {
    try {
      this.ensureInitialized();
      
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        throw new Error('Content is required for embedding creation');
      }
      
      // Check cache first
      const cacheKey = this.generateEmbeddingCacheKey(content);
      if (this.embeddingCache.has(cacheKey)) {
        const cached = this.embeddingCache.get(cacheKey);
        return {
          success: true,
          embeddingId: cached.embeddingId,
          cached: true
        };
      }
      
      // Generate embedding using OpenAI
      const embeddingVector = await this.generateEmbedding(content);
      
      if (!embeddingVector) {
        throw new Error('Failed to generate embedding vector');
      }
      
      // Store in vector database if enabled
      let embeddingId = null;
      if (this.options.enableVectorStorage) {
        embeddingId = await this.storeInVectorDB(embeddingVector, content, metadata);
      } else {
        embeddingId = crypto.randomUUID();
      }
      
      // Cache the result
      this.embeddingCache.set(cacheKey, {
        embeddingId,
        vector: embeddingVector,
        content,
        metadata
      });
      
      return {
        success: true,
        embeddingId,
        vectorDimensions: embeddingVector.length
      };
      
    } catch (error) {
      console.error('Error creating embedding:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Search for similar memories using vector similarity
   * @param {string} query - Query text to find similar memories
   * @param {Object} options - Search options
   * @returns {Object} Search results with similar memories
   */
  async searchSimilar(query, options = {}) {
    try {
      this.ensureInitialized();
      
      const searchOptions = {
        limit: options.limit || this.config.EMBEDDING_CONFIG.SIMILARITY_SEARCH.default_limit,
        threshold: options.threshold || this.config.EMBEDDING_CONFIG.SIMILARITY_SEARCH.min_similarity_threshold,
        userId: options.userId,
        memoryTypes: options.memoryTypes,
        dateRange: options.dateRange,
        ...options
      };
      
      // Check cache first
      const cacheKey = this.generateSearchCacheKey(query, searchOptions);
      if (this.searchCache.has(cacheKey)) {
        return this.searchCache.get(cacheKey);
      }
      
      // Generate query embedding
      const queryVector = await this.generateEmbedding(query);
      if (!queryVector) {
        throw new Error('Failed to generate query embedding');
      }
      
      // Search in vector database
      const searchResults = await this.performVectorSearch(queryVector, searchOptions);
      
      // Cache results
      this.searchCache.set(cacheKey, searchResults);
      
      return searchResults;
      
    } catch (error) {
      console.error('Error searching similar memories:', error);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }

  /**
   * Batch process multiple embeddings for efficiency
   * @param {Array} items - Array of items to process
   * @returns {Array} Results for each item
   */
  async batchCreateEmbeddings(items) {
    try {
      this.ensureInitialized();
      
      if (!Array.isArray(items) || items.length === 0) {
        return [];
      }
      
      console.log(`📦 Batch processing ${items.length} embeddings...`);
      
      const results = [];
      const batchSize = this.options.batchSize;
      
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(item => this.createEmbedding(item.content, item.metadata))
        );
        results.push(...batchResults);
        
        // Small delay between batches to avoid rate limiting
        if (i + batchSize < items.length) {
          await this.delay(100);
        }
      }
      
      console.log(`✅ Batch processed ${results.length} embeddings`);
      return results;
      
    } catch (error) {
      console.error('Error in batch embedding creation:', error);
      return [];
    }
  }

  /**
   * Update an existing embedding
   * @param {string} embeddingId - ID of the embedding to update
   * @param {string} content - New content
   * @param {Object} metadata - Updated metadata
   * @returns {Object} Update result
   */
  async updateEmbedding(embeddingId, content, metadata = {}) {
    try {
      this.ensureInitialized();
      
      if (!this.options.enableVectorStorage) {
        return { success: true, embeddingId };
      }
      
      // Generate new embedding
      const embeddingVector = await this.generateEmbedding(content);
      if (!embeddingVector) {
        throw new Error('Failed to generate embedding vector');
      }
      
      // Update in vector database
      await this.qdrant.upsert(this.collections.memories, {
        wait: true,
        points: [{
          id: embeddingId,
          vector: embeddingVector,
          payload: {
            content,
            ...metadata,
            updated_at: new Date().toISOString()
          }
        }]
      });
      
      // Clear caches
      this.embeddingCache.clear();
      this.searchCache.clear();
      
      return {
        success: true,
        embeddingId
      };
      
    } catch (error) {
      console.error('Error updating embedding:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete an embedding from the vector database
   * @param {string} embeddingId - ID of the embedding to delete
   * @returns {Object} Deletion result
   */
  async deleteEmbedding(embeddingId) {
    try {
      this.ensureInitialized();
      
      if (!this.options.enableVectorStorage) {
        return { success: true };
      }
      
      await this.qdrant.delete(this.collections.memories, {
        wait: true,
        points: [embeddingId]
      });
      
      // Clear caches
      this.embeddingCache.clear();
      this.searchCache.clear();
      
      return { success: true };
      
    } catch (error) {
      console.error('Error deleting embedding:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get collection statistics
   * @returns {Object} Collection statistics
   */
  async getStatistics() {
    try {
      this.ensureInitialized();
      
      if (!this.options.enableVectorStorage) {
        return {
          totalMemories: this.embeddingCache.size,
          vectorStorage: false
        };
      }
      
      const memoriesInfo = await this.qdrant.getCollection(this.collections.memories);
      
      return {
        totalMemories: memoriesInfo.points_count || 0,
        vectorStorage: true,
        dimensions: memoriesInfo.config?.params?.vectors?.size || this.config.EMBEDDING_CONFIG.VECTOR_DIMENSIONS,
        distance: memoriesInfo.config?.params?.vectors?.distance || this.config.EMBEDDING_CONFIG.DISTANCE_METRIC
      };
      
    } catch (error) {
      console.error('Error getting statistics:', error);
      return {
        totalMemories: 0,
        vectorStorage: false,
        error: error.message
      };
    }
  }

  // Private methods

  async testQdrantConnection() {
    try {
      await this.qdrant.getCollections();
      console.log('✅ Qdrant connection successful');
    } catch (error) {
      throw new Error(`Qdrant connection failed: ${error.message}`);
    }
  }

  async testEmbeddingService() {
    try {
      await this.generateEmbedding('test');
      console.log('✅ OpenAI embeddings service working');
    } catch (error) {
      if (error.message.includes('quota')) {
        console.warn('⚠️ OpenAI quota exceeded, embeddings may be limited');
      } else {
        throw new Error(`OpenAI embeddings test failed: ${error.message}`);
      }
    }
  }

  async ensureCollections() {
    const collections = [
      this.collections.memories,
      this.collections.entities,
      this.collections.contexts
    ];
    
    for (const collectionName of collections) {
      try {
        await this.qdrant.getCollection(collectionName);
        console.log(`✅ Collection ${collectionName} exists`);
      } catch (error) {
        if (error.message?.includes('Not found') || error.message?.includes("doesn't exist") || error.status === 404) {
          console.log(`🔨 Creating collection ${collectionName}...`);
          try {
            await this.createCollection(collectionName);
          } catch (createError) {
            console.warn(`⚠️ Could not create collection ${collectionName}:`, createError.message);
            // Continue without this collection
          }
        } else {
          console.warn(`⚠️ Collection check failed for ${collectionName}:`, error.message);
          // Continue without throwing
        }
      }
    }
  }

  async createCollection(collectionName) {
    await this.qdrant.createCollection(collectionName, {
      vectors: {
        size: this.config.EMBEDDING_CONFIG.VECTOR_DIMENSIONS,
        distance: this.config.EMBEDDING_CONFIG.DISTANCE_METRIC === 'cosine' ? 'Cosine' : 'Dot'
      },
      optimizers_config: {
        default_segment_number: 2,
        max_segment_size: 20000,
        indexing_threshold: 10000
      },
      replication_factor: 1
    });
    
    console.log(`✅ Created collection ${collectionName}`);
  }

  async generateEmbedding(text) {
    try {
      const response = await this.openai.embeddings.create({
        model: this.config.EMBEDDING_CONFIG.MODEL.model_name,
        input: text,
        encoding_format: 'float'
      });
      
      return response.data[0]?.embedding || null;
      
    } catch (error) {
      console.error('Error generating embedding:', error);
      return null;
    }
  }

  async storeInVectorDB(vector, content, metadata) {
    const embeddingId = crypto.randomUUID();
    
    await this.qdrant.upsert(this.collections.memories, {
      wait: true,
      points: [{
        id: embeddingId,
        vector: vector,
        payload: {
          content,
          created_at: new Date().toISOString(),
          ...metadata
        }
      }]
    });
    
    return embeddingId;
  }

  async performVectorSearch(queryVector, options) {
    try {
      if (!this.options.enableVectorStorage) {
        return {
          success: false,
          error: 'Vector storage disabled',
          results: []
        };
      }
      
      // Build search filters
      const filter = this.buildSearchFilter(options);
      
      const searchResult = await this.qdrant.search(this.collections.memories, {
        vector: queryVector,
        limit: options.limit,
        score_threshold: options.threshold,
        with_payload: true,
        filter: filter
      });
      
      const results = searchResult.map(result => ({
        id: result.id,
        score: result.score,
        content: result.payload.content,
        metadata: {
          userId: result.payload.userId,
          memoryType: result.payload.memoryType,
          conversationId: result.payload.conversationId,
          created_at: result.payload.created_at,
          memoryId: result.payload.memoryId
        }
      }));
      
      return {
        success: true,
        results,
        total: results.length
      };
      
    } catch (error) {
      console.error('Error performing vector search:', error);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }

  buildSearchFilter(options) {
    const conditions = [];
    
    if (options.userId) {
      conditions.push({
        key: 'userId',
        match: { value: options.userId }
      });
    }
    
    if (options.memoryTypes && options.memoryTypes.length > 0) {
      conditions.push({
        key: 'memoryType',
        match: { any: options.memoryTypes }
      });
    }
    
    if (options.dateRange) {
      const { from, to } = options.dateRange;
      if (from) {
        conditions.push({
          key: 'created_at',
          range: { gte: from }
        });
      }
      if (to) {
        conditions.push({
          key: 'created_at',
          range: { lte: to }
        });
      }
    }
    
    return conditions.length > 0 ? { must: conditions } : undefined;
  }

  generateEmbeddingCacheKey(content) {
    return `embed:${this.simpleHash(content)}`;
  }

  generateSearchCacheKey(query, options) {
    const optionsStr = JSON.stringify(options);
    return `search:${this.simpleHash(query + optionsStr)}`;
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString();
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('MemoryIndexer not initialized. Call initialize() first.');
    }
  }

  /**
   * Clear all caches
   */
  clearCaches() {
    this.embeddingCache.clear();
    this.searchCache.clear();
    console.log('🧹 Memory indexer caches cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      embeddingCacheSize: this.embeddingCache.size,
      searchCacheSize: this.searchCache.size,
      queueLength: this.embeddingQueue.length,
      processingBatch: this.processingBatch
    };
  }
}

export default MemoryIndexer;