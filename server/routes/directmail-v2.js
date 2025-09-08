/**
 * Direct Mail V2 Test Route
 * 
 * A simple, isolated endpoint to test the V2 agent without
 * the complexity of the CMO routing system.
 */

import express from 'express';
import { DirectMailAgent } from '../services/cmo/agents/specialized/DirectMailAgent.js';

const router = express.Router();

// Initialize the main agent
const agent = new DirectMailAgent();

// Test endpoint for DirectMail agent
router.post('/test', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    
    console.log(`📬 DirectMail Test - Message:`, message);
    console.log(`📬 DirectMail Test - History length:`, conversationHistory.length);
    
    // Execute the agent
    const response = await agent.execute({
      query: message,
      conversationHistory
    });
    
    console.log('📬 DirectMail Test - Response type:', response.type);
    
    res.json({
      response: response.content.text,
      metadata: response.metadata
    });
    
  } catch (error) {
    console.error('DirectMail Test Error:', error);
    res.status(500).json({
      error: 'Failed to process message',
      details: error.message
    });
  }
});

export default router;