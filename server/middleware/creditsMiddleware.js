/**
 * Credits Middleware for API Endpoints
 * Integrates credits checking and deduction with existing routes
 */

import CreditSystem from '../services/creditSystem.js';

const creditSystem = new CreditSystem();

// Operation cost configuration
const OPERATION_COSTS = {
  // AI Chat operations (most expensive)
  'chat_ai': 10,
  'chat_intelligent': 15,
  'chat_generate': 5,
  'chat_v2': 10,
  'chat_message': 10,
  
  // Document operations (moderate cost)
  'document_upload': 3,
  'document_process': 2,
  'document_ocr': 5,
  'document_analyze': 4,
  
  // Search operations (low cost)
  'search_knowledge': 1,
  'search_documents': 1,
  'search_folders': 0,
  
  // Email operations
  'email_generate': 3,
  'email_analyze': 2,
  
  // CMO/Marketing operations
  'cmo_generate': 5,
  'cmo_analyze': 3,
  'cmo_optimize': 4,
  
  // Free operations
  'read': 0,
  'list': 0,
  'get_status': 0,
  'get_profile': 0
};

/**
 * Credits middleware factory
 * @param {string} operation - The operation type
 * @param {number} customCost - Optional custom cost override
 */
export function requireCredits(operation, customCost = null) {
  const cost = customCost !== null ? customCost : (OPERATION_COSTS[operation] || 1);
  
  return async (req, res, next) => {
    // Get user ID - check multiple sources
    const userId = req.headers['x-user-id'] || 
                   req.userId || 
                   req.session?.userId || 
                   req.user?.id;
    
    console.log('💳 [CREDITS] requireCredits middleware called:', {
      operation,
      cost,
      creditsEnabled: process.env.CREDITS_ENABLED,
      nodeEnv: process.env.NODE_ENV,
      path: req.path,
      method: req.method,
      userId: userId?.substring(0, 8) + '...',
      hasXUserId: !!req.headers['x-user-id'],
      hasReqUserId: !!req.userId
    });
    
    // Skip credits check ONLY if explicitly disabled
    if (process.env.CREDITS_ENABLED === 'false') {
      console.log('⚠️ Credits disabled via CREDITS_ENABLED=false');
      return next();
    }
    
    // Credits are enabled by default in all environments
    console.log('✅ Credits check active');
    
    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in to use this feature'
      });
    }
    
    // Check if user has sufficient credits
    const creditCheck = await creditSystem.checkCredits(userId, operation, { cost });
    
    // Super admin bypass - allow unlimited credits
    if (creditCheck.isSuperAdmin) {
      console.log('🔓 [CREDITS MIDDLEWARE] Super admin detected - bypassing credit check');
    } else if (!creditCheck.success || !creditCheck.hasEnoughCredits) {
      return res.status(402).json({
        error: 'Insufficient credits',
        message: `This operation requires ${creditCheck.creditCost || cost} credits. You have ${creditCheck.availableCredits} credits remaining.`,
        creditCost: creditCheck.creditCost,
        availableCredits: creditCheck.availableCredits,
        shortfall: creditCheck.shortfall,
        upgradeUrl: '/credits',
        nextResetDate: creditCheck.nextResetDate
      });
    }
    
    // Store credit info for deduction after successful response
    req.creditInfo = {
      userId,
      operation,
      cost,
      balance: creditCheck.availableCredits
    };
    
    // Track if credits were deducted
    let creditsDeducted = false;
    
    // Intercept response finish to deduct credits
    res.on('finish', async () => {
      console.log('💳 [CREDITS] Response finished event fired:', {
        userId: userId?.substring(0, 8) + '...',
        operation,
        statusCode: res.statusCode,
        creditsDeducted,
        shouldDeduct: !creditsDeducted && res.statusCode < 400
      });
      
      // Only deduct for successful responses
      if (!creditsDeducted && res.statusCode < 400) {
        creditsDeducted = true;
        
        const metadata = {
          endpoint: req.path,
          method: req.method,
          statusCode: res.statusCode
        };
        
        if (req.body?.message) {
          metadata.messagePreview = req.body.message.substring(0, 100);
        }
        
        if (req.body?.model) {
          metadata.model = req.body.model;
        }
        
        console.log('💳 [CREDITS] Consuming credits after successful response:', {
          userId: userId?.substring(0, 8) + '...',
          operation,
          cost,
          statusCode: res.statusCode
        });
        
        try {
          const result = await creditSystem.consumeCredits(
            userId, 
            operation, 
            { cost, ...metadata }
          );
          
          if (!result.success) {
            console.error(`💳 [CREDITS] ❌ Failed to deduct ${cost} credits from ${userId?.substring(0, 8)}...:`, result.error);
          } else {
            console.log(`💳 [CREDITS] ✅ Deducted ${result.creditsConsumed} credits. User ${userId?.substring(0, 8)}... remaining: ${result.remainingCredits}`);
          }
        } catch (error) {
          console.error('❌ Exception during credit deduction:', error.message, error.stack);
        }
      } else if (creditsDeducted) {
        console.log('⏭️  Credits already deducted, skipping');
      } else {
        console.log('⏭️  Non-success response, not deducting credits:', res.statusCode);
      }
    });
    
    next();
  };
}

/**
 * Get user's credit status
 */
export async function getCreditsStatus(req, res) {
  try {
    const userId = req.headers['x-user-id'] || req.session?.userId || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }
    
    const result = await creditSystem.getUserCredits(userId);

    if (!result.success) {
      return res.status(500).json({
        error: 'Failed to get credit status',
        message: result.error
      });
    }

    const creditData = result.data || {};

    // Determine tier and default limits from plan type
    const tierMap = {
      free: 'free',
      agent: 'premium',
      agency: 'enterprise',
      enterprise: 'enterprise',
      payg: 'payAsYouGo',
      pay_as_you_go: 'payAsYouGo'
    };

    const tier = tierMap[creditData.plan_type] || 'free';

    const tierDailyLimit = {
      free: 10,
      premium: 100,
      enterprise: 1000,
      payAsYouGo: null
    };

    // Get usage history (last 7 days for dashboard widgets)
    const history = await creditSystem.getCreditHistory(userId, 7);

    const transactions = history.success ? history.transactions : [];

    // Calculate daily usage for current day and build daily usage chart data
    const todayKey = new Date().toISOString().split('T')[0];
    const dailyUsageMap = new Map();
    let todayUsage = 0;

    transactions.forEach(transaction => {
      if (!transaction?.created_at) return;

      const dateKey = new Date(transaction.created_at).toISOString().split('T')[0];

      if (transaction.credits > 0) {
        const current = dailyUsageMap.get(dateKey) || 0;
        const newTotal = current + transaction.credits;
        dailyUsageMap.set(dateKey, newTotal);

        if (dateKey === todayKey) {
          todayUsage += transaction.credits;
        }
      }
    });

    const dailyUsage = Array.from(dailyUsageMap.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, credits]) => ({ date, credits }));

    // Build usage summary grouped by operation
    const byOperation = {};
    if (history.success && history.summary) {
      Object.entries(history.summary).forEach(([operation, summary]) => {
        byOperation[operation] = {
          count: summary.count,
          credits: summary.totalCredits
        };
      });
    }

    const hasTierLimit = Object.prototype.hasOwnProperty.call(tierDailyLimit, tier);

    const enhancedCredits = {
      ...creditData,
      balance: creditData.available_credits ?? creditData.total_credits ?? 0,
      monthly_allocation: (creditData.total_credits || 0) + (creditData.bonus_credits || 0),
      monthly_usage: creditData.used_credits || 0,
      tier,
      daily_usage: todayUsage,
      daily_limit: hasTierLimit ? tierDailyLimit[tier] : tierDailyLimit.free,
      last_reset: creditData.last_reset_date || null
    };

    const usage = {
      totalOperations: transactions.filter(t => t.credits > 0).length,
      totalCreditsUsed: history.success ? history.totalSpent : 0,
      periodStart: history.success && transactions.length > 0
        ? transactions[transactions.length - 1].created_at
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      periodEnd: new Date().toISOString(),
      byOperation,
      dailyUsage
    };

    res.json({
      credits: enhancedCredits,
      usage,
      transactions,
      costs: OPERATION_COSTS
    });
  } catch (error) {
    console.error('Error getting credits status:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
}

/**
 * Purchase credits endpoint
 */
export async function purchaseCredits(req, res) {
  try {
    const userId = req.headers['x-user-id'] || req.session?.userId || req.user?.id;
    const { packageId, paymentMethod, paymentId } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }
    
    if (!packageId) {
      return res.status(400).json({
        error: 'Package ID required'
      });
    }
    
    // Find the package details
    const packages = creditSystem.getCreditPricingTiers();
    const selectedPackage = packages.find(p => p.id === packageId);
    
    if (!selectedPackage) {
      return res.status(400).json({
        error: 'Invalid package ID'
      });
    }
    
    const result = await creditSystem.purchaseCredits(userId, selectedPackage.credits, {
      method: paymentMethod,
      paymentId,
      packageId
    });
    
    if (!result.success) {
      return res.status(500).json({
        error: 'Purchase failed',
        message: result.error
      });
    }
    
    res.json({
      success: true,
      creditsPurchased: result.creditsPurchased,
      newTotalCredits: result.newTotalCredits
    });
  } catch (error) {
    console.error('Error purchasing credits:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
}

/**
 * Get available credit packages
 */
export async function getCreditPackages(req, res) {
  try {
    const packages = creditSystem.getCreditPricingTiers();
    
    res.json({
      packages: packages
    });
  } catch (error) {
    console.error('Error getting credit packages:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
}

/**
 * Upgrade tier endpoint
 */
export async function upgradeTier(req, res) {
  try {
    const userId = req.headers['x-user-id'] || req.session?.userId || req.user?.id;
    const { planType } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }
    
    if (!planType || !['agent', 'agency'].includes(planType)) {
      return res.status(400).json({
        error: 'Invalid plan type. Must be "agent" or "agency"'
      });
    }
    
    const result = await creditSystem.changePlan(userId, planType);
    
    if (!result.success) {
      return res.status(500).json({
        error: 'Upgrade failed',
        message: result.error
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error upgrading plan:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
}

/**
 * Get transaction history
 */
export async function getTransactionHistory(req, res) {
  try {
    const userId = req.headers['x-user-id'] || req.session?.userId || req.user?.id;
    const days = parseInt(req.query.days) || 30;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }
    
    const result = await creditSystem.getCreditHistory(userId, days);
    
    if (!result.success) {
      return res.status(500).json({
        error: 'Failed to get history',
        message: result.error
      });
    }
    
    res.json({
      transactions: result.transactions,
      summary: result.summary,
      totalSpent: result.totalSpent
    });
  } catch (error) {
    console.error('Error getting transaction history:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
}

/**
 * Initialize user credits (for new users)
 */
export async function initializeCredits(userId, organizationId = null, planType = 'agent') {
  try {
    const result = await creditSystem.initializeUserCredits(userId, organizationId, planType);
    return result;
  } catch (error) {
    console.error('Error initializing credits:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export all middleware and handlers
export default {
  requireCredits,
  getCreditsStatus,
  purchaseCredits,
  getCreditPackages,
  upgradeTier,
  getTransactionHistory,
  initializeCredits,
  OPERATION_COSTS
};