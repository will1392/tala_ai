/**
 * Conversation Threading API Routes for Tala AI
 * 
 * Provides REST API endpoints for conversation threading, branching,
 * merging, and thread navigation functionality.
 */

import express from 'express';
import { body, param, query, validationResult } from 'express-validator';

import ThreadManager from '../services/conversations/ThreadManager.js';
import BranchDetector from '../services/conversations/BranchDetector.js';
import ThreadMerger from '../services/conversations/ThreadMerger.js';
import ThreadingUISupport from '../services/conversations/ThreadingUISupport.js';

const router = express.Router();

// Initialize services
let threadManager;
let branchDetector;
let threadMerger;
let uiSupport;

// Initialize services middleware
async function initializeServices(req, res, next) {
  try {
    if (!threadManager) {
      threadManager = new ThreadManager();
      await threadManager.initialize();
    }
    
    if (!branchDetector) {
      branchDetector = new BranchDetector();
      await branchDetector.initialize();
    }
    
    if (!threadMerger) {
      threadMerger = new ThreadMerger();
      await threadMerger.initialize();
    }
    
    if (!uiSupport) {
      uiSupport = new ThreadingUISupport();
    }
    
    next();
  } catch (error) {
    console.error('Failed to initialize threading services:', error);
    res.status(500).json({
      error: 'Threading services unavailable',
      message: 'Please try again later'
    });
  }
}

// Validation middleware
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
}

// Apply middleware
router.use(initializeServices);

// POST /api/conversations/:id/branch - Create a new branch
router.post('/:id/branch',
  param('id').isString().isLength({ min: 1 }),
  body('branchPoint').optional().isObject(),
  body('branchPoint.messageId').optional().isString(),
  body('branchPoint.reason').optional().isString(),
  body('branchPoint.type').optional().isIn(['exploration', 'alternative', 'correction']),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id: parentConversationId } = req.params;
      const { branchPoint = {} } = req.body;
      
      console.log(`🌿 Creating branch from conversation ${parentConversationId}`);
      
      const result = await threadManager.createThread(parentConversationId, branchPoint);
      
      if (!result.success) {
        return res.status(400).json({
          error: result.error
        });
      }
      
      res.status(201).json({
        success: true,
        thread: result.thread,
        parentId: result.parentId,
        depth: result.depth
      });
      
    } catch (error) {
      console.error('Error creating branch:', error);
      res.status(500).json({
        error: 'Failed to create branch',
        message: error.message
      });
    }
  }
);

// GET /api/conversations/:id/threads - Get all threads for a conversation
router.get('/:id/threads',
  param('id').isString().isLength({ min: 1 }),
  query('includeMessages').optional().isBoolean(),
  query('maxDepth').optional().isInt({ min: 1, max: 10 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id: conversationId } = req.params;
      const { includeMessages = false, maxDepth = 5 } = req.query;
      
      console.log(`🔍 Getting threads for conversation ${conversationId}`);
      
      // Get branch points
      const branchPoints = await threadManager.getBranchPoints(conversationId);
      
      if (!branchPoints.success) {
        return res.status(400).json({
          error: branchPoints.error
        });
      }
      
      res.json({
        success: true,
        conversationId,
        branchPoints: branchPoints.branchPoints,
        totalBranches: branchPoints.totalBranches
      });
      
    } catch (error) {
      console.error('Error getting threads:', error);
      res.status(500).json({
        error: 'Failed to get threads',
        message: error.message
      });
    }
  }
);

// GET /api/conversations/:id/tree - Get conversation tree structure
router.get('/:id/tree',
  param('id').isString().isLength({ min: 1 }),
  query('selectedThreadId').optional().isString(),
  query('expandedNodes').optional().isArray(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id: rootConversationId } = req.params;
      const { selectedThreadId, expandedNodes = [] } = req.query;
      
      console.log(`🌳 Getting conversation tree for ${rootConversationId}`);
      
      // Get raw tree structure
      const treeResult = await threadManager.getConversationTree(rootConversationId);
      
      if (!treeResult.success) {
        return res.status(400).json({
          error: treeResult.error
        });
      }
      
      // Transform for UI visualization
      const visualTree = uiSupport.transformTreeForVisualization(
        treeResult.tree,
        {
          selectedThreadId,
          expandedNodes
        }
      );
      
      res.json({
        success: true,
        tree: visualTree,
        stats: treeResult.stats,
        cached: treeResult.cached
      });
      
    } catch (error) {
      console.error('Error getting conversation tree:', error);
      res.status(500).json({
        error: 'Failed to get conversation tree',
        message: error.message
      });
    }
  }
);

// POST /api/conversations/threads/merge - Merge multiple threads
router.post('/threads/merge',
  body('threadIds').isArray({ min: 2 }).withMessage('At least 2 thread IDs required'),
  body('threadIds.*').isString(),
  body('strategy').optional().isIn(['chronological', 'intelligent', 'manual']),
  body('primaryThreadId').optional().isString(),
  body('conflictResolution').optional().isObject(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { threadIds, strategy = 'chronological', ...mergeOptions } = req.body;
      
      console.log(`🔀 Merging ${threadIds.length} threads`);
      
      const result = await threadMerger.mergeThreads(threadIds, {
        strategy,
        ...mergeOptions
      });
      
      if (!result.success) {
        return res.status(400).json({
          error: result.error,
          validation: result.validation
        });
      }
      
      res.json({
        success: true,
        mergeResult: result.mergeResult,
        unifiedHistory: result.unifiedHistory,
        conflictsResolved: result.resolutions
      });
      
    } catch (error) {
      console.error('Error merging threads:', error);
      res.status(500).json({
        error: 'Failed to merge threads',
        message: error.message
      });
    }
  }
);

// GET /api/conversations/:id/branch-suggestions - Get branch suggestions
router.get('/:id/branch-suggestions',
  param('id').isString().isLength({ min: 1 }),
  query('messageCount').optional().isInt({ min: 1, max: 100 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id: conversationId } = req.params;
      const { messageCount = 20 } = req.query;
      
      console.log(`💡 Getting branch suggestions for conversation ${conversationId}`);
      
      // Get recent messages for analysis
      const { data: messages } = await threadManager.supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(messageCount);
      
      if (!messages || messages.length === 0) {
        return res.json({
          success: true,
          suggestions: []
        });
      }
      
      // Reverse to chronological order
      messages.reverse();
      
      // Get branch suggestions
      const suggestions = await branchDetector.suggestBranches(messages, {
        conversationId,
        hasBranches: false // This would be determined from actual data
      });
      
      res.json({
        success: true,
        suggestions,
        analyzedMessages: messages.length
      });
      
    } catch (error) {
      console.error('Error getting branch suggestions:', error);
      res.status(500).json({
        error: 'Failed to get branch suggestions',
        message: error.message
      });
    }
  }
);

// POST /api/conversations/:id/analyze-branch-points - Analyze for branch points
router.post('/:id/analyze-branch-points',
  param('id').isString().isLength({ min: 1 }),
  body('messages').optional().isArray(),
  body('enableLLM').optional().isBoolean(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id: conversationId } = req.params;
      const { messages: providedMessages, enableLLM = true } = req.body;
      
      console.log(`🔍 Analyzing branch points for conversation ${conversationId}`);
      
      let messages = providedMessages;
      
      // If no messages provided, fetch from database
      if (!messages) {
        const { data } = await threadManager.supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .limit(50);
        
        messages = data ? data.reverse() : [];
      }
      
      // Analyze for branch points
      const analysis = await branchDetector.analyzeBranchPoints(messages, {
        conversationId,
        enableLLM
      });
      
      res.json({
        success: true,
        analysis: {
          branchPoints: analysis.branchPoints,
          decisionPoints: analysis.decisionPoints,
          suggestions: analysis.suggestions,
          confidence: analysis.confidence
        }
      });
      
    } catch (error) {
      console.error('Error analyzing branch points:', error);
      res.status(500).json({
        error: 'Failed to analyze branch points',
        message: error.message
      });
    }
  }
);

// GET /api/conversations/:id/thread-history - Get thread history
router.get('/:id/thread-history',
  param('id').isString().isLength({ min: 1 }),
  query('includeMessages').optional().isBoolean(),
  query('messageLimit').optional().isInt({ min: 1, max: 1000 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id: threadId } = req.params;
      const { includeMessages = true, messageLimit = 100 } = req.query;
      
      console.log(`📜 Getting thread history for ${threadId}`);
      
      const history = await threadManager.getThreadHistory(threadId, {
        includeMessages,
        messageLimit
      });
      
      if (!history.success) {
        return res.status(404).json({
          error: history.error
        });
      }
      
      res.json({
        success: true,
        history: history.history
      });
      
    } catch (error) {
      console.error('Error getting thread history:', error);
      res.status(500).json({
        error: 'Failed to get thread history',
        message: error.message
      });
    }
  }
);

// POST /api/conversations/threads/compare - Compare multiple threads
router.post('/threads/compare',
  body('threadIds').isArray({ min: 2, max: 4 }).withMessage('2-4 thread IDs required'),
  body('threadIds.*').isString(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { threadIds } = req.body;
      
      console.log(`📊 Comparing ${threadIds.length} threads`);
      
      // Load thread data
      const threadData = {};
      
      for (const threadId of threadIds) {
        const { data: conversation } = await threadManager.supabase
          .from('conversations')
          .select('*')
          .eq('id', threadId)
          .single();
        
        if (!conversation) {
          return res.status(404).json({
            error: `Thread ${threadId} not found`
          });
        }
        
        const { data: messages } = await threadManager.supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', threadId)
          .order('created_at', { ascending: true });
        
        threadData[threadId] = {
          ...conversation,
          messages: messages || []
        };
      }
      
      // Generate comparison
      const comparison = uiSupport.generateBranchComparison(threadIds, threadData);
      
      res.json({
        success: true,
        comparison
      });
      
    } catch (error) {
      console.error('Error comparing threads:', error);
      res.status(500).json({
        error: 'Failed to compare threads',
        message: error.message
      });
    }
  }
);

// POST /api/conversations/:id/switch-thread - Switch to different thread
router.post('/:id/switch-thread',
  param('id').isString().isLength({ min: 1 }),
  body('toThreadId').isString().isLength({ min: 1 }),
  body('preserveState').optional().isBoolean(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id: fromThreadId } = req.params;
      const { toThreadId, preserveState = true } = req.body;
      
      console.log(`🔄 Switching from thread ${fromThreadId} to ${toThreadId}`);
      
      // Get thread data
      const threadData = {};
      
      for (const threadId of [fromThreadId, toThreadId]) {
        const { data } = await threadManager.supabase
          .from('conversations')
          .select('*')
          .eq('id', threadId)
          .single();
        
        if (!data) {
          return res.status(404).json({
            error: `Thread ${threadId} not found`
          });
        }
        
        threadData[threadId] = data;
      }
      
      // Create switch context
      const switchContext = uiSupport.createThreadSwitchContext(
        fromThreadId,
        toThreadId,
        threadData
      );
      
      res.json({
        success: true,
        switchContext
      });
      
    } catch (error) {
      console.error('Error switching threads:', error);
      res.status(500).json({
        error: 'Failed to switch threads',
        message: error.message
      });
    }
  }
);

// GET /api/conversations/:id/navigation - Get thread navigation data
router.get('/:id/navigation',
  param('id').isString().isLength({ min: 1 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id: threadId } = req.params;
      
      console.log(`🧭 Getting navigation for thread ${threadId}`);
      
      // Get current thread
      const { data: currentThread } = await threadManager.supabase
        .from('conversations')
        .select('*')
        .eq('id', threadId)
        .single();
      
      if (!currentThread) {
        return res.status(404).json({
          error: 'Thread not found'
        });
      }
      
      // Get conversation tree
      const rootId = currentThread.metadata?.root_conversation_id || 
                     currentThread.parent_conversation_id || 
                     threadId;
      
      const treeResult = await threadManager.getConversationTree(rootId);
      
      if (!treeResult.success) {
        return res.status(400).json({
          error: treeResult.error
        });
      }
      
      // Generate navigation
      const navigation = uiSupport.generateThreadNavigation(
        currentThread,
        treeResult.tree
      );
      
      res.json({
        success: true,
        navigation
      });
      
    } catch (error) {
      console.error('Error getting thread navigation:', error);
      res.status(500).json({
        error: 'Failed to get thread navigation',
        message: error.message
      });
    }
  }
);

// GET /api/conversations/:id/decision-paths - Track decision paths
router.get('/:id/decision-paths',
  param('id').isString().isLength({ min: 1 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id: rootConversationId } = req.params;
      
      console.log(`🛤️ Tracking decision paths for ${rootConversationId}`);
      
      // Get conversation tree
      const treeResult = await threadManager.getConversationTree(rootConversationId);
      
      if (!treeResult.success) {
        return res.status(400).json({
          error: treeResult.error
        });
      }
      
      // Track decision paths
      const decisionPaths = branchDetector.trackDecisionPaths(treeResult.tree);
      
      res.json({
        success: true,
        decisionPaths
      });
      
    } catch (error) {
      console.error('Error tracking decision paths:', error);
      res.status(500).json({
        error: 'Failed to track decision paths',
        message: error.message
      });
    }
  }
);

// POST /api/conversations/threads/merge-preview - Preview merge result
router.post('/threads/merge-preview',
  body('threadIds').isArray({ min: 2 }).withMessage('At least 2 thread IDs required'),
  body('threadIds.*').isString(),
  body('strategy').optional().isIn(['chronological', 'intelligent', 'manual']),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { threadIds, strategy = 'chronological' } = req.body;
      
      console.log(`👁️ Previewing merge of ${threadIds.length} threads`);
      
      // Build merge visualization
      const visualization = uiSupport.buildMergeVisualization(threadIds, {
        strategy,
        primaryThreadId: threadIds[0]
      });
      
      // Get basic thread info for preview
      const threadInfo = [];
      for (const threadId of threadIds) {
        const { data } = await threadManager.supabase
          .from('conversations')
          .select('id, title, thread_summary, thread_status, created_at')
          .eq('id', threadId)
          .single();
        
        if (data) {
          threadInfo.push(data);
        }
      }
      
      res.json({
        success: true,
        preview: {
          visualization,
          threads: threadInfo,
          strategy
        }
      });
      
    } catch (error) {
      console.error('Error generating merge preview:', error);
      res.status(500).json({
        error: 'Failed to generate merge preview',
        message: error.message
      });
    }
  }
);

// Error handler
router.use((error, req, res, next) => {
  console.error('Conversation threading API error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

export default router;