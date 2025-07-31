import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';

async function testTaskPersistence() {
  console.log('🧪 Testing task persistence fix...\n');
  
  // Clear all tasks first
  console.log('1️⃣ Clearing all existing tasks...');
  await fetch(`${API_URL}/api/tasks/admin/clear-all`, {
    method: 'DELETE',
    headers: { 'x-mock-user-id': 'admin-1' }
  });
  
  // Create a task via chat endpoint
  console.log('\n2️⃣ Creating task via chat endpoint...');
  const chatTaskResponse = await fetch(`${API_URL}/api/chat-tasks/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-mock-user-id': 'test_user_123'
    },
    body: JSON.stringify({
      message: 'Create a task to test persistence',
      userId: 'test_user_123'
    })
  });
  
  const chatTaskResult = await chatTaskResponse.json();
  console.log('✅ Task created:', chatTaskResult.task?.title);
  
  // Check tasks from different user perspectives
  console.log('\n3️⃣ Checking tasks from different users...');
  
  // Check as test_user_123
  const user1Response = await fetch(`${API_URL}/api/tasks`, {
    headers: { 'x-mock-user-id': 'test_user_123' }
  });
  const user1Data = await user1Response.json();
  console.log(`   User test_user_123 sees: ${user1Data.tasks?.length || 0} tasks`);
  
  // Check as admin-1
  const adminResponse = await fetch(`${API_URL}/api/tasks`, {
    headers: { 'x-mock-user-id': 'admin-1' }
  });
  const adminData = await adminResponse.json();
  console.log(`   User admin-1 sees: ${adminData.tasks?.length || 0} tasks`);
  
  // Create another task to test persistence
  console.log('\n4️⃣ Creating another task...');
  const secondTaskResponse = await fetch(`${API_URL}/api/chat-tasks/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-mock-user-id': 'test_user_123'
    },
    body: JSON.stringify({
      message: 'Add task: Second persistence test',
      userId: 'test_user_123'
    })
  });
  
  const secondTaskResult = await secondTaskResponse.json();
  console.log('✅ Second task created:', secondTaskResult.task?.title);
  
  // Final check
  console.log('\n5️⃣ Final task count...');
  const finalResponse = await fetch(`${API_URL}/api/tasks`, {
    headers: { 'x-mock-user-id': 'test_user_123' }
  });
  const finalData = await finalResponse.json();
  console.log(`\n📊 Total tasks in system: ${finalData.tasks?.length || 0}`);
  
  if (finalData.tasks) {
    finalData.tasks.forEach((task, i) => {
      console.log(`   ${i + 1}. ${task.title} (${task.source || 'manual'})`);
    });
  }
  
  console.log('\n✅ Persistence test complete!');
  console.log('\nIf tasks persist correctly, you should see 2 tasks above.');
}

testTaskPersistence();