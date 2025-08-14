/**
 * Debug exactly what's happening in the chat flow
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';

async function debugChatFlow() {
  console.log('🔍 Debugging Chat Flow\n');
  console.log('=' . repeat(60));
  
  // Test with explicit mode and searchKnowledge
  const requestBody = {
    message: 'Greece',
    mode: 'travel',
    searchKnowledge: true,
    userId: 'admin-1',
    isAdmin: true
  };
  
  console.log('📤 Request Body:', JSON.stringify(requestBody, null, 2));
  
  try {
    const response = await fetch(`${API_URL}/api/chat/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'admin-1'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('\n📥 Response Status:', response.status);
    
    const data = await response.json();
    
    console.log('\n📊 Response Analysis:');
    console.log('- Success:', data.success);
    console.log('- Has error:', !!data.error);
    
    if (data.error) {
      console.log('\n❌ ERROR DETAILS:');
      console.log('- Error:', data.error);
      console.log('- Details:', data.details);
      console.log('- Metadata:', JSON.stringify(data.metadata, null, 2));
      
      if (data.metadata?.attemptedSimpleFlow) {
        console.log('\n🔍 SIMPLE FLOW WAS ATTEMPTED BUT FAILED!');
        console.log('This means:');
        console.log('1. Mode === "travel" condition was TRUE');
        console.log('2. Simple flow code was executed');
        console.log('3. An error occurred during execution');
        console.log('4. Need to check server logs for specific error');
      }
    } else {
      console.log('\n✅ SUCCESS DETAILS:');
      console.log('- Simple flow used:', data.metadata?.simpleFlow === true);
      console.log('- Mode in metadata:', data.metadata?.mode);
      console.log('- Sources count:', data.sources?.length || 0);
      
      if (data.sources && data.sources.length > 0) {
        console.log('\nSources:');
        data.sources.forEach((s, i) => {
          console.log(`  ${i+1}. ${s.title} (Score: ${s.score?.toFixed(3)})`);
        });
      }
      
      console.log('\n- Response mentions Greece:', data.response?.toLowerCase().includes('greece') ? 'YES' : 'NO');
      console.log('- Response is generic:', data.response?.includes('don\'t have specific information') ? 'YES' : 'NO');
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
  
  console.log('\n\n💡 DIAGNOSIS:');
  console.log('If simple flow is not being used despite mode:"travel", then:');
  console.log('1. Server needs restart to pick up code changes');
  console.log('2. Check server logs for "USING SIMPLE TRAVEL FLOW" message');
  console.log('3. Check for "SIMPLE FLOW FAILED" error messages');
}

debugChatFlow().catch(console.error);