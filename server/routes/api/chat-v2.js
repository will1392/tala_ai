/**
 * Chat API v2 - Database-backed chat endpoints
 * 
 * This replaces the in-memory chat storage with proper database persistence
 */

import express from 'express';
import { ConversationService } from '../../services/db/conversationService.js';
import { TalaIntelligence } from '../../services/intelligence/TalaIntelligence.js';
import { getSharedDb, initializeSharedDb } from '../../services/db/sharedDatabase.js';

const router = express.Router();

// Initialize services
const conversationService = new ConversationService();
let talaIntelligence = null;

// Initialize TalaIntelligence and shared database
async function initializeServices() {
  if (!talaIntelligence) {
    await initializeSharedDb();
    talaIntelligence = new TalaIntelligence({
      conversationService
    });
    await talaIntelligence.initialize();
    console.log('✅ Chat v2 services initialized');
  }
}

// Ensure services are initialized
initializeServices().catch(console.error);

/**
 * POST /api/chat/v2
 * Process a chat message with database persistence
 */
router.post('/', async (req, res) => {
  try {
    const { message, conversationId, metadata = {} } = req.body;
    const userId = req.headers['x-user-id'] || req.headers['x-mock-user-id'] || 'anonymous';
    const organizationId = req.headers['x-organization-id'] || 'default';
    
    if (!message?.trim()) {
      return res.status(400).json({ 
        success: false,
        error: 'Message is required' 
      });
    }
    
    console.log(`💬 Chat v2 request from user ${userId}: "${message.substring(0, 100)}..."`);
    
    // Ensure services are initialized
    await initializeServices();
    
    // Create or get conversation
    let conversation;
    if (conversationId) {
      // Get existing conversation
      const result = await conversationService.getConversation(conversationId, {
        includeMessages: false
      });
      
      if (result.success) {
        conversation = result.data;
      } else {
        console.warn('Conversation not found, creating new one');
      }
    }
    
    // Create new conversation if needed
    if (!conversation) {
      const createResult = await conversationService.createConversation({
        organization_id: organizationId,
        user_id: userId,
        title: message.substring(0, 100),
        metadata: {
          source: 'chat-v2',
          ...metadata
        }
      });
      
      if (!createResult.success) {
        throw new Error(`Failed to create conversation: ${createResult.error.message}`);
      }
      
      conversation = createResult.data;
      console.log('📝 Created new conversation:', conversation.id);
    }
    
    // Save user message
    const userMessageResult = await conversationService.addMessage({
      conversation_id: conversation.id,
      role: 'user',
      content: message,
      metadata: {
        userId,
        timestamp: new Date().toISOString()
      }
    });
    
    if (!userMessageResult.success) {
      console.error('Failed to save user message:', userMessageResult.error);
    }
    
    // Process message with TalaIntelligence
    const result = await talaIntelligence.processRequest({
      content: message,
      userId: userId,
      conversationId: conversation.id,
      data: {
        userId: userId,
        organizationId: organizationId,
        conversationHistory: conversation.messages || []
      }
    });
    
    // Save assistant response
    if (result.success) {
      const assistantMessageResult = await conversationService.addMessage({
        conversation_id: conversation.id,
        role: 'assistant',
        content: result.response,
        metadata: {
          ...result.metadata,
          timestamp: new Date().toISOString()
        }
      });
      
      if (!assistantMessageResult.success) {
        console.error('Failed to save assistant message:', assistantMessageResult.error);
      }
    }
    
    // Return response
    res.json({
      success: result.success,
      response: result.response,
      conversationId: conversation.id,
      metadata: {
        ...result.metadata,
        conversationTitle: conversation.title,
        messagesSaved: true
      }
    });
    
  } catch (error) {
    console.error('Chat v2 error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

/**
 * GET /api/chat/v2/conversations
 * Get user's conversations
 */
router.get('/conversations', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.headers['x-mock-user-id'];
    const organizationId = req.headers['x-organization-id'] || 'default';
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }
    
    const result = await conversationService.getConversations({
      organization_id: organizationId,
      user_id: userId,
      limit: 20,
      orderBy: 'updated_at',
      orderDirection: 'desc'
    });
    
    res.json(result);
    
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

/**
 * GET /api/chat/v2/conversations/:id
 * Get conversation with messages
 */
router.get('/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] || req.headers['x-mock-user-id'];
    
    const result = await conversationService.getConversation(id, {
      includeMessages: true,
      messageLimit: 100
    });
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    // Verify user has access
    if (result.data.user_id !== userId && !req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

export default router;