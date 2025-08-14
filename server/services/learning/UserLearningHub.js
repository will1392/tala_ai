/**
 * UserLearningHub - Comprehensive user learning and adaptation system
 * 
 * Learns from user interactions to provide personalized experiences
 * WITHOUT affecting core functionality - purely additive enhancements
 */

import { createClient } from '@supabase/supabase-js';

class UserLearningHub {
  constructor(options = {}) {
    this.options = {
      enableLearning: options.enableLearning !== false,
      learningRate: options.learningRate || 0.1,
      minConfidence: options.minConfidence || 0.6,
      maxMemorySize: options.maxMemorySize || 1000,
      ...options
    };
    
    // Initialize Supabase client (only if credentials are available)
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );
    } else {
      console.warn('⚠️ Supabase credentials not found - using in-memory storage only');
      this.supabase = null;
    }
    
    // Simple tokenizer implementation (no external dependency)
    this.tokenizer = {
      tokenize: (text) => {
        // Simple word tokenization
        return text.toLowerCase()
          .replace(/[^\w\s]/g, ' ')  // Replace punctuation with spaces
          .split(/\s+/)               // Split on whitespace
          .filter(word => word.length > 0);  // Remove empty strings
      }
    };
    
    // Cache for active user profiles
    this.userProfiles = new Map();
    
    // Learning dimensions
    this.learningDimensions = {
      communication: {
        formality: 0.5,        // 0=casual, 1=formal
        verbosity: 0.5,        // 0=brief, 1=detailed
        technicality: 0.5,     // 0=simple, 1=technical
        emotiveness: 0.5       // 0=neutral, 1=expressive
      },
      preferences: {
        responseLength: 'balanced',
        exampleUsage: true,
        stepByStep: false,
        summaryFirst: false,
        visualAids: false
      },
      businessContext: {
        industry: null,
        companySize: null,
        role: null,
        goals: [],
        challenges: [],
        terminology: new Set()
      },
      interactionPatterns: {
        averageSessionLength: 0,
        preferredTimes: [],
        topicFrequency: new Map(),
        questionTypes: new Map(),
        satisfactionSignals: []
      },
      expertise: {
        travel: { level: 0.5, topics: new Map() },
        marketing: { level: 0.5, topics: new Map() },
        technical: { level: 0.5, topics: new Map() }
      }
    };
    
    console.log('🧠 UserLearningHub initialized');
  }
  
  /**
   * Learn from a user interaction
   * @param {Object} interaction - User interaction data
   * @returns {Object} Learning results
   */
  async learnFromInteraction(interaction) {
    if (!this.options.enableLearning) return { learned: false };
    
    const { userId, message, response, feedback, metadata } = interaction;
    
    try {
      // Get or create user profile
      const profile = await this.getUserLearningProfile(userId);
      
      // Analyze communication style
      const styleMetrics = this.analyzeCommunicationStyle(message);
      this.updateCommunicationStyle(profile, styleMetrics);
      
      // Extract business context
      const businessTerms = this.extractBusinessContext(message);
      this.updateBusinessContext(profile, businessTerms);
      
      // Track interaction patterns
      this.updateInteractionPatterns(profile, interaction);
      
      // Learn from feedback if provided
      if (feedback) {
        this.learnFromFeedback(profile, feedback, interaction);
      }
      
      // Detect preferences from message patterns
      const preferences = this.detectPreferences(message, response);
      this.updatePreferences(profile, preferences);
      
      // Update expertise levels based on topics
      this.updateExpertiseLevels(profile, interaction);
      
      // Save updated profile
      await this.saveUserLearningProfile(userId, profile);
      
      return {
        learned: true,
        profile: this.sanitizeProfile(profile),
        insights: this.generateInsights(profile)
      };
      
    } catch (error) {
      console.error('❌ Learning failed:', error);
      // Fail gracefully - don't affect core functionality
      return { learned: false, error: error.message };
    }
  }
  
  /**
   * Get enhanced context for a user
   * @param {string} userId - User ID
   * @returns {Object} Enhanced context
   */
  async getEnhancedContext(userId) {
    try {
      const profile = await this.getUserLearningProfile(userId);
      
      if (!profile || profile.interactions < 5) {
        // Not enough data for personalization
        return null;
      }
      
      // Build context enhancement
      const enhancement = {
        communicationStyle: this.getCommunicationStylePrompt(profile),
        businessContext: this.getBusinessContextPrompt(profile),
        preferences: this.getPreferencesPrompt(profile),
        expertiseLevel: this.getExpertisePrompt(profile),
        personalizedTips: this.getPersonalizedTips(profile)
      };
      
      return enhancement;
      
    } catch (error) {
      console.error('❌ Failed to get enhanced context:', error);
      return null; // Fail gracefully
    }
  }
  
  /**
   * Analyze communication style from message
   */
  analyzeCommunicationStyle(message) {
    const words = this.tokenizer.tokenize(message.toLowerCase());
    const wordCount = words.length;
    
    // Formality indicators
    const formalWords = ['please', 'kindly', 'would', 'could', 'appreciate', 'regarding'];
    const casualWords = ['hey', 'hi', 'yeah', 'cool', 'awesome', 'thanks'];
    
    const formalCount = words.filter(w => formalWords.includes(w)).length;
    const casualCount = words.filter(w => casualWords.includes(w)).length;
    
    // Calculate metrics
    return {
      formality: formalCount > casualCount ? 0.7 : 0.3,
      verbosity: Math.min(wordCount / 50, 1), // Normalize to 0-1
      technicality: this.detectTechnicalLevel(words),
      emotiveness: this.detectEmotiveness(message)
    };
  }
  
  /**
   * Extract business context from message
   */
  extractBusinessContext(message) {
    const businessIndicators = {
      industry: {
        'travel': ['travel', 'flight', 'hotel', 'destination', 'itinerary'],
        'marketing': ['campaign', 'seo', 'conversion', 'leads', 'roi'],
        'ecommerce': ['sales', 'products', 'customers', 'orders', 'checkout'],
        'saas': ['subscription', 'users', 'churn', 'mrr', 'retention']
      },
      size: {
        'small': ['startup', 'small business', 'solo', 'freelance'],
        'medium': ['growing', 'team', 'department', 'mid-size'],
        'large': ['enterprise', 'corporate', 'global', 'multinational']
      }
    };
    
    const extracted = {
      possibleIndustry: null,
      possibleSize: null,
      terminology: []
    };
    
    const messageLower = message.toLowerCase();
    
    // Detect industry
    for (const [industry, keywords] of Object.entries(businessIndicators.industry)) {
      if (keywords.some(keyword => messageLower.includes(keyword))) {
        extracted.possibleIndustry = industry;
        break;
      }
    }
    
    // Extract business terminology
    const businessTerms = message.match(/\b[A-Z]{2,}\b/g) || []; // Acronyms
    extracted.terminology = businessTerms;
    
    return extracted;
  }
  
  /**
   * Update user's communication style
   */
  updateCommunicationStyle(profile, metrics) {
    const rate = this.options.learningRate;
    
    // Exponential moving average update
    profile.communication.formality = 
      profile.communication.formality * (1 - rate) + metrics.formality * rate;
    
    profile.communication.verbosity = 
      profile.communication.verbosity * (1 - rate) + metrics.verbosity * rate;
    
    profile.communication.technicality = 
      profile.communication.technicality * (1 - rate) + metrics.technicality * rate;
    
    profile.communication.emotiveness = 
      profile.communication.emotiveness * (1 - rate) + metrics.emotiveness * rate;
  }
  
  /**
   * Update business context
   */
  updateBusinessContext(profile, extractedContext) {
    if (extractedContext.possibleIndustry && !profile.businessContext.industry) {
      profile.businessContext.industry = extractedContext.possibleIndustry;
    }
    
    if (extractedContext.terminology && extractedContext.terminology.length > 0) {
      extractedContext.terminology.forEach(term => {
        profile.businessContext.terminology.add(term);
      });
    }
    
    // Update confidence based on interaction count
    profile.interactions = (profile.interactions || 0) + 1;
    profile.confidence = Math.min(profile.interactions / 100, 1);
  }
  
  /**
   * Update interaction patterns
   */
  updateInteractionPatterns(profile, interaction) {
    const patterns = profile.interactionPatterns;
    
    // Track topic frequency
    const topic = interaction.metadata?.topic || 'general';
    const currentCount = patterns.topicFrequency.get(topic) || 0;
    patterns.topicFrequency.set(topic, currentCount + 1);
    
    // Track question types
    if (interaction.message) {
      const messageType = this.classifyMessageType(interaction.message);
      const typeCount = patterns.questionTypes.get(messageType) || 0;
      patterns.questionTypes.set(messageType, typeCount + 1);
    }
  }
  
  /**
   * Learn from user feedback
   */
  learnFromFeedback(profile, feedback, interaction) {
    // Positive feedback increases confidence
    if (feedback.rating > 3) {
      profile.interactionPatterns.satisfactionSignals.push({
        type: 'positive',
        timestamp: new Date(),
        context: interaction.message?.substring(0, 100)
      });
    } else if (feedback.rating < 3) {
      profile.interactionPatterns.satisfactionSignals.push({
        type: 'negative',
        timestamp: new Date(),
        context: interaction.message?.substring(0, 100)
      });
    }
  }
  
  /**
   * Detect user preferences
   */
  detectPreferences(message, response) {
    const preferences = {};
    
    // Detect preference for examples
    if (message.toLowerCase().includes('example') || message.toLowerCase().includes('for instance')) {
      preferences.exampleUsage = true;
    }
    
    // Detect preference for step-by-step
    if (message.toLowerCase().includes('step') || message.toLowerCase().includes('how to')) {
      preferences.stepByStep = true;
    }
    
    // Detect preference for summaries
    if (message.toLowerCase().includes('summary') || message.toLowerCase().includes('brief')) {
      preferences.summaryFirst = true;
    }
    
    return preferences;
  }
  
  /**
   * Update user preferences
   */
  updatePreferences(profile, detectedPreferences) {
    Object.keys(detectedPreferences).forEach(key => {
      if (detectedPreferences[key] !== undefined) {
        profile.preferences[key] = detectedPreferences[key];
      }
    });
  }
  
  /**
   * Update expertise levels
   */
  updateExpertiseLevels(profile, interaction) {
    const topic = interaction.metadata?.mode || 'general';
    
    if (topic === 'cmo' || topic === 'marketing') {
      const marketingExpertise = profile.expertise.marketing;
      marketingExpertise.level = Math.min(marketingExpertise.level + 0.01, 1);
      
      // Track specific marketing topics
      const marketingTerms = ['seo', 'campaign', 'conversion', 'leads', 'roi'];
      const message = interaction.message?.toLowerCase() || '';
      
      marketingTerms.forEach(term => {
        if (message.includes(term)) {
          const count = marketingExpertise.topics.get(term) || 0;
          marketingExpertise.topics.set(term, count + 1);
        }
      });
    }
  }
  
  /**
   * Classify message type
   */
  classifyMessageType(message) {
    const lower = message.toLowerCase();
    
    if (lower.includes('how') || lower.includes('what') || lower.includes('why')) {
      return 'question';
    } else if (lower.includes('help') || lower.includes('need')) {
      return 'request';
    } else if (lower.includes('thanks') || lower.includes('great')) {
      return 'feedback';
    } else {
      return 'statement';
    }
  }
  
  /**
   * Generate communication style prompt
   */
  getCommunicationStylePrompt(profile) {
    const style = profile.communication;
    
    let prompt = "Communication style preferences:\n";
    
    // Formality
    if (style.formality > 0.7) {
      prompt += "- Use formal, professional language\n";
    } else if (style.formality < 0.3) {
      prompt += "- Use casual, friendly language\n";
    } else {
      prompt += "- Use balanced, conversational tone\n";
    }
    
    // Verbosity
    if (style.verbosity > 0.7) {
      prompt += "- Provide detailed, comprehensive responses\n";
    } else if (style.verbosity < 0.3) {
      prompt += "- Keep responses brief and concise\n";
    } else {
      prompt += "- Use moderate detail in responses\n";
    }
    
    // Technicality
    if (style.technicality > 0.7) {
      prompt += "- Include technical details and terminology\n";
    } else if (style.technicality < 0.3) {
      prompt += "- Avoid jargon, use simple explanations\n";
    }
    
    return prompt;
  }
  
  /**
   * Generate business context prompt
   */
  getBusinessContextPrompt(profile) {
    const context = profile.businessContext;
    
    if (!context.industry && context.terminology.size === 0) {
      return null;
    }
    
    let prompt = "Business context:\n";
    
    if (context.industry) {
      prompt += `- Industry: ${context.industry}\n`;
    }
    
    if (context.companySize) {
      prompt += `- Company size: ${context.companySize}\n`;
    }
    
    if (context.role) {
      prompt += `- User role: ${context.role}\n`;
    }
    
    if (context.goals.length > 0) {
      prompt += `- Business goals: ${context.goals.slice(0, 3).join(', ')}\n`;
    }
    
    if (context.terminology.size > 0) {
      const terms = Array.from(context.terminology).slice(0, 5);
      prompt += `- Common terminology: ${terms.join(', ')}\n`;
    }
    
    return prompt;
  }
  
  /**
   * Get user learning profile from database
   */
  async getUserLearningProfile(userId) {
    // Check cache first
    if (this.userProfiles.has(userId)) {
      return this.userProfiles.get(userId);
    }
    
    // If no Supabase, just create new profile
    if (!this.supabase) {
      const newProfile = this.createNewProfile(userId);
      this.userProfiles.set(userId, newProfile);
      return newProfile;
    }
    
    try {
      // Try to load from database
      const { data, error } = await this.supabase
        .from('user_learning_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error || !data) {
        // Create new profile
        const newProfile = this.createNewProfile(userId);
        this.userProfiles.set(userId, newProfile);
        return newProfile;
      }
      
      // Parse and cache
      const profile = {
        ...data.profile,
        lastUpdated: new Date(data.updated_at)
      };
      
      this.userProfiles.set(userId, profile);
      return profile;
      
    } catch (error) {
      console.error('Failed to load profile:', error);
      // Return default profile
      return this.createNewProfile(userId);
    }
  }
  
  /**
   * Save user learning profile to database
   */
  async saveUserLearningProfile(userId, profile) {
    try {
      // Update cache
      this.userProfiles.set(userId, profile);
      
      // Only save to database if Supabase is available
      if (this.supabase) {
        const { error } = await this.supabase
          .from('user_learning_profiles')
          .upsert({
            user_id: userId,
            profile: profile,
            interactions: profile.interactions,
            confidence: profile.confidence,
            updated_at: new Date().toISOString()
          });
        
        if (error) {
          console.error('Failed to save profile:', error);
        }
      }
      
    } catch (error) {
      console.error('Failed to save learning profile:', error);
      // Continue without saving - don't affect core functionality
    }
  }
  
  /**
   * Create new user profile
   */
  createNewProfile(userId) {
    return {
      userId,
      createdAt: new Date(),
      lastUpdated: new Date(),
      interactions: 0,
      confidence: 0,
      communication: { ...this.learningDimensions.communication },
      preferences: { ...this.learningDimensions.preferences },
      businessContext: { 
        ...this.learningDimensions.businessContext,
        terminology: new Set()
      },
      interactionPatterns: {
        ...this.learningDimensions.interactionPatterns,
        topicFrequency: new Map(),
        questionTypes: new Map()
      },
      expertise: {
        travel: { level: 0.5, topics: new Map() },
        marketing: { level: 0.5, topics: new Map() },
        technical: { level: 0.5, topics: new Map() }
      }
    };
  }
  
  /**
   * Detect technical level from words
   */
  detectTechnicalLevel(words) {
    const technicalTerms = ['api', 'database', 'algorithm', 'optimization', 
                           'integration', 'analytics', 'metrics', 'kpi'];
    const technicalCount = words.filter(w => technicalTerms.includes(w)).length;
    return Math.min(technicalCount / words.length * 10, 1);
  }
  
  /**
   * Detect emotiveness from message
   */
  detectEmotiveness(message) {
    const emotiveIndicators = ['!', '?', '😊', '👍', 'love', 'hate', 'amazing', 
                               'terrible', 'frustrated', 'excited'];
    const emotiveCount = emotiveIndicators.filter(indicator => 
      message.includes(indicator)
    ).length;
    return Math.min(emotiveCount / 5, 1);
  }
  
  /**
   * Generate insights from profile
   */
  generateInsights(profile) {
    const insights = [];
    
    if (profile.interactions > 10) {
      if (profile.communication.formality > 0.7) {
        insights.push('Prefers formal communication');
      }
      
      if (profile.communication.verbosity < 0.3) {
        insights.push('Likes concise responses');
      }
      
      if (profile.businessContext.industry) {
        insights.push(`Works in ${profile.businessContext.industry}`);
      }
    }
    
    return insights;
  }
  
  /**
   * Sanitize profile for external use
   */
  sanitizeProfile(profile) {
    return {
      interactions: profile.interactions,
      confidence: profile.confidence,
      hasBusinessContext: !!profile.businessContext.industry,
      hasPreferences: profile.interactions > 5
    };
  }
}

export default UserLearningHub;