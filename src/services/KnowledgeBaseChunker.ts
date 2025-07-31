// Knowledge Base Chunker Service
// Handles progressive loading of large knowledge bases

interface KnowledgeChunk {
  id: string;
  category: string;
  items: any[];
  size: number;
  loaded: boolean;
}

interface ChunkLoadOptions {
  chunkSize?: number;
  priority?: 'high' | 'medium' | 'low';
  preload?: boolean;
}

class KnowledgeBaseChunker {
  private chunks: Map<string, KnowledgeChunk> = new Map();
  private loadQueue: string[] = [];
  private isLoading = false;
  private loadedSize = 0;
  private totalSize = 0;

  // Initialize chunker with knowledge base metadata
  initialize(categories: string[], estimatedSizes: Record<string, number>) {
    this.totalSize = 0;
    
    categories.forEach(category => {
      const size = estimatedSizes[category] || 1000;
      this.totalSize += size;
      
      this.chunks.set(category, {
        id: category,
        category,
        items: [],
        size,
        loaded: false
      });
    });
  }

  // Load a specific chunk
  async loadChunk(chunkId: string, options: ChunkLoadOptions = {}): Promise<KnowledgeChunk> {
    const chunk = this.chunks.get(chunkId);
    if (!chunk) {
      throw new Error(`Chunk ${chunkId} not found`);
    }

    if (chunk.loaded) {
      return chunk;
    }

    // Add to queue if not already loading
    if (!this.loadQueue.includes(chunkId)) {
      if (options.priority === 'high') {
        this.loadQueue.unshift(chunkId);
      } else {
        this.loadQueue.push(chunkId);
      }
    }

    // Start loading if not already
    if (!this.isLoading) {
      this.processLoadQueue();
    }

    // Wait for chunk to load
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const updatedChunk = this.chunks.get(chunkId);
        if (updatedChunk?.loaded) {
          clearInterval(checkInterval);
          resolve(updatedChunk);
        }
      }, 100);
    });
  }

  // Load multiple chunks
  async loadChunks(chunkIds: string[], options: ChunkLoadOptions = {}): Promise<KnowledgeChunk[]> {
    const promises = chunkIds.map(id => this.loadChunk(id, options));
    return Promise.all(promises);
  }

  // Get chunk by ID without loading
  getChunk(chunkId: string): KnowledgeChunk | undefined {
    return this.chunks.get(chunkId);
  }

  // Get all loaded chunks
  getLoadedChunks(): KnowledgeChunk[] {
    return Array.from(this.chunks.values()).filter(chunk => chunk.loaded);
  }

  // Get loading progress
  getProgress(): { loaded: number; total: number; percentage: number } {
    const percentage = this.totalSize > 0 ? (this.loadedSize / this.totalSize) * 100 : 0;
    return {
      loaded: this.loadedSize,
      total: this.totalSize,
      percentage: Math.round(percentage)
    };
  }

  // Preload high-priority chunks
  async preloadPriorityChunks(categories: string[]) {
    await this.loadChunks(categories, { priority: 'high', preload: true });
  }

  // Process load queue
  private async processLoadQueue() {
    if (this.isLoading || this.loadQueue.length === 0) {
      return;
    }

    this.isLoading = true;

    while (this.loadQueue.length > 0) {
      const chunkId = this.loadQueue.shift()!;
      const chunk = this.chunks.get(chunkId);
      
      if (chunk && !chunk.loaded) {
        try {
          // Simulate loading from API or storage
          const items = await this.fetchChunkData(chunkId);
          
          chunk.items = items;
          chunk.loaded = true;
          this.loadedSize += chunk.size;
          
          // Notify progress
          this.onProgress?.(this.getProgress());
        } catch (error) {
          console.error(`Failed to load chunk ${chunkId}:`, error);
          // Re-add to queue for retry
          this.loadQueue.push(chunkId);
        }
      }
    }

    this.isLoading = false;
  }

  // Fetch chunk data (mock implementation)
  private async fetchChunkData(chunkId: string): Promise<any[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));

    // Return mock data based on category
    const mockData: Record<string, any[]> = {
      'seo-tools': [
        { id: 'keyword-research', name: 'Keyword Research Tool', description: 'Find relevant keywords' },
        { id: 'serp-analyzer', name: 'SERP Analyzer', description: 'Analyze search results' },
        { id: 'backlink-checker', name: 'Backlink Checker', description: 'Check backlinks' }
      ],
      'email-tools': [
        { id: 'subject-tester', name: 'Subject Line Tester', description: 'Test email subjects' },
        { id: 'spam-checker', name: 'Spam Checker', description: 'Check spam score' },
        { id: 'template-builder', name: 'Template Builder', description: 'Build email templates' }
      ],
      'social-tools': [
        { id: 'post-scheduler', name: 'Post Scheduler', description: 'Schedule social posts' },
        { id: 'hashtag-gen', name: 'Hashtag Generator', description: 'Generate hashtags' },
        { id: 'analytics-dashboard', name: 'Analytics Dashboard', description: 'Track performance' }
      ],
      'content-tools': [
        { id: 'blog-writer', name: 'Blog Writer', description: 'AI blog writing' },
        { id: 'outline-gen', name: 'Outline Generator', description: 'Create content outlines' },
        { id: 'readability', name: 'Readability Checker', description: 'Check readability' }
      ]
    };

    return mockData[chunkId] || [];
  }

  // Progress callback
  onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void;

  // Unload chunk to free memory
  unloadChunk(chunkId: string) {
    const chunk = this.chunks.get(chunkId);
    if (chunk && chunk.loaded) {
      chunk.items = [];
      chunk.loaded = false;
      this.loadedSize -= chunk.size;
    }
  }

  // Clear all chunks
  clear() {
    this.chunks.clear();
    this.loadQueue = [];
    this.loadedSize = 0;
    this.totalSize = 0;
    this.isLoading = false;
  }
}

// Export singleton instance
export const knowledgeBaseChunker = new KnowledgeBaseChunker();

// Export types
export type { KnowledgeChunk, ChunkLoadOptions };