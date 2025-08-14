/**
 * Marketing Profile API Routes
 * Handles all marketing profile operations
 */

const express = require('express');
const router = express.Router();
const MarketingProfile = require('../models/MarketingProfile');
const { generateGrowthPlan } = require('../services/marketing/GrowthPlanGenerator');
const { validateAssessment } = require('../services/marketing/AssessmentValidator');

// Initialize the model (would be injected in real app)
let marketingProfileModel;

/**
 * Initialize routes with database connection
 */
function initializeRoutes(db) {
  marketingProfileModel = new MarketingProfile(db);
  return router;
}

/**
 * GET /api/marketing-profile/:brandId
 * Get marketing profile for a brand
 */
router.get('/:brandId', async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user?.id || 'admin-1'; // Get from auth middleware

    const profile = await marketingProfileModel.getProfile(brandId, userId);
    
    if (!profile) {
      // Return a default profile structure if none exists
      return res.json({
        brandId,
        userId,
        skillLevel: 'new',
        assessment: null,
        goals: [],
        growthPlan: null,
        evidence: [],
        integrations: [],
        campaigns: []
      });
    }

    res.json(profile);
  } catch (error) {
    console.error('Error fetching marketing profile:', error);
    res.status(500).json({ error: 'Failed to fetch marketing profile' });
  }
});

/**
 * POST /api/marketing-profile/:brandId/assessment
 * Submit assessment answers and calculate skill level
 */
router.post('/:brandId/assessment', async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user?.id || 'admin-1';
    const { answers, signals } = req.body;

    // Validate assessment answers
    const validation = await validateAssessment(answers);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Invalid assessment data',
        issues: validation.issues 
      });
    }

    // Calculate scores
    const { calculateReadinessScore, getCategoryScores, getSkillLevel } = require('../config/marketingAssessment');
    const score = calculateReadinessScore(answers);
    const buckets = getCategoryScores(answers);
    const skillLevel = getSkillLevel(score);

    // Build assessment result
    const assessmentResult = {
      score,
      buckets,
      inputs: Object.entries(answers).map(([id, value]) => ({
        id,
        value,
        timestamp: new Date().toISOString()
      })),
      signals: signals || [],
      confidence: signals?.length > 0 ? 0.8 : 0.6 // Higher confidence with signals
    };

    // Update profile with assessment
    await marketingProfileModel.updateAssessment(brandId, userId, assessmentResult);

    // Generate initial growth plan based on skill level
    const growthPlan = await generateGrowthPlan(skillLevel, assessmentResult);
    await marketingProfileModel.updateGrowthPlan(brandId, userId, growthPlan);

    res.json({
      success: true,
      skillLevel,
      assessment: assessmentResult,
      growthPlan
    });
  } catch (error) {
    console.error('Error processing assessment:', error);
    res.status(500).json({ error: 'Failed to process assessment' });
  }
});

/**
 * POST /api/marketing-profile/:brandId/goals
 * Create or update a goal
 */
router.post('/:brandId/goals', async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user?.id || 'admin-1';
    const goal = req.body;

    // Generate ID if not provided
    if (!goal.id) {
      goal.id = `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Set default values
    goal.owner = goal.owner || 'user';
    goal.priority = goal.priority || 'medium';
    
    const result = await marketingProfileModel.upsertGoal(brandId, userId, goal);
    res.json(result);
  } catch (error) {
    console.error('Error creating goal:', error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

/**
 * PUT /api/marketing-profile/:brandId/goals/:goalId/progress
 * Update goal progress
 */
router.put('/:brandId/goals/:goalId/progress', async (req, res) => {
  try {
    const { brandId, goalId } = req.params;
    const userId = req.user?.id || 'admin-1';
    const { current, trend, milestones } = req.body;

    const result = await marketingProfileModel.updateGoalProgress(
      brandId,
      userId,
      goalId,
      { current, trend, milestones }
    );

    res.json(result);
  } catch (error) {
    console.error('Error updating goal progress:', error);
    res.status(500).json({ error: 'Failed to update goal progress' });
  }
});

/**
 * GET /api/marketing-profile/:brandId/goals
 * Get all goals for a brand
 */
router.get('/:brandId/goals', async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user?.id || 'admin-1';

    const profile = await marketingProfileModel.getProfile(brandId, userId);
    res.json(profile?.goals || []);
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

/**
 * PUT /api/marketing-profile/:brandId/growth-plan/step
 * Update a step in the growth plan
 */
router.put('/:brandId/growth-plan/step', async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user?.id || 'admin-1';
    const { phaseId, stepId, status, metadata } = req.body;

    const result = await marketingProfileModel.updateStepStatus(
      brandId,
      userId,
      phaseId,
      stepId,
      status,
      metadata
    );

    res.json(result);
  } catch (error) {
    console.error('Error updating step:', error);
    res.status(500).json({ error: 'Failed to update step' });
  }
});

/**
 * POST /api/marketing-profile/:brandId/evidence
 * Add evidence item
 */
router.post('/:brandId/evidence', async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user?.id || 'admin-1';
    const evidenceItem = req.body;

    const result = await marketingProfileModel.addEvidence(brandId, userId, evidenceItem);
    res.json(result);
  } catch (error) {
    console.error('Error adding evidence:', error);
    res.status(500).json({ error: 'Failed to add evidence' });
  }
});

/**
 * PUT /api/marketing-profile/:brandId/integration
 * Update integration status
 */
router.put('/:brandId/integration', async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user?.id || 'admin-1';
    const integration = req.body;

    const result = await marketingProfileModel.updateIntegration(brandId, userId, integration);
    res.json(result);
  } catch (error) {
    console.error('Error updating integration:', error);
    res.status(500).json({ error: 'Failed to update integration' });
  }
});

/**
 * GET /api/marketing-profile/:brandId/readiness
 * Get readiness score and recommendations
 */
router.get('/:brandId/readiness', async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user?.id || 'admin-1';

    const profile = await marketingProfileModel.getProfile(brandId, userId);
    
    if (!profile || !profile.assessment) {
      return res.json({
        overall: 0,
        breakdown: {
          foundation: 0,
          strategy: 0,
          execution: 0,
          measurement: 0
        },
        level: 'new',
        confidence: 0,
        recommendations: ['Complete the marketing assessment to get personalized recommendations']
      });
    }

    // Calculate readiness based on assessment
    const { getRecommendations } = require('../config/marketingAssessment');
    const recommendations = getRecommendations(
      Object.fromEntries(
        profile.assessment.inputs.map(input => [input.id, input.value])
      )
    );

    res.json({
      overall: profile.assessment.score,
      breakdown: {
        foundation: profile.assessment.buckets.analytics || 0,
        strategy: profile.assessment.buckets.business || 0,
        execution: profile.assessment.buckets.channels || 0,
        measurement: profile.assessment.buckets.goals || 0
      },
      level: profile.skillLevel,
      confidence: profile.assessment.confidence,
      recommendations
    });
  } catch (error) {
    console.error('Error calculating readiness:', error);
    res.status(500).json({ error: 'Failed to calculate readiness' });
  }
});

/**
 * GET /api/marketing-profile/:brandId/next-steps
 * Get next recommended actions
 */
router.get('/:brandId/next-steps', async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user?.id || 'admin-1';

    const profile = await marketingProfileModel.getProfile(brandId, userId);
    
    if (!profile || !profile.growthPlan) {
      return res.json({
        steps: [],
        message: 'Complete the assessment to get your personalized growth plan'
      });
    }

    // Find next uncompleted steps
    const nextSteps = [];
    for (const phase of profile.growthPlan.phases) {
      for (const step of phase.steps) {
        if (step.status === 'todo' || step.status === 'in_progress') {
          nextSteps.push({
            ...step,
            phaseId: phase.id,
            phaseLabel: phase.label
          });
        }
        if (nextSteps.length >= 3) break;
      }
      if (nextSteps.length >= 3) break;
    }

    res.json({
      steps: nextSteps,
      currentPhase: profile.growthPlan.currentPhase,
      completionPercentage: calculateCompletionPercentage(profile.growthPlan)
    });
  } catch (error) {
    console.error('Error fetching next steps:', error);
    res.status(500).json({ error: 'Failed to fetch next steps' });
  }
});

/**
 * Calculate growth plan completion percentage
 */
function calculateCompletionPercentage(growthPlan) {
  if (!growthPlan || !growthPlan.phases) return 0;

  let totalSteps = 0;
  let completedSteps = 0;

  growthPlan.phases.forEach(phase => {
    phase.steps.forEach(step => {
      totalSteps++;
      if (step.status === 'done') {
        completedSteps++;
      }
    });
  });

  return totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
}

module.exports = { router, initializeRoutes };