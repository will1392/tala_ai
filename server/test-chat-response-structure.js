/**
 * Test chat v2 response structure
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';

async function testResponseStructure() {
  console.log('🔍 Testing Chat v2 Response Structure\n');
  
  try {
    const response = await fetch(`${API_URL}/api/chat/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'admin-1'
      },
      body: JSON.stringify({
        message: 'What are the visa requirements for traveling to Japan?',
        userId: 'admin-1',
        isAdmin: true
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Response received\n');
      console.log('📊 Full response structure:');
      console.log(JSON.stringify(result, null, 2));
      
      console.log('\n🔍 Key paths:');
      console.log('- result.response:', typeof result.response, result.response ? '✅' : '❌');
      console.log('- result.sources:', typeof result.sources, result.sources ? '✅' : '❌');
      console.log('- result.data:', typeof result.data, result.data ? '✅' : '❌');
      console.log('- result.data.response:', typeof result.data?.response, result.data?.response ? '✅' : '❌');
      console.log('- result.timestamp:', typeof result.timestamp, result.timestamp ? '✅' : '❌');
      console.log('- result.tokensUsed:', typeof result.tokensUsed, result.tokensUsed ? '✅' : '❌');
      
    } else {
      console.log('❌ Request failed:', response.status);
      const error = await response.text();
      console.log(error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testResponseStructure();