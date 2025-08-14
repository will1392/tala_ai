#!/usr/bin/env node

/**
 * Quick test to verify the fix is working
 */

import fetch from 'node-fetch';

console.log('🧪 Quick Conversation Test\n');

// Test 1: Create a conversation
console.log('Creating test conversation...');
const response = await fetch('http://localhost:3001/api/chat/v2', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-user-id': 'admin-1'
  },
  body: JSON.stringify({
    message: 'Test message - checking if conversations persist',
    mode: 'travel',
    searchKnowledge: false
  })
});

if (response.ok) {
  const data = await response.json();
  console.log('✅ Created conversation:', data.conversationId);
  console.log('   Is backend format?:', !data.conversationId?.startsWith('conv-'));
  
  // Test 2: List conversations
  console.log('\nListing conversations...');
  const listResponse = await fetch('http://localhost:3001/api/conversations', {
    headers: { 'x-user-id': 'admin-1' }
  });
  
  if (listResponse.ok) {
    const listData = await listResponse.json();
    console.log(`✅ Found ${listData.conversations?.length || 0} conversations`);
    
    if (listData.conversations?.length > 0) {
      const hasOurConv = listData.conversations.some(c => c.id === data.conversationId);
      console.log('   Our conversation is in the list?:', hasOurConv ? '✅ YES' : '❌ NO');
    }
  }
  
  // Test 3: Load messages
  if (data.conversationId) {
    console.log('\nLoading messages...');
    const msgResponse = await fetch(`http://localhost:3001/api/conversations/${data.conversationId}/messages`, {
      headers: { 'x-user-id': 'admin-1' }
    });
    
    if (msgResponse.ok) {
      const msgData = await msgResponse.json();
      console.log(`✅ Found ${msgData.messages?.length || 0} messages`);
    }
  }
  
  console.log('\n✨ Test complete!');
  console.log('\nIf you see ✅ marks above, the fix is working!');
  console.log('Now clear your browser localStorage and test in the app.');
} else {
  console.log('❌ Failed to create conversation');
  console.log('Make sure the server is running on port 3001');
}

process.exit(0);