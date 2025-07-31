import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';

async function debugTaskCreation() {
  console.log('🔍 Debugging task creation flow...\n');
  
  // Test 1: Direct API call with x-user-id
  console.log('1️⃣ Testing with x-user-id header...');
  try {
    const response1 = await fetch(`${API_URL}/api/chat-tasks/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'test_user_123'
      },
      body: JSON.stringify({
        message: 'create a task with x-user-id header',
        userId: 'test_user_123'
      })
    });
    
    if (response1.ok) {
      const result = await response1.json();
      console.log('✅ Success with x-user-id:', result.task.title);
    } else {
      console.log('❌ Failed with x-user-id:', response1.status, await response1.text());
    }
  } catch (error) {
    console.log('❌ Error with x-user-id:', error.message);
  }
  
  // Test 2: Direct API call with x-mock-user-id
  console.log('\n2️⃣ Testing with x-mock-user-id header...');
  try {
    const response2 = await fetch(`${API_URL}/api/chat-tasks/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mock-user-id': 'test_user_123'
      },
      body: JSON.stringify({
        message: 'create a task with x-mock-user-id header',
        userId: 'test_user_123'
      })
    });
    
    if (response2.ok) {
      const result = await response2.json();
      console.log('✅ Success with x-mock-user-id:', result.task.title);
    } else {
      console.log('❌ Failed with x-mock-user-id:', response2.status, await response2.text());
    }
  } catch (error) {
    console.log('❌ Error with x-mock-user-id:', error.message);
  }
  
  // Test 3: Check what user the tasks were created for
  console.log('\n3️⃣ Checking tasks for different users...');
  
  const users = ['test_user_123', 'admin-1', 'mock-user-id'];
  
  for (const userId of users) {
    const response = await fetch(`${API_URL}/api/tasks`, {
      headers: { 'x-user-id': userId }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   User ${userId}: ${data.tasks?.length || 0} tasks`);
    }
  }
  
  // Test 4: Test the chat v2 endpoint
  console.log('\n4️⃣ Testing chat v2 endpoint...');
  try {
    const chatResponse = await fetch(`${API_URL}/api/chat/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'test_user_123'
      },
      body: JSON.stringify({
        message: 'create a task to test chat v2',
        userId: 'test_user_123',
        conversationId: 'test-conv-123'
      })
    });
    
    if (chatResponse.ok) {
      const result = await chatResponse.json();
      console.log('✅ Chat v2 response:', result.response?.substring(0, 100) + '...');
    } else {
      console.log('❌ Chat v2 failed:', chatResponse.status);
    }
  } catch (error) {
    console.log('❌ Chat v2 error:', error.message);
  }
}

debugTaskCreation();