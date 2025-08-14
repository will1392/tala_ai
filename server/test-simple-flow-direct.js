/**
 * Test if the simple flow condition is being met
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';

async function testSimpleFlowDirect() {
  console.log('🧪 Testing Simple Flow Condition\n');
  
  const query = "Tell me about Greece";
  const mode = "travel";
  
  // Check the condition logic
  const isTravelInfoQuery = mode === 'travel' && (
    query.toLowerCase().includes('tell me about') ||
    query.toLowerCase().includes('what about') ||
    query.toLowerCase().includes('information about') ||
    query.toLowerCase().includes('guide') ||
    query.toLowerCase().includes('travel') ||
    query.toLowerCase().includes('visit')
  );
  
  console.log('📋 Condition Check:');
  console.log('   Mode:', mode);
  console.log('   Query:', query);
  console.log('   Query lowercase:', query.toLowerCase());
  console.log('   Contains "tell me about":', query.toLowerCase().includes('tell me about'));
  console.log('   Mode === "travel":', mode === 'travel');
  console.log('   Should use simple flow:', isTravelInfoQuery);
  
  console.log('\n📤 Sending actual request...\n');
  
  try {
    const response = await fetch(`${API_URL}/api/chat/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'admin-1'
      },
      body: JSON.stringify({
        message: query,
        mode: mode,
        searchKnowledge: true
      })
    });
    
    const data = await response.json();
    
    console.log('📥 Response received:');
    console.log('   Success:', data.success);
    console.log('   Has sources:', !!data.sources);
    console.log('   Sources count:', data.sources?.length || 0);
    console.log('   Metadata:', data.metadata);
    
    if (data.metadata?.simpleFlow === true) {
      console.log('\n✅ SIMPLE FLOW WAS USED!');
    } else {
      console.log('\n❌ Simple flow was NOT used');
      console.log('   This means either:');
      console.log('   1. The mode parameter is not being passed correctly');
      console.log('   2. The condition check is failing');
      console.log('   3. The simple flow is erroring and falling through');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testSimpleFlowDirect();