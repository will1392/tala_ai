/**
 * Credits Manager for Tala AI
 * Manages user credits for API usage and prevents overuse
 */

class CreditsManager {
  constructor() {
    // In production, this would be stored in database
    this.userCredits = new Map();
    this.creditCosts = {
      // AI endpoints (most expensive)
      'chat_ai': 10,           // 10 credits per AI chat
      'intelligent_chat': 15,   // 15 credits for advanced AI
      'generate_content': 5,    // 5 credits for generation
      
      // Document operations (moderate cost)
      'document_upload': 3,     // 3 credits per upload
      'document_process': 2,    // 2 credits for processing
      'ocr_extraction': 5,      // 5 credits for OCR
      
      // Search operations (low cost)
      'search': 1,              // 1 credit per search
      'knowledge_query': 1,     // 1 credit per query
      
      // Free operations
      'read': 0,                // Reading is free
      'list': 0,                // Listing is free
    };
    
    // Monthly credit allocations by tier
    this.tierCredits = {
      free: {
        monthly: 1000,        // 1,000 credits/month
        daily: 50,            // Daily limit of 50
        refillDay: 1,         // Refills on 1st of month
      },
      premium: {
        monthly: 10000,       // 10,000 credits/month
        daily: 500,           // Daily limit of 500
        refillDay: 1,
      },
      enterprise: {
        monthly: 100000,      // 100,000 credits/month
        daily: 5000,          // Daily limit of 5,000
        refillDay: 1,
      },
      payAsYouGo: {
        monthly: 0,           // Buy credits as needed
        daily: 10000,         // High daily limit
        pricePerCredit: 0.01, // $0.01 per credit
      }
    };
  }

  /**
   * Initialize user credits (called on signup or tier change)
   */
  async initializeUserCredits(userId, tier = 'free') {
    const allocation = this.tierCredits[tier];
    
    const userCredit = {
      userId,
      tier,
      balance: allocation.monthly,
      monthlyAllocation: allocation.monthly,
      dailyLimit: allocation.daily,
      dailyUsed: 0,
      lastReset: new Date(),
      lastDailyReset: new Date(),
      history: [],
      overageCharges: 0
    };
    
    this.userCredits.set(userId, userCredit);
    
    // In production, save to database
    await this.saveToDatabase(userCredit);
    
    return userCredit;
  }

  /**
   * Check if user has enough credits for operation
   */
  async checkCredits(userId, operation, count = 1) {
    let userCredit = this.userCredits.get(userId);
    
    // Load from database if not in cache
    if (!userCredit) {
      userCredit = await this.loadFromDatabase(userId);
      if (!userCredit) {
        // New user - initialize with free tier
        userCredit = await this.initializeUserCredits(userId, 'free');
      }
    }
    
    // Check for monthly reset
    this.checkMonthlyReset(userCredit);
    
    // Check for daily reset
    this.checkDailyReset(userCredit);
    
    const cost = (this.creditCosts[operation] || 0) * count;
    
    // Check daily limit
    if (userCredit.dailyUsed + cost > userCredit.dailyLimit) {
      return {
        allowed: false,
        reason: 'daily_limit_exceeded',
        dailyLimit: userCredit.dailyLimit,
        dailyUsed: userCredit.dailyUsed,
        costRequired: cost,
        resetTime: this.getNextDailyReset()
      };
    }
    
    // Check balance
    if (userCredit.balance < cost) {
      // Check if pay-as-you-go
      if (userCredit.tier === 'payAsYouGo') {
        return {
          allowed: true,
          willCharge: true,
          cost: cost,
          priceInDollars: cost * this.tierCredits.payAsYouGo.pricePerCredit
        };
      }
      
      return {
        allowed: false,
        reason: 'insufficient_credits',
        balance: userCredit.balance,
        costRequired: cost,
        resetTime: this.getNextMonthlyReset()
      };
    }
    
    return {
      allowed: true,
      balance: userCredit.balance,
      cost: cost,
      remainingAfter: userCredit.balance - cost
    };
  }

  /**
   * Deduct credits for an operation
   */
  async deductCredits(userId, operation, count = 1, metadata = {}) {
    const userCredit = this.userCredits.get(userId);
    if (!userCredit) {
      throw new Error('User credits not initialized');
    }
    
    const cost = (this.creditCosts[operation] || 0) * count;
    
    // Deduct from balance
    userCredit.balance -= cost;
    userCredit.dailyUsed += cost;
    
    // Log transaction
    const transaction = {
      timestamp: new Date(),
      operation,
      cost,
      balance: userCredit.balance,
      metadata
    };
    
    userCredit.history.push(transaction);
    
    // Keep only last 100 transactions in memory
    if (userCredit.history.length > 100) {
      userCredit.history = userCredit.history.slice(-100);
    }
    
    // Handle pay-as-you-go charging
    if (userCredit.tier === 'payAsYouGo' && userCredit.balance < 0) {
      const charge = Math.abs(userCredit.balance) * this.tierCredits.payAsYouGo.pricePerCredit;
      userCredit.overageCharges += charge;
      userCredit.balance = 0; // Reset to 0 after charging
      
      // In production, trigger payment processing
      await this.processPayment(userId, charge);
    }
    
    // Save to database
    await this.saveToDatabase(userCredit);
    
    return {
      success: true,
      newBalance: userCredit.balance,
      transaction
    };
  }

  /**
   * Add bonus credits (for promotions, purchases, etc.)
   */
  async addCredits(userId, amount, reason = 'bonus') {
    const userCredit = this.userCredits.get(userId);
    if (!userCredit) {
      throw new Error('User credits not initialized');
    }
    
    userCredit.balance += amount;
    
    const transaction = {
      timestamp: new Date(),
      operation: 'credit_added',
      amount,
      reason,
      balance: userCredit.balance
    };
    
    userCredit.history.push(transaction);
    
    await this.saveToDatabase(userCredit);
    
    return {
      success: true,
      newBalance: userCredit.balance
    };
  }

  /**
   * Get user's credit status
   */
  async getCreditStatus(userId) {
    const userCredit = this.userCredits.get(userId) || await this.loadFromDatabase(userId);
    
    if (!userCredit) {
      return null;
    }
    
    // Check for resets
    this.checkMonthlyReset(userCredit);
    this.checkDailyReset(userCredit);
    
    // Calculate usage statistics
    const totalUsedThisMonth = userCredit.monthlyAllocation - userCredit.balance;
    const percentageUsed = (totalUsedThisMonth / userCredit.monthlyAllocation) * 100;
    
    // Estimate days until reset
    const daysUntilReset = this.getDaysUntilMonthlyReset();
    const averageDailyUsage = totalUsedThisMonth / (30 - daysUntilReset);
    const estimatedDaysRemaining = userCredit.balance / averageDailyUsage;
    
    return {
      tier: userCredit.tier,
      balance: userCredit.balance,
      monthlyAllocation: userCredit.monthlyAllocation,
      dailyLimit: userCredit.dailyLimit,
      dailyUsed: userCredit.dailyUsed,
      percentageUsed: Math.round(percentageUsed),
      daysUntilReset,
      estimatedDaysRemaining: Math.round(estimatedDaysRemaining),
      lastReset: userCredit.lastReset,
      recentTransactions: userCredit.history.slice(-10),
      overageCharges: userCredit.overageCharges
    };
  }

  /**
   * Upgrade user tier
   */
  async upgradeTier(userId, newTier) {
    const userCredit = this.userCredits.get(userId) || await this.loadFromDatabase(userId);
    
    if (!userCredit) {
      return await this.initializeUserCredits(userId, newTier);
    }
    
    const oldTier = userCredit.tier;
    const newAllocation = this.tierCredits[newTier];
    
    // Upgrade immediately gives pro-rated credits
    const daysInMonth = 30;
    const daysRemaining = this.getDaysUntilMonthlyReset();
    const proRatedCredits = Math.floor((newAllocation.monthly / daysInMonth) * daysRemaining);
    
    userCredit.tier = newTier;
    userCredit.monthlyAllocation = newAllocation.monthly;
    userCredit.dailyLimit = newAllocation.daily;
    userCredit.balance = Math.max(userCredit.balance, proRatedCredits);
    
    // Log the upgrade
    userCredit.history.push({
      timestamp: new Date(),
      operation: 'tier_upgrade',
      oldTier,
      newTier,
      creditsAdded: proRatedCredits - userCredit.balance,
      balance: userCredit.balance
    });
    
    await this.saveToDatabase(userCredit);
    
    return {
      success: true,
      newTier,
      newBalance: userCredit.balance,
      proRatedCredits
    };
  }

  /**
   * Check and perform monthly reset
   */
  checkMonthlyReset(userCredit) {
    const now = new Date();
    const lastReset = new Date(userCredit.lastReset);
    
    // Check if it's a new month
    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
      // Reset credits to monthly allocation
      userCredit.balance = userCredit.monthlyAllocation;
      userCredit.lastReset = now;
      userCredit.overageCharges = 0; // Reset overage charges
      
      // Log the reset
      userCredit.history.push({
        timestamp: now,
        operation: 'monthly_reset',
        creditsAdded: userCredit.monthlyAllocation,
        balance: userCredit.balance
      });
    }
  }

  /**
   * Check and perform daily reset
   */
  checkDailyReset(userCredit) {
    const now = new Date();
    const lastReset = new Date(userCredit.lastDailyReset);
    
    // Check if it's a new day
    if (now.getDate() !== lastReset.getDate() || now.getMonth() !== lastReset.getMonth()) {
      userCredit.dailyUsed = 0;
      userCredit.lastDailyReset = now;
    }
  }

  /**
   * Helper functions
   */
  getNextMonthlyReset() {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth;
  }

  getNextDailyReset() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  getDaysUntilMonthlyReset() {
    const now = new Date();
    const nextReset = this.getNextMonthlyReset();
    const diffTime = Math.abs(nextReset - now);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Database operations (implement with your database)
   */
  async saveToDatabase(userCredit) {
    // TODO: Implement database save
    // await db.userCredits.upsert(userCredit);
    return true;
  }

  async loadFromDatabase(userId) {
    // TODO: Implement database load
    // return await db.userCredits.findOne({ userId });
    return null;
  }

  async processPayment(userId, amount) {
    // TODO: Implement payment processing
    console.log(`Processing payment of $${amount.toFixed(2)} for user ${userId}`);
    return true;
  }
}

// Express middleware for credits checking
function creditsMiddleware(operation) {
  const creditsManager = new CreditsManager();
  
  return async (req, res, next) => {
    const userId = req.headers['x-user-id'] || req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const creditCheck = await creditsManager.checkCredits(userId, operation);
    
    if (!creditCheck.allowed) {
      return res.status(402).json({
        error: 'Insufficient credits',
        ...creditCheck
      });
    }
    
    // Attach to request for later deduction
    req.creditInfo = {
      userId,
      operation,
      cost: creditCheck.cost,
      manager: creditsManager
    };
    
    // Deduct credits after successful response
    const originalSend = res.send;
    res.send = function(data) {
      // Only deduct if successful
      if (res.statusCode < 400) {
        creditsManager.deductCredits(userId, operation).catch(err => {
          console.error('Failed to deduct credits:', err);
        });
      }
      return originalSend.call(this, data);
    };
    
    next();
  };
}

// API endpoints for credit management
const creditsRouter = require('express').Router();

creditsRouter.get('/status', async (req, res) => {
  const creditsManager = new CreditsManager();
  const userId = req.headers['x-user-id'] || req.session?.userId;
  
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const status = await creditsManager.getCreditStatus(userId);
  res.json(status);
});

creditsRouter.post('/purchase', async (req, res) => {
  const creditsManager = new CreditsManager();
  const userId = req.headers['x-user-id'] || req.session?.userId;
  const { amount } = req.body;
  
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const result = await creditsManager.addCredits(userId, amount, 'purchase');
  res.json(result);
});

module.exports = {
  CreditsManager,
  creditsMiddleware,
  creditsRouter
};