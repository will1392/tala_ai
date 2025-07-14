/**
 * ProfileEnricher - Automatic Profile Enrichment for Tala AI
 * 
 * Automatically enriches user profiles from conversations, detects preference changes,
 * maintains preference history with timestamps, and calculates preference confidence scores.
 */

import { createClient } from '@supabase/supabase-js';
import ProfileAggregator from './ProfileAggregator.js';
import ClientProfileManager from './ClientProfileManager.js';

export class ProfileEnricher {
  constructor(options = {}) {
    this.options = {
      enableAutoEnrichment: options.enableAutoEnrichment !== false,
      enableChangeDetection: options.enableChangeDetection !== false,
      enableScheduledEnrichment: options.enableScheduledEnrichment !== false,
      minConfidenceForUpdate: options.minConfidenceForUpdate || 0.7,
      enrichmentWindowDays: options.enrichmentWindowDays || 30,
      batchSize: options.batchSize || 10,
      ...options
    };
    
    // Initialize services
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    this.profileAggregator = new ProfileAggregator({
      enableLLMAnalysis: options.enableLLMAnalysis !== false,
      enablePatternDetection: true,
      enableBudgetAnalysis: true,
      minConfidenceThreshold: this.options.minConfidenceForUpdate
    });
    
    this.profileManager = new ClientProfileManager({
      enableAutoEnrichment: false, // Prevent circular enrichment
      enableAnalytics: true
    });
    
    this.initialized = false;
    
    // Enrichment tracking
    this.enrichmentQueue = new Map();
    this.enrichmentStats = {
      profilesEnriched: 0,
      preferencesAdded: 0,
      preferencesUpdated: 0,
      conflictsDetected: 0
    };
  }

  /**
   * Initialize the profile enricher
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      console.log('🔧 Initializing ProfileEnricher...');
      
      // Initialize dependencies
      await this.profileAggregator.initialize();
      await this.profileManager.initialize();
      
      // Test database connections
      await this.testDatabaseConnections();
      
      this.initialized = true;
      console.log('✅ ProfileEnricher initialized successfully');
      
    } catch (error) {
      console.error('❌ ProfileEnricher initialization failed:', error);
      throw error;
    }
  }

  /**
   * Enrich a user profile from recent conversations
   * @param {string} userId - User ID
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Enrichment options
   * @returns {Object} Enrichment result
   */
  async enrichProfile(userId, organizationId = 'default-org', options = {}) {
    try {
      this.ensureInitialized();
      
      console.log(`🔧 Enriching profile for user ${userId}`);
      
      // Get current profile
      const currentProfile = await this.profileManager.getProfile(userId, organizationId);
      if (!currentProfile.success) {
        return {
          success: false,
          error: 'Profile not found',
          enrichmentDetails: {}
        };
      }
      
      // Analyze recent conversations for new insights
      const analysisResult = await this.profileAggregator.analyzeConversationHistory(
        userId, 
        organizationId,
        {
          windowDays: options.windowDays || this.options.enrichmentWindowDays,
          includeAnalytics: true
        }
      );
      
      if (!analysisResult.success) {
        return {
          success: false,
          error: 'Failed to analyze conversations',
          analysisError: analysisResult.error
        };
      }
      
      // Extract and validate new preferences
      const enrichmentData = await this.extractEnrichmentData(
        analysisResult,
        currentProfile.profile,
        options
      );
      
      // Apply enrichments to profile
      const enrichmentResult = await this.applyEnrichments(
        userId,
        organizationId,
        enrichmentData,
        currentProfile.profile
      );
      
      // Update enrichment statistics
      this.updateEnrichmentStats(enrichmentResult);
      
      console.log(`✅ Profile enrichment completed for user ${userId}`);
      
      return {
        success: true,
        enrichmentDetails: enrichmentResult,
        newPreferences: enrichmentResult.preferencesAdded,
        updatedPreferences: enrichmentResult.preferencesUpdated,
        conflictsDetected: enrichmentResult.conflicts,
        confidenceScore: enrichmentResult.overallConfidence,
        lastEnrichment: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`❌ Failed to enrich profile for user ${userId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Detect preference changes from new conversation data
   * @param {string} userId - User ID
   * @param {string} organizationId - Organization ID
   * @param {Array} newMessages - New conversation messages
   * @returns {Object} Change detection result
   */
  async detectPreferenceChanges(userId, organizationId, newMessages) {
    try {
      this.ensureInitialized();
      
      console.log(`🔍 Detecting preference changes for user ${userId}`);
      
      // Get current profile preferences
      const currentProfile = await this.profileManager.getProfile(userId, organizationId);
      if (!currentProfile.success) {
        return { success: false, error: 'Profile not found' };
      }
      
      // Analyze new messages for preferences
      const newAnalysis = await this.profileAggregator.analyzeConversationHistory(
        userId,
        organizationId,
        {
          specificMessages: newMessages,
          skipPatternAnalysis: true
        }
      );
      
      if (!newAnalysis.success) {
        return { success: false, error: 'Failed to analyze new messages' };
      }
      
      // Compare with existing preferences
      const changes = await this.comparePreferences(
        currentProfile.profile,
        newAnalysis.preferences
      );
      
      // Record significant changes
      const changeRecords = [];
      for (const change of changes) {
        if (change.confidenceScore >= this.options.minConfidenceForUpdate) {
          const record = await this.recordPreferenceChange(
            userId,
            organizationId,
            change
          );
          changeRecords.push(record);
        }
      }
      
      return {
        success: true,
        changesDetected: changes.length,
        significantChanges: changeRecords.length,
        changes: changeRecords,
        analysisDate: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`❌ Failed to detect preference changes for user ${userId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Schedule automatic enrichment for all users
   * @param {Object} options - Scheduling options
   * @returns {Object} Scheduling result
   */
  async scheduleAutomaticEnrichment(options = {}) {
    try {
      this.ensureInitialized();
      
      if (!this.options.enableScheduledEnrichment) {
        return {
          success: false,
          error: 'Scheduled enrichment is disabled'
        };
      }
      
      console.log('📅 Starting scheduled automatic enrichment...');
      
      // Get users who need enrichment
      const usersToEnrich = await this.getUsersNeedingEnrichment(options);
      
      let enrichedCount = 0;
      let errorCount = 0;
      const results = [];
      
      // Process users in batches
      for (let i = 0; i < usersToEnrich.length; i += this.options.batchSize) {
        const batch = usersToEnrich.slice(i, i + this.options.batchSize);
        
        const batchPromises = batch.map(async (user) => {
          try {
            const result = await this.enrichProfile(user.user_id, user.organization_id);
            if (result.success) {
              enrichedCount++;
            } else {
              errorCount++;
            }
            return { userId: user.user_id, result };
          } catch (error) {
            errorCount++;
            return { userId: user.user_id, error: error.message };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Small delay between batches
        if (i + this.options.batchSize < usersToEnrich.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log(`✅ Scheduled enrichment completed: ${enrichedCount} enriched, ${errorCount} errors`);
      
      return {
        success: true,
        usersProcessed: usersToEnrich.length,
        usersEnriched: enrichedCount,
        errors: errorCount,
        results: results
      };
      
    } catch (error) {
      console.error('❌ Failed to run scheduled enrichment:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get enrichment recommendations for a user
   * @param {string} userId - User ID
   * @param {string} organizationId - Organization ID
   * @returns {Object} Recommendations
   */
  async getEnrichmentRecommendations(userId, organizationId = 'default-org') {
    try {
      this.ensureInitialized();
      
      // Get profile completeness analysis
      const profile = await this.profileManager.getProfile(userId, organizationId);
      if (!profile.success) {
        return {
          success: false,
          error: 'Profile not found'
        };
      }
      
      // Use database function for enrichment recommendations
      const { data: recommendations, error } = await this.supabase
        .rpc('get_profile_enrichment_recommendations', {
          p_user_id: userId,
          p_organization_id: organizationId
        });
      
      if (error) {
        throw new Error(`Failed to get recommendations: ${error.message}`);
      }
      
      // Add conversation-based recommendations
      const conversationRecs = await this.getConversationBasedRecommendations(
        userId,
        organizationId
      );
      
      return {
        success: true,
        recommendations: recommendations || [],
        conversationRecommendations: conversationRecs,
        profileCompleteness: profile.profile.profile_completeness_score || 0
      };
      
    } catch (error) {
      console.error(`❌ Failed to get enrichment recommendations for user ${userId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Helper methods

  async extractEnrichmentData(analysisResult, currentProfile, options) {
    const enrichmentData = {
      newPreferences: {},
      updatedPreferences: {},
      conflicts: [],
      travelPatterns: {},
      budgetInsights: {},
      companionInfo: {}
    };
    
    const { preferences, patterns } = analysisResult;
    
    // Process new preferences
    Object.entries(preferences).forEach(([key, preference]) => {
      if (preference.confidence >= this.options.minConfidenceForUpdate) {
        const prefPath = this.mapPreferenceToProfileField(key);
        
        if (prefPath) {
          const currentValue = this.getNestedValue(currentProfile, prefPath);
          
          if (!currentValue) {
            // New preference
            enrichmentData.newPreferences[key] = preference;
          } else {
            // Potential update or conflict
            const conflict = this.detectPreferenceConflict(
              currentValue,
              preference,
              prefPath
            );
            
            if (conflict) {
              enrichmentData.conflicts.push(conflict);
            } else {
              enrichmentData.updatedPreferences[key] = preference;
            }
          }
        }
      }
    });
    
    // Extract travel patterns
    if (patterns) {
      enrichmentData.travelPatterns = patterns;
    }
    
    return enrichmentData;
  }

  async applyEnrichments(userId, organizationId, enrichmentData, currentProfile) {
    const result = {
      preferencesAdded: 0,
      preferencesUpdated: 0,
      conflicts: enrichmentData.conflicts || [],
      overallConfidence: 0
    };
    
    const profileUpdates = {};
    let confidenceSum = 0;
    let confidenceCount = 0;
    
    // Apply new preferences
    for (const [key, preference] of Object.entries(enrichmentData.newPreferences)) {
      const prefPath = this.mapPreferenceToProfileField(key);
      if (prefPath) {
        this.setNestedValue(profileUpdates, prefPath, preference.value);
        result.preferencesAdded++;
        confidenceSum += preference.confidence;
        confidenceCount++;
        
        // Record in preference history
        await this.profileManager.recordPreferenceHistory(userId, organizationId, {
          category: preference.category || 'general',
          type: preference.type || 'auto_enriched',
          value: JSON.stringify(preference.value),
          confidenceScore: preference.confidence,
          dataSource: 'auto_enrichment',
          action: 'added',
          context: `Auto-enriched from conversation analysis`
        });
      }
    }
    
    // Apply preference updates
    for (const [key, preference] of Object.entries(enrichmentData.updatedPreferences)) {
      const prefPath = this.mapPreferenceToProfileField(key);
      if (prefPath) {
        const currentValue = this.getNestedValue(currentProfile, prefPath);
        
        this.setNestedValue(profileUpdates, prefPath, preference.value);
        result.preferencesUpdated++;
        confidenceSum += preference.confidence;
        confidenceCount++;
        
        // Record in preference history
        await this.profileManager.recordPreferenceHistory(userId, organizationId, {
          category: preference.category || 'general',
          type: preference.type || 'auto_enriched',
          value: JSON.stringify(preference.value),
          confidenceScore: preference.confidence,
          dataSource: 'auto_enrichment',
          action: 'updated',
          previousValue: JSON.stringify(currentValue),
          context: `Auto-enriched from conversation analysis`
        });
      }
    }
    
    // Calculate overall confidence
    result.overallConfidence = confidenceCount > 0 ? confidenceSum / confidenceCount : 0;
    
    // Update profile if there are changes
    if (Object.keys(profileUpdates).length > 0) {
      profileUpdates.enrichmentSource = 'auto_enrichment';
      profileUpdates.lastEnrichmentDate = new Date().toISOString();
      
      await this.profileManager.updateProfile(userId, profileUpdates, organizationId);
    }
    
    return result;
  }

  async comparePreferences(currentProfile, newPreferences) {
    const changes = [];
    
    for (const [key, newPref] of Object.entries(newPreferences)) {
      const prefPath = this.mapPreferenceToProfileField(key);
      if (!prefPath) continue;
      
      const currentValue = this.getNestedValue(currentProfile, prefPath);
      
      // Check for meaningful changes
      if (this.isSignificantChange(currentValue, newPref.value, newPref.confidence)) {
        changes.push({
          preferenceKey: key,
          category: newPref.category || 'general',
          currentValue,
          newValue: newPref.value,
          confidenceScore: newPref.confidence,
          changeType: currentValue ? 'update' : 'new',
          significance: this.calculateChangeSignificance(currentValue, newPref.value)
        });
      }
    }
    
    return changes;
  }

  async recordPreferenceChange(userId, organizationId, change) {
    try {
      await this.supabase
        .from('preference_history')
        .insert({
          user_id: userId,
          organization_id: organizationId,
          preference_category: change.category,
          preference_type: 'auto_detected_change',
          preference_value: JSON.stringify(change.newValue),
          confidence_score: change.confidenceScore,
          confidence_level: this.getConfidenceLevel(change.confidenceScore),
          data_source: 'conversation_analysis',
          action: change.changeType === 'new' ? 'added' : 'updated',
          previous_value: change.currentValue ? JSON.stringify(change.currentValue) : null,
          context_description: `Auto-detected change (significance: ${change.significance})`
        });
      
      return {
        ...change,
        recorded: true,
        recordedAt: new Date().toISOString()
      };
    } catch (error) {
      console.warn('Failed to record preference change:', error.message);
      return {
        ...change,
        recorded: false,
        error: error.message
      };
    }
  }

  async getUsersNeedingEnrichment(options = {}) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - (options.daysSinceLastEnrichment || 7));
      
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('user_id, organization_id, last_enrichment_date, profile_completeness_score')
        .or(`last_enrichment_date.is.null,last_enrichment_date.lt.${cutoffDate.toISOString()}`)
        .lt('profile_completeness_score', options.maxCompleteness || 0.8)
        .limit(options.maxUsers || 100);
      
      if (error) {
        throw new Error(`Failed to get users needing enrichment: ${error.message}`);
      }
      
      return data || [];
    } catch (error) {
      console.error('Error getting users needing enrichment:', error);
      return [];
    }
  }

  async getConversationBasedRecommendations(userId, organizationId) {
    try {
      // Get recent conversation analysis
      const analysis = await this.profileAggregator.analyzeConversationHistory(
        userId,
        organizationId,
        { windowDays: 7, maxMessages: 20 }
      );
      
      const recommendations = [];
      
      if (analysis.success && analysis.messageCount > 0) {
        if (analysis.messageCount < 5) {
          recommendations.push({
            category: 'conversation_data',
            recommendation: 'More conversation history needed for better insights',
            priority: 2,
            actionable: true
          });
        }
        
        if (Object.keys(analysis.preferences).length < 3) {
          recommendations.push({
            category: 'preference_depth',
            recommendation: 'Ask more detailed questions about travel preferences',
            priority: 1,
            actionable: true
          });
        }
      }
      
      return recommendations;
    } catch (error) {
      console.warn('Error getting conversation-based recommendations:', error.message);
      return [];
    }
  }

  // Utility methods

  mapPreferenceToProfileField(preferenceKey) {
    const mapping = {
      'accommodation_luxury': 'accommodation_preferences.luxury_level',
      'accommodation_type': 'accommodation_preferences.preferred_types',
      'activity_adventure': 'activity_preferences.adventure_level',
      'activity_culture': 'activity_preferences.cultural_interest',
      'budget_flexibility': 'budget_flexibility',
      'budget_range': 'average_trip_budget',
      'dining_cuisine': 'dining_preferences.preferred_cuisines',
      'transportation_class': 'transportation_preferences.class_preference'
    };
    
    return mapping[preferenceKey] || null;
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  detectPreferenceConflict(currentValue, newPreference, prefPath) {
    if (!currentValue || !newPreference.value) return null;
    
    // Simple conflict detection logic
    const isConflict = JSON.stringify(currentValue) !== JSON.stringify(newPreference.value) &&
                      newPreference.confidence < 0.9;
    
    if (isConflict) {
      return {
        path: prefPath,
        currentValue,
        newValue: newPreference.value,
        confidence: newPreference.confidence,
        reason: 'Value mismatch with low confidence'
      };
    }
    
    return null;
  }

  isSignificantChange(currentValue, newValue, confidence) {
    if (!currentValue) return confidence >= this.options.minConfidenceForUpdate;
    
    // Different types of significance checks
    if (typeof currentValue !== typeof newValue) return true;
    if (JSON.stringify(currentValue) !== JSON.stringify(newValue)) {
      return confidence >= this.options.minConfidenceForUpdate;
    }
    
    return false;
  }

  calculateChangeSignificance(currentValue, newValue) {
    if (!currentValue) return 'new';
    if (typeof currentValue !== typeof newValue) return 'high';
    
    const currentStr = JSON.stringify(currentValue);
    const newStr = JSON.stringify(newValue);
    
    if (currentStr === newStr) return 'none';
    if (currentStr.length !== newStr.length) return 'medium';
    
    return 'low';
  }

  getConfidenceLevel(score) {
    if (score >= 0.9) return 'very_high';
    if (score >= 0.7) return 'high';
    if (score >= 0.5) return 'medium';
    if (score >= 0.3) return 'low';
    return 'very_low';
  }

  updateEnrichmentStats(enrichmentResult) {
    this.enrichmentStats.profilesEnriched++;
    this.enrichmentStats.preferencesAdded += enrichmentResult.preferencesAdded || 0;
    this.enrichmentStats.preferencesUpdated += enrichmentResult.preferencesUpdated || 0;
    this.enrichmentStats.conflictsDetected += (enrichmentResult.conflicts?.length || 0);
  }

  async testDatabaseConnections() {
    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('count')
        .limit(1);
      
      if (error && !error.message.includes('relation "user_profiles" does not exist')) {
        throw new Error(`Database connection failed: ${error.message}`);
      }
    } catch (error) {
      throw new Error(`Database test failed: ${error.message}`);
    }
  }

  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('ProfileEnricher not initialized. Call initialize() first.');
    }
  }

  /**
   * Get enrichment statistics
   */
  getEnrichmentStats() {
    return {
      ...this.enrichmentStats,
      queueSize: this.enrichmentQueue.size
    };
  }

  /**
   * Clear enrichment queue and stats
   */
  clearEnrichmentData() {
    this.enrichmentQueue.clear();
    this.enrichmentStats = {
      profilesEnriched: 0,
      preferencesAdded: 0,
      preferencesUpdated: 0,
      conflictsDetected: 0
    };
    console.log('🧹 Profile enrichment data cleared');
  }
}

export default ProfileEnricher;