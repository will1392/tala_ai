/**
 * Test chat endpoints to debug 500 errors
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';

async function testEndpoints() {
  console.log('🔍 Testing Chat Endpoints\n');
  
  // Test 1: Check if server is running
  console.log('1️⃣ Testing server health...');
  try {
    const health = await fetch(`${API_URL}/api/health`);
    if (health.ok) {
      console.log('✅ Server is running');
    } else {
      console.log('⚠️ Health check failed:', health.status);
    }
  } catch (error) {
    console.error('❌ Cannot connect to server:', error.message);
    console.log('\n⚠️ Make sure the server is running on port 3001');
    return;
  }
  
  // Test 2: Test context endpoint
  console.log('\n2️⃣ Testing context endpoint...');
  try {
    const contextResponse = await fetch(
      `${API_URL}/api/chat/context/status/test-conversation?userId=admin-1`,
      {
        headers: {
          'x-user-id': 'admin-1'
        }
      }
    );
    
    if (contextResponse.ok) {
      console.log('✅ Context endpoint working');
      const data = await contextResponse.json();
      console.log('   Response:', data);
    } else {
      console.log('❌ Context endpoint error:', contextResponse.status);
      const error = await contextResponse.text();
      console.log('   Error:', error);
    }
  } catch (error) {
    console.error('❌ Context request failed:', error.message);
  }
  
  // Test 3: Test chat v2 endpoint
  console.log('\n3️⃣ Testing chat v2 endpoint...');
  try {
    const chatResponse = await fetch(`${API_URL}/api/chat/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'admin-1'
      },
      body: JSON.stringify({
        message: 'Hello, this is a test',
        userId: 'admin-1',
        isAdmin: true
      })
    });
    
    if (chatResponse.ok) {
      console.log('✅ Chat v2 endpoint working');
      const data = await chatResponse.json();
      console.log('   Response preview:', JSON.stringify(data).substring(0, 100) + '...');
    } else {
      console.log('❌ Chat v2 endpoint error:', chatResponse.status);
      const error = await chatResponse.text();
      console.log('   Error:', error);
    }
  } catch (error) {
    console.error('❌ Chat request failed:', error.message);
  }
  
  // Test 4: Test basic database connection
  console.log('\n4️⃣ Testing database endpoints...');
  try {
    const tasksResponse = await fetch(`${API_URL}/api/tasks?limit=1`, {
      headers: {
        'x-user-id': 'admin-1'
      }
    });
    
    if (tasksResponse.ok) {
      console.log('✅ Database connection working');
    } else {
      console.log('❌ Database endpoint error:', tasksResponse.status);
    }
  } catch (error) {
    console.error('❌ Database request failed:', error.message);
  }
  
  console.log('\n\n📊 DEBUGGING STEPS:');
  console.log('1. Check the server console for detailed error messages');
  console.log('2. Look for errors related to:');
  console.log('   - ContextManager initialization');
  console.log('   - Database connections');
  console.log('   - Missing environment variables');
  console.log('3. Common issues:');
  console.log('   - Missing OPENAI_API_KEY in .env');
  console.log('   - Supabase connection issues');
  console.log('   - Module import errors from our recent changes');
}

testEndpoints();