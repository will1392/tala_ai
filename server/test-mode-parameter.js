/**
 * Test if mode parameter is being passed correctly
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';

async function testModeParameter() {
  console.log('🧪 Testing Mode Parameter Passing\n');
  
  const testBody = {
    message: "Tell me about Greece",
    mode: 'travel',
    searchKnowledge: true,
    userId: 'admin-1',
    isAdmin: true
  };
  
  console.log('📤 Sending request with body:', JSON.stringify(testBody, null, 2));
  
  try {
    const response = await fetch(`${API_URL}/api/chat/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'admin-1'
      },
      body: JSON.stringify(testBody)
    });
    
    console.log('\n📥 Response status:', response.status);
    
    const data = await response.json();
    console.log('\n📊 Response metadata:', data.metadata);
    console.log('\n🔍 Mode in response:', data.metadata?.mode);
    console.log('🔍 Simple flow used:', data.metadata?.simpleFlow);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testModeParameter();