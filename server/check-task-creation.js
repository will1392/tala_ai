import { getSharedDb } from './services/db/sharedDatabase.js';
import fetch from 'node-fetch';

async function checkTaskCreation() {
  console.log('🔍 Checking task creation process...\n');
  
  // 1. Clear all tasks first
  console.log('1️⃣ Clearing all existing tasks...');
  const clearResponse = await fetch('http://localhost:3001/api/tasks/admin/clear-all', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': 'dev-only'
    }
  });
  const clearResult = await clearResponse.json();
  console.log('   ✅', clearResult.message);
  
  // 2. Create a task via direct endpoint
  console.log('\n2️⃣ Creating task via direct endpoint...');
  const directResponse = await fetch('http://localhost:3001/api/chat-tasks/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'test_user_123'
    },
    body: JSON.stringify({
      message: 'Create a task to test direct endpoint',
      userId: 'test_user_123'
    })
  });
  const directResult = await directResponse.json();
  console.log('   Response:', directResult.success ? '✅ Success' : '❌ Failed');
  if (directResult.task) {
    console.log('   Task ID:', directResult.task.id);
    console.log('   Title:', directResult.task.title);
    console.log('   Created by:', directResult.task.created_by || directResult.task.createdBy);
  }
  
  // 3. Create a task via chat endpoint
  console.log('\n3️⃣ Creating task via chat/v2 endpoint...');
  const chatResponse = await fetch('http://localhost:3001/api/chat/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'test_user_123'
    },
    body: JSON.stringify({
      message: 'Create a task to test chat endpoint',
      userId: 'test_user_123',
      conversationId: 'test-' + Date.now()
    })
  });
  const chatResult = await chatResponse.json();
  console.log('   Response:', chatResult.success ? '✅ Success' : '❌ Failed');
  
  // 4. Wait a moment for processing
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 5. List all tasks
  console.log('\n4️⃣ Listing all tasks for user...');
  const listResponse = await fetch('http://localhost:3001/api/tasks?limit=10', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'test_user_123'
    }
  });
  const listResult = await listResponse.json();
  console.log('   Total tasks:', listResult.tasks.length);
  listResult.tasks.forEach((task, idx) => {
    console.log(`   ${idx + 1}. "${task.title}"`);
    console.log(`      Created by: ${task.created_by || task.createdBy || 'undefined'}`);
  });
  
  // 6. Check database directly
  console.log('\n5️⃣ Checking database directly...');
  const db = getSharedDb();
  if (db) {
    const tasksMap = db.mockData.get('tasks') || new Map();
    console.log('   Tasks in database:', tasksMap.size);
    
    // Check for any tasks with undefined user
    let undefinedUserCount = 0;
    for (const [id, task] of tasksMap.entries()) {
      if (!task.created_by && !task.createdBy) {
        undefinedUserCount++;
        console.log(`   ⚠️ Task without user: "${task.title}"`);
      }
    }
    if (undefinedUserCount > 0) {
      console.log(`   ⚠️ Found ${undefinedUserCount} tasks without user ID`);
    }
  }
  
  console.log('\n✅ Task creation check complete');
}

checkTaskCreation().catch(console.error);