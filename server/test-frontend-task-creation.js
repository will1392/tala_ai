/**
 * Simple test to verify task creation through frontend chat endpoint
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';

async function testFrontendTaskCreation() {
  console.log('🧪 Testing task creation via frontend chat endpoint...\n');
  
  try {
    // Test 1: Verify the v2 endpoint is accessible
    console.log('📝 Test 1: Checking if /api/chat/v2 endpoint is accessible');
    const healthResponse = await fetch(`${API_URL}/api/chat/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mock-user-id': 'test_user_123'
      },
      body: JSON.stringify({
        message: 'hello',
        userId: 'test_user_123'
      })
    });
    
    console.log(`   Status: ${healthResponse.status} ${healthResponse.statusText}`);
    
    // Test 2: Create a simple task
    console.log('\n📝 Test 2: Creating a simple task');
    const createResponse = await fetch(`${API_URL}/api/chat/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mock-user-id': 'test_user_123'
      },
      body: JSON.stringify({
        message: 'create task Buy milk',
        userId: 'test_user_123'
      })
    });
    
    console.log(`   Status: ${createResponse.status}`);
    
    if (createResponse.ok) {
      const data = await createResponse.json();
      console.log(`   Success: ${data.success}`);
      console.log(`   Has response: ${!!data.response}`);
      
      // Check if task was created
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const tasksResponse = await fetch(`${API_URL}/api/tasks?status=pending&limit=10`, {
        method: 'GET',
        headers: {
          'x-mock-user-id': 'test_user_123'
        }
      });
      
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        const buyMilkTask = tasksData.tasks?.find(t => 
          t.title.toLowerCase().includes('milk') || 
          t.title.toLowerCase().includes('buy')
        );
        
        if (buyMilkTask) {
          console.log(`   ✅ Task created successfully: "${buyMilkTask.title}"`);
        } else {
          console.log(`   ⚠️ Task may not have been created (found ${tasksData.tasks?.length || 0} tasks)`);
        }
      }
    } else {
      const errorData = await createResponse.json();
      console.log(`   ❌ Error:`, errorData.error || 'Unknown error');
    }
    
    console.log('\n✅ Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testFrontendTaskCreation();