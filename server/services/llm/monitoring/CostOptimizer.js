/**
 * Cost Optimizer for Tala AI LLM Services
 * 
 * Tracks cumulative costs, implements budget controls, suggests cheaper alternatives,
 * and provides cost projections to optimize spending across LLM models.
 */

import { getModelConfig } from '../config.js';

export class CostOptimizer {
  constructor(options = {}) {
    this.options = {
      enableLogging: options.enableLogging !== false,
      dailyBudget: options.dailyBudget || null,   // e.g., 50.00 for $50/day
      monthlyBudget: options.monthlyBudget || null, // e.g., 1000.00 for $1000/month
      warningThreshold: options.warningThreshold || 0.8, // 80% of budget
      emergencyThreshold: options.emergencyThreshold || 0.95, // 95% of budget
      costSavingsTarget: options.costSavingsTarget || 0.3, // Target 30% cost savings
      ...options
    };

    // Cost tracking state
    this.costs = {
      total: 0,
      daily: new Map(),      // Date -> cost
      monthly: new Map(),    // Month -> cost
      models: new Map(),     // Model -> cumulative cost
      queryTypes: new Map(), // Query type -> cumulative cost
      users: new Map(),      // User -> cumulative cost
      sessions: new Map()    // Session -> cost
    };

    // Budget tracking
    this.budgets = {
      daily: {
        limit: this.options.dailyBudget,
        spent: 0,
        remaining: this.options.dailyBudget || Infinity,
        resetTime: this.getNextMidnight()
      },
      monthly: {
        limit: this.options.monthlyBudget,
        spent: 0,
        remaining: this.options.monthlyBudget || Infinity,
        resetTime: this.getNextMonthStart()
      }
    };

    // Cost optimization rules
    this.optimizationRules = {
      // Simple queries can use cheaper models
      factual: {
        primary: ['gpt-5-nano-2025-08-07'],
        fallback: ['claude-sonnet-4-20250514'],
        maxCostPerQuery: 0.001 // $0.001 per query
      },
      
      // Real-time queries prioritize speed but can be cost-optimized
      realTime: {
        primary: ['gpt-5-nano-2025-08-07'],
        fallback: ['claude-sonnet-4-20250514'],
        maxCostPerQuery: 0.005
      },
      
      // Complex queries need quality but can use mid-tier models
      complexPlanning: {
        primary: ['gpt-5-nano-2025-08-07'],
        fallback: ['claude-sonnet-4-20250514'],
        maxCostPerQuery: 0.02,
        emergencyFallback: ['gpt-5-nano-2025-08-07'] // When budget is critical
      },
      
      // Document analysis can be optimized
      documentAnalysis: {
        primary: ['gpt-5-nano-2025-08-07'],
        fallback: ['claude-sonnet-4-20250514'],
        maxCostPerQuery: 0.015
      },
      
      // Creative content prioritizes quality
      creative: {
        primary: ['gpt-5-nano-2025-08-07'],
        fallback: ['claude-sonnet-4-20250514'],
        maxCostPerQuery: 0.05,
        emergencyFallback: ['gpt-5-nano-2025-08-07']
      }
    };

    this.startTime = Date.now();
    this.log('Cost Optimizer initialized');
  }

  /**
   * Record cost for a query
   * @param {Object} costData - Cost information
   */
  recordCost(costData) {
    const {
      cost,
      modelId,
      queryType,
      userId,
      sessionId,
      timestamp = Date.now(),
      tokensUsed = 0,
      inputTokens = 0,
      outputTokens = 0
    } = costData;

    // Validate cost is a number
    if (typeof cost !== 'number' || isNaN(cost) || cost <= 0) {
      this.log(`Invalid cost value: ${cost}, skipping cost recording`);
      return;
    }

    // Update total cost
    this.costs.total += cost;

    // Update daily costs
    const dateKey = this.getDateKey(timestamp);
    this.costs.daily.set(dateKey, (this.costs.daily.get(dateKey) || 0) + cost);

    // Update monthly costs  
    const monthKey = this.getMonthKey(timestamp);
    this.costs.monthly.set(monthKey, (this.costs.monthly.get(monthKey) || 0) + cost);

    // Update model costs
    this.costs.models.set(modelId, (this.costs.models.get(modelId) || 0) + cost);

    // Update query type costs
    if (queryType) {
      this.costs.queryTypes.set(queryType, (this.costs.queryTypes.get(queryType) || 0) + cost);
    }

    // Update user costs
    if (userId) {
      this.costs.users.set(userId, (this.costs.users.get(userId) || 0) + cost);
    }

    // Update session costs
    if (sessionId) {
      this.costs.sessions.set(sessionId, (this.costs.sessions.get(sessionId) || 0) + cost);
    }

    // Update budget tracking
    this.updateBudgets(cost, timestamp);

    this.log(`Recorded cost: $${cost.toFixed(6)} for ${modelId} (${queryType})`);
  }

  /**
   * Update budget tracking and check thresholds
   * @param {number} cost - Cost to add
   * @param {number} timestamp - Timestamp of the cost
   */
  updateBudgets(cost, timestamp) {
    const now = Date.now();
    
    // Reset budgets if necessary
    if (now >= this.budgets.daily.resetTime) {
      this.resetDailyBudget();
    }
    if (now >= this.budgets.monthly.resetTime) {
      this.resetMonthlyBudget();
    }

    // Update daily budget
    if (this.budgets.daily.limit) {
      this.budgets.daily.spent += cost;
      this.budgets.daily.remaining = Math.max(0, this.budgets.daily.limit - this.budgets.daily.spent);
      
      // Check thresholds
      const dailyUsage = this.budgets.daily.spent / this.budgets.daily.limit;
      if (dailyUsage >= this.options.emergencyThreshold) {
        this.log(`🚨 EMERGENCY: Daily budget ${(dailyUsage * 100).toFixed(1)}% used!`, 'error');
      } else if (dailyUsage >= this.options.warningThreshold) {
        this.log(`⚠️  WARNING: Daily budget ${(dailyUsage * 100).toFixed(1)}% used`, 'warn');
      }
    }

    // Update monthly budget
    if (this.budgets.monthly.limit) {
      this.budgets.monthly.spent += cost;
      this.budgets.monthly.remaining = Math.max(0, this.budgets.monthly.limit - this.budgets.monthly.spent);
      
      // Check thresholds
      const monthlyUsage = this.budgets.monthly.spent / this.budgets.monthly.limit;
      if (monthlyUsage >= this.options.emergencyThreshold) {
        this.log(`🚨 EMERGENCY: Monthly budget ${(monthlyUsage * 100).toFixed(1)}% used!`, 'error');
      } else if (monthlyUsage >= this.options.warningThreshold) {
        this.log(`⚠️  WARNING: Monthly budget ${(monthlyUsage * 100).toFixed(1)}% used`, 'warn');
      }
    }
  }

  /**
   * Get cost-optimized model suggestion for a query
   * @param {string} queryType - Type of query
   * @param {Object} context - Additional context
   * @returns {Object} Optimization suggestion
   */
  getOptimizedModel(queryType, context = {}) {
    const rules = this.optimizationRules[queryType] || this.optimizationRules.factual;
    const budgetStatus = this.getBudgetStatus();
    
    // Force emergency mode if budgets are critical
    const isEmergencyMode = budgetStatus.daily.usage >= this.options.emergencyThreshold ||
                           budgetStatus.monthly.usage >= this.options.emergencyThreshold;
    
    let suggestedModels = [...rules.primary];
    let reasoning = ['Query type optimization'];
    
    // Apply emergency cost controls
    if (isEmergencyMode && rules.emergencyFallback) {
      suggestedModels = rules.emergencyFallback;
      reasoning.push('Emergency budget mode - using cheapest models');
    }
    
    // Apply budget-aware filtering
    if (budgetStatus.daily.usage >= this.options.warningThreshold ||
        budgetStatus.monthly.usage >= this.options.warningThreshold) {
      
      // Filter to only cheapest models
      suggestedModels = this.filterByCost(suggestedModels, rules.maxCostPerQuery * 0.5);
      reasoning.push('Budget warning - preferring cheaper models');
    }
    
    // Estimate costs for suggested models
    const modelCosts = suggestedModels.map(modelId => {
      const config = getModelConfig(modelId);
      const estimatedCost = this.estimateQueryCost(modelId, context.estimatedTokens || 100);
      
      return {
        modelId,
        estimatedCost,
        config,
        isAvailable: !!config
      };
    }).filter(m => m.isAvailable);
    
    // Sort by cost (cheapest first)
    modelCosts.sort((a, b) => a.estimatedCost - b.estimatedCost);
    
    return {
      primaryModel: modelCosts[0]?.modelId || 'gpt-4o-mini',
      alternatives: modelCosts.slice(1).map(m => m.modelId),
      estimatedCost: modelCosts[0]?.estimatedCost || 0,
      budgetStatus,
      reasoning,
      isEmergencyMode,
      maxBudgetPerQuery: rules.maxCostPerQuery,
      costSavings: this.calculatePotentialSavings(queryType, modelCosts[0]?.modelId)
    };
  }

  /**
   * Filter models by maximum cost per query
   * @param {Array} modelIds - Model IDs to filter
   * @param {number} maxCost - Maximum cost threshold
   * @returns {Array} Filtered model IDs
   */
  filterByCost(modelIds, maxCost) {
    return modelIds.filter(modelId => {
      const estimatedCost = this.estimateQueryCost(modelId, 100); // Estimate for 100 tokens
      return estimatedCost <= maxCost;
    });
  }

  /**
   * Estimate cost for a query with a specific model
   * @param {string} modelId - Model to estimate cost for
   * @param {number} estimatedTokens - Estimated token usage
   * @returns {number} Estimated cost
   */
  estimateQueryCost(modelId, estimatedTokens = 100) {
    const config = getModelConfig(modelId);
    if (!config) return 0;

    // Assume 70% input, 30% output token split
    const inputTokens = Math.floor(estimatedTokens * 0.7);
    const outputTokens = Math.floor(estimatedTokens * 0.3);
    
    const inputCost = (inputTokens / 1000) * config.pricing.input;
    const outputCost = (outputTokens / 1000) * config.pricing.output;
    
    return inputCost + outputCost;
  }

  /**
   * Calculate potential cost savings compared to current usage
   * @param {string} queryType - Query type
   * @param {string} suggestedModel - Suggested model
   * @returns {Object} Savings analysis
   */
  calculatePotentialSavings(queryType, suggestedModel) {
    const historicalCost = this.costs.queryTypes.get(queryType) || 0;
    const historicalQueries = this.getQueryTypeRequestCount(queryType);
    
    if (historicalQueries === 0) {
      return { potential: 0, percentage: 0 };
    }
    
    const avgHistoricalCost = historicalCost / historicalQueries;
    const suggestedCost = this.estimateQueryCost(suggestedModel, 100);
    
    const savings = avgHistoricalCost - suggestedCost;
    const percentage = avgHistoricalCost > 0 ? (savings / avgHistoricalCost) * 100 : 0;
    
    return {
      potential: Math.max(0, savings),
      percentage: Math.max(0, percentage),
      historicalAvg: avgHistoricalCost,
      suggestedCost
    };
  }

  /**
   * Get comprehensive budget status
   * @returns {Object} Budget status information
   */
  getBudgetStatus() {
    const now = Date.now();
    
    return {
      daily: {
        limit: this.budgets.daily.limit,
        spent: this.budgets.daily.spent,
        remaining: this.budgets.daily.remaining,
        usage: this.budgets.daily.limit ? this.budgets.daily.spent / this.budgets.daily.limit : 0,
        resetTime: this.budgets.daily.resetTime,
        hoursUntilReset: Math.max(0, (this.budgets.daily.resetTime - now) / (1000 * 60 * 60))
      },
      monthly: {
        limit: this.budgets.monthly.limit,
        spent: this.budgets.monthly.spent,
        remaining: this.budgets.monthly.remaining,
        usage: this.budgets.monthly.limit ? this.budgets.monthly.spent / this.budgets.monthly.limit : 0,
        resetTime: this.budgets.monthly.resetTime,
        daysUntilReset: Math.max(0, (this.budgets.monthly.resetTime - now) / (1000 * 60 * 60 * 24))
      },
      total: {
        allTime: this.costs.total,
        today: this.costs.daily.get(this.getDateKey(now)) || 0,
        thisMonth: this.costs.monthly.get(this.getMonthKey(now)) || 0
      }
    };
  }

  /**
   * Get cost breakdown report
   * @param {Object} options - Report options
   * @returns {Object} Cost breakdown
   */
  getCostBreakdown(options = {}) {
    const { timeRange = 30 * 24 * 60 * 60 * 1000 } = options; // 30 days default
    const now = Date.now();
    
    return {
      summary: this.getBudgetStatus(),
      
      byModel: Array.from(this.costs.models.entries())
        .map(([modelId, cost]) => ({ modelId, cost }))
        .sort((a, b) => b.cost - a.cost),
      
      byQueryType: Array.from(this.costs.queryTypes.entries())
        .map(([queryType, cost]) => ({ queryType, cost }))
        .sort((a, b) => b.cost - a.cost),
      
      dailyTrend: Array.from(this.costs.daily.entries())
        .filter(([date, _]) => {
          const timestamp = new Date(date).getTime();
          return timestamp >= now - timeRange;
        })
        .map(([date, cost]) => ({ date, cost }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      
      monthlyTrend: Array.from(this.costs.monthly.entries())
        .map(([month, cost]) => ({ month, cost }))
        .sort((a, b) => a.month.localeCompare(b.month)),
      
      topUsers: Array.from(this.costs.users.entries())
        .map(([userId, cost]) => ({ userId, cost }))
        .sort((a, b) => b.cost - a.cost)
        .slice(0, 10),
      
      optimizationOpportunities: this.getOptimizationOpportunities()
    };
  }

  /**
   * Identify optimization opportunities
   * @returns {Array} List of optimization suggestions
   */
  getOptimizationOpportunities() {
    const opportunities = [];
    
    // Check for expensive models used for simple queries
    for (const [queryType, cost] of this.costs.queryTypes) {
      const rules = this.optimizationRules[queryType];
      if (!rules) continue;
      
      const avgCost = cost / this.getQueryTypeRequestCount(queryType);
      if (avgCost > rules.maxCostPerQuery) {
        opportunities.push({
          type: 'expensive_queries',
          queryType,
          currentAvgCost: avgCost,
          recommendedMaxCost: rules.maxCostPerQuery,
          potentialSavings: (avgCost - rules.maxCostPerQuery) * this.getQueryTypeRequestCount(queryType),
          recommendation: `Switch ${queryType} queries to cheaper models: ${rules.primary.join(', ')}`
        });
      }
    }
    
    // Check for underutilized cheap models
    const cheapModels = ['gpt-4o-mini', 'gpt-5-nano-2025-08-07'];
    const totalCost = this.costs.total;
    const cheapModelCost = cheapModels.reduce((sum, model) => sum + (this.costs.models.get(model) || 0), 0);
    const cheapModelUsage = totalCost > 0 ? cheapModelCost / totalCost : 0;
    
    if (cheapModelUsage < this.options.costSavingsTarget) {
      opportunities.push({
        type: 'underutilized_cheap_models',
        currentUsage: cheapModelUsage * 100,
        targetUsage: this.options.costSavingsTarget * 100,
        potentialSavings: this.estimateSavingsFromCheapModels(),
        recommendation: `Increase usage of cost-effective models: ${cheapModels.join(', ')}`
      });
    }
    
    return opportunities;
  }

  /**
   * Estimate savings from using more cheap models
   * @returns {number} Estimated monthly savings
   */
  estimateSavingsFromCheapModels() {
    const monthlySpend = this.costs.monthly.get(this.getMonthKey(Date.now())) || 0;
    const targetSavings = monthlySpend * this.options.costSavingsTarget;
    return targetSavings;
  }

  /**
   * Get projection for future costs
   * @param {number} days - Days to project
   * @returns {Object} Cost projection
   */
  getCostProjection(days = 30) {
    const recentDays = Math.min(7, this.costs.daily.size);
    if (recentDays === 0) return { projection: 0, confidence: 0 };
    
    // Calculate average daily spend from recent days
    const recentCosts = Array.from(this.costs.daily.values()).slice(-recentDays);
    const avgDailySpend = recentCosts.reduce((sum, cost) => sum + cost, 0) / recentCosts.length;
    
    const projection = avgDailySpend * days;
    const confidence = Math.min(recentDays / 7, 1); // Higher confidence with more data
    
    return {
      projection,
      confidence,
      avgDailySpend,
      basedOnDays: recentDays,
      budgetImpact: this.budgets.monthly.limit ? projection / this.budgets.monthly.limit : null
    };
  }

  /**
   * Helper method to get query type request count
   * @param {string} queryType - Query type
   * @returns {number} Request count
   */
  getQueryTypeRequestCount(queryType) {
    // This would ideally come from the PerformanceMonitor
    // For now, estimate based on average cost
    const totalCost = this.costs.queryTypes.get(queryType) || 0;
    const estimatedAvgCost = 0.001; // $0.001 average
    return Math.round(totalCost / estimatedAvgCost);
  }

  /**
   * Reset daily budget
   */
  resetDailyBudget() {
    this.budgets.daily.spent = 0;
    this.budgets.daily.remaining = this.budgets.daily.limit || Infinity;
    this.budgets.daily.resetTime = this.getNextMidnight();
    this.log('Daily budget reset');
  }

  /**
   * Reset monthly budget
   */
  resetMonthlyBudget() {
    this.budgets.monthly.spent = 0;
    this.budgets.monthly.remaining = this.budgets.monthly.limit || Infinity;
    this.budgets.monthly.resetTime = this.getNextMonthStart();
    this.log('Monthly budget reset');
  }

  /**
   * Get date key for a timestamp
   * @param {number} timestamp - Timestamp
   * @returns {string} Date key (YYYY-MM-DD)
   */
  getDateKey(timestamp) {
    return new Date(timestamp).toISOString().split('T')[0];
  }

  /**
   * Get month key for a timestamp
   * @param {number} timestamp - Timestamp  
   * @returns {string} Month key (YYYY-MM)
   */
  getMonthKey(timestamp) {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Get next midnight timestamp
   * @returns {number} Next midnight timestamp
   */
  getNextMidnight() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime();
  }

  /**
   * Get next month start timestamp
   * @returns {number} Next month start timestamp
   */
  getNextMonthStart() {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);
    return nextMonth.getTime();
  }

  /**
   * Reset all cost data (useful for testing)
   */
  reset() {
    this.costs = {
      total: 0,
      daily: new Map(),
      monthly: new Map(),
      models: new Map(),
      queryTypes: new Map(),
      users: new Map(),
      sessions: new Map()
    };
    this.resetDailyBudget();
    this.resetMonthlyBudget();
    this.log('Cost data reset');
  }

  /**
   * Log messages with timestamp
   * @param {string} message - Log message
   * @param {string} level - Log level
   */
  log(message, level = 'info') {
    if (!this.options.enableLogging) return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[CostOptimizer ${level.toUpperCase()}] ${timestamp}`;
    
    switch (level) {
      case 'error':
        console.error(`${prefix}: ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix}: ${message}`);
        break;
      default:
        console.log(`${prefix}: ${message}`);
    }
  }
}

export default CostOptimizer;