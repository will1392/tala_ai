import fetch from 'node-fetch';

async function testChatResponse() {
  console.log('🔍 Testing chat/v2 response...\n');
  
  const messages = [
    'Create a task to buy milk',
    'Add a todo for meeting preparation',
    'Remind me to call John tomorrow'
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
        conversationId: 'test-' + Date.now()
      })
    });
    
    const result = await response.json();
    console.log('   Status:', response.status);
    console.log('   Success:', result.success);
    
    if (result.response) {
      console.log('   Response type:', typeof result.response);
      
      // Try to understand what we got back
      if (typeof result.response === 'object') {
        if (result.response.task) {
          console.log('   ✅ Task object found!');
          console.log('   Task title:', result.response.task.title);
          console.log('   Task ID:', result.response.task.id);
        } else if (result.response.emailType) {
          console.log('   ❌ Misidentified as email parsing');
        } else if (result.response.message && result.response.task) {
          console.log('   ✅ Task creation response');
          console.log('   Message:', result.response.message);
        } else {
          console.log('   ❓ Unknown response structure');
          console.log('   Keys:', Object.keys(result.response).join(', '));
        }
      }
    }
    
    console.log('');
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

testChatResponse().catch(console.error);