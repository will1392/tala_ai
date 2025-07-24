#!/usr/bin/env node

/**
 * Clear all tasks and test with the correct user ID that frontend uses
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';
const FRONTEND_USER_ID = 'test_user_123'; // The user ID the frontend actually uses

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

async function testChatTaskCreation(message) {
  console.log(`\n🤖 Testing: "${message}"`);
  
  const response = await fetch(`${API_URL}/api/chat/v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': FRONTEND_USER_ID
    },
    body: JSON.stringify({
      message,
      userId: FRONTEND_USER_ID,
      conversationId: `test-conv-${Date.now()}`
    })
  });
  
  const result = await response.json();
  console.log('Response:', {
    success: result.success,
    response: typeof result.response === 'string' 
      ? result.response.substring(0, 100) + '...' 
      : JSON.stringify(result.response)
  });
  
  return result;
}

async function listUserTasks() {
  console.log(`\n📋 Listing tasks for user ${FRONTEND_USER_ID}...`);
  
  const response = await fetch(`${API_URL}/api/tasks?limit=10`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': FRONTEND_USER_ID
    }
  });
  
  const result = await response.json();
  if (result.success) {
    console.log(`Found ${result.total} tasks:`);
    result.tasks.forEach((task, idx) => {
      console.log(`  ${idx + 1}. "${task.title}"`);
      console.log(`     ID: ${task.id}`);
      console.log(`     Created by: ${task.created_by || task.createdBy}`);
      console.log(`     Priority: ${task.priority}`);
      console.log(`     Status: ${task.status}`);
    });
    return result.tasks;
  } else {
    console.error('❌ Failed to list tasks:', result.error);
    return [];
  }
}

async function runTests() {
  console.log('🧪 Task Creation Test Suite');
  console.log('========================');
  console.log(`📡 API: ${API_URL}`);
  console.log(`👤 User: ${FRONTEND_USER_ID}`);
  
  try {
    // Clear all tasks
    await clearAllTasks();
    
    // Test various task creation messages
    const testMessages = [
      'Create a task to book flight to Paris',
      'Add a todo to renew my passport',
      'Please make a task for visa application',
      'I need to remember to check hotel prices',
      'Remind me to call the airline tomorrow'
    ];
    
    for (const message of testMessages) {
      await testChatTaskCreation(message);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // List all created tasks
    const tasks = await listUserTasks();
    
    // Summary
    console.log('\n📊 Test Summary');
    console.log('==============');
    console.log(`✅ Tasks created: ${tasks.length}`);
    console.log(`${tasks.length > 0 ? '✅' : '❌'} Task creation: ${tasks.length > 0 ? 'WORKING' : 'NOT WORKING'}`);
    
    if (tasks.length === 0) {
      console.log('\n⚠️  ISSUE: No tasks were created!');
      console.log('Check the server logs for errors.');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Run tests
runTests();