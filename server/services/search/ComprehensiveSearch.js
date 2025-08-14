/**
 * Comprehensive Search Service
 * Implements multi-strategy search to ensure complete information retrieval
 */

export class ComprehensiveSearch {
  constructor(qdrantClient, openaiClient) {
    this.qdrant = qdrantClient;
    this.openai = openaiClient;
  }

  /**
   * Perform comprehensive search using multiple strategies
   */
  async search(query, conversationHistory = [], options = {}) {
    console.log('🔍 Starting comprehensive search for:', query);
    
    const results = {
      semantic: [],
      keyword: [],
      contextual: [],
      exhaustive: []
    };

    // 1. Extract search parameters
    const searchParams = await this.extractSearchParams(query, conversationHistory);
    console.log('📊 Search params:', searchParams);

    // 2. Parallel search strategies
    const [semanticResults, keywordResults, contextualResults] = await Promise.all([
      this.semanticSearch(query, searchParams),
      this.keywordSearch(searchParams.keywords),
      this.contextualSearch(query, conversationHistory)
    ]);

    results.semantic = semanticResults;
    results.keyword = keywordResults;
    results.contextual = contextualResults;

    // 3. If specific document identified, do exhaustive search
    if (searchParams.targetDocument) {
      results.exhaustive = await this.exhaustiveDocumentSearch(
        searchParams.targetDocument,
        searchParams.topic
      );
    }

    // 4. Merge and rank results
    const mergedResults = await this.mergeAndRankResults(results, query);
    
    console.log('✅ Comprehensive search complete:', {
      semanticCount: results.semantic.length,
      keywordCount: results.keyword.length,
      contextualCount: results.contextual.length,
      exhaustiveCount: results.exhaustive.length,
      finalCount: mergedResults.length
    });

    return mergedResults;
  }

  /**
   * Extract keywords, entities, and intent from query
   */
  async extractSearchParams(query, conversationHistory) {
    const prompt = `Extract search parameters from this query.
    
Query: "${query}"
Recent context: ${conversationHistory.slice(-3).map(m => m.content).join('\n')}

Extract:
1. Keywords (important terms to search for)
2. Location/Entity (e.g., country, city)
3. Topic (what information is needed)
4. Intent (what the user wants to know)

Return as JSON:`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-5-nano-2025-08-07',
        messages: [
          { role: 'system', content: 'You are a search query analyzer. Extract search parameters accurately.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 1.0,  // GPT-5 only supports temperature=1.0
        max_completion_tokens: 500  // GPT-5 uses max_completion_tokens
      });

      const params = JSON.parse(response.choices[0].message.content);
      
      // Add computed fields
      params.keywords = params.keywords || this.extractKeywords(query);
      params.targetDocument = this.identifyTargetDocument(params.location);
      
      return params;
    } catch (error) {
      console.error('Failed to extract search params:', error);
      return {
        keywords: this.extractKeywords(query),
        location: null,
        topic: query,
        intent: 'general_info'
      };
    }
  }

  /**
   * Semantic vector search (current approach)
   */
  async semanticSearch(query, params, limit = 5) {
    const embedding = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query
    });

    const results = await this.qdrant.search('tala_admin_knowledge', {
      vector: embedding.data[0].embedding,
      limit: limit,
      score_threshold: 0.4
    });

    return results.map(r => ({
      ...r,
      strategy: 'semantic',
      matchReason: 'semantic_similarity'
    }));
  }

  /**
   * Keyword-based search
   */
  async keywordSearch(keywords, limit = 10) {
    if (!keywords || keywords.length === 0) return [];

    try {
      // For now, perform semantic search with keyword-focused query
      // (Qdrant doesn't support text search without additional setup)
      const keywordQuery = keywords.join(' ');
      const embedding = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: keywordQuery
      });

      const results = await this.qdrant.search('tala_admin_knowledge', {
        vector: embedding.data[0].embedding,
        limit: limit,
        score_threshold: 0.3, // Lower threshold for broader results
        with_payload: true
      });

      // Filter results that actually contain the keywords
      const filteredResults = results.filter(r => {
        const content = (r.payload?.content || '').toLowerCase();
        return keywords.some(keyword => content.includes(keyword.toLowerCase()));
      });

      return filteredResults.map(r => ({
        ...r,
        strategy: 'keyword',
        matchReason: `keyword_match: ${keywords.join(', ')}`
      }));
    } catch (error) {
      console.error('Keyword search failed:', error);
      return [];
    }
  }

  /**
   * Context-aware search based on conversation history
   */
  async contextualSearch(query, conversationHistory) {
    if (!conversationHistory || conversationHistory.length === 0) {
      return [];
    }

    // Build enhanced query from context
    const recentContext = conversationHistory.slice(-3)
      .map(m => m.content)
      .join(' ');
    
    const enhancedQuery = `${recentContext} ${query}`;
    
    // Perform semantic search with enhanced query
    const results = await this.semanticSearch(enhancedQuery, {}, 3);
    
    return results.map(r => ({
      ...r,
      strategy: 'contextual',
      matchReason: 'conversation_context'
    }));
  }

  /**
   * Exhaustive search within a specific document
   */
  async exhaustiveDocumentSearch(documentName, topic) {
    console.log(`📄 Exhaustive search in ${documentName} for topic: ${topic}`);
    
    try {
      // First, do a broad search to get all chunks from the document
      // Using embedding search with the document name and topic
      const searchQuery = `${documentName} ${topic}`;
      const embedding = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: searchQuery
      });

      // Get more results with lower threshold for exhaustive search
      const results = await this.qdrant.search('tala_admin_knowledge', {
        vector: embedding.data[0].embedding,
        limit: 50, // Get many chunks
        score_threshold: 0.2, // Very low threshold for exhaustive coverage
        with_payload: true
      });

      // Filter for chunks that are actually from the target document AND mention the topic
      const topicKeywords = this.extractKeywords(topic);
      const relevantChunks = results.filter(chunk => {
        const title = chunk.payload?.metadata?.title || '';
        const content = (chunk.payload?.content || '').toLowerCase();
        
        // Check if it's from the right document
        const isFromDocument = title.toLowerCase().includes(documentName.toLowerCase().split(' ')[0]);
        
        // Check if it mentions the topic
        const mentionsTopic = topicKeywords.some(keyword => 
          content.includes(keyword.toLowerCase())
        );
        
        return isFromDocument && mentionsTopic;
      });

      console.log(`Found ${relevantChunks.length} chunks about ${topic} in ${documentName}`);

      return relevantChunks.map(r => ({
        ...r,
        strategy: 'exhaustive',
        matchReason: `document_scan: ${topic}`
      }));
    } catch (error) {
      console.error('Exhaustive search failed:', error);
      return [];
    }
  }

  /**
   * Merge and rank results from different strategies
   */
  async mergeAndRankResults(results, originalQuery) {
    const allResults = [
      ...results.semantic,
      ...results.keyword,
      ...results.contextual,
      ...results.exhaustive
    ];

    // Deduplicate by content similarity
    const uniqueResults = this.deduplicateResults(allResults);
    
    // Rank by relevance
    const rankedResults = await this.rankResults(uniqueResults, originalQuery);
    
    // Take top results but ensure diversity
    return this.ensureDiversity(rankedResults, 10);
  }

  /**
   * Deduplicate results based on content similarity
   */
  deduplicateResults(results) {
    const seen = new Set();
    const unique = [];
    
    for (const result of results) {
      // Create a content fingerprint
      const fingerprint = this.createFingerprint(result.payload?.content || '');
      
      if (!seen.has(fingerprint)) {
        seen.add(fingerprint);
        unique.push(result);
      } else {
        // Merge strategies if duplicate
        const existing = unique.find(u => 
          this.createFingerprint(u.payload?.content || '') === fingerprint
        );
        if (existing) {
          existing.strategies = existing.strategies || [existing.strategy];
          existing.strategies.push(result.strategy);
        }
      }
    }
    
    return unique;
  }

  /**
   * Rank results by multiple factors
   */
  async rankResults(results, query) {
    return results.sort((a, b) => {
      // Prioritize exhaustive search results
      if (a.strategy === 'exhaustive' && b.strategy !== 'exhaustive') return -1;
      if (b.strategy === 'exhaustive' && a.strategy !== 'exhaustive') return 1;
      
      // Then by number of strategies that found it
      const aStrategies = a.strategies?.length || 1;
      const bStrategies = b.strategies?.length || 1;
      if (aStrategies !== bStrategies) return bStrategies - aStrategies;
      
      // Finally by score if available
      return (b.score || 0) - (a.score || 0);
    });
  }

  /**
   * Ensure diversity in results
   */
  ensureDiversity(results, limit) {
    const diverse = [];
    const sourceCount = {};
    
    for (const result of results) {
      const source = result.payload?.metadata?.title || 'unknown';
      sourceCount[source] = (sourceCount[source] || 0) + 1;
      
      // Limit results from same source to prevent dominance
      if (sourceCount[source] <= 3) {
        diverse.push(result);
      }
      
      if (diverse.length >= limit) break;
    }
    
    return diverse;
  }

  /**
   * Extract keywords from text
   */
  extractKeywords(text) {
    // Simple keyword extraction - could be enhanced with NLP
    const stopWords = new Set(['the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'what', 'where', 'when', 'how', 'why', 'is', 'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'about', 'tell', 'me', 'please', 'like', 'want']);
    
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));
    
    // Return unique keywords
    return [...new Set(words)];
  }

  /**
   * Identify target document based on location
   */
  identifyTargetDocument(location) {
    if (!location) return null;
    
    const documentMap = {
      'england': 'England Travel Guide',
      'uk': 'England Travel Guide',
      'united kingdom': 'England Travel Guide',
      'greece': 'Greece Travel Guide',
      'iceland': 'Iceland Travel Guide',
      'italy': 'Italy Travel Guide',
      'france': 'France Travel Guide',
      'spain': 'Spain Travel Guide'
    };
    
    return documentMap[location.toLowerCase()] || null;
  }

  /**
   * Create content fingerprint for deduplication
   */
  createFingerprint(content) {
    // Simple fingerprint - take first 100 chars and last 100 chars
    const start = content.substring(0, 100);
    const end = content.substring(Math.max(0, content.length - 100));
    return `${start}...${end}`.replace(/\s+/g, ' ').toLowerCase();
  }
}

export default ComprehensiveSearch;