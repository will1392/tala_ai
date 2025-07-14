/**
 * Profile Analytics Utilities for Tala AI
 * 
 * Provides utility functions for analyzing profile data, calculating metrics,
 * generating insights, and supporting profile management operations.
 */

/**
 * Calculate profile completeness score
 * @param {Object} profile - User profile data
 * @returns {number} Completeness score (0-1)
 */
export function calculateProfileCompleteness(profile) {
  if (!profile || typeof profile !== 'object') return 0;
  
  const weights = {
    basicInfo: 0.25,        // 25% - Core travel preferences
    preferences: 0.35,      // 35% - Detailed preference categories
    personalDetails: 0.20,  // 20% - Personal requirements and restrictions
    servicePrefs: 0.20      // 20% - Service provider preferences
  };
  
  let score = 0;
  
  // Basic travel information
  let basicScore = 0;
  if (profile.travel_preferences && Object.keys(profile.travel_preferences).length > 0) basicScore += 0.5;
  if (profile.budget_category && profile.budget_category !== 'mid_range') basicScore += 0.3;
  if (profile.travel_frequency && profile.travel_frequency !== 'occasional') basicScore += 0.2;
  score += Math.min(1, basicScore) * weights.basicInfo;
  
  // Detailed preferences
  let prefScore = 0;
  const prefCategories = [
    'accommodation_preferences',
    'activity_preferences', 
    'transportation_preferences',
    'dining_preferences'
  ];
  
  prefCategories.forEach(category => {
    if (profile[category] && Object.keys(profile[category]).length > 0) {
      prefScore += 0.25; // Each category worth 25% of preference score
    }
  });
  score += prefScore * weights.preferences;
  
  // Personal details
  let personalScore = 0;
  if (profile.dietary_restrictions && profile.dietary_restrictions.length > 0) personalScore += 0.3;
  if (profile.accessibility_needs && profile.accessibility_needs.length > 0) personalScore += 0.2;
  if (profile.important_dates && Object.keys(profile.important_dates).length > 0) personalScore += 0.2;
  if (profile.language_preferences && profile.language_preferences.length > 1) personalScore += 0.15;
  if (profile.communication_style && profile.communication_style !== 'balanced') personalScore += 0.15;
  score += Math.min(1, personalScore) * weights.personalDetails;
  
  // Service preferences
  let serviceScore = 0;
  if (profile.preferred_airlines && profile.preferred_airlines.length > 0) serviceScore += 0.3;
  if (profile.preferred_hotels && profile.preferred_hotels.length > 0) serviceScore += 0.3;
  if (profile.loyalty_programs && Object.keys(profile.loyalty_programs).length > 0) serviceScore += 0.4;
  score += Math.min(1, serviceScore) * weights.servicePrefs;
  
  return Math.min(1, Math.max(0, score));
}

/**
 * Analyze travel patterns from travel history
 * @param {Array} travelHistory - Array of travel history records
 * @returns {Object} Travel pattern analysis
 */
export function analyzeTravelPatterns(travelHistory) {
  if (!Array.isArray(travelHistory) || travelHistory.length === 0) {
    return {
      totalTrips: 0,
      averageTripLength: 0,
      mostVisitedDestinations: [],
      preferredSeasons: {},
      budgetAnalysis: {},
      travelFrequency: 'rare'
    };
  }
  
  const analysis = {
    totalTrips: travelHistory.length,
    averageTripLength: 0,
    mostVisitedDestinations: [],
    preferredSeasons: {},
    budgetAnalysis: {},
    travelFrequency: 'rare'
  };
  
  // Calculate average trip length
  const validTrips = travelHistory.filter(trip => trip.duration_days && trip.duration_days > 0);
  if (validTrips.length > 0) {
    analysis.averageTripLength = Math.round(
      validTrips.reduce((sum, trip) => sum + trip.duration_days, 0) / validTrips.length
    );
  }
  
  // Analyze destinations
  const destinationCounts = {};
  travelHistory.forEach(trip => {
    if (trip.primary_destination) {
      destinationCounts[trip.primary_destination] = 
        (destinationCounts[trip.primary_destination] || 0) + 1;
    }
  });
  
  analysis.mostVisitedDestinations = Object.entries(destinationCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([destination, count]) => ({ destination, visits: count }));
  
  // Analyze seasonal preferences
  const seasonCounts = {};
  travelHistory.forEach(trip => {
    if (trip.start_date) {
      const month = new Date(trip.start_date).getMonth();
      const season = getSeasonFromMonth(month);
      seasonCounts[season] = (seasonCounts[season] || 0) + 1;
    }
  });
  analysis.preferredSeasons = seasonCounts;
  
  // Budget analysis
  const costsWithData = travelHistory.filter(trip => trip.actual_cost && trip.actual_cost > 0);
  if (costsWithData.length > 0) {
    const costs = costsWithData.map(trip => trip.actual_cost);
    analysis.budgetAnalysis = {
      averageCost: Math.round(costs.reduce((sum, cost) => sum + cost, 0) / costs.length),
      minCost: Math.min(...costs),
      maxCost: Math.max(...costs),
      medianCost: calculateMedian(costs)
    };
  }
  
  // Calculate travel frequency
  analysis.travelFrequency = calculateTravelFrequency(travelHistory);
  
  return analysis;
}

/**
 * Generate profile insights and recommendations
 * @param {Object} profile - User profile
 * @param {Array} travelHistory - Travel history
 * @param {Object} preferences - Preference data
 * @returns {Object} Insights and recommendations
 */
export function generateProfileInsights(profile, travelHistory = [], preferences = {}) {
  const insights = {
    strengths: [],
    gaps: [],
    recommendations: [],
    travelPersonality: null,
    budgetCategory: null
  };
  
  const completeness = calculateProfileCompleteness(profile);
  const patterns = analyzeTravelPatterns(travelHistory);
  
  // Identify strengths
  if (completeness > 0.8) {
    insights.strengths.push('Comprehensive profile with detailed preferences');
  }
  if (patterns.totalTrips > 10) {
    insights.strengths.push('Extensive travel history provides rich insights');
  }
  if (profile.dietary_restrictions && profile.dietary_restrictions.length > 0) {
    insights.strengths.push('Clear dietary requirements specified');
  }
  
  // Identify gaps
  if (completeness < 0.5) {
    insights.gaps.push('Profile needs more detailed preference information');
  }
  if (!profile.average_trip_budget) {
    insights.gaps.push('Budget preferences not specified');
  }
  if (!profile.preferred_airlines || profile.preferred_airlines.length === 0) {
    insights.gaps.push('No airline preferences specified');
  }
  if (patterns.totalTrips < 3) {
    insights.gaps.push('Limited travel history for pattern analysis');
  }
  
  // Generate recommendations
  insights.recommendations = generateRecommendations(profile, patterns, completeness);
  
  // Determine travel personality
  insights.travelPersonality = determineTravelPersonality(profile, patterns);
  
  // Determine budget category
  insights.budgetCategory = determineBudgetCategory(profile, patterns);
  
  return insights;
}

/**
 * Calculate preference confidence scores
 * @param {Object} preferences - Preference data with usage counts
 * @param {number} totalInteractions - Total user interactions
 * @returns {Object} Preferences with confidence scores
 */
export function calculatePreferenceConfidence(preferences, totalInteractions = 1) {
  const confidenceScored = {};
  
  Object.entries(preferences).forEach(([category, prefs]) => {
    confidenceScored[category] = {};
    
    Object.entries(prefs).forEach(([item, data]) => {
      let confidence = 0.5; // Base confidence
      
      if (typeof data === 'object' && data.mentions) {
        // Confidence based on frequency
        const frequency = data.mentions / totalInteractions;
        confidence = Math.min(0.95, 0.3 + (frequency * 0.6));
        
        // Boost for multiple mentions
        if (data.mentions >= 3) confidence += 0.1;
        if (data.mentions >= 5) confidence += 0.1;
        
        // Penalty for very low interaction count
        if (totalInteractions < 5) confidence *= 0.8;
      } else if (typeof data === 'number') {
        // Simple count-based confidence
        confidence = Math.min(0.9, 0.3 + (data / Math.max(totalInteractions, 5)) * 0.6);
      }
      
      confidenceScored[category][item] = {
        ...data,
        confidence: Math.round(confidence * 100) / 100,
        confidenceLevel: getConfidenceLevel(confidence)
      };
    });
  });
  
  return confidenceScored;
}

/**
 * Analyze budget behavior patterns
 * @param {Array} travelHistory - Travel history with cost data
 * @returns {Object} Budget behavior analysis
 */
export function analyzeBudgetBehavior(travelHistory) {
  const analysis = {
    spendingPattern: 'unknown',
    budgetConsistency: 0,
    luxuryTendency: 0,
    seasonalVariation: {},
    priceElasticity: 'medium'
  };
  
  const tripsWithBudget = travelHistory.filter(trip => 
    trip.total_budget && trip.actual_cost && trip.total_budget > 0 && trip.actual_cost > 0
  );
  
  if (tripsWithBudget.length < 2) {
    return analysis;
  }
  
  // Calculate budget vs actual variance
  const variances = tripsWithBudget.map(trip => {
    const variance = (trip.actual_cost - trip.total_budget) / trip.total_budget;
    return Math.abs(variance);
  });
  
  analysis.budgetConsistency = 1 - (variances.reduce((sum, v) => sum + v, 0) / variances.length);
  
  // Determine spending pattern
  const avgOverage = tripsWithBudget.reduce((sum, trip) => {
    return sum + ((trip.actual_cost - trip.total_budget) / trip.total_budget);
  }, 0) / tripsWithBudget.length;
  
  if (avgOverage > 0.2) {
    analysis.spendingPattern = 'overspender';
  } else if (avgOverage < -0.1) {
    analysis.spendingPattern = 'underspender';
  } else {
    analysis.spendingPattern = 'on_budget';
  }
  
  // Analyze luxury tendency
  const luxuryIndicators = travelHistory.filter(trip => 
    (trip.accommodation_types && trip.accommodation_types.includes('luxury')) ||
    (trip.transportation_modes && (
      trip.transportation_modes.includes('business_class') ||
      trip.transportation_modes.includes('first_class')
    )) ||
    (trip.actual_cost && trip.duration_days && (trip.actual_cost / trip.duration_days) > 300)
  );
  
  analysis.luxuryTendency = luxuryIndicators.length / Math.max(travelHistory.length, 1);
  
  return analysis;
}

/**
 * Calculate similarity between two profiles
 * @param {Object} profile1 - First profile
 * @param {Object} profile2 - Second profile  
 * @returns {number} Similarity score (0-1)
 */
export function calculateProfileSimilarity(profile1, profile2) {
  if (!profile1 || !profile2) return 0;
  
  let totalWeight = 0;
  let similaritySum = 0;
  
  // Compare categorical preferences
  const categories = [
    'accommodation_preferences',
    'activity_preferences', 
    'transportation_preferences',
    'dining_preferences'
  ];
  
  categories.forEach(category => {
    const weight = 0.2;
    totalWeight += weight;
    
    const similarity = compareObjects(profile1[category] || {}, profile2[category] || {});
    similaritySum += similarity * weight;
  });
  
  // Compare arrays
  const arrayFields = ['dietary_restrictions', 'accessibility_needs', 'preferred_airlines'];
  arrayFields.forEach(field => {
    const weight = 0.1;
    totalWeight += weight;
    
    const similarity = compareArrays(profile1[field] || [], profile2[field] || []);
    similaritySum += similarity * weight;
  });
  
  // Compare budget category
  if (profile1.budget_category && profile2.budget_category) {
    const weight = 0.15;
    totalWeight += weight;
    
    const similarity = profile1.budget_category === profile2.budget_category ? 1 : 0;
    similaritySum += similarity * weight;
  }
  
  // Compare travel frequency
  if (profile1.travel_frequency && profile2.travel_frequency) {
    const weight = 0.15;
    totalWeight += weight;
    
    const similarity = profile1.travel_frequency === profile2.travel_frequency ? 1 : 
                      Math.abs(getTravelFrequencyScore(profile1.travel_frequency) - 
                              getTravelFrequencyScore(profile2.travel_frequency)) / 4;
    similaritySum += similarity * weight;
  }
  
  return totalWeight > 0 ? similaritySum / totalWeight : 0;
}

// Helper functions

function getSeasonFromMonth(month) {
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

function calculateMedian(numbers) {
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 
    ? (sorted[mid - 1] + sorted[mid]) / 2 
    : sorted[mid];
}

function calculateTravelFrequency(travelHistory) {
  if (travelHistory.length === 0) return 'rare';
  
  // Calculate trips per year based on date range
  const dates = travelHistory
    .map(trip => new Date(trip.start_date))
    .filter(date => !isNaN(date))
    .sort((a, b) => a - b);
    
  if (dates.length < 2) return travelHistory.length > 0 ? 'occasional' : 'rare';
  
  const daysBetween = (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24);
  const yearsSpan = Math.max(daysBetween / 365, 1);
  const tripsPerYear = travelHistory.length / yearsSpan;
  
  if (tripsPerYear >= 12) return 'business_heavy';
  if (tripsPerYear >= 6) return 'frequent';
  if (tripsPerYear >= 3) return 'regular';
  if (tripsPerYear >= 1) return 'occasional';
  return 'rare';
}

function generateRecommendations(profile, patterns, completeness) {
  const recommendations = [];
  
  if (completeness < 0.6) {
    recommendations.push({
      type: 'profile_completion',
      priority: 'high',
      message: 'Complete your profile for better personalized recommendations',
      action: 'add_preferences'
    });
  }
  
  if (!profile.average_trip_budget) {
    recommendations.push({
      type: 'budget_preference',
      priority: 'medium',
      message: 'Add budget preferences for more accurate pricing',
      action: 'set_budget'
    });
  }
  
  if (patterns.totalTrips < 3) {
    recommendations.push({
      type: 'travel_history',
      priority: 'low',
      message: 'Add past travel history to improve recommendations',
      action: 'add_history'
    });
  }
  
  if (!profile.preferred_airlines || profile.preferred_airlines.length === 0) {
    recommendations.push({
      type: 'airline_preference',
      priority: 'medium',
      message: 'Specify preferred airlines for better flight options',
      action: 'add_airlines'
    });
  }
  
  return recommendations;
}

function determineTravelPersonality(profile, patterns) {
  const scores = {
    adventurer: 0,
    luxury_seeker: 0,
    budget_conscious: 0,
    culture_enthusiast: 0,
    business_traveler: 0
  };
  
  // Activity preferences
  if (profile.activity_preferences) {
    if (profile.activity_preferences.adventure_level > 0.7) scores.adventurer += 2;
    if (profile.activity_preferences.cultural_interest > 0.7) scores.culture_enthusiast += 2;
  }
  
  // Budget category
  if (profile.budget_category === 'luxury' || profile.budget_category === 'ultra_luxury') {
    scores.luxury_seeker += 3;
  } else if (profile.budget_category === 'economy' || profile.budget_category === 'budget_conscious') {
    scores.budget_conscious += 3;
  }
  
  // Travel frequency
  if (profile.travel_frequency === 'business_heavy') {
    scores.business_traveler += 3;
  }
  
  // Travel patterns
  if (patterns.averageTripLength < 4) {
    scores.business_traveler += 1;
  } else if (patterns.averageTripLength > 10) {
    scores.adventurer += 1;
  }
  
  const maxScore = Math.max(...Object.values(scores));
  const personality = Object.keys(scores).find(key => scores[key] === maxScore);
  
  return maxScore > 0 ? personality : 'balanced_traveler';
}

function determineBudgetCategory(profile, patterns) {
  if (profile.budget_category && profile.budget_category !== 'mid_range') {
    return profile.budget_category;
  }
  
  if (patterns.budgetAnalysis && patterns.budgetAnalysis.averageCost) {
    const avgDaily = patterns.budgetAnalysis.averageCost / (patterns.averageTripLength || 7);
    
    if (avgDaily > 500) return 'luxury';
    if (avgDaily > 200) return 'mid_range';
    if (avgDaily > 100) return 'value_seeker';
    return 'budget_conscious';
  }
  
  return 'mid_range';
}

function getConfidenceLevel(score) {
  if (score >= 0.8) return 'very_high';
  if (score >= 0.6) return 'high';
  if (score >= 0.4) return 'medium';
  if (score >= 0.2) return 'low';
  return 'very_low';
}

function compareObjects(obj1, obj2) {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  const allKeys = new Set([...keys1, ...keys2]);
  
  if (allKeys.size === 0) return 1;
  
  let matches = 0;
  for (const key of allKeys) {
    if (obj1[key] === obj2[key]) {
      matches++;
    }
  }
  
  return matches / allKeys.size;
}

function compareArrays(arr1, arr2) {
  if (arr1.length === 0 && arr2.length === 0) return 1;
  if (arr1.length === 0 || arr2.length === 0) return 0;
  
  const set1 = new Set(arr1);
  const set2 = new Set(arr2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

function getTravelFrequencyScore(frequency) {
  const scores = {
    'rare': 1,
    'occasional': 2,
    'regular': 3,
    'frequent': 4,
    'business_heavy': 5
  };
  return scores[frequency] || 2;
}