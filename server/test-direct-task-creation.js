/**
 * Test the direct task creation endpoint
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';

async function testDirectTaskCreation() {
  console.log('🧪 Testing direct task creation from chat...\n');
  
  const testMessages = [
    "can you create a task to reach out to John? I need to do it by 1130 tonight",
    "create task: Buy groceries tomorrow",
    "Add a task to review the contract with high priority",
    "remind me to call Sarah at 3pm today"
  ];
  
  for (const message of testMessages) {
    console.log(`\n📝 Testing: "${message}"`);
    
    try {
      const response = await fetch(`${API_URL}/api/chat-tasks/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-mock-user-id': 'test_user_123'
        },
        body: JSON.stringify({
          message,
          userId: 'test_user_123'
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Error:', error);
        continue;
      }
      
      const result = await response.json();
      console.log('✅ Task created successfully!');
      console.log(`   Title: ${result.task.title}`);
      console.log(`   Priority: ${result.task.priority}`);
      console.log(`   Due Date: ${result.task.dueDate || 'Not set'}`);
      console.log(`   ID: ${result.task.id}`);
      
    } catch (error) {
      console.error('❌ Failed:', error.message);
    }
  }
  
  // Check all tasks
  console.log('\n📊 Checking all tasks...');
  const tasksResponse = await fetch(`${API_URL}/api/tasks?status=pending`, {
    headers: { 'x-mock-user-id': 'test_user_123' }
  });
  
  if (tasksResponse.ok) {
    const tasksData = await tasksResponse.json();
    console.log(`\nTotal tasks: ${tasksData.tasks?.length || 0}`);
    tasksData.tasks?.forEach((task, i) => {
      console.log(`${i + 1}. ${task.title} (${task.priority})`);
    });
  }
  
  console.log('\n✅ Test completed!');
}

testDirectTaskCreation();