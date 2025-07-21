/**
 * Email to Task Conversion API Routes (Simplified)
 * 
 * Handles the "Send to Tala" functionality and email-based task creation
 * This is a simplified version without the complex email services
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import TaskStore from '../services/tasks/TaskStore.js';

const router = express.Router();

// Apply middleware
router.use(authenticate);

/**
 * Extract tasks from email content
 * POST /api/email-tasks/extract
 */
router.post('/extract', async (req, res) => {
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
    
    // Simplified extraction - create one main task from the email
    const cleanContent = body || subject || '';
    
    // Determine the main action needed
    let taskTitle = '';
    let priority = 'medium';
    let dueDate = null;
    
    // Check for specific action keywords in order of specificity
    const actionChecks = [
      {
        pattern: /\b(schedule|book|arrange)\s+(?:a\s+)?(?:call|meeting|appointment)/i,
        title: `Schedule meeting with ${from.split('<')[0].trim()} - ${subject}`,
        priority: 'high'
      },
      {
        pattern: /\b(call|phone)\s+(?:me|us|back)/i,
        title: `Call ${from.split('<')[0].trim()} regarding ${subject}`,
        priority: 'high'
      },
      {
        pattern: /\b(send|provide|share)\s+(?:me|us|the)?\s*(\w+(?:\s+\w+){0,3})/i,
        title: `Send requested information to ${from.split('<')[0].trim()}`,
        priority: 'medium'
      },
      {
        pattern: /\b(review|check|look at)\s+(?:the\s+)?(\w+(?:\s+\w+){0,3})/i,
        title: `Review ${subject} from ${from.split('<')[0].trim()}`,
        priority: 'medium'
      },
      {
        pattern: /\b(confirm|let\s+(?:me|us)\s+know)/i,
        title: `Respond to ${from.split('<')[0].trim()} - ${subject}`,
        priority: 'medium'
      }
    ];
    
    // Find the most relevant action
    for (const check of actionChecks) {
      if (check.pattern.test(cleanContent)) {
        taskTitle = check.title;
        priority = check.priority;
        break;
      }
    }
    
    // If no specific action found, create a general follow-up task
    if (!taskTitle) {
      taskTitle = `Follow up on email from ${from.split('<')[0].trim()}: ${subject}`;
      priority = 'low';
    }
    
    // Check for urgency indicators
    if (/\b(urgent|asap|immediately|today|emergency)\b/i.test(cleanContent)) {
      priority = 'urgent';
      dueDate = 'Today';
    } else if (/\b(tomorrow|soon|priority)\b/i.test(cleanContent)) {
      priority = 'high';
      dueDate = 'Tomorrow';
    } else if (/\b(this week|few days)\b/i.test(cleanContent)) {
      dueDate = 'This Week';
    } else if (/\b(next week)\b/i.test(cleanContent)) {
      dueDate = 'Next Week';
    }
    
    // Create a single task
    tasks.push({
      id: 'task-0',
      title: taskTitle,
      priority: priority,
      dueDate: dueDate || 'Not specified',
      tags: ['email', from.includes('@') ? from.split('@')[1].split('.')[0] : 'external'],
      description: `From: ${from}\nSubject: ${subject}\n\nEmail snippet:\n${body?.substring(0, 200)}...\n\nFull context available in email thread.`,
      assignee: null
    });
    
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

export default router;