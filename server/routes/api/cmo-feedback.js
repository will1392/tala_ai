import express from 'express';
const router = express.Router();
import ContentFeedbackService from '../../services/cmo/ContentFeedbackService.js';

// Initialize Feedback Service
const feedbackService = new ContentFeedbackService();

/**
 * Submit feedback for generated content
 */
router.post('/submit', async (req, res) => {
  try {
    const { contentId, rating, comments, tags, improvements, wouldUseAgain, actualPerformance, userId, contentType, tone } = req.body;
    
    if (!contentId || rating === undefined) {
      return res.status(400).json({ error: 'Content ID and rating are required' });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    const feedback = {
      rating,
      comments,
      tags,
      improvements,
      wouldUseAgain,
      actualPerformance,
      userId,
      contentType,
      tone
    };
    
    const result = await feedbackService.submitFeedback(contentId, feedback);
    
    if (!result.success) {
      return res.status(500).json({ error: result.error || 'Failed to submit feedback' });
    }
    
    res.json({
      success: true,
      feedbackId: result.feedbackId,
      learningTriggered: result.learningTriggered,
      message: result.learningTriggered ? 'Feedback submitted and learning process triggered' : 'Feedback submitted successfully'
    });
  } catch (error) {
    console.error('Feedback submission error:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

/**
 * Get content recommendations based on learning
 */
router.get('/recommendations/:contentType', async (req, res) => {
  try {
    const { contentType } = req.params;
    const { userId } = req.query;
    
    const recommendations = await feedbackService.getContentRecommendations(contentType, userId);
    
    res.json({
      contentType,
      recommendations,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

/**
 * Get performance summary
 */
router.get('/performance/summary', async (req, res) => {
  try {
    const { timeRange = 'all' } = req.query;
    
    const summary = await feedbackService.getPerformanceSummary(timeRange);
    
    if (!summary) {
      return res.status(500).json({ error: 'Failed to generate performance summary' });
    }
    
    res.json({
      summary,
      timeRange,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting performance summary:', error);
    res.status(500).json({ error: 'Failed to get performance summary' });
  }
});

/**
 * Get feedback for specific content
 */
router.get('/content/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    
    const feedback = feedbackService.feedbackData.contentFeedback.get(contentId) || [];
    const metrics = feedbackService.feedbackData.performanceMetrics.get(contentId);
    const patterns = feedbackService.feedbackData.contentPatterns.get(contentId) || [];
    
    res.json({
      contentId,
      feedback,
      metrics,
      patterns,
      totalFeedback: feedback.length
    });
  } catch (error) {
    console.error('Error getting content feedback:', error);
    res.status(500).json({ error: 'Failed to get content feedback' });
  }
});

/**
 * Batch submit performance data
 */
router.post('/performance/batch', async (req, res) => {
  try {
    const { performanceData } = req.body;
    
    if (!Array.isArray(performanceData)) {
      return res.status(400).json({ error: 'Performance data must be an array' });
    }
    
    const results = [];
    
    for (const data of performanceData) {
      if (data.contentId && data.metrics) {
        const feedback = {
          rating: data.rating || 3,
          actualPerformance: data.metrics,
          userId: data.userId,
          contentType: data.contentType,
          automated: true
        };
        
        const result = await feedbackService.submitFeedback(data.contentId, feedback);
        results.push({
          contentId: data.contentId,
          success: result.success,
          error: result.error
        });
      }
    }
    
    res.json({
      processed: results.length,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Batch performance submission error:', error);
    res.status(500).json({ error: 'Failed to submit batch performance data' });
  }
});

/**
 * Get learning insights
 */
router.get('/insights/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    
    const insights = await feedbackService.triggerLearning(contentId);
    
    if (!insights) {
      return res.status(404).json({ 
        error: 'No insights available', 
        message: 'Not enough feedback data to generate insights' 
      });
    }
    
    res.json({
      contentId,
      insights,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting insights:', error);
    res.status(500).json({ error: 'Failed to get insights' });
  }
});

/**
 * Get user preferences
 */
router.get('/preferences/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const preferences = feedbackService.feedbackData.userPreferences.get(userId) || {
      preferredTone: {},
      preferredLength: {},
      preferredStyle: {},
      contentTypePreferences: {}
    };
    
    // Calculate most preferred options
    const summary = {
      userId,
      preferences,
      recommendations: {
        tone: feedbackService.getPreferredValue(preferences.preferredTone),
        style: feedbackService.getPreferredValue(preferences.preferredStyle),
        contentTypes: Object.entries(preferences.contentTypePreferences)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([type]) => type)
      }
    };
    
    res.json(summary);
  } catch (error) {
    console.error('Error getting user preferences:', error);
    res.status(500).json({ error: 'Failed to get user preferences' });
  }
});

/**
 * Reset feedback data (admin only)
 */
router.delete('/reset', async (req, res) => {
  try {
    // In production, add proper authentication check here
    const { confirmReset } = req.body;
    
    if (confirmReset !== 'RESET_ALL_FEEDBACK_DATA') {
      return res.status(400).json({ 
        error: 'Confirmation required', 
        message: 'Send confirmReset: "RESET_ALL_FEEDBACK_DATA" to confirm' 
      });
    }
    
    // Reset all data
    feedbackService.feedbackData = {
      contentFeedback: new Map(),
      performanceMetrics: new Map(),
      userPreferences: new Map(),
      contentPatterns: new Map()
    };
    
    await feedbackService.saveFeedbackData();
    
    res.json({
      success: true,
      message: 'All feedback data has been reset',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error resetting feedback data:', error);
    res.status(500).json({ error: 'Failed to reset feedback data' });
  }
});

/**
 * Health check
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'CMO Content Feedback',
    timestamp: new Date().toISOString(),
    dataLoaded: {
      contentFeedback: feedbackService.feedbackData.contentFeedback.size,
      performanceMetrics: feedbackService.feedbackData.performanceMetrics.size,
      userPreferences: feedbackService.feedbackData.userPreferences.size,
      contentPatterns: feedbackService.feedbackData.contentPatterns.size
    }
  });
});

export default router;