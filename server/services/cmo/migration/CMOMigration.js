/**
 * CMOMigration - Utilities for migrating from old CMO system to pipeline architecture
 * 
 * Provides compatibility layer, migration tools, and validation to ensure
 * smooth transition without breaking existing functionality.
 */

import { cmoAssistant as cmoAssistantV1 } from '../CMOAssistant.js';
import cmoAssistantV2 from '../CMOAssistantV2.js';
import { CMOResponseFactory } from '../pipeline/CMOResponse.js';

export class CMOMigration {
  constructor() {
    this.v1 = cmoAssistantV1;
    this.v2 = cmoAssistantV2;
    this.initialized = false;
    this.mode = 'migration'; // 'v1', 'v2', 'dual', 'migration'
    this.metrics = {
      v1Calls: 0,
      v2Calls: 0,
      dualCalls: 0,
      errors: 0,
      migrationStarted: null
    };
  }

  /**
   * Initialize migration system
   */
  async initialize() {
    if (this.initialized) return;
    
    console.log('🔄 Initializing CMO Migration system...');
    
    try {
      // Initialize both versions
      // V1 doesn't have initialize method, only V2 does
      if (this.v1.initialize) {
        await this.v1.initialize();
      }
      await this.v2.initialize();
      
      this.initialized = true;
      console.log('✅ CMO Migration system initialized');
      
    } catch (error) {
      console.error('Failed to initialize migration system:', error);
      throw error;
    }
  }

  /**
   * Set migration mode
   * @param {string} mode - 'v1', 'v2', 'dual', 'migration'
   */
  setMode(mode) {
    const validModes = ['v1', 'v2', 'dual', 'migration'];
    if (!validModes.includes(mode)) {
      throw new Error(`Invalid mode: ${mode}. Must be one of: ${validModes.join(', ')}`);
    }
    
    console.log(`🔄 Setting CMO mode to: ${mode}`);
    this.mode = mode;
    
    if (mode === 'migration') {
      this.metrics.migrationStarted = Date.now();
    }
  }

  /**
   * Process message based on current mode
   */
  async processMessage(message, userId, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    console.log('🔄 CMOMigration.processMessage called:', {
      mode: this.mode,
      subMode: options.subMode,
      hasFieldAssistance: options.subMode === 'field_assistance'
    });
    
    switch (this.mode) {
      case 'v1':
        return this.processV1(message, userId, options);
        
      case 'v2':
        // FORCE V1 for field assistance even in V2 mode
        if (options.subMode === 'field_assistance') {
          console.log('🎯 CMOMigration: Forcing V1 for field assistance (even in V2 mode)');
          return this.processV1(message, userId, options);
        }
        return this.processV2(message, userId, options);
        
      case 'dual':
        return this.processDual(message, userId, options);
        
      case 'migration':
        return this.processMigration(message, userId, options);
        
      default:
        throw new Error(`Unknown mode: ${this.mode}`);
    }
  }

  /**
   * Process using V1 only
   */
  async processV1(message, userId, options) {
    this.metrics.v1Calls++;
    
    try {
      // Call V1 with proper method
      if (this.v1.processMessage) {
        return await this.v1.processMessage(message, userId, options);
      } else {
        // Fallback to processQuery for backward compatibility
        return await this.v1.processQuery(message, {
          userId,
          ...options
        });
      }
    } catch (error) {
      this.metrics.errors++;
      console.error('V1 processing error:', error);
      throw error;
    }
  }

  /**
   * Process using V2 only
   */
  async processV2(message, userId, options) {
    this.metrics.v2Calls++;
    
    try {
      const response = await this.v2.processMessage(message, userId, options);
      
      // Convert to legacy format if needed
      if (options.expectLegacyFormat !== false) {
        return this.convertV2ToLegacy(response);
      }
      
      return response;
    } catch (error) {
      this.metrics.errors++;
      console.error('V2 processing error:', error);
      throw error;
    }
  }

  /**
   * Process using both versions (for testing)
   */
  async processDual(message, userId, options) {
    this.metrics.dualCalls++;
    
    console.log('🔄 Running dual mode comparison...');
    
    try {
      // Run both in parallel
      const [v1Result, v2Result] = await Promise.allSettled([
        this.processV1(message, userId, options),
        this.processV2(message, userId, { ...options, expectLegacyFormat: true })
      ]);
      
      // Compare results
      const comparison = this.compareResults(
        v1Result.status === 'fulfilled' ? v1Result.value : null,
        v2Result.status === 'fulfilled' ? v2Result.value : null
      );
      
      // Log comparison
      console.log('📊 Dual mode comparison:', comparison);
      
      // Return V2 result if successful, otherwise V1
      if (v2Result.status === 'fulfilled') {
        return v2Result.value;
      } else if (v1Result.status === 'fulfilled') {
        console.warn('⚠️ V2 failed, returning V1 result');
        return v1Result.value;
      } else {
        throw new Error('Both versions failed');
      }
      
    } catch (error) {
      this.metrics.errors++;
      console.error('Dual processing error:', error);
      throw error;
    }
  }

  /**
   * Process with gradual migration logic
   */
  async processMigration(message, userId, options) {
    console.log('🔄 processMigration called with:', {
      message: message.substring(0, 50),
      subMode: options.subMode,
      fieldAssistance: options.subMode === 'field_assistance'
    });
    
    // Determine which version to use based on migration rules
    const useV2 = this.shouldUseV2(message, userId, options);
    
    if (useV2) {
      console.log('🆕 Using V2 for this request');
      return this.processV2(message, userId, options);
    } else {
      console.log('🔄 Using V1 for this request');
      return this.processV1(message, userId, options);
    }
  }

  /**
   * Determine if V2 should be used (migration logic)
   */
  shouldUseV2(message, userId, options) {
    // ALWAYS use V1 for field assistance (V2 pipeline doesn't handle it properly)
    if (options.subMode === 'field_assistance') {
      console.log('🎯 CMOMigration: Using V1 for field assistance');
      return false;
    }
    
    // ALWAYS use V2 for direct mail queries (conversational flow fix)
    const messageLower = message.toLowerCase();
    if (messageLower.includes('postcard') || 
        messageLower.includes('direct mail') ||
        messageLower.includes('mailer') ||
        messageLower.includes('mail campaign') ||
        options.subMode === 'direct_mail') {
      console.log('🎯 CMOMigration: Using V2 for direct mail query');
      return true;
    }
    
    // Option 1: Percentage-based rollout
    if (options.rolloutPercentage) {
      const hash = this.hashString(userId || message);
      return (hash % 100) < options.rolloutPercentage;
    }
    
    // Option 2: Feature flag
    if (options.useV2 !== undefined) {
      return options.useV2;
    }
    
    // Option 3: Specific channels first (already checked above)
    const v2Channels = ['direct mail', 'postcard', 'mailer', 'direct-mail', 'dm campaign'];
    if (v2Channels.some(channel => messageLower.includes(channel))) {
      console.log('✅ Detected V2 channel in message, using V2');
      return true;
    }
    
    // Also check subMode
    if (options.subMode === 'direct_mail') {
      console.log('✅ SubMode is direct_mail, using V2');
      return true;
    }
    
    // Option 4: Specific users
    if (options.v2Users && options.v2Users.includes(userId)) {
      return true;
    }
    
    // Default to V1
    return false;
  }

  /**
   * Compare results from V1 and V2
   */
  compareResults(v1Result, v2Result) {
    const comparison = {
      v1Success: !!v1Result,
      v2Success: !!v2Result,
      contentMatch: false,
      confidenceMatch: false,
      structureMatch: false,
      differences: []
    };
    
    if (!v1Result || !v2Result) {
      return comparison;
    }
    
    // Compare content
    const v1Content = v1Result.content || v1Result.response;
    const v2Content = v2Result.content || v2Result.response;
    
    if (v1Content && v2Content) {
      // Simple similarity check (in production, use better algorithm)
      comparison.contentMatch = this.calculateSimilarity(v1Content, v2Content) > 0.8;
      
      if (!comparison.contentMatch) {
        comparison.differences.push({
          type: 'content',
          v1Length: v1Content.length,
          v2Length: v2Content.length
        });
      }
    }
    
    // Compare confidence
    if (v1Result.confidence && v2Result.confidence) {
      comparison.confidenceMatch = Math.abs(v1Result.confidence - v2Result.confidence) < 0.2;
      
      if (!comparison.confidenceMatch) {
        comparison.differences.push({
          type: 'confidence',
          v1: v1Result.confidence,
          v2: v2Result.confidence
        });
      }
    }
    
    // Compare structure
    comparison.structureMatch = this.compareStructure(v1Result, v2Result);
    
    return comparison;
  }

  /**
   * Calculate simple text similarity
   */
  calculateSimilarity(text1, text2) {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Compare response structure
   */
  compareStructure(v1Result, v2Result) {
    const v1Keys = new Set(Object.keys(v1Result));
    const v2Keys = new Set(Object.keys(v2Result));
    
    const commonKeys = new Set([...v1Keys].filter(x => v2Keys.has(x)));
    
    return commonKeys.size / Math.max(v1Keys.size, v2Keys.size) > 0.7;
  }

  /**
   * Convert V2 response to legacy format
   */
  convertV2ToLegacy(v2Response) {
    if (!v2Response) return null;
    
    // If it's already in legacy format
    if (v2Response.content && typeof v2Response.content === 'string') {
      return v2Response;
    }
    
    // Convert CMOResponse to legacy
    return {
      content: v2Response.content,
      response: v2Response.content, // Some code expects 'response' field
      confidence: v2Response.confidence,
      structured: v2Response.structured,
      metadata: v2Response.metadata,
      quickActions: v2Response.ui?.quickActions || [],
      citations: v2Response.ui?.citations || [],
      suggestions: v2Response.ui?.followUpQuestions || [],
      type: v2Response.metadata?.queryType || 'general',
      format: 'adaptive',
      mode: 'cmo',
      subMode: v2Response.metadata?.channel || 'general'
    };
  }

  /**
   * Simple hash function for percentage rollout
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get migration metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      mode: this.mode,
      v1Percentage: this.metrics.v1Calls / (this.metrics.v1Calls + this.metrics.v2Calls) * 100,
      v2Percentage: this.metrics.v2Calls / (this.metrics.v1Calls + this.metrics.v2Calls) * 100,
      errorRate: this.metrics.errors / (this.metrics.v1Calls + this.metrics.v2Calls + this.metrics.dualCalls) * 100
    };
  }

  /**
   * Validate V2 is working correctly
   */
  async validateV2() {
    console.log('🔍 Validating V2 implementation...');
    
    const testCases = [
      {
        name: 'Direct Mail Query',
        message: 'I need help with a direct mail campaign for cruise packages',
        expectedChannel: 'direct_mail'
      },
      {
        name: 'Generic Marketing Query',
        message: 'What are the best marketing strategies for travel agents?',
        expectedChannel: 'general'
      },
      {
        name: 'ROI Question',
        message: 'What ROI can I expect from direct mail postcards?',
        expectedChannel: 'direct_mail'
      }
    ];
    
    const results = [];
    
    for (const testCase of testCases) {
      try {
        const response = await this.v2.processMessage(
          testCase.message,
          'test-user',
          { legacyFormat: true }
        );
        
        results.push({
          test: testCase.name,
          passed: response && response.content && response.content.length > 0,
          channel: response?.metadata?.channel || response?.subMode,
          expectedChannel: testCase.expectedChannel,
          channelMatch: (response?.metadata?.channel || response?.subMode) === testCase.expectedChannel
        });
        
      } catch (error) {
        results.push({
          test: testCase.name,
          passed: false,
          error: error.message
        });
      }
    }
    
    const allPassed = results.every(r => r.passed && r.channelMatch);
    
    console.log('📊 V2 Validation Results:', {
      allPassed,
      results
    });
    
    return {
      valid: allPassed,
      results
    };
  }
}

// Create singleton instance
const cmoMigration = new CMOMigration();

export default cmoMigration;