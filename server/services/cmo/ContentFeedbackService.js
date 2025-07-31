/**
 * Content Feedback Service
 * Collects, analyzes, and learns from content performance feedback
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ContentFeedbackService {
  constructor() {
    this.feedbackDataPath = path.join(__dirname, '../../data/cmo/feedback.json');
    this.performanceDataPath = path.join(__dirname, '../../data/cmo/performance.json');
    this.learningDataPath = path.join(__dirname, '../../data/cmo/learning.json');
    
    // Initialize data structures
    this.feedbackData = {
      contentFeedback: new Map(),
      performanceMetrics: new Map(),
      userPreferences: new Map(),
      contentPatterns: new Map()
    };
    
    // Learning parameters
    this.learningConfig = {
      minFeedbackForLearning: 5,
      performanceThresholds: {
        excellent: 0.8,
        good: 0.6,
        poor: 0.3
      },
      weightFactors: {
        userRating: 0.3,
        performanceMetrics: 0.4,
        engagementSignals: 0.3
      }
    };
    
    // Load existing data
    this.loadFeedbackData();
  }

  /**
   * Load feedback data from storage
   */
  async loadFeedbackData() {
    try {
      const feedbackExists = await this.fileExists(this.feedbackDataPath);
      if (feedbackExists) {
        const data = await fs.readFile(this.feedbackDataPath, 'utf8');
        const parsed = JSON.parse(data);
        
        // Convert arrays back to Maps
        this.feedbackData.contentFeedback = new Map(parsed.contentFeedback || []);
        this.feedbackData.performanceMetrics = new Map(parsed.performanceMetrics || []);
        this.feedbackData.userPreferences = new Map(parsed.userPreferences || []);
        this.feedbackData.contentPatterns = new Map(parsed.contentPatterns || []);
      }
    } catch (error) {
      console.error('Error loading feedback data:', error);
    }
  }

  /**
   * Save feedback data to storage
   */
  async saveFeedbackData() {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.feedbackDataPath);
      await fs.mkdir(dir, { recursive: true });
      
      // Convert Maps to arrays for JSON serialization
      const data = {
        contentFeedback: Array.from(this.feedbackData.contentFeedback),
        performanceMetrics: Array.from(this.feedbackData.performanceMetrics),
        userPreferences: Array.from(this.feedbackData.userPreferences),
        contentPatterns: Array.from(this.feedbackData.contentPatterns),
        lastUpdated: new Date().toISOString()
      };
      
      await fs.writeFile(this.feedbackDataPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving feedback data:', error);
    }
  }

  /**
   * Submit feedback for generated content
   */
  async submitFeedback(contentId, feedback) {
    try {
      const feedbackEntry = {
        id: `feedback-${Date.now()}`,
        contentId,
        timestamp: new Date().toISOString(),
        rating: feedback.rating,
        comments: feedback.comments,
        tags: feedback.tags || [],
        improvements: feedback.improvements || [],
        wouldUseAgain: feedback.wouldUseAgain,
        actualPerformance: feedback.actualPerformance || {}
      };
      
      // Store feedback
      const existingFeedback = this.feedbackData.contentFeedback.get(contentId) || [];
      existingFeedback.push(feedbackEntry);
      this.feedbackData.contentFeedback.set(contentId, existingFeedback);
      
      // Update performance metrics
      await this.updatePerformanceMetrics(contentId, feedback);
      
      // Extract patterns
      await this.extractContentPatterns(contentId, feedback);
      
      // Update user preferences
      await this.updateUserPreferences(feedback.userId, feedback);
      
      // Save data
      await this.saveFeedbackData();
      
      // Trigger learning if enough feedback
      if (existingFeedback.length >= this.learningConfig.minFeedbackForLearning) {
        await this.triggerLearning(contentId);
      }
      
      return {
        success: true,
        feedbackId: feedbackEntry.id,
        learningTriggered: existingFeedback.length >= this.learningConfig.minFeedbackForLearning
      };
    } catch (error) {
      console.error('Error submitting feedback:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update performance metrics based on feedback
   */
  async updatePerformanceMetrics(contentId, feedback) {
    const metrics = this.feedbackData.performanceMetrics.get(contentId) || {
      totalFeedback: 0,
      averageRating: 0,
      performanceScores: [],
      engagementMetrics: {
        opens: 0,
        clicks: 0,
        conversions: 0,
        shares: 0
      }
    };
    
    // Update metrics
    metrics.totalFeedback += 1;
    metrics.averageRating = ((metrics.averageRating * (metrics.totalFeedback - 1)) + feedback.rating) / metrics.totalFeedback;
    
    // Add performance data if provided
    if (feedback.actualPerformance) {
      metrics.performanceScores.push({
        timestamp: new Date().toISOString(),
        metrics: feedback.actualPerformance
      });
      
      // Update engagement metrics
      if (feedback.actualPerformance.opens) metrics.engagementMetrics.opens += feedback.actualPerformance.opens;
      if (feedback.actualPerformance.clicks) metrics.engagementMetrics.clicks += feedback.actualPerformance.clicks;
      if (feedback.actualPerformance.conversions) metrics.engagementMetrics.conversions += feedback.actualPerformance.conversions;
      if (feedback.actualPerformance.shares) metrics.engagementMetrics.shares += feedback.actualPerformance.shares;
    }
    
    this.feedbackData.performanceMetrics.set(contentId, metrics);
  }

  /**
   * Extract content patterns from feedback
   */
  async extractContentPatterns(contentId, feedback) {
    // Analyze what worked and what didn't
    const patterns = {
      successful: [],
      unsuccessful: [],
      improvements: feedback.improvements || []
    };
    
    // Categorize based on rating
    if (feedback.rating >= 4) {
      patterns.successful = this.extractSuccessFactors(feedback);
    } else if (feedback.rating <= 2) {
      patterns.unsuccessful = this.extractFailureFactors(feedback);
    }
    
    // Store patterns
    const existingPatterns = this.feedbackData.contentPatterns.get(contentId) || [];
    existingPatterns.push({
      timestamp: new Date().toISOString(),
      patterns
    });
    
    this.feedbackData.contentPatterns.set(contentId, existingPatterns);
  }

  /**
   * Extract success factors from positive feedback
   */
  extractSuccessFactors(feedback) {
    const factors = [];
    
    if (feedback.tags) {
      factors.push(...feedback.tags.filter(tag => 
        ['engaging', 'clear', 'compelling', 'effective', 'creative'].includes(tag)
      ));
    }
    
    if (feedback.comments) {
      // Simple keyword extraction - in production use NLP
      const positiveKeywords = ['great', 'excellent', 'perfect', 'loved', 'effective'];
      const found = positiveKeywords.filter(keyword => 
        feedback.comments.toLowerCase().includes(keyword)
      );
      factors.push(...found);
    }
    
    return factors;
  }

  /**
   * Extract failure factors from negative feedback
   */
  extractFailureFactors(feedback) {
    const factors = [];
    
    if (feedback.tags) {
      factors.push(...feedback.tags.filter(tag => 
        ['confusing', 'boring', 'too long', 'unclear', 'ineffective'].includes(tag)
      ));
    }
    
    if (feedback.improvements) {
      factors.push(...feedback.improvements.map(imp => `needs-${imp}`));
    }
    
    return factors;
  }

  /**
   * Update user preferences based on feedback
   */
  async updateUserPreferences(userId, feedback) {
    if (!userId) return;
    
    const preferences = this.feedbackData.userPreferences.get(userId) || {
      preferredTone: {},
      preferredLength: {},
      preferredStyle: {},
      contentTypePreferences: {}
    };
    
    // Update tone preferences
    if (feedback.tone) {
      preferences.preferredTone[feedback.tone] = (preferences.preferredTone[feedback.tone] || 0) + feedback.rating;
    }
    
    // Update content type preferences
    if (feedback.contentType) {
      preferences.contentTypePreferences[feedback.contentType] = 
        (preferences.contentTypePreferences[feedback.contentType] || 0) + feedback.rating;
    }
    
    this.feedbackData.userPreferences.set(userId, preferences);
  }

  /**
   * Trigger learning process
   */
  async triggerLearning(contentId) {
    try {
      const feedback = this.feedbackData.contentFeedback.get(contentId);
      const metrics = this.feedbackData.performanceMetrics.get(contentId);
      const patterns = this.feedbackData.contentPatterns.get(contentId);
      
      if (!feedback || !metrics) return;
      
      // Calculate overall performance score
      const performanceScore = this.calculatePerformanceScore(metrics);
      
      // Extract learning insights
      const insights = {
        contentId,
        performanceScore,
        averageRating: metrics.averageRating,
        totalFeedback: metrics.totalFeedback,
        successFactors: this.aggregateFactors(patterns, 'successful'),
        failureFactors: this.aggregateFactors(patterns, 'unsuccessful'),
        recommendedImprovements: this.generateRecommendations(metrics, patterns),
        timestamp: new Date().toISOString()
      };
      
      // Save learning data
      await this.saveLearningInsights(insights);
      
      return insights;
    } catch (error) {
      console.error('Error in learning process:', error);
      return null;
    }
  }

  /**
   * Calculate overall performance score
   */
  calculatePerformanceScore(metrics) {
    const weights = this.learningConfig.weightFactors;
    
    // Normalize rating to 0-1 scale
    const ratingScore = metrics.averageRating / 5;
    
    // Calculate engagement score
    const engagementScore = this.calculateEngagementScore(metrics.engagementMetrics);
    
    // Calculate performance trend
    const trendScore = this.calculateTrendScore(metrics.performanceScores);
    
    // Weighted average
    return (
      ratingScore * weights.userRating +
      engagementScore * weights.engagementSignals +
      trendScore * weights.performanceMetrics
    );
  }

  /**
   * Calculate engagement score
   */
  calculateEngagementScore(engagementMetrics) {
    if (!engagementMetrics) return 0.5;
    
    // Simple scoring - in production use more sophisticated metrics
    const openRate = engagementMetrics.opens > 0 ? Math.min(1, engagementMetrics.opens / 100) : 0;
    const clickRate = engagementMetrics.clicks > 0 ? Math.min(1, engagementMetrics.clicks / 20) : 0;
    const conversionRate = engagementMetrics.conversions > 0 ? Math.min(1, engagementMetrics.conversions / 5) : 0;
    
    return (openRate + clickRate * 2 + conversionRate * 3) / 6;
  }

  /**
   * Calculate performance trend
   */
  calculateTrendScore(performanceScores) {
    if (!performanceScores || performanceScores.length < 2) return 0.5;
    
    // Calculate if performance is improving over time
    const recent = performanceScores.slice(-3);
    const older = performanceScores.slice(0, 3);
    
    const recentAvg = recent.reduce((sum, score) => sum + (score.metrics.overall || 0), 0) / recent.length;
    const olderAvg = older.reduce((sum, score) => sum + (score.metrics.overall || 0), 0) / older.length;
    
    // Normalize improvement to 0-1 scale
    const improvement = (recentAvg - olderAvg) / 100;
    return Math.max(0, Math.min(1, 0.5 + improvement));
  }

  /**
   * Aggregate factors from patterns
   */
  aggregateFactors(patterns, type) {
    if (!patterns) return [];
    
    const factorCounts = {};
    
    patterns.forEach(pattern => {
      const factors = pattern.patterns[type] || [];
      factors.forEach(factor => {
        factorCounts[factor] = (factorCounts[factor] || 0) + 1;
      });
    });
    
    // Sort by frequency
    return Object.entries(factorCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([factor, count]) => ({ factor, count }));
  }

  /**
   * Generate recommendations based on insights
   */
  generateRecommendations(metrics, patterns) {
    const recommendations = [];
    
    // Rating-based recommendations
    if (metrics.averageRating < 3) {
      recommendations.push('Consider significant content strategy revision');
    } else if (metrics.averageRating < 4) {
      recommendations.push('Minor improvements needed for better engagement');
    }
    
    // Pattern-based recommendations
    if (patterns) {
      const failureFactors = this.aggregateFactors(patterns, 'unsuccessful');
      failureFactors.slice(0, 3).forEach(({ factor }) => {
        if (factor.startsWith('needs-')) {
          recommendations.push(`Improve ${factor.replace('needs-', '')}`);
        }
      });
    }
    
    // Engagement-based recommendations
    if (metrics.engagementMetrics) {
      if (metrics.engagementMetrics.opens < 10) {
        recommendations.push('Improve subject lines and preview text');
      }
      if (metrics.engagementMetrics.clicks < 5) {
        recommendations.push('Strengthen call-to-action elements');
      }
    }
    
    return recommendations;
  }

  /**
   * Save learning insights
   */
  async saveLearningInsights(insights) {
    try {
      // Load existing learning data
      let learningData = [];
      const exists = await this.fileExists(this.learningDataPath);
      if (exists) {
        const data = await fs.readFile(this.learningDataPath, 'utf8');
        learningData = JSON.parse(data);
      }
      
      // Add new insights
      learningData.push(insights);
      
      // Keep only recent insights (last 1000)
      if (learningData.length > 1000) {
        learningData = learningData.slice(-1000);
      }
      
      // Save
      await fs.writeFile(this.learningDataPath, JSON.stringify(learningData, null, 2));
    } catch (error) {
      console.error('Error saving learning insights:', error);
    }
  }

  /**
   * Get content recommendations based on learning
   */
  async getContentRecommendations(contentType, userId) {
    try {
      // Load user preferences
      const userPrefs = this.feedbackData.userPreferences.get(userId) || {};
      
      // Load learning insights
      let learningData = [];
      const exists = await this.fileExists(this.learningDataPath);
      if (exists) {
        const data = await fs.readFile(this.learningDataPath, 'utf8');
        learningData = JSON.parse(data);
      }
      
      // Filter relevant insights
      const relevantInsights = learningData.filter(insight => 
        insight.performanceScore > this.learningConfig.performanceThresholds.good
      );
      
      // Extract successful patterns
      const successPatterns = {};
      relevantInsights.forEach(insight => {
        insight.successFactors?.forEach(({ factor, count }) => {
          successPatterns[factor] = (successPatterns[factor] || 0) + count;
        });
      });
      
      // Generate recommendations
      const recommendations = {
        preferredTone: this.getPreferredValue(userPrefs.preferredTone),
        preferredStyle: this.getPreferredValue(userPrefs.preferredStyle),
        successFactors: Object.entries(successPatterns)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([factor]) => factor),
        avoidFactors: this.getCommonFailureFactors(learningData),
        contentTypeInsights: this.getContentTypeInsights(contentType, learningData)
      };
      
      return recommendations;
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return {
        preferredTone: 'professional',
        successFactors: [],
        avoidFactors: [],
        contentTypeInsights: {}
      };
    }
  }

  /**
   * Get preferred value from preferences
   */
  getPreferredValue(preferences) {
    if (!preferences || Object.keys(preferences).length === 0) return null;
    
    // Find highest rated preference
    return Object.entries(preferences)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  }

  /**
   * Get common failure factors
   */
  getCommonFailureFactors(learningData) {
    const failureFactors = {};
    
    learningData
      .filter(insight => insight.performanceScore < this.learningConfig.performanceThresholds.poor)
      .forEach(insight => {
        insight.failureFactors?.forEach(({ factor, count }) => {
          failureFactors[factor] = (failureFactors[factor] || 0) + count;
        });
      });
    
    return Object.entries(failureFactors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([factor]) => factor);
  }

  /**
   * Get content type specific insights
   */
  getContentTypeInsights(contentType, learningData) {
    const typeInsights = learningData.filter(insight => 
      insight.contentType === contentType && 
      insight.performanceScore > this.learningConfig.performanceThresholds.good
    );
    
    if (typeInsights.length === 0) return {};
    
    // Aggregate insights
    const insights = {
      averagePerformance: typeInsights.reduce((sum, i) => sum + i.performanceScore, 0) / typeInsights.length,
      topRecommendations: this.aggregateRecommendations(typeInsights),
      bestPractices: this.extractBestPractices(typeInsights)
    };
    
    return insights;
  }

  /**
   * Aggregate recommendations
   */
  aggregateRecommendations(insights) {
    const recommendations = {};
    
    insights.forEach(insight => {
      insight.recommendedImprovements?.forEach(rec => {
        recommendations[rec] = (recommendations[rec] || 0) + 1;
      });
    });
    
    return Object.entries(recommendations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([rec]) => rec);
  }

  /**
   * Extract best practices
   */
  extractBestPractices(insights) {
    const practices = [];
    
    // Find common success factors in high-performing content
    const highPerformers = insights.filter(i => i.performanceScore > this.learningConfig.performanceThresholds.excellent);
    
    if (highPerformers.length > 0) {
      const commonFactors = {};
      highPerformers.forEach(insight => {
        insight.successFactors?.forEach(({ factor }) => {
          commonFactors[factor] = (commonFactors[factor] || 0) + 1;
        });
      });
      
      Object.entries(commonFactors)
        .filter(([_, count]) => count > highPerformers.length / 2)
        .forEach(([factor]) => {
          practices.push(`Include ${factor} elements for better performance`);
        });
    }
    
    return practices;
  }

  /**
   * Get performance summary
   */
  async getPerformanceSummary(timeRange = 'all') {
    try {
      const summary = {
        totalContent: this.feedbackData.contentFeedback.size,
        totalFeedback: 0,
        averageRating: 0,
        performanceDistribution: {
          excellent: 0,
          good: 0,
          average: 0,
          poor: 0
        },
        topPerformers: [],
        needsImprovement: []
      };
      
      // Calculate metrics
      let totalRating = 0;
      const contentScores = [];
      
      this.feedbackData.performanceMetrics.forEach((metrics, contentId) => {
        summary.totalFeedback += metrics.totalFeedback;
        totalRating += metrics.averageRating * metrics.totalFeedback;
        
        const score = this.calculatePerformanceScore(metrics);
        contentScores.push({ contentId, score, rating: metrics.averageRating });
        
        // Categorize performance
        if (score >= this.learningConfig.performanceThresholds.excellent) {
          summary.performanceDistribution.excellent++;
        } else if (score >= this.learningConfig.performanceThresholds.good) {
          summary.performanceDistribution.good++;
        } else if (score >= this.learningConfig.performanceThresholds.poor) {
          summary.performanceDistribution.average++;
        } else {
          summary.performanceDistribution.poor++;
        }
      });
      
      // Calculate overall average
      summary.averageRating = summary.totalFeedback > 0 ? totalRating / summary.totalFeedback : 0;
      
      // Sort and get top/bottom performers
      contentScores.sort((a, b) => b.score - a.score);
      summary.topPerformers = contentScores.slice(0, 5);
      summary.needsImprovement = contentScores.slice(-5).reverse();
      
      return summary;
    } catch (error) {
      console.error('Error generating performance summary:', error);
      return null;
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

export default ContentFeedbackService;