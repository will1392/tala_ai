/**
 * Email to Task Conversion API Routes
 * 
 * Handles the "Send to Tala" functionality and email-based task creation
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireCredits } from '../middleware/creditsMiddleware.js';
import EmailActionHandler from '../services/email/EmailActionHandler.js';
import EmailManager from '../services/email/EmailManager.js';
import TaskStore from '../services/tasks/TaskStore.js';

const router = express.Router();

// Initialize services
let emailActionHandler;
let emailManager;

// Middleware to ensure services are initialized
const initializeServices = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.userId;
    
    if (!emailActionHandler) {
      emailActionHandler = new EmailActionHandler({
        userId,
        enableWebSocket: true,
        wsPort: process.env.EMAIL_WS_PORT || 3002
      });
      await emailActionHandler.initialize();
    }
    
    if (!emailManager) {
      emailManager = new EmailManager({ userId });
      await emailManager.initialize();
    }
    
    req.emailServices = {
      actionHandler: emailActionHandler,
      emailManager
    };
    
    next();
  } catch (error) {
    console.error('Error initializing email services:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to initialize email services' 
    });
  }
};

// Apply middleware
router.use(authenticate);

/**
 * Extract tasks from email content
 * POST /api/email-tasks/extract
 */
router.post('/extract', requireCredits('email_task_extraction'), async (req, res) => {
  try {
    const { emailId, subject, from, body, useAI = true } = req.body;
    
    if (!body && !subject) {
      return res.status(400).json({
        success: false,
        error: 'Email content is required'
      });
    }
    
    // For now, use a simple extraction logic
    // In production, this would use AI/NLP to extract tasks
    const tasks = [];
    
    // Simple keyword-based extraction
    const content = (body || '') + ' ' + (subject || '');
    const lines = content.split(/[.!?\n]+/).filter(line => line.trim());
    
    // Look for action items
    lines.forEach((line, index) => {
      const lowerLine = line.toLowerCase();
      
      // Check for task indicators
      const taskIndicators = [
        'please', 'need to', 'must', 'should', 'have to', 'required',
        'follow up', 'call', 'email', 'send', 'book', 'schedule',
        'prepare', 'review', 'complete', 'finish', 'submit'
      ];
      
      const hasIndicator = taskIndicators.some(indicator => lowerLine.includes(indicator));
      
      if (hasIndicator) {
        // Determine priority based on keywords
        let priority = 'medium';
        if (lowerLine.includes('urgent') || lowerLine.includes('asap') || lowerLine.includes('immediately')) {
          priority = 'urgent';
        } else if (lowerLine.includes('important') || lowerLine.includes('critical')) {
          priority = 'high';
        }
        
        // Extract due date hints
        let dueDate = 'Tomorrow';
        if (lowerLine.includes('today')) dueDate = 'Today';
        else if (lowerLine.includes('tomorrow')) dueDate = 'Tomorrow';
        else if (lowerLine.includes('next week')) dueDate = 'Next Week';
        else if (lowerLine.includes('friday')) dueDate = 'Friday';
        else if (lowerLine.includes('monday')) dueDate = 'Monday';
        
        // Clean up the task title
        let title = line.trim();
        if (title.length > 100) title = title.substring(0, 100) + '...';
        
        tasks.push({
          id: `task-${index}`,
          title: title,
          priority: priority,
          dueDate: dueDate,
          tags: ['email', 'extracted'],
          description: `From: ${from}\nSubject: ${subject}\n\nContext: ${line}`,
          assignee: null
        });
      }
    });
    
    // If no tasks found, create a follow-up task
    if (tasks.length === 0) {
      tasks.push({
        id: 'task-0',
        title: `Follow up on: ${subject}`,
        priority: 'medium',
        dueDate: 'Tomorrow',
        tags: ['email', 'follow-up'],
        description: `Email from ${from}\n\n${body?.substring(0, 200)}...`,
        assignee: null
      });
    }
    
    res.json({
      success: true,
      tasks: tasks,
      emailId: emailId
    });
    
  } catch (error) {
    console.error('Extract tasks error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Send email to Tala for task extraction
 * POST /api/email-tasks/send-to-tala
 */
router.post('/send-to-tala', requireCredits('email_parse'), async (req, res) => {
  try {
    const { emailId, options = {} } = req.body;
    const userId = req.user?.id || req.userId;
    
    if (!emailId) {
      return res.status(400).json({
        success: false,
        error: 'Email ID is required'
      });
    }
    
    // Get email data
    const emailData = await req.emailServices.emailManager.getEmail(emailId);
    if (!emailData) {
      return res.status(404).json({
        success: false,
        error: 'Email not found'
      });
    }
    
    // Process email
    const result = await req.emailServices.actionHandler.handleSendToTala(
      emailData,
      userId,
      options
    );
    
    res.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('Send to Tala error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Batch send emails to Tala
 * POST /api/email-tasks/batch-send-to-tala
 */
router.post('/batch-send-to-tala', requireCredits('email_batch_process'), async (req, res) => {
  try {
    const { emailIds, options = {} } = req.body;
    const userId = req.user?.id || req.userId;
    
    if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Email IDs array is required'
      });
    }
    
    // Get all emails
    const emails = await Promise.all(
      emailIds.map(id => req.emailServices.emailManager.getEmail(id))
    );
    
    const validEmails = emails.filter(e => e !== null);
    
    if (validEmails.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No valid emails found'
      });
    }
    
    // Process batch
    const result = await req.emailServices.actionHandler.handleBatchSendToTala(
      validEmails,
      userId,
      options
    );
    
    res.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('Batch send to Tala error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Confirm task creation after preview
 * POST /api/email-tasks/confirm/:sessionId
 */
router.post('/confirm/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { confirmed, edits = {}, rejectedTasks = [] } = req.body;
    
    const result = await req.emailServices.actionHandler.confirmAndCreateTasks(
      sessionId,
      {
        confirmed,
        edits,
        rejectedTasks
      }
    );
    
    res.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('Task confirmation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get conversion session status
 * GET /api/email-tasks/status/:sessionId
 */
/**
 * Process and create tasks from email
 * POST /api/email-tasks/process
 */
router.post('/process', async (req, res) => {
  try {
    const { emailId, tasks, autoAssign = true } = req.body;
    const userId = req.user?.id || req.userId || 'test_user_123';
    
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Tasks array is required'
      });
    }
    
    // Create tasks using TaskStore
    const createdTasks = [];
    
    for (const task of tasks) {
      try {
        const taskData = {
          ...task,
          userId: userId,
          source: 'email',
          sourceId: emailId
        };
        
        const newTask = TaskStore.createTask(taskData);
        createdTasks.push(newTask);
      } catch (error) {
        console.error('Error creating task:', error);
      }
    }
    
    res.json({
      success: true,
      tasks: createdTasks,
      created: createdTasks.length,
      failed: tasks.length - createdTasks.length
    });
    
  } catch (error) {
    console.error('Process tasks error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/status/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const status = req.emailServices.actionHandler.getConversionStatus(sessionId);
    
    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    res.json({
      success: true,
      status
    });
    
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Cancel conversion session
 * POST /api/email-tasks/cancel/:sessionId
 */
router.post('/cancel/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const cancelled = req.emailServices.actionHandler.cancelConversion(sessionId);
    
    res.json({
      success: cancelled,
      message: cancelled ? 'Conversion cancelled' : 'Session not found'
    });
    
  } catch (error) {
    console.error('Cancel conversion error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Quick action - Create task from email with template
 * POST /api/email-tasks/quick-action
 */
router.post('/quick-action', async (req, res) => {
  try {
    const { actionId, emailId, options = {} } = req.body;
    const userId = req.user?.id || req.userId;
    
    if (!actionId || !emailId) {
      return res.status(400).json({
        success: false,
        error: 'Action ID and Email ID are required'
      });
    }
    
    // Get email data
    const emailData = await req.emailServices.emailManager.getEmail(emailId);
    if (!emailData) {
      return res.status(404).json({
        success: false,
        error: 'Email not found'
      });
    }
    
    // Execute quick action
    const result = await req.emailServices.actionHandler.handleQuickAction(
      actionId,
      emailData,
      userId,
      options
    );
    
    res.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('Quick action error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get available email actions
 * GET /api/email-tasks/actions
 */
router.get('/actions', async (req, res) => {
  try {
    const actions = req.emailServices.actionHandler.getAvailableActions();
    
    res.json({
      success: true,
      actions
    });
    
  } catch (error) {
    console.error('Get actions error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Removed duplicate /extract endpoint - using the simpler one above

/**
 * Get email thread context for task creation
 * GET /api/email-tasks/thread-context/:threadId
 */
router.get('/thread-context/:threadId', async (req, res) => {
  try {
    const { threadId } = req.params;
    
    const converter = req.emailServices.actionHandler.converter;
    const threadContext = await converter.getThreadContext(threadId);
    
    res.json({
      success: true,
      threadContext
    });
    
  } catch (error) {
    console.error('Get thread context error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get conversion statistics
 * GET /api/email-tasks/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = req.emailServices.actionHandler.getStatistics();
    const converterStats = req.emailServices.actionHandler.converter.getStats();
    
    res.json({
      success: true,
      stats: {
        ...stats,
        converter: converterStats
      }
    });
    
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Record feedback for task suggestion improvement
 * POST /api/email-tasks/feedback
 */
router.post('/feedback', async (req, res) => {
  try {
    const { suggestionId, actualValues, accepted } = req.body;
    
    if (!suggestionId || !actualValues) {
      return res.status(400).json({
        success: false,
        error: 'Suggestion ID and actual values are required'
      });
    }
    
    const suggestionEngine = req.emailServices.actionHandler.converter.suggestionEngine;
    await suggestionEngine.recordFeedback(
      { id: suggestionId },
      actualValues,
      accepted
    );
    
    res.json({
      success: true,
      message: 'Feedback recorded successfully'
    });
    
  } catch (error) {
    console.error('Record feedback error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get suggestion accuracy metrics
 * GET /api/email-tasks/accuracy
 */
router.get('/accuracy', async (req, res) => {
  try {
    const suggestionEngine = req.emailServices.actionHandler.converter.suggestionEngine;
    const metrics = suggestionEngine.getAccuracyMetrics();
    
    res.json({
      success: true,
      metrics
    });
    
  } catch (error) {
    console.error('Get accuracy metrics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * WebSocket endpoint information
 * GET /api/email-tasks/websocket
 */
router.get('/websocket', (req, res) => {
  res.json({
    success: true,
    websocket: {
      url: `ws://localhost:${process.env.EMAIL_WS_PORT || 3002}`,
      protocol: 'ws',
      events: [
        'progress',
        'status',
        'confirmationResult',
        'cancellationResult'
      ],
      actions: [
        'subscribe',
        'unsubscribe',
        'getStatus',
        'confirmTasks',
        'cancelConversion'
      ]
    }
  });
});

export default router;