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
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  }

  private getAuthHeaders(isJson: boolean = true): Record<string, string> {
    const headers: Record<string, string> = {};
    const token = localStorage.getItem('auth_token');

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (isJson) {
      headers['Content-Type'] = 'application/json';
    }

    return headers;
  }

  /**
   * Initialize the service (check backend health)
   */
  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing API Search Service...');
      console.log('📍 API Base URL:', this.baseUrl);
      
      // Try to check if the backend is accessible
      // Use the health endpoint instead of documents to avoid auth issues
      const healthUrl = this.baseUrl.replace('/api', '/health');
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok || response.status === 503) {
        console.log('✅ Backend server is running');
        this.initialized = true;
        return;
      }
      
      // If not ok, it might still be running
      console.warn(`⚠️ Backend returned status ${response.status}, assuming it's running`);
      this.initialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize API Search Service:', error);
      console.log('⚠️ Proceeding anyway - the server might still work for uploads');
      // Don't throw error, just mark as initialized
      this.initialized = true;
    }
  }

  /**
   * Upload and process a document
   */
  async uploadDocument(file: File, userId?: string, isAdmin: boolean = false, folderId?: string, primaryFolderId?: string): Promise<{ documentId: string; chunksStored: number }> {
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
      if (primaryFolderId) {
        formData.append('primaryFolderId', primaryFolderId);
      }

      console.log(`📄 Uploading document: ${file.name} for user ${userId} (admin: ${isAdmin}) to folder: ${folderId || 'none'}, primaryFolder: ${primaryFolderId || 'none'}`);

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.error(`⏱️ Upload timeout for ${file.name} after 5 minutes`);
        controller.abort();
      }, 5 * 60 * 1000); // 5 minute timeout

      try {
        const response = await fetch(`${this.baseUrl}/documents/upload`, {
          method: 'POST',
          body: formData,
          headers: this.getAuthHeaders(false),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `Upload failed with status ${response.status}`;
          
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorJson.message || errorMessage;
            
            // Log detailed error information
            if (errorJson.details) {
              console.error(`❌ Upload error details:`, errorJson.details);
            }
            if (errorJson.troubleshooting) {
              console.error(`🔧 Troubleshooting tips:`, errorJson.troubleshooting);
            }
          } catch (parseError) {
            errorMessage = errorText || errorMessage;
          }
          
          throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log(`✅ Document uploaded successfully:`, result);
        
        return {
          documentId: result.documentId,
          chunksStored: result.chunksStored
        };
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          throw new Error(`Upload timed out after 5 minutes. The file may be too large or the server is not responding.`);
        }
        
        throw error;
      }
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
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          query,
          userId: userId || 'default-user',
          isAdmin,
          limit,
          folderId: filters?.folderId,
          primaryFolderId: filters?.primaryFolderId,
          category: filters?.category,
          fileType: filters?.fileType,
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
        results: result.results || [], // Ensure results is always an array
        totalResults: result.totalResults || 0,
        processingTime: result.processingTime || 0,
        query: result.query || query,
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
      const response = await fetch(`${this.baseUrl}/collections`, {
        headers: this.getAuthHeaders(),
      });
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
   * Get all documents with optional folder filtering
   */
  async getDocuments(userId?: string, isAdmin: boolean = false, folderId?: string, limit: number = 50, offset: number = 0, primaryFolderId?: string): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      console.log(`📄 Getting documents for user ${userId} (admin: ${isAdmin}), folder: ${folderId || 'all'}, primaryFolder: ${primaryFolderId || 'all'}`);

      const params = new URLSearchParams({
        userId: userId || 'default-user',
        isAdmin: isAdmin.toString(),
        limit: limit.toString(),
        offset: offset.toString()
      });

      if (folderId && folderId !== 'all') {
        params.append('folderId', folderId);
      }

      if (primaryFolderId) {
        params.append('primaryFolderId', primaryFolderId);
      }

      const response = await fetch(`${this.baseUrl}/documents?${params.toString()}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Get documents failed with status ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ Retrieved ${result.documents.length} documents (total: ${result.totalDocuments})`);
      
      return result;
    } catch (error) {
      console.error('❌ Get documents failed:', error);
      throw new Error(`Get documents failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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