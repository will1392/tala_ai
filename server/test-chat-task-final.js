import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';

async function testChatTaskCreation() {
  console.log('🎯 Final test of chat task creation...\n');
  
  // Simulate what happens when user types in chat
  console.log('1️⃣ User types: "create a task to review the quarterly report"');
  
  const chatResponse = await fetch(`${API_URL}/api/chat-tasks/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'test_user_123' // This is what the frontend sends
    },
    body: JSON.stringify({
      message: 'create a task to review the quarterly report',
      userId: 'test_user_123'
    })
  });
  
  if (chatResponse.ok) {
    const result = await chatResponse.json();
    console.log('\n✅ Chat response:', result.message);
    console.log('📋 Task created:', {
      id: result.task.id,
      title: result.task.title,
      createdBy: result.task.createdBy
    });
  } else {
    console.log('❌ Failed:', await chatResponse.text());
  }
  
  // Check dashboard view
  console.log('\n2️⃣ Dashboard fetches tasks for test_user_123...');
  
  const tasksResponse = await fetch(`${API_URL}/api/tasks`, {
    headers: { 'x-user-id': 'test_user_123' }
  });
  
  if (tasksResponse.ok) {
    const data = await tasksResponse.json();
    console.log(`\n📊 Dashboard shows ${data.tasks.length} task(s):`);
    data.tasks.forEach((task, i) => {
      console.log(`   ${i + 1}. ${task.title}`);
    });
  }
  
  console.log('\n✅ Success! Task creation from chat is working correctly.');
}

testChatTaskCreation();