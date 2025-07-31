import fetch from 'node-fetch';

async function verifyTaskCreation() {
  console.log('🔍 Verifying task creation and user attribution...\n');
  
  const userId = 'test_user_123';
  
  // 1. Clear all tasks
  console.log('1️⃣ Clearing all tasks...');
  await fetch('http://localhost:3001/api/tasks/admin/clear-all', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', 'x-admin-key': 'dev-only' }
  });
  
  // 2. Create task via direct endpoint
  console.log('\n2️⃣ Creating task via direct endpoint...');
  const directResp = await fetch('http://localhost:3001/api/chat-tasks/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId
    },
    body: JSON.stringify({
      message: 'Create a task via direct endpoint',
      userId: userId
    })
  });
  const directResult = await directResp.json();
  console.log('   Success:', directResult.success);
  if (directResult.task) {
    console.log('   Task created_by:', directResult.task.created_by || directResult.task.createdBy);
  }
  
  // 3. Create task via standard API
  console.log('\n3️⃣ Creating task via POST /api/tasks...');
  const apiResp = await fetch('http://localhost:3001/api/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId
    },
    body: JSON.stringify({
      title: 'Task via standard API',
      description: 'Testing user attribution',
      priority: 'high'
    })
  });
  const apiResult = await apiResp.json();
  console.log('   Success:', apiResult.success);
  if (apiResult.task) {
    console.log('   Task created_by:', apiResult.task.created_by || apiResult.task.createdBy);
  }
  
  // 4. Create task via chat
  console.log('\n4️⃣ Creating task via chat/v2...');
  const chatResp = await fetch('http://localhost:3001/api/chat/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId
    },
    body: JSON.stringify({
      message: 'Create a task to test chat creation',
      userId: userId,
      conversationId: 'verify-' + Date.now()
    })
  });
  const chatResult = await chatResp.json();
  console.log('   Success:', chatResult.success);
  
  // 5. List all tasks
  console.log('\n5️⃣ Listing tasks for user...');
  const listResp = await fetch('http://localhost:3001/api/tasks?limit=10', {
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId
    }
  });
  const listResult = await listResp.json();
  console.log('   Total tasks:', listResult.tasks?.length || 0);
  
  if (listResult.tasks && listResult.tasks.length > 0) {
    console.log('\n📋 Tasks found:');
    listResult.tasks.forEach((task, idx) => {
      console.log(`${idx + 1}. "${task.title}"`);
      console.log(`   ID: ${task.id}`);
      console.log(`   Created by: ${task.created_by || task.createdBy || 'MISSING'}`);
      console.log(`   Has correct user: ${(task.created_by || task.createdBy) === userId ? '✅' : '❌'}`);
    });
  } else {
    console.log('\n❌ No tasks found for user!');
  }
  
  // 6. Summary
  console.log('\n📊 Summary:');
  const expectedTasks = 3; // direct + api + chat
  const actualTasks = listResult.tasks?.length || 0;
  console.log(`Expected tasks: ${expectedTasks}`);
  console.log(`Actual tasks: ${actualTasks}`);
  console.log(`Status: ${actualTasks === expectedTasks ? '✅ ALL GOOD' : '❌ MISSING TASKS'}`);
}

verifyTaskCreation().catch(console.error);