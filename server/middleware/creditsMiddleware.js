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
    console.log('🎫 requireCredits middleware called:', {
      operation,
      cost,
      creditsEnabled: process.env.CREDITS_ENABLED,
      path: req.path,
      method: req.method
    });
    
    // Skip credits check for certain conditions
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️ Credits check skipped in development mode');
      return next();
    }
    
    if (process.env.CREDITS_ENABLED === 'false') {
      console.log('⚠️ Credits disabled via environment variable');
      return next();
    }
    
    // Get user ID
    const userId = req.headers['x-user-id'] || req.session?.userId || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in to use this feature'
      });
    }
    
    // Check if user has sufficient credits
    const creditCheck = await creditSystem.checkCredits(userId, operation, { cost });
    
    if (!creditCheck.success || !creditCheck.hasEnoughCredits) {
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
    
    // Store credit info for later deduction
    req.creditInfo = {
      userId,
      operation,
      cost,
      balance: creditCheck.availableCredits
    };
    
    // Deduct credits after successful response
    const originalSend = res.send;
    const originalJson = res.json;
    
    let creditsDeducted = false;
    
    const deductCreditsOnce = async () => {
      console.log('🎯 deductCreditsOnce called:', {
        creditsDeducted,
        statusCode: res.statusCode,
        shouldDeduct: !creditsDeducted && res.statusCode < 400
      });
      
      if (!creditsDeducted && res.statusCode < 400) {
        creditsDeducted = true;
        
        const metadata = {
          endpoint: req.path,
          method: req.method,
          statusCode: res.statusCode
        };
        
        // If it's a chat request, add message preview
        if (req.body?.message) {
          metadata.messagePreview = req.body.message.substring(0, 100);
        }
        
        console.log('💳 Attempting to consume credits:', {
          userId,
          operation,
          cost,
          metadata
        });
        
        try {
          const result = await creditSystem.consumeCredits(
            userId, 
            operation, 
            { cost, ...metadata }
          );
          
          console.log('💳 Credit consumption result:', result);
          
          if (!result.success) {
            console.error(`❌ Failed to deduct credits for ${userId}:`, result.error);
          } else {
            console.log(`✅ Deducted ${result.creditsConsumed} credits from ${userId} for ${operation}. Remaining: ${result.remainingCredits}`);
          }
        } catch (error) {
          console.error('❌ Exception during credit deduction:', error);
        }
      }
    };
    
    // Override response methods to deduct credits
    res.send = async function(data) {
      await deductCreditsOnce();
      return originalSend.call(this, data);
    };
    
    res.json = async function(data) {
      await deductCreditsOnce();
      
      // Add credits info to response if successful
      if (res.statusCode < 400 && typeof data === 'object') {
        data._credits = {
          cost,
          newBalance: req.creditInfo.balance - cost,
          operation
        };
      }
      
      return originalJson.call(this, data);
    };
    
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
    
    // Get usage history
    const history = await creditSystem.getCreditHistory(userId, 7);
    
    res.json({
      credits: result.data,
      usage: history.success ? history.summary : {},
      transactions: history.success ? history.transactions : [],
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