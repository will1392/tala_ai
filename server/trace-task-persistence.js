import fetch from 'node-fetch';
import { getSharedDb, initializeSharedDb } from './services/db/sharedDatabase.js';

async function traceTaskPersistence() {
  console.log('🔍 Tracing task persistence issue...\n');
  
  // Initialize database
  await initializeSharedDb();
  const db = getSharedDb();
  
  // Clear all tasks
  await fetch('http://localhost:3001/api/tasks/admin/clear-all', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', 'x-admin-key': 'dev-only' }
  });
  
  console.log('✅ Cleared all tasks\n');
  
  // Check initial state
  console.log('1️⃣ Initial database state:');
  const initialTasks = db.mockData.get('tasks') || new Map();
  console.log('   Tasks in DB:', initialTasks.size);
  
  // Create a task via chat
  console.log('\n2️⃣ Creating task via chat...');
  const chatResp = await fetch('http://localhost:3001/api/chat/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'test_user_123'
    },
    body: JSON.stringify({
      message: 'Create a task to test persistence',
      userId: 'test_user_123',
      conversationId: 'trace-' + Date.now()
    })
  });
  
  const chatResult = await chatResp.json();
  console.log('   Response success:', chatResult.success);
  
  let createdTaskId = null;
  if (chatResult.response && typeof chatResult.response === 'object') {
    if (chatResult.response.task) {
      console.log('   Task created:', chatResult.response.task.title);
      console.log('   Task ID:', chatResult.response.task.id);
      createdTaskId = chatResult.response.task.id;
    }
  }
  
  // Check database after creation
  console.log('\n3️⃣ Database state after chat creation:');
  const afterChatTasks = db.mockData.get('tasks') || new Map();
  console.log('   Tasks in DB:', afterChatTasks.size);
  
  if (createdTaskId) {
    const taskInDb = afterChatTasks.get(createdTaskId);
    console.log('   Created task in DB:', !!taskInDb);
    if (taskInDb) {
      console.log('   Task details:', {
        title: taskInDb.title,
        created_by: taskInDb.created_by || taskInDb.createdBy
      });
    }
  }
  
  // Try to retrieve via API
  console.log('\n4️⃣ Retrieving tasks via API...');
  const listResp = await fetch('http://localhost:3001/api/tasks', {
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'test_user_123'
    }
  });
  
  const listResult = await listResp.json();
  console.log('   API returned:', listResult.tasks?.length || 0, 'tasks');
  
  // Final database check
  console.log('\n5️⃣ Final database state:');
  const finalTasks = db.mockData.get('tasks') || new Map();
  console.log('   Tasks in DB:', finalTasks.size);
  console.log('   All task IDs:');
  for (const [id, task] of finalTasks.entries()) {
    console.log(`   - ${id}: "${task.title}" (by ${task.created_by || task.createdBy || 'unknown'})`);
  }
  
  // Summary
  console.log('\n📊 Summary:');
  console.log('   Task created via chat:', !!createdTaskId);
  console.log('   Task persisted in DB:', createdTaskId ? afterChatTasks.has(createdTaskId) : false);
  console.log('   Task visible via API:', listResult.tasks?.some(t => t.id === createdTaskId) || false);
}

traceTaskPersistence().catch(console.error);