/**
 * ModeManager - Handles mode detection, switching, and preferences
 * 
 * Manages the different operational modes of Tala AI (travel, CMO)
 * and provides intelligent mode detection based on user messages.
 */

import { getSupabaseService } from '../db/sharedDatabase.js';

class ModeManager {
  constructor() {
    this.supabase = getSupabaseService();
    
    // Mode detection keywords and patterns
    this.modePatterns = {
      cmo: {
        keywords: [
          'marketing', 'campaign', 'seo', 'email marketing', 'social media',
          'advertising', 'google ads', 'facebook ads', 'content marketing',
          'brand', 'conversion', 'analytics', 'roi', 'lead generation',
          'sales funnel', 'customer acquisition', 'engagement rate',
          'click through rate', 'ctr', 'open rate', 'bounce rate',
          'meta description', 'title tag', 'keyword research',
          'competitor analysis', 'market research', 'target audience',
          'a/b test', 'landing page', 'call to action', 'cta',
          'influencer', 'hashtag', 'viral', 'organic reach',
          'paid ads', 'ppc', 'cpc', 'impressions', 'reach',
          'brand awareness', 'customer journey', 'touchpoint'
        ],
        patterns: [
          /write.*(?:email|subject|headline|copy|content)/i,
          /create.*(?:campaign|ad|post|content)/i,
          /analyze.*(?:competitor|market|performance|metrics)/i,
          /improve.*(?:seo|ranking|conversion|engagement)/i,
          /optimize.*(?:campaign|website|content|ads)/i,
          /track.*(?:performance|metrics|roi|conversion)/i
        ],
        subModes: {
          seo: ['seo', 'search engine', 'ranking', 'keyword', 'backlink', 'serp', 'meta', 'title tag'],
          email: ['email', 'newsletter', 'subject line', 'open rate', 'deliverability', 'spam', 'subscriber'],
          social: ['social media', 'instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'post', 'hashtag'],
          directMail: ['direct mail', 'postcard', 'mailer', 'print', 'usps', 'postal'],
          ads: ['google ads', 'facebook ads', 'ppc', 'paid', 'campaign', 'ad copy', 'bidding']
        }
      },
      travel: {
        keywords: [
          'travel', 'trip', 'flight', 'hotel', 'booking', 'vacation',
          'destination', 'itinerary', 'passport', 'visa', 'luggage',
          'airport', 'airline', 'cruise', 'tour', 'reservation',
          'check-in', 'boarding', 'departure', 'arrival', 'layover',
          'accommodation', 'resort', 'airbnb', 'hostel', 'rental car',
          'train', 'bus', 'transportation', 'tourist', 'sightseeing',
          'restaurant', 'local food', 'currency', 'exchange rate',
          'travel insurance', 'packing', 'weather', 'time zone'
        ],
        patterns: [
          /book.*(?:flight|hotel|trip|vacation)/i,
          /plan.*(?:trip|vacation|itinerary|travel)/i,
          /find.*(?:flight|hotel|restaurant|activity)/i,
          /need.*(?:visa|passport|insurance)/i,
          /best.*(?:time|place|destination|hotel)/i
        ]
      }
    };
    
    // Cache for user preferences
    this.userPreferencesCache = new Map();
  }

  /**
   * Detect the appropriate mode based on message content
   * @param {string} message - User's message
   * @param {Object} currentContext - Current conversation context
   * @returns {Object} Detected mode info { mode, subMode, confidence }
   */
  detectMode(message, currentContext = {}) {
    const messageLower = message.toLowerCase();
    const scores = {
      travel: 0,
      cmo: 0
    };
    
    // Check for explicit mode switches
    if (messageLower.includes('switch to marketing') || messageLower.includes('cmo mode')) {
      return { mode: 'cmo', subMode: null, confidence: 1.0, explicit: true };
    }
    if (messageLower.includes('switch to travel') || messageLower.includes('travel mode')) {
      return { mode: 'travel', subMode: null, confidence: 1.0, explicit: true };
    }
    
    // Score based on keywords
    for (const [mode, config] of Object.entries(this.modePatterns)) {
      // Check keywords
      for (const keyword of config.keywords) {
        if (messageLower.includes(keyword)) {
          scores[mode] += 2;
        }
      }
      
      // Check patterns
      for (const pattern of config.patterns) {
        if (pattern.test(message)) {
          scores[mode] += 3;
        }
      }
    }
    
    // Detect sub-mode for CMO
    let detectedSubMode = null;
    if (scores.cmo > 0) {
      for (const [subMode, keywords] of Object.entries(this.modePatterns.cmo.subModes)) {
        for (const keyword of keywords) {
          if (messageLower.includes(keyword)) {
            detectedSubMode = subMode;
            scores.cmo += 1; // Boost CMO score when sub-mode detected
            break;
          }
        }
        if (detectedSubMode) break;
      }
    }
    
    // Consider current context
    if (currentContext.mode) {
      scores[currentContext.mode] += 3; // Bias towards current mode
    }
    
    // Determine winner
    const totalScore = scores.travel + scores.cmo;
    if (totalScore === 0) {
      // No clear signals, use current mode or default
      return {
        mode: currentContext.mode || 'travel',
        subMode: currentContext.subMode || null,
        confidence: 0.3,
        reason: 'no_clear_signals'
      };
    }
    
    const winningMode = scores.cmo > scores.travel ? 'cmo' : 'travel';
    const confidence = scores[winningMode] / totalScore;
    
    return {
      mode: winningMode,
      subMode: winningMode === 'cmo' ? detectedSubMode : null,
      confidence: confidence,
      scores: scores,
      reason: 'keyword_match'
    };
  }

  /**
   * Switch the mode for a user/conversation
   * @param {string} userId - User ID
   * @param {string} conversationId - Conversation ID
   * @param {string} newMode - New mode to switch to
   * @param {string} subMode - Optional sub-mode
   * @returns {Promise<Object>} Switch result
   */
  async switchMode(userId, conversationId, newMode, subMode = null) {
    try {
      // Validate mode
      const validModes = ['travel', 'cmo'];
      if (!validModes.includes(newMode)) {
        throw new Error(`Invalid mode: ${newMode}`);
      }
      
      // Get current conversation state
      const { data: conversation, error: fetchError } = await this.supabase
        .from('conversations')
        .select('mode, sub_mode, mode_context')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .single();
      
      if (fetchError) {
        throw new Error(`Failed to fetch conversation: ${fetchError.message}`);
      }
      
      // Prepare mode context update
      const modeHistory = conversation.mode_context?.mode_history || [];
      modeHistory.push({
        from_mode: conversation.mode,
        from_sub_mode: conversation.sub_mode,
        to_mode: newMode,
        to_sub_mode: subMode,
        switched_at: new Date().toISOString(),
        switched_by: 'user'
      });
      
      // Update conversation
      const { data: updated, error: updateError } = await this.supabase
        .from('conversations')
        .update({
          mode: newMode,
          sub_mode: subMode,
          mode_context: {
            ...conversation.mode_context,
            mode_history: modeHistory,
            last_switch: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (updateError) {
        throw new Error(`Failed to update mode: ${updateError.message}`);
      }
      
      // Log the switch in quick actions
      await this.logQuickAction(userId, 'mode_switch', {
        conversation_id: conversationId,
        from_mode: conversation.mode,
        to_mode: newMode,
        sub_mode: subMode
      });
      
      return {
        success: true,
        previousMode: conversation.mode,
        newMode: newMode,
        subMode: subMode,
        conversation: updated
      };
      
    } catch (error) {
      console.error('Error switching mode:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get mode context for a conversation
   * @param {string} conversationId - Conversation ID
   * @returns {Promise<Object>} Mode context
   */
  async getModeContext(conversationId) {
    try {
      const { data, error } = await this.supabase
        .from('conversations')
        .select('mode, sub_mode, mode_context')
        .eq('id', conversationId)
        .single();
      
      if (error) {
        throw new Error(`Failed to get mode context: ${error.message}`);
      }
      
      return {
        mode: data.mode || 'travel',
        subMode: data.sub_mode,
        context: data.mode_context || {},
        history: data.mode_context?.mode_history || []
      };
      
    } catch (error) {
      console.error('Error getting mode context:', error);
      return {
        mode: 'travel',
        subMode: null,
        context: {},
        history: []
      };
    }
  }

  /**
   * Save user mode preferences
   * @param {string} userId - User ID
   * @param {Object} preferences - Preferences to save
   * @returns {Promise<Object>} Save result
   */
  async saveModePreference(userId, preferences) {
    try {
      // Get current user preferences
      const { data: user, error: fetchError } = await this.supabase
        .from('users')
        .select('user_preferences')
        .eq('id', userId)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        throw new Error(`Failed to fetch user: ${fetchError.message}`);
      }
      
      const currentPrefs = user?.user_preferences || { default_mode: 'travel', mode_settings: {} };
      const updatedPrefs = {
        ...currentPrefs,
        ...preferences,
        mode_settings: {
          ...currentPrefs.mode_settings,
          ...(preferences.mode_settings || {})
        },
        updated_at: new Date().toISOString()
      };
      
      // Update or insert user preferences
      const { error: upsertError } = await this.supabase
        .from('users')
        .upsert({
          id: userId,
          user_preferences: updatedPrefs,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });
      
      if (upsertError) {
        throw new Error(`Failed to save preferences: ${upsertError.message}`);
      }
      
      // Update cache
      this.userPreferencesCache.set(userId, updatedPrefs);
      
      return {
        success: true,
        preferences: updatedPrefs
      };
      
    } catch (error) {
      console.error('Error saving mode preferences:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get user's default mode preference
   * @param {string} userId - User ID
   * @returns {Promise<string>} Default mode
   */
  async getUserDefaultMode(userId) {
    // Check cache first
    if (this.userPreferencesCache.has(userId)) {
      return this.userPreferencesCache.get(userId).default_mode || 'travel';
    }
    
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('user_preferences')
        .eq('id', userId)
        .single();
      
      if (error || !data) {
        return 'travel'; // Default
      }
      
      const preferences = data.user_preferences || {};
      this.userPreferencesCache.set(userId, preferences);
      
      return preferences.default_mode || 'travel';
      
    } catch (error) {
      console.error('Error getting user default mode:', error);
      return 'travel';
    }
  }

  /**
   * Log a quick action for analytics
   * @param {string} userId - User ID
   * @param {string} action - Action name
   * @param {Object} context - Action context
   */
  async logQuickAction(userId, action, context = {}) {
    try {
      await this.supabase
        .from('quick_actions_history')
        .insert({
          user_id: userId,
          action: action,
          mode: context.mode || 'travel',
          sub_mode: context.sub_mode,
          context: context,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging quick action:', error);
    }
  }

  /**
   * Get mode-specific greeting
   * @param {string} mode - Current mode
   * @param {string} subMode - Current sub-mode
   * @returns {string} Greeting message
   */
  getModeGreeting(mode, subMode = null) {
    const greetings = {
      travel: [
        "Where shall we explore today?",
        "Ready for your next adventure?",
        "How can I help with your travel plans?",
        "Let's plan your perfect trip!"
      ],
      cmo: {
        default: [
          "Ready to grow your business?",
          "How can I help with your marketing today?",
          "Let's boost your marketing performance!",
          "What marketing challenge can I help you solve?"
        ],
        seo: [
          "Let's improve your search rankings!",
          "Ready to optimize your SEO?",
          "How can I help boost your visibility?"
        ],
        email: [
          "Let's craft compelling email campaigns!",
          "Ready to boost your email engagement?",
          "How can I help with your email marketing?"
        ],
        social: [
          "Let's create engaging social content!",
          "Ready to grow your social presence?",
          "How can I help with your social media?"
        ],
        ads: [
          "Let's optimize your ad campaigns!",
          "Ready to improve your ROAS?",
          "How can I help with your paid advertising?"
        ]
      }
    };
    
    if (mode === 'cmo' && subMode && greetings.cmo[subMode]) {
      const options = greetings.cmo[subMode];
      return options[Math.floor(Math.random() * options.length)];
    }
    
    const options = mode === 'cmo' ? greetings.cmo.default : greetings[mode];
    return options[Math.floor(Math.random() * options.length)];
  }
}

// Export singleton instance
export const modeManager = new ModeManager();
export default ModeManager;