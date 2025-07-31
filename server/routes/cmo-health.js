/**
 * CMO Marketing Health API Routes
 * 
 * Provides endpoints for marketing health assessment and intelligence
 */

import express from 'express';
import { cmoAssistant } from '../services/cmo/CMOAssistant.js';
import { marketingIntelligence } from '../services/cmo/MarketingIntelligence.js';

const router = express.Router();

/**
 * Get marketing health assessment
 */
router.get('/health', async (req, res) => {
  try {
    const userId = req.query.userId || req.session?.userId || 'default';
    
    const health = await cmoAssistant.getMarketingHealth(userId);
    
    if (!health) {
      return res.status(404).json({
        error: 'Unable to generate health assessment',
        message: 'Please engage in conversation first to gather marketing data'
      });
    }
    
    res.json({
      success: true,
      health,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error getting marketing health:', error);
    res.status(500).json({
      error: 'Failed to get marketing health',
      message: error.message
    });
  }
});

/**
 * Get proactive suggestions
 */
router.get('/suggestions', async (req, res) => {
  try {
    const userId = req.query.userId || req.session?.userId || 'default';
    
    const suggestions = await cmoAssistant.getProactiveSuggestions(userId);
    
    res.json({
      success: true,
      suggestions,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error getting suggestions:', error);
    res.status(500).json({
      error: 'Failed to get suggestions',
      message: error.message
    });
  }
});

/**
 * Update progress metrics
 */
router.post('/progress', async (req, res) => {
  try {
    const userId = req.body.userId || req.session?.userId || 'default';
    const { channel, metric, value } = req.body;
    
    if (!channel || !metric || value === undefined) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['channel', 'metric', 'value']
      });
    }
    
    marketingIntelligence.updateProgress(userId, channel, metric, value);
    
    res.json({
      success: true,
      message: 'Progress updated',
      data: { channel, metric, value }
    });
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({
      error: 'Failed to update progress',
      message: error.message
    });
  }
});

/**
 * Process health-related query
 */
router.post('/query', async (req, res) => {
  try {
    const userId = req.body.userId || req.session?.userId || 'default';
    const { query } = req.body;
    
    const response = await cmoAssistant.processHealthQuery(userId, query);
    
    res.json({
      success: true,
      response,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error processing health query:', error);
    res.status(500).json({
      error: 'Failed to process health query',
      message: error.message
    });
  }
});

/**
 * Get specific channel health
 */
router.get('/channel/:channel', async (req, res) => {
  try {
    const userId = req.query.userId || req.session?.userId || 'default';
    const { channel } = req.params;
    
    const health = await cmoAssistant.getMarketingHealth(userId);
    
    if (!health || !health.health[channel]) {
      return res.status(404).json({
        error: 'Channel health not found',
        message: `No health data available for channel: ${channel}`
      });
    }
    
    const channelHealth = health.health[channel];
    const relatedInsights = health.crossChannelInsights
      .filter(insight => 
        insight.from === channel || 
        insight.to === channel ||
        insight.channels?.includes(channel)
      );
    
    res.json({
      success: true,
      channel,
      health: channelHealth,
      insights: relatedInsights,
      recommendations: health.recommendations.immediate
        .concat(health.recommendations.shortTerm)
        .filter(rec => 
          rec.channel === channel || 
          rec.channels?.includes(channel)
        ),
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error getting channel health:', error);
    res.status(500).json({
      error: 'Failed to get channel health',
      message: error.message
    });
  }
});

export default router;