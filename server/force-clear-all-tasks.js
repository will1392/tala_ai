/**
 * Force clear all tasks by directly accessing the mock database
 */

import { DatabaseService } from './services/db/DatabaseService.js';

async function forceClearAllTasks() {
  console.log('🔥 Force clearing all tasks from mock database...\n');
  
  try {
    // Get the singleton instance
    const db = new DatabaseService();
    
    // Log current state
    const tasksMap = db.mockData.get('tasks') || new Map();
    console.log(`📊 Current tasks in memory: ${tasksMap.size}`);
    
    if (tasksMap.size > 0) {
      // List tasks before clearing
      console.log('\n📋 Tasks to be cleared:');
      Array.from(tasksMap.values()).forEach((task, index) => {
        console.log(`${index + 1}. ${task.title} (${task.id})`);
      });
      
      // Clear all task-related data
      db.mockData.set('tasks', new Map());
      db.mockData.set('task_history', new Map());
      db.mockData.set('task_assignments', new Map());
      db.mockData.set('task_dependencies', new Map());
      db.mockData.set('task_reminders', new Map());
      
      console.log('\n✅ All task data cleared from memory');
      
      // Verify
      const afterTasks = db.mockData.get('tasks') || new Map();
      console.log(`\n📊 Tasks after clearing: ${afterTasks.size}`);
    } else {
      console.log('ℹ️  No tasks found in memory');
    }
    
    console.log('\n✅ Force clear completed!');
    console.log('\n⚠️  Note: The server will need to be restarted for this to take effect');
    console.log('   if it\'s currently running with a different instance.');
    
  } catch (error) {
    console.error('❌ Failed to clear tasks:', error);
  }
  
  process.exit(0);
}

// Run the script
forceClearAllTasks();