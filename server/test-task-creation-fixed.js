/**
 * Test task creation flow after fixes
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';
const USER_ID = 'test_user_123'; // Standardized user ID

async function testTaskCreationFixed() {
  console.log('🧪 Testing task creation with fixed user ID...\n');
  
  // Step 1: Create a task via chat endpoint
  console.log('1️⃣ Creating task via chat endpoint...');
  try {
    const response = await fetch(`${API_URL}/api/chat-tasks/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': USER_ID
      },
      body: JSON.stringify({
        message: 'create a task to verify the fix is working',
        userId: USER_ID
      })
    });
    
    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.success && data.task) {
      console.log('✅ Task created successfully!');
      console.log('Task ID:', data.task.id);
      console.log('Created by:', data.task.createdBy || 'unknown');
      
      // Step 2: Verify task appears in task list
      console.log('\n2️⃣ Verifying task appears in list...');
      const listResponse = await fetch(`${API_URL}/api/tasks?limit=5`, {
        headers: {
          'x-user-id': USER_ID
        }
      });
      
      const listData = await listResponse.json();
      console.log('Total tasks found:', listData.tasks?.length || 0);
      
      const createdTask = listData.tasks?.find(t => t.id === data.task.id);
      if (createdTask) {
        console.log('✅ Task found in list!');
        console.log('Task details:', JSON.stringify(createdTask, null, 2));
      } else {
        console.log('❌ Task NOT found in list');
        console.log('Tasks in list:', listData.tasks?.map(t => ({
          id: t.id,
          title: t.title,
          createdBy: t.createdBy
        })));
      }
    } else {
      console.log('❌ Task creation failed');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  // Step 3: Test creating a task with different priorities
  console.log('\n3️⃣ Testing task creation with priority detection...');
  const testMessages = [
    'create an urgent task to call the client',
    'add a low priority task to update documentation',
    'make a task to review code by tomorrow'
  ];
  
  for (const message of testMessages) {
    try {
      const response = await fetch(`${API_URL}/api/chat-tasks/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': USER_ID
        },
        body: JSON.stringify({ message, userId: USER_ID })
      });
      
      const data = await response.json();
      if (data.success) {
        console.log(`✅ "${message}"`);
        console.log(`   -> Title: "${data.task.title}"`);
        console.log(`   -> Priority: ${data.task.priority}`);
        console.log(`   -> Due Date: ${data.task.dueDate || 'none'}`);
      }
    } catch (error) {
      console.error(`❌ Failed: ${message}`);
    }
  }
  
  // Step 4: Verify all tasks are visible
  console.log('\n4️⃣ Final verification - listing all recent tasks...');
  try {
    const response = await fetch(`${API_URL}/api/tasks?limit=10&status=pending`, {
      headers: {
        'x-user-id': USER_ID
      }
    });
    
    const data = await response.json();
    console.log(`\nFound ${data.tasks?.length || 0} pending tasks for user ${USER_ID}:`);
    
    data.tasks?.forEach((task, index) => {
      console.log(`${index + 1}. ${task.title}`);
      console.log(`   Priority: ${task.priority}, Source: ${task.source || 'unknown'}`);
      console.log(`   Created: ${new Date(task.createdAt).toLocaleString()}`);
    });
  } catch (error) {
    console.error('Error fetching tasks:', error.message);
  }
}

// Run the test
console.log('🚀 Starting task creation test...');
console.log(`Using User ID: ${USER_ID}`);
console.log('-----------------------------------\n');

testTaskCreationFixed();