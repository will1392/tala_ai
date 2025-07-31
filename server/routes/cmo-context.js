/**
 * CMO Context Detection API Routes
 */

import express from 'express';
import { contextAwareChat } from '../services/cmo/ContextAwareChat.js';

const router = express.Router();

/**
 * Analyze message context
 */
router.post('/analyze', async (req, res) => {
  try {
    const { message, currentMode, currentSubMode, autoSwitchEnabled } = req.body;
    const userId = req.headers['x-user-id'] || req.body.userId || 'anonymous';

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Set auto-switch preference
    contextAwareChat.setAutoSwitch(autoSwitchEnabled !== false);

    // Process message with context awareness
    const result = await contextAwareChat.processMessage(
      message,
      currentMode,
      currentSubMode,
      userId
    );

    res.json(result);
  } catch (error) {
    console.error('Context analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze context',
      message: error.message 
    });
  }
});

/**
 * Get context insights
 */
router.get('/insights', async (req, res) => {
  try {
    const insights = contextAwareChat.getContextInsights();
    res.json(insights || {
      dominantContext: null,
      contextSwitches: 0,
      averageConfidence: 0,
      recentTrend: null
    });
  } catch (error) {
    console.error('Context insights error:', error);
    res.status(500).json({ 
      error: 'Failed to get context insights',
      message: error.message 
    });
  }
});

/**
 * Clear context history
 */
router.post('/clear', async (req, res) => {
  try {
    contextAwareChat.clearHistory();
    res.json({ success: true, message: 'Context history cleared' });
  } catch (error) {
    console.error('Clear context error:', error);
    res.status(500).json({ 
      error: 'Failed to clear context history',
      message: error.message 
    });
  }
});

/**
 * Toggle auto-switch
 */
router.post('/auto-switch', async (req, res) => {
  try {
    const { enabled } = req.body;
    contextAwareChat.setAutoSwitch(enabled);
    res.json({ 
      success: true, 
      autoSwitchEnabled: enabled 
    });
  } catch (error) {
    console.error('Auto-switch toggle error:', error);
    res.status(500).json({ 
      error: 'Failed to toggle auto-switch',
      message: error.message 
    });
  }
});

export default router;