/**
 * EntityExtractor - Advanced Entity Extraction for Travel Conversations
 * 
 * Extracts people, places, dates, preferences, and travel-specific entities
 * from conversation text using multiple extraction methods including regex,
 * NLP patterns, and LLM-based extraction.
 */

import OpenAI from 'openai';
import contextConfig from '../../config/context.js';

export class EntityExtractor {
  constructor(options = {}) {
    this.options = {
      enableLLMExtraction: options.enableLLMExtraction !== false,
      enablePatternExtraction: options.enablePatternExtraction !== false,
      enableKeywordExtraction: options.enableKeywordExtraction !== false,
      confidenceThreshold: options.confidenceThreshold || 0.6,
      ...options
    };
    
    // Initialize OpenAI for LLM-based extraction
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.config = contextConfig;
    this.initialized = false;
    
    // Cache for entity patterns and results
    this.patternCache = new Map();
    this.entityCache = new Map();
  }

  /**
   * Initialize the entity extractor
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      console.log('🔍 Initializing EntityExtractor...');
      
      // Compile regex patterns for better performance
      this.compilePatterns();
      
      // Test OpenAI connection if LLM extraction is enabled
      if (this.options.enableLLMExtraction) {
        await this.testLLMConnection();
      }
      
      this.initialized = true;
      console.log('✅ EntityExtractor initialized successfully');
      
    } catch (error) {
      console.error('❌ EntityExtractor initialization failed:', error);
      throw error;
    }
  }

  /**
   * Extract entities from text using multiple methods
   * @param {string} text - Text to extract entities from
   * @param {Object} context - Context information (messageId, userId, etc.)
   * @returns {Array} Array of extracted entities
   */
  async extractFromText(text, context = {}) {
    try {
      this.ensureInitialized();
      
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return [];
      }
      
      const cacheKey = this.generateCacheKey(text, context);
      if (this.entityCache.has(cacheKey)) {
        return this.entityCache.get(cacheKey);
      }
      
      const allEntities = [];
      
      // Method 1: Pattern-based extraction (regex and keyword matching)
      if (this.options.enablePatternExtraction) {
        const patternEntities = await this.extractWithPatterns(text, context);
        allEntities.push(...patternEntities);
      }
      
      // Method 2: Keyword-based extraction
      if (this.options.enableKeywordExtraction) {
        const keywordEntities = await this.extractWithKeywords(text, context);
        allEntities.push(...keywordEntities);
      }
      
      // Method 3: LLM-based extraction for complex entities
      if (this.options.enableLLMExtraction) {
        const llmEntities = await this.extractWithLLM(text, context);
        allEntities.push(...llmEntities);
      }
      
      // Deduplicate and merge entities
      const deduplicatedEntities = this.deduplicateEntities(allEntities);
      
      // Filter by confidence threshold
      const filteredEntities = deduplicatedEntities.filter(
        entity => entity.confidence >= this.options.confidenceThreshold
      );
      
      // Enhance entities with relationships
      const enhancedEntities = this.enhanceWithRelationships(filteredEntities);
      
      // Cache results
      this.entityCache.set(cacheKey, enhancedEntities);
      
      return enhancedEntities;
      
    } catch (error) {
      console.error('Error extracting entities from text:', error);
      return [];
    }
  }

  /**
   * Extract travel-specific entities using regex patterns
   * @param {string} text - Text to analyze
   * @param {Object} context - Context information
   * @returns {Array} Pattern-matched entities
   */
  async extractWithPatterns(text, context) {
    const entities = [];
    
    try {
      // Extract destinations
      const destinations = this.extractDestinations(text, context);
      entities.push(...destinations);
      
      // Extract dates
      const dates = this.extractDates(text, context);
      entities.push(...dates);
      
      // Extract airlines
      const airlines = this.extractAirlines(text, context);
      entities.push(...airlines);
      
      // Extract hotels
      const hotels = this.extractHotels(text, context);
      entities.push(...hotels);
      
      // Extract budget information
      const budgets = this.extractBudgetInfo(text, context);
      entities.push(...budgets);
      
      // Extract passport/document info
      const documents = this.extractDocuments(text, context);
      entities.push(...documents);
      
      return entities;
      
    } catch (error) {
      console.error('Error in pattern extraction:', error);
      return [];
    }
  }

  /**
   * Extract entities using keyword matching
   * @param {string} text - Text to analyze
   * @param {Object} context - Context information
   * @returns {Array} Keyword-matched entities
   */
  async extractWithKeywords(text, context) {
    const entities = [];
    const lowerText = text.toLowerCase();
    
    try {
      // Extract dietary restrictions
      const dietaryKeywords = this.config.ENTITY_TYPES.PERSONAL.dietary_restriction.keywords;
      for (const keyword of dietaryKeywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          entities.push({
            type: 'dietary_restriction',
            value: keyword,
            confidence: 0.8,
            context: this.extractSurroundingContext(text, keyword),
            extractionMethod: 'keyword',
            ...this.addContextInfo(context)
          });
        }
      }
      
      // Extract accessibility needs
      const accessibilityKeywords = this.config.ENTITY_TYPES.PERSONAL.accessibility_need.keywords;
      for (const keyword of accessibilityKeywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          entities.push({
            type: 'accessibility_need',
            value: keyword,
            confidence: 0.8,
            context: this.extractSurroundingContext(text, keyword),
            extractionMethod: 'keyword',
            ...this.addContextInfo(context)
          });
        }
      }
      
      return entities;
      
    } catch (error) {
      console.error('Error in keyword extraction:', error);
      return [];
    }
  }

  /**
   * Extract entities using LLM for complex analysis
   * @param {string} text - Text to analyze
   * @param {Object} context - Context information
   * @returns {Array} LLM-extracted entities
   */
  async extractWithLLM(text, context) {
    try {
      if (!this.options.enableLLMExtraction || text.length < 20) {
        return [];
      }
      
      const prompt = `
        Extract travel and personal information from this text. Return a JSON array of entities with this exact format:
        
        [
          {
            "type": "destination|airline|hotel|date|dietary_restriction|accessibility_need|budget_preference|passport_info|travel_companion|activity_preference|contact_info",
            "value": "extracted value",
            "confidence": 0.0-1.0,
            "context": "surrounding context",
            "properties": {}
          }
        ]
        
        Focus on:
        - Travel destinations and locations
        - Airlines, hotels, and travel services
        - Important dates (departure, return, passport expiry)
        - Personal preferences and restrictions
        - Budget information
        - Travel companions
        - Activities and experiences
        - Contact information
        - Document details (passport, visa)
        
        Text to analyze: "${text}"
        
        Return only the JSON array, no other text:
      `;
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert travel information extractor. Extract entities with high accuracy and appropriate confidence scores. Return only valid JSON arrays.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      });
      
      const responseText = response.choices[0]?.message?.content?.trim();
      if (!responseText) return [];
      
      // Parse JSON response
      let entities = [];
      try {
        entities = JSON.parse(responseText);
        if (!Array.isArray(entities)) {
          console.warn('LLM response is not an array:', responseText);
          return [];
        }
      } catch (parseError) {
        console.warn('Failed to parse LLM response as JSON:', responseText);
        return [];
      }
      
      // Enhance entities with context info
      return entities.map(entity => ({
        ...entity,
        extractionMethod: 'llm',
        ...this.addContextInfo(context)
      }));
      
    } catch (error) {
      console.error('Error in LLM extraction:', error);
      return [];
    }
  }

  /**
   * Extract destination entities using patterns
   */
  extractDestinations(text, context) {
    const entities = [];
    const patterns = this.config.ENTITY_TYPES.TRAVEL.destination.patterns;
    
    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].trim().length > 2) {
          const destination = match[1].trim();
          entities.push({
            type: 'destination',
            value: destination,
            confidence: this.calculatePatternConfidence(destination, 'destination'),
            context: this.extractSurroundingContext(text, destination),
            extractionMethod: 'regex',
            ...this.addContextInfo(context)
          });
        }
      }
    }
    
    return entities;
  }

  /**
   * Extract date entities using patterns
   */
  extractDates(text, context) {
    const entities = [];
    const patterns = this.config.ENTITY_TYPES.TRAVEL.date.patterns;
    
    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          const dateStr = match[1].trim();
          const parsedDate = this.parseDate(dateStr);
          
          entities.push({
            type: 'date',
            value: dateStr,
            confidence: parsedDate ? 0.9 : 0.6,
            context: this.extractSurroundingContext(text, dateStr),
            extractionMethod: 'regex',
            properties: {
              parsed_date: parsedDate,
              is_future: parsedDate ? new Date(parsedDate) > new Date() : null
            },
            extractedDate: parsedDate,
            ...this.addContextInfo(context)
          });
        }
      }
    }
    
    return entities;
  }

  /**
   * Extract airline entities using patterns
   */
  extractAirlines(text, context) {
    const entities = [];
    const patterns = this.config.ENTITY_TYPES.TRAVEL.airline.patterns;
    
    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const airline = match[1] || match[0];
        if (airline && airline.trim().length > 2) {
          entities.push({
            type: 'airline',
            value: airline.trim(),
            confidence: 0.8,
            context: this.extractSurroundingContext(text, airline),
            extractionMethod: 'regex',
            ...this.addContextInfo(context)
          });
        }
      }
    }
    
    return entities;
  }

  /**
   * Extract hotel entities using patterns
   */
  extractHotels(text, context) {
    const entities = [];
    const patterns = this.config.ENTITY_TYPES.TRAVEL.hotel.patterns;
    
    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const hotel = match[1] || match[0];
        if (hotel && hotel.trim().length > 2) {
          entities.push({
            type: 'hotel',
            value: hotel.trim(),
            confidence: 0.8,
            context: this.extractSurroundingContext(text, hotel),
            extractionMethod: 'regex',
            ...this.addContextInfo(context)
          });
        }
      }
    }
    
    return entities;
  }

  /**
   * Extract budget information using patterns
   */
  extractBudgetInfo(text, context) {
    const entities = [];
    const patterns = this.config.ENTITY_TYPES.PERSONAL.budget_preference.patterns;
    
    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          const amount = match[1].replace(/,/g, '');
          const numAmount = parseFloat(amount);
          
          if (!isNaN(numAmount) && numAmount > 0) {
            entities.push({
              type: 'budget_preference',
              value: `$${numAmount.toLocaleString()}`,
              confidence: 0.9,
              context: this.extractSurroundingContext(text, match[0]),
              extractionMethod: 'regex',
              properties: {
                amount: numAmount,
                currency: 'USD'
              },
              ...this.addContextInfo(context)
            });
          }
        }
      }
    }
    
    return entities;
  }

  /**
   * Extract document information (passport, visa)
   */
  extractDocuments(text, context) {
    const entities = [];
    const passportPatterns = this.config.ENTITY_TYPES.DOCUMENTS.passport.patterns;
    
    for (const pattern of passportPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          entities.push({
            type: 'passport_info',
            value: match[1].trim(),
            confidence: 0.95,
            context: this.extractSurroundingContext(text, match[0]),
            extractionMethod: 'regex',
            properties: {
              document_type: 'passport',
              is_expiry: match[0].toLowerCase().includes('expir')
            },
            ...this.addContextInfo(context)
          });
        }
      }
    }
    
    return entities;
  }

  /**
   * Deduplicate entities and merge similar ones
   */
  deduplicateEntities(entities) {
    const entityMap = new Map();
    
    for (const entity of entities) {
      const key = `${entity.type}:${entity.value.toLowerCase().trim()}`;
      const existing = entityMap.get(key);
      
      if (!existing) {
        entityMap.set(key, entity);
      } else {
        // Keep the one with higher confidence
        if (entity.confidence > existing.confidence) {
          entityMap.set(key, {
            ...entity,
            extractionMethod: [existing.extractionMethod, entity.extractionMethod].join(',')
          });
        }
      }
    }
    
    return Array.from(entityMap.values());
  }

  /**
   * Enhance entities with relationship information
   */
  enhanceWithRelationships(entities) {
    const enhanced = [];
    
    for (const entity of entities) {
      const relationships = this.findEntityRelationships(entity, entities);
      enhanced.push({
        ...entity,
        relationships
      });
    }
    
    return enhanced;
  }

  /**
   * Find relationships between entities
   */
  findEntityRelationships(entity, allEntities) {
    const relationships = [];
    
    // Find temporal relationships
    if (entity.type === 'destination') {
      const relatedDates = allEntities.filter(e => 
        e.type === 'date' && 
        Math.abs(e.position - entity.position) < 100 // Within 100 characters
      );
      
      if (relatedDates.length > 0) {
        relationships.push({
          type: 'temporal',
          related_entities: relatedDates.map(d => d.value)
        });
      }
    }
    
    // Find service relationships (destination -> airline/hotel)
    if (entity.type === 'destination') {
      const relatedServices = allEntities.filter(e => 
        ['airline', 'hotel'].includes(e.type) &&
        Math.abs(e.position - entity.position) < 200
      );
      
      if (relatedServices.length > 0) {
        relationships.push({
          type: 'service',
          related_entities: relatedServices.map(s => ({ type: s.type, value: s.value }))
        });
      }
    }
    
    return relationships;
  }

  // Helper methods

  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('EntityExtractor not initialized. Call initialize() first.');
    }
  }

  compilePatterns() {
    // Pre-compile regex patterns for better performance
    for (const category of Object.values(this.config.ENTITY_TYPES)) {
      for (const entityType of Object.values(category)) {
        if (entityType.patterns) {
          entityType.compiledPatterns = entityType.patterns.map(pattern => 
            pattern instanceof RegExp ? pattern : new RegExp(pattern, 'gi')
          );
        }
      }
    }
  }

  async testLLMConnection() {
    try {
      await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1
      });
    } catch (error) {
      if (!error.message.includes('quota')) {
        console.warn('LLM connection test failed, disabling LLM extraction:', error.message);
        this.options.enableLLMExtraction = false;
      }
    }
  }

  generateCacheKey(text, context) {
    const hash = this.simpleHash(text + JSON.stringify(context));
    return `entity:${hash}`;
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  extractSurroundingContext(text, target, windowSize = 50) {
    const index = text.toLowerCase().indexOf(target.toLowerCase());
    if (index === -1) return '';
    
    const start = Math.max(0, index - windowSize);
    const end = Math.min(text.length, index + target.length + windowSize);
    
    return text.substring(start, end).trim();
  }

  addContextInfo(context) {
    return {
      messageId: context.messageId,
      userId: context.userId,
      timestamp: context.timestamp,
      position: context.position || 0
    };
  }

  calculatePatternConfidence(value, type) {
    const baseConfidence = this.config.ENTITY_TYPES.TRAVEL[type]?.confidence_threshold || 0.7;
    
    // Adjust confidence based on value characteristics
    let confidence = baseConfidence;
    
    // Longer values typically more reliable
    if (value.length > 10) confidence += 0.1;
    if (value.length < 3) confidence -= 0.2;
    
    // Capitalized values typically more reliable for places/names
    if (/^[A-Z]/.test(value)) confidence += 0.05;
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  parseDate(dateStr) {
    try {
      // Try multiple date formats
      const formats = [
        /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/, // MM/DD/YYYY or M/D/YY
        /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
        /^(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?$/i // Month DD, YYYY
      ];
      
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]; // Return YYYY-MM-DD
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }
}

export default EntityExtractor;