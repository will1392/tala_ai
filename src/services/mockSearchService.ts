import type { SearchResult, SearchFilters, SearchResponse } from './searchService';
import { mockTravelDocuments, mockCategories, searchMockDocuments, type MockDocument } from '../data/mockTravelDocuments';

/**
 * Mock Search Service for Tala AI Demo Mode
 * 
 * Provides the same interface as SearchService but uses local mock data
 * instead of real vector database and AI services. Perfect for demos,
 * development, and testing without API keys.
 */

export class MockSearchService {
  private isInitialized: boolean = false;
  private uploadedDocuments: MockDocument[] = [...mockTravelDocuments];

  constructor() {
    console.log('🎭 Mock Search Service initialized - Demo Mode Active');
  }

  /**
   * Initialize the mock search service (instant)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Simulate initialization delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    this.isInitialized = true;
    console.log('✅ Mock Search Service initialized with', this.uploadedDocuments.length, 'documents');
  }

  /**
   * Simulate document upload and processing
   */
  async uploadDocument(file: File): Promise<{ documentId: string; chunksStored: number }> {
    await this.ensureInitialized();
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    
    try {
      console.log(`📤 [DEMO] Processing document: ${file.name}`);
      
      // Check file type support
      const supportedTypes = ['pdf', 'docx', 'xlsx', 'xls', 'txt'];
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
      
      if (!supportedTypes.includes(fileExtension)) {
        throw new Error(`Unsupported file type: ${fileExtension}`);
      }

      // Create a mock document from the uploaded file
      const mockDoc: MockDocument = {
        id: `uploaded_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' '),
        category: this.detectCategory(file.name),
        fileType: fileExtension as any,
        excerpt: `This is a mock document created from your upload: ${file.name}. In demo mode, we simulate the document processing pipeline.`,
        content: this.generateMockContent(file.name),
        metadata: {
          author: 'Demo User',
          uploadedAt: new Date().toISOString(),
          fileSize: file.size,
          wordCount: Math.floor(200 + Math.random() * 800),
          pageCount: Math.floor(1 + Math.random() * 10),
          lastModified: new Date().toISOString(),
          tags: this.generateTags(file.name)
        },
        searchableTerms: this.generateSearchTerms(file.name)
      };

      // Add to our mock database
      this.uploadedDocuments.push(mockDoc);
      
      const chunksStored = Math.floor(3 + Math.random() * 15); // 3-18 chunks
      
      console.log(`✅ [DEMO] Document uploaded: ${mockDoc.id} (${chunksStored} chunks)`);
      
      return {
        documentId: mockDoc.id,
        chunksStored
      };
    } catch (error) {
      console.error('❌ [DEMO] Document upload failed:', error);
      throw error;
    }
  }

  /**
   * Search the mock knowledge base with realistic delays and scoring
   */
  async search(query: string, filters: SearchFilters = {}, limit: number = 10): Promise<SearchResponse> {
    await this.ensureInitialized();
    
    const startTime = Date.now();
    
    // Simulate search processing time
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 700));
    
    try {
      console.log(`🔍 [DEMO] Searching: "${query}" with filters:`, filters);
      
      // Perform mock search
      const mockResults = searchMockDocuments(query, filters.category || 'all', limit * 2);
      
      // Apply additional filters
      let filteredResults = mockResults;
      
      if (filters.fileType) {
        filteredResults = filteredResults.filter(doc => doc.fileType === filters.fileType);
      }
      
      if (filters.dateRange) {
        filteredResults = filteredResults.filter(doc => {
          const uploadDate = new Date(doc.metadata.uploadedAt);
          return uploadDate >= filters.dateRange!.start && uploadDate <= filters.dateRange!.end;
        });
      }
      
      // Transform to SearchResult format
      const results: SearchResult[] = filteredResults.slice(0, limit).map((doc, index) => 
        this.transformToSearchResult(doc, query, 0.95 - (index * 0.05)) // Decreasing relevance scores
      );

      const response: SearchResponse = {
        results,
        totalResults: filteredResults.length,
        query,
        filters,
        processingTime: Date.now() - startTime,
        suggestions: this.generateSuggestions(query, results)
      };

      console.log(`✅ [DEMO] Search completed: ${response.totalResults} results in ${response.processingTime}ms`);
      return response;
    } catch (error) {
      console.error('❌ [DEMO] Search failed:', error);
      throw new Error(`Mock search failed: ${error.message}`);
    }
  }

  /**
   * Get search suggestions (enhanced for demo)
   */
  async getSuggestions(partialQuery: string): Promise<string[]> {
    // Simulate slight delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const lowerQuery = partialQuery.toLowerCase();
    
    const allTerms = this.uploadedDocuments.flatMap(doc => doc.searchableTerms);
    const matchingTerms = [...new Set(allTerms)]
      .filter(term => term.toLowerCase().includes(lowerQuery))
      .slice(0, 8);
    
    // Add some smart suggestions based on categories
    const categorySuggestions = [
      'Japan visa requirements',
      'airline baggage policy',
      'travel insurance coverage',
      'passport renewal process',
      'Schengen visa application',
      'Tokyo travel guide',
      'flight cancellation policy',
      'travel safety tips'
    ].filter(suggestion => suggestion.toLowerCase().includes(lowerQuery));
    
    return [...new Set([...categorySuggestions, ...matchingTerms])].slice(0, 5);
  }

  /**
   * Get realistic statistics
   */
  async getStatistics(): Promise<{
    totalDocuments: number;
    categoryCounts: Record<string, number>;
    recentUploads: number;
  }> {
    await this.ensureInitialized();
    
    const categoryCounts: Record<string, number> = {
      visa: this.uploadedDocuments.filter(d => d.category === 'visa').length,
      airline: this.uploadedDocuments.filter(d => d.category === 'airline').length,
      destination: this.uploadedDocuments.filter(d => d.category === 'destination').length,
      agency: this.uploadedDocuments.filter(d => d.category === 'agency').length,
      general: this.uploadedDocuments.filter(d => d.category === 'agency').length // Using agency as general
    };
    
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentUploads = this.uploadedDocuments.filter(doc => 
      new Date(doc.metadata.uploadedAt) > oneWeekAgo
    ).length;
    
    return {
      totalDocuments: this.uploadedDocuments.length,
      categoryCounts,
      recentUploads
    };
  }

  /**
   * Simulate document deletion
   */
  async deleteDocument(documentId: string): Promise<void> {
    await this.ensureInitialized();
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const index = this.uploadedDocuments.findIndex(doc => doc.id === documentId);
    if (index > -1) {
      this.uploadedDocuments.splice(index, 1);
      console.log(`🗑️ [DEMO] Document deleted: ${documentId}`);
    } else {
      throw new Error(`Document not found: ${documentId}`);
    }
  }

  /**
   * Mock health check (always healthy)
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    return {
      status: 'healthy',
      details: {
        mode: 'demo',
        documentsLoaded: this.uploadedDocuments.length,
        initialized: this.isInitialized,
        mockData: true
      }
    };
  }

  /**
   * Get current mock categories with updated counts
   */
  getMockCategories() {
    return [
      { id: 'all', label: 'All Documents', icon: '📄', count: this.uploadedDocuments.length },
      { id: 'visa', label: 'Visa Policies', icon: '🛂', count: this.uploadedDocuments.filter(d => d.category === 'visa').length },
      { id: 'airline', label: 'Airline Rules', icon: '✈️', count: this.uploadedDocuments.filter(d => d.category === 'airline').length },
      { id: 'destination', label: 'Destinations', icon: '🗺️', count: this.uploadedDocuments.filter(d => d.category === 'destination').length },
      { id: 'agency', label: 'Agency Docs', icon: '📋', count: this.uploadedDocuments.filter(d => d.category === 'agency').length },
    ];
  }

  /**
   * Private helper methods
   */

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  private detectCategory(filename: string): MockDocument['category'] {
    const name = filename.toLowerCase();
    
    if (name.includes('visa') || name.includes('passport') || name.includes('embassy')) {
      return 'visa';
    }
    if (name.includes('airline') || name.includes('flight') || name.includes('baggage')) {
      return 'airline';
    }
    if (name.includes('travel') || name.includes('guide') || name.includes('destination')) {
      return 'destination';
    }
    return 'agency';
  }

  private generateMockContent(filename: string): string {
    const category = this.detectCategory(filename);
    
    const templates = {
      visa: `Visa Requirements Document

This document contains important information about visa applications, processing times, required documentation, and embassy procedures.

Key sections include:
- Application requirements
- Supporting documentation
- Processing timeframes
- Fees and payment methods
- Embassy contact information

Please review all requirements carefully before submitting your application.`,
      
      airline: `Airline Policy Document

This document outlines current airline policies and procedures for passenger services.

Topics covered:
- Baggage allowances and restrictions
- Check-in procedures
- Cancellation and change policies
- Special assistance services
- Contact information

Policies are subject to change. Always verify current information before travel.`,
      
      destination: `Destination Travel Guide

Comprehensive information for travelers visiting this destination.

Guide includes:
- Transportation options
- Accommodation recommendations
- Local attractions and activities
- Cultural information
- Safety and health considerations
- Practical travel tips

Plan your visit with confidence using this detailed guide.`,
      
      agency: `Travel Agency Document

Important travel information and procedures for clients and staff.

Document contains:
- Booking procedures
- Customer service guidelines
- Emergency contact information
- Travel recommendations
- Policy information

For the most current information, please contact our office directly.`
    };

    return templates[category] + `\n\nDocument: ${filename}\nGenerated in demo mode for testing purposes.`;
  }

  private generateTags(filename: string): string[] {
    const category = this.detectCategory(filename);
    const baseTags = [category, 'travel', 'demo'];
    
    const categoryTags = {
      visa: ['requirements', 'application', 'embassy', 'passport'],
      airline: ['policy', 'baggage', 'flight', 'airline'],
      destination: ['guide', 'tourism', 'attractions', 'culture'],
      agency: ['procedures', 'booking', 'service', 'policy']
    };

    return [...baseTags, ...categoryTags[category]];
  }

  private generateSearchTerms(filename: string): string[] {
    const category = this.detectCategory(filename);
    const name = filename.toLowerCase().replace(/\.[^/.]+$/, "");
    const words = name.split(/[-_\s]+/);
    
    const categoryTerms = {
      visa: ['visa', 'passport', 'embassy', 'requirements', 'application'],
      airline: ['airline', 'flight', 'baggage', 'policy', 'travel'],
      destination: ['travel', 'guide', 'destination', 'tourism', 'culture'],
      agency: ['agency', 'travel', 'booking', 'service', 'policy']
    };

    return [...words, ...categoryTerms[category], category, 'travel'];
  }

  private transformToSearchResult(doc: MockDocument, query: string, score: number): SearchResult {
    return {
      id: doc.id,
      title: doc.title,
      content: doc.content,
      excerpt: doc.excerpt,
      category: doc.category,
      fileType: doc.fileType,
      score: Math.min(score, 0.98), // Cap at 98% to look realistic
      highlights: this.generateHighlights(doc.content, query),
      metadata: {
        chunkIndex: 0,
        wordCount: doc.metadata.wordCount,
        pageNumber: 1,
        headings: this.extractHeadings(doc.content),
        originalName: doc.title,
        author: doc.metadata.author,
        uploadedAt: doc.metadata.uploadedAt,
        fileSize: doc.metadata.fileSize
      }
    };
  }

  private generateHighlights(content: string, query: string): string[] {
    if (!query.trim()) return [];
    
    const words = query.toLowerCase().split(/\s+/);
    const highlights: string[] = [];
    
    words.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = content.match(regex);
      if (matches) {
        highlights.push(...matches.slice(0, 2));
      }
    });
    
    return [...new Set(highlights)].slice(0, 5);
  }

  private extractHeadings(content: string): string[] {
    const lines = content.split('\n');
    const headings = lines
      .filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 0 && 
               trimmed.length < 80 && 
               (trimmed.endsWith(':') || /^[A-Z][^.]*$/.test(trimmed));
      })
      .slice(0, 3);
    
    return headings;
  }

  private generateSuggestions(query: string, results: SearchResult[]): string[] {
    const suggestions: string[] = [];
    
    // Extract terms from results
    const terms = results.flatMap(result => 
      result.highlights.concat(result.metadata.headings)
    );
    
    // Add category-based suggestions
    const categories = [...new Set(results.map(r => r.category))];
    categories.forEach(category => {
      if (category !== 'general') {
        suggestions.push(`${query} ${category}`);
      }
    });
    
    // Add popular search variations
    if (query.toLowerCase().includes('visa')) {
      suggestions.push('visa requirements', 'visa processing time', 'visa fees');
    }
    if (query.toLowerCase().includes('airline')) {
      suggestions.push('baggage policy', 'cancellation policy', 'airline fees');
    }
    
    return [...new Set(suggestions)].slice(0, 5);
  }

  /**
   * Get supported file types (same as real service)
   */
  static getSupportedFileTypes(): string[] {
    return ['pdf', 'docx', 'xlsx', 'xls', 'txt'];
  }
}