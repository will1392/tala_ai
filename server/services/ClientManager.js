/**
 * ClientManager - Singleton for managing expensive client connections
 * Lazy-loads clients only when first requested, not at module import time
 */

class ClientManager {
  constructor() {
    this.clients = {
      qdrant: null,
      openai: null,
      contextAwareSearch: null,
      enhancedResponseGenerator: null
    };
    this.initialized = {
      qdrant: false,
      openai: false,
      contextAwareSearch: false,
      enhancedResponseGenerator: false
    };
  }

  async getQdrantClient() {
    if (!this.initialized.qdrant) {
      console.log('🔄 Initializing Qdrant client (first use)...');
      const { QdrantClient } = await import('@qdrant/qdrant-js');
      this.clients.qdrant = new QdrantClient({
        url: process.env.QDRANT_URL || 'https://2769f27d-a9f0-4361-8f88-3ac61f081dd1.europe-west3-0.gcp.cloud.qdrant.io:6333',
        apiKey: process.env.QDRANT_API_KEY,
      });
      this.initialized.qdrant = true;
      console.log('✅ Qdrant client ready');
    }
    return this.clients.qdrant;
  }

  async getOpenAIClient() {
    if (!this.initialized.openai) {
      console.log('🔄 Initializing OpenAI client (first use)...');
      const OpenAI = await import('openai');
      this.clients.openai = new OpenAI.default({
        apiKey: process.env.OPENAI_API_KEY,
      });
      this.initialized.openai = true;
      console.log('✅ OpenAI client ready');
    }
    return this.clients.openai;
  }

  async getContextAwareSearch() {
    if (!this.initialized.contextAwareSearch) {
      console.log('🔄 Initializing ContextAwareSearch (first use)...');
      const { ContextAwareSearch } = await import('./search/ContextAwareSearch.js');
      this.clients.contextAwareSearch = ContextAwareSearch;
      this.initialized.contextAwareSearch = true;
      console.log('✅ ContextAwareSearch ready');
    }
    return this.clients.contextAwareSearch;
  }

  async getEnhancedResponseGenerator() {
    if (!this.initialized.enhancedResponseGenerator) {
      console.log('🔄 Initializing EnhancedResponseGenerator (first use)...');
      const module = await import('./EnhancedResponseGenerator.js');
      // Handle both named and default exports
      this.clients.enhancedResponseGenerator = module.EnhancedResponseGenerator || module.default;
      this.initialized.enhancedResponseGenerator = true;
      console.log('✅ EnhancedResponseGenerator ready');
    }
    return this.clients.enhancedResponseGenerator;
  }

  // Reset all clients (useful for testing or reconnection)
  reset() {
    this.clients = {
      qdrant: null,
      openai: null,
      contextAwareSearch: null,
      enhancedResponseGenerator: null
    };
    this.initialized = {
      qdrant: false,
      openai: false,
      contextAwareSearch: false,
      enhancedResponseGenerator: false
    };
  }
}

// Export singleton instance
const clientManager = new ClientManager();
export default clientManager;