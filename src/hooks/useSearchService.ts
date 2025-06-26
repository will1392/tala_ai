import { useState, useEffect, useCallback } from 'react';
import { getSearchService, getServiceInfo, type ISearchService } from '../services/serviceFactory';
import type { SearchResult, SearchResponse, SearchFilters } from '../services/searchService';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

/**
 * Custom hook for managing search service interactions
 * Handles initialization, loading states, and error management
 */

export interface UseSearchServiceReturn {
  // Service state
  searchService: ISearchService | null;
  isInitialized: boolean;
  isInitializing: boolean;
  serviceInfo: ReturnType<typeof getServiceInfo>;
  
  // Search state
  searchResults: SearchResult[];
  isSearching: boolean;
  searchQuery: string;
  totalResults: number;
  processingTime: number;
  suggestions: string[];
  
  // Upload state
  isUploading: boolean;
  uploadProgress: number;
  
  // Actions
  search: (query: string, filters?: SearchFilters, limit?: number) => Promise<void>;
  uploadDocument: (file: File, folderId?: string) => Promise<{ documentId: string; chunksStored: number }>;
  deleteDocument: (documentId: string) => Promise<void>;
  getSuggestions: (partialQuery: string) => Promise<string[]>;
  getStatistics: () => Promise<any>;
  clearResults: () => void;
  
  // Error state
  error: string | null;
  clearError: () => void;
}

export const useSearchService = (): UseSearchServiceReturn => {
  // Auth context
  const { user } = useAuthStore();
  
  // Service state
  const [searchService, setSearchService] = useState<ISearchService | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [serviceInfo] = useState(() => getServiceInfo());
  
  // Search state
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalResults, setTotalResults] = useState(0);
  const [processingTime, setProcessingTime] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Error state
  const [error, setError] = useState<string | null>(null);

  // Initialize search service
  const initializeService = useCallback(async () => {
    if (isInitialized || isInitializing) return;
    
    setIsInitializing(true);
    setError(null);
    
    try {
      const service = getSearchService();
      await service.initialize();
      
      setSearchService(service);
      setIsInitialized(true);
      
      // Show service mode notification
      if (serviceInfo.mode === 'demo') {
        toast.success('🎭 Demo Mode Active - Using mock data', { 
          duration: 3000,
          icon: '🎭' 
        });
      } else {
        toast.success('🚀 Production Mode - Connected to AI services', {
          duration: 3000,
          icon: '🚀'
        });
      }
      
      console.log(`✅ Search service initialized in ${serviceInfo.mode} mode`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize search service';
      setError(message);
      toast.error(`❌ ${message}`);
      console.error('❌ Search service initialization failed:', err);
    } finally {
      setIsInitializing(false);
    }
  }, [isInitialized, isInitializing, serviceInfo.mode]);

  // Initialize on mount
  useEffect(() => {
    initializeService();
  }, [initializeService]);

  // Search function
  const search = useCallback(async (
    query: string, 
    filters: SearchFilters = {}, 
    limit: number = 10
  ) => {
    if (!searchService) {
      setError('Search service not initialized');
      return;
    }

    setIsSearching(true);
    setError(null);
    setSearchQuery(query);

    try {
      const response: SearchResponse = await searchService.search(
        query, 
        filters, 
        limit, 
        user?.id, 
        user?.role === 'admin'
      );
      
      setSearchResults(response.results);
      setTotalResults(response.totalResults);
      setProcessingTime(response.processingTime);
      setSuggestions(response.suggestions || []);
      
      console.log(`🔍 Search completed: "${query}" - ${response.totalResults} results in ${response.processingTime}ms`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      setError(message);
      toast.error(`❌ ${message}`);
      console.error('❌ Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  }, [searchService, user]);

  // Upload document function
  const uploadDocument = useCallback(async (file: File, folderId?: string) => {
    if (!searchService) {
      throw new Error('Search service not initialized');
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Simulate upload progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + Math.random() * 15, 85));
      }, 200);

      const result = await searchService.uploadDocument(file, user?.id, user?.role === 'admin', folderId);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      toast.success(`✅ Document uploaded: ${result.chunksStored} chunks processed`, {
        duration: 4000
      });
      
      console.log(`📤 Document uploaded: ${file.name} - ${result.chunksStored} chunks`);
      
      // Reset progress after a delay
      setTimeout(() => {
        setUploadProgress(0);
      }, 1000);
      
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      toast.error(`❌ ${message}`);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, [searchService, user]);

  // Delete document function
  const deleteDocument = useCallback(async (documentId: string) => {
    if (!searchService) {
      throw new Error('Search service not initialized');
    }

    try {
      await searchService.deleteDocument(documentId);
      
      // Remove from current results if present
      setSearchResults(prev => prev.filter(result => result.id !== documentId));
      setTotalResults(prev => Math.max(0, prev - 1));
      
      toast.success('🗑️ Document deleted successfully');
      console.log(`🗑️ Document deleted: ${documentId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      setError(message);
      toast.error(`❌ ${message}`);
      throw err;
    }
  }, [searchService]);

  // Get suggestions function
  const getSuggestionsFn = useCallback(async (partialQuery: string) => {
    if (!searchService || !partialQuery.trim()) {
      return [];
    }

    try {
      const suggestions = await searchService.getSuggestions(partialQuery);
      return suggestions;
    } catch (err) {
      console.warn('⚠️ Failed to get suggestions:', err);
      return [];
    }
  }, [searchService]);

  // Get statistics function
  const getStatistics = useCallback(async () => {
    if (!searchService) {
      throw new Error('Search service not initialized');
    }

    try {
      const stats = await searchService.getStatistics();
      return stats;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get statistics';
      setError(message);
      throw err;
    }
  }, [searchService]);

  // Clear results function
  const clearResults = useCallback(() => {
    setSearchResults([]);
    setTotalResults(0);
    setSearchQuery('');
    setSuggestions([]);
    setProcessingTime(0);
  }, []);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Service state
    searchService,
    isInitialized,
    isInitializing,
    serviceInfo,
    
    // Search state
    searchResults,
    isSearching,
    searchQuery,
    totalResults,
    processingTime,
    suggestions,
    
    // Upload state
    isUploading,
    uploadProgress,
    
    // Actions
    search,
    uploadDocument,
    deleteDocument,
    getSuggestions: getSuggestionsFn,
    getStatistics,
    clearResults,
    
    // Error state
    error,
    clearError
  };
};