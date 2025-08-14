/**
 * Test what the server logs show for travel mode
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';

async function testServerLogging() {
  console.log('🔍 Testing Server Logging for Travel Mode\n');
  console.log('=' . repeat(60));
  console.log('\nCheck your SERVER CONSOLE for the following messages:\n');
  console.log('Expected to see:');
  console.log('1. "🚀 intelligentChat.js loaded - VERSION: Simple flow for ALL travel queries"');
  console.log('2. "🎯 IntelligentChat /v2 endpoint hit!"');
  console.log('3. "🔍 DEBUG - Mode extraction:"');
  console.log('4. "   - mode from body: travel"');
  console.log('5. "   - mode === \\"travel\\": true"');
  console.log('6. "🌍 USING SIMPLE TRAVEL FLOW - Bypassing intelligence system"');
  console.log('\n' + '=' . repeat(60) + '\n');
  
  const testBody = {
    message: 'Greece',
    mode: 'travel',
    searchKnowledge: true
  };
  
  console.log('Sending request with body:', JSON.stringify(testBody, null, 2));
  
  try {
    const response = await fetch(`${API_URL}/api/chat/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'admin-1'
      },
      body: JSON.stringify(testBody)
    });
    
    const data = await response.json();
    
    console.log('\nResponse received:');
    console.log('- Status:', response.status);
    console.log('- Success:', data.success);
    
    if (!data.success && data.metadata?.attemptedSimpleFlow) {
      console.log('\n❌ SIMPLE FLOW ATTEMPTED BUT FAILED!');
      console.log('Error:', data.error);
      console.log('Details:', data.details);
      console.log('\nCheck server console for:');
      console.log('- "❌ SIMPLE FLOW FAILED:" message');
      console.log('- Stack trace showing exact error');
    } else if (data.metadata?.simpleFlow === true) {
      console.log('\n✅ SIMPLE FLOW WORKED!');
      console.log('Sources:', data.sources?.map(s => s.title));
    } else {
      console.log('\n⚠️  SIMPLE FLOW NOT USED');
      console.log('This means mode !== "travel" on the server side');
      console.log('Check server console to see what mode value was received');
    }
    
  } catch (error) {
    console.error('Request error:', error.message);
  }
  
  console.log('\n\n💡 IMPORTANT: Check your SERVER CONSOLE now!');
  console.log('Look for the debug messages to see what\'s happening.');
}

testServerLogging().catch(console.error);