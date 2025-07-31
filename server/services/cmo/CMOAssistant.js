/**
 * CMOAssistant - Marketing assistant service
 * 
 * Provides marketing expertise using the CMO Knowledge Base
 * and integrates with the chat system.
 */

import { cmoKnowledgeBase } from './CMOKnowledgeBase.js';
import { contextDetector } from './ContextDetector.js';
import { cmoResponseEnhancer } from './CMOResponseEnhancer.js';
import { conversationFlow } from './ConversationFlow.js';
import { marketingIntelligence } from './MarketingIntelligence.js';
import { getSEOTemplate } from '../../templates/cmo/seo-responses.js';
import { getEmailTemplate } from '../../templates/cmo/email-responses.js';
import { getSocialPlatformGuide } from '../../templates/cmo/social-responses.js';
import { getMailPieceSpecs } from '../../templates/cmo/directmail-responses.js';
import { getAdsPlatformGuide } from '../../templates/cmo/ads-responses.js';

class CMOAssistant {
  constructor() {
    this.knowledgeBase = cmoKnowledgeBase;
    this.contextDetector = contextDetector;
    this.responseEnhancer = cmoResponseEnhancer;
    this.conversationFlow = conversationFlow;
    this.marketingIntelligence = marketingIntelligence;
    this.initialized = false;
  }

  /**
   * Initialize the CMO Assistant
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      await this.knowledgeBase.initialize();
      this.initialized = true;
      console.log('✅ CMO Assistant initialized');
    } catch (error) {
      console.error('Failed to initialize CMO Assistant:', error);
      throw error;
    }
  }

  /**
   * Process a marketing query with context-aware enhancements
   */
  async processQuery(query, context = {}) {
    const { category, subMode, expertise = 'intermediate', userId = 'default' } = context;
    
    try {
      // Process conversation flow first
      const conversationContext = await this.conversationFlow.processMessage(userId, query, context);
      
      // Detect marketing context
      const contextAnalysis = await this.contextDetector.detectMarketingContext(query);
      
      // Use detected context or provided subMode
      const effectiveContext = contextAnalysis.primaryContext || subMode || category;
      
      // Search for relevant knowledge
      const searchResults = await this.knowledgeBase.search(query, {
        category: effectiveContext,
        limit: 5
      });
      
      // Get query type and intent
      const queryType = this.detectQueryType(query);
      const intent = contextAnalysis.intent || 'general';
      
      // Build base response
      const baseResponse = {
        query,
        context: effectiveContext,
        queryType,
        intent,
        results: searchResults,
        confidence: contextAnalysis.confidence
      };
      
      // Get context-specific template
      const template = await this.getContextTemplate(effectiveContext, intent, expertise);
      if (template) {
        baseResponse.template = template;
      }
      
      // Enhance response with context-aware content
      const enhancedResponse = await this.responseEnhancer.enhanceResponse(
        query,
        baseResponse,
        {
          mode: 'cmo',
          subMode: effectiveContext,
          intent,
          expertise,
          analysis: contextAnalysis
        }
      );
      
      // Add quick actions for the context
      enhancedResponse.quickActions = this.getQuickActions(effectiveContext);
      
      // Add additional context
      enhancedResponse.additionalContext = await this.getAdditionalContext(
        queryType,
        effectiveContext
      );
      
      // Add conversation flow context
      enhancedResponse.conversation = {
        session: conversationContext.session,
        stage: conversationContext.session.stage,
        breadcrumbs: conversationContext.breadcrumbs,
        followUpSuggestions: conversationContext.followUpSuggestions,
        memory: conversationContext.memory,
        previousTopics: conversationContext.previousTopics
      };
      
      // Add personalized elements based on conversation memory
      if (conversationContext.memory.businessInfo.name) {
        enhancedResponse.personalization = {
          businessName: conversationContext.memory.businessInfo.name,
          industry: conversationContext.memory.businessInfo.industry,
          previousChallenges: conversationContext.businessContext.challenges,
          goals: conversationContext.businessContext.goals
        };
      }
      
      return enhancedResponse;
      
    } catch (error) {
      console.error('Error processing CMO query:', error);
      return {
        results: [],
        error: error.message
      };
    }
  }

  /**
   * Detect the type of marketing query
   */
  detectQueryType(query) {
    const queryLower = query.toLowerCase();
    
    // Template requests
    if (queryLower.includes('template') || queryLower.includes('example')) {
      return 'template';
    }
    
    // How-to questions
    if (queryLower.startsWith('how to') || queryLower.includes('how do i')) {
      return 'howto';
    }
    
    // Best practices
    if (queryLower.includes('best practice') || queryLower.includes('tips')) {
      return 'bestpractice';
    }
    
    // Analysis requests
    if (queryLower.includes('analyze') || queryLower.includes('review')) {
      return 'analysis';
    }
    
    // Tool requests
    if (queryLower.includes('tool') || queryLower.includes('calculator')) {
      return 'tool';
    }
    
    return 'general';
  }

  /**
   * Get additional context based on query type
   */
  async getAdditionalContext(queryType, category) {
    const context = {};
    
    switch (queryType) {
      case 'template':
        // Get available templates
        const templates = this.knowledgeBase.getByCategory(category)
          .filter(item => item.type === 'template');
        context.availableTemplates = templates.map(t => ({
          title: t.title,
          description: t.description
        }));
        break;
        
      case 'bestpractice':
        // Get a random tip
        const tip = this.knowledgeBase.getRandomTip(category);
        if (tip) {
          context.quickTip = tip;
        }
        break;
        
      case 'tool':
        // Get available tools
        const tools = this.knowledgeBase.getByCategory(category)
          .filter(item => item.type === 'tool');
        context.availableTools = tools.map(t => ({
          title: t.title,
          description: t.description
        }));
        break;
    }
    
    // Get category stats
    const stats = this.knowledgeBase.getStats();
    if (stats.categories[category]) {
      context.categoryInfo = {
        totalItems: stats.categories[category].count,
        types: stats.categories[category].types
      };
    }
    
    return context;
  }

  /**
   * Get context-specific template
   */
  async getContextTemplate(context, intent, expertise) {
    let template = null;
    
    switch (context) {
      case 'seo':
        template = getSEOTemplate(intent, expertise);
        break;
      case 'email':
        template = getEmailTemplate(intent, expertise);
        break;
      case 'social':
        // For social, we'll return platform guide if platform is mentioned
        template = { type: 'social', intent, expertise };
        break;
      case 'directMail':
        template = { type: 'directMail', intent, expertise };
        break;
      case 'ads':
        template = { type: 'ads', intent, expertise };
        break;
    }
    
    return template;
  }

  /**
   * Generate suggestions based on query results
   */
  generateSuggestions(queryType, results) {
    const suggestions = [];
    
    if (results.length === 0) {
      suggestions.push({
        type: 'expand',
        message: 'Try broadening your search or asking about general best practices'
      });
    }
    
    switch (queryType) {
      case 'template':
        suggestions.push({
          type: 'action',
          message: 'Would you like me to customize a template for your specific needs?'
        });
        break;
        
      case 'howto':
        suggestions.push({
          type: 'followup',
          message: 'Do you need step-by-step instructions or examples?'
        });
        break;
        
      case 'analysis':
        suggestions.push({
          type: 'action',
          message: 'Share your content and I can provide specific feedback'
        });
        break;
    }
    
    return suggestions;
  }

  /**
   * Get quick actions for a category
   */
  getQuickActions(category) {
    const actions = {
      seo: [
        { id: 'title-checker', label: 'Check Title Tag', icon: '📏' },
        { id: 'meta-generator', label: 'Generate Meta Description', icon: '📝' },
        { id: 'keyword-research', label: 'Keyword Ideas', icon: '🔑' },
        { id: 'content-audit', label: 'Content Audit', icon: '🔍' }
      ],
      email: [
        { id: 'subject-tester', label: 'Test Subject Line', icon: '🧪' },
        { id: 'spam-check', label: 'Spam Check', icon: '🚫' },
        { id: 'template-gallery', label: 'Email Templates', icon: '📧' },
        { id: 'segment-builder', label: 'Build Segment', icon: '👥' }
      ],
      social: [
        { id: 'hashtag-generator', label: 'Generate Hashtags', icon: '#️⃣' },
        { id: 'post-ideas', label: 'Post Ideas', icon: '💡' },
        { id: 'content-calendar', label: 'Content Calendar', icon: '📅' },
        { id: 'engagement-tips', label: 'Engagement Tips', icon: '💬' }
      ],
      'direct-mail': [
        { id: 'postcard-design', label: 'Design Postcard', icon: '🎨' },
        { id: 'copy-generator', label: 'Generate Copy', icon: '✍️' },
        { id: 'roi-calculator', label: 'ROI Calculator', icon: '💰' },
        { id: 'usps-guide', label: 'USPS Guide', icon: '📮' }
      ],
      ads: [
        { id: 'ad-copy-generator', label: 'Generate Ad Copy', icon: '📝' },
        { id: 'keyword-planner', label: 'Keyword Planner', icon: '🎯' },
        { id: 'budget-optimizer', label: 'Optimize Budget', icon: '💵' },
        { id: 'performance-analyzer', label: 'Analyze Performance', icon: '📊' }
      ]
    };
    
    return actions[category] || [];
  }

  /**
   * Execute a quick action
   */
  async executeQuickAction(actionId, params = {}) {
    switch (actionId) {
      case 'title-checker':
        return this.checkTitleTag(params.title);
        
      case 'subject-tester':
        return this.testSubjectLine(params.subject);
        
      case 'hashtag-generator':
        return this.generateHashtags(params.content);
        
      default:
        return {
          error: 'Unknown action',
          message: `Action ${actionId} is not implemented yet`
        };
    }
  }

  /**
   * Title tag checker
   */
  checkTitleTag(title) {
    if (!title) {
      return { error: 'No title provided' };
    }
    
    const length = title.length;
    const analysis = {
      title,
      length,
      status: 'good',
      issues: [],
      suggestions: []
    };
    
    // Length check
    if (length < 30) {
      analysis.status = 'warning';
      analysis.issues.push('Title is too short (under 30 characters)');
      analysis.suggestions.push('Add more descriptive keywords');
    } else if (length > 60) {
      analysis.status = 'warning';
      analysis.issues.push('Title may be truncated in search results (over 60 characters)');
      analysis.suggestions.push('Consider shortening to ensure full visibility');
    }
    
    // Keyword position
    if (!title.toLowerCase().includes('|') && !title.includes('-')) {
      analysis.suggestions.push('Consider adding your brand name with a separator');
    }
    
    // Special characters
    if (title.includes('&')) {
      analysis.suggestions.push('Consider using "and" instead of "&" for better readability');
    }
    
    return analysis;
  }

  /**
   * Subject line tester
   */
  testSubjectLine(subject) {
    if (!subject) {
      return { error: 'No subject line provided' };
    }
    
    const analysis = {
      subject,
      length: subject.length,
      score: 100,
      issues: [],
      suggestions: []
    };
    
    // Length check
    if (subject.length > 50) {
      analysis.score -= 10;
      analysis.issues.push('Subject line is long (may be cut off on mobile)');
    }
    
    // Spam words check
    const spamWords = ['free', 'guarantee', 'click here', 'buy now', 'limited time'];
    const foundSpam = spamWords.filter(word => 
      subject.toLowerCase().includes(word)
    );
    
    if (foundSpam.length > 0) {
      analysis.score -= foundSpam.length * 15;
      analysis.issues.push(`Contains spam trigger words: ${foundSpam.join(', ')}`);
      analysis.suggestions.push('Replace spam trigger words with alternatives');
    }
    
    // Personalization check
    if (subject.includes('{{') || subject.includes('{name}')) {
      analysis.score += 10;
      analysis.suggestions.push('Good use of personalization!');
    }
    
    // Emoji check
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/u;
    if (emojiRegex.test(subject)) {
      analysis.suggestions.push('Test with and without emoji - results vary by audience');
    }
    
    analysis.score = Math.max(0, Math.min(100, analysis.score));
    
    return analysis;
  }

  /**
   * Hashtag generator
   */
  async generateHashtags(content) {
    if (!content) {
      return { error: 'No content provided' };
    }
    
    // Extract keywords from content
    const words = content.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'from', 'have'].includes(word));
    
    // Generate hashtags
    const hashtags = {
      recommended: [],
      trending: [],
      niche: []
    };
    
    // Simple keyword-based hashtags
    const keywords = [...new Set(words)].slice(0, 5);
    hashtags.recommended = keywords.map(word => `#${word}`);
    
    // Add some generic trending tags based on content
    if (content.includes('marketing')) {
      hashtags.trending.push('#MarketingTips', '#DigitalMarketing');
    }
    if (content.includes('business')) {
      hashtags.trending.push('#SmallBusiness', '#Entrepreneur');
    }
    
    // Niche tags
    hashtags.niche = hashtags.recommended.map(tag => tag + 'Tips');
    
    return {
      hashtags,
      tips: [
        'Use 5-10 hashtags on Instagram',
        'Use 1-2 hashtags on Twitter',
        'Mix popular and niche hashtags',
        'Create a branded hashtag for campaigns'
      ]
    };
  }

  /**
   * Navigate back in conversation
   */
  async navigateBack(userId, steps = 1) {
    return this.conversationFlow.navigateBack(userId, steps);
  }

  /**
   * Get conversation summary
   */
  async getConversationSummary(userId) {
    return this.conversationFlow.getSessionSummary(userId);
  }

  /**
   * Clear conversation session
   */
  async clearConversation(userId) {
    this.conversationFlow.clearSession(userId);
    return { success: true, message: 'Conversation cleared' };
  }

  /**
   * Process follow-up suggestion
   */
  async processFollowUp(userId, suggestion) {
    // Generate a query from the suggestion
    const query = suggestion.text || suggestion;
    const context = {
      userId,
      isFollowUp: true,
      previousIntent: suggestion.intent,
      topic: suggestion.topic
    };
    
    return this.processQuery(query, context);
  }

  /**
   * Get marketing health assessment
   */
  async getMarketingHealth(userId) {
    try {
      const health = await this.marketingIntelligence.analyzeMarketingHealth(userId);
      
      // Track any mentioned metrics
      const session = this.conversationFlow.getSession(userId);
      if (session.memory.metrics.size > 0) {
        session.memory.metrics.forEach((metric, key) => {
          if (metric.context) {
            this.marketingIntelligence.updateProgress(
              userId,
              metric.context,
              key,
              metric.value
            );
          }
        });
      }
      
      return health;
    } catch (error) {
      console.error('Failed to get marketing health:', error);
      return null;
    }
  }

  /**
   * Get proactive suggestions
   */
  async getProactiveSuggestions(userId) {
    return this.marketingIntelligence.generateProactiveSuggestions(userId);
  }

  /**
   * Process marketing health query
   */
  async processHealthQuery(userId, query = 'Show my marketing health') {
    const health = await this.getMarketingHealth(userId);
    
    if (!health) {
      return {
        content: "I'm unable to assess your marketing health at the moment. Let's continue our conversation to gather more information.",
        error: true
      };
    }
    
    const response = {
      query,
      context: 'health_assessment',
      queryType: 'analysis',
      intent: 'analyze',
      results: [],
      marketingHealth: health,
      confidence: 1.0
    };
    
    // Enhance with context-aware content
    const enhanced = await this.responseEnhancer.enhanceResponse(
      query,
      response,
      {
        mode: 'cmo',
        subMode: 'all',
        intent: 'analyze',
        expertise: 'intermediate'
      }
    );
    
    // Add health-specific content
    enhanced.content = this.generateHealthSummary(health);
    enhanced.visualization = 'dashboard';
    
    return enhanced;
  }

  /**
   * Generate health summary text
   */
  generateHealthSummary(health) {
    const { summary, gaps, opportunities, crossChannelInsights } = health;
    
    let content = `## Marketing Health Assessment\n\n`;
    content += `**Overall Score: ${summary.overallHealth.score}/100** - ${summary.overallHealth.label}\n\n`;
    content += `You have **${summary.overallHealth.activeChannels} active channels** out of ${summary.overallHealth.totalChannels} `;
    content += `(${summary.overallHealth.coverage}% coverage).\n\n`;
    
    // Critical gaps
    const criticalGaps = gaps.filter(g => g.severity === 'high');
    if (criticalGaps.length > 0) {
      content += `### 🚨 Critical Areas to Address\n`;
      criticalGaps.forEach(gap => {
        content += `- **${gap.description}**\n  → ${gap.recommendation}\n`;
      });
      content += '\n';
    }
    
    // Top opportunities
    if (opportunities.length > 0) {
      content += `### 💡 Top Opportunities\n`;
      opportunities.slice(0, 3).forEach(opp => {
        content += `- **${opp.title}**\n`;
        if (opp.description) {
          content += `  ${opp.description}\n`;
        }
      });
      content += '\n';
    }
    
    // Cross-channel insights
    if (crossChannelInsights.length > 0) {
      content += `### 🔗 Cross-Channel Insights\n`;
      crossChannelInsights.slice(0, 2).forEach(insight => {
        content += `- ${insight.insight}\n`;
      });
    }
    
    return content;
  }
}

// Export singleton instance
export const cmoAssistant = new CMOAssistant();
export default CMOAssistant;