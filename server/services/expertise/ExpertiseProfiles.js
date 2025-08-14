/**
 * ExpertiseProfiles - Granular expertise tracking system
 * Manages detailed user profiles with channel-specific expertise levels
 */

import { SupabaseDatabaseService } from '../db/SupabaseDatabaseService.js';

class ExpertiseProfiles {
  constructor() {
    this.db = new SupabaseDatabaseService();
    
    // Channel mapping for topics
    this.topicChannelMap = {
      // SEO topics
      'seo': 'seo',
      'keyword-research': 'seo',
      'on-page-seo': 'seo',
      'technical-seo': 'seo',
      'link-building': 'seo',
      'local-seo': 'seo',
      'title-tags': 'seo',
      'meta-descriptions': 'seo',
      'search-rankings': 'seo',
      
      // Email Marketing topics
      'email': 'email',
      'email-campaigns': 'email',
      'email-automation': 'email',
      'email-segmentation': 'email',
      'email-design': 'email',
      'subject-lines': 'email',
      'deliverability': 'email',
      'email-analytics': 'email',
      'drip-campaigns': 'email',
      
      // Social Media topics
      'social': 'social',
      'social-media': 'social',
      'content-strategy': 'social',
      'social-advertising': 'social',
      'community-management': 'social',
      'influencer-marketing': 'social',
      'social-analytics': 'social',
      'user-generated-content': 'social',
      'brand-awareness': 'social',
      
      // PPC topics
      'ppc': 'ppc',
      'google-ads': 'ppc',
      'facebook-ads': 'ppc',
      'paid-search': 'ppc',
      'display-advertising': 'ppc',
      'campaign-optimization': 'ppc',
      'bid-management': 'ppc',
      'ad-copy': 'ppc',
      'landing-pages': 'ppc',
      
      // Content Marketing topics
      'content': 'content',
      'content-marketing': 'content',
      'blog-strategy': 'content',
      'video-marketing': 'content',
      'content-creation': 'content',
      'storytelling': 'content',
      'content-distribution': 'content',
      'editorial-calendar': 'content',
      
      // Analytics topics
      'analytics': 'analytics',
      'google-analytics': 'analytics',
      'conversion-tracking': 'analytics',
      'attribution-modeling': 'analytics',
      'data-analysis': 'analytics',
      'reporting': 'analytics',
      'kpis': 'analytics',
      'roi-measurement': 'analytics',
      
      // CRO topics
      'cro': 'cro',
      'conversion-optimization': 'cro',
      'ab-testing': 'cro',
      'user-experience': 'cro',
      'funnel-optimization': 'cro',
      'website-optimization': 'cro'
    };
    
    // Learning styles and preferences
    this.learningStyles = {
      visual: {
        preferences: ['charts', 'infographics', 'diagrams', 'screenshots'],
        communication: 'Include visual examples and step-by-step screenshots'
      },
      auditory: {
        preferences: ['explanations', 'discussions', 'podcasts', 'webinars'],
        communication: 'Provide detailed verbal explanations and analogies'
      },
      kinesthetic: {
        preferences: ['hands-on', 'practice', 'tutorials', 'workshops'],
        communication: 'Focus on actionable steps and practical exercises'
      },
      reading: {
        preferences: ['documentation', 'articles', 'guides', 'checklists'],
        communication: 'Provide comprehensive written resources and lists'
      }
    };
    
    // Industry-specific knowledge areas
    this.industries = {
      ecommerce: ['product-listings', 'shopping-ads', 'cart-abandonment', 'product-feeds'],
      saas: ['trial-optimization', 'churn-reduction', 'feature-adoption', 'subscription-metrics'],
      b2b: ['lead-generation', 'account-based-marketing', 'sales-enablement', 'pipeline-optimization'],
      healthcare: ['hipaa-compliance', 'patient-acquisition', 'medical-seo', 'healthcare-advertising'],
      finance: ['regulatory-compliance', 'trust-building', 'financial-education', 'security-messaging'],
      education: ['student-acquisition', 'course-promotion', 'educational-content', 'retention-strategies'],
      retail: ['seasonal-campaigns', 'inventory-marketing', 'local-advertising', 'customer-loyalty'],
      technology: ['technical-content', 'developer-marketing', 'product-launches', 'thought-leadership']
    };
    
    // Marketing tools categorized by function
    this.marketingTools = {
      analytics: ['google-analytics', 'adobe-analytics', 'mixpanel', 'hotjar', 'crazy-egg'],
      email: ['mailchimp', 'constant-contact', 'hubspot', 'klaviyo', 'sendgrid', 'campaign-monitor'],
      seo: ['semrush', 'ahrefs', 'moz', 'screaming-frog', 'google-search-console', 'yoast'],
      social: ['hootsuite', 'buffer', 'sprout-social', 'later', 'facebook-business-manager'],
      ppc: ['google-ads', 'facebook-ads-manager', 'microsoft-advertising', 'optmyzr', 'wordstream'],
      content: ['wordpress', 'hubspot-cms', 'canva', 'adobe-creative-suite', 'grammarly'],
      automation: ['zapier', 'ifttt', 'microsoft-power-automate', 'hubspot-workflows'],
      crm: ['salesforce', 'hubspot-crm', 'pipedrive', 'zoho', 'monday.com']
    };
  }

  /**
   * Create detailed expertise profile from assessment
   */
  async createDetailedProfile(userId, assessment) {
    try {
      const profile = {
        user_id: userId,
        overall_level: assessment.level || 'beginner',
        overall_confidence: assessment.confidence || 0.5,
        
        // Channel-specific expertise (derived from assessment areas)
        channel_expertise: this.deriveChannelExpertise(assessment),
        
        // Learning preferences
        preferred_learning_style: this.detectLearningStyle(assessment),
        technical_comfort: this.assessTechnicalComfort(assessment),
        
        // Industry and tool experience
        industry_experience: assessment.industries || [],
        tools_familiar: assessment.tools || [],
        
        // Goals and focus areas
        goals: assessment.goals || [],
        priority_channels: this.identifyPriorityChannels(assessment),
        
        // Behavioral patterns
        learning_pace: this.assessLearningPace(assessment),
        detail_preference: this.assessDetailPreference(assessment),
        
        // Metadata
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        profile_version: '1.0'
      };
      
      // Store profile in database
      await this.saveProfile(userId, profile);
      
      return profile;
    } catch (error) {
      console.error('Error creating detailed profile:', error);
      throw error;
    }
  }

  /**
   * Derive channel-specific expertise from assessment
   */
  deriveChannelExpertise(assessment) {
    const channels = {
      seo: { level: 1, confidence: 0.5, last_interaction: null },
      email: { level: 1, confidence: 0.5, last_interaction: null },
      social: { level: 1, confidence: 0.5, last_interaction: null },
      ppc: { level: 1, confidence: 0.5, last_interaction: null },
      content: { level: 1, confidence: 0.5, last_interaction: null },
      analytics: { level: 1, confidence: 0.5, last_interaction: null },
      cro: { level: 1, confidence: 0.5, last_interaction: null }
    };
    
    // Convert overall level to numeric
    const levelMap = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
    const baseLevel = levelMap[assessment.level] || 1;
    
    // Apply assessment-specific knowledge to channels
    if (assessment.areas) {
      Object.entries(assessment.areas).forEach(([area, data]) => {
        const channel = this.mapTopicToChannel(area);
        if (channels[channel]) {
          // Adjust channel level based on area performance
          const areaScore = data.score || 0.5;
          const adjustedLevel = Math.max(1, Math.min(4, 
            Math.round(baseLevel + (areaScore - 0.5) * 2)
          ));
          
          channels[channel].level = adjustedLevel;
          channels[channel].confidence = Math.min(0.9, data.confidence || 0.5);
        }
      });
    }
    
    return channels;
  }

  /**
   * Detect learning style from assessment responses
   */
  detectLearningStyle(assessment) {
    // Default to visual if no clear preference
    if (assessment.learningStyle) {
      return assessment.learningStyle;
    }
    
    // Analyze assessment patterns to infer style
    const patterns = assessment.patterns || {};
    
    if (patterns.prefersExamples) return 'visual';
    if (patterns.asksDetailedQuestions) return 'reading';
    if (patterns.wantsStepByStep) return 'kinesthetic';
    if (patterns.likesExplanations) return 'auditory';
    
    return 'visual'; // Default
  }

  /**
   * Assess technical comfort level
   */
  assessTechnicalComfort(assessment) {
    let comfort = 0.5; // Default medium comfort
    
    // Increase for technical tools/experience
    const technicalTools = ['google-analytics', 'google-tag-manager', 'zapier', 'apis'];
    const userTools = assessment.tools || [];
    const techToolCount = userTools.filter(tool => technicalTools.includes(tool)).length;
    
    comfort += (techToolCount / technicalTools.length) * 0.3;
    
    // Adjust based on overall level
    const levelBonus = { beginner: 0, intermediate: 0.1, advanced: 0.2, expert: 0.3 };
    comfort += levelBonus[assessment.level] || 0;
    
    return Math.min(1.0, comfort);
  }

  /**
   * Identify priority channels based on goals
   */
  identifyPriorityChannels(assessment) {
    const goals = assessment.goals || [];
    const priorities = [];
    
    const goalChannelMap = {
      'increase-traffic': ['seo', 'content', 'social'],
      'improve-conversions': ['cro', 'ppc', 'email'],
      'brand-awareness': ['social', 'content', 'ppc'],
      'lead-generation': ['ppc', 'content', 'email'],
      'customer-retention': ['email', 'social', 'cro'],
      'sales-growth': ['ppc', 'cro', 'email']
    };
    
    goals.forEach(goal => {
      if (goalChannelMap[goal]) {
        priorities.push(...goalChannelMap[goal]);
      }
    });
    
    // Return unique priorities, sorted by frequency
    const priorityCount = {};
    priorities.forEach(channel => {
      priorityCount[channel] = (priorityCount[channel] || 0) + 1;
    });
    
    return Object.entries(priorityCount)
      .sort(([,a], [,b]) => b - a)
      .map(([channel]) => channel)
      .slice(0, 3);
  }

  /**
   * Assess learning pace preference
   */
  assessLearningPace(assessment) {
    if (assessment.pace) return assessment.pace;
    
    // Infer from experience level
    const paceMap = {
      beginner: 'slow',
      intermediate: 'medium', 
      advanced: 'fast',
      expert: 'fast'
    };
    
    return paceMap[assessment.level] || 'medium';
  }

  /**
   * Assess detail preference level
   */
  assessDetailPreference(assessment) {
    if (assessment.detailLevel) return assessment.detailLevel;
    
    // Infer from technical comfort and level
    const comfort = this.assessTechnicalComfort(assessment);
    const levelDetail = { beginner: 0.3, intermediate: 0.6, advanced: 0.8, expert: 0.9 };
    
    const detailScore = (comfort + (levelDetail[assessment.level] || 0.5)) / 2;
    
    if (detailScore < 0.4) return 'high-level';
    if (detailScore < 0.7) return 'balanced';
    return 'detailed';
  }

  /**
   * Get expertise level for specific topic
   */
  async getTopicExpertise(userId, topic) {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) {
        return { level: 1, confidence: 0.5, source: 'default' };
      }
      
      const channel = this.mapTopicToChannel(topic);
      const channelExpertise = profile.channel_expertise?.[channel];
      
      if (channelExpertise) {
        return {
          level: channelExpertise.level,
          confidence: channelExpertise.confidence,
          source: 'channel-specific',
          channel,
          last_interaction: channelExpertise.last_interaction
        };
      }
      
      // Fall back to overall level
      const levelMap = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
      return {
        level: levelMap[profile.overall_level] || 1,
        confidence: profile.overall_confidence || 0.5,
        source: 'overall-level'
      };
    } catch (error) {
      console.error('Error getting topic expertise:', error);
      return { level: 1, confidence: 0.5, source: 'error-fallback' };
    }
  }

  /**
   * Map topic to marketing channel
   */
  mapTopicToChannel(topic) {
    const normalizedTopic = topic.toLowerCase().replace(/[_\s-]+/g, '-');
    return this.topicChannelMap[normalizedTopic] || 'general';
  }

  /**
   * Update channel expertise based on interaction
   */
  async updateChannelExpertise(userId, topic, interactionData) {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) return false;
      
      const channel = this.mapTopicToChannel(topic);
      if (!profile.channel_expertise[channel]) {
        profile.channel_expertise[channel] = { level: 1, confidence: 0.5 };
      }
      
      const channelData = profile.channel_expertise[channel];
      
      // Update based on interaction success/confusion
      if (interactionData.success) {
        channelData.confidence = Math.min(0.95, channelData.confidence + 0.05);
        
        // Potentially increase level if high confidence
        if (channelData.confidence > 0.8 && channelData.level < 4) {
          channelData.level += 0.1; // Gradual increase
        }
      } else if (interactionData.confusion) {
        channelData.confidence = Math.max(0.1, channelData.confidence - 0.1);
        
        // Potentially decrease level if low confidence
        if (channelData.confidence < 0.3 && channelData.level > 1) {
          channelData.level = Math.max(1, channelData.level - 0.1);
        }
      }
      
      // Round level to nearest 0.5
      channelData.level = Math.round(channelData.level * 2) / 2;
      channelData.last_interaction = new Date().toISOString();
      
      // Update profile
      profile.last_updated = new Date().toISOString();
      await this.saveProfile(userId, profile);
      
      return true;
    } catch (error) {
      console.error('Error updating channel expertise:', error);
      return false;
    }
  }

  /**
   * Get personalized communication preferences
   */
  async getCommunicationPreferences(userId) {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) {
        return this.getDefaultCommunicationPreferences();
      }
      
      const learningStyle = this.learningStyles[profile.preferred_learning_style] || 
                           this.learningStyles.visual;
      
      return {
        learning_style: profile.preferred_learning_style,
        communication_approach: learningStyle.communication,
        technical_level: profile.technical_comfort,
        detail_preference: profile.detail_preference,
        pace: profile.learning_pace,
        preferred_examples: this.getPreferredExamples(profile),
        industry_context: profile.industry_experience,
        tool_references: profile.tools_familiar
      };
    } catch (error) {
      console.error('Error getting communication preferences:', error);
      return this.getDefaultCommunicationPreferences();
    }
  }

  /**
   * Get preferred examples based on industry and tools
   */
  getPreferredExamples(profile) {
    const examples = [];
    
    // Add industry-specific examples
    profile.industry_experience?.forEach(industry => {
      if (this.industries[industry]) {
        examples.push(`${industry}-specific scenarios`);
      }
    });
    
    // Add tool-specific examples
    profile.tools_familiar?.forEach(tool => {
      examples.push(`${tool} examples`);
    });
    
    return examples.slice(0, 3); // Limit to top 3
  }

  /**
   * Get channel-specific learning recommendations
   */
  async getChannelRecommendations(userId) {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) return [];
      
      const recommendations = [];
      const channels = profile.channel_expertise || {};
      
      // Identify weak channels for improvement
      Object.entries(channels).forEach(([channel, data]) => {
        if (data.level < 2 || data.confidence < 0.6) {
          recommendations.push({
            type: 'improvement',
            channel,
            current_level: data.level,
            confidence: data.confidence,
            recommendation: `Focus on ${channel} fundamentals to build confidence`,
            priority: data.level < 1.5 ? 'high' : 'medium'
          });
        }
      });
      
      // Identify strong channels for advancement
      Object.entries(channels).forEach(([channel, data]) => {
        if (data.level >= 3 && data.confidence > 0.8) {
          recommendations.push({
            type: 'advancement',
            channel,
            current_level: data.level,
            confidence: data.confidence,
            recommendation: `Ready for advanced ${channel} strategies and tactics`,
            priority: 'low'
          });
        }
      });
      
      // Sort by priority
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return recommendations.sort((a, b) => 
        priorityOrder[b.priority] - priorityOrder[a.priority]
      );
    } catch (error) {
      console.error('Error getting channel recommendations:', error);
      return [];
    }
  }

  /**
   * Save profile to database
   */
  async saveProfile(userId, profile) {
    try {
      const { error } = await this.db.supabase
        .from('user_expertise_profiles')
        .upsert({
          user_id: userId,
          profile_data: profile,
          updated_at: new Date().toISOString()
        });
        
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error saving profile:', error);
      // Continue without throwing to prevent blocking user experience
      return false;
    }
  }

  /**
   * Get user profile from database
   */
  async getUserProfile(userId) {
    try {
      const { data, error } = await this.db.supabase
        .from('user_expertise_profiles')
        .select('profile_data')
        .eq('user_id', userId)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No profile found
        }
        throw error;
      }
      
      return data?.profile_data;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  /**
   * Get default communication preferences
   */
  getDefaultCommunicationPreferences() {
    return {
      learning_style: 'visual',
      communication_approach: 'Include visual examples and step-by-step screenshots',
      technical_level: 0.5,
      detail_preference: 'balanced',
      pace: 'medium',
      preferred_examples: ['general business scenarios'],
      industry_context: [],
      tool_references: []
    };
  }

  /**
   * Get expertise summary for user
   */
  async getExpertiseSummary(userId) {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) {
        return {
          overall_level: 'beginner',
          strongest_channels: [],
          weakest_channels: [],
          learning_style: 'visual',
          recommendations_count: 0
        };
      }
      
      const channels = profile.channel_expertise || {};
      
      // Find strongest and weakest channels
      const channelScores = Object.entries(channels).map(([channel, data]) => ({
        channel,
        score: data.level * data.confidence,
        level: data.level,
        confidence: data.confidence
      }));
      
      channelScores.sort((a, b) => b.score - a.score);
      
      const strongest = channelScores.slice(0, 2).map(c => ({
        channel: c.channel,
        level: c.level,
        confidence: c.confidence
      }));
      
      const weakest = channelScores.slice(-2).map(c => ({
        channel: c.channel,
        level: c.level,
        confidence: c.confidence
      }));
      
      const recommendations = await this.getChannelRecommendations(userId);
      
      return {
        overall_level: profile.overall_level,
        strongest_channels: strongest,
        weakest_channels: weakest.reverse(), // Show weakest first
        learning_style: profile.preferred_learning_style,
        technical_comfort: profile.technical_comfort,
        industry_experience: profile.industry_experience,
        recommendations_count: recommendations.length,
        last_updated: profile.last_updated
      };
    } catch (error) {
      console.error('Error getting expertise summary:', error);
      throw error;
    }
  }
}

export default ExpertiseProfiles;