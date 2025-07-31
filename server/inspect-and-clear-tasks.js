/**
 * Script to inspect and clear all tasks from the system
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';

async function inspectAndClearTasks() {
  console.log('🔍 Inspecting tasks in the system...\n');
  
  try {
    // First, get all tasks
    const response = await fetch(`${API_URL}/api/tasks`, {
      method: 'GET',
      headers: {
        'x-mock-user-id': 'test_user_123'
      }
    });
    
    if (!response.ok) {
      console.error('❌ Failed to fetch tasks');
      return;
    }
    
    const data = await response.json();
    const tasks = data.tasks || [];
    
    console.log(`📊 Found ${tasks.length} tasks:\n`);
    
    tasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.title}`);
      console.log(`   ID: ${task.id}`);
      console.log(`   Status: ${task.status}`);
      console.log(`   Created: ${new Date(task.createdAt).toLocaleString()}`);
      console.log('');
    });
    
    if (tasks.length === 0) {
      console.log('✅ No tasks found in the system');
      return;
    }
    
    // Now delete each task
    console.log('\n🗑️  Deleting all tasks...\n');
    
    for (const task of tasks) {
      try {
        const deleteResponse = await fetch(`${API_URL}/api/tasks/${task.id}`, {
          method: 'DELETE',
          headers: {
            'x-mock-user-id': 'test_user_123'
          }
        });
        
        if (deleteResponse.ok) {
          console.log(`✅ Deleted: ${task.title}`);
        } else {
          console.log(`❌ Failed to delete: ${task.title}`);
        }
      } catch (error) {
        console.log(`❌ Error deleting ${task.title}: ${error.message}`);
      }
    }
    
    // Verify all tasks are deleted
    console.log('\n🔍 Verifying deletion...');
    const verifyResponse = await fetch(`${API_URL}/api/tasks`, {
      method: 'GET',
      headers: {
        'x-mock-user-id': 'test_user_123'
      }
    });
    
    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json();
      const remainingTasks = verifyData.tasks || [];
      console.log(`\n📊 Remaining tasks: ${remainingTasks.length}`);
      
      if (remainingTasks.length === 0) {
        console.log('✅ All tasks successfully deleted!');
      } else {
        console.log('⚠️  Some tasks could not be deleted:');
        remainingTasks.forEach(task => console.log(`   - ${task.title}`));
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the script
inspectAndClearTasks();