#!/usr/bin/env node

/**
 * Test Conversation Threading API Endpoints
 * 
 * Tests the REST API endpoints for conversation threading functionality
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001/api/conversations';

console.log('🔌 Testing Conversation Threading API Endpoints...\n');

// Test data
const testConversationId = 'test-conv-' + Date.now();
const testMessages = [
  {
    id: 'msg-1',
    role: 'user',
    content: "I'm planning a trip to Europe for 2 weeks in June.",
    created_at: new Date().toISOString()
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: "That sounds wonderful! Which cities are you considering?",
    created_at: new Date().toISOString()
  },
  {
    id: 'msg-3',
    role: 'user',
    content: "Thinking about Paris, Rome, and Barcelona. But what if we just focused on Paris?",
    created_at: new Date().toISOString()
  }
];

async function testEndpoint(method, endpoint, body = null, description = '') {
  console.log(`\n🧪 Testing: ${description || endpoint}`);
  console.log(`   ${method} ${endpoint}`);
  
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(BASE_URL + endpoint, options);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`   ✅ Status: ${response.status}`);
      console.log(`   ✅ Response:`, JSON.stringify(data, null, 2).substring(0, 200) + '...');
      return { success: true, data };
    } else {
      console.log(`   ❌ Status: ${response.status}`);
      console.log(`   ❌ Error:`, data.error || data);
      return { success: false, error: data };
    }
  } catch (error) {
    console.log(`   ❌ Request failed:`, error.message);
    return { success: false, error: error.message };
  }
}

async function runAPITests() {
  console.log('📋 Running API endpoint tests...');
  
  // Test 1: Create a branch
  console.log('\n1️⃣ Branch Creation Tests');
  await testEndpoint('POST', `/${testConversationId}/branch`, {
    branchPoint: {
      messageId: 'msg-3',
      reason: 'Exploring Paris-only itinerary',
      type: 'exploration'
    }
  }, 'Create new branch from conversation');
  
  // Test 2: Get threads
  console.log('\n2️⃣ Thread Retrieval Tests');
  await testEndpoint('GET', `/${testConversationId}/threads`, null, 'Get all threads for conversation');
  
  // Test 3: Get conversation tree
  console.log('\n3️⃣ Tree Structure Tests');
  await testEndpoint('GET', `/${testConversationId}/tree`, null, 'Get conversation tree structure');
  
  // Test 4: Analyze branch points
  console.log('\n4️⃣ Branch Analysis Tests');
  await testEndpoint('POST', `/${testConversationId}/analyze-branch-points`, {
    messages: testMessages,
    enableLLM: false
  }, 'Analyze messages for branch points');
  
  // Test 5: Get branch suggestions
  console.log('\n5️⃣ Branch Suggestion Tests');
  await testEndpoint('GET', `/${testConversationId}/branch-suggestions?messageCount=10`, null, 'Get branch suggestions');
  
  // Test 6: Thread comparison
  console.log('\n6️⃣ Thread Comparison Tests');
  await testEndpoint('POST', '/threads/compare', {
    threadIds: ['thread-1', 'thread-2']
  }, 'Compare multiple threads');
  
  // Test 7: Thread merge preview
  console.log('\n7️⃣ Merge Preview Tests');
  await testEndpoint('POST', '/threads/merge-preview', {
    threadIds: ['thread-1', 'thread-2'],
    strategy: 'chronological'
  }, 'Preview thread merge');
  
  // Test 8: Thread navigation
  console.log('\n8️⃣ Navigation Tests');
  await testEndpoint('GET', `/${testConversationId}/navigation`, null, 'Get thread navigation data');
  
  // Test 9: Decision paths
  console.log('\n9️⃣ Decision Path Tests');
  await testEndpoint('GET', `/${testConversationId}/decision-paths`, null, 'Track decision paths');
  
  console.log('\n\n✅ API endpoint tests completed!');
  console.log('\n📊 Test Summary:');
  console.log('   - Branch creation endpoint: /api/conversations/:id/branch');
  console.log('   - Thread retrieval endpoint: /api/conversations/:id/threads');
  console.log('   - Tree structure endpoint: /api/conversations/:id/tree');
  console.log('   - Branch analysis endpoint: /api/conversations/:id/analyze-branch-points');
  console.log('   - Suggestions endpoint: /api/conversations/:id/branch-suggestions');
  console.log('   - Comparison endpoint: /api/conversations/threads/compare');
  console.log('   - Merge preview endpoint: /api/conversations/threads/merge-preview');
  console.log('   - Navigation endpoint: /api/conversations/:id/navigation');
  console.log('   - Decision paths endpoint: /api/conversations/:id/decision-paths');
  
  console.log('\n💡 Note: Some endpoints may return errors if the test conversation IDs don\'t exist in the database.');
  console.log('   This is expected behavior for this test script.');
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3001/api/llm/health');
    if (response.ok) {
      console.log('✅ Server is running on port 3001\n');
      return true;
    }
  } catch (error) {
    console.log('❌ Server is not running on port 3001');
    console.log('   Please start the server with: npm start\n');
    return false;
  }
}

// Main execution
async function main() {
  const serverRunning = await checkServer();
  
  if (serverRunning) {
    await runAPITests();
  } else {
    console.log('⚠️  Skipping API tests - server not available');
  }
}

main();