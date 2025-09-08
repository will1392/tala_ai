/**
 * CMOCompatibilityWrapper - Drop-in replacement for CMOAssistant
 * 
 * Provides identical API to the original CMOAssistant while using
 * the new pipeline architecture underneath. Enables zero-code migration.
 */

import cmoMigration from './CMOMigration.js';
import cmoAssistantV2 from '../CMOAssistantV2.js';
import { cmoKnowledgeBase } from '../CMOKnowledgeBase.js';
import { contextDetector } from '../ContextDetector.js';
import { cmoResponseEnhancer } from '../CMOResponseEnhancer.js';
import { conversationFlow } from '../ConversationFlow.js';
import { marketingIntelligence } from '../MarketingIntelligence.js';

class CMOCompatibilityWrapper {
  constructor() {
    // Maintain same public properties as V1
    this.knowledgeBase = cmoKnowledgeBase;
    this.contextDetector = contextDetector;
    this.responseEnhancer = cmoResponseEnhancer;
    this.conversationFlow = conversationFlow;
    this.marketingIntelligence = marketingIntelligence;
    
    // Internal
    this._migration = cmoMigration;
    this._v2 = cmoAssistantV2;
    this._mode = process.env.CMO_MODE || 'migration';
    this.initialized = false;
    
    // Backwards compatibility flags
    this._useV2 = process.env.CMO_USE_V2 !== 'false';
    this._legacyFormat = true;
  }

  /**
   * Initialize (V1 compatible)
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Initialize migration system
      await this._migration.initialize();
      
      // Set mode based on environment
      this._migration.setMode(this._mode);
      
      this.initialized = true;
      console.log(`✅ CMO Assistant initialized (mode: ${this._mode})`);
      
    } catch (error) {
      console.error('Failed to initialize CMO Assistant:', error);
      throw error;
    }
  }

  /**
   * Process a query (V1 compatible method)
   */
  async processQuery(message, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Ensure legacy format for V1 compatibility
    const enhancedOptions = {
      ...options,
      expectLegacyFormat: true,
      rolloutPercentage: this._getRolloutPercentage()
    };
    
    // Extract userId from options (V1 pattern)
    const userId = options.userId || options.conversationId || 'default-user';
    
    // Use migration system
    const response = await this._migration.processMessage(message, userId, enhancedOptions);
    
    // Ensure V1 compatible response structure
    return this._ensureV1Structure(response, options);
  }

  /**
   * Process a message (V2 compatible method)
   */
  async processMessage(message, userId, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Use migration system with V2 parameters
    const response = await this._migration.processMessage(message, userId, {
      ...options,
      expectLegacyFormat: this._legacyFormat,
      rolloutPercentage: this._getRolloutPercentage()
    });
    
    return response;
  }

  /**
   * Get user expertise (V1 compatible)
   */
  async getUserExpertise(userId) {
    // Delegate to V2's expertise profiles
    try {
      const profile = await this._v2.expertiseProfiles.getUserProfile(userId);
      return profile;
    } catch (error) {
      // Return default for compatibility
      return {
        level: 'beginner',
        preferences: {},
        technical_comfort: 0.5
      };
    }
  }

  /**
   * Track interaction learning (V1 compatible)
   */
  async trackInteractionLearning(userId, data) {
    try {
      await this._v2.expertiseLearning.trackInteraction(userId, data);
    } catch (error) {
      console.error('Failed to track interaction:', error);
    }
  }

  /**
   * Search knowledge base (V1 compatible)
   */
  async searchKnowledge(query, options = {}) {
    return this.knowledgeBase.search(query, options);
  }

  /**
   * Get suggestions (V1 compatible)
   */
  async getSuggestions(context) {
    // Simplified implementation for compatibility
    const suggestions = [];
    
    if (context.topic === 'direct_mail') {
      suggestions.push({
        message: 'Consider testing your campaign with a small batch first',
        priority: 'high'
      });
    }
    
    return suggestions;
  }

  /**
   * Ensure V1 compatible response structure
   */
  _ensureV1Structure(response, options) {
    // Already in V1 format
    if (response.content && response.hasOwnProperty('confidence')) {
      return response;
    }
    
    // Convert from any format to V1
    const v1Response = {
      content: response.content || response.response || '',
      confidence: response.confidence || 0.7,
      queryType: response.type || options.queryType || 'general',
      results: response.results || [],
      suggestions: response.suggestions || [],
      quickActions: response.quickActions || [],
      metadata: response.metadata || {},
      format: response.format || 'standard',
      adaptationSource: response.adaptationSource,
      structured: response.structured || {}
    };
    
    // Add any additional fields from original response
    Object.keys(response).forEach(key => {
      if (!v1Response.hasOwnProperty(key)) {
        v1Response[key] = response[key];
      }
    });
    
    return v1Response;
  }

  /**
   * Get rollout percentage from environment
   */
  _getRolloutPercentage() {
    const percentage = parseInt(process.env.CMO_V2_ROLLOUT_PERCENTAGE || '0');
    return Math.max(0, Math.min(100, percentage));
  }

  /**
   * Set mode dynamically
   */
  setMode(mode) {
    this._mode = mode;
    this._migration.setMode(mode);
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return this._migration.getMetrics();
  }

  /**
   * Validate V2 is working
   */
  async validate() {
    return this._migration.validateV2();
  }
}

// Create wrapper instance that can replace the original
const cmoAssistant = new CMOCompatibilityWrapper();

// Export both default and named for maximum compatibility
export { cmoAssistant, CMOCompatibilityWrapper };
export default cmoAssistant;