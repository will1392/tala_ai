/**
 * Agent Debug Endpoint
 * 
 * Development-only endpoint for inspecting agent state and conversation flow
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Store agent states for debugging (in-memory for dev only)
const agentDebugStates = new Map();

/**
 * Store debug state for an agent execution
 */
export function storeDebugState(userId, agentName, state) {
  const key = `${userId}:${agentName}`;
  if (!agentDebugStates.has(key)) {
    agentDebugStates.set(key, []);
  }
  
  const states = agentDebugStates.get(key);
  states.push({
    timestamp: new Date().toISOString(),
    ...state
  });
  
  // Keep only last 10 states per user/agent
  if (states.length > 10) {
    states.shift();
  }
}

/**
 * GET /api/agent/debug
 * 
 * Retrieve debug information for agent conversations
 */
router.get('/debug', requireAuth, async (req, res) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ 
        error: 'Debug endpoint is not available in production' 
      });
    }

    const { userId = req.userId, agentName = 'DirectMailAgent' } = req.query;
    const key = `${userId}:${agentName}`;
    
    const states = agentDebugStates.get(key) || [];
    
    res.json({
      userId,
      agentName,
      states: states.map(state => ({
        timestamp: state.timestamp,
        conversationLength: state.conversationHistory?.length || 0,
        extractedInfo: state.extractedInfo,
        context: {
          hasGoal: state.hasGoal,
          hasAudience: state.hasAudience,
          hasBudget: state.hasBudget,
          hasTimeline: state.hasTimeline,
          hasLuxuryDefinition: state.hasLuxuryDefinition
        },
        lastQuery: state.lastQuery,
        lastResponse: state.lastResponse?.substring(0, 200) + '...',
        routingDecision: state.routingDecision,
        intentParsingUsed: state.intentParsingUsed || false,
        intentParsingResult: state.intentParsingResult
      }))
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ error: 'Failed to retrieve debug information' });
  }
});

/**
 * DELETE /api/agent/debug
 * 
 * Clear debug states for a user/agent
 */
router.delete('/debug', requireAuth, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ 
        error: 'Debug endpoint is not available in production' 
      });
    }

    const { userId = req.userId, agentName } = req.query;
    
    if (agentName) {
      const key = `${userId}:${agentName}`;
      agentDebugStates.delete(key);
    } else {
      // Clear all states for user
      for (const key of agentDebugStates.keys()) {
        if (key.startsWith(`${userId}:`)) {
          agentDebugStates.delete(key);
        }
      }
    }
    
    res.json({ success: true, message: 'Debug states cleared' });
  } catch (error) {
    console.error('Debug clear error:', error);
    res.status(500).json({ error: 'Failed to clear debug states' });
  }
});

/**
 * GET /api/agent/debug/live
 * 
 * Get current conversation state analysis
 */
router.post('/debug/live', requireAuth, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ 
        error: 'Debug endpoint is not available in production' 
      });
    }

    const { conversationHistory, agentName = 'DirectMailAgent' } = req.body;
    
    // Dynamically analyze conversation
    if (agentName === 'DirectMailAgent') {
      const { DirectMailAgent } = await import('../services/cmo/agents/specialized/DirectMailAgent.js');
      const agent = new DirectMailAgent();
      const context = await agent.analyzeConversationContext(conversationHistory || []);
      
      res.json({
        agentName,
        analysis: {
          conversationLength: conversationHistory?.length || 0,
          context,
          nextQuestion: determineNextQuestion(context),
          issues: detectIssues(context, conversationHistory)
        }
      });
    } else {
      res.status(400).json({ error: 'Unsupported agent type' });
    }
  } catch (error) {
    console.error('Live debug error:', error);
    res.status(500).json({ error: 'Failed to analyze conversation' });
  }
});

/**
 * Helper to determine what question should be asked next
 */
function determineNextQuestion(context) {
  if (!context.hasGoal) return 'askAboutGoals';
  if (context.extractedInfo?.needsLuxuryDefinition && !context.hasLuxuryDefinition) return 'askAboutLuxuryDefinition';
  if (!context.hasAudience) return 'askAboutAudience';
  if (!context.hasBudget) return 'askAboutBudget';
  if (!context.hasTimeline) return 'askAboutTimeline';
  return 'providePersonalizedPlan';
}

/**
 * Helper to detect common issues in conversation flow
 */
function detectIssues(context, conversationHistory) {
  const issues = [];
  
  // Check for luxury confusion
  if (context.extractedInfo?.travelType === 'cruise' && 
      conversationHistory?.some(msg => msg.content?.toLowerCase().includes('lux'))) {
    issues.push({
      type: 'INCORRECT_TRAVEL_TYPE',
      message: 'User mentioned luxury but system detected cruise',
      severity: 'high'
    });
  }
  
  // Check for skipped luxury definition
  if (context.extractedInfo?.needsLuxuryDefinition && 
      context.hasBudget && !context.hasLuxuryDefinition) {
    issues.push({
      type: 'SKIPPED_LUXURY_DEFINITION',
      message: 'System should ask for luxury definition before budget',
      severity: 'high'
    });
  }
  
  // Check for audience auto-detection issues
  if (context.hasAudience && !context.extractedInfo?.audience) {
    issues.push({
      type: 'AUDIENCE_DETECTION_WITHOUT_DATA',
      message: 'hasAudience is true but no audience data extracted',
      severity: 'medium'
    });
  }
  
  return issues;
}

export default router;