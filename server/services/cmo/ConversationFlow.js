/**
 * CMO Conversation Flow Manager
 * 
 * Handles multi-turn conversations with context, continuity, and intelligent flow
 */

import { contextDetector } from './ContextDetector.js';

// Conversation stages
const ConversationStages = {
  DISCOVERY: 'discovery',
  ANALYSIS: 'analysis',
  RECOMMENDATION: 'recommendation',
  IMPLEMENTATION: 'implementation',
  FOLLOWUP: 'followup'
};

// Topic transition map
const TopicTransitions = {
  seo: {
    'title-tags': ['meta-descriptions', 'header-tags', 'url-structure'],
    'meta-descriptions': ['title-tags', 'schema-markup', 'content-optimization'],
    'keywords': ['content-strategy', 'competitor-analysis', 'search-intent'],
    'technical': ['site-speed', 'mobile-optimization', 'crawlability']
  },
  email: {
    'strategy': ['segmentation', 'automation', 'personalization'],
    'subject-lines': ['preview-text', 'send-times', 'a-b-testing'],
    'design': ['templates', 'mobile-responsive', 'cta-optimization'],
    'deliverability': ['authentication', 'list-hygiene', 'reputation']
  },
  social: {
    'strategy': ['content-calendar', 'platform-selection', 'audience-targeting'],
    'content': ['post-types', 'hashtags', 'visual-design'],
    'engagement': ['community-management', 'influencers', 'user-generated'],
    'analytics': ['metrics', 'reporting', 'optimization']
  },
  directMail: {
    'campaign': ['targeting', 'design', 'offers'],
    'format': ['postcards', 'letters', 'dimensional'],
    'lists': ['segmentation', 'data-quality', 'compliance'],
    'tracking': ['response-rates', 'roi-measurement', 'attribution']
  },
  ads: {
    'strategy': ['objectives', 'budgeting', 'platform-selection'],
    'targeting': ['audiences', 'keywords', 'demographics'],
    'creative': ['ad-copy', 'visuals', 'landing-pages'],
    'optimization': ['bidding', 'testing', 'quality-score']
  }
};

class ConversationFlow {
  constructor() {
    // Store conversation sessions by user
    this.sessions = new Map();
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Initialize or get conversation session
   */
  getSession(userId) {
    if (!this.sessions.has(userId)) {
      this.sessions.set(userId, {
        id: `session_${Date.now()}`,
        userId,
        startTime: new Date(),
        lastActivity: new Date(),
        stage: ConversationStages.DISCOVERY,
        context: {
          businessType: null,
          industry: null,
          challenges: [],
          goals: []
        },
        history: [],
        currentTopic: null,
        breadcrumbs: [],
        memory: {
          entities: new Map(),
          metrics: new Map(),
          preferences: new Map()
        }
      });
    }

    const session = this.sessions.get(userId);
    session.lastActivity = new Date();
    
    // Clean up old sessions
    this.cleanupSessions();
    
    return session;
  }

  /**
   * Process a new message in the conversation
   */
  async processMessage(userId, message, context = {}) {
    const session = this.getSession(userId);
    
    // Detect context from message
    const messageContext = await contextDetector.detectMarketingContext(message);
    
    // Update conversation history
    session.history.push({
      timestamp: new Date(),
      message,
      context: messageContext,
      stage: session.stage
    });

    // Extract and remember entities
    this.extractAndRememberEntities(session, messageContext);
    
    // Determine conversation stage
    const newStage = this.determineStage(session, messageContext);
    if (newStage !== session.stage) {
      session.stage = newStage;
    }

    // Update topic and breadcrumbs
    this.updateTopicFlow(session, messageContext);
    
    // Generate follow-up suggestions
    const followUpSuggestions = this.generateFollowUpSuggestions(session, messageContext);
    
    // Build conversation context
    const conversationContext = {
      session: {
        id: session.id,
        stage: session.stage,
        turnCount: session.history.length
      },
      currentTopic: session.currentTopic,
      breadcrumbs: session.breadcrumbs,
      memory: this.getRelevantMemory(session, messageContext),
      followUpSuggestions,
      previousTopics: this.getPreviousTopics(session),
      businessContext: session.context
    };

    return conversationContext;
  }

  /**
   * Determine conversation stage based on context and history
   */
  determineStage(session, messageContext) {
    const { intent } = messageContext;
    const historyLength = session.history.length;
    
    // Discovery stage: First few messages, gathering context
    if (historyLength <= 3 && !session.context.businessType) {
      return ConversationStages.DISCOVERY;
    }
    
    // Analysis stage: Understanding specific needs
    if (intent === 'analyze' || messageContext.entities.some(e => e.type === 'metric')) {
      return ConversationStages.ANALYSIS;
    }
    
    // Recommendation stage: Providing solutions
    if (intent === 'optimize' || intent === 'create') {
      return ConversationStages.RECOMMENDATION;
    }
    
    // Implementation stage: Detailed how-to
    if (intent === 'implement' || session.history.some(h => h.message.toLowerCase().includes('how do i'))) {
      return ConversationStages.IMPLEMENTATION;
    }
    
    // Follow-up stage: After recommendations
    if (historyLength > 5 && session.stage === ConversationStages.RECOMMENDATION) {
      return ConversationStages.FOLLOWUP;
    }
    
    return session.stage;
  }

  /**
   * Extract and remember important entities from conversation
   */
  extractAndRememberEntities(session, messageContext) {
    const { entities } = messageContext;
    
    entities.forEach(entity => {
      switch (entity.type) {
        case 'company':
        case 'brand':
          session.context.businessType = entity.value;
          session.memory.entities.set('business', entity.value);
          break;
          
        case 'industry':
          session.context.industry = entity.value;
          session.memory.entities.set('industry', entity.value);
          break;
          
        case 'metric':
        case 'percentage':
          session.memory.metrics.set(entity.value, {
            value: entity.value,
            context: messageContext.primaryContext,
            timestamp: new Date()
          });
          break;
          
        case 'platform':
        case 'tool':
          session.memory.preferences.set(entity.type, entity.value);
          break;
      }
    });
    
    // Extract challenges and goals from message
    if (messageContext.intent === 'fix' || messageContext.intent === 'optimize') {
      session.context.challenges.push({
        description: messageContext.primaryContext,
        timestamp: new Date()
      });
    }
    
    if (messageContext.intent === 'create' || messageContext.intent === 'plan') {
      session.context.goals.push({
        description: messageContext.primaryContext,
        timestamp: new Date()
      });
    }
  }

  /**
   * Update topic flow and breadcrumbs
   */
  updateTopicFlow(session, messageContext) {
    const { primaryContext } = messageContext;
    
    if (primaryContext && primaryContext !== session.currentTopic?.main) {
      // New main topic
      session.currentTopic = {
        main: primaryContext,
        sub: null,
        startTime: new Date()
      };
      
      // Update breadcrumbs
      session.breadcrumbs = [{
        label: this.getTopicLabel(primaryContext),
        topic: primaryContext,
        timestamp: new Date()
      }];
    } else if (session.currentTopic) {
      // Check for subtopic
      const subtopic = this.detectSubtopic(messageContext, session.currentTopic.main);
      if (subtopic && subtopic !== session.currentTopic.sub) {
        session.currentTopic.sub = subtopic;
        
        // Add to breadcrumbs
        session.breadcrumbs.push({
          label: this.getTopicLabel(subtopic),
          topic: subtopic,
          timestamp: new Date()
        });
        
        // Limit breadcrumb depth
        if (session.breadcrumbs.length > 5) {
          session.breadcrumbs.shift();
        }
      }
    }
  }

  /**
   * Generate intelligent follow-up suggestions
   */
  generateFollowUpSuggestions(session, messageContext) {
    const suggestions = [];
    const { primaryContext, intent } = messageContext;
    const { stage, currentTopic, history } = session;
    
    // Stage-based suggestions
    switch (stage) {
      case ConversationStages.DISCOVERY:
        suggestions.push({
          text: "Tell me about your target audience",
          intent: 'analyze',
          reason: 'Understanding your audience helps tailor strategies'
        });
        suggestions.push({
          text: "What are your main marketing goals?",
          intent: 'discover',
          reason: 'Clear goals guide our recommendations'
        });
        break;
        
      case ConversationStages.ANALYSIS:
        if (primaryContext === 'email') {
          suggestions.push({
            text: "Analyze my email open rates",
            intent: 'analyze',
            reason: 'Identify performance trends'
          });
        }
        suggestions.push({
          text: "Compare my metrics to industry benchmarks",
          intent: 'analyze',
          reason: 'See where you stand competitively'
        });
        break;
        
      case ConversationStages.RECOMMENDATION:
        suggestions.push({
          text: "Show me implementation steps",
          intent: 'implement',
          reason: 'Get actionable guidance'
        });
        suggestions.push({
          text: "What tools do you recommend?",
          intent: 'tools',
          reason: 'Find the right solutions'
        });
        break;
    }
    
    // Topic-based transitions
    if (currentTopic && TopicTransitions[currentTopic.main]) {
      const relatedTopics = TopicTransitions[currentTopic.main][currentTopic.sub] || 
                           Object.keys(TopicTransitions[currentTopic.main]).slice(0, 3);
      
      relatedTopics.forEach(topic => {
        suggestions.push({
          text: `Help with ${this.getTopicLabel(topic)}`,
          intent: 'explore',
          topic: topic,
          reason: `Related to your current ${currentTopic.main} work`
        });
      });
    }
    
    // Context-aware suggestions
    if (messageContext.entities.some(e => e.type === 'metric')) {
      suggestions.push({
        text: "How can I improve these numbers?",
        intent: 'optimize',
        reason: 'Turn insights into action'
      });
    }
    
    // Limit suggestions
    return suggestions.slice(0, 4);
  }

  /**
   * Get relevant memory for current context
   */
  getRelevantMemory(session, messageContext) {
    const memory = {
      businessInfo: {},
      previousMetrics: [],
      relatedTopics: [],
      preferences: {}
    };
    
    // Business information
    if (session.memory.entities.has('business')) {
      memory.businessInfo.name = session.memory.entities.get('business');
    }
    if (session.memory.entities.has('industry')) {
      memory.businessInfo.industry = session.memory.entities.get('industry');
    }
    
    // Previous metrics related to current context
    if (messageContext.primaryContext) {
      session.memory.metrics.forEach((metric, key) => {
        if (metric.context === messageContext.primaryContext) {
          memory.previousMetrics.push({
            value: key,
            context: metric.context,
            age: Date.now() - metric.timestamp.getTime()
          });
        }
      });
    }
    
    // Related topics from history
    const recentTopics = session.history
      .slice(-10)
      .map(h => h.context.primaryContext)
      .filter(Boolean);
    memory.relatedTopics = [...new Set(recentTopics)];
    
    // User preferences
    session.memory.preferences.forEach((value, key) => {
      memory.preferences[key] = value;
    });
    
    return memory;
  }

  /**
   * Get previous topics for reference
   */
  getPreviousTopics(session) {
    const topics = [];
    const seen = new Set();
    
    // Extract unique topics from history
    session.history.forEach(entry => {
      const topic = entry.context.primaryContext;
      if (topic && !seen.has(topic)) {
        seen.add(topic);
        topics.push({
          topic,
          lastMentioned: entry.timestamp,
          frequency: session.history.filter(h => h.context.primaryContext === topic).length
        });
      }
    });
    
    // Sort by recency and frequency
    return topics.sort((a, b) => {
      const recencyDiff = b.lastMentioned.getTime() - a.lastMentioned.getTime();
      if (Math.abs(recencyDiff) < 60000) { // Within 1 minute
        return b.frequency - a.frequency;
      }
      return recencyDiff;
    });
  }

  /**
   * Detect subtopic from message context
   */
  detectSubtopic(messageContext, mainTopic) {
    const message = messageContext.query?.toLowerCase() || '';
    const subtopics = TopicTransitions[mainTopic] || {};
    
    for (const [subtopic, keywords] of Object.entries(subtopics)) {
      if (message.includes(subtopic.replace('-', ' '))) {
        return subtopic;
      }
    }
    
    // Check for common subtopic patterns
    const patterns = {
      'title-tags': /title\s*tag|page\s*title|meta\s*title/i,
      'subject-lines': /subject\s*line|email\s*subject/i,
      'meta-descriptions': /meta\s*desc|description\s*tag/i,
      'automation': /automat|workflow|trigger/i,
      'segmentation': /segment|audience|target/i
    };
    
    for (const [subtopic, pattern] of Object.entries(patterns)) {
      if (pattern.test(message)) {
        return subtopic;
      }
    }
    
    return null;
  }

  /**
   * Get human-readable topic label
   */
  getTopicLabel(topic) {
    const labels = {
      seo: 'SEO',
      email: 'Email Marketing',
      social: 'Social Media',
      directMail: 'Direct Mail',
      ads: 'Paid Advertising',
      'title-tags': 'Title Tags',
      'meta-descriptions': 'Meta Descriptions',
      'subject-lines': 'Subject Lines',
      'automation': 'Marketing Automation',
      'segmentation': 'Audience Segmentation'
    };
    
    return labels[topic] || topic.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Navigate back in conversation
   */
  navigateBack(userId, steps = 1) {
    const session = this.getSession(userId);
    
    if (session.breadcrumbs.length > steps) {
      // Remove breadcrumbs
      for (let i = 0; i < steps; i++) {
        session.breadcrumbs.pop();
      }
      
      // Update current topic
      const lastBreadcrumb = session.breadcrumbs[session.breadcrumbs.length - 1];
      if (lastBreadcrumb) {
        session.currentTopic = {
          main: lastBreadcrumb.topic,
          sub: null,
          startTime: new Date()
        };
      }
      
      return {
        success: true,
        currentLocation: lastBreadcrumb
      };
    }
    
    return {
      success: false,
      message: 'Cannot go back further'
    };
  }

  /**
   * Clear conversation session
   */
  clearSession(userId) {
    this.sessions.delete(userId);
  }

  /**
   * Clean up old sessions
   */
  cleanupSessions() {
    const now = Date.now();
    const expired = [];
    
    this.sessions.forEach((session, userId) => {
      if (now - session.lastActivity.getTime() > this.sessionTimeout) {
        expired.push(userId);
      }
    });
    
    expired.forEach(userId => this.sessions.delete(userId));
  }

  /**
   * Get session summary
   */
  getSessionSummary(userId) {
    const session = this.getSession(userId);
    
    return {
      duration: Date.now() - session.startTime.getTime(),
      messageCount: session.history.length,
      topicsDiscussed: this.getPreviousTopics(session).map(t => t.topic),
      currentStage: session.stage,
      businessContext: session.context,
      challenges: session.context.challenges,
      goals: session.context.goals
    };
  }
}

// Export singleton instance
export const conversationFlow = new ConversationFlow();
export default ConversationFlow;