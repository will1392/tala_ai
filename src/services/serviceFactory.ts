import { SearchService } from './searchService';
import { MockSearchService } from './mockSearchService';

/**
 * Service Factory for Tala AI
 * 
 * Automatically determines whether to use real or mock services
 * based on environment configuration and API key availability.
 */

export interface ISearchService {
  initialize(): Promise<void>;
  uploadDocument(file: File): Promise<{ documentId: string; chunksStored: number }>;
  search(query: string, filters?: any, limit?: number): Promise<any>;
  getSuggestions(partialQuery: string): Promise<string[]>;
  getStatistics(): Promise<any>;
  deleteDocument(documentId: string): Promise<void>;
  healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }>;
}

class ServiceFactory {
  private static instance: ServiceFactory;
  private searchService: ISearchService | null = null;

  private constructor() {}

  static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
    }
    return ServiceFactory.instance;
  }

  /**
   * Get the appropriate search service based on configuration
   */
  getSearchService(): ISearchService {
    if (this.searchService) {
      return this.searchService;
    }

    const isDemoMode = this.shouldUseDemoMode();
    
    if (isDemoMode) {
      console.log('🎭 Using Mock Search Service (Demo Mode)');
      this.searchService = new MockSearchService();
    } else {
      console.log('🚀 Using Real Search Service (Production Mode)');
      this.searchService = new SearchService();
    }

    return this.searchService;
  }

  /**
   * Determine if demo mode should be used
   */
  private shouldUseDemoMode(): boolean {
    // Check if explicitly set to demo mode
    const demoMode = import.meta.env.VITE_DEMO_MODE;
    if (demoMode === 'true') {
      return true;
    }

    // Check if API keys are missing (auto-enable demo mode)
    const hasQdrantConfig = !!(
      import.meta.env.VITE_QDRANT_URL && 
      import.meta.env.VITE_QDRANT_API_KEY
    );
    
    const hasOpenAIConfig = !!import.meta.env.VITE_OPENAI_API_KEY;

    if (!hasQdrantConfig || !hasOpenAIConfig) {
      console.log('⚠️ API keys not configured, falling back to Demo Mode');
      console.log('📝 To use real services, set VITE_QDRANT_URL, VITE_QDRANT_API_KEY, and VITE_OPENAI_API_KEY');
      return true;
    }

    // Check if in development and demo mode preferred
    const isDev = import.meta.env.DEV;
    const preferDemo = import.meta.env.VITE_PREFER_DEMO_MODE === 'true';
    
    if (isDev && preferDemo) {
      return true;
    }

    return false;
  }

  /**
   * Get service mode information
   */
  getServiceInfo(): {
    mode: 'demo' | 'production';
    hasQdrant: boolean;
    hasOpenAI: boolean;
    canUseReal: boolean;
  } {
    const hasQdrant = !!(
      import.meta.env.VITE_QDRANT_URL && 
      import.meta.env.VITE_QDRANT_API_KEY
    );
    
    const hasOpenAI = !!import.meta.env.VITE_OPENAI_API_KEY;
    const canUseReal = hasQdrant && hasOpenAI;
    const mode = this.shouldUseDemoMode() ? 'demo' : 'production';

    return {
      mode,
      hasQdrant,
      hasOpenAI,
      canUseReal
    };
  }

  /**
   * Force switch to demo mode (useful for testing)
   */
  forceDemoMode(): void {
    console.log('🎭 Forcing Demo Mode');
    this.searchService = new MockSearchService();
  }

  /**
   * Force switch to production mode (if API keys available)
   */
  forceProductionMode(): void {
    const info = this.getServiceInfo();
    if (!info.canUseReal) {
      throw new Error('Cannot use production mode: Missing API keys');
    }
    
    console.log('🚀 Forcing Production Mode');
    this.searchService = new SearchService();
  }

  /**
   * Reset service instance (useful for testing)
   */
  reset(): void {
    this.searchService = null;
  }
}

// Export singleton instance
export const serviceFactory = ServiceFactory.getInstance();

// Export convenience function
export const getSearchService = (): ISearchService => {
  return serviceFactory.getSearchService();
};

// Export service info function
export const getServiceInfo = () => {
  return serviceFactory.getServiceInfo();
};