import { QdrantService, type SearchResult as QdrantSearchResult, type SearchOptions } from './qdrantService';
import { DocumentProcessor } from './documentProcessor';

/**
 * Search Service for Tala AI
 * 
 * High-level search interface that combines document processing,
 * vector storage, and semantic search capabilities.
 */

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  category: string;
  fileType: string;
  score: number;
  highlights: string[];
  metadata: {
    chunkIndex: number;
    wordCount: number;
    pageNumber?: number;
    headings: string[];
    originalName: string;
    author?: string;
    uploadedAt: string;
    fileSize: number;
  };
}

export interface SearchFilters {
  category?: 'all' | 'visa' | 'airline' | 'destination' | 'agency' | 'general';
  fileType?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface SearchResponse {
  results: SearchResult[];
  totalResults: number;
  query: string;
  filters: SearchFilters;
  processingTime: number;
  suggestions?: string[];
}

export class SearchService {
  private qdrantService: QdrantService;
  private documentProcessor: DocumentProcessor;
  private isInitialized: boolean = false;

  constructor() {
    this.qdrantService = new QdrantService();
    this.documentProcessor = new DocumentProcessor();
  }

  /**
   * Initialize the search service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🚀 Initializing Tala AI Search Service...');
      
      // Initialize Qdrant collection
      await this.qdrantService.initializeCollection();
      
      // Health check
      const isHealthy = await this.qdrantService.healthCheck();
      if (!isHealthy) {
        throw new Error('Qdrant service health check failed');
      }
      
      this.isInitialized = true;
      console.log('✅ Search Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Search Service:', error);
      throw new Error(`Search Service initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload and process a document for search
   */
  async uploadDocument(file: File): Promise<{ documentId: string; chunksStored: number }> {
    await this.ensureInitialized();
    
    try {
      // Check if file type is supported
      if (!DocumentProcessor.isSupported(file.name)) {
        throw new Error(`Unsupported file type: ${file.name}`);
      }

      console.log(`📤 Processing document: ${file.name}`);
      
      // Process the document
      const processedDoc = await this.documentProcessor.processDocument(file);
      
      // Store in vector database
      await this.qdrantService.storeDocument(processedDoc);
      
      console.log(`✅ Document uploaded successfully: ${processedDoc.id}`);
      
      return {
        documentId: processedDoc.id,
        chunksStored: processedDoc.chunks.length
      };
    } catch (error) {
      console.error('❌ Document upload failed:', error);
      throw new Error(`Document upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search the knowledge base
   */
  async search(query: string, filters: SearchFilters = {}, limit: number = 10): Promise<SearchResponse> {
    await this.ensureInitialized();
    
    const startTime = Date.now();
    
    try {
      console.log(`🔍 Searching: "${query}" with filters:`, filters);
      
      // Prepare search options
      const searchOptions: SearchOptions = {
        category: filters.category !== 'all' ? filters.category : undefined,
        fileType: filters.fileType,
        limit,
        scoreThreshold: 0.7
      };

      // Perform vector search
      const qdrantResults = await this.qdrantService.search(query, searchOptions);
      
      // Transform results to our format
      const results: SearchResult[] = qdrantResults.map(result => 
        this.transformSearchResult(result, query)
      );

      // Filter by date range if specified
      const filteredResults = this.applyDateFilter(results, filters.dateRange);
      
      const response: SearchResponse = {
        results: filteredResults,
        totalResults: filteredResults.length,
        query,
        filters,
        processingTime: Date.now() - startTime,
        suggestions: this.generateSuggestions(query, filteredResults)
      };

      console.log(`✅ Search completed: ${response.totalResults} results in ${response.processingTime}ms`);
      return response;
    } catch (error) {
      console.error('❌ Search failed:', error);
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get search suggestions based on query
   */
  async getSuggestions(partialQuery: string): Promise<string[]> {
    // Basic suggestions - can be enhanced with a dedicated suggestions system
    const commonQueries = [
      'Japan visa requirements',
      'United Airlines baggage policy',
      'Schengen visa application',
      'travel insurance coverage',
      'passport renewal process',
      'airline cancellation policy',
      'visa processing time',
      'travel restrictions'
    ];

    const lowerQuery = partialQuery.toLowerCase();
    return commonQueries
      .filter(suggestion => suggestion.toLowerCase().includes(lowerQuery))
      .slice(0, 5);
  }

  /**
   * Get document statistics
   */
  async getStatistics(): Promise<{
    totalDocuments: number;
    categoryCounts: Record<string, number>;
    recentUploads: number;
  }> {
    await this.ensureInitialized();
    
    try {
      const categoryCounts = await this.qdrantService.getDocumentStats();
      const totalDocuments = Object.values(categoryCounts).reduce((sum, count) => sum + count, 0);
      
      return {
        totalDocuments,
        categoryCounts,
        recentUploads: 0 // TODO: Implement recent uploads tracking
      };
    } catch (error) {
      console.error('❌ Failed to get statistics:', error);
      return {
        totalDocuments: 0,
        categoryCounts: {},
        recentUploads: 0
      };
    }
  }

  /**
   * Delete a document from the knowledge base
   */
  async deleteDocument(documentId: string): Promise<void> {
    await this.ensureInitialized();
    
    try {
      await this.qdrantService.deleteDocument(documentId);
      console.log(`✅ Document deleted: ${documentId}`);
    } catch (error) {
      console.error('❌ Failed to delete document:', error);
      throw new Error(`Document deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Health check for the search service
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      const qdrantHealthy = await this.qdrantService.healthCheck();
      const collectionInfo = await this.qdrantService.getCollectionInfo();
      
      return {
        status: qdrantHealthy ? 'healthy' : 'unhealthy',
        details: {
          qdrant: qdrantHealthy,
          collection: collectionInfo,
          initialized: this.isInitialized
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Transform Qdrant search result to our format
   */
  private transformSearchResult(result: QdrantSearchResult, query: string): SearchResult {
    const excerpt = this.generateExcerpt(result.content, query);
    const highlights = this.generateHighlights(result.content, query);

    return {
      id: result.id,
      title: result.metadata.title,
      content: result.content,
      excerpt,
      category: result.metadata.category,
      fileType: result.document.fileType,
      score: result.score,
      highlights,
      metadata: {
        chunkIndex: result.metadata.chunkIndex,
        wordCount: result.metadata.wordCount,
        pageNumber: result.metadata.pageNumber,
        headings: result.metadata.headings,
        originalName: result.document.originalName,
        author: result.document.author,
        uploadedAt: result.document.uploadedAt,
        fileSize: result.document.fileSize
      }
    };
  }

  /**
   * Generate excerpt from content around query terms
   */
  private generateExcerpt(content: string, query: string, maxLength: number = 200): string {
    const words = query.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();
    
    // Find the best position for excerpt
    let bestPosition = 0;
    let maxMatches = 0;
    
    for (let i = 0; i < content.length - maxLength; i += 50) {
      const snippet = contentLower.substring(i, i + maxLength);
      const matches = words.reduce((count, word) => 
        count + (snippet.includes(word) ? 1 : 0), 0
      );
      
      if (matches > maxMatches) {
        maxMatches = matches;
        bestPosition = i;
      }
    }
    
    let excerpt = content.substring(bestPosition, bestPosition + maxLength);
    
    // Trim to word boundaries
    if (bestPosition > 0) {
      const firstSpace = excerpt.indexOf(' ');
      if (firstSpace > 0) excerpt = excerpt.substring(firstSpace + 1);
      excerpt = '...' + excerpt;
    }
    
    if (bestPosition + maxLength < content.length) {
      const lastSpace = excerpt.lastIndexOf(' ');
      if (lastSpace > 0) excerpt = excerpt.substring(0, lastSpace);
      excerpt = excerpt + '...';
    }
    
    return excerpt;
  }

  /**
   * Generate highlights for query terms in content
   */
  private generateHighlights(content: string, query: string): string[] {
    const words = query.toLowerCase().split(/\s+/);
    const highlights: string[] = [];
    
    words.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = content.match(regex);
      if (matches) {
        highlights.push(...matches.slice(0, 3)); // Limit highlights per word
      }
    });
    
    return [...new Set(highlights)]; // Remove duplicates
  }

  /**
   * Apply date range filter to results
   */
  private applyDateFilter(results: SearchResult[], dateRange?: { start: Date; end: Date }): SearchResult[] {
    if (!dateRange) return results;
    
    return results.filter(result => {
      const uploadDate = new Date(result.metadata.uploadedAt);
      return uploadDate >= dateRange.start && uploadDate <= dateRange.end;
    });
  }

  /**
   * Generate search suggestions based on results
   */
  private generateSuggestions(query: string, results: SearchResult[]): string[] {
    const suggestions: string[] = [];
    
    // Extract common headings from results
    const headings = results
      .flatMap(result => result.metadata.headings)
      .filter(heading => heading.toLowerCase() !== query.toLowerCase())
      .slice(0, 3);
    
    suggestions.push(...headings);
    
    // Add category-based suggestions
    const categories = [...new Set(results.map(result => result.category))];
    categories.forEach(category => {
      if (category !== 'general') {
        suggestions.push(`${query} ${category}`);
      }
    });
    
    return suggestions.slice(0, 5);
  }

  /**
   * Ensure service is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Get supported file types
   */
  static getSupportedFileTypes(): string[] {
    return DocumentProcessor.getSupportedTypes();
  }
}