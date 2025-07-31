import fetch from 'node-fetch';

async function traceChatTaskCreation() {
  console.log('🔍 Tracing chat task creation...\n');
  
  // Clear tasks first
  await fetch('http://localhost:3001/api/tasks/admin/clear-all', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', 'x-admin-key': 'dev-only' }
  });
  console.log('✅ Cleared existing tasks\n');
  
  // Send different task messages
  const messages = [
    'Create a task to buy groceries',
    'Add a todo to call mom',
    'Make a task for project deadline',
    'Remind me to submit the report',
    'I need to remember to pay bills'
  ];
  
  for (const message of messages) {
    console.log(`📨 Sending: "${message}"`);
    
    const response = await fetch('http://localhost:3001/api/chat/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'test_user_123'
      },
      body: JSON.stringify({
        message,
        userId: 'test_user_123',
        conversationId: 'trace-' + Date.now()
      })
    });
    
    const result = await response.json();
    console.log('   Status:', response.status, '| Success:', result.success);
    
    // Check what type of response we got
    if (result.response) {
      const responseType = typeof result.response;
      console.log('   Response type:', responseType);
      
      if (responseType === 'string') {
        try {
          const parsed = JSON.parse(result.response);
          if (parsed.task) {
            console.log('   ✅ Task created:', parsed.task.title);
          } else if (parsed.emailType) {
            console.log('   ❌ Incorrectly parsed as email');
          } else {
            console.log('   ❓ Unknown response format');
          }
        } catch (e) {
          console.log('   📝 Plain text response');
        }
      } else if (responseType === 'object') {
        if (result.response.task) {
          console.log('   ✅ Task created:', result.response.task.title);
        } else {
          console.log('   Response object:', Object.keys(result.response));
        }
      }
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('');
  }
  
  // Check final task count
  console.log('\n📊 Final check...');
  const listResponse = await fetch('http://localhost:3001/api/tasks?limit=20', {
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'test_user_123'
    }
  });
  const listData = await listResponse.json();
  console.log('Total tasks created:', listData.tasks?.length || 0);
  
  if (listData.tasks && listData.tasks.length > 0) {
    console.log('\nTasks in system:');
    listData.tasks.forEach((task, idx) => {
      console.log(`${idx + 1}. "${task.title}"`);
      console.log(`   Created by: ${task.created_by || task.createdBy}`);
      console.log(`   Priority: ${task.priority}`);
    });
  }
}

traceChatTaskCreation().catch(console.error);