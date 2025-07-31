import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';

async function testUserIsolation() {
  console.log('🧪 Testing user isolation fix...\n');
  
  // First, clear all tasks
  console.log('🗑️  Clearing all tasks...');
  await fetch(`${API_URL}/api/tasks/admin/clear-all`, {
    method: 'DELETE',
    headers: { 'x-user-id': 'admin-1' }
  });
  
  // Create tasks for different users
  console.log('\n1️⃣ Creating tasks for different users...');
  
  // Task for user1
  await fetch(`${API_URL}/api/chat-tasks/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'user1'
    },
    body: JSON.stringify({
      message: 'create a task for user1',
      userId: 'user1'
    })
  });
  console.log('✅ Created task for user1');
  
  // Task for user2
  await fetch(`${API_URL}/api/chat-tasks/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'user2'
    },
    body: JSON.stringify({
      message: 'create a task for user2',
      userId: 'user2'
    })
  });
  console.log('✅ Created task for user2');
  
  // Task for test_user_123
  await fetch(`${API_URL}/api/chat-tasks/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'test_user_123'
    },
    body: JSON.stringify({
      message: 'create a task for test_user_123',
      userId: 'test_user_123'
    })
  });
  console.log('✅ Created task for test_user_123');
  
  // Now check what each user sees
  console.log('\n2️⃣ Checking task visibility per user...');
  
  const users = ['user1', 'user2', 'test_user_123', 'admin-1'];
  
  for (const userId of users) {
    const response = await fetch(`${API_URL}/api/tasks?limit=10`, {
      headers: { 'x-user-id': userId }
    });
    
    if (response.ok) {
      const data = await response.json();
      const tasks = data.tasks || [];
      console.log(`\n   User ${userId} sees ${tasks.length} task(s):`);
      tasks.forEach(task => {
        console.log(`     - "${task.title}" (created by: ${task.createdBy})`);
      });
    }
  }
  
  console.log('\n✅ Test complete!');
  console.log('\nIf working correctly:');
  console.log('- user1 should see 1 task');
  console.log('- user2 should see 1 task');
  console.log('- test_user_123 should see 1 task');
  console.log('- admin-1 should see 0 tasks');
}

testUserIsolation();