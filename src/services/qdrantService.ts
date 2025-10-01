/**
 * Qdrant Service
 * Handles vector database operations for search functionality
 */

export interface VectorSearchResult {
  id: string;
  score: number;
  payload: any;
}

export class QdrantService {
  private baseUrl: string;
  private apiKey: string;
  private collectionName: string;

  constructor(config?: {
    url?: string;
    apiKey?: string;
    collectionName?: string;
  }) {
    this.baseUrl = config?.url || process.env.VITE_QDRANT_URL || 'http://localhost:6333';
    this.apiKey = config?.apiKey || process.env.VITE_QDRANT_API_KEY || '';
    this.collectionName = config?.collectionName || 'tala_knowledge';
  }

  /**
   * Search for similar vectors
   */
  async search(
    vector: number[],
    limit: number = 5,
    filter?: any
  ): Promise<VectorSearchResult[]> {
    try {
      const response = await fetch(`${this.baseUrl}/collections/${this.collectionName}/points/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'api-key': this.apiKey })
        },
        body: JSON.stringify({
          vector,
          limit,
          filter,
          with_payload: true
        })
      });

      if (!response.ok) {
        throw new Error(`Qdrant search failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.result || [];
    } catch (error) {
      console.error('Qdrant search error:', error);
      return [];
    }
  }

  /**
   * Upsert points into collection
   */
  async upsert(points: Array<{
    id: string;
    vector: number[];
    payload: any;
  }>): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/collections/${this.collectionName}/points`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'api-key': this.apiKey })
        },
        body: JSON.stringify({
          points: points.map(p => ({
            id: p.id,
            vector: p.vector,
            payload: p.payload
          }))
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Qdrant upsert error:', error);
      return false;
    }
  }

  /**
   * Delete points from collection
   */
  async delete(ids: string[]): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/collections/${this.collectionName}/points/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'api-key': this.apiKey })
        },
        body: JSON.stringify({
          points: ids
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Qdrant delete error:', error);
      return false;
    }
  }

  /**
   * Check if collection exists
   */
  async collectionExists(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/collections/${this.collectionName}`, {
        headers: {
          ...(this.apiKey && { 'api-key': this.apiKey })
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Qdrant collection check error:', error);
      return false;
    }
  }

  /**
   * Create collection if it doesn't exist
   */
  async createCollection(dimension: number = 1536): Promise<boolean> {
    try {
      const exists = await this.collectionExists();
      if (exists) {
        return true;
      }

      const response = await fetch(`${this.baseUrl}/collections/${this.collectionName}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'api-key': this.apiKey })
        },
        body: JSON.stringify({
          vectors: {
            size: dimension,
            distance: 'Cosine'
          }
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Qdrant create collection error:', error);
      return false;
    }
  }
}