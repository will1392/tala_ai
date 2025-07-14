/**
 * Memory Manager - Mock Implementation
 * 
 * Provides memory storage and retrieval functionality for the intelligence system
 */

export class MemoryManager {
  constructor(options = {}) {
    this.options = options;
    this.memories = new Map();
    this.initialized = false;
  }
  
  async initialize() {
    this.initialized = true;
    console.log('📝 Memory Manager initialized (mock)');
  }
  
  async createMemory(memoryData) {
    const id = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const memory = {
      id,
      ...memoryData,
      timestamp: new Date(),
      updated: new Date()
    };
    
    this.memories.set(id, memory);
    return memory;
  }
  
  async retrieveMemories(query) {
    const { userId, query: searchQuery, limit = 10, filters = {} } = query;
    
    const results = Array.from(this.memories.values())
      .filter(memory => {
        if (memory.userId !== userId) return false;
        
        // Apply filters
        if (filters.importance && memory.importance < filters.importance.$gte) {
          return false;
        }
        
        // Simple search
        if (searchQuery) {
          const content = JSON.stringify(memory.content).toLowerCase();
          return content.includes(searchQuery.toLowerCase());
        }
        
        return true;
      })
      .slice(0, limit);
    
    return results;
  }
  
  async adjustImportance(params) {
    const { userId, criteria, adjustment } = params;
    
    this.memories.forEach((memory, id) => {
      if (memory.userId === userId) {
        if (criteria.metadata?.requestId === memory.metadata?.requestId) {
          memory.importance = Math.max(0, Math.min(1, memory.importance + adjustment));
          memory.updated = new Date();
        }
      }
    });
  }
  
  async getStats() {
    const totalCount = this.memories.size;
    const typeDistribution = {};
    let totalImportance = 0;
    
    this.memories.forEach(memory => {
      typeDistribution[memory.type] = (typeDistribution[memory.type] || 0) + 1;
      totalImportance += memory.importance || 0;
    });
    
    return {
      totalCount,
      typeDistribution,
      averageImportance: totalCount > 0 ? totalImportance / totalCount : 0,
      totalSize: totalCount * 1000 // Mock size
    };
  }
  
  async close() {
    this.initialized = false;
    console.log('🛑 Memory Manager closed');
  }
}

export default MemoryManager;