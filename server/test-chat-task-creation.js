/**
 * Test script to verify task creation via intelligent chat
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';

async function testChatTaskCreation() {
  console.log('🧪 Testing task creation via intelligent chat...\n');
  
  try {
    // Test 1: Create a task via chat
    console.log('📝 Test 1: Creating task via chat');
    const chatResponse = await fetch(`${API_URL}/api/chat/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mock-user-id': 'test_user_123'
      },
      body: JSON.stringify({
        message: 'Please create a task to review travel documents with high priority due tomorrow',
        userId: 'test_user_123',
        isAdmin: true
      })
    });
    
    if (!chatResponse.ok) {
      const error = await chatResponse.json();
      console.error('❌ Chat request failed:', error);
      return;
    }
    
    const chatData = await chatResponse.json();
    console.log('✅ Chat response:', {
      success: chatData.success,
      response: typeof chatData.response === 'string' 
        ? chatData.response.substring(0, 100) + '...' 
        : JSON.stringify(chatData.response),
      metadata: chatData.metadata
    });
    
    // Wait a moment for task creation to process
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Check if task was created
    console.log('\n📋 Test 2: Checking if task was created');
    const tasksResponse = await fetch(`${API_URL}/api/tasks?status=pending`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-mock-user-id': 'test_user_123'
      }
    });
    
    if (!tasksResponse.ok) {
      const error = await tasksResponse.json();
      console.error('❌ Failed to fetch tasks:', error);
      return;
    }
    
    const tasksData = await tasksResponse.json();
    console.log(`✅ Found ${tasksData.tasks?.length || 0} tasks`);
    
    if (tasksData.tasks?.length > 0) {
      const latestTask = tasksData.tasks[0];
      console.log('\n📝 Latest task details:');
      console.log(`  - Title: ${latestTask.title}`);
      console.log(`  - Priority: ${latestTask.priority}`);
      console.log(`  - Status: ${latestTask.status}`);
      console.log(`  - Due Date: ${latestTask.dueDate || 'Not set'}`);
      console.log(`  - Created: ${new Date(latestTask.createdAt).toLocaleString()}`);
    }
    
    // Test 3: Try another task creation
    console.log('\n📝 Test 3: Creating another task with specific details');
    const chatResponse2 = await fetch(`${API_URL}/api/chat/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mock-user-id': 'test_user_123'
      },
      body: JSON.stringify({
        message: 'Create a task called "Book flight to Paris" with medium priority due next week',
        userId: 'test_user_123',
        isAdmin: true
      })
    });
    
    if (chatResponse2.ok) {
      const chatData2 = await chatResponse2.json();
      console.log('✅ Second task creation response:', {
        success: chatData2.success,
        response: typeof chatData2.response === 'string' 
          ? chatData2.response.substring(0, 100) + '...' 
          : JSON.stringify(chatData2.response)
      });
    }
    
    console.log('\n✅ All tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testChatTaskCreation();