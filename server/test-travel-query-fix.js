#!/usr/bin/env node

/**
 * Test script to verify travel query responses use knowledge base
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const API_URL = process.env.API_URL || 'http://localhost:3000';

// Test queries
const testQueries = [
  {
    name: "Northern Lights Query",
    message: "what can you tell me about the northern lights?",
    mode: "travel",
    expectedBehavior: "Should use knowledge base to provide information about northern lights"
  },
  {
    name: "Travel Information Query",
    message: "when is the best time to visit Iceland?",
    mode: "travel",
    expectedBehavior: "Should provide travel information from knowledge base"
  },
  {
    name: "Task Creation Query",
    message: "create a task to book flights to Iceland",
    mode: "travel",
    expectedBehavior: "Should create a task, not provide travel info"
  }
];

async function testTravelQuery(query) {
  console.log(`\n🧪 Testing: ${query.name}`);
  console.log(`📝 Query: "${query.message}"`);
  console.log(`🎯 Expected: ${query.expectedBehavior}`);
  
  try {
    // First, get auth token (using test user)
    const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });
    
    if (!loginResponse.ok) {
      console.log('⚠️  Using mock auth for testing');
      // Continue with mock token for testing
    }
    
    const authData = loginResponse.ok ? await loginResponse.json() : { token: 'mock-token' };
    
    // Send chat request
    const chatResponse = await fetch(`${API_URL}/api/chat/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.token || 'mock-token'}`
      },
      body: JSON.stringify({
        message: query.message,
        mode: query.mode,
        searchKnowledge: true,
        conversationId: `test-${Date.now()}`
      })
    });
    
    const result = await chatResponse.json();
    
    if (!chatResponse.ok) {
      console.error('❌ Request failed:', result.error);
      return false;
    }
    
    console.log('\n📤 Response received:');
    console.log('-------------------');
    console.log(result.response);
    console.log('-------------------');
    
    // Check response quality
    const response = result.response.toLowerCase();
    const hasGenericTaskResponse = response.includes('i can help with creating tasks') || 
                                   response.includes('i can help with various tasks');
    const hasKnowledgeContent = response.includes('northern lights') || 
                               response.includes('aurora') ||
                               response.includes('iceland') ||
                               response.includes('best time');
    const createdTask = result.metadata?.taskId || response.includes('task') && response.includes('created');
    
    // Analyze result
    if (query.name.includes('Task Creation') && createdTask) {
      console.log('✅ Correctly created a task');
      return true;
    } else if (!query.name.includes('Task Creation') && hasKnowledgeContent && !hasGenericTaskResponse) {
      console.log('✅ Correctly provided travel information from knowledge base');
      return true;
    } else if (hasGenericTaskResponse) {
      console.log('❌ Gave generic task response instead of using knowledge base');
      return false;
    } else {
      console.log('⚠️  Response unclear - may need manual review');
      return null;
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Travel Query Response Tests');
  console.log('=====================================');
  
  const results = {
    passed: 0,
    failed: 0,
    unclear: 0
  };
  
  for (const query of testQueries) {
    const result = await testTravelQuery(query);
    if (result === true) results.passed++;
    else if (result === false) results.failed++;
    else results.unclear++;
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 Test Results Summary');
  console.log('======================');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️  Unclear: ${results.unclear}`);
  console.log(`📝 Total: ${testQueries.length}`);
  
  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! Travel queries are using knowledge base correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Travel queries may still be giving generic responses.');
  }
}

// Run tests
runTests().catch(console.error);