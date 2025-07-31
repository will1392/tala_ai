/**
 * Content Generation Service for CMO Mode
 * Provides AI-powered content generation with tone adjustment, platform optimization, and performance predictions
 */

import CMOAssistant from './CMOAssistant.js';
import TalaIntelligence from '../intelligence/TalaIntelligence.js';

class ContentGenerationService {
  constructor() {
    this.cmoAssistant = new CMOAssistant();
    this.intelligence = new TalaIntelligence();
    
    // Template library for different content types
    this.templates = {
      email: {
        promotional: 'Create compelling promotional email with clear value proposition and CTA',
        newsletter: 'Design engaging newsletter with multiple sections and personalization',
        welcome: 'Write warm welcome email that builds relationship and sets expectations',
        followup: 'Craft follow-up email that maintains engagement without being pushy'
      },
      social: {
        educational: 'Create educational content that provides value while showcasing expertise',
        engaging: 'Write engaging post that encourages interaction and shares',
        promotional: 'Develop promotional content that feels natural and valuable',
        trending: 'Create content that leverages current trends and hashtags'
      },
      blog: {
        howTo: 'Structure comprehensive how-to guide with actionable steps',
        listicle: 'Create compelling listicle with valuable insights',
        caseStudy: 'Develop detailed case study showcasing results and learnings',
        thought: 'Write thought leadership piece establishing authority'
      },
      ad: {
        search: 'Create search ad copy optimized for keywords and conversions',
        display: 'Write display ad copy that captures attention and drives clicks',
        social: 'Develop social ad copy that feels native to the platform',
        video: 'Script video ad copy with strong hook and clear message'
      }
    };
  }

  /**
   * Generate content with AI assistance
   */
  async generateContent(type, prompt, options = {}) {
    try {
      // Enhance prompt with context and best practices
      const enhancedPrompt = await this.enhancePrompt(type, prompt, options);
      
      // Generate content using CMO Assistant
      const response = await this.cmoAssistant.generateResponse(enhancedPrompt, {
        context: type,
        temperature: options.creativity || 0.7,
        maxTokens: options.maxLength || 1000
      });
      
      // Parse and structure the response
      const structuredContent = this.parseContentResponse(type, response);
      
      // Apply post-processing
      const finalContent = await this.postProcessContent(structuredContent, options);
      
      // Add performance predictions
      if (options.includePredictions) {
        finalContent.predictions = await this.predictPerformance(type, finalContent);
      }
      
      return finalContent;
    } catch (error) {
      console.error('Content generation error:', error);
      throw new Error(`Failed to generate ${type} content: ${error.message}`);
    }
  }

  /**
   * Enhance prompt with context and best practices
   */
  async enhancePrompt(type, basePrompt, options) {
    const template = this.templates[type]?.[options.subtype] || '';
    const context = await this.getGenerationContext(type, options);
    
    return `
      ${template}
      
      User Request: ${basePrompt}
      
      Context:
      - Target Audience: ${options.audience || 'General'}
      - Tone: ${options.tone || 'Professional'}
      - Platform: ${options.platform || 'General'}
      - Goals: ${options.goals || 'Engagement'}
      ${context.additionalContext}
      
      Requirements:
      - Include relevant keywords naturally
      - Optimize for ${options.platform || 'multi-platform'} best practices
      - Maintain consistent brand voice
      - Include clear call-to-action
      ${this.getTypeSpecificRequirements(type, options)}
    `;
  }

  /**
   * Get generation context based on type and options
   */
  async getGenerationContext(type, options) {
    const context = {
      additionalContext: '',
      keywords: options.keywords || [],
      competitors: options.competitors || [],
      brandGuidelines: options.brandGuidelines || {}
    };
    
    // Add type-specific context
    switch (type) {
      case 'email':
        context.additionalContext = `
          - Subject line character limit: 60
          - Preview text character limit: 100
          - Mobile optimization required
          - Personalization tokens available: {{first_name}}, {{company}}, {{location}}
        `;
        break;
        
      case 'social':
        context.additionalContext = `
          - Platform character limits apply
          - Include relevant hashtags (5-10 for Instagram, 2-3 for Twitter)
          - Optimize for platform algorithm
          - Consider visual content pairing
        `;
        break;
        
      case 'blog':
        context.additionalContext = `
          - SEO optimization critical
          - Include H2/H3 structure
          - Target featured snippet opportunity
          - Include internal/external links
        `;
        break;
        
      case 'ad':
        context.additionalContext = `
          - Platform character limits strictly enforced
          - Include emotional triggers
          - Focus on single clear message
          - A/B testing variations recommended
        `;
        break;
    }
    
    return context;
  }

  /**
   * Get type-specific requirements
   */
  getTypeSpecificRequirements(type, options) {
    const requirements = {
      email: `
        - Subject line that increases open rates
        - Preview text that complements subject
        - Clear primary and secondary CTAs
        - Mobile-responsive formatting
        - Unsubscribe compliance
      `,
      social: `
        - Platform-specific formatting
        - Hashtag recommendations
        - Optimal posting time suggestion
        - Engagement hooks
        - Visual content suggestions
      `,
      blog: `
        - SEO-optimized title and meta description
        - Keyword density 1-2%
        - Scannable formatting with subheadings
        - Internal linking opportunities
        - Call-to-action placement
      `,
      ad: `
        - Attention-grabbing headline
        - Clear value proposition
        - Urgency/scarcity elements
        - Platform compliance
        - Landing page alignment
      `
    };
    
    return requirements[type] || '';
  }

  /**
   * Parse content response based on type
   */
  parseContentResponse(type, response) {
    const parsers = {
      email: this.parseEmailResponse,
      social: this.parseSocialResponse,
      blog: this.parseBlogResponse,
      ad: this.parseAdResponse
    };
    
    const parser = parsers[type] || this.parseGenericResponse;
    return parser.call(this, response);
  }

  /**
   * Parse email response
   */
  parseEmailResponse(response) {
    const lines = response.split('\n');
    const content = {
      subject: '',
      previewText: '',
      body: '',
      cta: '',
      type: 'email'
    };
    
    // Extract components
    for (const line of lines) {
      if (line.toLowerCase().includes('subject:')) {
        content.subject = line.split(':').slice(1).join(':').trim();
      } else if (line.toLowerCase().includes('preview:')) {
        content.previewText = line.split(':').slice(1).join(':').trim();
      } else if (line.toLowerCase().includes('cta:')) {
        content.cta = line.split(':').slice(1).join(':').trim();
      }
    }
    
    // Extract body (everything else)
    content.body = response
      .replace(/subject:.*\n/i, '')
      .replace(/preview:.*\n/i, '')
      .replace(/cta:.*\n/i, '')
      .trim();
    
    return content;
  }

  /**
   * Parse social response
   */
  parseSocialResponse(response) {
    const content = {
      text: response,
      hashtags: [],
      mentions: [],
      emojis: [],
      type: 'social'
    };
    
    // Extract hashtags
    content.hashtags = (response.match(/#\w+/g) || []);
    
    // Extract mentions
    content.mentions = (response.match(/@\w+/g) || []);
    
    // Extract emojis
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu;
    content.emojis = (response.match(emojiRegex) || []);
    
    // Clean text (without hashtags at the end if grouped)
    content.text = response.replace(/(\s+#\w+)+$/g, '').trim();
    
    return content;
  }

  /**
   * Parse blog response
   */
  parseBlogResponse(response) {
    const content = {
      title: '',
      metaDescription: '',
      outline: [],
      introduction: '',
      sections: [],
      conclusion: '',
      type: 'blog'
    };
    
    // Parse structured blog content
    const lines = response.split('\n');
    let currentSection = null;
    
    for (const line of lines) {
      if (line.startsWith('# ')) {
        content.title = line.substring(2).trim();
      } else if (line.startsWith('## ')) {
        currentSection = {
          heading: line.substring(3).trim(),
          content: ''
        };
        content.sections.push(currentSection);
      } else if (currentSection) {
        currentSection.content += line + '\n';
      }
    }
    
    return content;
  }

  /**
   * Parse ad response
   */
  parseAdResponse(response) {
    const lines = response.split('\n').filter(line => line.trim());
    
    return {
      headline: lines[0] || '',
      description: lines[1] || '',
      displayUrl: lines[2] || '',
      callToAction: lines[3] || 'Learn More',
      extensions: lines.slice(4),
      type: 'ad'
    };
  }

  /**
   * Parse generic response
   */
  parseGenericResponse(response) {
    return {
      content: response,
      type: 'generic'
    };
  }

  /**
   * Post-process content
   */
  async postProcessContent(content, options) {
    // Apply tone adjustments
    if (options.tone && options.tone !== 'neutral') {
      content = await this.adjustTone(content, options.tone);
    }
    
    // Apply platform optimizations
    if (options.platform) {
      content = await this.optimizeForPlatform(content, options.platform);
    }
    
    // Apply length constraints
    if (options.maxLength) {
      content = this.enforceLength(content, options.maxLength);
    }
    
    // Add personalization tokens
    if (options.personalization) {
      content = this.addPersonalization(content, options.personalization);
    }
    
    return content;
  }

  /**
   * Adjust content tone
   */
  async adjustTone(content, targetTone) {
    const toneAdjustments = {
      professional: {
        keywords: ['professional', 'expertise', 'solution', 'strategic'],
        style: 'formal, authoritative, data-driven'
      },
      friendly: {
        keywords: ['hey', 'thanks', 'awesome', 'excited'],
        style: 'conversational, warm, approachable'
      },
      casual: {
        keywords: ['cool', 'check out', 'stuff', 'tons of'],
        style: 'relaxed, informal, relatable'
      },
      urgent: {
        keywords: ['now', 'limited', 'ends soon', 'don\'t miss'],
        style: 'immediate, compelling, action-oriented'
      },
      empathetic: {
        keywords: ['understand', 'feel', 'support', 'together'],
        style: 'caring, supportive, understanding'
      }
    };
    
    const adjustment = toneAdjustments[targetTone];
    if (!adjustment) return content;
    
    // Apply tone adjustments based on content type
    if (typeof content === 'string') {
      return this.applyToneToText(content, adjustment);
    } else if (content.body) {
      content.body = this.applyToneToText(content.body, adjustment);
    } else if (content.text) {
      content.text = this.applyToneToText(content.text, adjustment);
    }
    
    return content;
  }

  /**
   * Apply tone adjustments to text
   */
  applyToneToText(text, adjustment) {
    // This is a simplified version - in production, use more sophisticated NLP
    let adjustedText = text;
    
    // Add tone-appropriate phrases
    const toneIndicators = {
      professional: ['I would like to', 'It is important to', 'We recommend'],
      friendly: ['I\'d love to', 'It\'s great to', 'We\'re excited to'],
      casual: ['Want to', 'It\'s cool to', 'We\'re pumped to'],
      urgent: ['You need to', 'It\'s critical to', 'Act now to'],
      empathetic: ['I understand that', 'We know that', 'We\'re here to']
    };
    
    // Simple tone adjustment logic
    // In production, use advanced NLP for better results
    return adjustedText;
  }

  /**
   * Optimize content for specific platform
   */
  async optimizeForPlatform(content, platform) {
    const platformLimits = {
      twitter: { text: 280, hashtags: 3 },
      instagram: { text: 2200, hashtags: 30 },
      facebook: { text: 63206, hashtags: 5 },
      linkedin: { text: 3000, hashtags: 5 },
      tiktok: { text: 2200, hashtags: 10 }
    };
    
    const limits = platformLimits[platform.toLowerCase()];
    if (!limits) return content;
    
    // Apply platform-specific optimizations
    if (content.text && content.text.length > limits.text) {
      content.text = this.truncateSmartly(content.text, limits.text);
    }
    
    if (content.hashtags && content.hashtags.length > limits.hashtags) {
      content.hashtags = content.hashtags.slice(0, limits.hashtags);
    }
    
    // Add platform-specific metadata
    content.platformOptimized = platform;
    content.characterCount = content.text ? content.text.length : 0;
    
    return content;
  }

  /**
   * Enforce length constraints
   */
  enforceLength(content, maxLength) {
    if (typeof content === 'string' && content.length > maxLength) {
      return this.truncateSmartly(content, maxLength);
    } else if (content.body && content.body.length > maxLength) {
      content.body = this.truncateSmartly(content.body, maxLength);
    } else if (content.text && content.text.length > maxLength) {
      content.text = this.truncateSmartly(content.text, maxLength);
    }
    
    return content;
  }

  /**
   * Smart truncation that preserves meaning
   */
  truncateSmartly(text, maxLength) {
    if (text.length <= maxLength) return text;
    
    // Try to truncate at sentence boundary
    const truncated = text.substring(0, maxLength);
    const lastPeriod = truncated.lastIndexOf('.');
    const lastExclamation = truncated.lastIndexOf('!');
    const lastQuestion = truncated.lastIndexOf('?');
    
    const lastSentence = Math.max(lastPeriod, lastExclamation, lastQuestion);
    
    if (lastSentence > maxLength * 0.8) {
      return truncated.substring(0, lastSentence + 1);
    }
    
    // Otherwise truncate at word boundary
    const lastSpace = truncated.lastIndexOf(' ');
    return truncated.substring(0, lastSpace) + '...';
  }

  /**
   * Add personalization tokens
   */
  addPersonalization(content, personalizationData) {
    const tokens = {
      firstName: '{{first_name}}',
      lastName: '{{last_name}}',
      company: '{{company}}',
      location: '{{location}}',
      title: '{{title}}',
      industry: '{{industry}}'
    };
    
    // Add personalization to appropriate places
    if (content.subject) {
      content.subject = `${tokens.firstName}, ${content.subject}`;
    }
    
    if (content.body) {
      content.body = content.body.replace(
        /Hi there|Hello|Dear Customer/gi,
        `Hi ${tokens.firstName}`
      );
    }
    
    return content;
  }

  /**
   * Predict content performance
   */
  async predictPerformance(type, content) {
    const predictions = {
      email: await this.predictEmailPerformance(content),
      social: await this.predictSocialPerformance(content),
      blog: await this.predictBlogPerformance(content),
      ad: await this.predictAdPerformance(content)
    };
    
    return predictions[type] || { score: 0, insights: [] };
  }

  /**
   * Predict email performance
   */
  async predictEmailPerformance(content) {
    const factors = {
      subjectLength: this.scoreSubjectLength(content.subject),
      personalization: content.subject?.includes('{{') ? 15 : 0,
      urgency: this.detectUrgency(content.subject) ? 10 : 0,
      clarity: this.scoreClaritySimple(content.body),
      ctaStrength: this.scoreCTA(content.cta),
      mobileOptimized: content.body?.length < 1000 ? 10 : 0
    };
    
    const totalScore = Object.values(factors).reduce((a, b) => a + b, 0);
    
    return {
      score: Math.min(100, totalScore),
      openRatePrediction: `${15 + (totalScore / 10)}% - ${20 + (totalScore / 8)}%`,
      clickRatePrediction: `${2 + (totalScore / 30)}% - ${4 + (totalScore / 25)}%`,
      factors,
      insights: this.generateEmailInsights(factors)
    };
  }

  /**
   * Predict social performance
   */
  async predictSocialPerformance(content) {
    const factors = {
      hashtagRelevance: content.hashtags?.length > 0 ? 20 : 0,
      contentLength: this.scoreSocialLength(content.text),
      emojiUsage: content.emojis?.length > 0 ? 10 : 0,
      callToAction: this.detectCTA(content.text) ? 15 : 0,
      engagement: this.scoreEngagement(content.text)
    };
    
    const totalScore = Object.values(factors).reduce((a, b) => a + b, 0);
    
    return {
      score: Math.min(100, totalScore),
      engagementRatePrediction: `${3 + (totalScore / 20)}% - ${5 + (totalScore / 15)}%`,
      reachMultiplier: `${1.2 + (totalScore / 100)}x - ${1.5 + (totalScore / 50)}x`,
      factors,
      insights: this.generateSocialInsights(factors)
    };
  }

  /**
   * Predict blog performance
   */
  async predictBlogPerformance(content) {
    const factors = {
      titleOptimization: this.scoreBlogTitle(content.title),
      structureQuality: content.sections?.length > 3 ? 20 : 10,
      readability: this.scoreReadability(content),
      seoOptimization: this.scoreSEO(content),
      valueProvided: this.scoreValue(content)
    };
    
    const totalScore = Object.values(factors).reduce((a, b) => a + b, 0);
    
    return {
      score: Math.min(100, totalScore),
      organicTrafficPrediction: `${500 + (totalScore * 10)} - ${1000 + (totalScore * 20)} monthly visits`,
      timeOnPagePrediction: `${2 + (totalScore / 30)} - ${4 + (totalScore / 20)} minutes`,
      factors,
      insights: this.generateBlogInsights(factors)
    };
  }

  /**
   * Predict ad performance
   */
  async predictAdPerformance(content) {
    const factors = {
      headlineImpact: this.scoreHeadline(content.headline),
      valueProposition: this.scoreValueProp(content.description),
      ctaStrength: this.scoreCTA(content.callToAction),
      urgency: this.detectUrgency(content.headline + content.description) ? 15 : 0,
      relevance: 20 // Base relevance score
    };
    
    const totalScore = Object.values(factors).reduce((a, b) => a + b, 0);
    
    return {
      score: Math.min(100, totalScore),
      ctrPrediction: `${1.5 + (totalScore / 40)}% - ${3 + (totalScore / 30)}%`,
      conversionRatePrediction: `${0.5 + (totalScore / 100)}% - ${1 + (totalScore / 60)}%`,
      qualityScore: Math.min(10, 5 + Math.floor(totalScore / 20)),
      factors,
      insights: this.generateAdInsights(factors)
    };
  }

  // Scoring helper methods
  scoreSubjectLength(subject) {
    if (!subject) return 0;
    const length = subject.length;
    if (length >= 30 && length <= 50) return 20;
    if (length >= 20 && length <= 60) return 15;
    return 10;
  }

  detectUrgency(text) {
    if (!text) return false;
    const urgencyWords = ['limited', 'now', 'today', 'ends', 'hurry', 'last chance', 'final'];
    return urgencyWords.some(word => text.toLowerCase().includes(word));
  }

  scoreClaritySimple(text) {
    if (!text) return 0;
    // Simple clarity score based on sentence length and complexity
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    const avgWordsPerSentence = text.split(' ').length / sentences.length;
    if (avgWordsPerSentence < 20) return 20;
    if (avgWordsPerSentence < 30) return 15;
    return 10;
  }

  scoreCTA(cta) {
    if (!cta) return 0;
    const strongCTAs = ['get started', 'claim', 'save', 'download', 'try free', 'sign up'];
    return strongCTAs.some(strong => cta.toLowerCase().includes(strong)) ? 20 : 10;
  }

  scoreSocialLength(text) {
    if (!text) return 0;
    const length = text.length;
    if (length >= 80 && length <= 150) return 20; // Optimal for most platforms
    if (length >= 50 && length <= 200) return 15;
    return 10;
  }

  detectCTA(text) {
    if (!text) return false;
    const ctaPatterns = ['click', 'visit', 'learn more', 'sign up', 'join', 'get', 'download', 'try'];
    return ctaPatterns.some(pattern => text.toLowerCase().includes(pattern));
  }

  scoreEngagement(text) {
    if (!text) return 0;
    let score = 0;
    // Questions increase engagement
    if (text.includes('?')) score += 10;
    // Mentions increase engagement
    if (text.includes('@')) score += 5;
    // Emojis increase engagement
    if (/[\u{1F300}-\u{1F9FF}]/u.test(text)) score += 5;
    return score;
  }

  scoreBlogTitle(title) {
    if (!title) return 0;
    let score = 0;
    // Length scoring
    if (title.length >= 50 && title.length <= 60) score += 10;
    // Power words
    const powerWords = ['ultimate', 'guide', 'how to', 'best', 'top', 'essential'];
    if (powerWords.some(word => title.toLowerCase().includes(word))) score += 10;
    // Numbers
    if (/\d+/.test(title)) score += 5;
    return score;
  }

  scoreReadability(content) {
    // Simplified readability score
    let score = 15; // Base score
    if (content.sections?.length > 0) score += 5;
    if (content.introduction) score += 5;
    if (content.conclusion) score += 5;
    return score;
  }

  scoreSEO(content) {
    let score = 10; // Base score
    if (content.metaDescription) score += 10;
    if (content.title?.length >= 50 && content.title?.length <= 60) score += 10;
    return score;
  }

  scoreValue(content) {
    // Simple value score based on content depth
    let score = 10;
    if (content.sections?.length > 5) score += 10;
    return score;
  }

  scoreHeadline(headline) {
    if (!headline) return 0;
    let score = 10;
    if (headline.length <= 30) score += 10; // Concise
    if (/\d+/.test(headline)) score += 5; // Contains numbers
    return score;
  }

  scoreValueProp(description) {
    if (!description) return 0;
    let score = 10;
    const valueWords = ['save', 'free', 'exclusive', 'proven', 'guaranteed'];
    if (valueWords.some(word => description.toLowerCase().includes(word))) score += 10;
    return score;
  }

  // Insight generation methods
  generateEmailInsights(factors) {
    const insights = [];
    
    if (factors.subjectLength < 15) {
      insights.push('Consider optimizing subject line length (30-50 characters ideal)');
    }
    if (!factors.personalization) {
      insights.push('Add personalization tokens to increase open rates');
    }
    if (!factors.urgency) {
      insights.push('Consider adding urgency to improve click-through rates');
    }
    if (factors.mobileOptimized === 0) {
      insights.push('Shorten email content for better mobile experience');
    }
    
    return insights;
  }

  generateSocialInsights(factors) {
    const insights = [];
    
    if (!factors.hashtagRelevance) {
      insights.push('Add relevant hashtags to increase discoverability');
    }
    if (factors.contentLength < 15) {
      insights.push('Optimize content length for platform (80-150 characters ideal)');
    }
    if (!factors.emojiUsage) {
      insights.push('Consider adding emojis to increase engagement');
    }
    if (!factors.callToAction) {
      insights.push('Add a clear call-to-action to drive conversions');
    }
    
    return insights;
  }

  generateBlogInsights(factors) {
    const insights = [];
    
    if (factors.titleOptimization < 20) {
      insights.push('Optimize title with power words and ideal length (50-60 characters)');
    }
    if (factors.structureQuality < 20) {
      insights.push('Add more sections to improve content structure and readability');
    }
    if (factors.seoOptimization < 20) {
      insights.push('Add meta description and optimize for search engines');
    }
    
    return insights;
  }

  generateAdInsights(factors) {
    const insights = [];
    
    if (factors.headlineImpact < 20) {
      insights.push('Make headline more concise and impactful');
    }
    if (factors.valueProposition < 15) {
      insights.push('Strengthen value proposition with specific benefits');
    }
    if (!factors.urgency) {
      insights.push('Add urgency elements to improve conversion rates');
    }
    if (factors.ctaStrength < 15) {
      insights.push('Use stronger call-to-action language');
    }
    
    return insights;
  }
}

export default ContentGenerationService;