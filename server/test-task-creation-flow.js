#!/usr/bin/env node

/**
 * Test script to verify task creation flow through chat
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';
const TEST_USER_ID = 'test-user-456'; // Using a specific test user ID

async function clearAllTasks() {
  console.log('\n🗑️  Clearing all existing tasks...');
  
  const response = await fetch(`${API_URL}/api/tasks/admin/clear-all`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': process.env.ADMIN_KEY || 'dev-only'
    }
  });
  
  const result = await response.json();
  console.log(`✅ ${result.message || 'Tasks cleared'}`);
}

async function testDirectTaskCreation() {
  console.log('\n📝 Testing direct task creation endpoint...');
  
  const response = await fetch(`${API_URL}/api/chat-tasks/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': TEST_USER_ID
    },
    body: JSON.stringify({
      message: 'Create a task to review the quarterly report',
      userId: TEST_USER_ID
    })
  });
  
  const result = await response.json();
  if (result.success) {
    console.log(`✅ Direct task creation successful: "${result.task.title}"`);
    console.log(`   Task ID: ${result.task.id}`);
    console.log(`   Created by: ${result.task.created_by}`);
    return result.task;
  } else {
    console.error('❌ Direct task creation failed:', result.error);
    return null;
  }
}

async function testChatV2TaskCreation() {
  console.log('\n🤖 Testing task creation via chat/v2 endpoint...');
  
  const response = await fetch(`${API_URL}/api/chat/v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': TEST_USER_ID
    },
    body: JSON.stringify({
      message: 'Please create a task to schedule team meeting',
      userId: TEST_USER_ID,
      conversationId: `test-conv-${Date.now()}`
    })
  });
  
  const result = await response.json();
  console.log('Chat response:', {
    success: result.success,
    hasResponse: !!result.response,
    metadata: result.metadata
  });
  
  return result;
}

async function listUserTasks() {
  console.log(`\n📋 Listing tasks for user ${TEST_USER_ID}...`);
  
  const response = await fetch(`${API_URL}/api/tasks?limit=10`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': TEST_USER_ID
    }
  });
  
  const result = await response.json();
  if (result.success) {
    console.log(`Found ${result.total} tasks for user ${TEST_USER_ID}:`);
    result.tasks.forEach(task => {
      console.log(`  - "${task.title}" (ID: ${task.id}, Created by: ${task.created_by})`);
    });
    return result.tasks;
  } else {
    console.error('❌ Failed to list tasks:', result.error);
    return [];
  }
}

async function listAllTasks() {
  console.log('\n📋 Listing ALL tasks (admin view)...');
  
  // Use a different user ID to see if we can see all tasks
  const response = await fetch(`${API_URL}/api/tasks?limit=100`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'admin-user'
    }
  });
  
  const result = await response.json();
  if (result.success) {
    console.log(`Total tasks in system: ${result.total}`);
    const userGroups = {};
    result.tasks.forEach(task => {
      const userId = task.created_by || 'unknown';
      userGroups[userId] = (userGroups[userId] || 0) + 1;
    });
    console.log('Tasks by user:');
    Object.entries(userGroups).forEach(([userId, count]) => {
      console.log(`  - ${userId}: ${count} tasks`);
    });
  }
}

async function runTests() {
  console.log('🧪 Starting task creation flow tests...');
  console.log(`🔧 API URL: ${API_URL}`);
  console.log(`👤 Test User ID: ${TEST_USER_ID}`);
  
  try {
    // Clear all tasks first
    await clearAllTasks();
    
    // Test direct task creation
    const directTask = await testDirectTaskCreation();
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test chat v2 task creation
    const chatResponse = await testChatV2TaskCreation();
    
    // Small delay to ensure processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // List user's tasks
    const userTasks = await listUserTasks();
    
    // List all tasks (admin view)
    await listAllTasks();
    
    // Verify results
    console.log('\n📊 Test Results Summary:');
    console.log(`✅ Direct task creation: ${directTask ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Chat task creation: ${chatResponse.success ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ User task visibility: ${userTasks.length > 0 ? 'PASSED' : 'FAILED'}`);
    
    if (userTasks.length === 0) {
      console.log('\n⚠️  WARNING: No tasks visible for test user!');
      console.log('This indicates the user ID is not being properly propagated.');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Run the tests
runTests();