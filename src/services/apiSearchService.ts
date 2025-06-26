import type { ISearchService } from './serviceFactory';

/**
 * API-based Search Service for Tala AI
 * 
 * Uses the backend API server to handle document processing and search,
 * avoiding CORS issues with direct Qdrant access from the browser.
 */
export class ApiSearchService implements ISearchService {
  private baseUrl: string;
  private initialized = false;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
  }

  /**
   * Initialize the service (check backend health)
   */
  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing API Search Service...');
      
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) {
        throw new Error(`Backend health check failed: ${response.status}`);
      }
      
      const health = await response.json();
      console.log('✅ Backend server is healthy:', health);
      
      this.initialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize API Search Service:', error);
      throw new Error(`API Search Service initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload and process a document
   */
  async uploadDocument(file: File, userId?: string, isAdmin: boolean = false, folderId?: string): Promise<{ documentId: string; chunksStored: number }> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('userId', userId || 'default-user');
      formData.append('isAdmin', isAdmin.toString());
      if (folderId) {
        formData.append('folderId', folderId);
      }

      console.log(`📄 Uploading document: ${file.name} for user ${userId} (admin: ${isAdmin}) to folder: ${folderId || 'none'}`);

      const response = await fetch(`${this.baseUrl}/documents/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Upload failed with status ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ Document uploaded successfully:`, result);
      
      return {
        documentId: result.documentId,
        chunksStored: result.chunksStored
      };
    } catch (error) {
      console.error('❌ Document upload failed:', error);
      throw new Error(`Document upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search documents
   */
  async search(query: string, filters?: any, limit: number = 10, userId?: string, isAdmin: boolean = false): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      console.log(`🔍 Searching for: "${query}" (user: ${userId}, admin: ${isAdmin})`);

      const response = await fetch(`${this.baseUrl}/documents/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          userId: userId || 'default-user',
          isAdmin,
          limit,
          folderId: filters?.folderId,
          scoreThreshold: 0.2
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Search failed with status ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ Search completed: ${result.totalResults} results in ${result.processingTime}ms`);
      
      return {
        results: result.results,
        totalResults: result.totalResults,
        processingTime: result.processingTime,
        query: result.query,
        suggestions: [] // Could be enhanced
      };
    } catch (error) {
      console.error('❌ Search failed:', error);
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get search suggestions
   */
  async getSuggestions(partialQuery: string): Promise<string[]> {
    // For now, return some basic suggestions
    const basicSuggestions = [
      'visa requirements',
      'travel insurance',
      'flight policies',
      'passport renewal',
      'customs regulations'
    ];
    
    return basicSuggestions.filter(suggestion => 
      suggestion.toLowerCase().includes(partialQuery.toLowerCase())
    ).slice(0, 5);
  }

  /**
   * Get document statistics
   */
  async getStatistics(): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const response = await fetch(`${this.baseUrl}/collections`);
      if (!response.ok) {
        throw new Error(`Failed to get statistics: ${response.status}`);
      }

      const collections = await response.json();
      
      return {
        totalDocuments: collections.collections?.length || 0,
        categoryCounts: {
          visa: 0,
          airline: 0, 
          destination: 0,
          agency: 0,
          general: 0
        },
        recentUploads: 0
      };
    } catch (error) {
      console.error('❌ Failed to get statistics:', error);
      return {
        totalDocuments: 0,
        categoryCounts: {
          visa: 0,
          airline: 0,
          destination: 0, 
          agency: 0,
          general: 0
        },
        recentUploads: 0
      };
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<void> {
    // TODO: Implement document deletion endpoint
    console.log(`🗑️ Document deletion not implemented yet: ${documentId}`);
    throw new Error('Document deletion not implemented yet');
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const health = await response.json();
      return {
        status: 'healthy',
        details: {
          mode: 'api',
          backend: health,
          initialized: this.initialized
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          mode: 'api',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
}