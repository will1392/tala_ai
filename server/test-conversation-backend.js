#!/usr/bin/env node

/**
 * Test script to verify conversation backend is working properly
 * Run with: node server/test-conversation-backend.js
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001';
const USER_ID = 'admin-1';

async function testConversationBackend() {
  console.log('🔍 Testing Conversation Backend...\n');
  
  try {
    // Test 1: List conversations
    console.log('1️⃣ Testing GET /api/conversations');
    const listResponse = await fetch(`${API_BASE}/api/conversations`, {
      headers: {
        'x-user-id': USER_ID
      }
    });
    
    if (listResponse.ok) {
      const data = await listResponse.json();
      console.log('✅ Conversations endpoint works');
      console.log(`   Found ${data.conversations?.length || 0} conversations`);
      
      // If we have conversations, test loading messages
      if (data.conversations && data.conversations.length > 0) {
        const firstConv = data.conversations[0];
        console.log(`   First conversation ID: ${firstConv.id}`);
        
        // Test 2: Load messages for a conversation
        console.log('\n2️⃣ Testing GET /api/conversations/:id/messages');
        const messagesResponse = await fetch(
          `${API_BASE}/api/conversations/${firstConv.id}/messages`,
          {
            headers: {
              'x-user-id': USER_ID
            }
          }
        );
        
        if (messagesResponse.ok) {
          const msgData = await messagesResponse.json();
          console.log('✅ Messages endpoint works');
          console.log(`   Found ${msgData.messages?.length || 0} messages`);
          
          if (msgData.messages && msgData.messages.length > 0) {
            console.log('   Sample message:', {
              content: msgData.messages[0].content?.substring(0, 50) + '...',
              sender: msgData.messages[0].sender || msgData.messages[0].role,
              timestamp: msgData.messages[0].timestamp || msgData.messages[0].created_at
            });
          }
        } else {
          console.log('❌ Messages endpoint failed:', messagesResponse.status);
        }
      }
    } else {
      console.log('❌ Conversations endpoint failed:', listResponse.status);
    }
    
    // Test 3: Send a test message to create a new conversation
    console.log('\n3️⃣ Testing POST /api/chat/v2 (create new conversation)');
    const chatResponse = await fetch(`${API_BASE}/api/chat/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': USER_ID
      },
      body: JSON.stringify({
        message: 'Test message from backend test script',
        mode: 'travel',
        searchKnowledge: false
      })
    });
    
    if (chatResponse.ok) {
      const chatData = await chatResponse.json();
      console.log('✅ Chat endpoint works');
      console.log('   New conversation ID:', chatData.conversationId);
      console.log('   Response:', chatData.response?.substring(0, 100) + '...');
      
      // Test 4: Verify we can load the new conversation
      if (chatData.conversationId) {
        console.log('\n4️⃣ Testing if new conversation is retrievable');
        const newConvResponse = await fetch(
          `${API_BASE}/api/conversations/${chatData.conversationId}/messages`,
          {
            headers: {
              'x-user-id': USER_ID
            }
          }
        );
        
        if (newConvResponse.ok) {
          const newConvData = await newConvResponse.json();
          console.log('✅ New conversation is retrievable');
          console.log(`   Contains ${newConvData.messages?.length || 0} messages`);
        } else {
          console.log('❌ Could not retrieve new conversation:', newConvResponse.status);
        }
      }
    } else {
      console.log('❌ Chat endpoint failed:', chatResponse.status);
      const errorText = await chatResponse.text();
      console.log('   Error:', errorText);
    }
    
    // Test 5: Check ThreadingService directly
    console.log('\n5️⃣ Checking if ThreadingService is available');
    const { default: ThreadingService } = await import('./services/intelligence/ThreadingService.js');
    const threadingService = new ThreadingService();
    
    try {
      await threadingService.initialize();
      console.log('✅ ThreadingService initialized successfully');
      
      // Try to get threads
      const threads = await threadingService.getUserThreads(USER_ID, { limit: 5 });
      console.log(`   Found ${threads?.length || 0} threads directly from ThreadingService`);
    } catch (error) {
      console.log('❌ ThreadingService initialization failed:', error.message);
    }
    
    console.log('\n✨ Backend test complete!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testConversationBackend().then(() => {
  console.log('\n📝 If all tests passed, the backend is working correctly.');
  console.log('   If some tests failed, check the server logs for more details.');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});