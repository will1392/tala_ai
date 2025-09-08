/**
 * LayeredKnowledgeSystem - Implements a multi-tier knowledge architecture
 * 
 * Provides:
 * - Core foundational knowledge accessible to all agents
 * - Agent-specific specialized knowledge layers
 * - Efficient retrieval without loading everything
 * - Clear separation of concerns
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { cmoCache } from '../cmo/CMOCache.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class LayeredKnowledgeSystem {
  constructor() {
    // Knowledge layers
    this.coreKnowledge = new Map();      // Foundation knowledge for all agents
    this.agentKnowledge = new Map();     // Agent-specific knowledge
    this.retrievalIndex = new Map();     // Chunked knowledge for retrieval
    
    // Paths
    this.basePath = path.join(__dirname, '../../knowledge');
    this.corePath = path.join(this.basePath, 'core');
    this.agentPath = path.join(this.basePath, 'agents');
    
    this.initialized = false;
  }

  /**
   * Initialize the layered knowledge system
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      console.log('🔄 Initializing Layered Knowledge System...');
      
      // Load core knowledge
      await this.loadCoreKnowledge();
      
      // Load agent-specific knowledge
      await this.loadAgentKnowledge();
      
      // Build retrieval index
      await this.buildRetrievalIndex();
      
      this.initialized = true;
      console.log('✅ Layered Knowledge System initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize knowledge system:', error);
      throw error;
    }
  }

  /**
   * Load core foundational knowledge
   */
  async loadCoreKnowledge() {
    console.log('📚 Loading core knowledge...');
    
    const coreCategories = [
      'marketing-fundamentals',
      'industry-benchmarks', 
      'best-practices',
      'definitions'
    ];
    
    for (const category of coreCategories) {
      try {
        const categoryPath = path.join(this.corePath, category);
        const files = await this.getMarkdownFiles(categoryPath);
        
        for (const file of files) {
          const content = await fs.readFile(file, 'utf-8');
          const key = this.getKnowledgeKey(file, this.corePath);
          
          this.coreKnowledge.set(key, {
            content,
            category,
            path: file,
            metadata: this.extractMetadata(content)
          });
        }
      } catch (error) {
        console.warn(`⚠️ Could not load core category ${category}:`, error.message);
      }
    }
    
    console.log(`✅ Loaded ${this.coreKnowledge.size} core knowledge items`);
  }

  /**
   * Load agent-specific knowledge layers
   */
  async loadAgentKnowledge() {
    console.log('🤖 Loading agent-specific knowledge...');
    
    try {
      const agentDirs = await fs.readdir(this.agentPath);
      
      for (const agentDir of agentDirs) {
        const agentDirPath = path.join(this.agentPath, agentDir);
        const stat = await fs.stat(agentDirPath);
        
        if (stat.isDirectory()) {
          const agentKnowledge = new Map();
          const files = await this.getMarkdownFiles(agentDirPath);
          
          for (const file of files) {
            const content = await fs.readFile(file, 'utf-8');
            const key = this.getKnowledgeKey(file, agentDirPath);
            
            agentKnowledge.set(key, {
              content,
              agent: agentDir,
              path: file,
              metadata: this.extractMetadata(content)
            });
          }
          
          if (agentKnowledge.size > 0) {
            this.agentKnowledge.set(agentDir, agentKnowledge);
            console.log(`✅ Loaded ${agentKnowledge.size} items for ${agentDir}`);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not load agent knowledge:', error.message);
    }
  }

  /**
   * Build retrieval index with chunked content
   */
  async buildRetrievalIndex() {
    console.log('🔍 Building retrieval index...');
    
    // Index core knowledge
    for (const [key, item] of this.coreKnowledge) {
      const chunks = this.chunkContent(item.content, item.metadata);
      this.retrievalIndex.set(key, chunks);
    }
    
    // Index agent knowledge
    for (const [agent, knowledge] of this.agentKnowledge) {
      for (const [key, item] of knowledge) {
        const chunks = this.chunkContent(item.content, {
          ...item.metadata,
          agent
        });
        this.retrievalIndex.set(`${agent}:${key}`, chunks);
      }
    }
    
    console.log(`✅ Indexed ${this.retrievalIndex.size} knowledge items`);
  }

  /**
   * Get knowledge for a specific agent with query
   */
  async getAgentKnowledge(agentName, query, options = {}) {
    const maxChunks = options.maxChunks || 5;
    const includeCore = options.includeCore !== false;
    
    const results = [];
    
    // Always include relevant core knowledge
    if (includeCore) {
      const coreChunks = await this.searchCore(query, Math.floor(maxChunks / 2));
      results.push(...coreChunks);
    }
    
    // Add agent-specific knowledge
    const agentChunks = await this.searchAgent(agentName, query, Math.ceil(maxChunks / 2));
    results.push(...agentChunks);
    
    // Sort by relevance and limit
    return results
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, maxChunks);
  }

  /**
   * Search core knowledge
   */
  async searchCore(query, limit = 3) {
    const results = [];
    const queryLower = query.toLowerCase();
    const queryTokens = this.tokenize(queryLower);
    
    for (const [key, chunks] of this.retrievalIndex) {
      // Skip agent-specific entries
      if (key.includes(':')) continue;
      
      for (const chunk of chunks) {
        const relevance = this.calculateRelevance(queryTokens, chunk);
        if (relevance > 0.3) {
          results.push({
            ...chunk,
            source: 'core',
            key,
            relevance
          });
        }
      }
    }
    
    return results
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);
  }

  /**
   * Search agent-specific knowledge
   */
  async searchAgent(agentName, query, limit = 3) {
    const results = [];
    const queryLower = query.toLowerCase();
    const queryTokens = this.tokenize(queryLower);
    
    const agentKnowledge = this.agentKnowledge.get(agentName);
    if (!agentKnowledge) return results;
    
    for (const [key, chunks] of this.retrievalIndex) {
      // Only look at this agent's entries
      if (!key.startsWith(`${agentName}:`)) continue;
      
      for (const chunk of chunks) {
        const relevance = this.calculateRelevance(queryTokens, chunk);
        if (relevance > 0.3) {
          results.push({
            ...chunk,
            source: 'agent',
            agent: agentName,
            key,
            relevance
          });
        }
      }
    }
    
    return results
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);
  }

  /**
   * Chunk content into smaller, focused pieces
   */
  chunkContent(content, metadata = {}) {
    const chunks = [];
    const sections = content.split(/^###?\s+/m);
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i].trim();
      if (!section) continue;
      
      // Extract section title and content
      const lines = section.split('\n');
      const title = lines[0];
      const sectionContent = lines.slice(1).join('\n').trim();
      
      // Further chunk by paragraphs if section is large
      if (sectionContent.length > 1000) {
        const paragraphs = sectionContent.split('\n\n');
        for (const para of paragraphs) {
          if (para.trim().length > 100) {
            chunks.push({
              title: `${title} - ${para.substring(0, 50)}...`,
              content: para.trim(),
              metadata,
              tokens: this.tokenize(para.toLowerCase())
            });
          }
        }
      } else if (sectionContent.length > 100) {
        chunks.push({
          title,
          content: sectionContent,
          metadata,
          tokens: this.tokenize(sectionContent.toLowerCase())
        });
      }
    }
    
    return chunks;
  }

  /**
   * Calculate relevance score
   */
  calculateRelevance(queryTokens, chunk) {
    let score = 0;
    const chunkTokens = chunk.tokens;
    
    // Exact matches
    for (const token of queryTokens) {
      if (chunkTokens.includes(token)) {
        score += 1;
      }
    }
    
    // Partial matches
    for (const token of queryTokens) {
      for (const chunkToken of chunkTokens) {
        if (chunkToken.includes(token) || token.includes(chunkToken)) {
          score += 0.5;
        }
      }
    }
    
    // Boost for title matches
    const titleTokens = this.tokenize(chunk.title.toLowerCase());
    for (const token of queryTokens) {
      if (titleTokens.includes(token)) {
        score += 2;
      }
    }
    
    // Normalize by query length
    return score / Math.max(queryTokens.length, 1);
  }

  /**
   * Simple tokenization
   */
  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2);
  }

  /**
   * Extract metadata from markdown content
   */
  extractMetadata(content) {
    const metadata = {};
    
    // Extract title
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      metadata.title = titleMatch[1];
    }
    
    // Extract keywords from headers
    const headers = content.match(/^###?\s+(.+)$/gm) || [];
    metadata.topics = headers.map(h => h.replace(/^###?\s+/, ''));
    
    // Extract metrics/numbers
    const metrics = content.match(/\d+\.?\d*%|\$\d+/g) || [];
    metadata.metrics = [...new Set(metrics)];
    
    return metadata;
  }

  /**
   * Get markdown files recursively
   */
  async getMarkdownFiles(dir) {
    const files = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.getMarkdownFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.name.endsWith('.md')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory might not exist yet
    }
    
    return files;
  }

  /**
   * Generate knowledge key from file path
   */
  getKnowledgeKey(filePath, basePath) {
    return path.relative(basePath, filePath)
      .replace(/\.md$/, '')
      .replace(/\\/g, '/');
  }

  /**
   * Get stats about the knowledge system
   */
  getStats() {
    return {
      coreItems: this.coreKnowledge.size,
      agents: this.agentKnowledge.size,
      agentDetails: Array.from(this.agentKnowledge.entries()).map(([agent, knowledge]) => ({
        agent,
        items: knowledge.size
      })),
      totalChunks: Array.from(this.retrievalIndex.values()).reduce((sum, chunks) => sum + chunks.length, 0),
      initialized: this.initialized
    };
  }
}

// Create singleton instance
export const layeredKnowledge = new LayeredKnowledgeSystem();
export default layeredKnowledge;