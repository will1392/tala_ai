/**
 * ClientProfileManager - Advanced Client Profile Management for Tala AI
 * 
 * Provides comprehensive client profile management including creation, updates,
 * travel history tracking, preference management, and profile analytics.
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export class ClientProfileManager {
  constructor(options = {}) {
    this.options = {
      enableAutoEnrichment: options.enableAutoEnrichment !== false,
      enableAnalytics: options.enableAnalytics !== false,
      cacheProfiles: options.cacheProfiles !== false,
      ...options
    };
    
    // Initialize database connection
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    // Cache for profile data
    this.profileCache = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the profile manager
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      console.log('👤 Initializing ClientProfileManager...');
      
      // Test database connection
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('count')
        .limit(1);
      
      if (error && !error.message.includes('relation "user_profiles" does not exist')) {
        throw new Error(`Database connection failed: ${error.message}`);
      }
      
      this.initialized = true;
      console.log('✅ ClientProfileManager initialized successfully');
      
    } catch (error) {
      console.error('❌ ClientProfileManager initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create a new client profile
   * @param {string} userId - User ID
   * @param {Object} initialData - Initial profile data
   * @param {string} organizationId - Organization ID for multi-tenancy
   * @returns {Object} Created profile
   */
  async createProfile(userId, initialData = {}, organizationId = 'default-org') {
    try {
      this.ensureInitialized();
      
      console.log(`👤 Creating profile for user ${userId} in organization ${organizationId}`);
      
      // Check if profile already exists
      const existingProfile = await this.getProfile(userId, organizationId);
      if (existingProfile.success) {
        return {
          success: false,
          error: 'Profile already exists',
          profile: existingProfile.profile
        };
      }
      
      // Prepare profile data with defaults
      const profileData = {
        user_id: userId,
        organization_id: organizationId,
        
        // Basic preferences with defaults
        travel_preferences: initialData.travelPreferences || {},
        dietary_restrictions: initialData.dietaryRestrictions || [],
        accessibility_needs: initialData.accessibilityNeeds || [],
        language_preferences: initialData.languagePreferences || ['en'],
        
        // Enhanced preference categories
        accommodation_preferences: initialData.accommodationPreferences || {},
        activity_preferences: initialData.activityPreferences || {},
        transportation_preferences: initialData.transportationPreferences || {},
        dining_preferences: initialData.diningPreferences || {},
        
        // Budget and travel patterns
        budget_category: initialData.budgetCategory || 'mid_range',
        average_trip_budget: initialData.averageTripBudget,
        budget_flexibility: initialData.budgetFlexibility || 0.5,
        travel_frequency: initialData.travelFrequency || 'occasional',
        trips_per_year: initialData.tripsPerYear || 0,
        
        // Seasonal and timing preferences
        seasonal_preferences: initialData.seasonalPreferences || {},
        preferred_trip_duration: initialData.preferredTripDuration || {},
        booking_lead_time: initialData.bookingLeadTime,
        
        // Important dates and personal details
        important_dates: initialData.importantDates || {},
        personal_details: initialData.personalDetails || {},
        
        // Loyalty programs and service preferences
        loyalty_programs: initialData.loyaltyPrograms || {},
        preferred_airlines: initialData.preferredAirlines || [],
        preferred_hotels: initialData.preferredHotels || [],
        
        // Communication preferences
        communication_style: initialData.communicationStyle || 'balanced',
        notification_preferences: initialData.notificationPreferences || {},
        
        // Metadata
        profile_version: 1,
        last_enrichment_date: new Date().toISOString(),
        enrichment_source: 'initial_creation',
        
        // Calculate initial completeness
        profile_completeness_score: this.calculateCompleteness(initialData),
        
        // Notes
        notes: initialData.notes || ''
      };
      
      // Insert profile
      const { data, error } = await this.supabase
        .from('user_profiles')
        .insert(profileData)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to create profile: ${error.message}`);
      }
      
      // Clear cache and add new profile
      this.clearProfileCache(userId, organizationId);
      
      console.log(`✅ Profile created for user ${userId}`);
      
      return {
        success: true,
        profile: data,
        completeness: data.profile_completeness_score
      };
      
    } catch (error) {
      console.error(`❌ Failed to create profile for user ${userId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update an existing client profile
   * @param {string} userId - User ID
   * @param {Object} updates - Profile updates
   * @param {string} organizationId - Organization ID
   * @returns {Object} Update result
   */
  async updateProfile(userId, updates, organizationId = 'default-org') {
    try {
      this.ensureInitialized();
      
      console.log(`👤 Updating profile for user ${userId}`);
      
      // Get current profile to merge updates
      const currentProfile = await this.getProfile(userId, organizationId);
      if (!currentProfile.success) {
        return {
          success: false,
          error: 'Profile not found'
        };
      }
      
      // Prepare update data
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
        profile_version: (currentProfile.profile.profile_version || 1) + 1,
        last_enrichment_date: new Date().toISOString(),
        enrichment_source: updates.enrichmentSource || 'manual_update'
      };
      
      // Recalculate completeness if profile data changed
      if (this.hasProfileDataChanges(updates)) {
        const mergedData = { ...currentProfile.profile, ...updates };
        updateData.profile_completeness_score = this.calculateCompleteness(mergedData);
      }
      
      // Update profile
      const { data, error } = await this.supabase
        .from('user_profiles')
        .update(updateData)
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to update profile: ${error.message}`);
      }
      
      // Clear cache
      this.clearProfileCache(userId, organizationId);
      
      console.log(`✅ Profile updated for user ${userId}`);
      
      return {
        success: true,
        profile: data,
        completeness: data.profile_completeness_score
      };
      
    } catch (error) {
      console.error(`❌ Failed to update profile for user ${userId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get a client profile
   * @param {string} userId - User ID
   * @param {string} organizationId - Organization ID
   * @returns {Object} Profile data
   */
  async getProfile(userId, organizationId = 'default-org') {
    try {
      this.ensureInitialized();
      
      // Check cache first
      const cacheKey = `${userId}:${organizationId}`;
      if (this.options.cacheProfiles && this.profileCache.has(cacheKey)) {
        return {
          success: true,
          profile: this.profileCache.get(cacheKey),
          cached: true
        };
      }
      
      // Fetch from database
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') { // Not found
          return {
            success: false,
            error: 'Profile not found'
          };
        }
        throw new Error(`Failed to get profile: ${error.message}`);
      }
      
      // Cache the result
      if (this.options.cacheProfiles) {
        this.profileCache.set(cacheKey, data);
      }
      
      return {
        success: true,
        profile: data
      };
      
    } catch (error) {
      console.error(`❌ Failed to get profile for user ${userId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add travel history for a user
   * @param {string} userId - User ID
   * @param {Object} tripData - Trip data
   * @param {string} organizationId - Organization ID
   * @returns {Object} Result
   */
  async addTravelHistory(userId, tripData, organizationId = 'default-org') {
    try {
      this.ensureInitialized();
      
      console.log(`✈️ Adding travel history for user ${userId}`);
      
      // Validate required fields
      if (!tripData.primaryDestination || !tripData.startDate || !tripData.endDate) {
        throw new Error('Primary destination, start date, and end date are required');
      }
      
      // Prepare travel history data
      const travelData = {
        user_id: userId,
        organization_id: organizationId,
        
        // Basic trip info
        trip_name: tripData.tripName,
        trip_type: tripData.tripType || 'leisure',
        
        // Destinations
        primary_destination: tripData.primaryDestination,
        destinations_visited: tripData.destinationsVisited || [tripData.primaryDestination],
        countries_visited: tripData.countriesVisited || [],
        
        // Dates
        start_date: tripData.startDate,
        end_date: tripData.endDate,
        
        // Budget and costs
        total_budget: tripData.totalBudget,
        actual_cost: tripData.actualCost,
        currency: tripData.currency || 'USD',
        cost_breakdown: tripData.costBreakdown || {},
        
        // Travel arrangements
        airlines_used: tripData.airlinesUsed || [],
        hotels_stayed: tripData.hotelsStayed || [],
        accommodation_types: tripData.accommodationTypes || [],
        transportation_modes: tripData.transportationModes || [],
        
        // Experience
        activities_enjoyed: tripData.activitiesEnjoyed || [],
        restaurants_visited: tripData.restaurantsVisited || [],
        experience_rating: tripData.experienceRating,
        would_return: tripData.wouldReturn,
        
        // Companions
        travel_companions: tripData.travelCompanions || [],
        companion_count: tripData.companionCount || 1,
        
        // Booking info
        booking_source: tripData.bookingSource,
        booking_lead_time: tripData.bookingLeadTime,
        spontaneous: tripData.spontaneous || false,
        
        // Learning
        lessons_learned: tripData.lessonsLearned,
        preferences_discovered: tripData.preferencesDiscovered || {},
        
        // Metadata
        data_source: tripData.dataSource || 'conversation',
        confidence_score: tripData.confidenceScore || 0.8
      };
      
      // Insert travel history
      const { data, error } = await this.supabase
        .from('travel_history')
        .insert(travelData)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to add travel history: ${error.message}`);
      }
      
      // Update profile analytics if enabled
      if (this.options.enableAnalytics) {
        await this.updateProfileAnalytics(userId, organizationId);
      }
      
      console.log(`✅ Travel history added for user ${userId}`);
      
      return {
        success: true,
        travelHistory: data
      };
      
    } catch (error) {
      console.error(`❌ Failed to add travel history for user ${userId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add a preference for a user
   * @param {string} userId - User ID
   * @param {string} category - Preference category
   * @param {Object} preference - Preference data
   * @param {string} organizationId - Organization ID
   * @returns {Object} Result
   */
  async addPreference(userId, category, preference, organizationId = 'default-org') {
    try {
      this.ensureInitialized();
      
      console.log(`🎯 Adding preference for user ${userId}: ${category}`);
      
      // Get current profile
      const profileResult = await this.getProfile(userId, organizationId);
      if (!profileResult.success) {
        throw new Error('Profile not found');
      }
      
      const currentProfile = profileResult.profile;
      
      // Update the appropriate preference category
      const updates = {};
      const categoryMap = {
        'travel': 'travel_preferences',
        'accommodation': 'accommodation_preferences',
        'activity': 'activity_preferences',
        'transportation': 'transportation_preferences',
        'dining': 'dining_preferences',
        'seasonal': 'seasonal_preferences',
        'budget': 'budget_preferences'
      };
      
      const dbField = categoryMap[category] || `${category}_preferences`;
      
      // Merge new preference with existing
      const currentPreferences = currentProfile[dbField] || {};
      const updatedPreferences = {
        ...currentPreferences,
        ...preference
      };
      
      updates[dbField] = updatedPreferences;
      
      // Update profile
      const updateResult = await this.updateProfile(userId, updates, organizationId);
      
      // Record preference history
      await this.recordPreferenceHistory(userId, organizationId, {
        category,
        type: preference.type || 'general',
        value: JSON.stringify(preference),
        confidenceScore: preference.confidenceScore || 0.8,
        dataSource: preference.dataSource || 'explicit',
        action: 'added',
        conversationId: preference.conversationId,
        context: preference.context
      });
      
      console.log(`✅ Preference added for user ${userId}`);
      
      return {
        success: true,
        updatedProfile: updateResult.profile
      };
      
    } catch (error) {
      console.error(`❌ Failed to add preference for user ${userId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get a comprehensive profile summary
   * @param {string} userId - User ID
   * @param {string} organizationId - Organization ID
   * @returns {Object} Profile summary
   */
  async getProfileSummary(userId, organizationId = 'default-org') {
    try {
      this.ensureInitialized();
      
      console.log(`📊 Generating profile summary for user ${userId}`);
      
      // Get basic profile
      const profileResult = await this.getProfile(userId, organizationId);
      if (!profileResult.success) {
        return {
          success: false,
          error: 'Profile not found'
        };
      }
      
      const profile = profileResult.profile;
      
      // Get travel history summary
      const { data: travelHistory } = await this.supabase
        .from('travel_history')
        .select('*')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .order('start_date', { ascending: false })
        .limit(10);
      
      // Get travel companions
      const { data: companions } = await this.supabase
        .from('travel_companions')
        .select('*')
        .eq('user_id', userId)
        .eq('organization_id', organizationId);
      
      // Get service preferences
      const { data: servicePreferences } = await this.supabase
        .from('service_preferences')
        .select('*')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .order('preference_score', { ascending: false });
      
      // Calculate analytics
      const analytics = await this.calculateProfileAnalytics(userId, organizationId, {
        profile,
        travelHistory: travelHistory || [],
        companions: companions || [],
        servicePreferences: servicePreferences || []
      });
      
      // Build summary
      const summary = {
        userId,
        organizationId,
        profile: {
          completeness: profile.profile_completeness_score,
          version: profile.profile_version,
          lastUpdated: profile.updated_at,
          lastEnrichment: profile.last_enrichment_date
        },
        travelPattern: {
          frequency: profile.travel_frequency,
          tripsPerYear: profile.trips_per_year,
          totalTrips: travelHistory?.length || 0,
          averageTripDuration: analytics.averageTripDuration,
          lastTripDate: travelHistory?.[0]?.start_date
        },
        budgetProfile: {
          category: profile.budget_category,
          averageBudget: profile.average_trip_budget,
          flexibility: profile.budget_flexibility,
          averageActualCost: analytics.averageActualCost
        },
        preferences: {
          destinations: analytics.topDestinations,
          accommodations: Object.keys(profile.accommodation_preferences || {}),
          activities: Object.keys(profile.activity_preferences || {}),
          airlines: analytics.preferredAirlines,
          hotels: analytics.preferredHotels
        },
        personalInfo: {
          dietaryRestrictions: profile.dietary_restrictions || [],
          accessibilityNeeds: profile.accessibility_needs || [],
          communicationStyle: profile.communication_style,
          languages: profile.language_preferences || []
        },
        companions: {
          frequentCompanions: companions?.filter(c => c.is_frequent_companion) || [],
          totalCompanions: companions?.length || 0
        },
        enrichmentRecommendations: analytics.enrichmentRecommendations
      };
      
      return {
        success: true,
        summary
      };
      
    } catch (error) {
      console.error(`❌ Failed to generate profile summary for user ${userId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Helper methods

  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('ClientProfileManager not initialized. Call initialize() first.');
    }
  }

  calculateCompleteness(profileData) {
    let score = 0;
    const weights = {
      basicInfo: 0.2,       // 20%
      preferences: 0.3,     // 30%
      travelHistory: 0.2,   // 20%
      personalDetails: 0.15, // 15%
      servicePrefs: 0.15    // 15%
    };
    
    // Basic info
    if (profileData.travelPreferences && Object.keys(profileData.travelPreferences).length > 0) {
      score += weights.basicInfo;
    }
    
    // Preferences
    let prefCount = 0;
    ['accommodationPreferences', 'activityPreferences', 'transportationPreferences', 'diningPreferences'].forEach(pref => {
      if (profileData[pref] && Object.keys(profileData[pref]).length > 0) {
        prefCount++;
      }
    });
    score += (prefCount / 4) * weights.preferences;
    
    // Personal details
    let personalCount = 0;
    if (profileData.dietaryRestrictions && profileData.dietaryRestrictions.length > 0) personalCount++;
    if (profileData.accessibilityNeeds && profileData.accessibilityNeeds.length > 0) personalCount++;
    if (profileData.importantDates && Object.keys(profileData.importantDates).length > 0) personalCount++;
    score += (personalCount / 3) * weights.personalDetails;
    
    // Service preferences  
    let serviceCount = 0;
    if (profileData.preferredAirlines && profileData.preferredAirlines.length > 0) serviceCount++;
    if (profileData.preferredHotels && profileData.preferredHotels.length > 0) serviceCount++;
    if (profileData.loyaltyPrograms && Object.keys(profileData.loyaltyPrograms).length > 0) serviceCount++;
    score += (serviceCount / 3) * weights.servicePrefs;
    
    // Travel history would be added separately
    
    return Math.min(1.0, Math.max(0.0, score));
  }

  hasProfileDataChanges(updates) {
    const profileFields = [
      'travel_preferences', 'accommodation_preferences', 'activity_preferences',
      'transportation_preferences', 'dining_preferences', 'dietary_restrictions',
      'accessibility_needs', 'preferred_airlines', 'preferred_hotels',
      'loyalty_programs', 'important_dates', 'personal_details'
    ];
    
    return profileFields.some(field => updates.hasOwnProperty(field));
  }

  async recordPreferenceHistory(userId, organizationId, preferenceData) {
    try {
      await this.supabase
        .from('preference_history')
        .insert({
          user_id: userId,
          organization_id: organizationId,
          preference_category: preferenceData.category,
          preference_type: preferenceData.type,
          preference_value: preferenceData.value,
          confidence_score: preferenceData.confidenceScore,
          confidence_level: this.getConfidenceLevel(preferenceData.confidenceScore),
          data_source: preferenceData.dataSource,
          conversation_id: preferenceData.conversationId,
          context_description: preferenceData.context,
          action: preferenceData.action,
          previous_value: preferenceData.previousValue
        });
    } catch (error) {
      console.warn('Failed to record preference history:', error.message);
    }
  }

  getConfidenceLevel(score) {
    if (score >= 0.9) return 'very_high';
    if (score >= 0.7) return 'high';
    if (score >= 0.5) return 'medium';
    if (score >= 0.3) return 'low';
    return 'very_low';
  }

  async updateProfileAnalytics(userId, organizationId) {
    try {
      // Call database functions to update analytics
      await this.supabase.rpc('calculate_travel_frequency', {
        p_user_id: userId,
        p_organization_id: organizationId
      });
      
      await this.supabase.rpc('calculate_budget_category', {
        p_user_id: userId,
        p_organization_id: organizationId
      });
    } catch (error) {
      console.warn('Failed to update profile analytics:', error.message);
    }
  }

  async calculateProfileAnalytics(userId, organizationId, data) {
    const { profile, travelHistory, companions, servicePreferences } = data;
    
    // Calculate averages and patterns
    const analytics = {
      averageTripDuration: 0,
      averageActualCost: 0,
      topDestinations: [],
      preferredAirlines: [],
      preferredHotels: [],
      enrichmentRecommendations: []
    };
    
    if (travelHistory.length > 0) {
      analytics.averageTripDuration = Math.round(
        travelHistory.reduce((sum, trip) => sum + (trip.duration_days || 0), 0) / travelHistory.length
      );
      
      const costsWithData = travelHistory.filter(trip => trip.actual_cost);
      if (costsWithData.length > 0) {
        analytics.averageActualCost = Math.round(
          costsWithData.reduce((sum, trip) => sum + trip.actual_cost, 0) / costsWithData.length
        );
      }
      
      // Top destinations
      const destCounts = {};
      travelHistory.forEach(trip => {
        destCounts[trip.primary_destination] = (destCounts[trip.primary_destination] || 0) + 1;
      });
      analytics.topDestinations = Object.entries(destCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([dest, count]) => ({ destination: dest, visits: count }));
    }
    
    // Service preferences
    analytics.preferredAirlines = servicePreferences
      .filter(sp => sp.service_type === 'airline')
      .sort((a, b) => b.preference_score - a.preference_score)
      .slice(0, 3)
      .map(sp => sp.service_name);
      
    analytics.preferredHotels = servicePreferences
      .filter(sp => sp.service_type === 'hotel_chain')
      .sort((a, b) => b.preference_score - a.preference_score)
      .slice(0, 3)
      .map(sp => sp.service_name);
    
    // Enrichment recommendations
    if (travelHistory.length < 3) {
      analytics.enrichmentRecommendations.push('Add more travel history');
    }
    if (!profile.average_trip_budget) {
      analytics.enrichmentRecommendations.push('Specify budget preferences');
    }
    if (servicePreferences.length < 3) {
      analytics.enrichmentRecommendations.push('Add preferred service providers');
    }
    
    return analytics;
  }

  clearProfileCache(userId, organizationId) {
    const cacheKey = `${userId}:${organizationId}`;
    this.profileCache.delete(cacheKey);
  }

  /**
   * Clear all caches
   */
  clearAllCaches() {
    this.profileCache.clear();
    console.log('🧹 Profile caches cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      profileCacheSize: this.profileCache.size,
      cacheEnabled: this.options.cacheProfiles
    };
  }
}

export default ClientProfileManager;