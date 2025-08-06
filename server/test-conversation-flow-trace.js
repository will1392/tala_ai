/**
 * Test complete conversation flow to identify where the breakdown occurs
 */

import fetch from 'node-fetch';
import { getSupabaseService } from './db/supabaseClient.js';

const API_URL = 'http://localhost:3001';
const USER_ID = 'admin-1';

async function testConversationFlow() {
  const supabase = getSupabaseService();
  
  console.log('🔍 Testing Complete Conversation Flow\n');
  
  // Step 1: Create a conversation via chat API
  console.log('📍 Step 1: Creating conversation via chat API');
  console.log('─'.repeat(50));
  
  const chatResponse = await fetch(`${API_URL}/api/chat/v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': USER_ID
    },
    body: JSON.stringify({
      message: 'Hello, I need help planning a trip to Italy',
      userId: USER_ID,
      mode: 'travel'
    })
  });
  
  const chatData = await chatResponse.json();
  const returnedConversationId = chatData.conversationId;
  
  console.log('Chat API response:', {
    success: chatData.success,
    conversationId: returnedConversationId,
    hasResponse: !!chatData.response
  });
  
  // Step 2: Check all conversations to see what was created
  console.log('\n📍 Step 2: Checking all recent conversations');
  console.log('─'.repeat(50));
  
  const { data: recentConversations, error: recentError } = await supabase
    .from('conversations')
    .select('id, title, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log('Recent conversations:');
  recentConversations?.forEach((conv, i) => {
    console.log(`  ${i + 1}. ${conv.id}`);
    console.log(`     Title: ${conv.title}`);
    console.log(`     Created: ${conv.created_at}`);
    console.log(`     Metadata threadId: ${conv.metadata?.threadId}`);
    console.log(`     Metadata originalUserId: ${conv.metadata?.originalUserId}`);
  });
  
  // Step 3: Check messages for the returned conversation ID
  console.log('\n📍 Step 3: Checking messages for returned conversation ID');
  console.log('─'.repeat(50));
  console.log('Conversation ID:', returnedConversationId);
  
  const { data: messages1, error: msgError1 } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', returnedConversationId)
    .order('created_at', { ascending: true });
    
  console.log(`Messages found: ${messages1?.length || 0}`);
  
  // Step 4: Check if messages exist for any recent conversation
  console.log('\n📍 Step 4: Checking messages for all recent conversations');
  console.log('─'.repeat(50));
  
  for (const conv of recentConversations || []) {
    const { data: convMessages, error: convMsgError } = await supabase
      .from('messages')
      .select('id, sender, content')
      .eq('conversation_id', conv.id)
      .limit(2);
      
    if (convMessages && convMessages.length > 0) {
      console.log(`\nConversation ${conv.id} has ${convMessages.length} messages:`);
      convMessages.forEach(msg => {
        console.log(`  - [${msg.sender}] ${msg.content.substring(0, 50)}...`);
      });
    }
  }
  
  // Step 5: Test history endpoint with returned conversation ID
  console.log('\n📍 Step 5: Testing history endpoint');
  console.log('─'.repeat(50));
  
  const historyUrl = `${API_URL}/api/chat/history?conversationId=${returnedConversationId}&limit=20`;
  console.log('History URL:', historyUrl);
  
  const historyResponse = await fetch(historyUrl, {
    headers: {
      'x-user-id': USER_ID
    }
  });
  
  if (historyResponse.ok) {
    const historyData = await historyResponse.json();
    console.log('History response:', {
      success: historyData.success,
      messageCount: historyData.messages?.length || 0,
      conversationId: historyData.conversationId
    });
  } else {
    console.error('History endpoint failed:', historyResponse.status);
  }
  
  // Step 6: Send follow-up with the returned conversation ID
  console.log('\n📍 Step 6: Sending follow-up message');
  console.log('─'.repeat(50));
  
  const followUpResponse = await fetch(`${API_URL}/api/chat/v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': USER_ID
    },
    body: JSON.stringify({
      message: 'What are the best restaurants in Rome?',
      conversationId: returnedConversationId,
      userId: USER_ID,
      mode: 'travel'
    })
  });
  
  const followUpData = await followUpResponse.json();
  console.log('Follow-up response:', {
    success: followUpData.success,
    returnedConversationId: followUpData.conversationId,
    isSameConversation: followUpData.conversationId === returnedConversationId
  });
  
  // Step 7: Final check of messages
  console.log('\n📍 Step 7: Final check of messages');
  console.log('─'.repeat(50));
  
  const { data: finalMessages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', returnedConversationId)
    .order('created_at', { ascending: true });
    
  console.log(`Final message count for ${returnedConversationId}: ${finalMessages?.length || 0}`);
  
  // Also check the follow-up conversation ID if different
  if (followUpData.conversationId !== returnedConversationId) {
    const { data: followUpMessages } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', followUpData.conversationId);
      
    console.log(`Messages in follow-up conversation ${followUpData.conversationId}: ${followUpMessages?.length || 0}`);
  }
}

testConversationFlow().catch(console.error);