/**
 * Debug conversation and message storage in detail
 */

import { getSupabaseService } from './db/supabaseClient.js';
import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';
const USER_ID = 'admin-1';

async function debugConversationMessages() {
  const supabase = getSupabaseService();
  
  console.log('🔍 Debugging Conversation and Message Storage\n');
  
  // Step 1: Create a conversation via API
  console.log('📍 Step 1: Creating conversation via API');
  console.log('─'.repeat(50));
  
  const chatResponse = await fetch(`${API_URL}/api/chat/v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': USER_ID
    },
    body: JSON.stringify({
      message: 'Tell me about travel to France',
      userId: USER_ID,
      mode: 'travel'
    })
  });
  
  const chatData = await chatResponse.json();
  const conversationId = chatData.conversationId;
  
  console.log('API Response:', {
    success: chatData.success,
    conversationId: conversationId,
    hasResponse: !!chatData.response
  });
  
  // Step 2: Check database directly for conversation
  console.log('\n📍 Step 2: Checking conversation in database');
  console.log('─'.repeat(50));
  
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single();
    
  if (convError) {
    console.error('Error fetching conversation:', convError);
  } else {
    console.log('Conversation found:', {
      id: conversation.id,
      title: conversation.title,
      user_id: conversation.user_id,
      created_at: conversation.created_at,
      metadata: conversation.metadata
    });
  }
  
  // Step 3: Check messages in database
  console.log('\n📍 Step 3: Checking messages in database');
  console.log('─'.repeat(50));
  
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
    
  if (msgError) {
    console.error('Error fetching messages:', msgError);
  } else {
    console.log(`Found ${messages?.length || 0} messages`);
    messages?.forEach((msg, i) => {
      console.log(`\nMessage ${i + 1}:`);
      console.log('  ID:', msg.id);
      console.log('  Role:', msg.role);
      console.log('  Content preview:', msg.content?.substring(0, 100) + '...');
      console.log('  Created:', msg.created_at);
    });
  }
  
  // Step 4: Send follow-up message
  console.log('\n📍 Step 4: Sending follow-up message');
  console.log('─'.repeat(50));
  
  const followUpResponse = await fetch(`${API_URL}/api/chat/v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': USER_ID
    },
    body: JSON.stringify({
      message: 'What are the best restaurants in Paris?',
      conversationId: conversationId,
      userId: USER_ID,
      mode: 'travel'
    })
  });
  
  const followUpData = await followUpResponse.json();
  console.log('Follow-up response:', {
    success: followUpData.success,
    sameConversation: followUpData.conversationId === conversationId
  });
  
  // Step 5: Check messages again
  console.log('\n📍 Step 5: Checking messages after follow-up');
  console.log('─'.repeat(50));
  
  const { data: updatedMessages, error: updateError } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
    
  console.log(`Total messages now: ${updatedMessages?.length || 0}`);
  
  // Step 6: Test history endpoint
  console.log('\n📍 Step 6: Testing history endpoint');
  console.log('─'.repeat(50));
  
  const historyUrl = `${API_URL}/api/chat/history?conversationId=${conversationId}&limit=20`;
  console.log('History URL:', historyUrl);
  
  const historyResponse = await fetch(historyUrl, {
    headers: {
      'x-user-id': USER_ID
    }
  });
  
  if (historyResponse.ok) {
    const historyData = await historyResponse.json();
    console.log('History endpoint result:', {
      success: historyData.success,
      messageCount: historyData.messages?.length || 0,
      memoryCount: historyData.memories?.length || 0
    });
    
    if (historyData.messages?.length > 0) {
      console.log('\nMessages from history endpoint:');
      historyData.messages.forEach((msg, i) => {
        console.log(`  ${i + 1}. [${msg.role}] ${msg.content?.substring(0, 60)}...`);
      });
    }
  } else {
    console.error('History endpoint failed:', historyResponse.status);
  }
  
  // Step 7: Check if it's a threading issue
  console.log('\n📍 Step 7: Checking threading service cache');
  console.log('─'.repeat(50));
  
  // Check all conversations for this user
  const { data: allConversations } = await supabase
    .from('conversations')
    .select('id, title, metadata')
    .eq('user_id', USER_ID)
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log('Recent conversations for user:');
  allConversations?.forEach(conv => {
    console.log(`  - ${conv.id}: ${conv.title}`);
    if (conv.metadata?.threadId) {
      console.log(`    Thread ID: ${conv.metadata.threadId}`);
    }
  });
}

debugConversationMessages().catch(console.error);