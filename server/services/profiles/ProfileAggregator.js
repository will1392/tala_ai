/**
 * ProfileAggregator - Advanced Profile Analysis and Pattern Detection
 * 
 * Analyzes conversation history to identify implicit preferences, travel patterns,
 * budget behaviors, and companion information for automated profile enrichment.
 */

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

export class ProfileAggregator {
  constructor(options = {}) {
    this.options = {
      enableLLMAnalysis: options.enableLLMAnalysis !== false,
      enablePatternDetection: options.enablePatternDetection !== false,
      enableBudgetAnalysis: options.enableBudgetAnalysis !== false,
      minConfidenceThreshold: options.minConfidenceThreshold || 0.6,
      analysisWindowDays: options.analysisWindowDays || 90,
      ...options
    };
    
    // Initialize services
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    this.initialized = false;
    
    // Analysis cache
    this.analysisCache = new Map();
  }

  /**
   * Initialize the profile aggregator
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      console.log('🔍 Initializing ProfileAggregator...');
      
      // Test OpenAI connection if LLM analysis is enabled
      if (this.options.enableLLMAnalysis) {
        await this.testLLMConnection();
      }
      
      this.initialized = true;
      console.log('✅ ProfileAggregator initialized successfully');
      
    } catch (error) {
      console.error('❌ ProfileAggregator initialization failed:', error);
      // Continue without LLM analysis if it fails
      this.options.enableLLMAnalysis = false;
      this.initialized = true;
    }
  }

  /**
   * Analyze conversation history for implicit preferences
   * @param {string} userId - User ID
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Analysis options
   * @returns {Object} Discovered preferences with confidence scores
   */
  async analyzeConversationHistory(userId, organizationId, options = {}) {
    try {
      this.ensureInitialized();
      
      console.log(`🔍 Analyzing conversation history for user ${userId}`);
      
      // Get conversation messages from the analysis window
      const messages = await this.getRecentConversations(userId, organizationId, options);
      
      if (messages.length === 0) {
        return {
          success: true,
          preferences: {},
          patterns: {},
          confidence: 'low',
          messageCount: 0
        };
      }
      
      // Analyze with multiple methods
      const analysisResults = {
        implicitPreferences: await this.extractImplicitPreferences(messages),
        travelPatterns: await this.identifyTravelPatterns(messages),
        budgetIndicators: await this.analyzeBudgetBehavior(messages),
        companionInfo: await this.extractCompanionInformation(messages),
        temporalPreferences: await this.analyzeTemporalPreferences(messages)
      };
      
      // Combine and score results
      const aggregatedResults = this.aggregateAnalysisResults(analysisResults);
      
      console.log(`✅ Analysis complete: ${Object.keys(aggregatedResults.preferences).length} preferences discovered`);
      
      return {
        success: true,
        preferences: aggregatedResults.preferences,
        patterns: aggregatedResults.patterns,
        confidence: aggregatedResults.overallConfidence,
        messageCount: messages.length,
        analysisDate: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`❌ Failed to analyze conversation history for user ${userId}:`, error);
      return {
        success: false,
        error: error.message,
        preferences: {},
        patterns: {}
      };
    }
  }

  /**
   * Identify patterns in travel choices
   * @param {Array} messages - Conversation messages
   * @returns {Object} Travel patterns
   */
  async identifyTravelPatterns(messages) {
    try {
      const patterns = {
        destinations: {},
        timing: {},
        duration: {},
        activities: {},
        accommodation: {}
      };
      
      // Pattern detection from conversations
      for (const message of messages) {
        if (!message.content) continue;
        
        // Destination patterns
        const destinations = await this.extractDestinationMentions(message.content);
        destinations.forEach(dest => {
          patterns.destinations[dest] = (patterns.destinations[dest] || 0) + 1;
        });
        
        // Timing patterns
        const timingInfo = await this.extractTimingPreferences(message.content);
        if (timingInfo.season) {
          patterns.timing[timingInfo.season] = (patterns.timing[timingInfo.season] || 0) + 1;
        }
        
        // Duration patterns
        const durationInfo = await this.extractDurationPreferences(message.content);
        if (durationInfo.duration) {
          patterns.duration[durationInfo.duration] = (patterns.duration[durationInfo.duration] || 0) + 1;
        }
        
        // Activity patterns
        const activities = await this.extractActivityMentions(message.content);
        activities.forEach(activity => {
          patterns.activities[activity] = (patterns.activities[activity] || 0) + 1;
        });
        
        // Accommodation patterns
        const accommodations = await this.extractAccommodationMentions(message.content);
        accommodations.forEach(acc => {
          patterns.accommodation[acc] = (patterns.accommodation[acc] || 0) + 1;
        });
      }
      
      // Convert counts to patterns with confidence scores
      return this.convertCountsToPatterns(patterns, messages.length);
      
    } catch (error) {
      console.error('Error identifying travel patterns:', error);
      return {};
    }
  }

  /**
   * Detect budget ranges from conversation patterns
   * @param {Array} messages - Conversation messages
   * @returns {Object} Budget analysis
   */
  async analyzeBudgetBehavior(messages) {
    try {
      const budgetData = {
        mentionedBudgets: [],
        priceReactions: [],
        luxuryIndicators: [],
        economyIndicators: [],
        flexibilityIndicators: []
      };
      
      // Analyze budget-related content
      for (const message of messages) {
        if (!message.content) continue;
        
        const content = message.content.toLowerCase();
        
        // Extract mentioned budgets
        const budgetMatches = content.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g);
        if (budgetMatches) {
          budgetMatches.forEach(match => {
            const amount = parseFloat(match.replace(/[\$,]/g, ''));
            if (amount > 100 && amount < 100000) { // Reasonable travel budget range
              budgetData.mentionedBudgets.push(amount);
            }
          });
        }
        
        // Detect price sensitivity
        const priceKeywords = {
          expensive: ['expensive', 'costly', 'pricey', 'too much', 'overpriced'],
          cheap: ['cheap', 'affordable', 'budget', 'economical', 'deal'],
          luxury: ['luxury', 'premium', 'first class', 'high-end', 'upscale'],
          flexible: ['flexible', 'willing to pay', 'worth it', 'splurge']
        };
        
        Object.entries(priceKeywords).forEach(([category, keywords]) => {
          if (keywords.some(keyword => content.includes(keyword))) {
            budgetData[category === 'expensive' ? 'priceReactions' : `${category}Indicators`].push({
              message: message.content,
              timestamp: message.created_at || message.createdAt
            });
          }
        });
      }
      
      // Analyze budget patterns
      return this.analyzeBudgetPatterns(budgetData);
      
    } catch (error) {
      console.error('Error analyzing budget behavior:', error);
      return {};
    }
  }

  /**
   * Extract family/companion information
   * @param {Array} messages - Conversation messages
   * @returns {Object} Companion information
   */
  async extractCompanionInformation(messages) {
    try {
      const companionData = {
        mentions: [],
        relationships: {},
        groupSizes: [],
        specialNeeds: []
      };
      
      // Relationship indicators
      const relationshipKeywords = {
        spouse: ['wife', 'husband', 'spouse', 'partner'],
        children: ['kids', 'children', 'son', 'daughter', 'child'],
        family: ['family', 'parents', 'mom', 'dad', 'mother', 'father'],
        friends: ['friends', 'friend', 'buddy', 'pal'],
        colleagues: ['colleague', 'coworker', 'business partner']
      };
      
      // Group size indicators
      const groupSizePatterns = [
        /(\d+)\s+(?:people|persons|travelers|adults)/gi,
        /party\s+of\s+(\d+)/gi,
        /group\s+of\s+(\d+)/gi
      ];
      
      for (const message of messages) {
        if (!message.content) continue;
        
        const content = message.content.toLowerCase();
        
        // Extract relationship mentions
        Object.entries(relationshipKeywords).forEach(([relationship, keywords]) => {
          if (keywords.some(keyword => content.includes(keyword))) {
            companionData.relationships[relationship] = (companionData.relationships[relationship] || 0) + 1;
          }
        });
        
        // Extract group sizes
        groupSizePatterns.forEach(pattern => {
          const matches = content.matchAll(pattern);
          for (const match of matches) {
            const size = parseInt(match[1]);
            if (size > 1 && size <= 20) {
              companionData.groupSizes.push(size);
            }
          }
        });
        
        // Extract special needs related to companions
        const specialNeedsKeywords = [
          'wheelchair', 'elderly', 'children', 'baby', 'infant', 'toddler',
          'disability', 'special needs', 'assistance'
        ];
        
        if (specialNeedsKeywords.some(keyword => content.includes(keyword))) {
          companionData.specialNeeds.push({
            content: message.content,
            timestamp: message.created_at || message.createdAt
          });
        }
      }
      
      // Analyze companion patterns
      return this.analyzeCompanionPatterns(companionData);
      
    } catch (error) {
      console.error('Error extracting companion information:', error);
      return {};
    }
  }

  /**
   * Build preference confidence scores
   * @param {Object} rawData - Raw preference data
   * @param {number} totalMessages - Total message count
   * @returns {Object} Preferences with confidence scores
   */
  buildPreferenceConfidenceScores(rawData, totalMessages) {
    const preferences = {};
    
    Object.entries(rawData).forEach(([category, data]) => {
      if (typeof data === 'object' && data !== null) {
        Object.entries(data).forEach(([item, count]) => {
          const frequency = count / totalMessages;
          const confidence = this.calculateConfidenceScore(frequency, count, totalMessages);
          
          if (confidence >= this.options.minConfidenceThreshold) {
            preferences[`${category}_${item}`] = {
              value: item,
              category,
              confidence,
              frequency,
              mentions: count,
              confidenceLevel: this.getConfidenceLevel(confidence)
            };
          }
        });
      }
    });
    
    return preferences;
  }

  // Helper methods for specific extraction tasks

  async extractImplicitPreferences(messages) {
    if (!this.options.enableLLMAnalysis) {
      return this.extractImplicitPreferencesWithPatterns(messages);
    }
    
    try {
      // Use LLM for advanced preference extraction
      const conversationText = messages
        .map(m => m.content)
        .filter(Boolean)
        .join('\n');
      
      if (conversationText.length > 20000) {
        // Split into chunks for very long conversations
        return this.extractImplicitPreferencesInChunks(messages);
      }
      
      const prompt = `
        Analyze this travel conversation and extract implicit preferences. Look for:
        1. Accommodation preferences (luxury vs budget, hotel vs rental)
        2. Activity preferences (adventure, culture, relaxation, nightlife)
        3. Dining preferences (fine dining, local food, specific cuisines)
        4. Transportation preferences (flights, trains, cars)
        5. Seasonal preferences (summer, winter, specific months)
        6. Destination types (urban, nature, beach, mountains)
        
        Return JSON format:
        {
          "accommodation": {"preference": "value", "confidence": 0.8},
          "activities": {"preference": "value", "confidence": 0.8},
          "dining": {"preference": "value", "confidence": 0.8}
        }
        
        Conversation:
        ${conversationText}
        
        JSON:
      `;
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert travel preference analyst. Extract implicit preferences from conversations and return only valid JSON.'
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
      if (!responseText) return {};
      
      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        console.warn('Failed to parse LLM preference analysis:', responseText);
        return this.extractImplicitPreferencesWithPatterns(messages);
      }
      
    } catch (error) {
      console.error('Error in LLM preference extraction:', error);
      return this.extractImplicitPreferencesWithPatterns(messages);
    }
  }

  extractImplicitPreferencesWithPatterns(messages) {
    const preferences = {};
    
    // Pattern-based preference extraction
    const preferencePatterns = {
      accommodation: {
        luxury: ['luxury', 'upscale', 'premium', 'high-end', 'five-star', '5-star'],
        budget: ['budget', 'cheap', 'affordable', 'economical', 'hostel'],
        boutique: ['boutique', 'unique', 'charming', 'intimate'],
        resort: ['resort', 'all-inclusive', 'spa', 'beach resort']
      },
      activities: {
        adventure: ['adventure', 'hiking', 'climbing', 'extreme', 'adrenaline'],
        culture: ['museum', 'cultural', 'history', 'art', 'heritage'],
        relaxation: ['relaxing', 'peaceful', 'quiet', 'spa', 'zen'],
        nightlife: ['nightlife', 'bars', 'clubs', 'party', 'nightclub']
      },
      dining: {
        fine_dining: ['fine dining', 'michelin', 'gourmet', 'upscale restaurant'],
        local_food: ['local food', 'street food', 'authentic', 'traditional'],
        vegetarian: ['vegetarian', 'vegan', 'plant-based'],
        casual: ['casual dining', 'family restaurant', 'cafe']
      }
    };
    
    messages.forEach(message => {
      if (!message.content) return;
      
      const content = message.content.toLowerCase();
      
      Object.entries(preferencePatterns).forEach(([category, prefs]) => {
        Object.entries(prefs).forEach(([pref, keywords]) => {
          const matches = keywords.filter(keyword => content.includes(keyword)).length;
          if (matches > 0) {
            if (!preferences[category]) preferences[category] = {};
            preferences[category][pref] = (preferences[category][pref] || 0) + matches;
          }
        });
      });
    });
    
    return preferences;
  }

  async extractDestinationMentions(content) {
    // Simple destination extraction - could be enhanced with NLP
    const cityPatterns = [
      /\b(?:in|to|visit|visiting|going to|traveling to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g
    ];
    
    const destinations = [];
    cityPatterns.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].length > 2) {
          destinations.push(match[1].trim());
        }
      }
    });
    
    return destinations;
  }

  async extractTimingPreferences(content) {
    const seasons = {
      spring: ['spring', 'april', 'may', 'march'],
      summer: ['summer', 'june', 'july', 'august'],
      fall: ['fall', 'autumn', 'september', 'october', 'november'],
      winter: ['winter', 'december', 'january', 'february']
    };
    
    const lowerContent = content.toLowerCase();
    for (const [season, keywords] of Object.entries(seasons)) {
      if (keywords.some(keyword => lowerContent.includes(keyword))) {
        return { season, confidence: 0.7 };
      }
    }
    
    return {};
  }

  async extractDurationPreferences(content) {
    const durationPatterns = [
      /(\d+)\s*(?:day|week|month)s?\s*(?:trip|vacation|holiday)/gi,
      /(?:for|about)\s*(\d+)\s*(?:day|week|month)s?/gi
    ];
    
    for (const pattern of durationPatterns) {
      const match = content.match(pattern);
      if (match) {
        return { duration: match[0], confidence: 0.8 };
      }
    }
    
    return {};
  }

  async extractActivityMentions(content) {
    const activities = [
      'hiking', 'swimming', 'skiing', 'shopping', 'dining', 'museums',
      'beaches', 'nightlife', 'adventure', 'sightseeing', 'culture'
    ];
    
    const lowerContent = content.toLowerCase();
    return activities.filter(activity => lowerContent.includes(activity));
  }

  async extractAccommodationMentions(content) {
    const accommodations = [
      'hotel', 'resort', 'airbnb', 'hostel', 'villa', 'apartment',
      'bed and breakfast', 'boutique hotel', 'luxury hotel'
    ];
    
    const lowerContent = content.toLowerCase();
    return accommodations.filter(acc => lowerContent.includes(acc));
  }

  async analyzeTemporalPreferences(messages) {
    const temporal = {
      dayOfWeek: {},
      timeOfYear: {},
      leadTime: []
    };
    
    // Analyze timing patterns in messages
    messages.forEach(message => {
      if (message.created_at || message.createdAt) {
        const date = new Date(message.created_at || message.createdAt);
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
        const month = date.toLocaleDateString('en-US', { month: 'long' });
        
        temporal.dayOfWeek[dayOfWeek] = (temporal.dayOfWeek[dayOfWeek] || 0) + 1;
        temporal.timeOfYear[month] = (temporal.timeOfYear[month] || 0) + 1;
      }
    });
    
    return temporal;
  }

  // Analysis helper methods

  convertCountsToPatterns(patterns, totalMessages) {
    const convertedPatterns = {};
    
    Object.entries(patterns).forEach(([category, counts]) => {
      convertedPatterns[category] = {};
      
      Object.entries(counts).forEach(([item, count]) => {
        const frequency = count / totalMessages;
        const confidence = this.calculateConfidenceScore(frequency, count, totalMessages);
        
        if (confidence >= this.options.minConfidenceThreshold) {
          convertedPatterns[category][item] = {
            mentions: count,
            frequency,
            confidence,
            confidenceLevel: this.getConfidenceLevel(confidence)
          };
        }
      });
    });
    
    return convertedPatterns;
  }

  analyzeBudgetPatterns(budgetData) {
    const analysis = {
      averageBudget: 0,
      budgetRange: { min: 0, max: 0 },
      pricesensitivity: 'medium',
      luxuryTendency: 0,
      economyTendency: 0,
      flexibility: 0.5
    };
    
    // Calculate average budget
    if (budgetData.mentionedBudgets.length > 0) {
      analysis.averageBudget = budgetData.mentionedBudgets.reduce((sum, budget) => sum + budget, 0) / budgetData.mentionedBudgets.length;
      analysis.budgetRange.min = Math.min(...budgetData.mentionedBudgets);
      analysis.budgetRange.max = Math.max(...budgetData.mentionedBudgets);
    }
    
    // Analyze tendencies
    const totalIndicators = budgetData.luxuryIndicators.length + budgetData.economyIndicators.length;
    if (totalIndicators > 0) {
      analysis.luxuryTendency = budgetData.luxuryIndicators.length / totalIndicators;
      analysis.economyTendency = budgetData.economyIndicators.length / totalIndicators;
    }
    
    // Determine price sensitivity
    if (budgetData.priceReactions.length > 3) {
      analysis.pricesensitivity = 'high';
    } else if (budgetData.luxuryIndicators.length > budgetData.economyIndicators.length) {
      analysis.pricesensitivity = 'low';
    }
    
    // Calculate flexibility
    if (budgetData.flexibilityIndicators.length > 0) {
      analysis.flexibility = Math.min(0.9, 0.5 + (budgetData.flexibilityIndicators.length * 0.1));
    }
    
    return analysis;
  }

  analyzeCompanionPatterns(companionData) {
    const analysis = {
      frequentCompanions: {},
      averageGroupSize: 1,
      travelStyle: 'solo',
      specialRequirements: []
    };
    
    // Analyze relationship patterns
    const totalRelationshipMentions = Object.values(companionData.relationships).reduce((sum, count) => sum + count, 0);
    if (totalRelationshipMentions > 0) {
      Object.entries(companionData.relationships).forEach(([relationship, count]) => {
        const frequency = count / totalRelationshipMentions;
        if (frequency > 0.3) {
          analysis.frequentCompanions[relationship] = {
            frequency,
            mentions: count,
            confidence: this.calculateConfidenceScore(frequency, count, totalRelationshipMentions)
          };
        }
      });
    }
    
    // Calculate average group size
    if (companionData.groupSizes.length > 0) {
      analysis.averageGroupSize = Math.round(
        companionData.groupSizes.reduce((sum, size) => sum + size, 0) / companionData.groupSizes.length
      );
    }
    
    // Determine travel style
    if (analysis.averageGroupSize > 4) {
      analysis.travelStyle = 'large_group';
    } else if (analysis.averageGroupSize > 2) {
      analysis.travelStyle = 'small_group';
    } else if (Object.keys(analysis.frequentCompanions).length > 0) {
      analysis.travelStyle = 'couple_family';
    }
    
    // Extract special requirements
    analysis.specialRequirements = companionData.specialNeeds.map(need => ({
      requirement: need.content,
      timestamp: need.timestamp
    }));
    
    return analysis;
  }

  aggregateAnalysisResults(results) {
    const aggregated = {
      preferences: {},
      patterns: {},
      overallConfidence: 'medium'
    };
    
    // Combine all preference categories
    Object.entries(results).forEach(([analysisType, data]) => {
      if (data && typeof data === 'object') {
        Object.entries(data).forEach(([key, value]) => {
          if (value && typeof value === 'object' && value.confidence) {
            aggregated.preferences[`${analysisType}_${key}`] = value;
          } else if (value && typeof value === 'object') {
            aggregated.patterns[`${analysisType}_${key}`] = value;
          }
        });
      }
    });
    
    // Calculate overall confidence
    const confidenceScores = Object.values(aggregated.preferences)
      .map(pref => pref.confidence)
      .filter(Boolean);
    
    if (confidenceScores.length > 0) {
      const avgConfidence = confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;
      aggregated.overallConfidence = this.getConfidenceLevel(avgConfidence);
    }
    
    return aggregated;
  }

  // Utility methods

  async getRecentConversations(userId, organizationId, options) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - (options.windowDays || this.options.analysisWindowDays));
      
      // Get messages from context memories or conversations
      const { data, error } = await this.supabase
        .from('context_memories')
        .select('content, created_at, conversation_id')
        .eq('user_id', userId)
        .gte('created_at', cutoffDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(options.maxMessages || 100);
      
      if (error) {
        console.warn('Failed to get recent conversations from memories, trying alternative:', error.message);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error getting recent conversations:', error);
      return [];
    }
  }

  calculateConfidenceScore(frequency, mentions, totalMessages) {
    // Confidence based on frequency and absolute mentions
    let confidence = frequency * 0.7; // Base confidence from frequency
    
    // Boost for multiple mentions
    if (mentions >= 3) confidence += 0.2;
    if (mentions >= 5) confidence += 0.1;
    
    // Penalty for very sparse data
    if (totalMessages < 10) confidence *= 0.8;
    
    return Math.min(1.0, Math.max(0.0, confidence));
  }

  getConfidenceLevel(score) {
    if (score >= 0.8) return 'very_high';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'medium';
    if (score >= 0.2) return 'low';
    return 'very_low';
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
        throw error;
      }
    }
  }

  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('ProfileAggregator not initialized. Call initialize() first.');
    }
  }

  /**
   * Clear analysis cache
   */
  clearCache() {
    this.analysisCache.clear();
    console.log('🧹 Profile aggregator cache cleared');
  }
}

export default ProfileAggregator;