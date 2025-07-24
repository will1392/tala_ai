/**
 * Direct task creation from chat messages
 * Simple approach similar to email-tasks
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/chat-tasks/create
 * Create a task directly from chat message
 */
router.post('/create', authenticate, async (req, res) => {
  try {
    const { message, userId } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }
    
    console.log(`📝 Creating task from chat: "${message}" for user: ${req.userId}`);
    
    // Extract task details from message
    const taskDetails = extractTaskDetails(message);
    
    // Create a task manager instance for this specific user
    const { TaskManager } = await import('../services/tasks/TaskManager.js');
    const { getSharedDb } = await import('../services/db/sharedDatabase.js');
    
    const taskManager = new TaskManager({
      userId: req.userId, // Use the authenticated user's ID
      db: getSharedDb()
    });
    await taskManager.initialize();
    
    // Create the task
    const task = await taskManager.createTask(taskDetails);
    
    console.log(`✅ Task created from chat: ${task.id} for user: ${req.userId}`);
    
    res.json({
      success: true,
      task,
      message: `Task "${task.title}" has been created successfully.`
    });
    
  } catch (error) {
    console.error('Error creating task from chat:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Extract task details from chat message
 */
function extractTaskDetails(message) {
  // Basic extraction logic
  let title = message;
  let priority = 'medium';
  let dueDate = null;
  
  // Remove common prefixes
  title = title
    .replace(/^(please\s+)?(create|add|make)\s+(a\s+)?(new\s+)?(task|todo|reminder)(\s+to|\s+for)?\s*/i, '')
    .replace(/^(can you|could you|would you)\s+/i, '')
    .trim();
  
  // Extract priority
  if (/urgent|asap|high priority/i.test(message)) {
    priority = 'high';
  } else if (/low priority|whenever|not urgent/i.test(message)) {
    priority = 'low';
  }
  
  // Extract due dates
  const today = new Date();
  if (/tonight|today|by end of day/i.test(message)) {
    dueDate = new Date(today);
    
    // Extract specific time if mentioned
    const timeMatch = message.match(/(\d{1,2}):?(\d{2})?\s*(pm|am)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const isPM = timeMatch[3]?.toLowerCase() === 'pm';
      
      if (isPM && hours < 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;
      
      dueDate.setHours(hours, minutes, 0, 0);
    } else {
      dueDate.setHours(23, 59, 59, 999);
    }
  } else if (/tomorrow/i.test(message)) {
    dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 1);
    dueDate.setHours(17, 0, 0, 0);
  } else if (/next week/i.test(message)) {
    dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 7);
    dueDate.setHours(17, 0, 0, 0);
  }
  
  // Clean up title - remove time/priority indicators
  title = title
    .replace(/by\s+\d{1,2}:?\d{0,2}\s*(pm|am)?/i, '')
    .replace(/tonight|today|tomorrow|next week/i, '')
    .replace(/urgent|asap|high priority|low priority/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Ensure we have a title
  if (!title || title.length < 3) {
    title = 'Task from chat';
  }
  
  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1);
  
  return {
    title,
    description: `Created from chat: "${message}"`,
    priority,
    status: 'pending',
    dueDate,
    source: 'chat',
    tags: ['from-chat']
  };
}

export default router;