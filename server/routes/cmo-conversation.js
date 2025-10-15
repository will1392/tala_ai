/**
 * CMO Conversation Management Routes
 */

import express from 'express';
import { cmoAssistant } from '../services/cmo/CMOAssistant.js';
import { authenticate } from '../middleware/auth.js';
import { requireCredits } from '../middleware/creditsMiddleware.js';

const router = express.Router();

/**
 * Navigate back in conversation
 */
router.post('/navigate', authenticate, requireCredits('chat_message'), async (req, res) => {
  try {
    const { userId, stepsBack = 1 } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }
    
    const result = await cmoAssistant.navigateBack(userId, stepsBack);
    res.json(result);
  } catch (error) {
    console.error('Navigation error:', error);
    res.status(500).json({ error: 'Failed to navigate conversation' });
  }
});

/**
 * Process follow-up suggestion
 */
router.post('/followup', authenticate, requireCredits('chat_message'), async (req, res) => {
  try {
    const { userId, suggestion } = req.body;
    
    if (!userId || !suggestion) {
      return res.status(400).json({ error: 'User ID and suggestion required' });
    }
    
    const result = await cmoAssistant.processFollowUp(userId, suggestion);
    res.json(result);
  } catch (error) {
    console.error('Follow-up error:', error);
    res.status(500).json({ error: 'Failed to process follow-up' });
  }
});

/**
 * Clear conversation session
 */
router.post('/clear', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }
    
    const result = await cmoAssistant.clearConversation(userId);
    res.json(result);
  } catch (error) {
    console.error('Clear conversation error:', error);
    res.status(500).json({ error: 'Failed to clear conversation' });
  }
});

/**
 * Get conversation summary
 */
router.get('/summary', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }
    
    const summary = await cmoAssistant.getConversationSummary(userId);
    res.json(summary);
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ error: 'Failed to get conversation summary' });
  }
});

export default router;