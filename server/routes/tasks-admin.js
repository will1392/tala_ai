/**
 * Admin route to clear all tasks - FOR DEVELOPMENT ONLY
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { initializeSharedDb } from '../services/db/sharedDatabase.js';

const router = express.Router();

// Clear all tasks - DEVELOPMENT ONLY
router.delete('/clear-all', authenticate, async (req, res) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'This endpoint is only available in development'
      });
    }
    
    console.log('🗑️  Clearing all tasks...');
    
    const db = await initializeSharedDb();
    
    // Get current tasks count
    const tasksMap = db.mockData.get('tasks') || new Map();
    const beforeCount = tasksMap.size;
    
    // Clear all task-related data
    db.mockData.set('tasks', new Map());
    db.mockData.set('task_history', new Map());
    db.mockData.set('task_assignments', new Map());
    db.mockData.set('task_dependencies', new Map());
    db.mockData.set('task_reminders', new Map());
    
    console.log(`✅ Cleared ${beforeCount} tasks`);
    
    res.json({
      success: true,
      message: `Cleared ${beforeCount} tasks from the system`,
      deletedCount: beforeCount
    });
    
  } catch (error) {
    console.error('Error clearing tasks:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;