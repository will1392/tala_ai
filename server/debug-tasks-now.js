import { getSharedDb, initializeSharedDb } from './services/db/sharedDatabase.js';
import fetch from 'node-fetch';

async function debugTasksNow() {
  console.log('🔍 Debugging task creation and retrieval...\n');
  
  // 1. Initialize database
  console.log('1️⃣ Initializing database...');
  await initializeSharedDb();
  const db = getSharedDb();
  console.log('   Database initialized:', !!db);
  
  // 2. Create a task directly in the database
  console.log('\n2️⃣ Creating task directly in database...');
  const directTaskId = 'test-' + Date.now();
  const directTask = {
    id: directTaskId,
    title: 'Direct Database Task',
    description: 'Created directly in database',
    status: 'pending',
    priority: 'high',
    created_by: 'test_user_123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  const tasksMap = db.mockData.get('tasks') || new Map();
  tasksMap.set(directTaskId, directTask);
  db.mockData.set('tasks', tasksMap);
  console.log('   ✅ Task added to database');
  
  // 3. Create a task via API
  console.log('\n3️⃣ Creating task via API...');
  const apiResponse = await fetch('http://localhost:3001/api/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'test_user_123'
    },
    body: JSON.stringify({
      title: 'API Created Task',
      description: 'Created via POST /api/tasks',
      priority: 'medium'
    })
  });
  const apiResult = await apiResponse.json();
  console.log('   Response:', apiResult.success ? '✅ Success' : '❌ Failed');
  if (apiResult.task) {
    console.log('   Task ID:', apiResult.task.id);
  }
  
  // 4. List tasks via API
  console.log('\n4️⃣ Listing tasks via API...');
  const listResponse = await fetch('http://localhost:3001/api/tasks?limit=10', {
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'test_user_123'
    }
  });
  const listResult = await listResponse.json();
  console.log('   API returned', listResult.tasks?.length || 0, 'tasks');
  
  // 5. Check database directly
  console.log('\n5️⃣ Checking database directly...');
  const currentTasksMap = db.mockData.get('tasks') || new Map();
  console.log('   Database contains', currentTasksMap.size, 'tasks');
  
  console.log('\n📋 Tasks in database:');
  for (const [id, task] of currentTasksMap.entries()) {
    console.log(`   - "${task.title}" (${task.created_by || 'no user'})`);
  }
  
  // 6. Compare
  console.log('\n⚖️  Comparison:');
  console.log('   Tasks in DB:', currentTasksMap.size);
  console.log('   Tasks via API:', listResult.tasks?.length || 0);
  
  if (currentTasksMap.size !== listResult.tasks?.length) {
    console.log('   ⚠️  MISMATCH! Database and API returning different counts');
  }
}

debugTasksNow().catch(console.error);