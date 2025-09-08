/**
 * AdaptationStage - Adapts responses based on user expertise and preferences
 * 
 * Final personalization stage that adjusts language complexity, detail level,
 * and presentation based on user profile.
 */

import { Stage } from '../Stage.js';
import { CMOResponse } from '../CMOResponse.js';

export class AdaptationStage extends Stage {
  constructor(communicationAdapter, expertiseProfiles, options = {}) {
    super('AdaptationStage', options);
    this.communicationAdapter = communicationAdapter;
    this.expertiseProfiles = expertiseProfiles;
  }

  async shouldProcess(input, context) {
    // Skip if no user context
    if (!context.userId) {
      this.log('debug', 'No user context, skipping adaptation');
      return false;
    }
    
    // Skip if already adapted
    if (input.metadata.adapted) {
      this.log('debug', 'Already adapted, skipping');
      return false;
    }
    
    return true;
  }

  async process(input, context) {
    const startTime = Date.now();
    
    try {
      // Get user expertise profile
      const expertise = await this.expertiseProfiles.getUserProfile(context.userId);
      const channelExpertise = await this.expertiseProfiles.getTopicExpertise(
        context.userId, 
        context.detected?.channel || 'general'
      );
      
      this.log('info', 'Adapting for user', {
        level: expertise?.level || 'beginner',
        channelConfidence: channelExpertise?.confidence || 0
      });
      
      // Adapt content based on expertise
      let adapted = await this.adaptContent(input, expertise, channelExpertise, context);
      
      // Adapt structure and UI elements
      adapted = await this.adaptStructure(adapted, expertise, context);
      
      // Add personalized elements
      adapted = await this.addPersonalization(adapted, expertise, context);
      
      // Mark as adapted
      adapted = adapted.withUI({
        adaptation: {
          level: expertise?.level || 'beginner',
          style: expertise?.preferences?.communication_style || 'balanced',
          adapted: true
        }
      });
      
      this.metrics.processed++;
      this.metrics.totalTime += Date.now() - startTime;
      
      return adapted;
      
    } catch (error) {
      this.log('error', 'Adaptation failed', error);
      this.metrics.errors++;
      return input;
    }
  }

  /**
   * Adapt content based on expertise
   */
  async adaptContent(input, expertise, channelExpertise, context) {
    const level = expertise?.level || 'beginner';
    const style = expertise?.preferences?.communication_style || 'balanced';
    
    // Use communication adapter for main content
    const adaptedContent = await this.communicationAdapter.adaptResponse(
      input.content,
      level,
      {
        topic: context.detected?.channel,
        channelExpertise: channelExpertise?.confidence || 0,
        learningStyle: expertise?.learning_style,
        technicalComfort: expertise?.technical_comfort || 0.5,
        industryContext: expertise?.industry_experience,
        communicationPrefs: expertise?.preferences
      }
    );
    
    return input.withContent(adaptedContent);
  }

  /**
   * Adapt structure based on expertise
   */
  async adaptStructure(input, expertise, context) {
    const level = expertise?.level || 'beginner';
    let adapted = input;
    
    // Simplify metrics for beginners
    if (level === 'beginner' && input.structured.metrics) {
      const simplified = this.simplifyMetrics(input.structured.metrics);
      adapted = adapted.withStructured(s => ({
        ...s,
        metrics: simplified,
        originalMetrics: s.metrics
      }));
    }
    
    // Add explanations for intermediate users
    if (level === 'intermediate' && input.structured.recommendations) {
      const explained = this.addExplanations(input.structured.recommendations);
      adapted = adapted.withStructured(s => ({
        ...s,
        recommendations: explained
      }));
    }
    
    // Add advanced options for experts
    if (level === 'advanced') {
      adapted = adapted.withStructured(s => ({
        ...s,
        advancedOptions: this.getAdvancedOptions(context)
      }));
    }
    
    return adapted;
  }

  /**
   * Add personalized elements
   */
  async addPersonalization(input, expertise, context) {
    let personalized = input;
    
    // Add learning recommendations
    if (expertise && expertise.level !== 'advanced') {
      const learningRecs = await this.getLearningRecommendations(
        expertise,
        context.detected?.channel
      );
      
      if (learningRecs.length > 0) {
        personalized = personalized.withUI({
          learningRecommendations: learningRecs
        });
      }
    }
    
    // Add relevant tools based on familiarity
    if (expertise?.tools_familiar) {
      const relevantTools = this.getRelevantTools(
        expertise.tools_familiar,
        context.detected?.channel
      );
      
      if (relevantTools.length > 0) {
        personalized = personalized.withUI({
          suggestedTools: relevantTools
        });
      }
    }
    
    // Add quick wins for beginners
    if (expertise?.level === 'beginner') {
      const quickWins = this.getQuickWins(context.detected?.channel);
      if (quickWins.length > 0) {
        personalized = personalized.withUI({
          quickWins: quickWins
        });
      }
    }
    
    return personalized;
  }

  /**
   * Simplify metrics for beginners
   */
  simplifyMetrics(metrics) {
    const simplified = {};
    
    Object.entries(metrics).forEach(([key, value]) => {
      // Convert to plain language
      const simplifiedKey = this.simplifyMetricName(key);
      
      // Add context to numbers
      if (typeof value === 'string' && value.includes('%')) {
        const num = parseFloat(value);
        let context = '';
        
        if (key.toLowerCase().includes('rate')) {
          context = num > 5 ? ' (very good!)' : num > 2 ? ' (good)' : ' (needs improvement)';
        }
        
        simplified[simplifiedKey] = value + context;
      } else {
        simplified[simplifiedKey] = value;
      }
    });
    
    return simplified;
  }

  /**
   * Simplify metric names
   */
  simplifyMetricName(name) {
    const replacements = {
      'ROI': 'Return on Investment',
      'CTR': 'Click-Through Rate',
      'CPC': 'Cost Per Click',
      'CPM': 'Cost Per Thousand Impressions',
      'CPA': 'Cost Per Acquisition'
    };
    
    return replacements[name] || name.replace(/([A-Z])/g, ' $1').trim();
  }

  /**
   * Add explanations to recommendations
   */
  addExplanations(recommendations) {
    if (!Array.isArray(recommendations)) return recommendations;
    
    return recommendations.map(rec => {
      if (typeof rec === 'string') {
        // Add simple explanation
        const explanation = this.getRecommendationExplanation(rec);
        return {
          text: rec,
          explanation: explanation
        };
      }
      return rec;
    });
  }

  /**
   * Get explanation for recommendation
   */
  getRecommendationExplanation(recommendation) {
    // Simple pattern matching for common recommendations
    if (recommendation.includes('A/B test')) {
      return 'A/B testing helps you compare two versions to see which performs better';
    }
    if (recommendation.includes('segment')) {
      return 'Segmentation allows you to target specific groups with tailored messages';
    }
    if (recommendation.includes('personalize')) {
      return 'Personalization increases engagement by making content relevant to each recipient';
    }
    return null;
  }

  /**
   * Get advanced options
   */
  getAdvancedOptions(context) {
    const options = [];
    
    if (context.detected?.channel === 'direct_mail') {
      options.push({
        option: 'Variable Data Printing',
        description: 'Customize each piece with recipient-specific data'
      });
      options.push({
        option: 'Predictive Modeling',
        description: 'Use data science to optimize targeting'
      });
    }
    
    return options;
  }

  /**
   * Get learning recommendations
   */
  async getLearningRecommendations(expertise, channel) {
    const recommendations = [];
    
    if (expertise.level === 'beginner') {
      recommendations.push({
        title: `Introduction to ${this.formatChannelName(channel)}`,
        type: 'course',
        duration: '30 minutes'
      });
    }
    
    if (expertise.gaps?.length > 0) {
      expertise.gaps.slice(0, 2).forEach(gap => {
        recommendations.push({
          title: `Improve your ${gap} skills`,
          type: 'tutorial',
          relevance: 'high'
        });
      });
    }
    
    return recommendations;
  }

  /**
   * Get relevant tools
   */
  getRelevantTools(familiarTools, channel) {
    // Map of tools by channel
    const toolsByChannel = {
      direct_mail: ['Canva', 'USPS Every Door Direct', 'Vistaprint'],
      email: ['Mailchimp', 'ConvertKit', 'Klaviyo'],
      social: ['Hootsuite', 'Buffer', 'Canva']
    };
    
    const channelTools = toolsByChannel[channel] || [];
    
    // Filter to tools user knows
    return channelTools
      .filter(tool => familiarTools.includes(tool))
      .map(tool => ({
        name: tool,
        relevance: 'You already use this tool'
      }));
  }

  /**
   * Get quick wins for beginners
   */
  getQuickWins(channel) {
    const quickWins = {
      direct_mail: [
        'Start with postcards - they\'re simple and cost-effective',
        'Use your existing customer list for best results',
        'Include a clear, single call-to-action'
      ],
      email: [
        'Write subject lines under 50 characters',
        'Send emails on Tuesday or Thursday mornings',
        'Include recipient\'s name in subject line'
      ],
      social: [
        'Post at least 3 times per week',
        'Use relevant hashtags (5-10 per post)',
        'Respond to comments within 24 hours'
      ]
    };
    
    return quickWins[channel] || [];
  }

  /**
   * Format channel name
   */
  formatChannelName(channel) {
    const names = {
      direct_mail: 'Direct Mail Marketing',
      email: 'Email Marketing',
      social: 'Social Media Marketing',
      seo: 'Search Engine Optimization',
      ppc: 'Pay-Per-Click Advertising'
    };
    
    return names[channel] || channel;
  }
}

export default AdaptationStage;