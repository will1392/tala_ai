/**
 * Client Sentiment Analyzer Service
 * 
 * Detects client emotion, identifies complaint patterns, scores relationship health,
 * flags urgent situations
 */

class ClientSentimentAnalyzer {
  constructor() {
    // Sentiment keywords with scores (-1 to 1)
    this.sentimentKeywords = {
      positive: {
        score: 0.8,
        keywords: [
          'thank you', 'thanks', 'appreciate', 'grateful', 'excellent',
          'amazing', 'wonderful', 'fantastic', 'great', 'perfect',
          'love', 'happy', 'pleased', 'satisfied', 'impressed',
          'recommend', 'outstanding', 'exceptional', 'brilliant'
        ]
      },
      negative: {
        score: -0.8,
        keywords: [
          'disappointed', 'frustrated', 'angry', 'upset', 'annoyed',
          'terrible', 'awful', 'horrible', 'disgusted', 'furious',
          'unacceptable', 'ridiculous', 'pathetic', 'useless',
          'worst', 'hate', 'disgusting', 'appalling'
        ]
      },
      neutral: {
        score: 0,
        keywords: [
          'okay', 'fine', 'acceptable', 'reasonable', 'standard',
          'normal', 'average', 'typical', 'usual', 'regular'
        ]
      }
    };

    // Complaint indicators
    this.complaintPatterns = {
      direct: [
        /\bi\s+want\s+to\s+complain/i,
        /\bthis\s+is\s+a\s+complaint/i,
        /\bi\s+am\s+complaining/i,
        /\bformal\s+complaint/i,
        /\bfile\s+a\s+complaint/i
      ],
      indirect: [
        /\bthis\s+is\s+unacceptable/i,
        /\bi\s+demand/i,
        /\bthis\s+needs\s+to\s+be\s+fixed/i,
        /\bvery\s+disappointed/i,
        /\bextremely\s+frustrated/i,
        /\bi\s+expect\s+better/i,
        /\bnot\s+what\s+i\s+paid\s+for/i,
        /\bwaste\s+of\s+money/i,
        /\bpoor\s+service/i,
        /\bbad\s+experience/i
      ],
      escalation: [
        /\bspeak\s+to\s+your\s+manager/i,
        /\bcontact\s+your\s+supervisor/i,
        /\bi\s+want\s+a\s+refund/i,
        /\bcancel\s+my\s+(booking|reservation|order)/i,
        /\blegal\s+action/i,
        /\breport\s+this/i,
        /\bbetter\s+business\s+bureau/i,
        /\breview\s+online/i
      ]
    };

    // Urgency indicators
    this.urgencyIndicators = {
      critical: [
        /\bemergency/i,
        /\bcrisis/i,
        /\blife\s+threatening/i,
        /\bdangerous/i,
        /\bsafety\s+issue/i,
        /\bmedical\s+emergency/i
      ],
      high: [
        /\bstuck/i,
        /\bstranded/i,
        /\blost/i,
        /\bmissing\s+flight/i,
        /\bno\s+accommodation/i,
        /\bhotel\s+overbooked/i,
        /\bflight\s+cancelled/i
      ],
      medium: [
        /\bdelayed/i,
        /\bwaiting/i,
        /\bconfused/i,
        /\bunsure/i,
        /\bneed\s+help/i,
        /\bproblem\s+with/i
      ]
    };

    // Relationship health indicators
    this.relationshipIndicators = {
      positive: [
        /\bloyal\s+customer/i,
        /\bbeen\s+using\s+your\s+service/i,
        /\balways\s+book\s+with\s+you/i,
        /\brecommend\s+to\s+friends/i,
        /\btrust\s+your\s+service/i,
        /\bhappy\s+customer/i
      ],
      negative: [
        /\bnever\s+again/i,
        /\blast\s+time/i,
        /\bswitching\s+to\s+competitor/i,
        /\bbetter\s+alternatives/i,
        /\bwon't\s+be\s+back/i,
        /\bending\s+our\s+relationship/i
      ],
      neutral: [
        /\bfirst\s+time/i,
        /\bnew\s+customer/i,
        /\btrying\s+your\s+service/i,
        /\bheard\s+about\s+you/i
      ]
    };

    // Emotion detection patterns
    this.emotionPatterns = {
      angry: [
        /\bi\s+am\s+(so\s+)?angry/i,
        /\bthis\s+makes\s+me\s+mad/i,
        /\binfuriating/i,
        /\boutrageous/i
      ],
      frustrated: [
        /\bfrustrated/i,
        /\bthis\s+is\s+ridiculous/i,
        /\bwhy\s+is\s+this\s+so\s+difficult/i,
        /\bgoing\s+in\s+circles/i
      ],
      worried: [
        /\bworried/i,
        /\bconcerned/i,
        /\banxious/i,
        /\bnervous/i,
        /\bstressed/i
      ],
      happy: [
        /\bhappy/i,
        /\bexcited/i,
        /\bthrilled/i,
        /\bdelighted/i,
        /\boverjoyed/i
      ],
      confused: [
        /\bconfused/i,
        /\bdon't\s+understand/i,
        /\bunsure/i,
        /\bbaffled/i,
        /\bpuzzled/i
      ]
    };
  }

  /**
   * Analyze sentiment of email content
   * @param {Object} email - Email object
   * @param {Array} previousEmails - Previous emails in thread
   * @returns {Object} Sentiment analysis
   */
  analyzeSentiment(email, previousEmails = []) {
    const analysis = {
      overallSentiment: 0,
      sentimentLevel: 'neutral',
      confidence: 0.5,
      emotions: [],
      complaintType: null,
      urgencyLevel: 'normal',
      relationshipHealth: 'neutral',
      flags: [],
      keyPhrases: [],
      recommendations: []
    };

    const content = this.prepareContent(email);
    
    // Analyze overall sentiment
    const sentimentAnalysis = this.analyzeSentimentScore(content);
    analysis.overallSentiment = sentimentAnalysis.score;
    analysis.sentimentLevel = sentimentAnalysis.level;
    analysis.confidence = sentimentAnalysis.confidence;
    analysis.keyPhrases.push(...sentimentAnalysis.phrases);

    // Detect emotions
    analysis.emotions = this.detectEmotions(content);

    // Detect complaints
    const complaintAnalysis = this.detectComplaints(content);
    analysis.complaintType = complaintAnalysis.type;
    if (complaintAnalysis.phrases.length > 0) {
      analysis.keyPhrases.push(...complaintAnalysis.phrases);
    }

    // Detect urgency
    const urgencyAnalysis = this.detectUrgency(content);
    analysis.urgencyLevel = urgencyAnalysis.level;
    if (urgencyAnalysis.phrases.length > 0) {
      analysis.keyPhrases.push(...urgencyAnalysis.phrases);
    }

    // Analyze relationship health
    const relationshipAnalysis = this.analyzeRelationshipHealth(content);
    analysis.relationshipHealth = relationshipAnalysis.health;
    if (relationshipAnalysis.phrases.length > 0) {
      analysis.keyPhrases.push(...relationshipAnalysis.phrases);
    }

    // Generate flags
    analysis.flags = this.generateFlags(analysis, email);

    // Generate recommendations
    analysis.recommendations = this.generateRecommendations(analysis, email);

    // Consider previous emails for context
    if (previousEmails.length > 0) {
      const contextAnalysis = this.analyzeThreadContext(previousEmails);
      analysis.threadContext = contextAnalysis;
      
      // Adjust analysis based on thread context
      this.adjustForThreadContext(analysis, contextAnalysis);
    }

    return analysis;
  }

  /**
   * Prepare content for analysis
   * @private
   */
  prepareContent(email) {
    const content = [];
    
    if (email.subject) content.push(email.subject);
    if (email.contentWithoutSignature) content.push(email.contentWithoutSignature);
    else if (email.content) content.push(email.content);
    else if (email.textBody) content.push(email.textBody);
    
    return content.join(' ').toLowerCase();
  }

  /**
   * Analyze sentiment score
   * @private
   */
  analyzeSentimentScore(content) {
    let score = 0;
    let matchCount = 0;
    const phrases = [];

    // Check sentiment keywords
    for (const [category, config] of Object.entries(this.sentimentKeywords)) {
      for (const keyword of config.keywords) {
        const regex = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'gi');
        const matches = content.match(regex);
        
        if (matches) {
          score += config.score * matches.length;
          matchCount += matches.length;
          phrases.push(...matches.map(match => ({
            phrase: match,
            category,
            score: config.score
          })));
        }
      }
    }

    // Normalize score
    if (matchCount > 0) {
      score = score / matchCount;
    }

    // Determine sentiment level
    let level = 'neutral';
    if (score > 0.3) level = 'positive';
    else if (score > 0.6) level = 'very_positive';
    else if (score < -0.3) level = 'negative';
    else if (score < -0.6) level = 'very_negative';

    // Calculate confidence
    const confidence = Math.min(0.9, 0.5 + (matchCount * 0.1));

    return { score, level, confidence, phrases };
  }

  /**
   * Detect emotions in content
   * @private
   */
  detectEmotions(content) {
    const emotions = [];

    for (const [emotion, patterns] of Object.entries(this.emotionPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          emotions.push({
            emotion,
            confidence: 0.7,
            pattern: pattern.source
          });
          break; // Only count each emotion once
        }
      }
    }

    return emotions;
  }

  /**
   * Detect complaints
   * @private
   */
  detectComplaints(content) {
    const result = {
      type: null,
      phrases: [],
      severity: 'none'
    };

    // Check for direct complaints
    for (const pattern of this.complaintPatterns.direct) {
      const match = content.match(pattern);
      if (match) {
        result.type = 'direct';
        result.severity = 'high';
        result.phrases.push({
          phrase: match[0],
          type: 'direct_complaint'
        });
        return result; // Direct complaint is highest priority
      }
    }

    // Check for escalation patterns
    for (const pattern of this.complaintPatterns.escalation) {
      const match = content.match(pattern);
      if (match) {
        result.type = 'escalation';
        result.severity = 'critical';
        result.phrases.push({
          phrase: match[0],
          type: 'escalation_threat'
        });
      }
    }

    // Check for indirect complaints
    for (const pattern of this.complaintPatterns.indirect) {
      const match = content.match(pattern);
      if (match) {
        if (!result.type) {
          result.type = 'indirect';
          result.severity = 'medium';
        }
        result.phrases.push({
          phrase: match[0],
          type: 'indirect_complaint'
        });
      }
    }

    return result;
  }

  /**
   * Detect urgency indicators
   * @private
   */
  detectUrgency(content) {
    const result = {
      level: 'normal',
      phrases: []
    };

    // Check critical urgency
    for (const pattern of this.urgencyIndicators.critical) {
      const match = content.match(pattern);
      if (match) {
        result.level = 'critical';
        result.phrases.push({
          phrase: match[0],
          urgency: 'critical'
        });
        return result; // Critical is highest priority
      }
    }

    // Check high urgency
    for (const pattern of this.urgencyIndicators.high) {
      const match = content.match(pattern);
      if (match) {
        result.level = 'high';
        result.phrases.push({
          phrase: match[0],
          urgency: 'high'
        });
      }
    }

    // Check medium urgency
    if (result.level === 'normal') {
      for (const pattern of this.urgencyIndicators.medium) {
        const match = content.match(pattern);
        if (match) {
          result.level = 'medium';
          result.phrases.push({
            phrase: match[0],
            urgency: 'medium'
          });
        }
      }
    }

    return result;
  }

  /**
   * Analyze relationship health
   * @private
   */
  analyzeRelationshipHealth(content) {
    const result = {
      health: 'neutral',
      phrases: []
    };

    // Check for positive relationship indicators
    for (const pattern of this.relationshipIndicators.positive) {
      const match = content.match(pattern);
      if (match) {
        result.health = 'good';
        result.phrases.push({
          phrase: match[0],
          type: 'relationship_positive'
        });
      }
    }

    // Check for negative relationship indicators
    for (const pattern of this.relationshipIndicators.negative) {
      const match = content.match(pattern);
      if (match) {
        result.health = 'poor';
        result.phrases.push({
          phrase: match[0],
          type: 'relationship_negative'
        });
        break; // Negative overrides positive
      }
    }

    // Check for neutral indicators
    if (result.health === 'neutral') {
      for (const pattern of this.relationshipIndicators.neutral) {
        const match = content.match(pattern);
        if (match) {
          result.phrases.push({
            phrase: match[0],
            type: 'relationship_neutral'
          });
        }
      }
    }

    return result;
  }

  /**
   * Generate flags based on analysis
   * @private
   */
  generateFlags(analysis, email) {
    const flags = [];

    // Negative sentiment flags
    if (analysis.sentimentLevel === 'very_negative') {
      flags.push({
        type: 'very_negative_sentiment',
        severity: 'high',
        description: 'Customer expresses very negative sentiment'
      });
    } else if (analysis.sentimentLevel === 'negative') {
      flags.push({
        type: 'negative_sentiment',
        severity: 'medium',
        description: 'Customer expresses negative sentiment'
      });
    }

    // Complaint flags
    if (analysis.complaintType === 'escalation') {
      flags.push({
        type: 'escalation_threat',
        severity: 'critical',
        description: 'Customer threatens escalation or legal action'
      });
    } else if (analysis.complaintType === 'direct') {
      flags.push({
        type: 'direct_complaint',
        severity: 'high',
        description: 'Customer filing direct complaint'
      });
    } else if (analysis.complaintType === 'indirect') {
      flags.push({
        type: 'indirect_complaint',
        severity: 'medium',
        description: 'Customer expressing dissatisfaction'
      });
    }

    // Urgency flags
    if (analysis.urgencyLevel === 'critical') {
      flags.push({
        type: 'critical_situation',
        severity: 'critical',
        description: 'Customer in emergency or critical situation'
      });
    } else if (analysis.urgencyLevel === 'high') {
      flags.push({
        type: 'urgent_situation',
        severity: 'high',
        description: 'Customer in urgent situation requiring immediate attention'
      });
    }

    // Relationship flags
    if (analysis.relationshipHealth === 'poor') {
      flags.push({
        type: 'relationship_at_risk',
        severity: 'high',
        description: 'Customer relationship at risk'
      });
    }

    // Emotion flags
    const negativeEmotions = analysis.emotions.filter(e => 
      ['angry', 'frustrated', 'worried'].includes(e.emotion)
    );
    if (negativeEmotions.length > 0) {
      flags.push({
        type: 'negative_emotions',
        severity: 'medium',
        description: `Customer expressing ${negativeEmotions.map(e => e.emotion).join(', ')}`
      });
    }

    return flags;
  }

  /**
   * Generate recommendations
   * @private
   */
  generateRecommendations(analysis, email) {
    const recommendations = [];

    // High priority response recommendations
    if (analysis.flags.some(f => f.severity === 'critical')) {
      recommendations.push({
        type: 'immediate_response',
        priority: 'critical',
        action: 'Respond immediately with empathy and concrete solutions',
        timeframe: 'within 1 hour'
      });
    } else if (analysis.flags.some(f => f.severity === 'high')) {
      recommendations.push({
        type: 'priority_response',
        priority: 'high',
        action: 'Respond within business hours with personalized attention',
        timeframe: 'within 4 hours'
      });
    }

    // Tone recommendations
    if (analysis.sentimentLevel.includes('negative')) {
      recommendations.push({
        type: 'tone_adjustment',
        priority: 'high',
        action: 'Use empathetic, apologetic tone. Acknowledge their concerns',
        template: 'I understand your frustration and sincerely apologize...'
      });
    } else if (analysis.sentimentLevel.includes('positive')) {
      recommendations.push({
        type: 'tone_adjustment',
        priority: 'medium',
        action: 'Match their positive tone and express gratitude',
        template: 'Thank you for your positive feedback...'
      });
    }

    // Escalation recommendations
    if (analysis.complaintType === 'escalation') {
      recommendations.push({
        type: 'escalation_management',
        priority: 'critical',
        action: 'Involve senior management, offer compensation/resolution',
        notify: ['manager', 'customer_success']
      });
    }

    // Relationship recommendations
    if (analysis.relationshipHealth === 'poor') {
      recommendations.push({
        type: 'relationship_repair',
        priority: 'high',
        action: 'Focus on rebuilding trust, offer special consideration',
        followUp: 'Schedule follow-up to ensure satisfaction'
      });
    } else if (analysis.relationshipHealth === 'good') {
      recommendations.push({
        type: 'relationship_maintenance',
        priority: 'medium',
        action: 'Acknowledge loyalty, consider loyalty benefits',
        opportunity: 'Upsell or referral opportunity'
      });
    }

    return recommendations;
  }

  /**
   * Analyze thread context from previous emails
   * @private
   */
  analyzeThreadContext(previousEmails) {
    const context = {
      threadSentiment: 'neutral',
      escalationPattern: false,
      responseTime: null,
      issueResolution: 'unresolved'
    };

    // Analyze sentiment progression
    const sentiments = previousEmails.map(email => {
      const analysis = this.analyzeSentiment(email);
      return analysis.overallSentiment;
    });

    if (sentiments.length > 1) {
      const trend = sentiments[sentiments.length - 1] - sentiments[0];
      if (trend < -0.3) {
        context.escalationPattern = true;
        context.threadSentiment = 'deteriorating';
      } else if (trend > 0.3) {
        context.threadSentiment = 'improving';
      }
    }

    // Calculate average response time (if timestamps available)
    // This would need actual timestamp data

    return context;
  }

  /**
   * Adjust analysis based on thread context
   * @private
   */
  adjustForThreadContext(analysis, threadContext) {
    if (threadContext.escalationPattern) {
      // Increase severity if there's an escalation pattern
      analysis.flags.forEach(flag => {
        if (flag.severity === 'medium') flag.severity = 'high';
        if (flag.severity === 'high') flag.severity = 'critical';
      });

      // Add escalation pattern flag
      analysis.flags.push({
        type: 'escalation_pattern',
        severity: 'high',
        description: 'Sentiment deteriorating across email thread'
      });
    }

    if (threadContext.threadSentiment === 'deteriorating') {
      analysis.recommendations.unshift({
        type: 'urgent_intervention',
        priority: 'critical',
        action: 'Immediate intervention required to prevent further escalation',
        escalate: true
      });
    }
  }

  /**
   * Batch analyze sentiment for multiple emails
   * @param {Array} emails - Array of email objects
   * @returns {Array} Array of sentiment analyses
   */
  batchAnalyzeSentiment(emails) {
    return emails.map(email => ({
      email,
      sentiment: this.analyzeSentiment(email)
    }));
  }

  /**
   * Get sentiment distribution
   * @param {Array} sentimentAnalyses - Array of sentiment analyses
   * @returns {Object} Distribution of sentiments
   */
  getSentimentDistribution(sentimentAnalyses) {
    const distribution = {
      very_positive: 0,
      positive: 0,
      neutral: 0,
      negative: 0,
      very_negative: 0
    };

    sentimentAnalyses.forEach(analysis => {
      const level = analysis.sentiment?.sentimentLevel || 'neutral';
      if (distribution.hasOwnProperty(level)) {
        distribution[level]++;
      }
    });

    return distribution;
  }

  /**
   * Get high-risk customers
   * @param {Array} sentimentAnalyses - Array of sentiment analyses
   * @returns {Array} High-risk customers
   */
  getHighRiskCustomers(sentimentAnalyses) {
    return sentimentAnalyses.filter(analysis => {
      const sentiment = analysis.sentiment;
      return sentiment.flags.some(flag => 
        flag.severity === 'critical' || flag.severity === 'high'
      ) || sentiment.relationshipHealth === 'poor';
    });
  }
}

export default ClientSentimentAnalyzer;