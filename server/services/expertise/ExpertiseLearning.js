/**
 * ExpertiseLearning - Dynamic expertise adjustment system
 * Learns from user interactions and adapts expertise levels
 */

import { SupabaseDatabaseService } from '../db/SupabaseDatabaseService.js';

class ExpertiseLearning {
  constructor() {
    this.db = new SupabaseDatabaseService();
    
    // Comprehension indicators
    this.indicators = {
      confusion: {
        phrases: [
          "i don't understand",
          "can you explain",
          "what does that mean",
          "i'm confused",
          "too complicated",
          "can you simplify",
          "lost me",
          "break it down",
          "what is",
          "how does",
          "sorry, but",
          "wait, what"
        ],
        patterns: [
          /explain.*?simpl/i,
          /don'?t\s+get/i,
          /too\s+technical/i,
          /over\s+my\s+head/i
        ]
      },
      mastery: {
        phrases: [
          "i already know",
          "can we skip",
          "give me advanced",
          "too basic",
          "i understand that",
          "more technical",
          "deeper dive",
          "expert level",
          "familiar with",
          "experienced in"
        ],
        patterns: [
          /already\s+familiar/i,
          /skip.*?basics/i,
          /want.*?advanced/i,
          /need.*?complex/i
        ]
      },
      success: {
        phrases: [
          "got it",
          "makes sense",
          "i see",
          "understood",
          "clear now",
          "perfect",
          "exactly what i needed",
          "thanks for explaining"
        ],
        patterns: [
          /now\s+i\s+understand/i,
          /that\s+helps/i,
          /much\s+clearer/i
        ]
      }
    };
    
    // Learning thresholds
    this.thresholds = {
      confusionRate: 0.3,      // 30% confusion signals = suggest decrease
      masteryRate: 0.8,        // 80% mastery signals = suggest increase
      minInteractions: 10,     // Minimum interactions before adjustment
      confidenceRequired: 0.7, // Confidence level for automatic adjustment
      cooldownPeriod: 7        // Days between adjustments
    };
  }

  /**
   * Track and analyze user interaction
   */
  async trackInteraction(userId, interaction) {
    try {
      const signals = {
        timestamp: new Date().toISOString(),
        messageContent: interaction.message || '',
        responseContent: interaction.response || '',
        askedForClarification: false,
        usedAdvancedTerms: false,
        completedTaskSuccessfully: false,
        timeToComplete: interaction.duration || 0,
        followUpQuestions: [],
        comprehensionLevel: 'neutral',
        topicArea: interaction.topic || 'general',
        interactionType: interaction.type || 'message'
      };
      
      // Analyze interaction for expertise signals
      const analysis = await this.analyzeInteraction(interaction, signals);
      
      // Store interaction data
      await this.storeInteractionData(userId, analysis);
      
      // Check if expertise adjustment is needed
      const adjustment = await this.checkForAdjustment(userId);
      
      return {
        analysis,
        adjustment,
        currentLevel: await this.getCurrentLevel(userId)
      };
    } catch (error) {
      console.error('Error tracking interaction:', error);
      throw error;
    }
  }

  /**
   * Analyze interaction for expertise signals
   */
  analyzeInteraction(interaction, signals) {
    const message = (interaction.message || '').toLowerCase();
    const response = (interaction.response || '').toLowerCase();
    
    // Check for confusion indicators
    const confusionScore = this.calculateIndicatorScore(message, this.indicators.confusion);
    
    // Check for mastery indicators
    const masteryScore = this.calculateIndicatorScore(message, this.indicators.mastery);
    
    // Check for success indicators
    const successScore = this.calculateIndicatorScore(message, this.indicators.success);
    
    // Analyze response complexity
    const responseComplexity = this.analyzeComplexity(response);
    
    // Determine comprehension level
    if (confusionScore > 0.5) {
      signals.comprehensionLevel = 'confused';
      signals.askedForClarification = true;
    } else if (masteryScore > 0.5) {
      signals.comprehensionLevel = 'advanced';
      signals.usedAdvancedTerms = true;
    } else if (successScore > 0.5) {
      signals.comprehensionLevel = 'understood';
      signals.completedTaskSuccessfully = true;
    }
    
    // Extract follow-up questions
    signals.followUpQuestions = this.extractQuestions(message);
    
    // Add analysis scores
    signals.confusionScore = confusionScore;
    signals.masteryScore = masteryScore;
    signals.successScore = successScore;
    signals.responseComplexity = responseComplexity;
    
    return signals;
  }

  /**
   * Calculate indicator score based on phrases and patterns
   */
  calculateIndicatorScore(text, indicator) {
    let score = 0;
    let matches = 0;
    
    // Check phrases
    for (const phrase of indicator.phrases) {
      if (text.includes(phrase)) {
        matches++;
      }
    }
    
    // Check patterns
    for (const pattern of indicator.patterns) {
      if (pattern.test(text)) {
        matches++;
      }
    }
    
    // Calculate score (0-1)
    const totalIndicators = indicator.phrases.length + indicator.patterns.length;
    score = matches / totalIndicators;
    
    return Math.min(score * 2, 1); // Amplify signal but cap at 1
  }

  /**
   * Analyze text complexity
   */
  analyzeComplexity(text) {
    const metrics = {
      wordCount: text.split(/\s+/).length,
      avgWordLength: 0,
      sentenceCount: text.split(/[.!?]+/).length,
      technicalTerms: 0,
      readabilityScore: 0
    };
    
    // Calculate average word length
    const words = text.split(/\s+/);
    const totalLength = words.reduce((sum, word) => sum + word.length, 0);
    metrics.avgWordLength = totalLength / words.length;
    
    // Count technical terms (simplified)
    const technicalWords = [
      'roi', 'ctr', 'cpc', 'conversion', 'attribution',
      'segmentation', 'funnel', 'metrics', 'analytics',
      'optimization', 'algorithm', 'api', 'integration'
    ];
    
    metrics.technicalTerms = words.filter(word => 
      technicalWords.includes(word.toLowerCase())
    ).length;
    
    // Simple readability score (0-1)
    metrics.readabilityScore = Math.min(
      (metrics.avgWordLength / 10) + 
      (metrics.technicalTerms / metrics.wordCount) * 2,
      1
    );
    
    return metrics;
  }

  /**
   * Extract questions from text
   */
  extractQuestions(text) {
    const questions = [];
    const sentences = text.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      if (sentence.includes('?') || 
          /^(what|how|why|when|where|who|can|should|could|would)/i.test(sentence.trim())) {
        questions.push(sentence.trim());
      }
    }
    
    return questions;
  }

  /**
   * Store interaction data for learning
   */
  async storeInteractionData(userId, analysis) {
    try {
      // Check if database is available
      if (!this.db || !this.db.supabase) {
        console.log('Database not available, skipping interaction storage');
        return;
      }
      
      const { error } = await this.db.supabase
        .from('expertise_interactions')
        .insert({
          user_id: userId,
          timestamp: analysis.timestamp,
          comprehension_level: analysis.comprehensionLevel,
          confusion_score: analysis.confusionScore,
          mastery_score: analysis.masteryScore,
          success_score: analysis.successScore,
          topic_area: analysis.topicArea,
          interaction_type: analysis.interactionType,
          response_complexity: analysis.responseComplexity,
          metadata: {
            timeToComplete: analysis.timeToComplete,
            followUpQuestions: analysis.followUpQuestions,
            askedForClarification: analysis.askedForClarification,
            usedAdvancedTerms: analysis.usedAdvancedTerms
          }
        });
        
      if (error) throw error;
    } catch (error) {
      console.error('Error storing interaction data:', error);
      // Continue even if storage fails
    }
  }

  /**
   * Detect comprehension from conversation history
   */
  async detectComprehension(userId, conversationId) {
    try {
      // Get recent messages from conversation
      const { data: messages } = await this.db.supabase
        .from('messages')
        .select('content, role, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(20);
        
      if (!messages || messages.length === 0) {
        return { level: 'unknown', confidence: 0 };
      }
      
      // Analyze user messages
      const userMessages = messages.filter(m => m.role === 'user');
      let totalConfusion = 0;
      let totalMastery = 0;
      let totalSuccess = 0;
      
      for (const message of userMessages) {
        const text = message.content.toLowerCase();
        totalConfusion += this.calculateIndicatorScore(text, this.indicators.confusion);
        totalMastery += this.calculateIndicatorScore(text, this.indicators.mastery);
        totalSuccess += this.calculateIndicatorScore(text, this.indicators.success);
      }
      
      const avgConfusion = totalConfusion / userMessages.length;
      const avgMastery = totalMastery / userMessages.length;
      const avgSuccess = totalSuccess / userMessages.length;
      
      // Determine comprehension level
      let level = 'neutral';
      let confidence = 0;
      
      if (avgConfusion > avgMastery && avgConfusion > avgSuccess) {
        level = 'struggling';
        confidence = avgConfusion;
      } else if (avgMastery > avgConfusion && avgMastery > avgSuccess) {
        level = 'advanced';
        confidence = avgMastery;
      } else if (avgSuccess > 0.3) {
        level = 'appropriate';
        confidence = avgSuccess;
      }
      
      return {
        level,
        confidence,
        metrics: {
          confusionRate: avgConfusion,
          masteryRate: avgMastery,
          successRate: avgSuccess
        }
      };
    } catch (error) {
      console.error('Error detecting comprehension:', error);
      return { level: 'unknown', confidence: 0 };
    }
  }

  /**
   * Check if expertise adjustment is needed
   */
  async checkForAdjustment(userId) {
    try {
      // Check if database is available
      if (!this.db || !this.db.supabase) {
        console.log('Database not available, skipping adjustment check');
        return null;
      }
      
      // Get recent interactions
      const { data: interactions } = await this.db.supabase
        .from('expertise_interactions')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: false });
        
      if (!interactions || interactions.length < this.thresholds.minInteractions) {
        return { needed: false, reason: 'Insufficient interactions' };
      }
      
      // Calculate aggregate metrics
      const metrics = this.calculateAggregateMetrics(interactions);
      
      // Check if adjustment is needed
      const adjustment = this.suggestLevelAdjustment(userId, metrics);
      
      if (adjustment.suggestion !== 'maintain') {
        // Check cooldown period
        const lastAdjustment = await this.getLastAdjustment(userId);
        if (lastAdjustment && this.isInCooldown(lastAdjustment)) {
          return { needed: false, reason: 'In cooldown period' };
        }
        
        return {
          needed: true,
          ...adjustment,
          metrics
        };
      }
      
      return { needed: false, reason: 'Current level appropriate' };
    } catch (error) {
      console.error('Error checking for adjustment:', error);
      return { needed: false, reason: 'Error in analysis' };
    }
  }

  /**
   * Calculate aggregate metrics from interactions
   */
  calculateAggregateMetrics(interactions) {
    const metrics = {
      totalInteractions: interactions.length,
      confusionRate: 0,
      masteryRate: 0,
      successRate: 0,
      avgResponseComplexity: 0,
      topicDistribution: {},
      recentTrend: 'stable'
    };
    
    // Calculate rates
    let totalConfusion = 0;
    let totalMastery = 0;
    let totalSuccess = 0;
    let totalComplexity = 0;
    
    for (const interaction of interactions) {
      totalConfusion += interaction.confusion_score || 0;
      totalMastery += interaction.mastery_score || 0;
      totalSuccess += interaction.success_score || 0;
      
      if (interaction.response_complexity) {
        totalComplexity += interaction.response_complexity.readabilityScore || 0;
      }
      
      // Track topic distribution
      const topic = interaction.topic_area || 'general';
      metrics.topicDistribution[topic] = (metrics.topicDistribution[topic] || 0) + 1;
    }
    
    metrics.confusionRate = totalConfusion / interactions.length;
    metrics.masteryRate = totalMastery / interactions.length;
    metrics.successRate = totalSuccess / interactions.length;
    metrics.avgResponseComplexity = totalComplexity / interactions.length;
    
    // Analyze recent trend (last 5 vs previous 5)
    if (interactions.length >= 10) {
      const recent = interactions.slice(0, 5);
      const previous = interactions.slice(5, 10);
      
      const recentConfusion = recent.reduce((sum, i) => sum + (i.confusion_score || 0), 0) / 5;
      const previousConfusion = previous.reduce((sum, i) => sum + (i.confusion_score || 0), 0) / 5;
      
      if (recentConfusion > previousConfusion * 1.2) {
        metrics.recentTrend = 'struggling';
      } else if (recentConfusion < previousConfusion * 0.8) {
        metrics.recentTrend = 'improving';
      }
    }
    
    return metrics;
  }

  /**
   * Suggest expertise level adjustment
   */
  suggestLevelAdjustment(userId, metrics) {
    // Check confusion threshold
    if (metrics.confusionRate > this.thresholds.confusionRate) {
      return {
        suggestion: 'decrease',
        reason: 'High confusion rate detected',
        confidence: Math.min(metrics.confusionRate * 1.5, 1),
        recommendedAction: 'Simplify explanations and provide more examples'
      };
    }
    
    // Check mastery threshold
    if (metrics.masteryRate > this.thresholds.masteryRate) {
      return {
        suggestion: 'increase',
        reason: 'User demonstrating advanced understanding',
        confidence: metrics.masteryRate,
        recommendedAction: 'Provide more technical content and advanced strategies'
      };
    }
    
    // Check recent trend
    if (metrics.recentTrend === 'struggling' && metrics.confusionRate > 0.2) {
      return {
        suggestion: 'decrease',
        reason: 'Recent increase in confusion signals',
        confidence: 0.6,
        recommendedAction: 'Slow down and review fundamentals'
      };
    }
    
    if (metrics.recentTrend === 'improving' && metrics.successRate > 0.7) {
      return {
        suggestion: 'increase',
        reason: 'Consistent improvement in understanding',
        confidence: 0.7,
        recommendedAction: 'Challenge with more advanced concepts'
      };
    }
    
    // Check if current level is appropriate
    if (metrics.successRate > 0.5 && metrics.confusionRate < 0.2) {
      return {
        suggestion: 'maintain',
        reason: 'Current level appears appropriate',
        confidence: metrics.successRate,
        recommendedAction: 'Continue with current approach'
      };
    }
    
    return {
      suggestion: 'maintain',
      reason: 'Insufficient signals for adjustment',
      confidence: 0.5,
      recommendedAction: 'Gather more interaction data'
    };
  }

  /**
   * Get current expertise level
   */
  async getCurrentLevel(userId) {
    try {
      // Check if database is available
      if (!this.db || !this.db.supabase) {
        console.log('Database not available, returning default level');
        return 'beginner';
      }
      const { data: user } = await this.db.supabase
        .from('users')
        .select('marketing_expertise_level, expertise_assessment_date')
        .eq('id', userId)
        .single();
        
      return user?.marketing_expertise_level || 'beginner';
    } catch (error) {
      console.error('Error getting current level:', error);
      return 'beginner';
    }
  }

  /**
   * Get last adjustment timestamp
   */
  async getLastAdjustment(userId) {
    try {
      const { data: adjustments } = await this.db.supabase
        .from('expertise_adjustments')
        .select('timestamp')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(1);
        
      return adjustments?.[0]?.timestamp;
    } catch (error) {
      console.error('Error getting last adjustment:', error);
      return null;
    }
  }

  /**
   * Check if in cooldown period
   */
  isInCooldown(lastAdjustmentTime) {
    if (!lastAdjustmentTime) return false;
    
    const daysSinceAdjustment = 
      (Date.now() - new Date(lastAdjustmentTime).getTime()) / 
      (1000 * 60 * 60 * 24);
      
    return daysSinceAdjustment < this.thresholds.cooldownPeriod;
  }

  /**
   * Apply expertise adjustment
   */
  async applyAdjustment(userId, adjustment) {
    try {
      // Get current level
      const currentLevel = await this.getCurrentLevel(userId);
      const levels = ['beginner', 'intermediate', 'advanced', 'expert'];
      const currentIndex = levels.indexOf(currentLevel);
      
      let newLevel = currentLevel;
      if (adjustment.suggestion === 'increase' && currentIndex < levels.length - 1) {
        newLevel = levels[currentIndex + 1];
      } else if (adjustment.suggestion === 'decrease' && currentIndex > 0) {
        newLevel = levels[currentIndex - 1];
      }
      
      if (newLevel === currentLevel) {
        return { success: false, reason: 'No level change needed' };
      }
      
      // Update user level
      const { error: updateError } = await this.db.supabase
        .from('users')
        .update({
          marketing_expertise_level: newLevel,
          expertise_adjustment_date: new Date().toISOString()
        })
        .eq('id', userId);
        
      if (updateError) throw updateError;
      
      // Record adjustment
      const { error: recordError } = await this.db.supabase
        .from('expertise_adjustments')
        .insert({
          user_id: userId,
          previous_level: currentLevel,
          new_level: newLevel,
          reason: adjustment.reason,
          confidence: adjustment.confidence,
          metrics: adjustment.metrics,
          timestamp: new Date().toISOString()
        });
        
      if (recordError) throw recordError;
      
      return {
        success: true,
        previousLevel: currentLevel,
        newLevel,
        reason: adjustment.reason
      };
    } catch (error) {
      console.error('Error applying adjustment:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get learning insights for user
   */
  async getLearningInsights(userId) {
    try {
      // Get recent interactions
      const { data: interactions } = await this.db.supabase
        .from('expertise_interactions')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: false });
        
      if (!interactions || interactions.length === 0) {
        return { hasData: false };
      }
      
      // Calculate insights
      const metrics = this.calculateAggregateMetrics(interactions);
      
      // Get adjustment history
      const { data: adjustments } = await this.db.supabase
        .from('expertise_adjustments')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(5);
      
      // Identify strengths and weaknesses
      const insights = {
        hasData: true,
        currentLevel: await this.getCurrentLevel(userId),
        metrics,
        adjustmentHistory: adjustments || [],
        strengths: [],
        weaknesses: [],
        recommendations: []
      };
      
      // Analyze topic performance
      const topicPerformance = {};
      for (const interaction of interactions) {
        const topic = interaction.topic_area || 'general';
        if (!topicPerformance[topic]) {
          topicPerformance[topic] = {
            total: 0,
            confusion: 0,
            success: 0
          };
        }
        topicPerformance[topic].total++;
        topicPerformance[topic].confusion += interaction.confusion_score || 0;
        topicPerformance[topic].success += interaction.success_score || 0;
      }
      
      // Identify strengths and weaknesses
      for (const [topic, performance] of Object.entries(topicPerformance)) {
        const avgConfusion = performance.confusion / performance.total;
        const avgSuccess = performance.success / performance.total;
        
        if (avgSuccess > 0.7 && avgConfusion < 0.2) {
          insights.strengths.push({
            topic,
            confidence: avgSuccess,
            message: `Strong understanding of ${topic}`
          });
        } else if (avgConfusion > 0.4) {
          insights.weaknesses.push({
            topic,
            difficulty: avgConfusion,
            message: `May benefit from more support with ${topic}`
          });
        }
      }
      
      // Generate recommendations
      if (metrics.confusionRate > 0.3) {
        insights.recommendations.push({
          type: 'learning',
          message: 'Consider reviewing fundamentals or requesting simpler explanations'
        });
      }
      
      if (metrics.masteryRate > 0.7) {
        insights.recommendations.push({
          type: 'advancement',
          message: 'Ready for more advanced topics and strategies'
        });
      }
      
      if (insights.weaknesses.length > 0) {
        insights.recommendations.push({
          type: 'focus',
          message: `Focus on improving: ${insights.weaknesses.map(w => w.topic).join(', ')}`
        });
      }
      
      return insights;
    } catch (error) {
      console.error('Error getting learning insights:', error);
      return { hasData: false, error: error.message };
    }
  }
}

export default ExpertiseLearning;