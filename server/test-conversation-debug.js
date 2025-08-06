/**
 * Debug Conversation Storage
 * 
 * This script debugs the conversation and message storage
 */

import fetch from 'node-fetch';
import { ConversationService } from './services/db/conversationService.js';

const API_URL = 'http://localhost:3001';
const USER_ID = 'admin-1';

async function debugConversationStorage() {
  console.log('🧪 Debug Conversation Storage...\n');
  
  const conversationService = new ConversationService();
  
  // Step 1: Create a conversation via API
  console.log('📍 Step 1: Creating conversation via API');
  console.log('─'.repeat(50));
  
  const response1 = await fetch(`${API_URL}/api/chat/v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': USER_ID
    },
    body: JSON.stringify({
      message: 'Test message for debugging',
      userId: USER_ID,
      mode: 'travel'
    })
  });
  
  const data1 = await response1.json();
  const conversationId = data1.conversationId;
  
  console.log('✅ API Response:');
  console.log('  - Success:', data1.success);
  console.log('  - Conversation ID:', conversationId);
  console.log('  - Response length:', data1.response?.length);
  
  // Step 2: Check database directly
  console.log('\n📍 Step 2: Checking database directly');
  console.log('─'.repeat(50));
  
  // Check if conversation exists
  const convResult = await conversationService.getConversation(conversationId);
  console.log('Conversation exists in DB:', convResult.success);
  
  if (convResult.success) {
    console.log('  - Title:', convResult.data.title);
    console.log('  - Message count:', convResult.data.message_count);
    console.log('  - Created:', convResult.data.created_at);
  }
  
  // Check messages
  const msgResult = await conversationService.getMessages(conversationId);
  console.log('\nMessages in DB:', msgResult.success ? msgResult.data.length : 0);
  
  if (msgResult.success && msgResult.data.length > 0) {
    msgResult.data.forEach((msg, i) => {
      console.log(`  ${i + 1}. [${msg.sender}] ${msg.content.substring(0, 50)}...`);
    });
  }
  
  // Step 3: Try the history endpoint
  console.log('\n📍 Step 3: Testing history endpoint');
  console.log('─'.repeat(50));
  
  const historyUrl = `${API_URL}/api/chat/history/${conversationId}?userId=${USER_ID}`;
  console.log('URL:', historyUrl);
  
  const historyResponse = await fetch(historyUrl, {
    headers: {
      'x-user-id': USER_ID
    }
  });
  
  console.log('Response status:', historyResponse.status);
  console.log('Response OK:', historyResponse.ok);
  
  if (!historyResponse.ok) {
    const errorText = await historyResponse.text();
    console.log('Error response:', errorText);
  } else {
    const historyData = await historyResponse.json();
    console.log('History data:', {
      hasConversation: !!historyData.conversation,
      messageCount: historyData.messages?.length || 0
    });
  }
  
  // Step 4: Check what's happening in TalaIntelligence
  console.log('\n📍 Step 4: Checking message flow');
  console.log('─'.repeat(50));
  
  // Get the thread ID from conversation metadata
  if (convResult.success && convResult.data.metadata?.threadId) {
    console.log('Thread ID from metadata:', convResult.data.metadata.threadId);
  } else {
    console.log('No thread ID in conversation metadata');
  }
}

// Run the debug
debugConversationStorage().catch(console.error);