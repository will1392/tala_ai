/**
 * Credit System for Tala AI
 * Manages user credits, consumption, and billing
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Credit costs in credits (1 credit = $0.001)
export const CREDIT_COSTS = {
  // Chat Operations
  chat_message: {
    'gpt-4o-mini': 10,
    'gemini-2.0-flash': 8,
    'claude-3-5-haiku': 25,
    'claude-3-5-sonnet': 75,
    'gpt-4o': 150,
    'grok-2': 50,
    'default': 30
  },
  
  // Document Operations
  document_upload: 50,
  document_search: 5,
  document_extract: 100,
  document_analyze: 150,
  
  // Voice Operations
  voice_transcription_per_minute: 20,
  voice_to_document: 70,
  
  // Email Operations
  email_parse: 30,
  email_batch_process: 200,
  email_task_extraction: 50,
  
  // Advanced Features
  image_analysis: 150,
  multi_agent_task: 300,
  document_translation: 200,
  
  // Bulk Operations
  bulk_document_process: 500,
  knowledge_base_search: 10
};

// Monthly credit allocation by plan type
const MONTHLY_CREDIT_ALLOCATION = {
  agent: 5000,    // $5 worth for solo agents
  agency: 10000,  // $10 worth for agencies (shared pool)
  enterprise: 50000 // $50 worth for enterprise (custom)
};

class CreditSystem {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }

  /**
   * Initialize user credits (for new users)
   */
  async initializeUserCredits(userId, organizationId, planType = 'agent') {
    try {
      // For agency users, check if organization already has a credit pool
      if (planType === 'agency' && organizationId) {
        const { data: orgCredits } = await this.supabase
          .from('organization_credits')
          .select('*')
          .eq('organization_id', organizationId)
          .single();
        
        if (orgCredits) {
          // Organization pool exists, just link the user
          return { success: true, data: { organization_pool: true, ...orgCredits } };
        } else {
          // Create organization credit pool
          await this.supabase
            .from('organization_credits')
            .insert({
              organization_id: organizationId,
              total_credits: MONTHLY_CREDIT_ALLOCATION[planType],
              used_credits: 0,
              bonus_credits: 0,
              plan_type: planType,
              last_reset_date: new Date().toISOString()
            });
        }
      }

      // For solo agents, create individual credit allocation
      const { data, error } = await this.supabase
        .from('user_credits')
        .insert({
          user_id: userId,
          organization_id: organizationId,
          total_credits: MONTHLY_CREDIT_ALLOCATION[planType] || MONTHLY_CREDIT_ALLOCATION.agent,
          used_credits: 0,
          bonus_credits: 0,
          plan_type: planType,
          last_reset_date: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Failed to initialize user credits:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's current credit balance
   */
  async getUserCredits(userId) {
    try {
      // First check user's plan type and organization
      const { data: userData, error: userError } = await this.supabase
        .from('user_credits')
        .select('organization_id, plan_type')
        .eq('user_id', userId)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        // If table doesn't exist or column is missing, return default credits
        if (userError.message?.includes('does not exist')) {
          console.warn('Credit system tables not yet created, returning defaults');
          return {
            success: true,
            data: {
              user_id: userId,
              total_credits: 5000,
              used_credits: 0,
              bonus_credits: 0,
              available_credits: 5000,
              percentage_used: 0,
              plan_type: 'agent',
              is_organization_pool: false,
              last_reset_date: new Date().toISOString()
            }
          };
        }
        throw userError;
      }

      const planType = userData?.plan_type || 'agent';
      const organizationId = userData?.organization_id;

      // For agency users, get organization credit pool
      if (planType === 'agency' && organizationId) {
        const { data: orgCredits, error: orgError } = await this.supabase
          .from('organization_credits')
          .select('*')
          .eq('organization_id', organizationId)
          .single();

        if (orgError && orgError.code !== 'PGRST116') {
          throw orgError;
        }

        if (orgCredits) {
          const availableCredits = orgCredits.total_credits + orgCredits.bonus_credits - orgCredits.used_credits;
          return {
            success: true,
            data: {
              ...orgCredits,
              available_credits: availableCredits,
              percentage_used: (orgCredits.used_credits / orgCredits.total_credits) * 100,
              is_organization_pool: true,
              plan_type: 'agency'
            }
          };
        }
      }

      // For solo agents or if no org pool exists, get individual credits
      const { data, error } = await this.supabase
        .from('user_credits')
        .select('*, role')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // User doesn't exist, initialize credits
          return await this.initializeUserCredits(userId, organizationId, planType);
        }
        throw error;
      }

      // Calculate available credits
      const availableCredits = data.total_credits + data.bonus_credits - data.used_credits;
      
      return {
        success: true,
        data: {
          ...data,
          available_credits: availableCredits,
          percentage_used: (data.used_credits / data.total_credits) * 100,
          is_organization_pool: false,
          plan_type: data.plan_type || 'agent',
          role: data.role || 'agent'
        }
      };
    } catch (error) {
      console.error('Failed to get user credits:', error);
      
      // If any database error occurs, return default credits
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        console.warn('Returning default credits due to database error');
        return {
          success: true,
          data: {
            user_id: userId,
            total_credits: 5000,
            used_credits: 0,
            bonus_credits: 0,
            available_credits: 5000,
            percentage_used: 0,
            plan_type: 'agent',
            is_organization_pool: false,
            last_reset_date: new Date().toISOString()
          }
        };
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user has enough credits for an operation
   */
  async checkCredits(userId, operation, additionalParams = {}) {
    const creditCost = this.calculateCreditCost(operation, additionalParams);
    const userCredits = await this.getUserCredits(userId);
    
    if (!userCredits.success) {
      return { success: false, error: 'Failed to check credits' };
    }

    // Super admin bypass: always allow operations for super_admin users
    if (userCredits.data.role === 'super_admin') {
      return {
        success: true,
        hasEnoughCredits: true,
        creditCost,
        availableCredits: userCredits.data.available_credits,
        shortfall: 0,
        bypassReason: 'super_admin_unlimited_access'
      };
    }

    const hasEnoughCredits = userCredits.data.available_credits >= creditCost;
    
    return {
      success: true,
      hasEnoughCredits,
      creditCost,
      availableCredits: userCredits.data.available_credits,
      shortfall: hasEnoughCredits ? 0 : creditCost - userCredits.data.available_credits
    };
  }

  /**
   * Consume credits for an operation
   */
  async consumeCredits(userId, operation, additionalParams = {}) {
    try {
      // First check if user has enough credits
      const creditCheck = await this.checkCredits(userId, operation, additionalParams);
      
      if (!creditCheck.success) {
        return creditCheck;
      }

      if (!creditCheck.hasEnoughCredits) {
        return {
          success: false,
          error: 'INSUFFICIENT_CREDITS',
          message: `Not enough credits. Need ${creditCheck.creditCost}, have ${creditCheck.availableCredits}`,
          creditCost: creditCheck.creditCost,
          availableCredits: creditCheck.availableCredits,
          shortfall: creditCheck.shortfall
        };
      }

      // Super admin bypass: don't actually deduct credits but still log and return success
      if (creditCheck.bypassReason === 'super_admin_unlimited_access') {
        await this.logCreditTransaction(userId, operation, 0, {
          ...additionalParams,
          bypass_reason: 'super_admin_unlimited_access',
          would_have_cost: creditCheck.creditCost
        });

        return {
          success: true,
          creditsConsumed: 0,
          remainingCredits: creditCheck.availableCredits,
          bypassReason: 'super_admin_unlimited_access'
        };
      }

      // Get user's plan type from user_credits table
      const { data: creditData, error: creditError } = await this.supabase
        .from('user_credits')
        .select('plan_type, organization_id')
        .eq('user_id', userId)
        .single();

      if (creditError) throw creditError;

      const planType = creditData?.plan_type || 'agent';
      const organizationId = creditData?.organization_id;

      // Consume from appropriate pool
      if (planType === 'agency' && organizationId) {
        // Use organization pool
        const { data: orgData } = await this.supabase
          .from('organization_credits')
          .select('used_credits')
          .eq('organization_id', organizationId)
          .single();

        const newUsedCredits = (orgData?.used_credits || 0) + creditCheck.creditCost;

        const { error: updateError } = await this.supabase
          .from('organization_credits')
          .update({ used_credits: newUsedCredits })
          .eq('organization_id', organizationId);

        if (updateError) throw updateError;

        // Track individual usage within agency
        const { data: memberData } = await this.supabase
          .from('agency_members')
          .select('credits_used_this_period')
          .eq('user_id', userId)
          .eq('organization_id', organizationId)
          .single();

        await this.supabase
          .from('agency_members')
          .update({
            credits_used_this_period: (memberData?.credits_used_this_period || 0) + creditCheck.creditCost,
            last_activity: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('organization_id', organizationId);

      } else {
        // Use individual pool
        const { data: userCredits } = await this.supabase
          .from('user_credits')
          .select('used_credits')
          .eq('user_id', userId)
          .single();

        const newUsedCredits = (userCredits?.used_credits || 0) + creditCheck.creditCost;

        const { error: updateError } = await this.supabase
          .from('user_credits')
          .update({ used_credits: newUsedCredits })
          .eq('user_id', userId);

        if (updateError) throw updateError;
      }

      // Log the transaction
      await this.logCreditTransaction(userId, operation, creditCheck.creditCost, {
        ...additionalParams,
        pool_type: planType === 'agency' ? 'organization' : 'individual'
      });

      return {
        success: true,
        creditsConsumed: creditCheck.creditCost,
        remainingCredits: creditCheck.availableCredits - creditCheck.creditCost
      };
    } catch (error) {
      console.error('Failed to consume credits:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate credit cost for an operation
   */
  calculateCreditCost(operation, params = {}) {
    // If cost is explicitly provided in params, use it
    if (params.cost !== undefined && params.cost !== null) {
      return params.cost;
    }
    
    // Chat messages - variable cost based on model
    if (operation === 'chat_message') {
      const model = params.model || 'default';
      return CREDIT_COSTS.chat_message[model] || CREDIT_COSTS.chat_message.default;
    }

    // Voice transcription - cost per minute
    if (operation === 'voice_transcription') {
      const minutes = Math.ceil(params.duration / 60) || 1;
      return CREDIT_COSTS.voice_transcription_per_minute * minutes;
    }

    // Document operations with size multiplier
    if (operation === 'document_upload' && params.fileSize) {
      // Base cost + extra for large files (over 5MB)
      const sizeMB = params.fileSize / (1024 * 1024);
      const sizeMultiplier = sizeMB > 5 ? Math.ceil(sizeMB / 5) : 1;
      return CREDIT_COSTS.document_upload * sizeMultiplier;
    }

    // Default cost lookup
    return CREDIT_COSTS[operation] || 0;
  }

  /**
   * Add bonus credits (for promotions, referrals, etc)
   */
  async addBonusCredits(userId, amount, reason) {
    try {
      const { data: userData } = await this.supabase
        .from('user_credits')
        .select('bonus_credits')
        .eq('user_id', userId)
        .single();

      const newBonusCredits = (userData?.bonus_credits || 0) + amount;

      const { error } = await this.supabase
        .from('user_credits')
        .update({ bonus_credits: newBonusCredits })
        .eq('user_id', userId);

      if (error) throw error;

      // Log bonus credit addition
      await this.logCreditTransaction(userId, 'bonus_credit', -amount, { reason });

      return { success: true, creditsAdded: amount, newBonusTotal: newBonusCredits };
    } catch (error) {
      console.error('Failed to add bonus credits:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Purchase credits (top-up)
   */
  async purchaseCredits(userId, creditAmount, paymentInfo) {
    try {
      const { data: userData } = await this.supabase
        .from('user_credits')
        .select('total_credits')
        .eq('user_id', userId)
        .single();

      const newTotalCredits = userData.total_credits + creditAmount;

      const { error } = await this.supabase
        .from('user_credits')
        .update({ total_credits: newTotalCredits })
        .eq('user_id', userId);

      if (error) throw error;

      // Log purchase
      await this.logCreditTransaction(userId, 'credit_purchase', -creditAmount, {
        paymentMethod: paymentInfo.method,
        amount: creditAmount * 0.001 // Convert to dollars
      });

      return { 
        success: true, 
        creditsPurchased: creditAmount,
        newTotalCredits: newTotalCredits 
      };
    } catch (error) {
      console.error('Failed to purchase credits:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Monthly credit reset (called by cron job)
   */
  async monthlyReset() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Reset individual user credits (agents)
      const { data: users, error: userError } = await this.supabase
        .from('user_credits')
        .select('*')
        .lt('last_reset_date', thirtyDaysAgo.toISOString());

      if (userError) throw userError;

      for (const user of users || []) {
        // Calculate rollover credits (unused from previous month)
        const unusedCredits = user.total_credits - user.used_credits;
        const rolloverCredits = Math.max(0, unusedCredits);
        const planType = user.plan_type || 'agent';
        const newAllocation = MONTHLY_CREDIT_ALLOCATION[planType] || MONTHLY_CREDIT_ALLOCATION.agent;
        
        // Reset with new allocation + rollover
        await this.supabase
          .from('user_credits')
          .update({
            total_credits: newAllocation + rolloverCredits,
            used_credits: 0,
            last_reset_date: new Date().toISOString()
          })
          .eq('user_id', user.user_id);

        // Log the reset
        await this.logCreditTransaction(user.user_id, 'monthly_reset', -newAllocation, {
          rolloverCredits,
          planType
        });
      }

      // Reset organization credits (agencies)
      const { data: orgs, error: orgError } = await this.supabase
        .from('organization_credits')
        .select('*')
        .lt('last_reset_date', thirtyDaysAgo.toISOString());

      if (orgError) throw orgError;

      for (const org of orgs || []) {
        // Calculate rollover credits
        const unusedCredits = org.total_credits - org.used_credits;
        const rolloverCredits = Math.max(0, unusedCredits);
        const planType = org.plan_type || 'agency';
        const newAllocation = MONTHLY_CREDIT_ALLOCATION[planType] || MONTHLY_CREDIT_ALLOCATION.agency;
        
        // Reset organization credits
        await this.supabase
          .from('organization_credits')
          .update({
            total_credits: newAllocation + rolloverCredits,
            used_credits: 0,
            last_reset_date: new Date().toISOString()
          })
          .eq('organization_id', org.organization_id);

        // Reset agency member usage tracking
        await this.supabase
          .from('agency_members')
          .update({ credits_used_this_period: 0 })
          .eq('organization_id', org.organization_id);
      }

      return { 
        success: true, 
        usersReset: (users?.length || 0),
        organizationsReset: (orgs?.length || 0)
      };
    } catch (error) {
      console.error('Failed to perform monthly reset:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get credit usage history
   */
  async getCreditHistory(userId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await this.supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by operation type
      const summary = data.reduce((acc, transaction) => {
        const op = transaction.operation;
        if (!acc[op]) {
          acc[op] = { count: 0, totalCredits: 0 };
        }
        acc[op].count += 1;
        acc[op].totalCredits += Math.abs(transaction.credits);
        return acc;
      }, {});

      return { 
        success: true, 
        transactions: data,
        summary,
        totalSpent: data.reduce((sum, t) => sum + (t.credits > 0 ? t.credits : 0), 0)
      };
    } catch (error) {
      console.error('Failed to get credit history:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Log credit transaction
   */
  async logCreditTransaction(userId, operation, credits, metadata = {}) {
    try {
      await this.supabase
        .from('credit_transactions')
        .insert({
          user_id: userId,
          operation,
          credits,
          metadata,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to log credit transaction:', error);
    }
  }

  /**
   * Get credit pricing tiers
   */
  getCreditPricingTiers() {
    return [
      { id: 'starter', credits: 5000, price: 10, name: 'Starter Pack' },
      { id: 'growth', credits: 10000, price: 20, name: 'Growth Pack' },
      { id: 'pro', credits: 25000, price: 40, name: 'Pro Pack', popular: true },
      { id: 'business', credits: 50000, price: 65, name: 'Business Pack' },
      { id: 'enterprise', credits: 100000, price: 100, name: 'Enterprise Pack' }
    ];
  }

  /**
   * Add agent to agency (for agency owners)
   */
  async addAgentToAgency(organizationId, agentEmail, addedByUserId) {
    try {
      // First check if user exists
      const { data: agentUser, error: userError } = await this.supabase
        .from('users')
        .select('id, plan_type')
        .eq('email', agentEmail)
        .single();

      if (userError || !agentUser) {
        return { success: false, error: 'User not found' };
      }

      // Check if already a member
      const { data: existingMember } = await this.supabase
        .from('agency_members')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('user_id', agentUser.id)
        .single();

      if (existingMember) {
        return { success: false, error: 'User is already a member of this agency' };
      }

      // Add to agency
      const { error: addError } = await this.supabase
        .from('agency_members')
        .insert({
          organization_id: organizationId,
          user_id: agentUser.id,
          added_by: addedByUserId,
          role: 'agent'
        });

      if (addError) throw addError;

      // Update user's plan type to agency
      await this.supabase
        .from('users')
        .update({ 
          plan_type: 'agency',
          organization_id: organizationId 
        })
        .eq('id', agentUser.id);

      return { 
        success: true, 
        message: 'Agent added to agency successfully',
        agentId: agentUser.id 
      };
    } catch (error) {
      console.error('Failed to add agent to agency:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove agent from agency
   */
  async removeAgentFromAgency(organizationId, agentId) {
    try {
      // Mark as inactive in agency_members
      const { error: removeError } = await this.supabase
        .from('agency_members')
        .update({ 
          active: false,
          removed_at: new Date().toISOString()
        })
        .eq('organization_id', organizationId)
        .eq('user_id', agentId);

      if (removeError) throw removeError;

      // Update user back to individual agent plan
      await this.supabase
        .from('users')
        .update({ 
          plan_type: 'agent',
          organization_id: null 
        })
        .eq('id', agentId);

      // Initialize individual credits for the agent
      await this.initializeUserCredits(agentId, null, 'agent');

      return { 
        success: true, 
        message: 'Agent removed from agency' 
      };
    } catch (error) {
      console.error('Failed to remove agent from agency:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get agency members and their usage
   */
  async getAgencyMembers(organizationId) {
    try {
      const { data, error } = await this.supabase
        .from('agency_usage_summary')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('active', true);

      if (error) throw error;

      // Get total organization credits
      const { data: orgCredits } = await this.supabase
        .from('organization_credits')
        .select('total_credits, used_credits, bonus_credits')
        .eq('organization_id', organizationId)
        .single();

      return {
        success: true,
        members: data || [],
        organizationCredits: orgCredits,
        totalMembers: data?.length || 0
      };
    } catch (error) {
      console.error('Failed to get agency members:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get available plans
   */
  async getAvailablePlans() {
    try {
      const { data, error } = await this.supabase
        .from('plan_pricing')
        .select('*')
        .eq('active', true)
        .order('monthly_credits', { ascending: true });

      if (error) throw error;

      return { success: true, plans: data };
    } catch (error) {
      console.error('Failed to get available plans:', error);
      
      // If table doesn't exist, return default plans
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        return {
          success: true,
          plans: [
            {
              id: '1',
              plan_type: 'agent',
              name: 'Agent (Solo)',
              monthly_credits: 5000,
              monthly_price_cents: 999,
              max_users: 1,
              features: { individual_pool: true },
              active: true
            },
            {
              id: '2',
              plan_type: 'agency',
              name: 'Agency (Team)',
              monthly_credits: 10000,
              monthly_price_cents: 2999,
              max_users: 10,
              features: { shared_pool: true, team_management: true },
              active: true
            }
          ]
        };
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Upgrade/downgrade plan
   */
  async changePlan(userId, newPlanType) {
    try {
      // Get current user data
      const { data: userData } = await this.supabase
        .from('users')
        .select('plan_type, organization_id')
        .eq('id', userId)
        .single();

      if (!userData) {
        return { success: false, error: 'User not found' };
      }

      const oldPlanType = userData.plan_type;

      // If upgrading to agency, create organization
      if (newPlanType === 'agency' && oldPlanType === 'agent') {
        // Create new organization
        const { data: newOrg, error: orgError } = await this.supabase
          .from('organizations')
          .insert({
            name: `Agency of User ${userId}`,
            owner_id: userId
          })
          .select()
          .single();

        if (orgError) throw orgError;

        // Update user
        await this.supabase
          .from('users')
          .update({ 
            plan_type: 'agency',
            organization_id: newOrg.id 
          })
          .eq('id', userId);

        // Initialize organization credits
        await this.initializeUserCredits(userId, newOrg.id, 'agency');

        return { 
          success: true, 
          message: 'Upgraded to agency plan',
          organizationId: newOrg.id 
        };
      }

      // If downgrading from agency to agent
      if (newPlanType === 'agent' && oldPlanType === 'agency') {
        // Remove all agents from the agency first
        const { data: members } = await this.supabase
          .from('agency_members')
          .select('user_id')
          .eq('organization_id', userData.organization_id)
          .eq('active', true);

        // Remove each member
        for (const member of members || []) {
          if (member.user_id !== userId) {
            await this.removeAgentFromAgency(userData.organization_id, member.user_id);
          }
        }

        // Update user
        await this.supabase
          .from('users')
          .update({ 
            plan_type: 'agent',
            organization_id: null 
          })
          .eq('id', userId);

        // Initialize individual credits
        await this.initializeUserCredits(userId, null, 'agent');

        return { 
          success: true, 
          message: 'Downgraded to agent plan' 
        };
      }

      return { success: false, error: 'Invalid plan change' };
    } catch (error) {
      console.error('Failed to change plan:', error);
      return { success: false, error: error.message };
    }
  }
}

// Middleware to check credits before API operations
export const requireCredits = (operation) => {
  const creditSystem = new CreditSystem();
  
  return async (req, res, next) => {
    const userId = req.userId || req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID required for credit check' });
    }

    // Additional parameters for credit calculation
    const params = {
      model: req.body.model || req.query.model,
      fileSize: req.file?.size,
      duration: req.body.duration
    };

    const creditCheck = await creditSystem.checkCredits(userId, operation, params);
    
    if (!creditCheck.success) {
      return res.status(500).json({ 
        error: 'Failed to check credits',
        details: creditCheck.error 
      });
    }

    if (!creditCheck.hasEnoughCredits) {
      return res.status(402).json({
        error: 'INSUFFICIENT_CREDITS',
        message: 'Not enough credits for this operation',
        creditCost: creditCheck.creditCost,
        availableCredits: creditCheck.availableCredits,
        shortfall: creditCheck.shortfall,
        pricingTiers: creditSystem.getCreditPricingTiers()
      });
    }

    // Attach credit info to request for consumption after successful operation
    req.creditInfo = {
      operation,
      cost: creditCheck.creditCost,
      params
    };

    next();
  };
};

// Helper to consume credits after successful operation
export const consumeCreditsAfterSuccess = async (req, userId) => {
  if (!req.creditInfo) return;
  
  const creditSystem = new CreditSystem();
  await creditSystem.consumeCredits(userId, req.creditInfo.operation, req.creditInfo.params);
};

export default CreditSystem;