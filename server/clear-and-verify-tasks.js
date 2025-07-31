/**
 * Clear all tasks and verify they're gone
 */

import fetch from 'node-fetch';
import { DatabaseService } from './services/db/DatabaseService.js';
import { initializeSharedDb } from './services/db/sharedDatabase.js';

const API_URL = 'http://localhost:3001';

async function clearAndVerifyTasks() {
  console.log('🧹 Comprehensive task cleanup...\n');
  
  try {
    // Method 1: Direct database clear
    console.log('1️⃣ Clearing tasks from database directly...');
    const db = await initializeSharedDb();
    const tasksMap = db.mockData.get('tasks') || new Map();
    console.log(`   Found ${tasksMap.size} tasks in database`);
    
    // List tasks before clearing
    if (tasksMap.size > 0) {
      console.log('   Tasks to clear:');
      Array.from(tasksMap.values()).forEach((task, i) => {
        console.log(`   ${i + 1}. ${task.title} (${task.id})`);
      });
    }
    
    // Clear all task-related data
    db.mockData.set('tasks', new Map());
    db.mockData.set('task_history', new Map());
    db.mockData.set('task_assignments', new Map());
    db.mockData.set('task_dependencies', new Map());
    db.mockData.set('task_reminders', new Map());
    console.log('   ✅ Database cleared');
    
    // Method 2: API endpoint
    console.log('\n2️⃣ Clearing tasks via API...');
    const clearResponse = await fetch(`${API_URL}/api/tasks/admin/clear-all`, {
      method: 'DELETE',
      headers: { 'x-mock-user-id': 'admin-1' }
    });
    
    if (clearResponse.ok) {
      const result = await clearResponse.json();
      console.log(`   ✅ API cleared ${result.deletedCount} tasks`);
    } else {
      console.log('   ❌ API clear failed');
    }
    
    // Verify tasks are gone
    console.log('\n3️⃣ Verifying cleanup...');
    const verifyResponse = await fetch(`${API_URL}/api/tasks`, {
      headers: { 'x-mock-user-id': 'test_user_123' }
    });
    
    if (verifyResponse.ok) {
      const data = await verifyResponse.json();
      const remainingTasks = data.tasks || [];
      
      if (remainingTasks.length === 0) {
        console.log('   ✅ SUCCESS: No tasks found!');
      } else {
        console.log(`   ⚠️  WARNING: Still found ${remainingTasks.length} tasks:`);
        remainingTasks.forEach((task, i) => {
          console.log(`   ${i + 1}. ${task.title} (ID: ${task.id})`);
          console.log(`      Created: ${new Date(task.createdAt).toLocaleString()}`);
        });
      }
    }
    
    // Check database directly again
    console.log('\n4️⃣ Double-checking database...');
    const finalTasksMap = db.mockData.get('tasks') || new Map();
    console.log(`   Database has ${finalTasksMap.size} tasks`);
    
    console.log('\n✅ Cleanup complete!');
    console.log('\n📌 If tasks still appear:');
    console.log('   1. Restart the backend server');
    console.log('   2. Clear browser cache/local storage');
    console.log('   3. Refresh the dashboard');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the cleanup
clearAndVerifyTasks();