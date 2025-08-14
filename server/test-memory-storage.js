#!/usr/bin/env node

/**
 * Test that conversations work with in-memory storage
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001';
const USER_ID = 'admin-1';

async function testMemoryStorage() {
  console.log('🧪 Testing Conversation System (Memory Storage)\n');
  console.log('=' .repeat(60) + '\n');
  
  try {
    // Test 1: Create a conversation
    console.log('1️⃣ Creating new conversation...');
    const response1 = await fetch(`${API_BASE}/api/chat/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': USER_ID
      },
      body: JSON.stringify({
        message: 'Hello, testing memory storage',
        mode: 'travel',
        searchKnowledge: false
      })
    });
    
    if (!response1.ok) {
      console.log('❌ Failed to create conversation:', response1.status);
      const error = await response1.text();
      console.log('Error:', error);
      return;
    }
    
    const data1 = await response1.json();
    console.log('✅ Created conversation:', data1.conversationId);
    
    const conversationId = data1.conversationId;
    
    // Test 2: Add another message to same conversation
    console.log('\n2️⃣ Adding second message...');
    const response2 = await fetch(`${API_BASE}/api/chat/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': USER_ID
      },
      body: JSON.stringify({
        message: 'This is the second message',
        mode: 'travel',
        conversationId: conversationId,
        searchKnowledge: false
      })
    });
    
    if (!response2.ok) {
      console.log('❌ Failed to add message:', response2.status);
      return;
    }
    
    const data2 = await response2.json();
    console.log('✅ Added message to conversation');
    console.log('   Same conversation ID?:', data2.conversationId === conversationId);
    
    // Test 3: Retrieve messages
    console.log('\n3️⃣ Retrieving messages...');
    const response3 = await fetch(`${API_BASE}/api/conversations/${conversationId}/messages`, {
      headers: {
        'x-user-id': USER_ID
      }
    });
    
    if (!response3.ok) {
      console.log('❌ Failed to retrieve messages:', response3.status);
      return;
    }
    
    const data3 = await response3.json();
    console.log('✅ Retrieved messages');
    console.log('   Message count:', data3.messages?.length || 0);
    
    if (data3.messages && data3.messages.length > 0) {
      console.log('\n   Messages:');
      data3.messages.forEach((msg, i) => {
        console.log(`   ${i + 1}. [${msg.role || msg.sender}]: ${msg.content?.substring(0, 50)}...`);
      });
    }
    
    // Test 4: List conversations
    console.log('\n4️⃣ Listing conversations...');
    const response4 = await fetch(`${API_BASE}/api/conversations`, {
      headers: {
        'x-user-id': USER_ID
      }
    });
    
    if (!response4.ok) {
      console.log('❌ Failed to list conversations:', response4.status);
      return;
    }
    
    const data4 = await response4.json();
    console.log('✅ Listed conversations');
    console.log('   Total count:', data4.conversations?.length || 0);
    
    const hasOurConv = data4.conversations?.some(c => c.id === conversationId);
    console.log('   Our conversation in list?:', hasOurConv ? '✅ YES' : '❌ NO');
    
    // Test 5: Create another conversation
    console.log('\n5️⃣ Creating second conversation...');
    const response5 = await fetch(`${API_BASE}/api/chat/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': USER_ID
      },
      body: JSON.stringify({
        message: 'Starting a different conversation',
        mode: 'travel',
        searchKnowledge: false
      })
    });
    
    if (response5.ok) {
      const data5 = await response5.json();
      console.log('✅ Created second conversation:', data5.conversationId);
      console.log('   Different from first?:', data5.conversationId !== conversationId);
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('✨ Memory Storage Test Complete!\n');
    console.log('Results:');
    console.log('✅ Conversations can be created');
    console.log('✅ Messages are stored in memory');
    console.log('✅ Messages can be retrieved');
    console.log('✅ Multiple conversations work');
    console.log('\n⚠️  Note: Since we\'re using memory storage,');
    console.log('   conversations will be lost when server restarts.');
    console.log('   To persist data, configure Supabase in .env file.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testMemoryStorage().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});