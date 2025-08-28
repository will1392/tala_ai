#!/usr/bin/env node

/**
 * Test conversational flow with Direct Mail Agent
 */

import fetch from 'node-fetch';

async function testConversationFlow() {
  console.log('🧪 Testing Conversational Flow\n');
  
  // Simulated conversation ID
  const conversationId = `test-conv-${Date.now()}`;
  const conversationHistory = [];
  
  // First message
  console.log('1️⃣ First Query: "Can you help me with a postcard campaign?"\n');
  
  const response1 = await fetch('http://localhost:3001/api/chat/intelligent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'test-user'
    },
    body: JSON.stringify({
      message: "Can you help me with a postcard campaign?",
      conversationId,
      mode: "cmo",
      subMode: "direct_mail"
    })
  });
  
  const data1 = await response1.json();
  console.log('Response 1:', data1.response?.substring(0, 200) + '...\n');
  
  // Add to history
  conversationHistory.push(
    { role: 'user', content: "Can you help me with a postcard campaign?" },
    { role: 'assistant', content: data1.response }
  );
  
  // Second message
  console.log('2️⃣ Second Query: "I want to reach out to more lux clients, maybe some river cruises?"\n');
  
  const response2 = await fetch('http://localhost:3001/api/chat/intelligent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'test-user'
    },
    body: JSON.stringify({
      message: "I want to reach out to more lux clients, maybe some river cruises?",
      conversationId,
      mode: "cmo",
      subMode: "direct_mail",
      conversationHistory
    })
  });
  
  const data2 = await response2.json();
  console.log('Response 2:', data2.response?.substring(0, 300) + '...\n');
  
  // Check if it's an echo
  if (data2.response?.includes("i want to reach out to more lux clients")) {
    console.log('❌ ERROR: Response is echoing the user input!');
    console.log('\nFull response:', data2.response);
  } else if (data2.response?.includes("Great!") || data2.response?.includes("Excellent") || data2.response?.includes("Perfect")) {
    console.log('✅ SUCCESS: Response is continuing the conversation!');
  } else {
    console.log('⚠️  WARNING: Unexpected response format');
  }
  
  // Add to history
  conversationHistory.push(
    { role: 'user', content: "I want to reach out to more lux clients, maybe some river cruises?" },
    { role: 'assistant', content: data2.response }
  );
  
  // Third message
  console.log('\n3️⃣ Third Query: "Budget is around $5000"\n');
  
  const response3 = await fetch('http://localhost:3001/api/chat/intelligent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'test-user'
    },
    body: JSON.stringify({
      message: "Budget is around $5000",
      conversationId,
      mode: "cmo",
      subMode: "direct_mail",
      conversationHistory
    })
  });
  
  const data3 = await response3.json();
  console.log('Response 3:', data3.response?.substring(0, 300) + '...\n');
  
  // Summary
  console.log('\n📊 Conversation Summary:');
  console.log('- First response asked about goals? ', data1.response?.includes('hoping to accomplish'));
  console.log('- Second response acknowledged luxury/river cruise? ', !data2.response?.includes('i want to reach'));
  console.log('- Third response discussed timeline/next steps? ', !data3.response?.includes('budget is around'));
}

testConversationFlow().catch(console.error);