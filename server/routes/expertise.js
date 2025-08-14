import express from 'express';
import ExpertiseAssessment from '../services/expertise/ExpertiseAssessment.js';
import CommunicationAdapter from '../services/expertise/CommunicationAdapter.js';
import { authenticate } from '../middleware/auth.js';
import { SupabaseDatabaseService } from '../services/db/SupabaseDatabaseService.js';

const router = express.Router();
const expertiseAssessment = new ExpertiseAssessment();
const communicationAdapter = new CommunicationAdapter();

/**
 * Get assessment questions
 */
router.get('/questions', (req, res) => {
  try {
    const questions = expertiseAssessment.getAssessmentQuestions();
    res.json({ questions });
  } catch (error) {
    console.error('Error getting assessment questions:', error);
    res.status(500).json({ error: 'Failed to get assessment questions' });
  }
});

/**
 * Assess user expertise based on answers
 */
router.post('/assess', authenticate, async (req, res) => {
  try {
    const { answers } = req.body;
    const userId = req.userId;

    // Assess expertise
    const assessment = expertiseAssessment.assessExpertise(answers);

    // Check if validation is needed
    const selfAssessedLevel = answers.q1?.value;
    if (selfAssessedLevel && assessment.confidence < 0.8) {
      const validationQuestions = expertiseAssessment.getValidationQuestions(selfAssessedLevel);
      
      return res.json({
        ...assessment,
        needsValidation: true,
        validationQuestions
      });
    }

    res.json(assessment);
  } catch (error) {
    console.error('Error assessing expertise:', error);
    res.status(500).json({ error: 'Failed to assess expertise' });
  }
});

/**
 * Validate expertise with follow-up questions
 */
router.post('/validate', authenticate, async (req, res) => {
  try {
    const { level, answers } = req.body;
    
    const validationResult = expertiseAssessment.validateExpertise(level, answers);
    
    res.json(validationResult);
  } catch (error) {
    console.error('Error validating expertise:', error);
    res.status(500).json({ error: 'Failed to validate expertise' });
  }
});

/**
 * Save assessment results
 */
router.post('/save', authenticate, async (req, res) => {
  try {
    const { assessment, answers } = req.body;
    const userId = req.userId;

    const result = await expertiseAssessment.saveAssessment(userId, assessment, answers);
    
    if (result.success) {
      res.json({ 
        success: true, 
        assessmentId: result.assessmentId 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }
  } catch (error) {
    console.error('Error saving assessment:', error);
    res.status(500).json({ error: 'Failed to save assessment' });
  }
});

/**
 * Get user's expertise profile
 */
router.get('/user/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user can access this profile
    if (req.userId !== userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const expertise = await expertiseAssessment.getUserExpertise(userId);
    
    if (expertise) {
      res.json(expertise);
    } else {
      res.json(null);
    }
  } catch (error) {
    console.error('Error getting user expertise:', error);
    res.status(500).json({ error: 'Failed to get user expertise' });
  }
});

/**
 * Update communication preferences
 */
router.put('/preferences/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const preferences = req.body;

    // Verify user can update this profile
    if (req.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Update preferences in database
    const db = new SupabaseDatabaseService();
    await db.initialize();

    const { error } = await db.supabase
      .from('users')
      .update({
        communication_preferences: preferences
      })
      .eq('id', userId);

    if (error) {
      throw error;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

/**
 * Adapt response based on user's expertise
 */
router.post('/adapt-response', authenticate, async (req, res) => {
  try {
    const { message, context } = req.body;
    const userId = req.userId;

    // Get user's expertise profile
    const userProfile = await expertiseAssessment.getUserExpertise(userId);
    
    if (!userProfile) {
      // Return original message if no profile
      return res.json({ adaptedResponse: message });
    }

    // Adapt the response
    const adaptedResponse = communicationAdapter.generateAdaptedResponse(
      message,
      userProfile,
      context
    );

    res.json({ adaptedResponse });
  } catch (error) {
    console.error('Error adapting response:', error);
    res.status(500).json({ error: 'Failed to adapt response' });
  }
});

/**
 * Track user progress
 */
router.post('/track-progress', authenticate, async (req, res) => {
  try {
    const { area, action } = req.body;
    const userId = req.userId;

    // Store progress in database
    const db = new SupabaseDatabaseService();
    await db.initialize();

    // Get current expertise areas
    const { data: user } = await db.supabase
      .from('users')
      .select('expertise_areas')
      .eq('id', userId)
      .single();

    const expertiseAreas = user?.expertise_areas || {};
    
    // Update area progress
    if (!expertiseAreas[area]) {
      expertiseAreas[area] = { 
        actions: [], 
        score: 0 
      };
    }

    expertiseAreas[area].actions.push({
      ...action,
      timestamp: new Date().toISOString()
    });

    // Recalculate score based on actions
    const recentActions = expertiseAreas[area].actions.slice(-10);
    const successRate = recentActions.filter(a => a.type === 'completed').length / recentActions.length;
    expertiseAreas[area].score = successRate;

    // Update database
    await db.supabase
      .from('users')
      .update({ expertise_areas: expertiseAreas })
      .eq('id', userId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking progress:', error);
    res.status(500).json({ error: 'Failed to track progress' });
  }
});

/**
 * Check if reassessment is needed
 */
router.get('/check-reassessment/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.userId !== userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const db = new SupabaseDatabaseService();
    await db.initialize();

    const { data: user } = await db.supabase
      .from('users')
      .select('expertise_assessment_date, expertise_areas')
      .eq('id', userId)
      .single();

    if (!user?.expertise_assessment_date) {
      return res.json({ 
        needed: true, 
        reason: 'No assessment found' 
      });
    }

    // Check if assessment is older than 90 days
    const assessmentDate = new Date(user.expertise_assessment_date);
    const daysSinceAssessment = Math.floor(
      (Date.now() - assessmentDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceAssessment > 90) {
      return res.json({ 
        needed: true, 
        reason: 'Assessment is older than 90 days',
        lastAssessment: assessmentDate 
      });
    }

    // Check if user has been struggling in any area
    const expertiseAreas = user.expertise_areas || {};
    const strugglingAreas = Object.entries(expertiseAreas)
      .filter(([_, data]) => data.score < 0.3)
      .map(([area]) => area);

    if (strugglingAreas.length > 2) {
      return res.json({ 
        needed: true, 
        reason: 'Struggling in multiple areas',
        lastAssessment: assessmentDate 
      });
    }

    res.json({ 
      needed: false,
      lastAssessment: assessmentDate 
    });
  } catch (error) {
    console.error('Error checking reassessment:', error);
    res.status(500).json({ error: 'Failed to check reassessment' });
  }
});

/**
 * Get personalized learning recommendations
 */
router.get('/recommendations/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.userId !== userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const userProfile = await expertiseAssessment.getUserExpertise(userId);
    
    if (!userProfile) {
      return res.json({ recommendations: [] });
    }

    // Generate recommendations based on level and weak areas
    const recommendations = [];
    
    // Level-based recommendations
    const levelRecommendations = {
      beginner: [
        {
          id: 'marketing-101',
          title: 'Marketing Fundamentals',
          description: 'Learn the basics of marketing strategy and channels',
          difficulty: 'beginner',
          estimatedTime: '2 hours',
          topics: ['strategy', 'channels', 'metrics']
        },
        {
          id: 'email-basics',
          title: 'Email Marketing Basics',
          description: 'Create your first email campaign',
          difficulty: 'beginner',
          estimatedTime: '1 hour',
          topics: ['email', 'copywriting', 'design']
        }
      ],
      intermediate: [
        {
          id: 'advanced-segmentation',
          title: 'Advanced Audience Segmentation',
          description: 'Target the right people with the right message',
          difficulty: 'intermediate',
          estimatedTime: '1.5 hours',
          topics: ['segmentation', 'personalization', 'data']
        },
        {
          id: 'conversion-optimization',
          title: 'Conversion Rate Optimization',
          description: 'Improve your campaign performance',
          difficulty: 'intermediate',
          estimatedTime: '2 hours',
          topics: ['optimization', 'testing', 'analytics']
        }
      ],
      advanced: [
        {
          id: 'attribution-modeling',
          title: 'Multi-Touch Attribution',
          description: 'Understand the true impact of your marketing',
          difficulty: 'advanced',
          estimatedTime: '2.5 hours',
          topics: ['attribution', 'analytics', 'roi']
        }
      ],
      expert: [
        {
          id: 'ai-marketing',
          title: 'AI-Powered Marketing Strategies',
          description: 'Leverage machine learning for better results',
          difficulty: 'expert',
          estimatedTime: '3 hours',
          topics: ['ai', 'automation', 'predictive']
        }
      ]
    };

    recommendations.push(...(levelRecommendations[userProfile.level] || []));

    // Add recommendations for weak areas
    if (userProfile.areas) {
      Object.entries(userProfile.areas).forEach(([area, data]) => {
        if (data.score < 0.5) {
          recommendations.push({
            id: `improve-${area}`,
            title: `Improve Your ${area.charAt(0).toUpperCase() + area.slice(1)} Skills`,
            description: `Strengthen your knowledge in ${area}`,
            difficulty: userProfile.level,
            estimatedTime: '1.5 hours',
            topics: [area, 'improvement', 'practice']
          });
        }
      });
    }

    res.json({ recommendations: recommendations.slice(0, 5) });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

/**
 * Create expertise profile
 */
router.post('/profile/create', authenticate, async (req, res) => {
  try {
    const { assessment } = req.body;
    const userId = req.userId;

    const result = await expertiseAssessment.saveAssessment(userId, assessment, {});
    
    if (result.success) {
      res.json({ 
        success: true, 
        profile: assessment 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }
  } catch (error) {
    console.error('Error creating expertise profile:', error);
    res.status(500).json({ error: 'Failed to create expertise profile' });
  }
});

export default router;