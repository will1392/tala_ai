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
    
    // OpenAI for embeddings - lazy initialization
    this.openai = options.openai || null;
    this._openaiApiKey = process.env.OPENAI_API_KEY || '';
    
    // Qdrant client
    this.qdrant = options.qdrant || new QdrantClient({
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      apiKey: process.env.QDRANT_API_KEY
    });
    
    this.collectionName = 'cmo_knowledge';
    this.vectorDimension = 1536; // OpenAI embedding dimension
  }

  /**
   * Get OpenAI client with lazy initialization
   */
  getOpenAIClient() {
    if (!this.openai) {
      const apiKey = process.env.OPENAI_API_KEY || this._openaiApiKey;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY not configured');
      }
      this.openai = new OpenAI({ apiKey });
    }
    return this.openai;
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
      
      // Try to create Qdrant collection if it doesn't exist
      // Don't fail initialization if vector DB is unavailable
      try {
        await this.ensureCollection();
      } catch (error) {
        console.warn('⚠️ Vector database unavailable, continuing with fallback mode:', error.message);
      }
      
      // Load knowledge from files
      await this.loadKnowledge();
      
      // Try to index knowledge in vector DB
      // Don't fail if indexing fails
      try {
        await this.indexKnowledge();
      } catch (error) {
        console.warn('⚠️ Failed to index knowledge in vector DB, search will use fallback mode:', error.message);
      }
      
      // Warm up cache if enabled
      if (performanceConfig.knowledgeCache.enabled) {
        try {
          await cmoCache.warmUp(this);
        } catch (error) {
          console.warn('⚠️ Cache warmup failed:', error.message);
        }
      }
      
      this.initialized = true;
      console.log('✅ CMO Knowledge Base initialized (with fallback mode if needed)');
      
    } catch (error) {
      console.error('❌ Failed to initialize CMO Knowledge Base:', error);
      // Don't throw - allow system to work with fallbacks
      this.initialized = false;
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
      const openai = this.getOpenAIClient();
      const response = await openai.embeddings.create({
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
    // Generate a proper UUID v4
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    return uuid;
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
      // Check if external services are properly initialized
      if (!this.initialized) {
        console.warn('⚠️ Knowledge base not fully initialized, returning fallback response');
        return this.getFallbackSearchResults(query, category);
      }
      
      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Check vector cache
      if (performanceConfig.vectorSearch.cacheResults) {
        const cachedVector = cmoCache.getVectorSearch(queryEmbedding, category || 'all');
        if (cachedVector) {
          return cachedVector;
        }
      }
      
      // Build filter - temporarily disabled until indexes are created
      const filter = null;
      // TODO: Re-enable when indexes are created
      // const filter = category ? {
      //   must: [{
      //     key: 'category',
      //     match: { value: category }
      //   }]
      // } : null;
      
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
      console.error('Search failed:', error.message);
      
      // Return graceful fallback instead of empty array
      if (error.message?.includes('OPENAI_API_KEY')) {
        console.warn('⚠️ OpenAI API key not configured, using fallback search');
      } else if (error.message?.includes('ECONNREFUSED')) {
        console.warn('⚠️ Vector database not available, using fallback search');
      }
      
      return this.getFallbackSearchResults(query, category);
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
   * Get knowledge by type across all categories
   */
  getByType(type) {
    const results = [];
    
    // Search through all categories
    for (const [category, items] of this.knowledge.entries()) {
      const typeItems = items.filter(item => item.type === type);
      results.push(...typeItems);
    }
    
    return results;
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

  /**
   * Get fallback search results when external services are unavailable
   */
  getFallbackSearchResults(query, category) {
    const fallbackResults = [];
    
    // For direct mail queries, provide helpful fallback content
    if (category === 'direct-mail' || query.toLowerCase().includes('direct mail')) {
      fallbackResults.push({
        id: 'fallback-1',
        score: 0.8,
        category: 'direct-mail',
        title: 'Direct Mail Field Guidance',
        content: this.getDirectMailFallbackContent(query),
        type: 'guide',
        metadata: {
          source: 'fallback',
          reason: 'External services unavailable'
        }
      });
    }
    
    // Add general fallback if no specific category match
    if (fallbackResults.length === 0) {
      fallbackResults.push({
        id: 'fallback-general',
        score: 0.7,
        category: 'general',
        title: 'Marketing Guidance',
        content: 'I can help you with this field. Please provide specific information that aligns with your business goals and target audience. Consider including relevant details that will help create an effective campaign.',
        type: 'general',
        metadata: {
          source: 'fallback'
        }
      });
    }
    
    return fallbackResults;
  }

  /**
   * Get direct mail specific fallback content
   */
  getDirectMailFallbackContent(query) {
    const queryLower = query.toLowerCase();
    
    // Field-specific guidance
    if (queryLower.includes('specialty') || queryLower.includes('travel')) {
      return 'For travel specialty, consider focusing on your primary expertise (luxury cruises, adventure travel, all-inclusive resorts, etc.). This helps target the right audience and craft relevant messages.';
    }
    
    if (queryLower.includes('audience') || queryLower.includes('client')) {
      return 'Define your ideal client by demographics (age, income), psychographics (interests, values), and travel preferences. Consider past successful bookings to identify patterns.';
    }
    
    if (queryLower.includes('budget')) {
      return 'Direct mail budgets typically range from $0.50-$2.00 per piece including design, printing, and postage. Consider starting with 500-1000 pieces for testing.';
    }
    
    if (queryLower.includes('offer') || queryLower.includes('message')) {
      return 'Strong offers include exclusive discounts, limited-time deals, value-adds (free upgrades, credits), or early access to new destinations. Make it compelling and time-sensitive.';
    }
    
    if (queryLower.includes('design') || queryLower.includes('format')) {
      return 'Popular formats include 4x6 or 6x9 postcards. Use high-quality destination imagery, clear headlines, and prominent calls-to-action. Keep text concise and benefits-focused.';
    }
    
    if (queryLower.includes('timing') || queryLower.includes('frequency')) {
      return 'Time mailings 6-8 weeks before key booking periods. Consider seasonal patterns: January for spring/summer, September for winter holidays. Monthly or quarterly campaigns work well.';
    }
    
    // Default guidance
    return 'For this field, provide information that best represents your business and campaign goals. Be specific to help create targeted, effective direct mail campaigns that resonate with your ideal travelers.';
  }
}

// Export singleton instance
export const cmoKnowledgeBase = new CMOKnowledgeBase();
export default CMOKnowledgeBase;