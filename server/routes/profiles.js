/**
 * Profile Management API Routes for Tala AI
 * 
 * Provides REST API endpoints for client profile management including
 * CRUD operations, profile analytics, enrichment, and profile insights.
 */

import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';

import ClientProfileManager from '../services/profiles/ClientProfileManager.js';
import ProfileAggregator from '../services/profiles/ProfileAggregator.js';
import ProfileEnricher from '../services/profiles/ProfileEnricher.js';
import { 
  calculateProfileCompleteness,
  analyzeTravelPatterns,
  generateProfileInsights,
  calculatePreferenceConfidence,
  analyzeBudgetBehavior,
  calculateProfileSimilarity
} from '../utils/profileAnalytics.js';

const router = express.Router();

// Initialize services
let profileManager;
let profileAggregator;
let profileEnricher;

// Rate limiting
const profileRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many profile requests from this IP, please try again later.',
    retryAfter: 15 * 60
  }
});

const enrichmentRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 enrichment requests per hour
  message: {
    error: 'Too many enrichment requests from this IP, please try again later.',
    retryAfter: 60 * 60
  }
});

// Initialize services middleware
async function initializeServices(req, res, next) {
  try {
    if (!profileManager) {
      profileManager = new ClientProfileManager();
      await profileManager.initialize();
    }
    
    if (!profileAggregator) {
      profileAggregator = new ProfileAggregator();
      await profileAggregator.initialize();
    }
    
    if (!profileEnricher) {
      profileEnricher = new ProfileEnricher();
      await profileEnricher.initialize();
    }
    
    next();
  } catch (error) {
    console.error('Failed to initialize profile services:', error);
    res.status(500).json({
      error: 'Profile services unavailable',
      message: 'Please try again later'
    });
  }
}

// Validation middleware
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
}

// Apply middleware
router.use(profileRateLimit);
router.use(initializeServices);

// GET /api/profiles/:userId - Get user profile
router.get('/:userId',
  param('userId').isString().isLength({ min: 1 }),
  query('organizationId').optional().isString(),
  query('includeSummary').optional().isBoolean(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { organizationId = 'default-org', includeSummary = false } = req.query;
      
      console.log(`🔍 Getting profile for user: ${userId}`);
      
      if (includeSummary === 'true') {
        // Get comprehensive profile summary
        const summary = await profileManager.getProfileSummary(userId, organizationId);
        
        if (!summary.success) {
          return res.status(404).json({
            error: 'Profile not found',
            message: summary.error
          });
        }
        
        res.json({
          success: true,
          profile: summary.summary,
          type: 'summary'
        });
      } else {
        // Get basic profile
        const profile = await profileManager.getProfile(userId, organizationId);
        
        if (!profile.success) {
          return res.status(404).json({
            error: 'Profile not found',
            message: profile.error
          });
        }
        
        res.json({
          success: true,
          profile: profile.profile,
          type: 'basic'
        });
      }
      
    } catch (error) {
      console.error('Error getting profile:', error);
      res.status(500).json({
        error: 'Failed to retrieve profile',
        message: error.message
      });
    }
  }
);

// POST /api/profiles/:userId - Create user profile
router.post('/:userId',
  param('userId').isString().isLength({ min: 1 }),
  body('organizationId').optional().isString(),
  body('travelPreferences').optional().isObject(),
  body('dietaryRestrictions').optional().isArray(),
  body('accommodationPreferences').optional().isObject(),
  body('budgetCategory').optional().isIn(['economy', 'mid_range', 'luxury', 'ultra_luxury', 'budget_conscious', 'value_seeker']),
  body('travelFrequency').optional().isIn(['rare', 'occasional', 'regular', 'frequent', 'business_heavy']),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { organizationId = 'default-org', ...profileData } = req.body;
      
      console.log(`👤 Creating profile for user: ${userId}`);
      
      const result = await profileManager.createProfile(userId, profileData, organizationId);
      
      if (!result.success) {
        const statusCode = result.error === 'Profile already exists' ? 409 : 400;
        return res.status(statusCode).json({
          error: result.error,
          existingProfile: result.profile
        });
      }
      
      res.status(201).json({
        success: true,
        profile: result.profile,
        completeness: result.completeness
      });
      
    } catch (error) {
      console.error('Error creating profile:', error);
      res.status(500).json({
        error: 'Failed to create profile',
        message: error.message
      });
    }
  }
);

// PUT /api/profiles/:userId - Update user profile
router.put('/:userId',
  param('userId').isString().isLength({ min: 1 }),
  body('organizationId').optional().isString(),
  body().isObject(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { organizationId = 'default-org', ...updates } = req.body;
      
      console.log(`📝 Updating profile for user: ${userId}`);
      
      const result = await profileManager.updateProfile(userId, updates, organizationId);
      
      if (!result.success) {
        const statusCode = result.error === 'Profile not found' ? 404 : 400;
        return res.status(statusCode).json({
          error: result.error
        });
      }
      
      res.json({
        success: true,
        profile: result.profile,
        completeness: result.completeness
      });
      
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({
        error: 'Failed to update profile',
        message: error.message
      });
    }
  }
);

// POST /api/profiles/:userId/preferences - Add preference
router.post('/:userId/preferences',
  param('userId').isString().isLength({ min: 1 }),
  body('organizationId').optional().isString(),
  body('category').isString().isLength({ min: 1 }),
  body('preference').isObject(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { organizationId = 'default-org', category, preference } = req.body;
      
      console.log(`🎯 Adding preference for user: ${userId}, category: ${category}`);
      
      const result = await profileManager.addPreference(userId, category, preference, organizationId);
      
      if (!result.success) {
        const statusCode = result.error === 'Profile not found' ? 404 : 400;
        return res.status(statusCode).json({
          error: result.error
        });
      }
      
      res.json({
        success: true,
        updatedProfile: result.updatedProfile
      });
      
    } catch (error) {
      console.error('Error adding preference:', error);
      res.status(500).json({
        error: 'Failed to add preference',
        message: error.message
      });
    }
  }
);

// POST /api/profiles/:userId/travel-history - Add travel history
router.post('/:userId/travel-history',
  param('userId').isString().isLength({ min: 1 }),
  body('organizationId').optional().isString(),
  body('primaryDestination').isString().isLength({ min: 1 }),
  body('startDate').isISO8601(),
  body('endDate').isISO8601(),
  body('totalBudget').optional().isNumeric(),
  body('actualCost').optional().isNumeric(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { organizationId = 'default-org', ...tripData } = req.body;
      
      console.log(`✈️ Adding travel history for user: ${userId}`);
      
      const result = await profileManager.addTravelHistory(userId, tripData, organizationId);
      
      if (!result.success) {
        return res.status(400).json({
          error: result.error
        });
      }
      
      res.status(201).json({
        success: true,
        travelHistory: result.travelHistory
      });
      
    } catch (error) {
      console.error('Error adding travel history:', error);
      res.status(500).json({
        error: 'Failed to add travel history',
        message: error.message
      });
    }
  }
);

// GET /api/profiles/:userId/analytics - Get profile analytics
router.get('/:userId/analytics',
  param('userId').isString().isLength({ min: 1 }),
  query('organizationId').optional().isString(),
  query('includePatterns').optional().isBoolean(),
  query('includeBudgetAnalysis').optional().isBoolean(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { 
        organizationId = 'default-org',
        includePatterns = true,
        includeBudgetAnalysis = true
      } = req.query;
      
      console.log(`📊 Generating analytics for user: ${userId}`);
      
      // Get profile and travel history
      const profile = await profileManager.getProfile(userId, organizationId);
      if (!profile.success) {
        return res.status(404).json({
          error: 'Profile not found'
        });
      }
      
      // Get travel history from database
      const { data: travelHistory } = await profileManager.supabase
        .from('travel_history')
        .select('*')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .order('start_date', { ascending: false });
      
      // Calculate analytics
      const analytics = {
        completeness: calculateProfileCompleteness(profile.profile),
        insights: generateProfileInsights(profile.profile, travelHistory || [])
      };
      
      if (includePatterns === 'true') {
        analytics.travelPatterns = analyzeTravelPatterns(travelHistory || []);
      }
      
      if (includeBudgetAnalysis === 'true') {
        analytics.budgetBehavior = analyzeBudgetBehavior(travelHistory || []);
      }
      
      res.json({
        success: true,
        analytics,
        dataPoints: {
          profileFields: Object.keys(profile.profile).length,
          travelHistoryCount: (travelHistory || []).length
        }
      });
      
    } catch (error) {
      console.error('Error generating analytics:', error);
      res.status(500).json({
        error: 'Failed to generate analytics',
        message: error.message
      });
    }
  }
);

// POST /api/profiles/:userId/enrich - Enrich profile from conversations
router.post('/:userId/enrich',
  enrichmentRateLimit,
  param('userId').isString().isLength({ min: 1 }),
  body('organizationId').optional().isString(),
  body('windowDays').optional().isInt({ min: 1, max: 365 }),
  body('forceEnrichment').optional().isBoolean(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { 
        organizationId = 'default-org',
        windowDays = 30,
        forceEnrichment = false
      } = req.body;
      
      console.log(`🔧 Enriching profile for user: ${userId}`);
      
      const result = await profileEnricher.enrichProfile(userId, organizationId, {
        windowDays,
        forceEnrichment
      });
      
      if (!result.success) {
        const statusCode = result.error === 'Profile not found' ? 404 : 400;
        return res.status(statusCode).json({
          error: result.error,
          details: result.analysisError
        });
      }
      
      res.json({
        success: true,
        enrichmentDetails: result.enrichmentDetails,
        newPreferences: result.newPreferences,
        updatedPreferences: result.updatedPreferences,
        conflictsDetected: result.conflictsDetected,
        confidenceScore: result.confidenceScore,
        lastEnrichment: result.lastEnrichment
      });
      
    } catch (error) {
      console.error('Error enriching profile:', error);
      res.status(500).json({
        error: 'Failed to enrich profile',
        message: error.message
      });
    }
  }
);

// GET /api/profiles/:userId/recommendations - Get enrichment recommendations
router.get('/:userId/recommendations',
  param('userId').isString().isLength({ min: 1 }),
  query('organizationId').optional().isString(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { organizationId = 'default-org' } = req.query;
      
      console.log(`💡 Getting recommendations for user: ${userId}`);
      
      const result = await profileEnricher.getEnrichmentRecommendations(userId, organizationId);
      
      if (!result.success) {
        const statusCode = result.error === 'Profile not found' ? 404 : 400;
        return res.status(statusCode).json({
          error: result.error
        });
      }
      
      res.json({
        success: true,
        recommendations: result.recommendations,
        conversationRecommendations: result.conversationRecommendations,
        profileCompleteness: result.profileCompleteness
      });
      
    } catch (error) {
      console.error('Error getting recommendations:', error);
      res.status(500).json({
        error: 'Failed to get recommendations',
        message: error.message
      });
    }
  }
);

// POST /api/profiles/:userId/analyze-conversations - Analyze conversation history
router.post('/:userId/analyze-conversations',
  param('userId').isString().isLength({ min: 1 }),
  body('organizationId').optional().isString(),
  body('windowDays').optional().isInt({ min: 1, max: 365 }),
  body('maxMessages').optional().isInt({ min: 1, max: 1000 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { 
        organizationId = 'default-org',
        windowDays = 30,
        maxMessages = 100
      } = req.body;
      
      console.log(`🔍 Analyzing conversations for user: ${userId}`);
      
      const result = await profileAggregator.analyzeConversationHistory(
        userId,
        organizationId,
        { windowDays, maxMessages }
      );
      
      if (!result.success) {
        return res.status(400).json({
          error: result.error
        });
      }
      
      res.json({
        success: true,
        preferences: result.preferences,
        patterns: result.patterns,
        confidence: result.confidence,
        messageCount: result.messageCount,
        analysisDate: result.analysisDate
      });
      
    } catch (error) {
      console.error('Error analyzing conversations:', error);
      res.status(500).json({
        error: 'Failed to analyze conversations',
        message: error.message
      });
    }
  }
);

// POST /api/profiles/batch/enrich - Batch enrichment for multiple users
router.post('/batch/enrich',
  enrichmentRateLimit,
  body('userIds').isArray({ min: 1, max: 10 }),
  body('organizationId').optional().isString(),
  body('windowDays').optional().isInt({ min: 1, max: 365 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userIds, organizationId = 'default-org', windowDays = 30 } = req.body;
      
      console.log(`🔧 Batch enriching profiles for ${userIds.length} users`);
      
      const results = [];
      const errors = [];
      
      for (const userId of userIds) {
        try {
          const result = await profileEnricher.enrichProfile(userId, organizationId, {
            windowDays
          });
          
          results.push({
            userId,
            success: result.success,
            enrichmentDetails: result.success ? result.enrichmentDetails : null,
            error: result.success ? null : result.error
          });
        } catch (error) {
          errors.push({
            userId,
            error: error.message
          });
        }
      }
      
      res.json({
        success: true,
        results,
        errors,
        summary: {
          totalUsers: userIds.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length + errors.length
        }
      });
      
    } catch (error) {
      console.error('Error in batch enrichment:', error);
      res.status(500).json({
        error: 'Failed to perform batch enrichment',
        message: error.message
      });
    }
  }
);

// GET /api/profiles/stats - Get profile system statistics
router.get('/stats',
  query('organizationId').optional().isString(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { organizationId = 'default-org' } = req.query;
      
      console.log(`📊 Getting profile system stats for organization: ${organizationId}`);
      
      // Get profile statistics from database
      const { data: profileStats } = await profileManager.supabase
        .from('user_profiles')
        .select('profile_completeness_score, travel_frequency, budget_category')
        .eq('organization_id', organizationId);
      
      const { data: travelStats } = await profileManager.supabase
        .from('travel_history')
        .select('user_id')
        .eq('organization_id', organizationId);
      
      const stats = {
        totalProfiles: (profileStats || []).length,
        averageCompleteness: profileStats && profileStats.length > 0 
          ? profileStats.reduce((sum, p) => sum + (p.profile_completeness_score || 0), 0) / profileStats.length
          : 0,
        travelFrequencyDistribution: {},
        budgetCategoryDistribution: {},
        totalTravelHistory: (travelStats || []).length,
        uniqueTravelers: new Set((travelStats || []).map(t => t.user_id)).size,
        enrichmentStats: profileEnricher ? profileEnricher.getEnrichmentStats() : {},
        cacheStats: profileManager ? profileManager.getCacheStats() : {}
      };
      
      // Calculate distributions
      if (profileStats) {
        profileStats.forEach(profile => {
          if (profile.travel_frequency) {
            stats.travelFrequencyDistribution[profile.travel_frequency] = 
              (stats.travelFrequencyDistribution[profile.travel_frequency] || 0) + 1;
          }
          if (profile.budget_category) {
            stats.budgetCategoryDistribution[profile.budget_category] = 
              (stats.budgetCategoryDistribution[profile.budget_category] || 0) + 1;
          }
        });
      }
      
      res.json({
        success: true,
        stats,
        organizationId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error getting profile stats:', error);
      res.status(500).json({
        error: 'Failed to get profile statistics',
        message: error.message
      });
    }
  }
);

// Error handler
router.use((error, req, res, next) => {
  console.error('Profile API error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

export default router;