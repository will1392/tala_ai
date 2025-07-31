/**
 * Context-Aware Chat Service for CMO Mode
 * 
 * Integrates context detection with chat functionality
 */

import { contextDetector } from './ContextDetector.js';

export class ContextAwareChat {
  constructor() {
    this.currentMode = 'travel';
    this.currentSubMode = null;
    this.autoSwitchEnabled = true;
    this.lastSwitchTime = null;
    this.switchCooldown = 30000; // 30 seconds cooldown between auto-switches
  }

  /**
   * Process message with context awareness
   */
  async processMessage(message, currentMode, currentSubMode, userId) {
    const contextAnalysis = await contextDetector.detectMarketingContext(message);
    
    // Only process context switching if in CMO mode
    if (currentMode !== 'cmo') {
      return {
        contextAnalysis,
        switchRecommendation: null,
        enhancedResponse: null
      };
    }

    // Determine if we should switch sub-mode
    const switchRecommendation = this.evaluateSwitchRecommendation(
      currentSubMode,
      contextAnalysis,
      userId
    );

    // Generate enhanced response based on context
    const enhancedResponse = this.generateEnhancedResponse(contextAnalysis);

    return {
      contextAnalysis,
      switchRecommendation,
      enhancedResponse
    };
  }

  /**
   * Evaluate whether to recommend a sub-mode switch
   */
  evaluateSwitchRecommendation(currentSubMode, contextAnalysis, userId) {
    const { primaryContext, confidence } = contextAnalysis;
    
    // No primary context detected
    if (!primaryContext) {
      return null;
    }

    // Already in the detected context
    if (currentSubMode === primaryContext) {
      return null;
    }

    // Check cooldown
    if (this.lastSwitchTime && Date.now() - this.lastSwitchTime < this.switchCooldown) {
      return null;
    }

    const confidenceLevel = contextDetector.getConfidenceLevel(confidence);
    const shouldSwitch = contextDetector.shouldSwitchContext(
      currentSubMode || 'all',
      primaryContext,
      confidence
    );

    if (!shouldSwitch.switch) {
      return null;
    }

    const recommendation = {
      targetSubMode: primaryContext,
      confidence: confidence,
      confidenceLevel: confidenceLevel,
      type: shouldSwitch.type, // 'auto' or 'suggest'
      reason: this.generateSwitchReason(currentSubMode, primaryContext, contextAnalysis),
      suggestedTools: contextAnalysis.suggestedTools
    };

    // If auto-switch is enabled and confidence is high
    if (this.autoSwitchEnabled && shouldSwitch.type === 'auto') {
      recommendation.autoSwitch = true;
      this.lastSwitchTime = Date.now();
    }

    return recommendation;
  }

  /**
   * Generate reason for switching context
   */
  generateSwitchReason(currentSubMode, targetSubMode, contextAnalysis) {
    const { entities, intent } = contextAnalysis;
    
    const reasons = {
      seo: "I noticed you're asking about SEO-related topics. Would you like me to switch to SEO mode for better assistance?",
      email: "It looks like you're working on email marketing. Should I switch to Email mode to provide specialized tools?",
      social: "I see you're discussing social media marketing. Would you like me to switch to Social mode?",
      directMail: "You seem to be planning a direct mail campaign. Should I switch to Direct Mail mode?",
      ads: "I detected you're working on advertising. Would you like me to switch to Ads mode for better support?"
    };

    let reason = reasons[targetSubMode] || `I think ${targetSubMode} mode would be more helpful for this conversation.`;

    // Add context-specific details
    if (entities.length > 0) {
      const entityTypes = [...new Set(entities.map(e => e.type))];
      reason += ` I noticed you mentioned ${entityTypes.join(', ')}.`;
    }

    return reason;
  }

  /**
   * Generate enhanced response based on context
   */
  generateEnhancedResponse(contextAnalysis) {
    const { primaryContext, intent, entities, suggestedTools } = contextAnalysis;
    
    if (!primaryContext) {
      return null;
    }

    const response = {
      contextualTips: [],
      relevantMetrics: [],
      suggestedActions: [],
      tools: suggestedTools || []
    };

    // Add context-specific tips
    response.contextualTips = this.getContextualTips(primaryContext, intent);
    
    // Add relevant metrics to track
    response.relevantMetrics = this.getRelevantMetrics(primaryContext, entities);
    
    // Add suggested actions
    response.suggestedActions = this.getSuggestedActions(primaryContext, intent);

    return response;
  }

  /**
   * Get contextual tips based on context and intent
   */
  getContextualTips(context, intent) {
    const tips = {
      seo: {
        create: ["Remember to include your target keyword in the title tag", "Keep meta descriptions under 160 characters"],
        analyze: ["Check your Core Web Vitals scores", "Review your backlink profile regularly"],
        optimize: ["Focus on improving page load speed", "Ensure mobile responsiveness"]
      },
      email: {
        create: ["Personalize subject lines for better open rates", "Include a clear call-to-action"],
        analyze: ["Monitor unsubscribe rates alongside open rates", "Track click-to-conversion rates"],
        optimize: ["Test different send times", "Segment your list for better targeting"]
      },
      social: {
        create: ["Use relevant hashtags to increase reach", "Include visuals for better engagement"],
        analyze: ["Track engagement rate, not just follower count", "Monitor sentiment in comments"],
        optimize: ["Post when your audience is most active", "Respond to comments quickly"]
      },
      directMail: {
        create: ["Include a QR code for tracking", "Use variable data printing for personalization"],
        analyze: ["Calculate cost per acquisition", "Track response rates by segment"],
        optimize: ["Test different offers", "Improve list quality with NCOA updates"]
      },
      ads: {
        create: ["Write multiple ad variations for testing", "Align ad copy with landing pages"],
        analyze: ["Monitor quality scores", "Track conversion attribution"],
        optimize: ["Adjust bids based on performance", "Use negative keywords to reduce waste"]
      }
    };

    return tips[context]?.[intent] || tips[context]?.general || [];
  }

  /**
   * Get relevant metrics for the context
   */
  getRelevantMetrics(context, entities) {
    const contextMetrics = {
      seo: ["organic traffic", "keyword rankings", "domain authority", "page speed"],
      email: ["open rate", "click rate", "conversion rate", "list growth rate"],
      social: ["engagement rate", "reach", "follower growth", "share of voice"],
      directMail: ["response rate", "cost per piece", "ROI", "delivery rate"],
      ads: ["CTR", "CPC", "conversion rate", "ROAS", "quality score"]
    };

    const metrics = contextMetrics[context] || [];
    
    // Add entity-specific metrics
    entities.forEach(entity => {
      if (entity.type === 'platform' && entity.value === 'google') {
        metrics.push('impression share', 'average position');
      }
    });

    return [...new Set(metrics)];
  }

  /**
   * Get suggested actions based on context and intent
   */
  getSuggestedActions(context, intent) {
    const actions = {
      seo: {
        create: ["Create comprehensive content around your target keywords", "Build high-quality backlinks"],
        analyze: ["Run a technical SEO audit", "Analyze competitor strategies"],
        optimize: ["Improve internal linking structure", "Optimize images with alt text"]
      },
      email: {
        create: ["Design a welcome series for new subscribers", "Create re-engagement campaigns"],
        analyze: ["Review email deliverability metrics", "Analyze subscriber segments"],
        optimize: ["Clean your email list regularly", "Implement dynamic content"]
      },
      social: {
        create: ["Develop a content calendar", "Create platform-specific content"],
        analyze: ["Conduct a social media audit", "Analyze competitor performance"],
        optimize: ["Optimize posting schedule", "Improve visual consistency"]
      },
      directMail: {
        create: ["Design eye-catching mail pieces", "Develop targeted offers"],
        analyze: ["Calculate lifetime value of responders", "Analyze geographic response patterns"],
        optimize: ["Refine targeting criteria", "Test different formats"]
      },
      ads: {
        create: ["Build dedicated landing pages", "Create compelling ad copy"],
        analyze: ["Review search term reports", "Analyze audience insights"],
        optimize: ["Implement conversion tracking", "Refine audience targeting"]
      }
    };

    return actions[context]?.[intent] || actions[context]?.general || [];
  }

  /**
   * Toggle auto-switch functionality
   */
  setAutoSwitch(enabled) {
    this.autoSwitchEnabled = enabled;
  }

  /**
   * Get context insights
   */
  getContextInsights() {
    return contextDetector.getContextInsights();
  }

  /**
   * Clear context history
   */
  clearHistory() {
    contextDetector.clearHistory();
    this.lastSwitchTime = null;
  }
}

// Export singleton instance
export const contextAwareChat = new ContextAwareChat();