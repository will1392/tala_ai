/**
 * Script to clear all tasks from the system
 */

import { getSharedDb, initializeSharedDb } from './services/db/sharedDatabase.js';

async function clearAllTasks() {
  console.log('🧹 Clearing all tasks from the system...\n');
  
  try {
    const db = await initializeSharedDb();
    
    // Get current tasks count
    const tasks = db.mockData.get('tasks') || new Map();
    const beforeCount = tasks.size;
    console.log(`📊 Found ${beforeCount} tasks in the system`);
    
    if (beforeCount > 0) {
      // Clear all tasks
      db.mockData.set('tasks', new Map());
      console.log('✅ All tasks cleared');
      
      // Also clear task history and related data
      db.mockData.set('task_history', new Map());
      db.mockData.set('task_assignments', new Map());
      db.mockData.set('task_dependencies', new Map());
      db.mockData.set('task_reminders', new Map());
      
      console.log('✅ All task-related data cleared');
    } else {
      console.log('ℹ️  No tasks to clear');
    }
    
    // Verify
    const afterTasks = db.mockData.get('tasks') || new Map();
    console.log(`\n📊 Tasks after clearing: ${afterTasks.size}`);
    
  } catch (error) {
    console.error('❌ Failed to clear tasks:', error);
  }
}

// Run the script
clearAllTasks();