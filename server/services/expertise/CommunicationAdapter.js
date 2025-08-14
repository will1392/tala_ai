/**
 * Communication Adapter Service
 * Adapts AI responses based on user's expertise level
 */

class CommunicationAdapter {
  constructor() {
    this.jargonDictionary = this.initializeJargonDictionary();
    this.responseTemplates = this.initializeResponseTemplates();
  }

  /**
   * Initialize marketing jargon dictionary
   */
  initializeJargonDictionary() {
    return {
      'ROI': 'Return on Investment - the profit you make compared to what you spend',
      'CTR': 'Click-Through Rate - percentage of people who click your ad or link',
      'CPA': 'Cost Per Acquisition - how much it costs to get one customer',
      'SEO': 'Search Engine Optimization - making your website show up in Google searches',
      'PPC': 'Pay-Per-Click - ads where you pay each time someone clicks',
      'KPI': 'Key Performance Indicator - important numbers that show if you\'re succeeding',
      'CRM': 'Customer Relationship Management - system to track customer interactions',
      'CAC': 'Customer Acquisition Cost - total cost to get a new customer',
      'LTV': 'Lifetime Value - total revenue from a customer over time',
      'ROAS': 'Return on Ad Spend - revenue earned per dollar spent on ads',
      'CPM': 'Cost Per Thousand Impressions - cost to show your ad 1000 times',
      'CPC': 'Cost Per Click - how much you pay when someone clicks your ad',
      'Attribution': 'Tracking which marketing efforts led to a sale',
      'Funnel': 'The journey from first hearing about you to becoming a customer',
      'Conversion': 'When someone takes the action you want (like buying or signing up)',
      'Retargeting': 'Showing ads to people who already visited your website',
      'Organic': 'Free traffic from search engines or social media',
      'Impressions': 'Number of times your ad or content is shown',
      'Engagement': 'How much people interact with your content (likes, comments, shares)',
      'Bounce Rate': 'Percentage of visitors who leave immediately'
    };
  }

  /**
   * Initialize response templates for different levels
   */
  initializeResponseTemplates() {
    return {
      beginner: {
        greeting: "Hi! I'll help you understand marketing step by step. Don't worry about complex terms - I'll explain everything clearly.",
        explanation_style: 'simple',
        use_analogies: true,
        include_examples: true,
        avoid_jargon: true,
        structure: ['summary', 'explanation', 'example', 'action_steps']
      },
      intermediate: {
        greeting: "Hello! Let's work on improving your marketing strategies. I'll provide clear explanations with some technical details where helpful.",
        explanation_style: 'balanced',
        use_analogies: false,
        include_examples: true,
        avoid_jargon: false,
        structure: ['overview', 'details', 'best_practices', 'action_items']
      },
      advanced: {
        greeting: "Welcome back! Let's dive into advanced marketing strategies and optimization techniques.",
        explanation_style: 'technical',
        use_analogies: false,
        include_examples: false,
        avoid_jargon: false,
        structure: ['analysis', 'recommendations', 'metrics', 'optimization']
      },
      expert: {
        greeting: "Ready to explore cutting-edge marketing strategies and data-driven insights.",
        explanation_style: 'expert',
        use_analogies: false,
        include_examples: false,
        avoid_jargon: false,
        structure: ['insights', 'data', 'trends', 'innovation']
      }
    };
  }

  /**
   * Main method to adapt response based on expertise level
   */
  adaptResponse(response, userExpertiseLevel, context = {}) {
    switch (userExpertiseLevel) {
      case 'beginner':
        return this.beginnerAdaptation(response, context);
      case 'intermediate':
        return this.intermediateAdaptation(response, context);
      case 'advanced':
        return this.advancedAdaptation(response, context);
      case 'expert':
        return this.expertAdaptation(response, context);
      default:
        return this.beginnerAdaptation(response, context);
    }
  }

  /**
   * Beginner-level adaptation - Follow exact patterns from examples
   */
  beginnerAdaptation(response, context) {
    let adapted = response;

    // Apply beginner-specific patterns from examples
    adapted = this.applyBeginnerPatterns(adapted, context);

    // 1. Replace jargon with simple explanations
    adapted = this.replaceJargonWithDefinitions(adapted);

    // 2. Add concrete analogies and explanations
    adapted = this.addConcreteExplanations(adapted, context);

    // 3. Add step-by-step breakdowns with clear examples
    if (context.includeSteps) {
      adapted = this.addStepByStepGuide(adapted, context);
    }

    // 4. Include encouraging, supportive tone
    adapted = this.addEncouragingTone(adapted);

    // 5. Add helpful offer at the end
    adapted = this.addHelpfulOffer(adapted, context);

    return adapted;
  }

  /**
   * Apply specific beginner communication patterns from examples
   */
  applyBeginnerPatterns(response, context) {
    let adapted = response;

    // Pattern 1: Start with concrete explanations
    // "Email open rates tell you what percentage of people open your emails"
    adapted = this.addConcreteDefinitions(adapted, context);

    // Pattern 2: Use relatable analogies consistently
    // "Think of it like this - if you send 100 emails and 20 people open them"
    adapted = this.addMathematicalExamples(adapted, context);

    // Pattern 3: Structure with clear sections and simple language
    adapted = this.restructureForBeginners(adapted, context);

    // Pattern 4: Add concrete examples vs abstract concepts
    adapted = this.addConcreteExamples(adapted, context);

    return adapted;
  }

  /**
   * Add concrete definitions with mathematical examples
   */
  addConcreteDefinitions(response, context) {
    const definitions = {
      'open rate': 'Email open rates tell you what percentage of people open your emails. Think of it like this - if you send 100 emails and 20 people open them, that\'s a 20% open rate.',
      'click-through rate': 'Click-through rate tells you what percentage of people click links in your emails. If 100 people get your email and 5 click your link, that\'s a 5% click rate.',
      'conversion rate': 'Conversion rate shows what percentage of visitors do what you want. If 100 people visit your website and 3 buy something, that\'s a 3% conversion rate.',
      'bounce rate': 'Bounce rate shows what percentage of people leave immediately. If 100 people visit your page and 60 leave right away, that\'s a 60% bounce rate.'
    };

    Object.keys(definitions).forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      if (regex.test(response) && !response.includes(definitions[term])) {
        response = response.replace(regex, definitions[term]);
      }
    });

    return response;
  }

  /**
   * Add simple mathematical examples for clarity
   */
  addMathematicalExamples(response, context) {
    // Add simple math examples for percentages and rates
    if (context.topic === 'email' && response.includes('open rate')) {
      if (!response.includes('if you send 100 emails')) {
        response += '\n\n**Simple example**: If you send 100 emails and 20 people open them, that\'s a 20% open rate.';
      }
    }
    return response;
  }

  /**
   * Restructure content for beginner comprehension
   */
  restructureForBeginners(response, context) {
    // Break complex sentences into simple ones
    response = response.replace(/\. ([A-Z])/g, '.\n\n$1'); // Add more line breaks

    // Replace complex transitions with simple ones
    response = response.replace(/Furthermore,|Moreover,|Additionally,/g, 'Also,');
    response = response.replace(/However,|Nevertheless,/g, 'But');
    response = response.replace(/Therefore,|Consequently,/g, 'So');

    return response;
  }

  /**
   * Add concrete examples instead of abstract concepts
   */
  addConcreteExamples(response, context) {
    const concreteExamples = {
      'subject line': '"5 tips to save on travel" instead of "Newsletter #12"',
      'sender name': '"Sarah from TravelCo" is better than "noreply@company.com"',
      'email timing': 'Tuesdays and Thursdays often work well. Try 10 AM or 2 PM in your audience\'s timezone',
      'call to action': 'Use clear buttons like "Shop Now" instead of "Click Here"'
    };

    Object.keys(concreteExamples).forEach(concept => {
      if (response.toLowerCase().includes(concept) && !response.includes(concreteExamples[concept])) {
        response += `\n\n**Example**: ${concreteExamples[concept]}`;
      }
    });

    return response;
  }

  /**
   * Add helpful offer at the end (beginner pattern)
   */
  addHelpfulOffer(response, context) {
    const offers = {
      'email': 'Would you like me to help you write some subject lines to test?',
      'seo': 'Would you like me to help you choose keywords for your website?',
      'social': 'Would you like me to help you create a content calendar?',
      'ppc': 'Would you like me to help you set up your first ad campaign?',
      'content': 'Would you like me to help you brainstorm blog post ideas?',
      'analytics': 'Would you like me to help you set up basic tracking?'
    };

    const topic = context.topic || context.channel || 'marketing';
    const offer = offers[topic.toLowerCase()] || 'Would you like me to help you get started with this?';
    
    if (!response.includes('Would you like me to help')) {
      response += `\n\n${offer}`;
    }

    return response;
  }

  /**
   * Intermediate-level adaptation
   */
  intermediateAdaptation(response, context) {
    let adapted = response;

    // 1. Keep some jargon but provide context
    adapted = this.addJargonContext(adapted);

    // 2. Include best practices
    if (context.topic) {
      adapted += `\n\n✅ **Best Practices**:\n${this.getBestPractices(context.topic, 'intermediate')}`;
    }

    // 3. Add performance benchmarks
    adapted = this.addBenchmarks(adapted, context, 'intermediate');

    // 4. Include optimization tips
    adapted += '\n\n🚀 **Quick Optimization Tips**:\n' + this.getOptimizationTips(context, 'intermediate');

    return adapted;
  }

  /**
   * Advanced-level adaptation
   */
  advancedAdaptation(response, context) {
    let adapted = response;

    // 1. Focus on data and metrics
    adapted = this.enrichWithData(adapted, context);

    // 2. Add advanced strategies
    if (context.topic) {
      adapted += `\n\n📊 **Advanced Strategies**:\n${this.getAdvancedStrategies(context.topic)}`;
    }

    // 3. Include industry trends
    adapted = this.addIndustryTrends(adapted, context);

    // 4. Provide A/B testing ideas
    adapted += '\n\n🔬 **Testing Opportunities**:\n' + this.generateTestingIdeas(context);

    return adapted;
  }

  /**
   * Expert-level adaptation - Follow exact patterns from examples
   */
  expertAdaptation(response, context) {
    let adapted = response;

    // Apply expert-specific patterns from examples
    adapted = this.applyExpertPatterns(adapted, context);

    // 1. Lead with benchmarks and data
    adapted = this.addIndustryBenchmarks(adapted, context);

    // 2. Structure with technical categories
    adapted = this.addTechnicalSections(adapted, context);

    // 3. Use precise terminology without explanation
    adapted = this.addPreciseTechnology(adapted, context);

    // 4. End with strategic questions
    adapted = this.addStrategicQuestions(adapted, context);

    return adapted;
  }

  /**
   * Apply specific expert communication patterns from examples
   */
  applyExpertPatterns(response, context) {
    let adapted = response;

    // Pattern 1: Start with benchmarks
    // "Current industry benchmarks: 21.5% average, 25%+ is excellent"
    adapted = this.leadWithBenchmarks(adapted, context);

    // Pattern 2: Use technical categorization
    // "Technical Factors:", "Content Optimization:", "Advanced Tactics:"
    adapted = this.structureWithTechnicalCategories(adapted, context);

    // Pattern 3: Assume technical knowledge
    adapted = this.assumeTechnicalKnowledge(adapted, context);

    // Pattern 4: End with data questions
    // "What's your current open rate and list composition?"
    adapted = this.addDataRequests(adapted, context);

    return adapted;
  }

  /**
   * Lead with industry benchmarks and data
   */
  leadWithBenchmarks(response, context) {
    const benchmarks = {
      'email open rate': 'Current industry benchmarks: 21.5% average, 25%+ is excellent.',
      'email click rate': 'Industry benchmarks: 2.6% average CTR, 4%+ is excellent.',
      'conversion rate': 'E-commerce conversion benchmarks: 2.3% average, 5%+ is excellent.',
      'seo ctr': 'Organic CTR benchmarks: Position 1 averages 28.5%, position 3 drops to 11%.',
      'ppc ctr': 'Google Ads CTR benchmarks: 3.17% search, 0.46% display network.',
      'social engagement': 'Social engagement benchmarks: 1.22% average, 3%+ indicates strong content.'
    };

    const topic = context.topic || context.channel || '';
    Object.keys(benchmarks).forEach(metric => {
      if (topic.toLowerCase().includes(metric.split(' ')[0]) || response.toLowerCase().includes(metric)) {
        if (!response.includes('benchmark') && !response.includes('average')) {
          response = `${benchmarks[metric]} Let's optimize:\n\n${response}`;
        }
      }
    });

    return response;
  }

  /**
   * Structure with technical categories (expert pattern)
   */
  structureWithTechnicalCategories(response, context) {
    if (context.topic === 'email' && response.includes('open rate')) {
      const sections = [
        {
          title: 'Technical Factors:',
          items: [
            'Authentication: Ensure SPF/DKIM/DMARC are properly configured',
            'List hygiene: Remove unengaged subscribers (no opens in 6+ months)',
            'Segmentation: Behavior-based segments typically see 14% higher open rates'
          ]
        },
        {
          title: 'Content Optimization:',
          items: [
            'Subject lines: A/B test length (6-10 words optimal), personalization tokens, urgency indicators',
            'Preheader text: Complement subject, 40-100 characters',
            'From name: Test personal vs brand (varies by industry)'
          ]
        },
        {
          title: 'Advanced Tactics:',
          items: [
            'Send time optimization using engagement data',
            'Re-engagement campaigns for dormant segments',
            'Dynamic content based on user behavior'
          ]
        }
      ];

      let structuredContent = '';
      sections.forEach(section => {
        structuredContent += `\n\n**${section.title}**\n`;
        section.items.forEach(item => {
          structuredContent += `• ${item}\n`;
        });
      });

      response += structuredContent;
    }

    return response;
  }

  /**
   * Assume technical knowledge without basic explanations
   */
  assumeTechnicalKnowledge(response, context) {
    // Remove beginner explanations and basic definitions
    response = response.replace(/\(.*?\)/g, ''); // Remove parenthetical explanations
    response = response.replace(/Think of it like.*?\./, ''); // Remove analogies
    response = response.replace(/This means.*?\./, ''); // Remove basic explanations
    
    // Use technical terminology without definition
    const technicalTerms = {
      'email deliverability': 'deliverability',
      'click-through rate': 'CTR',
      'return on investment': 'ROI',
      'cost per acquisition': 'CPA',
      'customer lifetime value': 'CLV'
    };

    Object.keys(technicalTerms).forEach(term => {
      const regex = new RegExp(term, 'gi');
      response = response.replace(regex, technicalTerms[term]);
    });

    return response;
  }

  /**
   * Add strategic data questions at the end (expert pattern)
   */
  addDataRequests(response, context) {
    const dataQuestions = {
      'email': 'What\'s your current open rate and list composition?',
      'seo': 'What\'s your current organic CTR and average position?',
      'ppc': 'What\'s your current Quality Score and CPA?',
      'social': 'What\'s your current engagement rate and reach?',
      'content': 'What\'s your current organic traffic and conversion rate?',
      'analytics': 'What\'s your current attribution model and conversion lag?'
    };

    const topic = context.topic || context.channel || 'marketing';
    const question = dataQuestions[topic.toLowerCase()] || 'What\'s your current performance data and KPIs?';
    
    if (!response.includes('What\'s your current')) {
      response += `\n\n${question}`;
    }

    return response;
  }

  /**
   * Add technical sections with specific metrics
   */
  addTechnicalSections(response, context) {
    // Add technical depth based on context
    if (context.includeMetrics) {
      response += '\n\n**Key Metrics to Track:**\n';
      response += this.getTechnicalMetrics(context);
    }

    if (context.includeTools) {
      response += '\n\n**Technical Stack:**\n';
      response += this.getTechnicalTools(context);
    }

    return response;
  }

  /**
   * Get technical metrics for experts
   */
  getTechnicalMetrics(context) {
    const metrics = {
      'email': [
        '• Deliverability rate and inbox placement',
        '• List growth rate and churn analysis',
        '• Engagement scoring and predictive modeling',
        '• Attribution across customer journey'
      ],
      'seo': [
        '• Core Web Vitals and page experience signals',
        '• Entity salience and topical authority',
        '• Click-through rate optimization',
        '• SERP feature visibility'
      ],
      'ppc': [
        '• Quality Score components and optimization',
        '• Auction insights and competitive analysis',
        '• Attribution modeling and incrementality',
        '• Budget allocation efficiency'
      ]
    };

    const topic = context.topic || context.channel || 'email';
    return (metrics[topic.toLowerCase()] || metrics.email).join('\n');
  }

  /**
   * Get technical tools for experts
   */
  getTechnicalTools(context) {
    const tools = {
      'email': [
        '• ESP APIs for automated optimization',
        '• Predictive analytics platforms',
        '• Advanced segmentation engines',
        '• Multi-touch attribution systems'
      ],
      'seo': [
        '• Technical SEO audit tools',
        '• Rank tracking and SERP analysis',
        '• Content optimization platforms',
        '• Link analysis and competitive intelligence'
      ]
    };

    const topic = context.topic || context.channel || 'email';
    return (tools[topic.toLowerCase()] || tools.email).join('\n');
  }

  /**
   * Helper methods for adaptations
   */
  replaceJargonWithDefinitions(text) {
    let adapted = text;
    Object.keys(this.jargonDictionary).forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      if (regex.test(adapted)) {
        adapted = adapted.replace(regex, `${term} (${this.jargonDictionary[term]})`);
      }
    });
    return adapted;
  }

  addStepByStepGuide(text, context) {
    const steps = this.generateStepsForTopic(context.topic);
    return text + '\n\n📋 **Step-by-Step Guide**:\n' + steps.map((step, i) => `${i + 1}. ${step}`).join('\n');
  }

  addAnalogies(text, context) {
    const analogies = {
      'email marketing': 'Think of email marketing like sending personalized letters to friends - you want to send the right message to the right person at the right time.',
      'SEO': 'SEO is like organizing a library - you want to make it easy for people to find exactly what they\'re looking for.',
      'social media': 'Social media marketing is like hosting a party - you want to create engaging conversations and make people want to come back.',
      'PPC': 'PPC advertising is like renting a billboard - you pay to show your message to people driving by.',
      'content marketing': 'Content marketing is like teaching a free class - you share valuable knowledge to build trust and attract customers.'
    };

    if (context.topic && analogies[context.topic.toLowerCase()]) {
      return text + `\n\n🌟 **Simple way to think about it**: ${analogies[context.topic.toLowerCase()]}`;
    }
    return text;
  }

  addEncouragingTone(text) {
    const encouragements = [
      "You're doing great! ",
      "Don't worry if this seems complex at first - ",
      "Every expert started where you are now. ",
      "Great question! "
    ];
    return encouragements[Math.floor(Math.random() * encouragements.length)] + text;
  }

  addVisualCues(text, level) {
    if (level === 'beginner') {
      // Add emojis for key concepts
      text = text.replace(/important/gi, '⚠️ important');
      text = text.replace(/tip:/gi, '💡 tip:');
      text = text.replace(/warning:/gi, '⚠️ warning:');
      text = text.replace(/success/gi, '✅ success');
    }
    return text;
  }

  generateStepsForTopic(topic) {
    const topicSteps = {
      'email campaign': [
        'Define your goal (what do you want people to do?)',
        'Choose your audience (who needs to hear this?)',
        'Write a compelling subject line (make them want to open it)',
        'Create valuable content (give them something useful)',
        'Add a clear call-to-action (tell them what to do next)',
        'Test with a small group first',
        'Send and monitor results'
      ],
      'seo optimization': [
        'Research what your customers search for',
        'Choose one main keyword for your page',
        'Include that keyword in your title and headings',
        'Write helpful content that answers their questions',
        'Make sure your page loads quickly',
        'Get other websites to link to yours'
      ]
    };

    return topicSteps[topic?.toLowerCase()] || [
      'Define your objective',
      'Research your audience',
      'Create your content/campaign',
      'Test on a small scale',
      'Launch and monitor',
      'Optimize based on results'
    ];
  }

  getBestPractices(topic, level) {
    const practices = {
      'email marketing': [
        '• Personalize subject lines (increases open rates by 26%)',
        '• Send at optimal times (Tuesday-Thursday, 10am or 2pm)',
        '• Keep subject lines under 50 characters',
        '• Include one clear CTA per email',
        '• A/B test subject lines and content'
      ],
      'seo': [
        '• Target keywords with 100-1000 monthly searches',
        '• Aim for content length of 1,500+ words',
        '• Include keywords in first 100 words',
        '• Optimize for featured snippets',
        '• Build high-quality backlinks'
      ]
    };

    return (practices[topic?.toLowerCase()] || practices['email marketing']).join('\n');
  }

  generateBeginnerNextSteps(context) {
    return [
      '1. Start with one marketing channel',
      '2. Set a simple, measurable goal',
      '3. Create your first campaign',
      '4. Track your results',
      '5. Learn from what works and improve'
    ].join('\n');
  }

  getOptimizationTips(context, level) {
    const tips = {
      intermediate: [
        '• Test different subject lines to improve open rates',
        '• Segment your audience for better targeting',
        '• Use automation to save time',
        '• Track conversion paths, not just clicks',
        '• Optimize for mobile users'
      ],
      advanced: [
        '• Implement multi-touch attribution',
        '• Use predictive analytics for audience targeting',
        '• Create dynamic content based on user behavior',
        '• Optimize for micro-conversions',
        '• Leverage machine learning for bid optimization'
      ]
    };

    return (tips[level] || tips.intermediate).join('\n');
  }

  /**
   * Generate response based on expertise and context
   */
  generateAdaptedResponse(query, userProfile, context = {}) {
    const level = userProfile.marketing_expertise_level || 'beginner';
    const template = this.responseTemplates[level];
    
    // Build response structure based on level
    let response = '';

    // Add appropriate greeting if it's the start of conversation
    if (context.isFirstMessage) {
      response = template.greeting + '\n\n';
    }

    // Adapt the main response
    const baseResponse = context.baseResponse || query;
    response += this.adaptResponse(baseResponse, level, context);

    // Add relevant resources based on user's expertise areas
    if (userProfile.expertise_areas) {
      const weakAreas = Object.entries(userProfile.expertise_areas)
        .filter(([_, data]) => data.score < 0.5)
        .map(([area]) => area);

      if (weakAreas.length > 0 && level !== 'expert') {
        response += `\n\n📚 **Resources to strengthen your skills in ${weakAreas.join(', ')}**:`;
        response += this.getResourcesForAreas(weakAreas, level);
      }
    }

    return response;
  }

  /**
   * Check if response needs simplification
   */
  needsSimplification(text, level) {
    if (level === 'expert' || level === 'advanced') return false;

    const complexityIndicators = {
      jargonCount: (text.match(/\b(ROI|CTR|CPA|CAC|LTV|ROAS|CPM|CPC|KPI|CRM)\b/g) || []).length,
      sentenceLength: text.split('.').map(s => s.split(' ').length),
      avgSentenceLength: 0
    };

    complexityIndicators.avgSentenceLength = 
      complexityIndicators.sentenceLength.reduce((a, b) => a + b, 0) / complexityIndicators.sentenceLength.length;

    // Needs simplification if:
    // - More than 3 jargon terms for beginners
    // - Average sentence length > 20 words
    // - Contains technical concepts without explanation
    return (
      (level === 'beginner' && complexityIndicators.jargonCount > 3) ||
      complexityIndicators.avgSentenceLength > 20
    );
  }

  /**
   * Format response for readability
   */
  formatForReadability(text, level) {
    let formatted = text;

    // Add headers for sections
    formatted = formatted.replace(/^(\d+\.\s)/gm, '\n**$1**');
    
    // Add bullet points for lists
    formatted = formatted.replace(/^-\s/gm, '• ');

    // Break up long paragraphs
    const paragraphs = formatted.split('\n\n');
    const maxLength = level === 'beginner' ? 3 : 5; // sentences per paragraph
    
    formatted = paragraphs.map(para => {
      const sentences = para.split('. ');
      if (sentences.length > maxLength) {
        const chunks = [];
        for (let i = 0; i < sentences.length; i += maxLength) {
          chunks.push(sentences.slice(i, i + maxLength).join('. '));
        }
        return chunks.join('\n\n');
      }
      return para;
    }).join('\n\n');

    return formatted;
  }
}

export default CommunicationAdapter;