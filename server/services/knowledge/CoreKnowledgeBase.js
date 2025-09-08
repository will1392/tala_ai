/**
 * CoreKnowledgeBase - Multi-layered knowledge management system
 * 
 * Implements a sophisticated knowledge architecture with:
 * - Core shared knowledge
 * - Agent-specific knowledge layers
 * - Retrieval augmentation (RAG)
 * - Dynamic knowledge fusion
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import { QdrantClient } from '@qdrant/js-client-rest';
import { EventEmitter } from 'events';
import { cmoCache } from '../cmo/CMOCache.js';
import { performanceConfig } from '../../config/performance.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Knowledge Layer Abstract Class
 */
class KnowledgeLayer {
  constructor(name, priority = 0) {
    this.name = name;
    this.priority = priority;
    this.initialized = false;
    this.knowledge = new Map();
    this.metadata = {};
  }

  async initialize() {
    throw new Error('initialize() must be implemented by subclass');
  }

  async search(query, options = {}) {
    throw new Error('search() must be implemented by subclass');
  }

  getStats() {
    return {
      name: this.name,
      priority: this.priority,
      initialized: this.initialized,
      itemCount: this.knowledge.size
    };
  }
}

/**
 * Core Knowledge Layer - Shared foundational knowledge
 */
class CoreLayer extends KnowledgeLayer {
  constructor(basePath) {
    super('core', 1);
    this.basePath = basePath;
  }

  async initialize() {
    try {
      const metadataPath = path.join(this.basePath, 'core', 'metadata.json');
      const content = await fs.readFile(metadataPath, 'utf-8');
      this.metadata = JSON.parse(content);
      
      // Load core knowledge files
      await this.loadKnowledge();
      
      this.initialized = true;
      console.log(`✅ Core layer initialized with ${this.knowledge.size} items`);
    } catch (error) {
      console.error('Failed to initialize core layer:', error);
      throw error;
    }
  }

  async loadKnowledge() {
    const corePath = path.join(this.basePath, 'core');
    const categories = ['fundamentals', 'templates', 'patterns', 'best-practices'];
    
    for (const category of categories) {
      const categoryPath = path.join(corePath, category);
      try {
        const files = await fs.readdir(categoryPath);
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        
        for (const file of jsonFiles) {
          const filePath = path.join(categoryPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const data = JSON.parse(content);
          
          const key = `${category}:${path.basename(file, '.json')}`;
          this.knowledge.set(key, {
            category,
            data,
            source: file
          });
        }
      } catch (error) {
        console.log(`Creating ${category} directory...`);
        await fs.mkdir(categoryPath, { recursive: true });
      }
    }
  }

  async search(query, options = {}) {
    // Simple keyword-based search for core knowledge
    const results = [];
    
    for (const [key, item] of this.knowledge.entries()) {
      const searchText = JSON.stringify(item.data).toLowerCase();
      if (searchText.includes(query.toLowerCase())) {
        results.push({
          key,
          category: item.category,
          relevance: 0.5, // Base relevance for keyword match
          data: item.data
        });
      }
    }
    
    return results.slice(0, options.limit || 5);
  }
}

/**
 * Agent Knowledge Layer - Agent-specific knowledge
 */
class AgentLayer extends KnowledgeLayer {
  constructor(agentName, collections, basePath) {
    super(`agent:${agentName}`, 2);
    this.agentName = agentName;
    this.collections = collections;
    this.basePath = basePath;
  }

  async initialize() {
    try {
      const agentPath = path.join(this.basePath, 'agents', this.agentName);
      
      // Load agent-specific metadata if exists
      try {
        const metadataPath = path.join(agentPath, 'metadata.json');
        const content = await fs.readFile(metadataPath, 'utf-8');
        this.metadata = JSON.parse(content);
      } catch (error) {
        // Use default metadata
        this.metadata = {
          agent: this.agentName,
          collections: this.collections,
          specializations: []
        };
      }
      
      // Load agent knowledge
      await this.loadAgentKnowledge();
      
      this.initialized = true;
      console.log(`✅ Agent layer ${this.agentName} initialized with ${this.knowledge.size} items`);
    } catch (error) {
      console.error(`Failed to initialize agent layer ${this.agentName}:`, error);
      throw error;
    }
  }

  async loadAgentKnowledge() {
    const agentPath = path.join(this.basePath, 'agents', this.agentName);
    
    try {
      await fs.access(agentPath);
      const files = await fs.readdir(agentPath);
      const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'metadata.json');
      
      for (const file of jsonFiles) {
        const filePath = path.join(agentPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        
        const key = path.basename(file, '.json');
        this.knowledge.set(key, {
          type: 'agent_specific',
          data,
          source: file
        });
      }
    } catch (error) {
      console.log(`Creating agent directory for ${this.agentName}...`);
      await fs.mkdir(agentPath, { recursive: true });
    }
  }

  async search(query, options = {}) {
    const results = [];
    
    // Search through agent-specific knowledge
    for (const [key, item] of this.knowledge.entries()) {
      const searchText = JSON.stringify(item.data).toLowerCase();
      if (searchText.includes(query.toLowerCase())) {
        results.push({
          key,
          agent: this.agentName,
          relevance: 0.7, // Higher relevance for agent-specific matches
          data: item.data
        });
      }
    }
    
    return results.slice(0, options.limit || 5);
  }
}

/**
 * Core Knowledge Base with Layered Architecture
 */
export class CoreKnowledgeBase extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.basePath = options.basePath || path.join(__dirname, '../../knowledge');
    this.layers = new Map();
    this.initialized = false;
    
    // OpenAI for embeddings
    this.openai = options.openai || null;
    this._openaiApiKey = process.env.OPENAI_API_KEY || '';
    
    // Qdrant for vector search
    this.qdrant = options.qdrant || new QdrantClient({
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      apiKey: process.env.QDRANT_API_KEY
    });
    
    // Configuration
    this.config = {
      vectorDimension: 1536,
      collections: {
        core: 'tala_core_knowledge',
        agents: 'tala_agent_knowledge',
        augmented: 'tala_augmented_knowledge'
      },
      retrieval: {
        strategies: ['semantic', 'hybrid', 'contextual'],
        defaultStrategy: 'hybrid',
        maxResults: 10,
        minRelevance: 0.7
      }
    };
    
    // Retrieval Augmentation System
    this.ragSystem = null;
  }

  /**
   * Initialize all knowledge layers
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      console.log('🚀 Initializing Core Knowledge Base...');
      
      // Load architecture metadata
      await this.loadArchitectureMetadata();
      
      // Initialize core layer
      const coreLayer = new CoreLayer(this.basePath);
      await coreLayer.initialize();
      this.layers.set('core', coreLayer);
      
      // Initialize agent layers based on metadata
      await this.initializeAgentLayers();
      
      // Initialize vector collections
      await this.initializeVectorCollections();
      
      // Initialize RAG system
      await this.initializeRAGSystem();
      
      // Index all knowledge
      await this.indexAllKnowledge();
      
      this.initialized = true;
      this.emit('initialized');
      
      console.log('✅ Core Knowledge Base initialized successfully');
      console.log(`📊 Layers: ${this.layers.size}, Total items: ${this.getTotalItems()}`);
      
    } catch (error) {
      console.error('❌ Failed to initialize Core Knowledge Base:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Load architecture metadata
   */
  async loadArchitectureMetadata() {
    try {
      const metadataPath = path.join(this.basePath, 'architecture', 'metadata.json');
      const content = await fs.readFile(metadataPath, 'utf-8');
      this.architectureMetadata = JSON.parse(content);
      console.log('📋 Loaded architecture metadata v' + this.architectureMetadata.version);
    } catch (error) {
      console.error('Failed to load architecture metadata:', error);
      throw error;
    }
  }

  /**
   * Initialize agent layers from metadata
   */
  async initializeAgentLayers() {
    const agents = this.architectureMetadata.agents || {};
    
    for (const [agentKey, agentConfig] of Object.entries(agents)) {
      try {
        const agentLayer = new AgentLayer(
          agentKey,
          agentConfig.collections,
          this.basePath
        );
        await agentLayer.initialize();
        this.layers.set(`agent:${agentKey}`, agentLayer);
      } catch (error) {
        console.warn(`⚠️ Failed to initialize agent layer ${agentKey}:`, error.message);
      }
    }
  }

  /**
   * Initialize vector collections in Qdrant
   */
  async initializeVectorCollections() {
    try {
      const collections = await this.qdrant.getCollections();
      
      for (const [key, collectionName] of Object.entries(this.config.collections)) {
        const exists = collections.collections.some(c => c.name === collectionName);
        
        if (!exists) {
          console.log(`🗄️ Creating collection: ${collectionName}`);
          await this.qdrant.createCollection(collectionName, {
            vectors: {
              size: this.config.vectorDimension,
              distance: 'Cosine'
            },
            optimizers_config: {
              default_segment_number: 2
            }
          });
        }
      }
    } catch (error) {
      console.error('Failed to initialize vector collections:', error);
      throw error;
    }
  }

  /**
   * Initialize Retrieval Augmentation System
   */
  async initializeRAGSystem() {
    const { RetrievalAugmentationSystem } = await import('./RetrievalAugmentationSystem.js');
    
    this.ragSystem = new RetrievalAugmentationSystem({
      knowledgeBase: this,
      openai: this.getOpenAIClient(),
      qdrant: this.qdrant,
      config: this.config.retrieval
    });
    
    await this.ragSystem.initialize();
    console.log('✅ RAG System initialized');
  }

  /**
   * Index all knowledge in vector database
   */
  async indexAllKnowledge() {
    console.log('🔍 Indexing knowledge in vector database...');
    
    let totalIndexed = 0;
    
    // Index each layer
    for (const [layerName, layer] of this.layers.entries()) {
      const items = Array.from(layer.knowledge.entries());
      
      if (items.length === 0) continue;
      
      console.log(`📊 Indexing ${items.length} items from ${layerName}...`);
      
      const points = [];
      
      for (const [key, item] of items) {
        try {
          const searchText = this.createSearchableText(key, item);
          const embedding = await this.generateEmbedding(searchText);
          
          points.push({
            id: this.generateId(layerName, key),
            vector: embedding,
            payload: {
              layer: layerName,
              key,
              type: item.type || 'general',
              category: item.category || null,
              data: item.data,
              searchText
            }
          });
        } catch (error) {
          console.warn(`⚠️ Failed to index ${key}:`, error.message);
        }
      }
      
      // Upsert to appropriate collection
      if (points.length > 0) {
        const collection = layerName.startsWith('agent:') 
          ? this.config.collections.agents 
          : this.config.collections.core;
          
        await this.qdrant.upsert(collection, {
          wait: true,
          points
        });
        
        totalIndexed += points.length;
      }
    }
    
    console.log(`✅ Indexed ${totalIndexed} items total`);
  }

  /**
   * Multi-layered search with RAG
   */
  async search(query, options = {}) {
    const {
      agent = null,
      strategy = this.config.retrieval.defaultStrategy,
      limit = this.config.retrieval.maxResults,
      minRelevance = this.config.retrieval.minRelevance,
      includeCore = true,
      includeAgents = true,
      augment = true
    } = options;
    
    try {
      // Use RAG system for augmented search
      if (augment && this.ragSystem) {
        return await this.ragSystem.search(query, {
          agent,
          strategy,
          limit,
          minRelevance,
          includeCore,
          includeAgents
        });
      }
      
      // Fallback to basic search
      return await this.basicSearch(query, options);
      
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }

  /**
   * Basic search without augmentation
   */
  async basicSearch(query, options = {}) {
    const results = [];
    
    // Search core layer
    if (options.includeCore !== false) {
      const coreLayer = this.layers.get('core');
      if (coreLayer) {
        const coreResults = await coreLayer.search(query, options);
        results.push(...coreResults.map(r => ({ ...r, layer: 'core' })));
      }
    }
    
    // Search agent layers
    if (options.includeAgents !== false) {
      for (const [layerName, layer] of this.layers.entries()) {
        if (layerName.startsWith('agent:')) {
          // Skip if specific agent requested and doesn't match
          if (options.agent && !layerName.includes(options.agent)) continue;
          
          const agentResults = await layer.search(query, options);
          results.push(...agentResults.map(r => ({ ...r, layer: layerName })));
        }
      }
    }
    
    // Sort by relevance and return top results
    return results
      .sort((a, b) => (b.relevance || 0) - (a.relevance || 0))
      .slice(0, options.limit || 10);
  }

  /**
   * Get knowledge by specific key
   */
  getKnowledge(layerName, key) {
    const layer = this.layers.get(layerName);
    if (!layer) return null;
    
    return layer.knowledge.get(key);
  }

  /**
   * Add knowledge to a specific layer
   */
  async addKnowledge(layerName, key, data) {
    const layer = this.layers.get(layerName);
    if (!layer) {
      throw new Error(`Layer ${layerName} not found`);
    }
    
    // Add to layer
    layer.knowledge.set(key, data);
    
    // Index in vector database
    const searchText = this.createSearchableText(key, data);
    const embedding = await this.generateEmbedding(searchText);
    
    const collection = layerName.startsWith('agent:') 
      ? this.config.collections.agents 
      : this.config.collections.core;
    
    await this.qdrant.upsert(collection, {
      wait: true,
      points: [{
        id: this.generateId(layerName, key),
        vector: embedding,
        payload: {
          layer: layerName,
          key,
          type: data.type || 'general',
          category: data.category || null,
          data: data.data,
          searchText
        }
      }]
    });
    
    this.emit('knowledge_added', { layer: layerName, key });
    console.log(`✅ Added knowledge to ${layerName}: ${key}`);
  }

  /**
   * Get OpenAI client
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
   * Create searchable text from knowledge item
   */
  createSearchableText(key, item) {
    const parts = [key];
    
    if (item.data) {
      if (typeof item.data === 'string') {
        parts.push(item.data);
      } else {
        parts.push(JSON.stringify(item.data));
      }
    }
    
    if (item.category) parts.push(item.category);
    if (item.type) parts.push(item.type);
    
    return parts.join(' ').substring(0, 8000);
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
   * Generate unique ID
   */
  generateId(layer, key) {
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    return uuid;
  }

  /**
   * Get total number of knowledge items
   */
  getTotalItems() {
    let total = 0;
    for (const layer of this.layers.values()) {
      total += layer.knowledge.size;
    }
    return total;
  }

  /**
   * Get statistics about the knowledge base
   */
  getStats() {
    const stats = {
      initialized: this.initialized,
      totalLayers: this.layers.size,
      totalItems: this.getTotalItems(),
      layers: {}
    };
    
    for (const [name, layer] of this.layers.entries()) {
      stats.layers[name] = layer.getStats();
    }
    
    if (this.ragSystem) {
      stats.rag = this.ragSystem.getStats();
    }
    
    return stats;
  }

  /**
   * Export knowledge for backup
   */
  async exportKnowledge() {
    const exportData = {
      metadata: this.architectureMetadata,
      layers: {}
    };
    
    for (const [name, layer] of this.layers.entries()) {
      exportData.layers[name] = {
        metadata: layer.metadata,
        knowledge: Array.from(layer.knowledge.entries())
      };
    }
    
    return exportData;
  }
}

// Export singleton instance
export const coreKnowledgeBase = new CoreKnowledgeBase();
export default CoreKnowledgeBase;