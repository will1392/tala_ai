/**
 * Test Conversation Storage and Retrieval
 * 
 * This script tests that conversations are properly:
 * 1. Stored in the database
 * 2. Retrieved with history
 * 3. Maintain continuity between messages
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';
const USER_ID = 'admin-1';

async function testConversationStorage() {
  console.log('🧪 Testing Conversation Storage and Continuity...\n');
  
  let conversationId = null;
  
  // Test 1: Create a new conversation with first message
  console.log('📍 Test 1: Starting new conversation about Spain');
  console.log('─'.repeat(50));
  
  try {
    const response1 = await fetch(`${API_URL}/api/chat/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': USER_ID
      },
      body: JSON.stringify({
        message: 'Tell me about Spain',
        userId: USER_ID,
        mode: 'travel'
      })
    });
    
    const data1 = await response1.json();
    conversationId = data1.conversationId;
    
    console.log('✅ First message sent');
    console.log('📝 Conversation ID:', conversationId);
    console.log('💬 Response preview:', data1.response?.substring(0, 100) + '...');
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Send follow-up message in same conversation
    console.log('\n📍 Test 2: Follow-up question about hotels');
    console.log('─'.repeat(50));
    
    const response2 = await fetch(`${API_URL}/api/chat/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': USER_ID
      },
      body: JSON.stringify({
        message: 'What hotels do you recommend there?',
        userId: USER_ID,
        conversationId: conversationId,
        mode: 'travel'
      })
    });
    
    const data2 = await response2.json();
    
    console.log('✅ Follow-up message sent');
    console.log('💬 Response preview:', data2.response?.substring(0, 100) + '...');
    
    // Check if response understands "there" refers to Spain
    const understandsContext = data2.response?.toLowerCase().includes('spain') || 
                             data2.response?.toLowerCase().includes('spanish');
    
    console.log(`🎯 Context understood (refers to Spain): ${understandsContext ? '✅ Yes' : '❌ No'}`);
    
    // Test 3: Retrieve conversation history
    console.log('\n📍 Test 3: Retrieving conversation history');
    console.log('─'.repeat(50));
    
    const historyResponse = await fetch(`${API_URL}/api/chat/history/${conversationId}?userId=${USER_ID}`, {
      headers: {
        'x-user-id': USER_ID
      }
    });
    
    if (historyResponse.ok) {
      const historyData = await historyResponse.json();
      
      console.log('✅ Conversation history retrieved');
      console.log(`📊 Total messages: ${historyData.messages?.length || 0}`);
      console.log('📜 Message history:');
      
      historyData.messages?.forEach((msg, index) => {
        console.log(`  ${index + 1}. [${msg.sender}]: ${msg.content.substring(0, 60)}...`);
      });
      
      // Verify all messages are stored
      const hasAllMessages = historyData.messages?.length >= 4; // 2 user + 2 assistant
      console.log(`\n✅ All messages stored: ${hasAllMessages ? 'Yes' : 'No'} (${historyData.messages?.length} messages)`);
      
    } else {
      console.error('❌ Failed to retrieve history:', historyResponse.status);
    }
    
    // Test 4: List user's conversations
    console.log('\n📍 Test 4: Listing user conversations');
    console.log('─'.repeat(50));
    
    const conversationsResponse = await fetch(`${API_URL}/api/chat/conversations?userId=${USER_ID}`, {
      headers: {
        'x-user-id': USER_ID
      }
    });
    
    if (conversationsResponse.ok) {
      const conversationsData = await conversationsResponse.json();
      
      console.log('✅ Conversations list retrieved');
      console.log(`📊 Total conversations: ${conversationsData.conversations?.length || 0}`);
      
      // Find our test conversation
      const testConv = conversationsData.conversations?.find(c => c.id === conversationId);
      if (testConv) {
        console.log('✅ Test conversation found in list:');
        console.log(`  - Title: ${testConv.title}`);
        console.log(`  - Messages: ${testConv.messageCount}`);
        console.log(`  - Last activity: ${testConv.lastActivity}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  console.log('\n📋 Summary:');
  console.log('─'.repeat(50));
  console.log('Conversation storage should:');
  console.log('1. ✓ Store messages in PostgreSQL database');
  console.log('2. ✓ Maintain conversation IDs across messages');
  console.log('3. ✓ Retrieve full conversation history');
  console.log('4. ✓ Understand context from previous messages');
  console.log('5. ✓ List conversations for users');
}

// Run the test
testConversationStorage().catch(console.error);