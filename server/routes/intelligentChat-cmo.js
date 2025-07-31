/**
 * Intelligent Chat Route with CMO Mode Support
 * 
 * Integrates TalaIntelligence for context-aware chat responses
 * and CMO mode for marketing assistance
 */

import express from 'express';
import TalaIntelligence from '../services/intelligence/TalaIntelligence.js';
import { cmoChatHandler } from '../services/cmo/CMOChatHandler.js';
import { getCMOSystemPrompt } from '../prompts/cmo/system-prompts.js';
import { requireAuth, authenticate } from '../middleware/auth.js';

const router = express.Router();

// Initialize intelligence system
const intelligenceConfig = {
  maxContextSize: 8000,
  compressionThreshold: 0.8,
  memoryRetrievalLimit: 10,
  learningEnabled: true,
  mockMode: false
};

const intelligence = new TalaIntelligence(intelligenceConfig);

// Initialize CMO handler
let cmoInitialized = false;
const initializeCMO = async () => {
  if (!cmoInitialized) {
    try {
      await cmoChatHandler.initialize();
      cmoInitialized = true;
      console.log('✅ CMO Chat Handler ready');
    } catch (error) {
      console.error('❌ Failed to initialize CMO handler:', error);
    }
  }
};

// Initialize on startup
(async () => {
  try {
    await intelligence.initialize();
    console.log('✅ Intelligent chat system ready');
    await initializeCMO();
  } catch (error) {
    console.error('❌ Failed to initialize chat systems:', error);
  }
})();

/**
 * POST /api/chat/v2
 * Enhanced chat endpoint with mode support
 */
router.post('/v2', authenticate, async (req, res) => {
  try {
    const {
      message,
      conversationId,
      mode = 'travel', // Default to travel mode
      subMode = null,
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
    
    console.log(`🧠 Intelligent chat request from user ${req.userId} in ${mode} mode`);
    
    // Handle CMO mode
    if (mode === 'cmo') {
      // Ensure CMO is initialized
      await initializeCMO();
      
      // Process through CMO handler
      const cmoResponse = await cmoChatHandler.processMessage(message, {
        conversationId,
        userId: req.userId,
        subMode,
        includeKnowledge: true
      });
      
      // If CMO handler found relevant knowledge, use it
      if (cmoResponse.knowledge && cmoResponse.knowledge.length > 0) {
        console.log(`📚 Found ${cmoResponse.knowledge.length} marketing knowledge items`);
        
        // Enhance response with intelligence layer
        const enhancedResponse = await intelligence.processRequest({
          userId: req.userId,
          organizationId: req.organizationId,
          content: message,
          conversationId,
          source: 'chat',
          timestamp: new Date(),
          location,
          device,
          data: {
            mode: 'cmo',
            subMode,
            attachments,
            preferences: {
              responseStyle: preferredStyle,
              costOptimization,
              fastResponse
            },
            // Include CMO context
            cmoContext: {
              knowledge: cmoResponse.knowledge,
              queryType: cmoResponse.metadata.queryType,
              suggestions: cmoResponse.suggestions
            },
            // Use CMO system prompt
            systemPrompt: getCMOSystemPrompt(subMode)
          }
        });
        
        // Merge CMO metadata with response
        return res.json({
          success: true,
          response: enhancedResponse.response.content,
          mode: 'cmo',
          subMode,
          metadata: {
            ...enhancedResponse.metadata,
            cmo: {
              queryType: cmoResponse.metadata.queryType,
              confidence: cmoResponse.metadata.confidence,
              sources: cmoResponse.metadata.sources
            },
            suggestions: cmoResponse.suggestions,
            quickActions: cmoResponse.quickActions
          },
          conversationId: enhancedResponse.metadata.threadId || conversationId
        });
      } else {
        // No specific knowledge, but still use CMO system prompt
        console.log('📊 Processing general CMO query');
        
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
            mode: 'cmo',
            subMode,
            attachments,
            preferences: {
              responseStyle: preferredStyle,
              costOptimization,
              fastResponse
            },
            systemPrompt: getCMOSystemPrompt(subMode)
          }
        });
        
        return res.json({
          success: true,
          response: intelligentResponse.response.content,
          mode: 'cmo',
          subMode,
          metadata: {
            ...intelligentResponse.metadata,
            cmo: {
              queryType: 'general',
              suggestions: cmoResponse.suggestions
            },
            quickActions: cmoChatHandler.assistant.getQuickActions(subMode)
          },
          conversationId: intelligentResponse.metadata.threadId || conversationId
        });
      }
    }
    
    // Default travel mode handling
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
        mode: 'travel',
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
      mode: 'travel',
      metadata: {
        ...intelligentResponse.metadata,
        suggestions: intelligentResponse.response.suggestions,
        responseStyle: intelligentResponse.response.metadata.style
      },
      conversationId: intelligentResponse.metadata.threadId || conversationId
    });
    
  } catch (error) {
    console.error('Chat processing error:', error);
    res.status(500).json({
      error: 'Failed to process chat message',
      details: error.message
    });
  }
});

/**
 * POST /api/chat/cmo/quick-action
 * Execute CMO quick actions
 */
router.post('/cmo/quick-action', authenticate, async (req, res) => {
  try {
    const { actionId, params, subMode } = req.body;
    
    if (!actionId) {
      return res.status(400).json({
        error: 'Action ID is required'
      });
    }
    
    // Ensure CMO is initialized
    await initializeCMO();
    
    // Execute quick action
    const result = await cmoChatHandler.assistant.executeQuickAction(actionId, params);
    
    res.json({
      success: !result.error,
      actionId,
      result,
      subMode
    });
    
  } catch (error) {
    console.error('Quick action error:', error);
    res.status(500).json({
      error: 'Failed to execute quick action',
      details: error.message
    });
  }
});

/**
 * GET /api/chat/cmo/templates
 * Get available templates for a category
 */
router.get('/cmo/templates', authenticate, async (req, res) => {
  try {
    const { category, type } = req.query;
    
    // Ensure CMO is initialized
    await initializeCMO();
    
    const templates = cmoChatHandler.knowledgeBase.getByCategory(category || 'general')
      .filter(item => !type || item.type === type);
    
    res.json({
      success: true,
      category,
      templates,
      count: templates.length
    });
    
  } catch (error) {
    console.error('Template fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch templates',
      details: error.message
    });
  }
});

/**
 * GET /api/chat/cmo/knowledge/search
 * Search marketing knowledge base
 */
router.get('/cmo/knowledge/search', authenticate, async (req, res) => {
  try {
    const { query, category, limit = 5 } = req.query;
    
    if (!query) {
      return res.status(400).json({
        error: 'Search query is required'
      });
    }
    
    // Ensure CMO is initialized
    await initializeCMO();
    
    const results = await cmoChatHandler.knowledgeBase.search(query, {
      category,
      limit: parseInt(limit)
    });
    
    res.json({
      success: true,
      query,
      results,
      count: results.length
    });
    
  } catch (error) {
    console.error('Knowledge search error:', error);
    res.status(500).json({
      error: 'Failed to search knowledge base',
      details: error.message
    });
  }
});

/**
 * GET /api/chat/mode/stats
 * Get conversation mode statistics
 */
router.get('/mode/stats', authenticate, async (req, res) => {
  try {
    // This would connect to your conversation tracking
    // For now, returning mock data
    const stats = {
      travel: {
        conversations: 150,
        messages: 1200,
        avgResponseTime: 1.2
      },
      cmo: {
        conversations: 45,
        messages: 380,
        avgResponseTime: 1.5,
        bySubMode: {
          seo: 15,
          email: 12,
          social: 10,
          ads: 8
        }
      }
    };
    
    res.json({
      success: true,
      stats,
      userId: req.userId
    });
    
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch mode statistics'
    });
  }
});

export default router;