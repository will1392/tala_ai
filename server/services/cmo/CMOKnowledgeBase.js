/**
 * CMOKnowledgeBase - Marketing knowledge management system
 * 
 * Manages marketing knowledge across SEO, Email, Social Media, Direct Mail, and Ads.
 * Integrates with vector database for semantic search and retrieval.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import { QdrantClient } from '@qdrant/js-client-rest';
import { cmoCache } from './CMOCache.js';
import { performanceConfig } from '../../config/performance.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CMOKnowledgeBase {
  constructor(options = {}) {
    this.basePath = options.basePath || path.join(__dirname, '../../knowledge/cmo');
    this.metadata = null;
    this.knowledge = new Map();
    this.initialized = false;
    
    // OpenAI for embeddings
    this.openai = options.openai || new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Qdrant client
    this.qdrant = options.qdrant || new QdrantClient({
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      apiKey: process.env.QDRANT_API_KEY
    });
    
    this.collectionName = 'cmo_knowledge';
    this.vectorDimension = 1536; // OpenAI embedding dimension
  }

  /**
   * Initialize the knowledge base
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      console.log('📚 Initializing CMO Knowledge Base...');
      
      // Load metadata
      await this.loadMetadata();
      
      // Create Qdrant collection if it doesn't exist
      await this.ensureCollection();
      
      // Load knowledge from files
      await this.loadKnowledge();
      
      // Index knowledge in vector DB
      await this.indexKnowledge();
      
      // Warm up cache if enabled
      if (performanceConfig.knowledgeCache.enabled) {
        await cmoCache.warmUp(this);
      }
      
      this.initialized = true;
      console.log('✅ CMO Knowledge Base initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize CMO Knowledge Base:', error);
      throw error;
    }
  }

  /**
   * Load metadata configuration
   */
  async loadMetadata() {
    try {
      const metadataPath = path.join(this.basePath, 'metadata.json');
      const content = await fs.readFile(metadataPath, 'utf-8');
      this.metadata = JSON.parse(content);
      console.log(`📋 Loaded metadata: ${this.metadata.name} v${this.metadata.version}`);
    } catch (error) {
      console.error('Failed to load metadata:', error);
      throw new Error('CMO metadata.json not found or invalid');
    }
  }

  /**
   * Ensure Qdrant collection exists
   */
  async ensureCollection() {
    try {
      const collections = await this.qdrant.getCollections();
      const exists = collections.collections.some(c => c.name === this.collectionName);
      
      if (!exists) {
        console.log(`🗄️ Creating Qdrant collection: ${this.collectionName}`);
        await this.qdrant.createCollection(this.collectionName, {
          vectors: {
            size: this.vectorDimension,
            distance: 'Cosine'
          },
          optimizers_config: {
            default_segment_number: 2
          },
          replication_factor: 1
        });
      } else {
        console.log(`✅ Qdrant collection exists: ${this.collectionName}`);
      }
    } catch (error) {
      console.error('Failed to ensure Qdrant collection:', error);
      throw error;
    }
  }

  /**
   * Load knowledge from category directories
   */
  async loadKnowledge() {
    console.log('📖 Loading marketing knowledge...');
    
    for (const [category, config] of Object.entries(this.metadata.categories)) {
      const categoryPath = path.join(this.basePath, category);
      
      try {
        // Check if directory exists
        await fs.access(categoryPath);
        
        // Load all JSON files in the category
        const files = await fs.readdir(categoryPath);
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        
        const categoryKnowledge = [];
        
        for (const file of jsonFiles) {
          try {
            const filePath = path.join(categoryPath, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(content);
            
            // Add category metadata to each item
            if (Array.isArray(data)) {
              data.forEach(item => {
                item._category = category;
                item._source = file;
              });
              categoryKnowledge.push(...data);
            } else {
              data._category = category;
              data._source = file;
              categoryKnowledge.push(data);
            }
          } catch (error) {
            console.warn(`⚠️ Failed to load ${category}/${file}:`, error.message);
          }
        }
        
        this.knowledge.set(category, categoryKnowledge);
        console.log(`✅ Loaded ${categoryKnowledge.length} items for ${category}`);
        
      } catch (error) {
        console.log(`📁 Creating empty ${category} directory`);
        await fs.mkdir(categoryPath, { recursive: true });
        this.knowledge.set(category, []);
      }
    }
  }

  /**
   * Index knowledge in vector database
   */
  async indexKnowledge() {
    console.log('🔍 Indexing knowledge in vector database...');
    
    let totalIndexed = 0;
    const batchSize = 100;
    
    for (const [category, items] of this.knowledge.entries()) {
      if (items.length === 0) continue;
      
      console.log(`📊 Indexing ${items.length} items from ${category}...`);
      
      // Process in batches
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const points = [];
        
        for (const item of batch) {
          try {
            // Create searchable text
            const searchText = this.createSearchableText(item);
            
            // Generate embedding
            const embedding = await this.generateEmbedding(searchText);
            
            // Create point for Qdrant
            points.push({
              id: this.generateId(category, item),
              vector: embedding,
              payload: {
                category,
                title: item.title || item.name || 'Untitled',
                content: item.content || item.description || '',
                type: item.type || 'general',
                topic: item.topic || null,
                metadata: item.metadata || {},
                source: item._source,
                searchText
              }
            });
          } catch (error) {
            console.warn(`⚠️ Failed to index item:`, error.message);
          }
        }
        
        // Upsert batch to Qdrant
        if (points.length > 0) {
          await this.qdrant.upsert(this.collectionName, {
            wait: true,
            points
          });
          totalIndexed += points.length;
        }
      }
    }
    
    console.log(`✅ Indexed ${totalIndexed} items total`);
  }

  /**
   * Create searchable text from knowledge item
   */
  createSearchableText(item) {
    const parts = [];
    
    if (item.title || item.name) parts.push(item.title || item.name);
    if (item.description) parts.push(item.description);
    if (item.content) parts.push(item.content);
    if (item.keywords) parts.push(item.keywords.join(' '));
    if (item.examples) parts.push('Examples: ' + item.examples.join(' '));
    
    return parts.join(' ').substring(0, 8000); // Limit length
  }

  /**
   * Generate embedding for text
   */
  async generateEmbedding(text) {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      throw error;
    }
  }

  /**
   * Generate unique ID for knowledge item
   */
  generateId(category, item) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const title = (item.title || item.name || 'item').replace(/\s+/g, '-').substring(0, 20);
    return `${category}-${title}-${timestamp}-${random}`;
  }

  /**
   * Search marketing knowledge with caching
   */
  async search(query, options = {}) {
    const {
      category = null,
      limit = 5,
      minScore = 0.7
    } = options;
    
    // Check cache first
    if (performanceConfig.queryCache.enabled) {
      const cached = cmoCache.getQuery(query, options);
      if (cached) {
        return cached;
      }
    }
    
    try {
      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Check vector cache
      if (performanceConfig.vectorSearch.cacheResults) {
        const cachedVector = cmoCache.getVectorSearch(queryEmbedding, category || 'all');
        if (cachedVector) {
          return cachedVector;
        }
      }
      
      // Build filter
      const filter = category ? {
        must: [{
          key: 'category',
          match: { value: category }
        }]
      } : null;
      
      // Search in Qdrant
      const results = await this.qdrant.search(this.collectionName, {
        vector: queryEmbedding,
        filter,
        limit,
        with_payload: true
      });
      
      // Filter by minimum score and format results
      const formattedResults = results
        .filter(r => r.score >= minScore)
        .map(r => ({
          id: r.id,
          score: r.score,
          category: r.payload.category,
          title: r.payload.title,
          content: r.payload.content,
          type: r.payload.type,
          metadata: r.payload.metadata
        }));
      
      // Cache results
      if (performanceConfig.queryCache.enabled) {
        cmoCache.setQuery(query, options, formattedResults);
      }
      
      if (performanceConfig.vectorSearch.cacheResults) {
        cmoCache.setVectorSearch(queryEmbedding, category || 'all', formattedResults);
      }
      
      return formattedResults;
      
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }

  /**
   * Get knowledge by category with caching
   */
  getByCategory(category) {
    // Check cache first
    const cacheKey = `category:${category}`;
    const cached = cmoCache.getKnowledge(cacheKey);
    if (cached) {
      return cached;
    }
    
    const result = this.knowledge.get(category) || [];
    
    // Cache result
    cmoCache.setKnowledge(cacheKey, result);
    
    return result;
  }

  /**
   * Get knowledge by topic
   */
  getByTopic(category, topic) {
    const categoryKnowledge = this.getByCategory(category);
    return categoryKnowledge.filter(item => 
      item.topic === topic || 
      (item.topics && item.topics.includes(topic))
    );
  }

  /**
   * Get random tip from a category
   */
  getRandomTip(category) {
    const items = this.getByCategory(category);
    const tips = items.filter(item => item.type === 'tip' || item.type === 'quick_tip');
    
    if (tips.length === 0) return null;
    
    return tips[Math.floor(Math.random() * tips.length)];
  }

  /**
   * Get template by name
   */
  getTemplate(category, templateName) {
    const items = this.getByCategory(category);
    return items.find(item => 
      item.type === 'template' && 
      (item.name === templateName || item.title === templateName)
    );
  }

  /**
   * Add new knowledge item
   */
  async addKnowledge(category, item) {
    if (!this.metadata.categories[category]) {
      throw new Error(`Invalid category: ${category}`);
    }
    
    // Add to memory
    const categoryKnowledge = this.knowledge.get(category) || [];
    item._category = category;
    item._source = 'runtime';
    categoryKnowledge.push(item);
    this.knowledge.set(category, categoryKnowledge);
    
    // Index in vector DB
    const searchText = this.createSearchableText(item);
    const embedding = await this.generateEmbedding(searchText);
    
    await this.qdrant.upsert(this.collectionName, {
      wait: true,
      points: [{
        id: this.generateId(category, item),
        vector: embedding,
        payload: {
          category,
          title: item.title || item.name || 'Untitled',
          content: item.content || item.description || '',
          type: item.type || 'general',
          topic: item.topic || null,
          metadata: item.metadata || {},
          source: 'runtime',
          searchText
        }
      }]
    });
    
    console.log(`✅ Added knowledge item to ${category}`);
  }

  /**
   * Export knowledge for backup
   */
  async exportKnowledge() {
    const exportData = {
      metadata: this.metadata,
      knowledge: {}
    };
    
    for (const [category, items] of this.knowledge.entries()) {
      exportData.knowledge[category] = items;
    }
    
    return exportData;
  }

  /**
   * Get statistics about the knowledge base
   */
  getStats() {
    const stats = {
      initialized: this.initialized,
      totalItems: 0,
      categories: {}
    };
    
    for (const [category, items] of this.knowledge.entries()) {
      stats.categories[category] = {
        count: items.length,
        types: {}
      };
      
      items.forEach(item => {
        const type = item.type || 'general';
        stats.categories[category].types[type] = 
          (stats.categories[category].types[type] || 0) + 1;
      });
      
      stats.totalItems += items.length;
    }
    
    return stats;
  }
}

// Export singleton instance
export const cmoKnowledgeBase = new CMOKnowledgeBase();
export default CMOKnowledgeBase;