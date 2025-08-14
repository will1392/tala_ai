/**
 * User Profile Routes
 * Handles user profile onboarding and management
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import UserProfileService from '../services/user/UserProfileService.js';

const router = express.Router();
const userProfileService = new UserProfileService();

/**
 * Check if user has completed profile setup
 */
router.get('/check/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user can access this profile
    if (req.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const profile = await userProfileService.getUserProfile(userId);
    
    res.json({
      hasProfile: !!profile,
      isComplete: !!(profile?.name && profile?.role),
      profile: profile ? {
        name: profile.name,
        role: profile.role,
        companyName: profile.company_name,
        hasBasicInfo: !!(profile.name && profile.role)
      } : null
    });
  } catch (error) {
    console.error('Error checking user profile:', error);
    res.status(500).json({ error: 'Failed to check profile' });
  }
});

/**
 * Get user profile
 */
router.get('/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user can access this profile
    if (req.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const profile = await userProfileService.getUserProfile(userId);
    
    if (profile) {
      // Transform database format to frontend format
      const transformedProfile = {
        name: profile.name,
        role: profile.role,
        companyName: profile.company_name,
        employees: profile.employees,
        monthlyMarketingBudget: profile.monthly_marketing_budget,
        clientTypes: profile.client_types || [],
        idealClient: profile.ideal_client || {},
        businessGoals: profile.business_goals || [],
        currentChallenges: profile.current_challenges || [],
        createdAt: profile.created_at,
        updatedAt: profile.updated_at
      };
      
      res.json(transformedProfile);
    } else {
      res.status(404).json({ error: 'Profile not found' });
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

/**
 * Create or update user profile
 */
router.post('/create', authenticate, async (req, res) => {
  try {
    const profileData = req.body;
    const userId = req.userId;

    // Validate required fields
    if (!profileData.name || !profileData.role) {
      return res.status(400).json({ 
        error: 'Name and role are required' 
      });
    }

    // Validate role
    if (!['agent', 'agency_owner'].includes(profileData.role)) {
      return res.status(400).json({ 
        error: 'Role must be either "agent" or "agency_owner"' 
      });
    }

    const result = await userProfileService.createUserProfile(userId, profileData);
    
    if (result.success) {
      // Transform database format to frontend format
      const transformedProfile = {
        name: result.profile.name,
        role: result.profile.role,
        companyName: result.profile.company_name,
        employees: result.profile.employees,
        monthlyMarketingBudget: result.profile.monthly_marketing_budget,
        clientTypes: result.profile.client_types || [],
        idealClient: result.profile.ideal_client || {},
        businessGoals: result.profile.business_goals || [],
        currentChallenges: result.profile.current_challenges || [],
        createdAt: result.profile.created_at,
        updatedAt: result.profile.updated_at
      };

      res.json({ 
        success: true, 
        profile: transformedProfile 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }
  } catch (error) {
    console.error('Error creating user profile:', error);
    res.status(500).json({ error: 'Failed to create profile' });
  }
});

/**
 * Update specific profile field
 */
router.patch('/:userId/:field', authenticate, async (req, res) => {
  try {
    const { userId, field } = req.params;
    const { value } = req.body;
    
    // Verify user can update this profile
    if (req.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Validate field name (convert camelCase to snake_case)
    const validFields = [
      'name', 'role', 'company_name', 'employees', 
      'monthly_marketing_budget', 'ideal_client', 
      'business_goals', 'current_challenges'
    ];
    
    const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
    
    if (!validFields.includes(dbField)) {
      return res.status(400).json({ error: 'Invalid field name' });
    }

    const result = await userProfileService.updateProfileField(userId, dbField, value);
    
    if (result.success) {
      res.json({ success: true, profile: result.profile });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Error updating profile field:', error);
    res.status(500).json({ error: 'Failed to update profile field' });
  }
});

/**
 * Get personalized greeting for user
 */
router.get('/:userId/greeting', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user can access this profile
    if (req.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const greeting = await userProfileService.getPersonalizedGreeting(userId);
    
    res.json({ greeting });
  } catch (error) {
    console.error('Error getting personalized greeting:', error);
    res.status(500).json({ error: 'Failed to get greeting' });
  }
});

/**
 * Get marketing context for user
 */
router.get('/:userId/context', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user can access this profile
    if (req.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const context = await userProfileService.getMarketingContext(userId);
    
    res.json(context);
  } catch (error) {
    console.error('Error getting marketing context:', error);
    res.status(500).json({ error: 'Failed to get marketing context' });
  }
});

/**
 * Get personalized recommendations
 */
router.get('/:userId/recommendations', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user can access this profile
    if (req.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const recommendations = await userProfileService.getPersonalizedRecommendations(userId);
    
    res.json({ recommendations });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

export default router;