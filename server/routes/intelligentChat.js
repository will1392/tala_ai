/**
 * Intelligent Chat Route
 * 
 * Integrates TalaIntelligence for context-aware, learning-enabled chat responses
 */

import express from 'express';
import TalaIntelligence from '../services/intelligence/TalaIntelligence.js';
import { requireAuth, authenticate } from '../middleware/auth.js';

const router = express.Router();

// Initialize intelligence system
const intelligenceConfig = {
  maxContextSize: 8000,
  compressionThreshold: 0.8,
  memoryRetrievalLimit: 10,
  learningEnabled: true,
  mockMode: false // Use real database for persistence
};

const intelligence = new TalaIntelligence(intelligenceConfig);

// Initialize on startup
(async () => {
  try {
    await intelligence.initialize();
    console.log('✅ Intelligent chat system ready');
  } catch (error) {
    console.error('❌ Failed to initialize intelligent chat:', error);
  }
})();

/**
 * POST /api/chat/v2
 * Enhanced chat endpoint with full intelligence integration
 */
router.post('/v2', authenticate, async (req, res) => {
  try {
    const {
      message,
      conversationId,
      location,
      device,
      attachments,
      preferredStyle,
      costOptimization,
      fastResponse
    } = req.body;
    
    if (!message?.trim()) {
      return res.status(400).json({ 
        error: 'Message is required',
        code: 'MISSING_MESSAGE' 
      });
    }
    
    console.log(`🧠 Intelligent chat request from user ${req.userId}`);
    
    // Process request through intelligence layer
    const intelligentResponse = await intelligence.processRequest({
      userId: req.userId,
      organizationId: req.organizationId,
      content: message,
      conversationId,
      source: 'chat',
      timestamp: new Date(),
      location,
      device,
      data: {
        attachments,
        preferences: {
          responseStyle: preferredStyle,
          costOptimization,
          fastResponse
        }
      }
    });
    
    if (!intelligentResponse.success) {
      return res.status(500).json({
        error: intelligentResponse.error || 'Failed to process request',
        fallback: intelligentResponse.response,
        metadata: intelligentResponse.metadata
      });
    }
    
    // Send successful response
    res.json({
      success: true,
      response: intelligentResponse.response.content,
      metadata: {
        ...intelligentResponse.metadata,
        suggestions: intelligentResponse.response.suggestions,
        responseStyle: intelligentResponse.response.metadata.style
      },
      conversationId: intelligentResponse.metadata.threadId || conversationId
    });
    
  } catch (error) {
    console.error('❌ Intelligent chat error:', error);
    res.status(500).json({
      error: 'An error occurred processing your request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/chat/feedback
 * Submit feedback for a chat interaction
 */
router.post('/feedback', authenticate, async (req, res) => {
  try {
    const {
      requestId,
      conversationId,
      rating,
      comment,
      helpful,
      accurate,
      issues
    } = req.body;
    
    if (!requestId || rating === undefined) {
      return res.status(400).json({
        error: 'Request ID and rating are required',
        code: 'MISSING_FEEDBACK_DATA'
      });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        error: 'Rating must be between 1 and 5',
        code: 'INVALID_RATING'
      });
    }
    
    console.log(`📝 Processing feedback from user ${req.userId} for request ${requestId}`);
    
    // Process feedback through intelligence system
    const feedbackResult = await intelligence.processFeedback({
      requestId,
      conversationId,
      userId: req.userId,
      rating,
      comment,
      metadata: {
        helpful,
        accurate,
        issues
      },
      timestamp: new Date()
    });
    
    res.json({
      success: true,
      message: 'Thank you for your feedback',
      result: feedbackResult
    });
    
  } catch (error) {
    console.error('❌ Feedback processing error:', error);
    res.status(500).json({
      error: 'Failed to process feedback',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/chat/suggestions
 * Get conversation suggestions based on context
 */
router.get('/suggestions', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.query;
    
    if (!conversationId) {
      return res.status(400).json({
        error: 'Conversation ID is required',
        code: 'MISSING_CONVERSATION_ID'
      });
    }
    
    // Get suggestions from the current conversation context
    const context = await intelligence.contextManager.getContext(conversationId);
    const userProfile = await intelligence.profileManager.getProfile(req.userId);
    
    // Generate contextual suggestions
    const suggestions = [];
    
    // Based on recent topics
    if (context.topics?.includes('travel')) {
      suggestions.push('Would you like me to check visa requirements?');
      suggestions.push('Should I help you create an itinerary?');
    }
    
    if (context.topics?.includes('documents')) {
      suggestions.push('Do you need help with document preparation?');
      suggestions.push('Would you like a checklist for your trip?');
    }
    
    // Based on user preferences
    if (userProfile.preferences.detailedResponses) {
      suggestions.push('Would you like more detailed information?');
    }
    
    res.json({
      success: true,
      suggestions: suggestions.slice(0, 5),
      context: {
        topics: context.topics,
        recentEntities: context.entities?.slice(0, 3)
      }
    });
    
  } catch (error) {
    console.error('❌ Suggestions error:', error);
    res.status(500).json({
      error: 'Failed to generate suggestions',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/chat/metrics
 * Get chat system metrics (admin only)
 */
router.get('/metrics', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required',
        code: 'FORBIDDEN'
      });
    }
    
    const metrics = intelligence.getMetrics();
    
    res.json({
      success: true,
      metrics: {
        performance: metrics.performanceMetrics,
        agents: metrics.agentOrchestrator,
        memory: metrics.memoryManager,
        context: metrics.contextManager,
        learning: metrics.learningEngine
      },
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('❌ Metrics error:', error);
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/chat/context/status/:conversationId
 * Get context status for a conversation
 */
router.get('/context/status/:conversationId', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    if (!conversationId) {
      return res.status(400).json({
        error: 'Conversation ID is required',
        code: 'MISSING_CONVERSATION_ID'
      });
    }
    
    // Get context status from intelligence system
    const context = await intelligence.contextManager.getContext(conversationId);
    const compressed = context?.compressionState || false;
    const size = context?.currentSize || 0;
    const maxSize = intelligenceConfig.maxContextSize || 8000;
    
    res.json({
      success: true,
      conversationId,
      status: {
        exists: !!context,
        compressed,
        size,
        maxSize,
        utilizationPercent: Math.round((size / maxSize) * 100),
        topics: context?.topics || [],
        entities: context?.entities || [],
        lastUpdated: context?.lastUpdated || null
      }
    });
    
  } catch (error) {
    console.error('❌ Context status error:', error);
    res.status(500).json({
      error: 'Failed to retrieve context status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/chat/context/reset
 * Reset conversation context
 */
router.post('/context/reset', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.body;
    
    if (!conversationId) {
      return res.status(400).json({
        error: 'Conversation ID is required',
        code: 'MISSING_CONVERSATION_ID'
      });
    }
    
    // Reset context through intelligence system
    await intelligence.contextManager.resetContext(conversationId);
    
    res.json({
      success: true,
      message: 'Conversation context has been reset',
      conversationId
    });
    
  } catch (error) {
    console.error('❌ Context reset error:', error);
    res.status(500).json({
      error: 'Failed to reset context',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/chat/history
 * Get conversation history with intelligence metadata
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const { conversationId, limit = 20 } = req.query;
    
    if (!conversationId) {
      return res.status(400).json({
        error: 'Conversation ID is required',
        code: 'MISSING_CONVERSATION_ID'
      });
    }
    
    // Get thread messages
    const messages = await intelligence.threadingService.getThreadMessages(
      conversationId,
      { limit: parseInt(limit) }
    );
    
    // Get related memories
    const memories = await intelligence.memoryManager.retrieveMemories({
      userId: req.userId,
      filters: {
        metadata: { threadId: conversationId }
      },
      limit: 5
    });
    
    res.json({
      success: true,
      messages,
      memories: memories.map(m => ({
        id: m.id,
        content: m.content,
        importance: m.importance,
        timestamp: m.timestamp
      })),
      conversationId
    });
    
  } catch (error) {
    console.error('❌ History retrieval error:', error);
    res.status(500).json({
      error: 'Failed to retrieve history',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down intelligent chat system...');
  await intelligence.shutdown();
});

export default router;