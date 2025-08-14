/**
 * Credits Database Service
 * Handles all database operations for the credits system
 */

import { getSupabaseAnon } from '../../db/supabaseClient.js';

const supabase = getSupabaseAnon();

class CreditsService {
  /**
   * Initialize user credits (called on signup)
   */
  async initializeUserCredits(userId, tier = 'free') {
    try {
      // Get tier configuration
      const { data: tierConfig, error: tierError } = await supabase
        .from('credit_tiers')
        .select('*')
        .eq('tier_name', tier)
        .single();

      if (tierError) {
        console.error('Error fetching tier config:', tierError);
        throw tierError;
      }

      // Create user credits entry
      const { data, error } = await supabase
        .from('user_credits')
        .insert({
          user_id: userId,
          tier: tier,
          balance: tierConfig.monthly_credits,
          monthly_allocation: tierConfig.monthly_credits,
          daily_limit: tierConfig.daily_limit,
          daily_used: 0
        })
        .select()
        .single();

      if (error) {
        // If already exists, just return current credits
        if (error.code === '23505') {
          return this.getUserCredits(userId);
        }
        throw error;
      }

      // Log initial credit allocation
      await this.logTransaction(userId, 'initial_allocation', 0, tierConfig.monthly_credits, 
        `Initial ${tier} tier allocation`);

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error initializing user credits:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get user credits
   */
  async getUserCredits(userId) {
    try {
      // First, run reset functions if needed
      await this.checkAndResetCredits(userId);

      const { data, error } = await supabase
        .from('user_credit_status')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // User doesn't exist, initialize with free tier
          return this.initializeUserCredits(userId, 'free');
        }
        throw error;
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error getting user credits:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if user has sufficient credits
   */
  async checkCredits(userId, operation, cost) {
    try {
      const { data: credits, error } = await supabase
        .from('user_credits')
        .select('balance, daily_used, daily_limit')
        .eq('user_id', userId)
        .single();

      if (error || !credits) {
        // Initialize if doesn't exist
        await this.initializeUserCredits(userId);
        return this.checkCredits(userId, operation, cost);
      }

      // Check daily limit
      if (credits.daily_used + cost > credits.daily_limit) {
        return {
          allowed: false,
          reason: 'daily_limit_exceeded',
          dailyLimit: credits.daily_limit,
          dailyUsed: credits.daily_used,
          costRequired: cost
        };
      }

      // Check balance
      if (credits.balance < cost) {
        return {
          allowed: false,
          reason: 'insufficient_credits',
          balance: credits.balance,
          costRequired: cost
        };
      }

      return {
        allowed: true,
        balance: credits.balance,
        cost: cost,
        remainingAfter: credits.balance - cost
      };
    } catch (error) {
      console.error('Error checking credits:', error);
      // Fail open in case of database error (allow the request)
      return {
        allowed: true,
        error: error.message
      };
    }
  }

  /**
   * Deduct credits for an operation
   */
  async deductCredits(userId, operation, cost, metadata = {}) {
    try {
      // Use the stored function for atomic operation
      const { data, error } = await supabase
        .rpc('deduct_credits', {
          p_user_id: userId,
          p_operation: operation,
          p_cost: cost,
          p_description: metadata.description || `${operation} operation`,
          p_metadata: metadata
        });

      if (error) throw error;

      const result = data[0];
      
      if (!result.success) {
        return {
          success: false,
          error: result.message
        };
      }

      return {
        success: true,
        newBalance: result.new_balance,
        message: result.message
      };
    } catch (error) {
      console.error('Error deducting credits:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add credits to user account
   */
  async addCredits(userId, amount, reason = 'manual_addition', metadata = {}) {
    try {
      const { data, error } = await supabase
        .rpc('add_credits', {
          p_user_id: userId,
          p_amount: amount,
          p_description: reason,
          p_metadata: metadata
        });

      if (error) throw error;

      const result = data[0];
      
      return {
        success: result.success,
        newBalance: result.new_balance
      };
    } catch (error) {
      console.error('Error adding credits:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get user's transaction history
   */
  async getTransactionHistory(userId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Upgrade user tier
   */
  async upgradeTier(userId, newTier) {
    try {
      // Get new tier configuration
      const { data: tierConfig, error: tierError } = await supabase
        .from('credit_tiers')
        .select('*')
        .eq('tier_name', newTier)
        .single();

      if (tierError) throw tierError;

      // Get current user credits
      const { data: currentCredits, error: creditsError } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (creditsError) throw creditsError;

      // Calculate pro-rated credits
      const now = new Date();
      const daysInMonth = 30;
      const dayOfMonth = now.getDate();
      const daysRemaining = daysInMonth - dayOfMonth;
      const proRatedCredits = Math.floor((tierConfig.monthly_credits / daysInMonth) * daysRemaining);

      // Update user tier and credits
      const { data, error } = await supabase
        .from('user_credits')
        .update({
          tier: newTier,
          balance: Math.max(currentCredits.balance, proRatedCredits),
          monthly_allocation: tierConfig.monthly_credits,
          daily_limit: tierConfig.daily_limit,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      // Log the upgrade
      await this.logTransaction(userId, 'tier_upgrade', 0, data.balance, 
        `Upgraded to ${newTier} tier`, {
          oldTier: currentCredits.tier,
          newTier: newTier,
          proRatedCredits
        });

      return {
        success: true,
        data,
        proRatedCredits
      };
    } catch (error) {
      console.error('Error upgrading tier:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Purchase credit package
   */
  async purchaseCredits(userId, packageId, paymentInfo) {
    try {
      // Get package details
      const { data: pkg, error: packageError } = await supabase
        .from('credit_packages')
        .select('*')
        .eq('id', packageId)
        .single();

      if (packageError) throw packageError;

      // Record purchase
      const { data: purchase, error: purchaseError } = await supabase
        .from('credit_purchases')
        .insert({
          user_id: userId,
          package_id: packageId,
          credits: pkg.credits,
          amount: pkg.price,
          payment_method: paymentInfo.method,
          payment_id: paymentInfo.paymentId,
          status: 'completed'
        })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // Add credits to user account
      const result = await this.addCredits(userId, pkg.credits, 
        `Purchased ${pkg.name}`, {
          packageId,
          purchaseId: purchase.id
        });

      return {
        success: true,
        purchase,
        newBalance: result.newBalance
      };
    } catch (error) {
      console.error('Error purchasing credits:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get available credit packages
   */
  async getCreditPackages() {
    try {
      const { data, error } = await supabase
        .from('credit_packages')
        .select('*')
        .eq('is_active', true)
        .order('credits', { ascending: true });

      if (error) throw error;

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error fetching credit packages:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check and reset credits if needed
   */
  async checkAndResetCredits(userId) {
    try {
      // Run reset functions
      await supabase.rpc('reset_daily_credits');
      await supabase.rpc('reset_monthly_credits');
      
      return { success: true };
    } catch (error) {
      console.error('Error resetting credits:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Log a transaction
   */
  async logTransaction(userId, operation, cost, balanceAfter, description, metadata = null) {
    try {
      const { error } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: userId,
          operation,
          cost,
          balance_after: balanceAfter,
          description,
          metadata
        });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error logging transaction:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(userId, period = '30d') {
    try {
      const startDate = new Date();
      if (period === '30d') {
        startDate.setDate(startDate.getDate() - 30);
      } else if (period === '7d') {
        startDate.setDate(startDate.getDate() - 7);
      }

      // Get transactions for period
      const { data: transactions, error } = await supabase
        .from('credit_transactions')
        .select('operation, cost, created_at')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate statistics
      const stats = {
        totalUsed: 0,
        byOperation: {},
        dailyUsage: {},
        peakUsageDay: null,
        averageDailyUsage: 0
      };

      transactions.forEach(tx => {
        // Total used
        if (tx.cost > 0) {
          stats.totalUsed += tx.cost;
          
          // By operation
          if (!stats.byOperation[tx.operation]) {
            stats.byOperation[tx.operation] = { count: 0, total: 0 };
          }
          stats.byOperation[tx.operation].count++;
          stats.byOperation[tx.operation].total += tx.cost;
          
          // Daily usage
          const day = new Date(tx.created_at).toISOString().split('T')[0];
          if (!stats.dailyUsage[day]) {
            stats.dailyUsage[day] = 0;
          }
          stats.dailyUsage[day] += tx.cost;
        }
      });

      // Calculate peak and average
      const dailyValues = Object.values(stats.dailyUsage);
      if (dailyValues.length > 0) {
        stats.peakUsageDay = Math.max(...dailyValues);
        stats.averageDailyUsage = stats.totalUsed / dailyValues.length;
      }

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Error getting usage stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const creditsService = new CreditsService();

export default creditsService;