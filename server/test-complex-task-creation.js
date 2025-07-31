/**
 * Test complex task creation scenarios via chat
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';

async function testComplexTaskCreation() {
  console.log('🧪 Testing complex task creation via chat...\n');
  
  const testCases = [
    {
      name: 'Task with due date',
      message: 'Create a task to book flight tickets due tomorrow with high priority'
    },
    {
      name: 'Task with specific time',
      message: 'Create task "Call travel agent" due tonight at 11:30pm'
    },
    {
      name: 'Task with description',
      message: 'Create a task: Review passport expiry dates - Check all family members passports and note expiry dates'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log(`   Message: "${testCase.message}"`);
    
    try {
      const response = await fetch(`${API_URL}/api/chat/v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-mock-user-id': 'test_user_123'
        },
        body: JSON.stringify({
          message: testCase.message,
          userId: 'test_user_123'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Response received (${data.success ? 'success' : 'failed'})`);
        
        // Wait for task to be created
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Fetch latest tasks
        const tasksResponse = await fetch(`${API_URL}/api/tasks?status=pending&limit=20`, {
          method: 'GET',
          headers: {
            'x-mock-user-id': 'test_user_123'
          }
        });
        
        if (tasksResponse.ok) {
          const tasksData = await tasksResponse.json();
          const latestTask = tasksData.tasks?.[0];
          
          if (latestTask) {
            console.log(`   📋 Created task:`);
            console.log(`      - Title: ${latestTask.title}`);
            console.log(`      - Priority: ${latestTask.priority}`);
            console.log(`      - Due Date: ${latestTask.dueDate || 'Not set'}`);
            if (latestTask.description) {
              console.log(`      - Description: ${latestTask.description.substring(0, 50)}...`);
            }
          }
        }
      } else {
        const error = await response.json();
        console.log(`   ❌ Error: ${error.error}`);
      }
    } catch (error) {
      console.log(`   ❌ Test failed: ${error.message}`);
    }
  }
  
  // Final summary
  console.log('\n📊 Summary:');
  const summaryResponse = await fetch(`${API_URL}/api/tasks?status=pending`, {
    headers: { 'x-mock-user-id': 'test_user_123' }
  });
  
  if (summaryResponse.ok) {
    const summaryData = await summaryResponse.json();
    console.log(`   Total pending tasks: ${summaryData.tasks?.length || 0}`);
    console.log(`   Tasks created in this session:`);
    summaryData.tasks?.slice(0, 5).forEach(task => {
      console.log(`   - ${task.title} (${task.priority} priority)`);
    });
  }
  
  console.log('\n✅ All tests completed!');
}

// Run the test
testComplexTaskCreation();