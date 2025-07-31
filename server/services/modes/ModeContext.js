/**
 * ModeContext - Manages mode-specific context and data
 * 
 * Handles storing and retrieving mode-specific information for conversations,
 * ensuring proper context switching and data isolation between modes.
 */

import { getSupabaseService } from '../db/sharedDatabase.js';

class ModeContext {
  constructor() {
    this.supabase = getSupabaseService();
    
    // Context schemas for different modes
    this.contextSchemas = {
      travel: {
        destination: null,
        travel_dates: { start: null, end: null },
        travelers: { adults: 1, children: 0 },
        budget: null,
        preferences: {
          accommodation_type: null,
          transportation: null,
          activities: []
        },
        bookings: [],
        saved_items: []
      },
      cmo: {
        business_info: {
          name: null,
          industry: null,
          target_audience: null,
          website: null
        },
        active_campaigns: [],
        marketing_goals: [],
        brand_voice: null,
        competitors: [],
        analytics_connected: false,
        sub_contexts: {
          seo: {
            target_keywords: [],
            current_rankings: {},
            backlink_profile: null,
            technical_issues: []
          },
          email: {
            list_size: null,
            segments: [],
            templates_used: [],
            performance_benchmarks: {}
          },
          social: {
            platforms: [],
            posting_schedule: null,
            content_pillars: [],
            engagement_metrics: {}
          },
          ads: {
            platforms: [],
            campaigns: [],
            budget_allocation: {},
            performance_metrics: {}
          }
        }
      }
    };
    
    // Cache for conversation contexts
    this.contextCache = new Map();
  }

  /**
   * Initialize context for a new conversation
   * @param {string} conversationId - Conversation ID
   * @param {string} mode - Initial mode
   * @param {Object} initialData - Initial context data
   * @returns {Promise<Object>} Initialized context
   */
  async initializeContext(conversationId, mode, initialData = {}) {
    try {
      const baseContext = this.getBaseContext(mode);
      const context = this.mergeContextData(baseContext, initialData);
      
      // Store in database
      const { error } = await this.supabase
        .from('conversations')
        .update({
          mode_context: context,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);
      
      if (error) {
        throw new Error(`Failed to initialize context: ${error.message}`);
      }
      
      // Update cache
      this.contextCache.set(conversationId, context);
      
      return context;
      
    } catch (error) {
      console.error('Error initializing context:', error);
      return this.getBaseContext(mode);
    }
  }

  /**
   * Get the current context for a conversation
   * @param {string} conversationId - Conversation ID
   * @returns {Promise<Object>} Current context
   */
  async getContext(conversationId) {
    // Check cache first
    if (this.contextCache.has(conversationId)) {
      return this.contextCache.get(conversationId);
    }
    
    try {
      const { data, error } = await this.supabase
        .from('conversations')
        .select('mode, mode_context')
        .eq('id', conversationId)
        .single();
      
      if (error) {
        throw new Error(`Failed to get context: ${error.message}`);
      }
      
      const context = data.mode_context || this.getBaseContext(data.mode);
      
      // Update cache
      this.contextCache.set(conversationId, context);
      
      return context;
      
    } catch (error) {
      console.error('Error getting context:', error);
      return {};
    }
  }

  /**
   * Update specific context fields
   * @param {string} conversationId - Conversation ID
   * @param {Object} updates - Fields to update
   * @param {boolean} merge - Whether to merge or replace
   * @returns {Promise<Object>} Updated context
   */
  async updateContext(conversationId, updates, merge = true) {
    try {
      const currentContext = await this.getContext(conversationId);
      
      const newContext = merge 
        ? this.mergeContextData(currentContext, updates)
        : { ...currentContext, ...updates };
      
      // Add metadata
      newContext._last_updated = new Date().toISOString();
      
      // Update in database
      const { error } = await this.supabase
        .from('conversations')
        .update({
          mode_context: newContext,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);
      
      if (error) {
        throw new Error(`Failed to update context: ${error.message}`);
      }
      
      // Update cache
      this.contextCache.set(conversationId, newContext);
      
      return newContext;
      
    } catch (error) {
      console.error('Error updating context:', error);
      throw error;
    }
  }

  /**
   * Switch context when changing modes
   * @param {string} conversationId - Conversation ID
   * @param {string} fromMode - Previous mode
   * @param {string} toMode - New mode
   * @param {boolean} preserveCommon - Whether to preserve common fields
   * @returns {Promise<Object>} New context
   */
  async switchContext(conversationId, fromMode, toMode, preserveCommon = true) {
    try {
      const currentContext = await this.getContext(conversationId);
      const baseNewContext = this.getBaseContext(toMode);
      
      let newContext = baseNewContext;
      
      if (preserveCommon) {
        // Preserve common fields that might be useful across modes
        const commonFields = {
          user_preferences: currentContext.user_preferences,
          language: currentContext.language,
          timezone: currentContext.timezone,
          communication_style: currentContext.communication_style
        };
        
        newContext = {
          ...newContext,
          ...commonFields,
          _previous_mode: fromMode,
          _switched_from: currentContext
        };
      }
      
      // Store the switch in history
      newContext._mode_switches = [
        ...(currentContext._mode_switches || []),
        {
          from: fromMode,
          to: toMode,
          timestamp: new Date().toISOString(),
          preserved_common: preserveCommon
        }
      ];
      
      // Update in database
      const { error } = await this.supabase
        .from('conversations')
        .update({
          mode_context: newContext,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);
      
      if (error) {
        throw new Error(`Failed to switch context: ${error.message}`);
      }
      
      // Update cache
      this.contextCache.set(conversationId, newContext);
      
      return newContext;
      
    } catch (error) {
      console.error('Error switching context:', error);
      throw error;
    }
  }

  /**
   * Extract relevant context for a specific sub-mode
   * @param {string} conversationId - Conversation ID
   * @param {string} subMode - Sub-mode to extract for
   * @returns {Promise<Object>} Sub-mode specific context
   */
  async getSubModeContext(conversationId, subMode) {
    try {
      const fullContext = await this.getContext(conversationId);
      
      // For CMO mode, return sub-context if available
      if (fullContext.sub_contexts && fullContext.sub_contexts[subMode]) {
        return {
          ...fullContext.sub_contexts[subMode],
          business_info: fullContext.business_info,
          brand_voice: fullContext.brand_voice
        };
      }
      
      return fullContext;
      
    } catch (error) {
      console.error('Error getting sub-mode context:', error);
      return {};
    }
  }

  /**
   * Store mode-specific data
   * @param {string} conversationId - Conversation ID
   * @param {string} dataType - Type of data (e.g., 'campaign', 'booking')
   * @param {Object} data - Data to store
   * @returns {Promise<Object>} Updated context
   */
  async storeModeData(conversationId, dataType, data) {
    try {
      const context = await this.getContext(conversationId);
      
      // Determine where to store based on data type
      const updates = {};
      
      switch (dataType) {
        // Travel mode data types
        case 'booking':
          updates.bookings = [...(context.bookings || []), data];
          break;
        case 'saved_item':
          updates.saved_items = [...(context.saved_items || []), data];
          break;
          
        // CMO mode data types
        case 'campaign':
          updates.active_campaigns = [...(context.active_campaigns || []), data];
          break;
        case 'keyword':
          if (!updates.sub_contexts) updates.sub_contexts = { ...context.sub_contexts };
          if (!updates.sub_contexts.seo) updates.sub_contexts.seo = { ...context.sub_contexts?.seo };
          updates.sub_contexts.seo.target_keywords = [
            ...(context.sub_contexts?.seo?.target_keywords || []), 
            data
          ];
          break;
        case 'template':
          if (!updates.sub_contexts) updates.sub_contexts = { ...context.sub_contexts };
          if (!updates.sub_contexts.email) updates.sub_contexts.email = { ...context.sub_contexts?.email };
          updates.sub_contexts.email.templates_used = [
            ...(context.sub_contexts?.email?.templates_used || []), 
            data
          ];
          break;
          
        default:
          // Generic storage
          if (!updates.custom_data) updates.custom_data = {};
          updates.custom_data[dataType] = data;
      }
      
      return await this.updateContext(conversationId, updates);
      
    } catch (error) {
      console.error('Error storing mode data:', error);
      throw error;
    }
  }

  /**
   * Get base context schema for a mode
   * @param {string} mode - Mode name
   * @returns {Object} Base context schema
   */
  getBaseContext(mode) {
    return JSON.parse(JSON.stringify(this.contextSchemas[mode] || {}));
  }

  /**
   * Merge context data recursively
   * @param {Object} base - Base context
   * @param {Object} updates - Updates to merge
   * @returns {Object} Merged context
   */
  mergeContextData(base, updates) {
    const merged = { ...base };
    
    for (const key in updates) {
      if (updates[key] !== null && typeof updates[key] === 'object' && !Array.isArray(updates[key])) {
        // Recursively merge objects
        merged[key] = this.mergeContextData(merged[key] || {}, updates[key]);
      } else {
        // Direct assignment for primitives and arrays
        merged[key] = updates[key];
      }
    }
    
    return merged;
  }

  /**
   * Clear context cache for a conversation
   * @param {string} conversationId - Conversation ID
   */
  clearCache(conversationId) {
    this.contextCache.delete(conversationId);
  }

  /**
   * Get context summary for display
   * @param {string} conversationId - Conversation ID
   * @returns {Promise<Object>} Context summary
   */
  async getContextSummary(conversationId) {
    try {
      const context = await this.getContext(conversationId);
      const { data } = await this.supabase
        .from('conversations')
        .select('mode, sub_mode')
        .eq('id', conversationId)
        .single();
      
      const summary = {
        mode: data.mode,
        subMode: data.sub_mode,
        lastUpdated: context._last_updated
      };
      
      // Add mode-specific summary
      if (data.mode === 'travel') {
        summary.travel = {
          destination: context.destination,
          dates: context.travel_dates,
          bookingsCount: (context.bookings || []).length,
          savedItemsCount: (context.saved_items || []).length
        };
      } else if (data.mode === 'cmo') {
        summary.cmo = {
          businessName: context.business_info?.name,
          activeCampaigns: (context.active_campaigns || []).length,
          connectedAnalytics: context.analytics_connected,
          marketingGoals: context.marketing_goals || []
        };
        
        if (data.sub_mode) {
          summary.subModeData = context.sub_contexts?.[data.sub_mode] || {};
        }
      }
      
      return summary;
      
    } catch (error) {
      console.error('Error getting context summary:', error);
      return { error: error.message };
    }
  }
}

// Export singleton instance
export const modeContext = new ModeContext();
export default ModeContext;