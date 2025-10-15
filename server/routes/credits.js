import express from 'express';
import CreditSystem from '../services/creditSystem.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import creditScheduler from '../services/creditScheduler.js';

const router = express.Router();
const creditSystem = new CreditSystem();

/**
 * GET /api/credits/balance
 * Get user's credit balance
 */
router.get('/balance', authenticate, async (req, res) => {
  try {
    const result = await creditSystem.getUserCredits(req.userId);
    
    if (!result.success) {
      return res.status(500).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error getting credit balance:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get credit balance' 
    });
  }
});

/**
 * GET /api/credits/history
 * Get credit transaction history
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const result = await creditSystem.getCreditHistory(req.userId, days);
    
    if (!result.success) {
      return res.status(500).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error getting credit history:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get credit history' 
    });
  }
});

/**
 * GET /api/credits/packages
 * Get available credit packages
 */
router.get('/packages', async (req, res) => {
  try {
    const packages = creditSystem.getCreditPricingTiers();
    res.json({ 
      success: true, 
      packages 
    });
  } catch (error) {
    console.error('Error getting credit packages:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get credit packages' 
    });
  }
});

/**
 * POST /api/credits/check
 * Check if user has enough credits for an operation
 */
router.post('/check', authenticate, async (req, res) => {
  try {
    const { operation, params } = req.body;
    
    if (!operation) {
      return res.status(400).json({ 
        success: false, 
        error: 'Operation is required' 
      });
    }
    
    const result = await creditSystem.checkCredits(req.userId, operation, params || {});
    res.json(result);
  } catch (error) {
    console.error('Error checking credits:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check credits' 
    });
  }
});

/**
 * POST /api/credits/consume
 * Consume credits for an operation (usually called internally)
 */
router.post('/consume', authenticate, async (req, res) => {
  try {
    const { operation, params } = req.body;
    
    if (!operation) {
      return res.status(400).json({ 
        success: false, 
        error: 'Operation is required' 
      });
    }
    
    const result = await creditSystem.consumeCredits(req.userId, operation, params || {});
    
    if (!result.success && result.error === 'INSUFFICIENT_CREDITS') {
      return res.status(402).json(result); // 402 Payment Required
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error consuming credits:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to consume credits' 
    });
  }
});

/**
 * POST /api/credits/purchase
 * Purchase credits (integrate with payment processor)
 */
router.post('/purchase', authenticate, async (req, res) => {
  try {
    const { packageId, paymentMethodId } = req.body;
    
    // TODO: Integrate with Stripe/PayPal
    // For now, return a mock response
    res.json({ 
      success: false, 
      error: 'Payment integration not yet implemented',
      message: 'Coming soon!' 
    });
  } catch (error) {
    console.error('Error purchasing credits:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process credit purchase' 
    });
  }
});

/**
 * POST /api/credits/bonus
 * Add bonus credits (admin only)
 */
router.post('/bonus', authenticate, async (req, res) => {
  try {
    // TODO: Add admin check
    const { userId, amount, reason } = req.body;
    
    if (!userId || !amount || !reason) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId, amount, and reason are required' 
      });
    }
    
    const result = await creditSystem.addBonusCredits(userId, amount, reason);
    res.json(result);
  } catch (error) {
    console.error('Error adding bonus credits:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to add bonus credits' 
    });
  }
});

/**
 * GET /api/credits/usage-summary
 * Get usage summary by operation type
 */
router.get('/usage-summary', authenticate, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const result = await creditSystem.getCreditHistory(req.userId, days);
    
    if (!result.success) {
      return res.status(500).json(result);
    }
    
    // Calculate summary statistics
    const summary = {
      totalCreditsUsed: result.totalSpent,
      operationBreakdown: result.summary,
      dailyAverage: Math.round(result.totalSpent / days),
      projectedMonthlyUsage: Math.round((result.totalSpent / days) * 30)
    };
    
    res.json({ 
      success: true, 
      summary 
    });
  } catch (error) {
    console.error('Error getting usage summary:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get usage summary' 
    });
  }
});

/**
 * GET /api/credits/agency/members
 * Get agency members and their usage
 */
router.get('/agency/members', authenticate, async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'];
    
    if (!organizationId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Organization ID required' 
      });
    }
    
    const result = await creditSystem.getAgencyMembers(organizationId);
    res.json(result);
  } catch (error) {
    console.error('Error getting agency members:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get agency members' 
    });
  }
});

/**
 * POST /api/credits/agency/add-member
 * Add a member to agency
 */
router.post('/agency/add-member', authenticate, async (req, res) => {
  try {
    const { agentEmail } = req.body;
    const organizationId = req.headers['x-organization-id'];
    
    if (!agentEmail || !organizationId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Agent email and organization ID required' 
      });
    }
    
    const result = await creditSystem.addAgentToAgency(
      organizationId,
      agentEmail,
      req.userId
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error adding agent to agency:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to add agent' 
    });
  }
});

/**
 * DELETE /api/credits/agency/remove-member/:agentId
 * Remove a member from agency
 */
router.delete('/agency/remove-member/:agentId', authenticate, async (req, res) => {
  try {
    const { agentId } = req.params;
    const organizationId = req.headers['x-organization-id'];
    
    if (!agentId || !organizationId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Agent ID and organization ID required' 
      });
    }
    
    const result = await creditSystem.removeAgentFromAgency(organizationId, agentId);
    res.json(result);
  } catch (error) {
    console.error('Error removing agent from agency:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to remove agent' 
    });
  }
});

/**
 * GET /api/credits/plans
 * Get available plans
 */
router.get('/plans', async (req, res) => {
  try {
    const result = await creditSystem.getAvailablePlans();
    res.json(result);
  } catch (error) {
    console.error('Error getting plans:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get plans' 
    });
  }
});

/**
 * POST /api/credits/change-plan
 * Change user's plan
 */
router.post('/change-plan', authenticate, async (req, res) => {
  try {
    const { planType } = req.body;
    
    if (!planType) {
      return res.status(400).json({ 
        success: false, 
        error: 'Plan type required' 
      });
    }
    
    const result = await creditSystem.changePlan(req.userId, planType);
    res.json(result);
  } catch (error) {
    console.error('Error changing plan:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to change plan' 
    });
  }
});

/**
 * GET /api/credits/scheduler/status
 * Get credit scheduler status (super admin only)
 */
router.get('/scheduler/status', authenticate, requireRole('super_admin'), async (req, res) => {
  try {
    const status = creditScheduler.getStatus();
    res.json({ 
      success: true, 
      scheduler: status 
    });
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get scheduler status' 
    });
  }
});

/**
 * POST /api/credits/scheduler/manual-reset
 * Manually trigger a credit reset (super admin only - use with caution!)
 */
router.post('/scheduler/manual-reset', authenticate, requireRole('super_admin'), async (req, res) => {
  try {
    const { confirm } = req.body;
    
    if (confirm !== 'RESET_ALL_CREDITS') {
      return res.status(400).json({ 
        success: false, 
        error: 'Confirmation required. Send { "confirm": "RESET_ALL_CREDITS" }' 
      });
    }
    
    const result = await creditScheduler.manualReset();
    res.json(result);
  } catch (error) {
    console.error('Error during manual reset:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to perform manual reset' 
    });
  }
});

/**
 * GET /api/credits/next-reset
 * Get next scheduled credit reset date (public)
 */
router.get('/next-reset', authenticate, async (req, res) => {
  try {
    const nextResetDate = creditScheduler.getNextResetDate();
    const daysUntilReset = creditScheduler.getDaysUntilReset();
    
    res.json({ 
      success: true,
      nextResetDate,
      daysUntilReset,
      timezone: 'UTC'
    });
  } catch (error) {
    console.error('Error getting next reset date:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get next reset date' 
    });
  }
});

export default router;