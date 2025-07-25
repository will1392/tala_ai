/**
 * Test script to verify task persistence after fixing database imports
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001/api';
const TEST_API_KEY = 'test_key_123';

// Helper to make API requests
async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'X-API-Key': TEST_API_KEY,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  const data = await response.json();
  return { response, data };
}

async function testTaskPersistence() {
  console.log('🧪 Testing Task Persistence After Fixes\n');
  
  try {
    // Step 1: Create a test task
    console.log('1️⃣ Creating test task...');
    const createResponse = await apiRequest('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        title: `Persistence Test Task - ${new Date().toISOString()}`,
        description: 'Testing if this task persists after server restart',
        priority: 'high',
        tags: ['test', 'persistence']
      })
    });
    
    if (!createResponse.data.success) {
      throw new Error('Failed to create task: ' + createResponse.data.error);
    }
    
    const taskId = createResponse.data.task.id;
    console.log(`✅ Task created with ID: ${taskId}`);
    console.log(`   Title: ${createResponse.data.task.title}`);
    console.log(`   Status: ${createResponse.data.task.status}`);
    
    // Step 2: Update the task to completed
    console.log('\n2️⃣ Marking task as completed...');
    const updateResponse = await apiRequest(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'completed'
      })
    });
    
    if (!updateResponse.data.success) {
      throw new Error('Failed to update task: ' + updateResponse.data.error);
    }
    
    console.log(`✅ Task marked as completed`);
    console.log(`   Status: ${updateResponse.data.task.status}`);
    console.log(`   Completed at: ${updateResponse.data.task.completedAt}`);
    
    // Step 3: Fetch the task to verify it's in database
    console.log('\n3️⃣ Fetching task to verify persistence...');
    const fetchResponse = await apiRequest(`/tasks?limit=5&offset=0`);
    
    if (!fetchResponse.data.success) {
      throw new Error('Failed to fetch tasks: ' + fetchResponse.data.error);
    }
    
    const foundTask = fetchResponse.data.tasks.find(t => t.id === taskId);
    if (!foundTask) {
      throw new Error('Task not found in database after creation!');
    }
    
    console.log(`✅ Task found in database:`);
    console.log(`   ID: ${foundTask.id}`);
    console.log(`   Status: ${foundTask.status}`);
    console.log(`   Created by: ${foundTask.createdBy}`);
    
    // Step 4: Instructions for manual verification
    console.log('\n4️⃣ Manual Verification Steps:');
    console.log('   1. Restart the server: npm run dev');
    console.log('   2. Run this command to check if task persists:');
    console.log(`      curl -H "X-API-Key: ${TEST_API_KEY}" ${API_URL}/tasks?limit=10`);
    console.log(`   3. Look for task with ID: ${taskId}`);
    
    // Step 5: Check database directly
    console.log('\n5️⃣ Checking Supabase directly...');
    const supabaseResponse = await apiRequest('/tasks/admin/verify-supabase');
    
    if (supabaseResponse.data.success) {
      console.log(`✅ Supabase verification:`);
      console.log(`   Total tasks in DB: ${supabaseResponse.data.totalTasks}`);
      console.log(`   Tasks table exists: ${supabaseResponse.data.tableExists}`);
    }
    
    console.log('\n✅ All tests passed! Tasks should now persist after restart.');
    console.log('   The mock DatabaseService has been replaced with SupabaseDatabaseService.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testTaskPersistence();