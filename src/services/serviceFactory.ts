import { SearchService } from './searchService';
import { MockSearchService } from './mockSearchService';
import { ApiSearchService } from './apiSearchService';

/**
 * Service Factory for Tala AI
 * 
 * Automatically determines whether to use real or mock services
 * based on environment configuration and API key availability.
 */

export interface ISearchService {
  initialize(): Promise<void>;
  uploadDocument(file: File, userId?: string, isAdmin?: boolean, folderId?: string): Promise<{ documentId: string; chunksStored: number }>;
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
      console.log('🚀 Using API Search Service (Backend Mode)');
      this.searchService = new ApiSearchService();
    }

    return this.searchService;
  }

  /**
   * Determine if demo mode should be used
   */
  private shouldUseDemoMode(): boolean {
    // Check if explicitly set to demo mode
    const useMockServices = import.meta.env.VITE_USE_MOCK_SERVICES;
    if (useMockServices === 'true') {
      return true;
    }

    // In production, always use real backend API
    if (import.meta.env.VITE_ENV === 'production') {
      console.log('🚀 Production mode detected - using backend API');
      return false;
    }

    // Check if backend API URL is configured
    const hasBackendAPI = !!import.meta.env.VITE_API_URL;
    
    if (hasBackendAPI) {
      console.log('🌐 Backend API configured - using API services');
      return false;
    }

    // Check if in development and demo mode preferred
    const isDev = import.meta.env.DEV;
    const preferDemo = import.meta.env.VITE_PREFER_DEMO_MODE === 'true';
    
    if (isDev && preferDemo) {
      console.log('🎭 Demo mode preferred in development');
      return true;
    }

    // Default to demo mode if no backend configured
    console.log('⚠️ No backend API configured, falling back to Demo Mode');
    return true;
  }

  /**
   * Get service mode information
   */
  getServiceInfo(): {
    mode: 'demo' | 'production';
    hasBackendAPI: boolean;
    isProduction: boolean;
    canUseReal: boolean;
  } {
    const hasBackendAPI = !!import.meta.env.VITE_API_URL;
    const isProduction = import.meta.env.VITE_ENV === 'production';
    const canUseReal = hasBackendAPI || isProduction;
    const mode = this.shouldUseDemoMode() ? 'demo' : 'production';

    return {
      mode,
      hasBackendAPI,
      isProduction,
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