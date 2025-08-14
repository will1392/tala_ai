/**
 * Context-Aware Search Service
 * 
 * Enhances knowledge base searches by incorporating conversation context
 * to provide more relevant and contextual results
 */

import { KeywordExtractor } from './KeywordExtractor.js';

export class ContextAwareSearch {
  constructor() {
    this.keywordExtractor = new KeywordExtractor();
  }

  /**
   * Extract context from conversation history
   * @param {Array} messages - Array of conversation messages
   * @returns {Object} Extracted context including topics, entities, and focus
   */
  extractConversationContext(messages) {
    const context = {
      topics: new Set(),
      entities: new Set(),
      locations: new Set(),
      currentFocus: null,
      recentQuestions: []
    };

    // Process messages from oldest to newest
    messages.forEach((msg, index) => {
      const content = msg.content || msg.text || '';
      
      // Extract locations (countries, cities)
      const locationPatterns = [
        /\b(Greece|Spain|Italy|France|Portugal|Iceland|Turkey|Egypt|Morocco|Thailand|Japan|Mexico|Peru|India|Croatia|Norway)\b/gi,
        /\b(Athens|Madrid|Rome|Paris|Lisbon|Reykjavik|Istanbul|Cairo|Marrakech|Bangkok|Tokyo|Cancun|Lima|Delhi|Zagreb|Oslo)\b/gi
      ];
      
      locationPatterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          matches.forEach(location => context.locations.add(location));
        }
      });

      // Extract travel-related topics
      const topicPatterns = [
        { pattern: /\b(hotel|accommodation|stay|resort|hostel)\b/gi, topic: 'accommodation' },
        { pattern: /\b(flight|airline|airport|fly)\b/gi, topic: 'flights' },
        { pattern: /\b(restaurant|food|cuisine|eat|dining)\b/gi, topic: 'dining' },
        { pattern: /\b(attraction|sightseeing|monument|museum|tour)\b/gi, topic: 'attractions' },
        { pattern: /\b(visa|passport|document|requirement)\b/gi, topic: 'documentation' },
        { pattern: /\b(budget|cost|price|expensive|cheap)\b/gi, topic: 'budget' },
        { pattern: /\b(weather|climate|season|temperature)\b/gi, topic: 'weather' },
        { pattern: /\b(beach|mountain|city|countryside|island)\b/gi, topic: 'destination-type' }
      ];

      topicPatterns.forEach(({ pattern, topic }) => {
        if (pattern.test(content)) {
          context.topics.add(topic);
        }
      });

      // Track questions for context
      if (content.includes('?') || /\b(what|where|when|how|which|who|why)\b/i.test(content)) {
        context.recentQuestions.push({
          content: content.substring(0, 200),
          index: index
        });
      }
    });

    // Determine current focus based on recent messages
    if (messages.length > 0) {
      // Look at the last few messages to determine focus
      const recentMessages = messages.slice(-3);
      const recentLocations = new Set();
      
      recentMessages.forEach(msg => {
        const content = msg.content || msg.text || '';
        context.locations.forEach(location => {
          if (content.toLowerCase().includes(location.toLowerCase())) {
            recentLocations.add(location);
          }
        });
      });

      // Set current focus to the most recently mentioned location
      if (recentLocations.size > 0) {
        context.currentFocus = Array.from(recentLocations).pop();
      }
    }

    return {
      topics: Array.from(context.topics),
      entities: Array.from(context.entities),
      locations: Array.from(context.locations),
      currentFocus: context.currentFocus,
      recentQuestions: context.recentQuestions.slice(-3)
    };
  }

  /**
   * Build context-aware search query
   * @param {string} currentMessage - The current user message
   * @param {Object} conversationContext - Extracted conversation context
   * @returns {string} Enhanced search query
   */
  buildContextAwareQuery(currentMessage, conversationContext) {
    let enhancedQuery = currentMessage;
    
    // If the query is about a topic without location, add the current focus
    const isTopicQuery = /\b(hotel|restaurant|flight|attraction|weather|visa|beach|mountain)\b/i.test(currentMessage);
    const hasLocation = conversationContext.locations.some(loc => 
      currentMessage.toLowerCase().includes(loc.toLowerCase())
    );

    if (isTopicQuery && !hasLocation && conversationContext.currentFocus) {
      // Add location context to the query
      enhancedQuery = `${currentMessage} ${conversationContext.currentFocus}`;
      console.log(`🎯 Enhanced query with location context: "${enhancedQuery}"`);
    }

    // If query is a follow-up (e.g., "what about X?", "how about Y?")
    const followUpPatterns = [
      /^(what|how|tell me) about\s+(.+)/i,
      /^(and|also|additionally)\s+(.+)/i,
      /^(any|are there|is there)\s+(.+)/i
    ];

    const isFollowUp = followUpPatterns.some(pattern => pattern.test(currentMessage));
    if (isFollowUp && conversationContext.currentFocus) {
      // Ensure location context is included
      if (!hasLocation) {
        enhancedQuery = `${currentMessage} in ${conversationContext.currentFocus}`;
        console.log(`🎯 Enhanced follow-up query: "${enhancedQuery}"`);
      }
    }

    return enhancedQuery;
  }

  /**
   * Perform context-aware search
   * @param {Object} params - Search parameters
   * @returns {Object} Search results with context
   */
  async performContextAwareSearch(params) {
    const {
      qdrantClient,
      openaiClient,
      collectionName,
      currentMessage,
      conversationHistory,
      searchOptions = {}
    } = params;

    // Extract context from conversation history
    const conversationContext = this.extractConversationContext(conversationHistory || []);
    console.log('📊 Extracted conversation context:', {
      locations: conversationContext.locations,
      currentFocus: conversationContext.currentFocus,
      topics: conversationContext.topics
    });

    // Build context-aware query
    const contextAwareQuery = this.buildContextAwareQuery(currentMessage, conversationContext);

    // Perform enhanced search with context
    const searchResults = await this.keywordExtractor.performEnhancedSearch(
      qdrantClient,
      openaiClient,
      collectionName,
      contextAwareQuery,
      {
        ...searchOptions,
        limit: searchOptions.limit || 5,
        scoreThreshold: searchOptions.scoreThreshold || -0.2
      }
    );

    // If we have a location focus, prioritize results about that location
    if (conversationContext.currentFocus && searchResults.results) {
      searchResults.results.sort((a, b) => {
        const aHasLocation = (a.payload?.content || '').toLowerCase()
          .includes(conversationContext.currentFocus.toLowerCase());
        const bHasLocation = (b.payload?.content || '').toLowerCase()
          .includes(conversationContext.currentFocus.toLowerCase());
        
        if (aHasLocation && !bHasLocation) return -1;
        if (!aHasLocation && bHasLocation) return 1;
        return b.score - a.score;
      });
    }

    return {
      results: searchResults.results,
      query: contextAwareQuery,
      context: conversationContext
    };
  }
}

export default ContextAwareSearch;