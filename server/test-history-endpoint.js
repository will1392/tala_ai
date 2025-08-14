/**
 * Test history endpoint to verify the correct URL and parameters
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';
const USER_ID = 'admin-1';

async function testHistoryEndpoint() {
  console.log('🧪 Testing History Endpoint...\n');
  
  try {
    // Step 1: Create a conversation first
    console.log('📍 Step 1: Creating a new conversation');
    console.log('─'.repeat(50));
    
    const chatResponse = await fetch(`${API_URL}/api/chat/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': USER_ID
      },
      body: JSON.stringify({
        message: 'Tell me about Spain travel destinations',
        userId: USER_ID,
        mode: 'travel'
      })
    });
    
    const chatData = await chatResponse.json();
    console.log('✅ Chat response:', {
      success: chatData.success,
      conversationId: chatData.conversationId,
      hasResponse: !!chatData.response
    });
    
    if (!chatData.conversationId) {
      throw new Error('No conversation ID returned');
    }
    
    // Step 2: Send a follow-up message
    console.log('\n📍 Step 2: Sending follow-up message');
    console.log('─'.repeat(50));
    
    const followUpResponse = await fetch(`${API_URL}/api/chat/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': USER_ID
      },
      body: JSON.stringify({
        message: 'What are the best hotels in Madrid?',
        conversationId: chatData.conversationId,
        userId: USER_ID,
        mode: 'travel'
      })
    });
    
    const followUpData = await followUpResponse.json();
    console.log('✅ Follow-up response:', {
      success: followUpData.success,
      conversationId: followUpData.conversationId,
      contextUnderstood: followUpData.response?.includes('Madrid') || followUpData.response?.includes('Spain')
    });
    
    // Step 3: Test the CORRECT history endpoint URL
    console.log('\n📍 Step 3: Testing history endpoint with CORRECT URL');
    console.log('─'.repeat(50));
    
    // The correct URL format based on the route definition
    const historyUrl = `${API_URL}/api/chat/history?conversationId=${chatData.conversationId}&limit=20`;
    console.log('📌 Correct URL:', historyUrl);
    
    const historyResponse = await fetch(historyUrl, {
      method: 'GET',
      headers: {
        'x-user-id': USER_ID
      }
    });
    
    console.log('Response status:', historyResponse.status);
    console.log('Response OK:', historyResponse.ok);
    
    if (!historyResponse.ok) {
      const errorText = await historyResponse.text();
      console.log('❌ Error response:', errorText);
      
      // Try the old URL format to show the difference
      console.log('\n📍 Testing OLD (incorrect) URL format for comparison');
      const oldUrl = `${API_URL}/api/chat/history/${chatData.conversationId}?userId=${USER_ID}`;
      console.log('📌 Old URL:', oldUrl);
      
      const oldResponse = await fetch(oldUrl, {
        headers: {
          'x-user-id': USER_ID
        }
      });
      
      console.log('Old URL status:', oldResponse.status, '(Expected: 404)');
    } else {
      const historyData = await historyResponse.json();
      console.log('✅ History retrieved successfully!');
      console.log('History data:', {
        success: historyData.success,
        messageCount: historyData.messages?.length || 0,
        memoryCount: historyData.memories?.length || 0,
        conversationId: historyData.conversationId
      });
      
      if (historyData.messages && historyData.messages.length > 0) {
        console.log('\nMessages:');
        historyData.messages.forEach((msg, i) => {
          console.log(`  ${i + 1}. [${msg.role}] ${msg.content.substring(0, 60)}...`);
        });
      }
    }
    
    // Step 4: Test without conversationId to see error handling
    console.log('\n📍 Step 4: Testing error handling (no conversationId)');
    console.log('─'.repeat(50));
    
    const errorResponse = await fetch(`${API_URL}/api/chat/history`, {
      headers: {
        'x-user-id': USER_ID
      }
    });
    
    const errorData = await errorResponse.json();
    console.log('Expected error:', {
      status: errorResponse.status,
      error: errorData.error,
      code: errorData.code
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
console.log('🚀 Starting history endpoint test...\n');
testHistoryEndpoint().catch(console.error);