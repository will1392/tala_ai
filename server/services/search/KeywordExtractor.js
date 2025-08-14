/**
 * KeywordExtractor - Extract relevant search keywords from user queries
 * 
 * Intelligently extracts the most relevant keywords from user messages
 * to improve knowledge base search accuracy.
 */

export class KeywordExtractor {
  constructor() {
    // Common stop words to filter out
    this.stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
      'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
      'to', 'was', 'will', 'with', 'about', 'tell', 'me', 'please',
      'can', 'you', 'what', 'when', 'where', 'why', 'how', 'show',
      'give', 'find', 'search', 'look', 'get', 'need', 'want', 'like',
      'would', 'could', 'should', 'know', 'information', 'info', 'details'
    ]);
    
    // Travel-related terms that might be relevant
    this.travelTerms = new Set([
      'travel', 'trip', 'visit', 'vacation', 'holiday', 'tour', 'guide',
      'flight', 'hotel', 'accommodation', 'itinerary', 'destination',
      'airport', 'visa', 'passport', 'currency', 'weather', 'climate',
      'culture', 'cuisine', 'food', 'restaurant', 'attraction', 'sights',
      'museum', 'beach', 'mountain', 'city', 'country', 'region'
    ]);
    
    // Patterns to identify locations
    this.locationPatterns = [
      /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g, // Capitalized words (likely proper nouns)
      /\b(?:north|south|east|west|central)\s+\w+\b/gi, // Directional locations
      /\b\w+(?:land|burg|shire|stadt|ville|polis)\b/gi, // Common place suffixes
    ];
  }
  
  /**
   * Extract keywords from a user query
   * @param {string} query - The user's query
   * @param {Object} options - Extraction options
   * @returns {Object} Extracted keywords and search strategies
   */
  extractKeywords(query, options = {}) {
    const {
      includeOriginal = true,
      maxKeywords = 5,
      extractLocations = true,
      extractDates = true
    } = options;
    
    console.log('🔍 Extracting keywords from:', query);
    
    const result = {
      original: query,
      keywords: [],
      locations: [],
      dates: [],
      travelTerms: [],
      searchQueries: []
    };
    
    // Convert to lowercase for processing
    const lowerQuery = query.toLowerCase();
    
    // Extract potential locations (capitalized words)
    if (extractLocations) {
      const locations = this.extractLocations(query);
      result.locations = locations;
      result.keywords.push(...locations);
    }
    
    // Extract dates if present
    if (extractDates) {
      const dates = this.extractDates(query);
      result.dates = dates;
    }
    
    // Extract travel-related terms
    const words = lowerQuery.split(/\s+/);
    for (const word of words) {
      if (this.travelTerms.has(word) && !result.travelTerms.includes(word)) {
        result.travelTerms.push(word);
        result.keywords.push(word);
      }
    }
    
    // Extract other significant words (not stop words)
    const significantWords = words.filter(word => {
      return word.length > 2 && 
             !this.stopWords.has(word) && 
             !result.keywords.includes(word);
    });
    
    // Add significant words to keywords
    result.keywords.push(...significantWords.slice(0, maxKeywords - result.keywords.length));
    
    // Build search queries
    result.searchQueries = this.buildSearchQueries(result, includeOriginal);
    
    console.log('📌 Extracted keywords:', result);
    return result;
  }
  
  /**
   * Extract location names from query
   */
  extractLocations(query) {
    const locations = new Set();
    
    // Extract capitalized words (likely proper nouns/places)
    const capitalizedPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
    const matches = query.match(capitalizedPattern) || [];
    
    for (const match of matches) {
      // Filter out common non-location words that might be capitalized
      const nonLocations = ['I', 'Tell', 'Show', 'Give', 'Find', 'What', 'When', 'Where', 'How'];
      if (!nonLocations.includes(match)) {
        locations.add(match);
      }
    }
    
    // Check for known countries/cities (you could expand this list)
    const knownLocations = [
      'USA', 'UK', 'US', 'EU', 'UAE', 'NYC', 'LA', 'SF',
      'United States', 'United Kingdom', 'European Union',
      'America', 'Europe', 'Asia', 'Africa', 'Australia'
    ];
    
    const upperQuery = query.toUpperCase();
    for (const location of knownLocations) {
      if (upperQuery.includes(location.toUpperCase())) {
        locations.add(location);
      }
    }
    
    return Array.from(locations);
  }
  
  /**
   * Extract date references from query
   */
  extractDates(query) {
    const dates = [];
    
    // Month names
    const months = /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b/gi;
    const monthMatches = query.match(months) || [];
    dates.push(...monthMatches);
    
    // Relative dates
    const relativeDates = /\b(today|tomorrow|yesterday|weekend|next\s+week|next\s+month|this\s+week|this\s+month)\b/gi;
    const relativeMatches = query.match(relativeDates) || [];
    dates.push(...relativeMatches);
    
    // Years
    const years = /\b(19\d{2}|20\d{2})\b/g;
    const yearMatches = query.match(years) || [];
    dates.push(...yearMatches);
    
    return dates;
  }
  
  /**
   * Build optimized search queries
   */
  buildSearchQueries(extractedData, includeOriginal) {
    const queries = [];
    
    // Priority 1: Location-specific searches
    if (extractedData.locations.length > 0) {
      // Search for each location individually
      for (const location of extractedData.locations) {
        queries.push(location);
        
        // Add location + travel terms combinations
        if (extractedData.travelTerms.length > 0) {
          queries.push(`${location} ${extractedData.travelTerms[0]}`);
        }
        
        // Add location + "guide" or "travel" for better results
        queries.push(`${location} guide`);
        queries.push(`${location} travel`);
      }
    }
    
    // Priority 2: Combined keywords
    if (extractedData.keywords.length > 1) {
      queries.push(extractedData.keywords.slice(0, 3).join(' '));
    }
    
    // Priority 3: Original query (if requested and not too long)
    if (includeOriginal && extractedData.original.length < 50) {
      queries.push(extractedData.original);
    }
    
    // Remove duplicates and limit
    const uniqueQueries = Array.from(new Set(queries));
    return uniqueQueries.slice(0, 5);
  }
  
  /**
   * Enhanced search with multiple strategies
   */
  async performEnhancedSearch(qdrant, openai, collectionName, userQuery, options = {}) {
    console.log('🎯 Performing enhanced search for:', userQuery);
    
    // Extract keywords
    const extracted = this.extractKeywords(userQuery);
    
    const allResults = new Map(); // Use map to deduplicate by document ID
    
    // Search with each query strategy
    for (const searchQuery of extracted.searchQueries) {
      try {
        console.log(`🔍 Searching with query: "${searchQuery}"`);
        
        // Generate embedding for this search query
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: searchQuery,
        });
        
        const queryVector = embeddingResponse.data[0].embedding;
        
        // Search in the knowledge base
        const searchResponse = await qdrant.search(collectionName, {
          vector: queryVector,
          limit: options.limit || 5,
          score_threshold: options.scoreThreshold || -0.2,
        });
        
        // Add results to map (deduplicates by ID)
        for (const result of searchResponse) {
          const docId = result.id || `${result.payload?.metadata?.title}_${result.score}`;
          
          // Keep the result with the highest score
          if (!allResults.has(docId) || allResults.get(docId).score < result.score) {
            allResults.set(docId, result);
          }
        }
        
      } catch (error) {
        console.error(`❌ Search failed for query "${searchQuery}":`, error.message);
      }
    }
    
    // Convert back to array and sort by score
    const finalResults = Array.from(allResults.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit || 5);
    
    console.log(`✅ Enhanced search found ${finalResults.length} unique results`);
    console.log('📊 Results:', finalResults.map(r => ({
      title: r.payload?.metadata?.title || 'Unknown',
      score: r.score.toFixed(3)
    })));
    
    return {
      results: finalResults,
      metadata: {
        extractedKeywords: extracted,
        totalQueries: extracted.searchQueries.length,
        uniqueResults: finalResults.length
      }
    };
  }
}

export default KeywordExtractor;