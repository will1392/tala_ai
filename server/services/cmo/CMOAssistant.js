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

// Import expertise services
import ExpertiseAssessment from '../expertise/ExpertiseAssessment.js';
import CommunicationAdapter from '../expertise/CommunicationAdapter.js';
import ExpertiseLearning from '../expertise/ExpertiseLearning.js';
import ExpertiseProfiles from '../expertise/ExpertiseProfiles.js';
import { ResponseTemplates, generateAdaptiveResponse } from '../../templates/cmo/expertise-responses.js';

class CMOAssistant {
  constructor() {
    this.knowledgeBase = cmoKnowledgeBase;
    this.contextDetector = contextDetector;
    this.responseEnhancer = cmoResponseEnhancer;
    this.conversationFlow = conversationFlow;
    this.marketingIntelligence = marketingIntelligence;
    
    // Initialize expertise services
    this.expertiseAssessment = new ExpertiseAssessment();
    this.communicationAdapter = new CommunicationAdapter();
    this.expertiseLearning = new ExpertiseLearning();
    this.expertiseProfiles = new ExpertiseProfiles();
    
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
   * Process a message with expertise-aware adaptations
   */
  async processMessage(message, userId, options = {}) {
    const startTime = Date.now();
    
    try {
      // Get user expertise profile
      const expertise = await this.getUserExpertise(userId);
      
      // Detect marketing context and topic
      const contextAnalysis = await this.contextDetector.detectMarketingContext(message);
      const topic = contextAnalysis.primaryContext || options.topic || 'general';
      const channel = this.expertiseProfiles.mapTopicToChannel(topic);
      
      // Get topic-specific expertise
      const topicExpertise = await this.expertiseProfiles.getTopicExpertise(userId, topic);
      
      // Build enhanced context
      const enhancedContext = {
        ...options,
        topic,
        channel,
        expertise: expertise?.level || 'beginner',
        channelExpertise: topicExpertise,
        intent: contextAnalysis.intent,
        confidence: contextAnalysis.confidence
      };
      
      // Generate base response
      const baseResponse = await this.generateResponse(message, enhancedContext);
      
      // Adapt response based on expertise
      const adaptedResponse = await this.adaptResponseForExpertise(
        baseResponse,
        expertise,
        enhancedContext
      );
      
      // Track interaction for learning
      const duration = Date.now() - startTime;
      await this.trackInteractionLearning(userId, {
        message,
        response: adaptedResponse,
        context: enhancedContext,
        duration,
        topic,
        channel
      });
      
      return adaptedResponse;
      
    } catch (error) {
      console.error('Error processing message with expertise:', error);
      
      // Fallback to basic processing
      return this.processQuery(message, { userId, ...options });
    }
  }

  /**
   * Get user expertise profile
   */
  async getUserExpertise(userId) {
    try {
      // Try to get detailed profile first
      const profile = await this.expertiseProfiles.getUserProfile(userId);
      if (profile) {
        return {
          level: profile.overall_level,
          confidence: profile.overall_confidence,
          channel_expertise: profile.channel_expertise,
          learning_style: profile.preferred_learning_style,
          technical_comfort: profile.technical_comfort,
          industry_experience: profile.industry_experience,
          tools_familiar: profile.tools_familiar
        };
      }
      
      // Fallback to basic assessment data
      const basicExpertise = await this.expertiseAssessment.getUserExpertise(userId);
      return basicExpertise || {
        level: 'beginner',
        confidence: 0.5,
        channel_expertise: {},
        learning_style: 'visual',
        technical_comfort: 0.5
      };
    } catch (error) {
      console.error('Error getting user expertise:', error);
      return {
        level: 'beginner',
        confidence: 0.5,
        channel_expertise: {},
        learning_style: 'visual',
        technical_comfort: 0.5
      };
    }
  }

  /**
   * Generate base response - First check for specific template responses
   */
  async generateResponse(message, context) {
    // Check if we have a specific template response for this topic/level combination
    const templateResponse = await this.tryGenerateTemplateResponse(message, context);
    if (templateResponse) {
      return templateResponse;
    }
    
    // Use existing processQuery method for base response generation
    const queryResult = await this.processQuery(message, context);
    
    return {
      content: queryResult.content || this.buildResponseContent(queryResult),
      context: queryResult.context,
      intent: queryResult.intent,
      results: queryResult.results,
      suggestions: queryResult.suggestions,
      quickActions: queryResult.quickActions,
      template: queryResult.template
    };
  }

  /**
   * Try to generate response using specific expertise templates
   */
  async tryGenerateTemplateResponse(message, context) {
    const { topic, channel, expertise } = context;
    
    // Map common questions to subtopics
    const questionMapping = {
      'improve email open rates': { topic: 'email', subtopic: 'open_rates' },
      'email open rate': { topic: 'email', subtopic: 'open_rates' },
      'open rates': { topic: 'email', subtopic: 'open_rates' },
      'subject line': { topic: 'email', subtopic: 'subject_lines' },
      'email subject': { topic: 'email', subtopic: 'subject_lines' },
      'title tag': { topic: 'seo', subtopic: 'title_tags' },
      'meta description': { topic: 'seo', subtopic: 'meta_descriptions' },
      'keyword research': { topic: 'seo', subtopic: 'keyword_research' },
      'social media content': { topic: 'social', subtopic: 'content_strategy' },
      'ppc campaign': { topic: 'ppc', subtopic: 'campaign_structure' },
      'blog strategy': { topic: 'content', subtopic: 'blog_strategy' },
      'conversion tracking': { topic: 'analytics', subtopic: 'conversion_tracking' }
    };

    // Find matching topic and subtopic
    let matchedTopic = null, matchedSubtopic = null;
    
    const messageLower = message.toLowerCase();
    Object.keys(questionMapping).forEach(question => {
      if (messageLower.includes(question)) {
        matchedTopic = questionMapping[question].topic;
        matchedSubtopic = questionMapping[question].subtopic;
      }
    });

    // Use detected context if no direct match
    if (!matchedTopic) {
      matchedTopic = channel || topic;
      // Default subtopics based on context
      const defaultSubtopics = {
        'email': 'open_rates',
        'seo': 'title_tags',
        'social': 'content_strategy',
        'ppc': 'campaign_structure',
        'content': 'blog_strategy',
        'analytics': 'conversion_tracking'
      };
      matchedSubtopic = defaultSubtopics[matchedTopic];
    }

    // Generate adaptive response if we have a match
    if (matchedTopic && matchedSubtopic) {
      const adaptiveContent = generateAdaptiveResponse(
        matchedTopic, 
        matchedSubtopic, 
        expertise, 
        {
          includeMetrics: context.technical_comfort > 0.6,
          includeTools: context.tools_familiar?.length > 0
        }
      );

      if (adaptiveContent) {
        return {
          content: adaptiveContent,
          context: { ...context, source: 'expertise_template', topic: matchedTopic, subtopic: matchedSubtopic },
          intent: 'marketing_guidance',
          template: `${matchedTopic}_${matchedSubtopic}_${expertise}`,
          isAdaptive: true
        };
      }
    }

    return null;
  }

  /**
   * Build response content from query results
   */
  buildResponseContent(queryResult) {
    let content = '';
    
    if (queryResult.results && queryResult.results.length > 0) {
      content += '## Marketing Insights\n\n';
      
      queryResult.results.forEach((result, index) => {
        content += `### ${result.title}\n`;
        if (result.description) {
          content += `${result.description}\n\n`;
        }
        if (result.content) {
          content += `${result.content}\n\n`;
        }
      });
    }
    
    // Add template content if available
    if (queryResult.template && queryResult.template.content) {
      content += queryResult.template.content + '\n\n';
    }
    
    // Add suggestions
    if (queryResult.suggestions && queryResult.suggestions.length > 0) {
      content += '## Recommendations\n\n';
      queryResult.suggestions.forEach(suggestion => {
        content += `- ${suggestion.message}\n`;
      });
    }
    
    // Don't return a generic question if we have no content - let the system handle it
    return content;
  }

  /**
   * Adapt response based on user expertise
   */
  async adaptResponseForExpertise(baseResponse, expertise, context) {
    try {
      // Get adaptive response template if available
      const adaptiveTemplate = this.getAdaptiveTemplate(
        context.topic,
        context.subtopic || context.intent,
        expertise.level
      );
      
      if (adaptiveTemplate) {
        // Use expertise-specific template
        const adaptedContent = generateAdaptiveResponse(
          context.topic,
          context.subtopic || context.intent,
          expertise.level,
          {
            includeMetrics: expertise.technical_comfort > 0.6,
            includeTools: expertise.tools_familiar?.length > 0,
            hasData: context.hasData || false
          }
        );
        
        if (adaptedContent) {
          baseResponse.content = adaptedContent;
          baseResponse.adaptationSource = 'template';
        }
      }
      
      // Apply communication style adaptation
      if (baseResponse.content) {
        const communicationPrefs = await this.expertiseProfiles.getCommunicationPreferences(context.userId);
        
        baseResponse.content = this.communicationAdapter.adaptResponse(
          baseResponse.content,
          expertise.level,
          {
            topic: context.topic,
            channelExpertise: context.channelExpertise,
            learningStyle: expertise.learning_style,
            technicalComfort: expertise.technical_comfort,
            industryContext: expertise.industry_experience,
            communicationPrefs
          }
        );
        
        baseResponse.adaptationSource = baseResponse.adaptationSource === 'template' ? 'both' : 'communication';
      }
      
      // Add expertise-specific quick actions
      baseResponse.quickActions = this.enhanceQuickActionsForExpertise(
        baseResponse.quickActions || [],
        expertise,
        context
      );
      
      // Add learning recommendations
      if (context.channelExpertise && context.channelExpertise.confidence < 0.7) {
        baseResponse.learningRecommendations = await this.generateLearningRecommendations(
          context.userId,
          context.topic,
          expertise
        );
      }
      
      return baseResponse;
      
    } catch (error) {
      console.error('Error adapting response for expertise:', error);
      return baseResponse; // Return original response on error
    }
  }

  /**
   * Get adaptive response template
   */
  getAdaptiveTemplate(topic, subtopic, level) {
    try {
      const topicKey = topic.toUpperCase();
      if (ResponseTemplates[topicKey] && ResponseTemplates[topicKey][subtopic]) {
        return ResponseTemplates[topicKey][subtopic][level];
      }
      return null;
    } catch (error) {
      console.error('Error getting adaptive template:', error);
      return null;
    }
  }

  /**
   * Enhance quick actions based on expertise
   */
  enhanceQuickActionsForExpertise(quickActions, expertise, context) {
    const enhanced = [...quickActions];
    
    // Add level-appropriate actions
    if (expertise.level === 'beginner') {
      enhanced.unshift({
        id: 'explain-basics',
        label: 'Explain Basics',
        icon: '📚',
        priority: 'high'
      });
    } else if (expertise.level === 'expert') {
      enhanced.push({
        id: 'advanced-strategies',
        label: 'Advanced Strategies',
        icon: '🚀',
        priority: 'medium'
      });
    }
    
    // Add channel-specific actions based on expertise
    if (context.channelExpertise && context.channelExpertise.level > 2) {
      enhanced.push({
        id: 'deep-dive',
        label: `Advanced ${context.channel.toUpperCase()}`,
        icon: '🔍',
        priority: 'medium'
      });
    }
    
    return enhanced;
  }

  /**
   * Generate learning recommendations
   */
  async generateLearningRecommendations(userId, topic, expertise) {
    try {
      const recommendations = await this.expertiseProfiles.getChannelRecommendations(userId);
      
      // Filter for current topic/channel
      const channel = this.expertiseProfiles.mapTopicToChannel(topic);
      const channelRecs = recommendations.filter(rec => rec.channel === channel);
      
      if (channelRecs.length > 0) {
        return channelRecs.map(rec => ({
          type: rec.type,
          message: rec.recommendation,
          priority: rec.priority,
          action: rec.type === 'improvement' ? 'Learn Fundamentals' : 'Explore Advanced Topics'
        }));
      }
      
      // Generate default recommendations
      return [{
        type: 'improvement',
        message: `Build stronger foundation in ${topic} fundamentals`,
        priority: 'medium',
        action: 'View Learning Resources'
      }];
    } catch (error) {
      console.error('Error generating learning recommendations:', error);
      return [];
    }
  }

  /**
   * Track interaction for learning
   */
  async trackInteractionLearning(userId, interactionData) {
    try {
      // Track with expertise learning system
      await this.expertiseLearning.trackInteraction(userId, {
        message: interactionData.message,
        response: interactionData.response.content,
        duration: interactionData.duration,
        topic: interactionData.topic,
        type: 'message',
        success: !this.hasConfusionSignals(interactionData.message),
        metadata: {
          channel: interactionData.channel,
          intent: interactionData.context.intent,
          adaptationSource: interactionData.response.adaptationSource,
          quickActionsUsed: interactionData.response.quickActions?.length || 0
        }
      });
      
      // Update channel expertise based on interaction
      await this.expertiseProfiles.updateChannelExpertise(userId, interactionData.topic, {
        success: !this.hasConfusionSignals(interactionData.message),
        confusion: this.hasConfusionSignals(interactionData.message),
        timeToComplete: interactionData.duration,
        difficulty: this.assessMessageDifficulty(interactionData.message)
      });
      
    } catch (error) {
      console.error('Error tracking interaction learning:', error);
      // Don't throw error to avoid breaking main flow
    }
  }

  /**
   * Check for confusion signals in message
   */
  hasConfusionSignals(message) {
    const confusionPhrases = [
      "i don't understand",
      "can you explain",
      "what does that mean",
      "i'm confused",
      "too complicated",
      "can you simplify"
    ];
    
    const lowerMessage = message.toLowerCase();
    return confusionPhrases.some(phrase => lowerMessage.includes(phrase));
  }

  /**
   * Assess message difficulty level
   */
  assessMessageDifficulty(message) {
    const advancedTerms = [
      'attribution', 'programmatic', 'remarketing', 'cohort',
      'funnel optimization', 'multivariate', 'segmentation',
      'automation', 'integration', 'analytics'
    ];
    
    const lowerMessage = message.toLowerCase();
    const advancedCount = advancedTerms.filter(term => lowerMessage.includes(term)).length;
    
    if (advancedCount >= 3) return 'expert';
    if (advancedCount >= 2) return 'advanced';
    if (advancedCount >= 1) return 'intermediate';
    return 'beginner';
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

  /**
   * Get expertise-based response (main entry point for chat integration)
   */
  async getExpertiseResponse(message, userId, options = {}) {
    // Use the new processMessage method with expertise integration
    return this.processMessage(message, userId, options);
  }

  /**
   * Update user expertise profile
   */
  async updateUserExpertise(userId, assessment) {
    try {
      // Create detailed profile
      await this.expertiseProfiles.createDetailedProfile(userId, assessment);
      
      // Save basic assessment
      await this.expertiseAssessment.saveAssessment(userId, assessment, {});
      
      return { success: true };
    } catch (error) {
      console.error('Error updating user expertise:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's expertise summary
   */
  async getUserExpertiseSummary(userId) {
    try {
      return await this.expertiseProfiles.getExpertiseSummary(userId);
    } catch (error) {
      console.error('Error getting expertise summary:', error);
      return null;
    }
  }

  /**
   * Get personalized learning recommendations
   */
  async getPersonalizedRecommendations(userId) {
    try {
      return await this.expertiseProfiles.getChannelRecommendations(userId);
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      return [];
    }
  }

  /**
   * Check if user needs expertise assessment
   */
  async needsExpertiseAssessment(userId) {
    try {
      const profile = await this.expertiseProfiles.getUserProfile(userId);
      return !profile; // Needs assessment if no profile exists
    } catch (error) {
      console.error('Error checking expertise assessment need:', error);
      return true; // Assume needs assessment on error
    }
  }

  /**
   * Get expertise learning insights
   */
  async getLearningInsights(userId) {
    try {
      return await this.expertiseLearning.getLearningInsights(userId);
    } catch (error) {
      console.error('Error getting learning insights:', error);
      return { hasData: false };
    }
  }
}

// Export singleton instance
export const cmoAssistant = new CMOAssistant();
export default CMOAssistant;