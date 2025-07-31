/**
 * Marketing Intelligence Engine
 * 
 * Provides holistic marketing insights, cross-channel analysis, and proactive recommendations
 */

import { conversationFlow } from './ConversationFlow.js';
import { contextDetector } from './ContextDetector.js';

// Channel interdependencies map
const ChannelSynergies = {
  seo: {
    email: {
      impact: 'high',
      insights: [
        'Higher domain authority from SEO improves email deliverability',
        'SEO content can be repurposed for email newsletters',
        'Email traffic signals boost SEO rankings'
      ]
    },
    social: {
      impact: 'high',
      insights: [
        'Social shares create valuable backlinks for SEO',
        'Social engagement signals influence search rankings',
        'SEO keywords inform social content strategy'
      ]
    },
    ads: {
      impact: 'medium',
      insights: [
        'SEO data informs PPC keyword selection',
        'Quality Score benefits from strong SEO',
        'Organic and paid listings reinforce brand presence'
      ]
    }
  },
  email: {
    seo: {
      impact: 'medium',
      insights: [
        'Email campaigns drive traffic that improves SEO metrics',
        'Newsletter content can become SEO-optimized blog posts',
        'Email engagement data reveals content preferences'
      ]
    },
    social: {
      impact: 'high',
      insights: [
        'Email lists can jumpstart social following',
        'Social proof in emails increases engagement',
        'Cross-promote content between channels'
      ]
    },
    directMail: {
      impact: 'medium',
      insights: [
        'Email warm-up improves direct mail response',
        'Coordinate messaging across digital and physical',
        'Use email for direct mail follow-up'
      ]
    }
  },
  social: {
    seo: {
      impact: 'high',
      insights: [
        'Social signals contribute to search rankings',
        'Viral content creates natural backlinks',
        'Social profiles rank in search results'
      ]
    },
    email: {
      impact: 'medium',
      insights: [
        'Social followers convert to email subscribers',
        'User-generated content for email campaigns',
        'Social proof increases email conversions'
      ]
    },
    ads: {
      impact: 'high',
      insights: [
        'Social engagement data improves ad targeting',
        'Retarget social engagers with ads',
        'Social proof enhances ad performance'
      ]
    }
  }
};

// Seasonal marketing opportunities
const SeasonalOpportunities = {
  Q1: {
    january: ['New Year resolutions', 'Fresh start campaigns', 'Annual planning'],
    february: ["Valentine's Day", 'Tax prep season begins', 'Winter clearance'],
    march: ['Spring promotions', "St. Patrick's Day", 'Women\'s History Month']
  },
  Q2: {
    april: ['Easter', 'Spring cleaning', 'Earth Day'],
    may: ["Mother's Day", 'Graduation season', 'Memorial Day'],
    june: ["Father's Day", 'Summer kickoff', 'Mid-year reviews']
  },
  Q3: {
    july: ['Independence Day', 'Summer sales', 'Back-to-school prep'],
    august: ['Back-to-school', 'End of summer', 'Fall preview'],
    september: ['Labor Day', 'Fall season', 'Q4 planning']
  },
  Q4: {
    october: ['Halloween', 'Breast Cancer Awareness', 'Holiday prep'],
    november: ['Black Friday', 'Cyber Monday', 'Thanksgiving'],
    december: ['Holiday season', 'Year-end', 'New Year prep']
  }
};

// Industry-specific insights
const IndustryInsights = {
  ecommerce: {
    priorities: ['conversion optimization', 'cart abandonment', 'customer lifetime value'],
    channels: { seo: 0.25, email: 0.3, social: 0.2, ads: 0.25 },
    recommendations: [
      'Implement abandoned cart email sequences',
      'Optimize product pages for SEO',
      'Use social proof in ads',
      'Create loyalty program'
    ]
  },
  saas: {
    priorities: ['lead generation', 'content marketing', 'customer retention'],
    channels: { seo: 0.35, email: 0.25, social: 0.15, ads: 0.25 },
    recommendations: [
      'Develop SEO-focused content strategy',
      'Create educational email drip campaigns',
      'Use LinkedIn for B2B outreach',
      'Implement retargeting campaigns'
    ]
  },
  retail: {
    priorities: ['foot traffic', 'local SEO', 'customer engagement'],
    channels: { seo: 0.2, email: 0.25, social: 0.25, directMail: 0.3 },
    recommendations: [
      'Optimize Google My Business',
      'Coordinate email with in-store events',
      'Use geo-targeted social ads',
      'Send personalized direct mail offers'
    ]
  },
  healthcare: {
    priorities: ['trust building', 'patient education', 'appointment booking'],
    channels: { seo: 0.3, email: 0.3, social: 0.2, ads: 0.2 },
    recommendations: [
      'Create condition-specific content',
      'Send appointment reminder emails',
      'Share patient testimonials',
      'Use search ads for procedures'
    ]
  }
};

class MarketingIntelligence {
  constructor() {
    this.assessmentCache = new Map();
    this.progressTracking = new Map();
  }

  /**
   * Analyze user's overall marketing health
   */
  async analyzeMarketingHealth(userId) {
    // Get conversation history and context
    const sessionSummary = conversationFlow.getSessionSummary(userId);
    const userSession = conversationFlow.getSession(userId);
    
    // Analyze mentioned channels and metrics
    const channelMetrics = this.extractChannelMetrics(userSession);
    const identifiedGaps = this.identifyGaps(channelMetrics, userSession);
    const opportunities = this.findOpportunities(userSession, channelMetrics);
    
    // Calculate health scores
    const healthScores = this.calculateHealthScores(channelMetrics);
    const overallHealth = this.calculateOverallHealth(healthScores);
    
    // Generate insights
    const crossChannelInsights = this.generateCrossChannelInsights(channelMetrics);
    const priorityRecommendations = this.prioritizeRecommendations(
      identifiedGaps,
      opportunities,
      userSession
    );
    
    return {
      summary: {
        overallHealth,
        assessmentDate: new Date(),
        channelsAnalyzed: Object.keys(channelMetrics),
        dataPoints: this.countDataPoints(channelMetrics)
      },
      health: healthScores,
      gaps: identifiedGaps,
      opportunities,
      crossChannelInsights,
      recommendations: priorityRecommendations,
      progress: this.getProgressMetrics(userId)
    };
  }

  /**
   * Extract channel metrics from conversation
   */
  extractChannelMetrics(session) {
    const metrics = {
      seo: { mentioned: false, metrics: {}, issues: [], strengths: [] },
      email: { mentioned: false, metrics: {}, issues: [], strengths: [] },
      social: { mentioned: false, metrics: {}, issues: [], strengths: [] },
      directMail: { mentioned: false, metrics: {}, issues: [], strengths: [] },
      ads: { mentioned: false, metrics: {}, issues: [], strengths: [] }
    };
    
    // Analyze conversation history
    session.history.forEach(entry => {
      const { context, message } = entry;
      const channel = context.primaryContext;
      
      if (channel && metrics[channel]) {
        metrics[channel].mentioned = true;
        
        // Extract metrics
        context.entities.forEach(entity => {
          if (entity.type === 'metric' || entity.type === 'percentage') {
            metrics[channel].metrics[entity.value] = {
              value: entity.value,
              context: this.inferMetricContext(message, entity.value),
              sentiment: this.analyzeSentiment(message, entity.value)
            };
          }
        });
        
        // Identify issues and strengths
        if (context.intent === 'fix' || message.toLowerCase().includes('problem')) {
          metrics[channel].issues.push(this.extractIssue(message));
        }
        if (context.intent === 'optimize' && this.containsPositiveSentiment(message)) {
          metrics[channel].strengths.push(this.extractStrength(message));
        }
      }
    });
    
    // Infer metrics from memory
    session.memory.metrics.forEach((metric, key) => {
      if (metric.context && metrics[metric.context]) {
        metrics[metric.context].metrics[key] = metric;
      }
    });
    
    return metrics;
  }

  /**
   * Identify marketing gaps
   */
  identifyGaps(channelMetrics, session) {
    const gaps = [];
    const industry = session.context.industry || 'general';
    const industryBenchmarks = IndustryInsights[industry] || IndustryInsights.ecommerce;
    
    // Channel coverage gaps
    Object.entries(channelMetrics).forEach(([channel, data]) => {
      if (!data.mentioned && industryBenchmarks.channels[channel] > 0.2) {
        gaps.push({
          type: 'channel_coverage',
          channel,
          severity: 'high',
          description: `No ${channel} marketing strategy mentioned`,
          impact: `Missing ${(industryBenchmarks.channels[channel] * 100).toFixed(0)}% of typical marketing mix`,
          recommendation: `Develop ${channel} strategy to capture full market potential`
        });
      }
    });
    
    // Performance gaps
    Object.entries(channelMetrics).forEach(([channel, data]) => {
      if (data.mentioned) {
        // Analyze metrics against benchmarks
        Object.entries(data.metrics).forEach(([metricKey, metricData]) => {
          if (metricData.sentiment === 'negative') {
            const benchmark = this.getBenchmark(channel, metricData.context);
            gaps.push({
              type: 'performance',
              channel,
              metric: metricKey,
              severity: this.calculateGapSeverity(metricData.value, benchmark),
              description: `${channel} ${metricData.context} below benchmark`,
              current: metricData.value,
              benchmark,
              recommendation: this.getImprovementRecommendation(channel, metricData.context)
            });
          }
        });
      }
    });
    
    // Integration gaps
    const mentionedChannels = Object.entries(channelMetrics)
      .filter(([_, data]) => data.mentioned)
      .map(([channel, _]) => channel);
    
    if (mentionedChannels.length >= 2) {
      const integrationScore = this.assessIntegration(channelMetrics);
      if (integrationScore < 0.5) {
        gaps.push({
          type: 'integration',
          severity: 'medium',
          description: 'Limited cross-channel integration',
          impact: 'Missing synergy opportunities between channels',
          recommendation: 'Develop integrated marketing strategy'
        });
      }
    }
    
    return gaps;
  }

  /**
   * Find marketing opportunities
   */
  findOpportunities(session, channelMetrics) {
    const opportunities = [];
    const currentMonth = new Date().getMonth();
    const currentQuarter = Math.floor(currentMonth / 3);
    
    // Seasonal opportunities
    const seasonKey = `Q${currentQuarter + 1}`;
    const monthName = ['january', 'february', 'march', 'april', 'may', 'june', 
                      'july', 'august', 'september', 'october', 'november', 'december'][currentMonth];
    
    const seasonal = SeasonalOpportunities[seasonKey]?.[monthName] || [];
    seasonal.forEach(opportunity => {
      opportunities.push({
        type: 'seasonal',
        title: opportunity,
        timing: 'current',
        channels: this.recommendChannelsForOpportunity(opportunity),
        description: `Leverage ${opportunity} for increased engagement`,
        priority: 'high'
      });
    });
    
    // Cross-channel opportunities
    const mentionedChannels = Object.entries(channelMetrics)
      .filter(([_, data]) => data.mentioned)
      .map(([channel, _]) => channel);
    
    mentionedChannels.forEach(channel => {
      Object.entries(ChannelSynergies[channel] || {}).forEach(([targetChannel, synergy]) => {
        if (!channelMetrics[targetChannel].mentioned && synergy.impact === 'high') {
          opportunities.push({
            type: 'cross_channel',
            title: `Expand ${channel} success to ${targetChannel}`,
            fromChannel: channel,
            toChannel: targetChannel,
            insights: synergy.insights,
            priority: 'medium',
            estimatedImpact: synergy.impact
          });
        }
      });
    });
    
    // Industry-specific opportunities
    const industry = session.context.industry || 'general';
    const industryData = IndustryInsights[industry];
    if (industryData) {
      industryData.priorities.forEach(priority => {
        if (!this.isPriorityAddressed(priority, session)) {
          opportunities.push({
            type: 'industry',
            title: `Focus on ${priority}`,
            description: `Key priority for ${industry} businesses`,
            channels: this.getChannelsForPriority(priority),
            priority: 'high'
          });
        }
      });
    }
    
    // Quick wins based on current performance
    Object.entries(channelMetrics).forEach(([channel, data]) => {
      if (data.strengths.length > 0) {
        opportunities.push({
          type: 'quick_win',
          title: `Scale successful ${channel} tactics`,
          description: `Your ${channel} performance shows potential for expansion`,
          actions: this.generateScalingActions(channel, data.strengths),
          priority: 'medium',
          effort: 'low'
        });
      }
    });
    
    return opportunities;
  }

  /**
   * Calculate health scores for each channel
   */
  calculateHealthScores(channelMetrics) {
    const scores = {};
    
    Object.entries(channelMetrics).forEach(([channel, data]) => {
      if (!data.mentioned) {
        scores[channel] = {
          score: 0,
          status: 'not_started',
          label: 'Not Active',
          color: 'gray'
        };
      } else {
        let score = 50; // Base score for active channel
        
        // Adjust based on metrics
        Object.values(data.metrics).forEach(metric => {
          if (metric.sentiment === 'positive') score += 10;
          if (metric.sentiment === 'negative') score -= 10;
        });
        
        // Adjust based on issues/strengths
        score -= data.issues.length * 5;
        score += data.strengths.length * 5;
        
        // Normalize score
        score = Math.max(0, Math.min(100, score));
        
        scores[channel] = {
          score,
          status: this.getHealthStatus(score),
          label: this.getHealthLabel(score),
          color: this.getHealthColor(score),
          metrics: data.metrics,
          issues: data.issues,
          strengths: data.strengths
        };
      }
    });
    
    return scores;
  }

  /**
   * Calculate overall marketing health
   */
  calculateOverallHealth(healthScores) {
    const activeChannels = Object.values(healthScores)
      .filter(score => score.status !== 'not_started');
    
    if (activeChannels.length === 0) {
      return {
        score: 0,
        status: 'not_started',
        label: 'No Active Marketing',
        summary: 'Start with one marketing channel'
      };
    }
    
    const avgScore = activeChannels.reduce((sum, ch) => sum + ch.score, 0) / activeChannels.length;
    const coverage = activeChannels.length / Object.keys(healthScores).length;
    const overallScore = (avgScore * 0.7) + (coverage * 100 * 0.3);
    
    return {
      score: Math.round(overallScore),
      status: this.getHealthStatus(overallScore),
      label: this.getHealthLabel(overallScore),
      activeChannels: activeChannels.length,
      totalChannels: Object.keys(healthScores).length,
      coverage: Math.round(coverage * 100),
      summary: this.getHealthSummary(overallScore, coverage)
    };
  }

  /**
   * Generate cross-channel insights
   */
  generateCrossChannelInsights(channelMetrics) {
    const insights = [];
    const activeChannels = Object.entries(channelMetrics)
      .filter(([_, data]) => data.mentioned)
      .map(([channel, data]) => ({ channel, data }));
    
    // Find synergy opportunities
    activeChannels.forEach(({ channel: sourceChannel, data: sourceData }) => {
      activeChannels.forEach(({ channel: targetChannel, data: targetData }) => {
        if (sourceChannel !== targetChannel) {
          const synergy = ChannelSynergies[sourceChannel]?.[targetChannel];
          if (synergy) {
            // Check if source is performing well
            const sourceStrength = sourceData.strengths.length > sourceData.issues.length;
            const targetWeakness = targetData.issues.length > targetData.strengths.length;
            
            if (sourceStrength && targetWeakness) {
              insights.push({
                type: 'leverage_strength',
                from: sourceChannel,
                to: targetChannel,
                insight: `Your strong ${sourceChannel} performance can boost ${targetChannel}`,
                actions: synergy.insights.slice(0, 2),
                impact: synergy.impact,
                priority: 'high'
              });
            }
          }
        }
      });
    });
    
    // Find data sharing opportunities
    const metricsCollected = new Set();
    activeChannels.forEach(({ data }) => {
      Object.keys(data.metrics).forEach(metric => metricsCollected.add(metric));
    });
    
    if (metricsCollected.size > 3) {
      insights.push({
        type: 'data_integration',
        insight: 'Rich data across channels enables better targeting',
        actions: [
          'Create unified customer profiles',
          'Use email engagement data for social targeting',
          'Apply SEO insights to paid campaigns'
        ],
        impact: 'high',
        priority: 'medium'
      });
    }
    
    // Identify missing connections
    if (activeChannels.length >= 3) {
      const disconnectedChannels = this.findDisconnectedChannels(channelMetrics);
      if (disconnectedChannels.length > 0) {
        insights.push({
          type: 'integration_gap',
          insight: `${disconnectedChannels.join(' and ')} are operating in silos`,
          actions: [
            'Coordinate messaging across channels',
            'Share audience insights between teams',
            'Create integrated campaigns'
          ],
          impact: 'medium',
          priority: 'medium'
        });
      }
    }
    
    return insights;
  }

  /**
   * Prioritize recommendations based on impact and effort
   */
  prioritizeRecommendations(gaps, opportunities, session) {
    const allRecommendations = [];
    
    // Convert gaps to recommendations
    gaps.forEach(gap => {
      allRecommendations.push({
        id: `gap_${Date.now()}_${Math.random()}`,
        type: 'gap',
        title: gap.recommendation,
        description: gap.description,
        impact: gap.severity === 'high' ? 5 : gap.severity === 'medium' ? 3 : 1,
        effort: this.estimateEffort(gap),
        channel: gap.channel,
        metric: gap.metric,
        category: gap.type
      });
    });
    
    // Convert opportunities to recommendations
    opportunities.forEach(opp => {
      allRecommendations.push({
        id: `opp_${Date.now()}_${Math.random()}`,
        type: 'opportunity',
        title: opp.title,
        description: opp.description || opp.insights?.[0] || '',
        impact: opp.priority === 'high' ? 5 : opp.priority === 'medium' ? 3 : 2,
        effort: opp.effort || this.estimateOpportunityEffort(opp),
        channels: opp.channels || [opp.fromChannel, opp.toChannel].filter(Boolean),
        timing: opp.timing,
        category: opp.type
      });
    });
    
    // Calculate priority scores
    allRecommendations.forEach(rec => {
      rec.priorityScore = (rec.impact * 2) - rec.effort;
      rec.roi = rec.impact / rec.effort;
    });
    
    // Sort by priority score
    allRecommendations.sort((a, b) => b.priorityScore - a.priorityScore);
    
    // Group by timeframe
    const prioritized = {
      immediate: allRecommendations.filter(r => r.effort <= 2).slice(0, 3),
      shortTerm: allRecommendations.filter(r => r.effort > 2 && r.effort <= 4).slice(0, 3),
      longTerm: allRecommendations.filter(r => r.effort > 4).slice(0, 3)
    };
    
    return prioritized;
  }

  /**
   * Track progress over time
   */
  updateProgress(userId, channel, metric, value) {
    if (!this.progressTracking.has(userId)) {
      this.progressTracking.set(userId, {});
    }
    
    const userProgress = this.progressTracking.get(userId);
    if (!userProgress[channel]) {
      userProgress[channel] = {};
    }
    
    if (!userProgress[channel][metric]) {
      userProgress[channel][metric] = [];
    }
    
    userProgress[channel][metric].push({
      value,
      timestamp: new Date(),
      trend: this.calculateTrend(userProgress[channel][metric], value)
    });
  }

  /**
   * Get progress metrics
   */
  getProgressMetrics(userId) {
    const progress = this.progressTracking.get(userId) || {};
    const metrics = {
      channels: {},
      overall: {
        trend: 'stable',
        improvements: 0,
        regressions: 0
      }
    };
    
    Object.entries(progress).forEach(([channel, channelMetrics]) => {
      metrics.channels[channel] = {
        metrics: {},
        trend: 'stable',
        lastUpdate: null
      };
      
      Object.entries(channelMetrics).forEach(([metric, history]) => {
        if (history.length > 0) {
          const latest = history[history.length - 1];
          const trend = latest.trend;
          
          metrics.channels[channel].metrics[metric] = {
            current: latest.value,
            trend,
            history: history.slice(-5) // Last 5 data points
          };
          
          if (trend === 'improving') metrics.overall.improvements++;
          if (trend === 'declining') metrics.overall.regressions++;
          
          if (!metrics.channels[channel].lastUpdate || 
              latest.timestamp > metrics.channels[channel].lastUpdate) {
            metrics.channels[channel].lastUpdate = latest.timestamp;
          }
        }
      });
    });
    
    // Calculate overall trend
    if (metrics.overall.improvements > metrics.overall.regressions) {
      metrics.overall.trend = 'improving';
    } else if (metrics.overall.regressions > metrics.overall.improvements) {
      metrics.overall.trend = 'declining';
    }
    
    return metrics;
  }

  /**
   * Generate proactive suggestions based on patterns
   */
  generateProactiveSuggestions(userId) {
    const session = conversationFlow.getSession(userId);
    const suggestions = [];
    
    // Time-based suggestions
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    
    if (hour >= 9 && hour <= 11) {
      suggestions.push({
        type: 'timing',
        message: 'Great time to send marketing emails - highest open rates',
        action: 'Review email campaign performance'
      });
    }
    
    if (dayOfWeek === 2 || dayOfWeek === 4) { // Tuesday or Thursday
      suggestions.push({
        type: 'timing',
        message: 'Best days for social media engagement',
        action: 'Schedule social media posts'
      });
    }
    
    // Pattern-based suggestions
    const recentTopics = session.history.slice(-10).map(h => h.context.primaryContext);
    const topicCounts = recentTopics.reduce((acc, topic) => {
      acc[topic] = (acc[topic] || 0) + 1;
      return acc;
    }, {});
    
    const dominantTopic = Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0];
    
    if (dominantTopic) {
      suggestions.push({
        type: 'focus',
        message: `You're focused on ${dominantTopic}. Consider these related areas:`,
        action: this.getRelatedTopicSuggestion(dominantTopic)
      });
    }
    
    return suggestions;
  }

  // Helper methods
  inferMetricContext(message, metricValue) {
    const contexts = {
      'open rate': ['open', 'opened', 'opening'],
      'click rate': ['click', 'ctr', 'clicked'],
      'conversion rate': ['convert', 'conversion', 'sales'],
      'bounce rate': ['bounce', 'left', 'exit'],
      'engagement rate': ['engage', 'interaction', 'likes']
    };
    
    const messageLower = message.toLowerCase();
    for (const [context, keywords] of Object.entries(contexts)) {
      if (keywords.some(keyword => messageLower.includes(keyword))) {
        return context;
      }
    }
    
    return 'general metric';
  }

  analyzeSentiment(message, metricValue) {
    const negativePhrases = ['low', 'poor', 'bad', 'down', 'dropped', 'decreased', 'problem'];
    const positivePhrases = ['high', 'good', 'great', 'up', 'increased', 'improved', 'success'];
    
    const messageLower = message.toLowerCase();
    
    if (negativePhrases.some(phrase => messageLower.includes(phrase))) {
      return 'negative';
    }
    if (positivePhrases.some(phrase => messageLower.includes(phrase))) {
      return 'positive';
    }
    
    // Infer from metric value
    const numericValue = parseFloat(metricValue);
    if (!isNaN(numericValue)) {
      if (metricValue.includes('%')) {
        if (numericValue < 20) return 'negative';
        if (numericValue > 50) return 'positive';
      }
    }
    
    return 'neutral';
  }

  getHealthStatus(score) {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    if (score >= 20) return 'poor';
    return 'critical';
  }

  getHealthLabel(score) {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    if (score >= 20) return 'Needs Attention';
    return 'Critical';
  }

  getHealthColor(score) {
    if (score >= 80) return 'green';
    if (score >= 60) return 'blue';
    if (score >= 40) return 'yellow';
    if (score >= 20) return 'orange';
    return 'red';
  }

  estimateEffort(gap) {
    const effortMap = {
      channel_coverage: 4,
      performance: 3,
      integration: 3
    };
    
    let effort = effortMap[gap.type] || 3;
    
    if (gap.severity === 'high') effort += 1;
    if (gap.severity === 'low') effort -= 1;
    
    return Math.max(1, Math.min(5, effort));
  }

  calculateTrend(history, newValue) {
    if (history.length === 0) return 'new';
    
    const recent = history.slice(-3).map(h => parseFloat(h.value));
    const current = parseFloat(newValue);
    
    const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
    
    if (current > avgRecent * 1.1) return 'improving';
    if (current < avgRecent * 0.9) return 'declining';
    return 'stable';
  }

  extractIssue(message) {
    // Simple issue extraction
    const issuePhrases = ['problem', 'issue', 'struggling', 'low', 'poor', 'bad'];
    const messageLower = message.toLowerCase();
    
    for (const phrase of issuePhrases) {
      if (messageLower.includes(phrase)) {
        return message.substring(0, 100); // First 100 chars as issue description
      }
    }
    return 'Performance below expectations';
  }

  extractStrength(message) {
    // Simple strength extraction
    const strengthPhrases = ['good', 'great', 'high', 'strong', 'excellent', 'improved'];
    const messageLower = message.toLowerCase();
    
    for (const phrase of strengthPhrases) {
      if (messageLower.includes(phrase)) {
        return message.substring(0, 100); // First 100 chars as strength description
      }
    }
    return 'Performing well';
  }

  containsPositiveSentiment(message) {
    const positivePhrases = ['good', 'great', 'excellent', 'improved', 'up', 'increased', 'strong'];
    const messageLower = message.toLowerCase();
    return positivePhrases.some(phrase => messageLower.includes(phrase));
  }

  assessIntegration(channelMetrics) {
    // Assess how well channels are integrated
    const activeChannels = Object.values(channelMetrics).filter(m => m.mentioned).length;
    if (activeChannels < 2) return 0;
    
    // Look for cross-channel mentions (simplified)
    let integrationScore = 0.3; // Base score for having multiple channels
    
    // Check if channels reference each other (would need more sophisticated analysis)
    // For now, give bonus for having 3+ channels
    if (activeChannels >= 3) integrationScore += 0.2;
    if (activeChannels >= 4) integrationScore += 0.2;
    
    return integrationScore;
  }

  getBenchmark(channel, metricContext) {
    // Industry benchmarks (simplified)
    const benchmarks = {
      seo: {
        'traffic': '10% monthly growth',
        'rankings': 'Top 10 positions',
        'general metric': '5% improvement'
      },
      email: {
        'open rate': '20%',
        'click rate': '3%',
        'conversion rate': '2%',
        'general metric': '15%'
      },
      social: {
        'engagement rate': '2%',
        'follower growth': '5% monthly',
        'general metric': '3%'
      },
      ads: {
        'ctr': '2%',
        'conversion rate': '3%',
        'roi': '300%',
        'general metric': '2%'
      },
      directMail: {
        'response rate': '5%',
        'roi': '200%',
        'general metric': '4%'
      }
    };
    
    return benchmarks[channel]?.[metricContext] || '10%';
  }

  calculateGapSeverity(currentValue, benchmark) {
    // Parse numeric values
    const current = parseFloat(currentValue);
    const bench = parseFloat(benchmark);
    
    if (isNaN(current) || isNaN(bench)) return 'medium';
    
    const ratio = current / bench;
    if (ratio < 0.5) return 'high';
    if (ratio < 0.8) return 'medium';
    return 'low';
  }

  getImprovementRecommendation(channel, metricContext) {
    const recommendations = {
      seo: {
        'traffic': 'Optimize content for target keywords and improve site speed',
        'rankings': 'Build quality backlinks and improve on-page SEO',
        'general metric': 'Conduct SEO audit and implement recommendations'
      },
      email: {
        'open rate': 'Improve subject lines and sender name recognition',
        'click rate': 'Enhance email design and call-to-action placement',
        'conversion rate': 'Optimize landing pages and offer relevance',
        'general metric': 'A/B test email elements and segment audiences'
      },
      social: {
        'engagement rate': 'Post more interactive content and respond to comments',
        'follower growth': 'Run contests and collaborate with influencers',
        'general metric': 'Develop consistent content calendar'
      }
    };
    
    return recommendations[channel]?.[metricContext] || 
           `Analyze ${channel} best practices and implement improvements`;
  }

  findDisconnectedChannels(channelMetrics) {
    // Find channels that operate in isolation
    const activeChannels = Object.entries(channelMetrics)
      .filter(([_, data]) => data.mentioned)
      .map(([channel, _]) => channel);
    
    // For simplicity, if we have 3+ channels and no integration score
    // consider some disconnected
    if (activeChannels.length >= 3) {
      return activeChannels.slice(0, 2); // Return first two as example
    }
    
    return [];
  }

  estimateOpportunityEffort(opportunity) {
    const effortMap = {
      seasonal: 2,
      cross_channel: 3,
      industry: 3,
      quick_win: 1
    };
    
    return effortMap[opportunity.type] || 3;
  }

  isPriorityAddressed(priority, session) {
    // Check if priority is already being addressed
    const addressedKeywords = {
      'lead generation': ['leads', 'lead gen', 'acquisition'],
      'content marketing': ['content', 'blog', 'articles'],
      'customer retention': ['retention', 'loyalty', 'repeat'],
      'conversion optimization': ['conversion', 'optimize', 'cro']
    };
    
    const keywords = addressedKeywords[priority] || [priority];
    const allMessages = session.history.map(h => h.message.toLowerCase()).join(' ');
    
    return keywords.some(keyword => allMessages.includes(keyword));
  }

  getChannelsForPriority(priority) {
    const priorityChannels = {
      'lead generation': ['seo', 'ads', 'content'],
      'content marketing': ['seo', 'email', 'social'],
      'customer retention': ['email', 'social', 'directMail'],
      'conversion optimization': ['seo', 'email', 'ads'],
      'foot traffic': ['directMail', 'social', 'ads'],
      'local SEO': ['seo', 'social'],
      'trust building': ['content', 'social', 'email'],
      'patient education': ['content', 'email', 'social']
    };
    
    return priorityChannels[priority] || ['seo', 'email', 'social'];
  }

  generateScalingActions(channel, strengths) {
    const scalingActions = {
      seo: [
        'Target more competitive keywords',
        'Expand content production',
        'Build more authoritative backlinks'
      ],
      email: [
        'Increase sending frequency',
        'Expand segmentation strategy',
        'Test premium offerings'
      ],
      social: [
        'Increase posting frequency',
        'Expand to new platforms',
        'Launch influencer partnerships'
      ],
      ads: [
        'Increase budget allocation',
        'Expand to new platforms',
        'Test new ad formats'
      ],
      directMail: [
        'Expand mailing list',
        'Test premium formats',
        'Increase frequency'
      ]
    };
    
    return scalingActions[channel] || ['Scale successful tactics', 'Increase investment', 'Expand reach'];
  }

  recommendChannelsForOpportunity(opportunity) {
    const opportunityChannels = {
      'New Year resolutions': ['email', 'social', 'ads'],
      'Valentine\'s Day': ['social', 'email', 'directMail'],
      'Spring promotions': ['email', 'social', 'seo'],
      'Back-to-school': ['ads', 'email', 'social'],
      'Black Friday': ['email', 'ads', 'social'],
      'Holiday season': ['all']
    };
    
    return opportunityChannels[opportunity] || ['email', 'social'];
  }

  getRelatedTopicSuggestion(topic) {
    const relatedTopics = {
      seo: 'Consider email marketing to nurture your organic traffic',
      email: 'Explore social media to expand your subscriber base',
      social: 'Look into paid ads to amplify successful content',
      ads: 'Develop SEO strategy for long-term cost reduction',
      directMail: 'Integrate with email for multi-touch campaigns'
    };
    
    return relatedTopics[topic] || 'Explore cross-channel opportunities';
  }

  getHealthSummary(score, coverage) {
    if (score >= 80) {
      return `Excellent marketing performance with ${coverage}% channel coverage. Focus on optimization and scaling.`;
    } else if (score >= 60) {
      return `Good marketing foundation with ${coverage}% channel coverage. Opportunities for growth exist.`;
    } else if (score >= 40) {
      return `Fair marketing performance with ${coverage}% channel coverage. Several areas need attention.`;
    } else {
      return `Marketing needs significant improvement with only ${coverage}% channel coverage. Start with quick wins.`;
    }
  }

  countDataPoints(channelMetrics) {
    let count = 0;
    Object.values(channelMetrics).forEach(channel => {
      count += Object.keys(channel.metrics).length;
      count += channel.issues.length;
      count += channel.strengths.length;
    });
    return count;
  }
}

// Export singleton instance
export const marketingIntelligence = new MarketingIntelligence();
export default MarketingIntelligence;