#!/usr/bin/env node

/**
 * Test the fixed backend conversation system
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001';
const USER_ID = 'admin-1';

async function testBackendFix() {
  console.log('🧪 Testing Fixed Backend Conversation System\n');
  console.log('=' .repeat(60) + '\n');
  
  try {
    // Test 1: Send message WITHOUT conversation ID (should create new)
    console.log('1️⃣ Testing new conversation creation (no ID provided)');
    const response1 = await fetch(`${API_BASE}/api/chat/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': USER_ID
      },
      body: JSON.stringify({
        message: 'Hello, testing backend fix',
        mode: 'travel',
        searchKnowledge: false
        // Note: NOT sending conversationId
      })
    });
    
    if (response1.ok) {
      const data1 = await response1.json();
      console.log('✅ First message sent');
      console.log('   Backend conversation ID:', data1.conversationId);
      console.log('   Is frontend format (conv-)?:', data1.conversationId?.startsWith('conv-') ? '❌ YES (BAD)' : '✅ NO (GOOD)');
      
      const backendId = data1.conversationId;
      
      // Test 2: Send message WITH backend conversation ID
      console.log('\n2️⃣ Testing continuation with backend ID');
      const response2 = await fetch(`${API_BASE}/api/chat/v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': USER_ID
        },
        body: JSON.stringify({
          message: 'Second message in same conversation',
          mode: 'travel',
          conversationId: backendId,
          searchKnowledge: false
        })
      });
      
      if (response2.ok) {
        const data2 = await response2.json();
        console.log('✅ Second message sent');
        console.log('   Returned same ID?:', data2.conversationId === backendId ? '✅ YES' : '❌ NO');
        console.log('   ID:', data2.conversationId);
      } else {
        console.log('❌ Second message failed:', response2.status);
      }
      
      // Test 3: Send message with frontend conv- ID (should be rejected)
      console.log('\n3️⃣ Testing frontend ID rejection');
      const response3 = await fetch(`${API_BASE}/api/chat/v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': USER_ID
        },
        body: JSON.stringify({
          message: 'Testing with frontend ID',
          mode: 'travel',
          conversationId: 'conv-test-123-456',
          searchKnowledge: false
        })
      });
      
      if (response3.ok) {
        const data3 = await response3.json();
        console.log('✅ Message sent');
        console.log('   Rejected frontend ID?:', data3.conversationId !== 'conv-test-123-456' ? '✅ YES' : '❌ NO');
        console.log('   New backend ID:', data3.conversationId);
        console.log('   Is backend format?:', !data3.conversationId?.startsWith('conv-') ? '✅ YES' : '❌ NO');
      } else {
        console.log('❌ Message failed:', response3.status);
      }
      
      // Test 4: Load messages for backend conversation
      if (backendId) {
        console.log('\n4️⃣ Testing message retrieval');
        const response4 = await fetch(`${API_BASE}/api/conversations/${backendId}/messages`, {
          headers: {
            'x-user-id': USER_ID
          }
        });
        
        if (response4.ok) {
          const data4 = await response4.json();
          console.log('✅ Messages retrieved');
          console.log('   Message count:', data4.messages?.length || 0);
          if (data4.messages && data4.messages.length > 0) {
            console.log('   First message:', data4.messages[0].content?.substring(0, 50) + '...');
          }
        } else {
          console.log('❌ Message retrieval failed:', response4.status);
        }
      }
      
      // Test 5: List conversations
      console.log('\n5️⃣ Testing conversation list');
      const response5 = await fetch(`${API_BASE}/api/conversations`, {
        headers: {
          'x-user-id': USER_ID
        }
      });
      
      if (response5.ok) {
        const data5 = await response5.json();
        console.log('✅ Conversation list retrieved');
        console.log('   Total conversations:', data5.conversations?.length || 0);
        
        if (data5.conversations && data5.conversations.length > 0) {
          console.log('\n   Recent conversations:');
          data5.conversations.slice(0, 3).forEach((conv, i) => {
            console.log(`   ${i + 1}. ${conv.title || 'Untitled'}`);
            console.log(`      ID: ${conv.id}`);
            console.log(`      Frontend format?: ${conv.id?.startsWith('conv-') ? '❌ YES' : '✅ NO'}`);
          });
        }
      } else {
        console.log('❌ Conversation list failed:', response5.status);
      }
      
    } else {
      console.log('❌ First message failed:', response1.status);
      const error = await response1.text();
      console.log('   Error:', error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('✨ Backend test complete!\n');
  console.log('Summary:');
  console.log('- Backend should create proper IDs (not conv-xxx)');
  console.log('- Frontend conv- IDs should be rejected');
  console.log('- Messages should be retrievable by backend ID');
  console.log('- Conversation list should show backend IDs');
}

// Run the test
testBackendFix().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});