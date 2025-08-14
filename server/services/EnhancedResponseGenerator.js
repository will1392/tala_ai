/**
 * Enhanced Response Generator for Travel Mode
 * 
 * Improves response quality through:
 * - Intelligent content extraction
 * - Multi-document synthesis (when relevant)
 * - Conversation context awareness
 * - Sophisticated prompt engineering
 * - Adaptive source selection based on relevance
 */

class EnhancedResponseGenerator {
  constructor() {
    this.MAX_CONTENT_PER_DOC = 5000;
    this.MAX_TOTAL_CONTENT = 12000;
    
    // Adaptive relevance thresholds
    this.EXCELLENT_MATCH = 0.70;  // Primary source quality
    this.GOOD_MATCH = 0.50;       // Supporting source quality
    this.FAIR_MATCH = 0.35;       // Marginal quality
    this.MIN_RELEVANCE_SCORE = 0.35; // Absolute minimum
    
    this.MAX_RESPONSE_TOKENS = 4000;  // Increased for GPT-5 to avoid cutoffs
  }

  /**
   * Generate enhanced response using relevant documents and context
   */
  async generateResponse({ 
    query, 
    searchResults, 
    conversationHistory = [], 
    openaiClient,
    userLearningContext = null
  }) {
    console.log('🎯 Enhanced Response Generator activated');
    if (userLearningContext) {
      console.log('🧠 Using personalized learning context');
    }
    
    // 1. Intelligently select and extract content from search results
    const { relevantContent, selectionMetadata } = this.selectAndExtractContent(query, searchResults);
    
    // 2. Build conversation context
    const conversationContext = this.buildConversationContext(conversationHistory);
    
    // 3. Create sophisticated prompt
    const enhancedPrompt = this.createEnhancedPrompt({
      query,
      relevantContent,
      conversationContext,
      selectionMetadata,
      userLearningContext
    });
    
    // 4. Generate response
    console.log('📝 Generating enhanced response...');
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-5-nano-2025-08-07',
      messages: [
        { 
          role: 'system', 
          content: this.getSystemPrompt(userLearningContext) 
        },
        { 
          role: 'user', 
          content: enhancedPrompt 
        }
      ],
      temperature: 1.0,  // GPT-5 only supports temperature=1.0
      max_completion_tokens: this.MAX_RESPONSE_TOKENS  // GPT-5 uses max_completion_tokens
    });
    
    return {
      response: completion.choices[0].message.content,
      sourcesUsed: relevantContent.map(c => ({
        title: c.title,
        score: c.score,
        sectionsUsed: c.sections.length
      })),
      selectionMetadata
    };
  }

  /**
   * Intelligently select which sources to use based on relevance
   */
  selectAndExtractContent(query, searchResults) {
    console.log('🔍 Analyzing', searchResults.length, 'search results for relevance');
    
    // Extract query details for matching
    const queryAnalysis = this.analyzeQuery(query);
    
    // Evaluate each result
    const evaluatedResults = searchResults.map(result => {
      const evaluation = this.evaluateRelevance(result, queryAnalysis);
      return { ...result, evaluation };
    });
    
    // Sort by relevance score
    evaluatedResults.sort((a, b) => b.score - a.score);
    
    // Apply adaptive selection logic
    const selectedDocs = this.applyAdaptiveSelection(evaluatedResults);
    
    console.log(`📊 Source selection: ${selectedDocs.length} of ${searchResults.length} documents selected`);
    
    // Extract content from selected documents
    const extractedContent = [];
    let totalContentLength = 0;
    
    for (const doc of selectedDocs) {
      if (totalContentLength >= this.MAX_TOTAL_CONTENT) break;
      
      const content = doc.payload?.content || '';
      const title = doc.payload?.metadata?.title || 'Unknown Document';
      
      // Extract relevant sections based on query
      const sections = this.findRelevantSections(query, content, title);
      
      if (sections.length > 0) {
        extractedContent.push({
          title,
          score: doc.score,
          relevanceCategory: doc.evaluation.category,
          sections
        });
        
        totalContentLength += sections.reduce((sum, s) => sum + s.content.length, 0);
      }
    }
    
    // Create selection metadata
    const selectionMetadata = {
      totalSourcesFound: searchResults.length,
      sourcesConsidered: evaluatedResults.filter(r => r.score >= this.MIN_RELEVANCE_SCORE).length,
      sourcesUsed: extractedContent.length,
      selectionStrategy: this.determineSelectionStrategy(selectedDocs),
      relevanceDistribution: {
        excellent: evaluatedResults.filter(r => r.score >= this.EXCELLENT_MATCH).length,
        good: evaluatedResults.filter(r => r.score >= this.GOOD_MATCH && r.score < this.EXCELLENT_MATCH).length,
        fair: evaluatedResults.filter(r => r.score >= this.FAIR_MATCH && r.score < this.GOOD_MATCH).length,
        poor: evaluatedResults.filter(r => r.score < this.FAIR_MATCH).length
      }
    };
    
    return { relevantContent: extractedContent, selectionMetadata };
  }

  /**
   * Analyze query to extract key information for matching
   */
  analyzeQuery(query) {
    const queryLower = query.toLowerCase();
    
    // Extract destinations
    const destinations = [];
    const destinationPatterns = [
      /\b(greece|greek|athens|santorini|mykonos)\b/i,
      /\b(spain|spanish|madrid|barcelona|seville)\b/i,
      /\b(france|french|paris|nice|lyon)\b/i,
      /\b(iceland|icelandic|reykjavik)\b/i,
      /\b(portugal|portuguese|lisbon|porto)\b/i,
      /\b(italy|italian|rome|venice|florence)\b/i,
      /\b(england|english|london|manchester)\b/i
    ];
    
    destinationPatterns.forEach(pattern => {
      const match = queryLower.match(pattern);
      if (match) destinations.push(match[1]);
    });
    
    // Extract topics
    const topics = [];
    const topicPatterns = {
      accommodation: /\b(hotel|hostel|accommodation|stay|airbnb|resort)\b/i,
      dining: /\b(restaurant|food|eat|cuisine|dining|meal)\b/i,
      activities: /\b(activity|activities|things to do|attractions|sights)\b/i,
      transportation: /\b(flight|train|bus|transport|getting there|airport)\b/i,
      weather: /\b(weather|climate|temperature|season|when to visit)\b/i,
      culture: /\b(culture|tradition|history|museum|art)\b/i,
      nature: /\b(nature|beach|mountain|park|hiking|outdoor)\b/i,
      nightlife: /\b(nightlife|bar|club|party|evening)\b/i,
      shopping: /\b(shopping|market|buy|souvenir)\b/i,
      budget: /\b(budget|cost|price|cheap|expensive|money)\b/i
    };
    
    Object.entries(topicPatterns).forEach(([topic, pattern]) => {
      if (pattern.test(queryLower)) topics.push(topic);
    });
    
    // Detect query type
    const isSpecificQuery = destinations.length > 0 || topics.length > 0;
    const isComparisonQuery = queryLower.includes(' vs ') || queryLower.includes(' or ') || queryLower.includes('compare');
    const isGeneralQuery = queryLower.includes('travel') && destinations.length === 0;
    
    return {
      original: query,
      destinations,
      topics,
      isSpecificQuery,
      isComparisonQuery,
      isGeneralQuery,
      keywords: query.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    };
  }

  /**
   * Evaluate relevance of a document to the query
   */
  evaluateRelevance(result, queryAnalysis) {
    const title = (result.payload?.metadata?.title || '').toLowerCase();
    const content = (result.payload?.content || '').toLowerCase();
    const baseScore = result.score;
    
    // Check destination match
    let destinationMatch = false;
    let wrongDestination = false;
    
    if (queryAnalysis.destinations.length > 0) {
      // Query mentions specific destinations
      queryAnalysis.destinations.forEach(dest => {
        if (title.includes(dest) || content.includes(dest)) {
          destinationMatch = true;
        }
      });
      
      // Check if document is about a different destination
      const docDestinations = this.extractDestinationsFromTitle(title);
      if (docDestinations.length > 0 && !destinationMatch) {
        wrongDestination = true;
      }
    }
    
    // Check topic match
    let topicMatch = 0;
    if (queryAnalysis.topics.length > 0) {
      queryAnalysis.topics.forEach(topic => {
        if (this.documentCoverssTopic(title, content, topic)) {
          topicMatch++;
        }
      });
    }
    
    // Determine category
    let category;
    let adjustedScore = baseScore;
    
    if (wrongDestination) {
      category = 'irrelevant';
      adjustedScore = Math.min(baseScore, 0.3); // Cap score for wrong destinations
    } else if (baseScore >= this.EXCELLENT_MATCH && (destinationMatch || !queryAnalysis.isSpecificQuery)) {
      category = 'excellent';
    } else if (baseScore >= this.GOOD_MATCH && (destinationMatch || topicMatch > 0)) {
      category = 'good';
    } else if (baseScore >= this.FAIR_MATCH) {
      category = 'fair';
    } else {
      category = 'poor';
    }
    
    return {
      category,
      baseScore,
      adjustedScore,
      destinationMatch,
      wrongDestination,
      topicMatchCount: topicMatch,
      isRelevant: category !== 'poor' && category !== 'irrelevant'
    };
  }

  /**
   * Extract destinations from document title
   */
  extractDestinationsFromTitle(title) {
    const destinations = [];
    const patterns = [
      /greece|greek/i,
      /spain|spanish/i,
      /france|french/i,
      /iceland|icelandic/i,
      /portugal|portuguese/i,
      /italy|italian/i,
      /england|english/i
    ];
    
    patterns.forEach(pattern => {
      if (pattern.test(title)) {
        destinations.push(pattern.source.toLowerCase());
      }
    });
    
    return destinations;
  }

  /**
   * Check if document covers a specific topic
   */
  documentCoverssTopic(title, content, topic) {
    const topicKeywords = {
      accommodation: ['hotel', 'hostel', 'accommodation', 'stay', 'lodging'],
      dining: ['restaurant', 'food', 'cuisine', 'dining', 'eat'],
      activities: ['activities', 'attractions', 'things to do', 'sights'],
      transportation: ['flight', 'airport', 'train', 'bus', 'transport'],
      weather: ['weather', 'climate', 'season', 'temperature'],
      culture: ['culture', 'tradition', 'history', 'museum'],
      nature: ['beach', 'mountain', 'park', 'nature', 'hiking'],
      nightlife: ['nightlife', 'bar', 'club', 'evening'],
      shopping: ['shopping', 'market', 'shop', 'buy'],
      budget: ['price', 'cost', 'budget', 'expensive', 'cheap']
    };
    
    const keywords = topicKeywords[topic] || [];
    const combinedText = (title + ' ' + content).toLowerCase();
    
    return keywords.some(keyword => combinedText.includes(keyword));
  }

  /**
   * Apply adaptive selection logic
   */
  applyAdaptiveSelection(evaluatedResults) {
    const relevant = evaluatedResults.filter(r => r.evaluation.isRelevant);
    
    if (relevant.length === 0) {
      console.log('⚠️ No relevant documents found');
      return [];
    }
    
    // Get excellent and good matches
    const excellentMatches = relevant.filter(r => r.evaluation.category === 'excellent');
    const goodMatches = relevant.filter(r => r.evaluation.category === 'good');
    const fairMatches = relevant.filter(r => r.evaluation.category === 'fair');
    
    // Decision logic
    if (excellentMatches.length === 1 && goodMatches.length === 0) {
      // Single excellent source scenario
      console.log('📌 Using single excellent source');
      return excellentMatches;
    } else if (excellentMatches.length > 0) {
      // Multiple excellent sources or excellent + good
      console.log('📌 Using excellent sources + top good matches');
      return [...excellentMatches, ...goodMatches.slice(0, 2 - excellentMatches.length)].slice(0, 3);
    } else if (goodMatches.length >= 2) {
      // Multiple good sources
      console.log('📌 Using multiple good sources');
      return goodMatches.slice(0, 3);
    } else if (goodMatches.length === 1) {
      // Single good source + fair matches
      console.log('📌 Using good source + fair matches');
      return [...goodMatches, ...fairMatches.slice(0, 2)];
    } else {
      // Only fair matches available
      console.log('📌 Using fair matches only');
      return fairMatches.slice(0, 2);
    }
  }

  /**
   * Determine selection strategy for metadata
   */
  determineSelectionStrategy(selectedDocs) {
    if (selectedDocs.length === 0) return 'no_relevant_sources';
    if (selectedDocs.length === 1) {
      if (selectedDocs[0].evaluation.category === 'excellent') {
        return 'single_excellent_source';
      }
      return 'single_source_only';
    }
    
    const categories = selectedDocs.map(d => d.evaluation.category);
    if (categories.every(c => c === 'excellent')) return 'multiple_excellent_sources';
    if (categories.includes('excellent')) return 'primary_with_supporting';
    if (categories.every(c => c === 'good')) return 'multiple_good_sources';
    
    return 'mixed_quality_sources';
  }

  /**
   * Find most relevant sections within a document
   */
  findRelevantSections(query, content, title) {
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const sections = [];
    
    // Strategy 1: Find sections with high keyword density
    const SECTION_SIZE = 1500;
    const OVERLAP = 300;
    
    for (let i = 0; i < content.length - SECTION_SIZE; i += (SECTION_SIZE - OVERLAP)) {
      const section = content.substring(i, i + SECTION_SIZE);
      const sectionLower = section.toLowerCase();
      
      // Calculate relevance score
      let relevanceScore = 0;
      queryWords.forEach(word => {
        const matches = (sectionLower.match(new RegExp(word, 'g')) || []).length;
        relevanceScore += matches;
      });
      
      // Include title keywords in scoring
      if (title.toLowerCase().includes(query.toLowerCase())) {
        relevanceScore += 5;
      }
      
      if (relevanceScore > 0) {
        sections.push({
          content: section,
          score: relevanceScore,
          start: i
        });
      }
    }
    
    // Sort by relevance and take top sections
    sections.sort((a, b) => b.score - a.score);
    
    // Take top 3 sections, avoiding too much overlap
    const selectedSections = [];
    const usedRanges = [];
    
    for (const section of sections) {
      // Check if this section overlaps too much with already selected ones
      const overlapsSignificantly = usedRanges.some(range => 
        (section.start >= range.start && section.start <= range.end) ||
        (range.start >= section.start && range.start <= section.start + SECTION_SIZE)
      );
      
      if (!overlapsSignificantly && selectedSections.length < 3) {
        selectedSections.push(section);
        usedRanges.push({ 
          start: section.start, 
          end: section.start + SECTION_SIZE 
        });
      }
    }
    
    // If no sections found with keywords, take the beginning
    if (selectedSections.length === 0 && content.length > 0) {
      selectedSections.push({
        content: content.substring(0, this.MAX_CONTENT_PER_DOC),
        score: 0,
        start: 0
      });
    }
    
    return selectedSections;
  }

  /**
   * Build conversation context summary
   */
  buildConversationContext(conversationHistory) {
    if (!conversationHistory || conversationHistory.length === 0) {
      return '';
    }
    
    // Take last 5 messages
    const recentMessages = conversationHistory.slice(-5);
    
    const context = recentMessages.map(msg => {
      const role = msg.sender === 'user' ? 'User' : 'Tala';
      const preview = msg.content.length > 200 
        ? msg.content.substring(0, 200) + '...' 
        : msg.content;
      return `${role}: ${preview}`;
    }).join('\n');
    
    return context;
  }

  /**
   * Create enhanced prompt with all content
   */
  createEnhancedPrompt({ query, relevantContent, conversationContext, selectionMetadata }) {
    let prompt = '';
    
    // Add conversation context if available
    if (conversationContext) {
      prompt += `## Previous Conversation\n${conversationContext}\n\n`;
    }
    
    // Add current query
    prompt += `## Current Question\n${query}\n\n`;
    
    // Add source selection context
    prompt += `## Source Information\n`;
    prompt += `I found ${selectionMetadata.totalSourcesFound} potential sources and selected ${selectionMetadata.sourcesUsed} most relevant ones.\n`;
    prompt += `Selection strategy: ${selectionMetadata.selectionStrategy.replace(/_/g, ' ')}\n\n`;
    
    // Add relevant content from documents
    if (relevantContent.length > 0) {
      prompt += `## Relevant Information from Travel Guides\n\n`;
      
      relevantContent.forEach((doc, index) => {
        prompt += `### Source ${index + 1}: ${doc.title} (Relevance: ${doc.score.toFixed(2)} - ${doc.relevanceCategory})\n\n`;
        
        doc.sections.forEach((section, sIndex) => {
          prompt += `**Section ${sIndex + 1}:**\n${section.content}\n\n`;
        });
        
        prompt += '---\n\n';
      });
    } else {
      prompt += `## Note\nI couldn't find highly relevant information in my travel guides for this specific query.\n\n`;
    }
    
    // Add response instructions
    prompt += `## Instructions
Please provide a response to the user's question based on the available information.

Guidelines:
1. If only one source was selected, that's because it contained comprehensive information - use it fully
2. If multiple sources were selected, synthesize information intelligently
3. Be honest about the scope of available information
4. Use specific details from the guides when available
5. Maintain conversation context if this is a follow-up question
6. If the sources don't perfectly match the query, acknowledge this and provide the most relevant information available
7. Structure your response clearly and be conversational

Remember: Quality over quantity - better to give excellent information from one source than mediocre information from many.`;
    
    return prompt;
  }

  /**
   * Get sophisticated system prompt
   */
  getSystemPrompt(userLearningContext = null) {
    let basePrompt = `You are Tala, an expert AI travel assistant with deep knowledge of destinations worldwide. Your personality is:
- Warm, enthusiastic, and genuinely excited about travel
- Professional yet approachable
- Detail-oriented and thorough
- Culturally sensitive and aware
- Honest about the limitations of your knowledge

Your responses should:
- Provide comprehensive, well-structured information when available
- Be transparent about source quality and relevance
- Include specific details like prices, timings, locations when available
- Offer practical tips and insider knowledge
- Maintain conversation continuity and context
- Be engaging and inspire wanderlust while remaining factual
- Acknowledge when information is limited or not perfectly matched to the query

You base your responses on travel guide information provided, and you're always honest about what you do and don't have information about.`;

    // Add user-specific learning context if available
    if (userLearningContext) {
      basePrompt += '\n\n===== USER PERSONALIZATION =====\n';
      
      if (userLearningContext.communicationStyle) {
        basePrompt += `\n${userLearningContext.communicationStyle}`;
      }
      
      if (userLearningContext.businessContext) {
        basePrompt += `\n${userLearningContext.businessContext}`;
      }
      
      if (userLearningContext.preferences) {
        basePrompt += `\nUser preferences:\n${userLearningContext.preferences}`;
      }
      
      if (userLearningContext.personalizedTips) {
        basePrompt += `\nPersonalized tips:\n${userLearningContext.personalizedTips.join('\n')}`;
      }
    }
    
    return basePrompt;
  }
}

export { EnhancedResponseGenerator };
export default EnhancedResponseGenerator;