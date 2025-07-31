/**
 * Quick Actions Configuration for CMO Mode
 * Defines context-sensitive quick actions for marketing tasks
 */

const quickActionsConfig = {
  // SEO Context Actions
  seo: [
    {
      id: 'analyze-page-seo',
      label: 'Analyze Page SEO',
      description: 'Perform comprehensive SEO analysis of a webpage',
      icon: 'search',
      requiresInput: true,
      inputPlaceholder: 'Enter page URL',
      handler: async (url) => ({
        action: 'seo_analysis',
        data: { url },
        prompt: `Analyze the SEO of this webpage: ${url}. Check title tags, meta descriptions, headers, keyword density, page speed, mobile-friendliness, and provide improvement recommendations.`
      })
    },
    {
      id: 'find-keywords',
      label: 'Find Keywords',
      description: 'Discover relevant keywords for your content',
      icon: 'tag',
      requiresInput: true,
      inputPlaceholder: 'Enter topic or seed keyword',
      handler: async (topic) => ({
        action: 'keyword_research',
        data: { topic },
        prompt: `Find high-value keywords related to "${topic}". Include search volume estimates, competition levels, and long-tail variations. Suggest content ideas for each keyword.`
      })
    },
    {
      id: 'check-rankings',
      label: 'Check Rankings',
      description: 'Check current search rankings for keywords',
      icon: 'trending-up',
      requiresInput: true,
      inputPlaceholder: 'Enter keywords (comma separated)',
      handler: async (keywords) => ({
        action: 'ranking_check',
        data: { keywords: keywords.split(',').map(k => k.trim()) },
        prompt: `Check current search rankings for these keywords: ${keywords}. Provide ranking positions, featured snippets status, and improvement strategies.`
      })
    },
    {
      id: 'competitor-seo',
      label: 'Competitor SEO Analysis',
      description: 'Analyze competitor SEO strategies',
      icon: 'users',
      requiresInput: true,
      inputPlaceholder: 'Enter competitor domain',
      handler: async (domain) => ({
        action: 'competitor_seo',
        data: { domain },
        prompt: `Analyze SEO strategy of ${domain}. Identify their top-ranking keywords, backlink profile, content strategy, and opportunities we can exploit.`
      })
    }
  ],

  // Email Marketing Context Actions
  email: [
    {
      id: 'write-campaign',
      label: 'Write Email Campaign',
      description: 'Create a complete email campaign',
      icon: 'mail',
      requiresInput: true,
      inputPlaceholder: 'Campaign goal (e.g., product launch)',
      handler: async (goal) => ({
        action: 'email_campaign',
        data: { goal },
        prompt: `Create a complete email campaign for: ${goal}. Include subject lines, preview text, email body, CTAs, and a 3-email sequence strategy.`
      })
    },
    {
      id: 'check-spam-score',
      label: 'Check Spam Score',
      description: 'Analyze email for spam triggers',
      icon: 'shield',
      requiresInput: true,
      inputPlaceholder: 'Paste email content',
      handler: async (content) => ({
        action: 'spam_check',
        data: { content },
        prompt: `Analyze this email content for spam triggers: "${content}". Check subject line, content, formatting, and provide a spam score with improvement suggestions.`
      })
    },
    {
      id: 'ab-test-ideas',
      label: 'A/B Test Ideas',
      description: 'Generate A/B testing ideas for emails',
      icon: 'split',
      requiresInput: true,
      inputPlaceholder: 'Email type (e.g., newsletter, promotion)',
      handler: async (type) => ({
        action: 'ab_test_ideas',
        data: { type },
        prompt: `Generate 10 A/B testing ideas for ${type} emails. Include subject lines, CTAs, layout variations, timing tests, and personalization options.`
      })
    },
    {
      id: 'email-personalization',
      label: 'Personalization Strategy',
      description: 'Create email personalization strategy',
      icon: 'user-check',
      handler: async () => ({
        action: 'personalization',
        prompt: 'Create a comprehensive email personalization strategy including segmentation criteria, dynamic content ideas, behavioral triggers, and personalization examples.'
      })
    }
  ],

  // Social Media Context Actions
  social: [
    {
      id: 'content-ideas',
      label: 'Content Ideas',
      description: 'Generate social media content ideas',
      icon: 'lightbulb',
      requiresInput: true,
      inputPlaceholder: 'Platform and theme',
      handler: async (input) => ({
        action: 'social_content',
        data: { input },
        prompt: `Generate 20 creative content ideas for ${input}. Include post types, captions, hashtags, and engagement strategies for each idea.`
      })
    },
    {
      id: 'best-times',
      label: 'Best Posting Times',
      description: 'Find optimal posting times',
      icon: 'clock',
      requiresInput: true,
      inputPlaceholder: 'Platform and audience',
      handler: async (input) => ({
        action: 'posting_times',
        data: { input },
        prompt: `Analyze best posting times for ${input}. Consider time zones, audience behavior, platform algorithms, and provide a weekly posting schedule.`
      })
    },
    {
      id: 'hashtag-research',
      label: 'Hashtag Research',
      description: 'Find trending and relevant hashtags',
      icon: 'hash',
      requiresInput: true,
      inputPlaceholder: 'Topic or niche',
      handler: async (topic) => ({
        action: 'hashtag_research',
        data: { topic },
        prompt: `Research hashtags for ${topic}. Find 30 relevant hashtags with different popularity levels, trending tags, and create hashtag sets for maximum reach.`
      })
    },
    {
      id: 'social-campaign',
      label: 'Social Campaign',
      description: 'Plan a social media campaign',
      icon: 'megaphone',
      requiresInput: true,
      inputPlaceholder: 'Campaign objective',
      handler: async (objective) => ({
        action: 'social_campaign',
        data: { objective },
        prompt: `Plan a comprehensive social media campaign for: ${objective}. Include content calendar, post examples, influencer strategy, paid promotion plan, and KPIs.`
      })
    }
  ],

  // Direct Mail Context Actions
  directMail: [
    {
      id: 'design-postcard',
      label: 'Design Postcard',
      description: 'Create direct mail postcard design',
      icon: 'image',
      requiresInput: true,
      inputPlaceholder: 'Campaign purpose',
      handler: async (purpose) => ({
        action: 'postcard_design',
        data: { purpose },
        prompt: `Design a direct mail postcard for ${purpose}. Include headline, body copy, CTA, design elements description, and variable data fields for personalization.`
      })
    },
    {
      id: 'calculate-roi',
      label: 'Calculate ROI',
      description: 'Calculate direct mail campaign ROI',
      icon: 'calculator',
      requiresInput: true,
      inputPlaceholder: 'List size, cost per piece, expected response rate',
      handler: async (input) => ({
        action: 'dm_roi',
        data: { input },
        prompt: `Calculate ROI for direct mail campaign with: ${input}. Include break-even analysis, profit projections, and recommendations for improving ROI.`
      })
    },
    {
      id: 'mailing-list',
      label: 'Build Mailing List',
      description: 'Strategy for building mailing lists',
      icon: 'list',
      requiresInput: true,
      inputPlaceholder: 'Target audience description',
      handler: async (audience) => ({
        action: 'mailing_list',
        data: { audience },
        prompt: `Create a strategy to build a mailing list for ${audience}. Include data sources, segmentation criteria, list hygiene practices, and compliance requirements.`
      })
    },
    {
      id: 'dm-creative',
      label: 'Creative Concepts',
      description: 'Generate direct mail creative concepts',
      icon: 'palette',
      requiresInput: true,
      inputPlaceholder: 'Product/service to promote',
      handler: async (product) => ({
        action: 'dm_creative',
        data: { product },
        prompt: `Generate 5 creative direct mail concepts for promoting ${product}. Include format ideas, messaging angles, design themes, and interactive elements.`
      })
    }
  ],

  // General/All Contexts Actions
  general: [
    {
      id: 'quick-analysis',
      label: 'Quick Analysis',
      description: 'Analyze any marketing data or content',
      icon: 'bar-chart',
      requiresInput: true,
      inputPlaceholder: 'Paste data or describe what to analyze',
      handler: async (input) => ({
        action: 'quick_analysis',
        data: { input },
        prompt: `Analyze this marketing data/content: ${input}. Provide insights, patterns, recommendations, and actionable next steps.`
      })
    },
    {
      id: 'campaign-idea',
      label: 'Campaign Idea',
      description: 'Generate a complete campaign concept',
      icon: 'zap',
      requiresInput: true,
      inputPlaceholder: 'Product/service and goal',
      handler: async (input) => ({
        action: 'campaign_idea',
        data: { input },
        prompt: `Create a complete marketing campaign concept for: ${input}. Include campaign name, key messages, channel strategy, timeline, budget allocation, and success metrics.`
      })
    },
    {
      id: 'content-calendar',
      label: 'Content Calendar',
      description: 'Build a content calendar',
      icon: 'calendar',
      requiresInput: true,
      inputPlaceholder: 'Time period and channels',
      handler: async (input) => ({
        action: 'content_calendar',
        data: { input },
        prompt: `Create a content calendar for ${input}. Include daily posting schedule, content themes, key dates, campaign tie-ins, and resource requirements.`
      })
    },
    {
      id: 'marketing-audit',
      label: 'Marketing Audit',
      description: 'Comprehensive marketing audit checklist',
      icon: 'check-circle',
      handler: async () => ({
        action: 'marketing_audit',
        prompt: 'Create a comprehensive marketing audit checklist covering brand, digital presence, content, SEO, social media, email, paid advertising, and analytics.'
      })
    }
  ],

  /**
   * Get actions by context
   */
  getActionsByContext(context) {
    const contextMap = {
      seo: this.seo,
      email: this.email,
      social: this.social,
      directMail: this.directMail,
      general: this.general
    };
    
    return contextMap[context] || this.general;
  },

  /**
   * Get all available actions
   */
  getAllActions() {
    return [
      ...this.seo,
      ...this.email,
      ...this.social,
      ...this.directMail,
      ...this.general
    ];
  },

  /**
   * Search actions by keyword
   */
  searchActions(keyword) {
    const allActions = this.getAllActions();
    const searchTerm = keyword.toLowerCase();
    
    return allActions.filter(action => 
      action.label.toLowerCase().includes(searchTerm) ||
      action.description.toLowerCase().includes(searchTerm)
    );
  },

  /**
   * Get action by ID
   */
  getActionById(id) {
    const allActions = this.getAllActions();
    return allActions.find(action => action.id === id);
  }
};

export default quickActionsConfig;