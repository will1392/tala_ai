/**
 * Comprehensive Search Service
 * Provides enhanced search capabilities for folders, documents, and metadata
 */

import { primaryFolderService } from './primaryFolderService';
import { folderService } from './folderService';

export interface SearchableItem {
  id: string;
  type: 'document' | 'primary-folder' | 'subfolder';
  title: string;
  description?: string;
  content?: string;
  metadata: {
    category?: string;
    tags?: string[];
    uploadedAt?: Date;
    updatedAt?: Date;
    documentCount?: number;
    size?: string;
    fileType?: string;
    folderPath?: string[];
    permissions?: any;
  };
  relevanceScore?: number;
}

export interface SearchResult extends SearchableItem {
  highlightedTitle?: string;
  highlightedDescription?: string;
  highlightedContent?: string;
  matchType: 'title' | 'description' | 'content' | 'metadata' | 'tag';
  parentFolder?: {
    id: string;
    name: string;
    type: 'primary' | 'subfolder';
  };
}

export interface SearchFilters {
  type?: ('document' | 'primary-folder' | 'subfolder')[];
  category?: string;
  fileType?: string;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  primaryFolderId?: string;
  subfolderId?: string;
  tags?: string[];
  minDocumentCount?: number;
  hasDocuments?: boolean;
}

export interface SearchOptions {
  query: string;
  filters?: SearchFilters;
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'title' | 'date' | 'size' | 'documentCount';
  sortOrder?: 'asc' | 'desc';
  includeMetadata?: boolean;
  highlightMatches?: boolean;
}

export class ComprehensiveSearchService {
  private static instance: ComprehensiveSearchService;
  private searchableItems: SearchableItem[] = [];
  private lastIndexUpdate: Date | null = null;
  private readonly REINDEX_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    if (ComprehensiveSearchService.instance) {
      return ComprehensiveSearchService.instance;
    }
    ComprehensiveSearchService.instance = this;
  }

  /**
   * Initialize or refresh the search index
   */
  async refreshIndex(userId: string = 'admin-1', isAdmin: boolean = true): Promise<void> {
    try {
      console.log('🔄 Refreshing comprehensive search index...');
      
      const [primaryFolders, subFolders, documents] = await Promise.all([
        primaryFolderService.getPrimaryFolders(userId, isAdmin),
        folderService.getFolders(userId, isAdmin),
        this.getAllDocuments(userId, isAdmin)
      ]);

      this.searchableItems = [];

      // Index primary folders
      primaryFolders.forEach(folder => {
        this.searchableItems.push({
          id: folder.id,
          type: 'primary-folder',
          title: folder.name,
          description: folder.description,
          metadata: {
            category: 'folder',
            tags: [folder.slug, 'primary-folder'],
            updatedAt: new Date(folder.createdAt),
            documentCount: folder.documentCount,
            permissions: folder.permissions,
            folderPath: [folder.name]
          }
        });
      });

      // Index sub-folders
      subFolders.forEach(folder => {
        const primaryFolder = primaryFolders.find(pf => pf.id === folder.primaryFolderId);
        const folderPath = primaryFolder ? [primaryFolder.name, folder.name] : [folder.name];
        
        this.searchableItems.push({
          id: folder.id,
          type: 'subfolder',
          title: folder.name,
          description: folder.description,
          metadata: {
            category: 'folder',
            tags: ['subfolder'],
            updatedAt: new Date(folder.createdAt),
            documentCount: folder.documentCount,
            folderPath
          }
        });
      });

      // Index documents
      documents.forEach(doc => {
        const subFolder = subFolders.find(f => f.id === doc.folderId);
        const primaryFolder = primaryFolders.find(pf => pf.id === doc.primaryFolderId);
        
        const folderPath: string[] = [];
        if (primaryFolder) folderPath.push(primaryFolder.name);
        if (subFolder) folderPath.push(subFolder.name);

        this.searchableItems.push({
          id: doc.id,
          type: 'document',
          title: doc.title,
          description: doc.excerpt,
          content: doc.content || doc.excerpt,
          metadata: {
            category: doc.category,
            tags: [doc.category, doc.fileType || 'document'],
            uploadedAt: new Date(doc.uploadedAt),
            size: doc.size,
            fileType: doc.fileType,
            folderPath
          }
        });
      });

      this.lastIndexUpdate = new Date();
      console.log(`✅ Search index refreshed: ${this.searchableItems.length} items indexed`);
    } catch (error) {
      console.error('❌ Failed to refresh search index:', error);
      throw error;
    }
  }

  /**
   * Perform comprehensive search
   */
  async search(options: SearchOptions): Promise<{
    results: SearchResult[];
    totalResults: number;
    processingTime: number;
    suggestions: string[];
  }> {
    const startTime = Date.now();
    
    // Refresh index if needed
    if (!this.lastIndexUpdate || 
        Date.now() - this.lastIndexUpdate.getTime() > this.REINDEX_INTERVAL) {
      await this.refreshIndex();
    }

    const {
      query,
      filters = {},
      limit = 20,
      offset = 0,
      sortBy = 'relevance',
      sortOrder = 'desc',
      highlightMatches = true
    } = options;

    // Perform search
    let results = this.performSearch(query, filters, highlightMatches);

    // Sort results
    results = this.sortResults(results, sortBy, sortOrder);

    // Apply pagination
    const paginatedResults = results.slice(offset, offset + limit);

    // Generate suggestions
    const suggestions = this.generateSuggestions(query, results);

    const processingTime = Date.now() - startTime;

    return {
      results: paginatedResults,
      totalResults: results.length,
      processingTime,
      suggestions
    };
  }

  /**
   * Get search suggestions based on indexed content
   */
  getSuggestions(partialQuery: string, limit: number = 8): string[] {
    const queryLower = partialQuery.toLowerCase();
    const suggestions = new Set<string>();

    // Extract suggestions from titles and descriptions
    this.searchableItems.forEach(item => {
      const words = [
        ...item.title.toLowerCase().split(/\s+/),
        ...(item.description?.toLowerCase().split(/\s+/) || [])
      ];

      words.forEach(word => {
        if (word.length > 2 && word.includes(queryLower)) {
          suggestions.add(word);
        }
      });

      // Add folder paths as suggestions
      if (item.metadata.folderPath) {
        item.metadata.folderPath.forEach(path => {
          if (path.toLowerCase().includes(queryLower)) {
            suggestions.add(`in:${path}`);
          }
        });
      }

      // Add type-specific suggestions
      if (item.type.includes(queryLower)) {
        suggestions.add(`type:${item.type}`);
      }
    });

    return Array.from(suggestions).slice(0, limit);
  }

  /**
   * Search for folders specifically
   */
  async searchFolders(query: string, includeEmpty: boolean = false): Promise<SearchResult[]> {
    const options: SearchOptions = {
      query,
      filters: {
        type: ['primary-folder', 'subfolder'],
        hasDocuments: !includeEmpty
      },
      limit: 50,
      highlightMatches: true
    };

    const result = await this.search(options);
    return result.results;
  }

  /**
   * Quick folder navigation suggestions
   */
  getFolderNavigationSuggestions(query: string): {
    id: string;
    name: string;
    type: 'primary' | 'subfolder';
    path: string[];
    documentCount: number;
  }[] {
    const queryLower = query.toLowerCase();
    const folderSuggestions: any[] = [];

    this.searchableItems
      .filter(item => item.type !== 'document')
      .forEach(item => {
        if (item.title.toLowerCase().includes(queryLower) ||
            item.metadata.folderPath?.some(path => path.toLowerCase().includes(queryLower))) {
          
          folderSuggestions.push({
            id: item.id,
            name: item.title,
            type: item.type === 'primary-folder' ? 'primary' : 'subfolder',
            path: item.metadata.folderPath || [],
            documentCount: item.metadata.documentCount || 0
          });
        }
      });

    return folderSuggestions.slice(0, 10);
  }

  private performSearch(query: string, filters: SearchFilters, highlightMatches: boolean): SearchResult[] {
    const queryLower = query.toLowerCase();
    const results: SearchResult[] = [];

    this.searchableItems.forEach(item => {
      // Apply filters
      if (!this.matchesFilters(item, filters)) {
        return;
      }

      // Calculate relevance score
      const { score, matchType } = this.calculateRelevance(item, queryLower);
      
      if (score > 0) {
        const result: SearchResult = {
          ...item,
          relevanceScore: score,
          matchType,
          parentFolder: this.getParentFolder(item)
        };

        // Add highlighting if requested
        if (highlightMatches) {
          result.highlightedTitle = this.highlightText(item.title, query);
          if (item.description) {
            result.highlightedDescription = this.highlightText(item.description, query);
          }
          if (item.content) {
            result.highlightedContent = this.highlightText(
              this.truncateContent(item.content, query), 
              query
            );
          }
        }

        results.push(result);
      }
    });

    return results;
  }

  private matchesFilters(item: SearchableItem, filters: SearchFilters): boolean {
    if (filters.type && !filters.type.includes(item.type)) {
      return false;
    }

    if (filters.category && item.metadata.category !== filters.category) {
      return false;
    }

    if (filters.fileType && item.metadata.fileType !== filters.fileType) {
      return false;
    }

    if (filters.hasDocuments !== undefined) {
      const hasDocuments = (item.metadata.documentCount || 0) > 0;
      if (filters.hasDocuments !== hasDocuments) {
        return false;
      }
    }

    if (filters.minDocumentCount && (item.metadata.documentCount || 0) < filters.minDocumentCount) {
      return false;
    }

    // Date range filtering
    if (filters.dateRange) {
      const itemDate = item.metadata.uploadedAt || item.metadata.updatedAt;
      if (itemDate) {
        if (filters.dateRange.start && itemDate < filters.dateRange.start) {
          return false;
        }
        if (filters.dateRange.end && itemDate > filters.dateRange.end) {
          return false;
        }
      }
    }

    return true;
  }

  private calculateRelevance(item: SearchableItem, queryLower: string): { score: number; matchType: SearchResult['matchType'] } {
    let score = 0;
    let matchType: SearchResult['matchType'] = 'content';

    // Title match (highest weight)
    if (item.title.toLowerCase().includes(queryLower)) {
      score += item.title.toLowerCase() === queryLower ? 100 : 50;
      matchType = 'title';
    }

    // Description match
    if (item.description?.toLowerCase().includes(queryLower)) {
      score += 30;
      if (matchType === 'content') matchType = 'description';
    }

    // Content match
    if (item.content?.toLowerCase().includes(queryLower)) {
      score += 20;
      if (matchType === 'content') matchType = 'content';
    }

    // Metadata and tags match
    if (item.metadata.category?.toLowerCase().includes(queryLower)) {
      score += 25;
      if (matchType === 'content') matchType = 'metadata';
    }

    if (item.metadata.tags?.some(tag => tag.toLowerCase().includes(queryLower))) {
      score += 15;
      if (matchType === 'content') matchType = 'tag';
    }

    // Folder path match
    if (item.metadata.folderPath?.some(path => path.toLowerCase().includes(queryLower))) {
      score += 20;
      if (matchType === 'content') matchType = 'metadata';
    }

    // Boost recent items
    if (item.metadata.uploadedAt || item.metadata.updatedAt) {
      const date = item.metadata.uploadedAt || item.metadata.updatedAt;
      const daysSince = (Date.now() - date!.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) {
        score += 10; // Recent items get a boost
      }
    }

    return { score, matchType };
  }

  private sortResults(results: SearchResult[], sortBy: string, sortOrder: string): SearchResult[] {
    return results.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'relevance':
          comparison = (b.relevanceScore || 0) - (a.relevanceScore || 0);
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'date':
          const aDate = a.metadata.uploadedAt || a.metadata.updatedAt || new Date(0);
          const bDate = b.metadata.uploadedAt || b.metadata.updatedAt || new Date(0);
          comparison = bDate.getTime() - aDate.getTime();
          break;
        case 'documentCount':
          comparison = (b.metadata.documentCount || 0) - (a.metadata.documentCount || 0);
          break;
        default:
          comparison = (b.relevanceScore || 0) - (a.relevanceScore || 0);
      }

      return sortOrder === 'desc' ? comparison : -comparison;
    });
  }

  private highlightText(text: string, query: string): string {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-300/30 text-yellow-900 px-1 rounded">$1</mark>');
  }

  private truncateContent(content: string, query: string, maxLength: number = 200): string {
    const queryIndex = content.toLowerCase().indexOf(query.toLowerCase());
    if (queryIndex === -1) {
      return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
    }

    const start = Math.max(0, queryIndex - maxLength / 2);
    const end = Math.min(content.length, start + maxLength);
    
    let excerpt = content.substring(start, end);
    if (start > 0) excerpt = '...' + excerpt;
    if (end < content.length) excerpt = excerpt + '...';
    
    return excerpt;
  }

  private getParentFolder(item: SearchableItem): SearchResult['parentFolder'] | undefined {
    if (item.type === 'document' && item.metadata.folderPath && item.metadata.folderPath.length > 0) {
      const folderPath = item.metadata.folderPath;
      return {
        id: '', // We'd need to look this up from the actual folders
        name: folderPath[folderPath.length - 1],
        type: folderPath.length === 1 ? 'primary' : 'subfolder'
      };
    }
    return undefined;
  }

  private generateSuggestions(query: string, results: SearchResult[]): string[] {
    const suggestions = new Set<string>();
    const queryLower = query.toLowerCase();

    // Add suggestions based on search results
    results.slice(0, 10).forEach(result => {
      if (result.type !== 'document') {
        suggestions.add(`in:${result.title}`);
      }
      
      if (result.metadata.category && result.metadata.category !== query) {
        suggestions.add(`type:${result.metadata.category}`);
      }
    });

    // Add common folder navigation suggestions
    if (!queryLower.includes('in:')) {
      suggestions.add('in:Destinations');
      suggestions.add('in:Suppliers');
      suggestions.add('in:Policies');
    }

    return Array.from(suggestions).slice(0, 5);
  }

  private async getAllDocuments(userId: string, isAdmin: boolean): Promise<any[]> {
    try {
      // This would integrate with your existing document service
      const response = await fetch(`http://localhost:3001/api/documents/all?userId=${userId}&isAdmin=${isAdmin}`);
      if (response.ok) {
        const data = await response.json();
        return data.documents || [];
      }
    } catch (error) {
      console.warn('Could not fetch documents for indexing:', error);
    }
    return [];
  }
}

// Export singleton instance
export const comprehensiveSearchService = new ComprehensiveSearchService();