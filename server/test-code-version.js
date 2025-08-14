/**
 * Verify the server is running the updated code
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';

async function testCodeVersion() {
  console.log('🔍 Verifying Server Code Version\n');
  console.log('=' . repeat(60));
  
  try {
    // Test the version endpoint
    const versionResponse = await fetch(`${API_URL}/api/chat/test-version`);
    
    if (versionResponse.ok) {
      const version = await versionResponse.json();
      console.log('\n✅ Server is running UPDATED code:');
      console.log(JSON.stringify(version, null, 2));
    } else {
      console.log('\n❌ Version endpoint not found');
      console.log('This means the server is running OLD code!');
      console.log('Status:', versionResponse.status);
    }
  } catch (error) {
    console.error('Error checking version:', error.message);
  }
  
  // Now test with a minimal request
  console.log('\n\n📝 Testing minimal travel request:');
  console.log('-' . repeat(40));
  
  try {
    const response = await fetch(`${API_URL}/api/chat/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'test123'
      },
      body: JSON.stringify({
        message: 'test',
        mode: 'travel'
      })
    });
    
    console.log('Response status:', response.status);
    
    if (response.status === 500) {
      const data = await response.json();
      if (data.metadata?.attemptedSimpleFlow === true) {
        console.log('\n✅ GOOD: Simple flow WAS attempted!');
        console.log('It failed with:', data.details);
        console.log('This proves the code is updated and mode=travel works');
      }
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
  
  console.log('\n\n💡 DIAGNOSIS:');
  console.log('If version endpoint returns 404, the server is running old code.');
  console.log('Try:');
  console.log('1. Stop the server (Ctrl+C)');
  console.log('2. Run: npm run dev');
  console.log('3. Wait for "✅ Intelligent chat system ready" message');
  console.log('4. Run this test again');
}

testCodeVersion().catch(console.error);