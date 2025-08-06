/**
 * Test conversation creation and retrieval flow
 */

import { getSupabaseService } from './db/supabaseClient.js';
import fetch from 'node-fetch';

const API_URL = 'http://localhost:5008';

async function checkDatabase() {
  const supabase = getSupabaseService();
  
  console.log('\n🔍 Checking database state...\n');
  
  // Check conversations
  const { data: conversations, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (convError) {
    console.error('❌ Error fetching conversations:', convError);
  } else {
    console.log(`📊 Found ${conversations?.length || 0} recent conversations:`);
    conversations?.forEach(conv => {
      console.log(`\n  ID: ${conv.id}`);
      console.log(`  User: ${conv.user_id}`);
      console.log(`  Title: ${conv.title || 'No title'}`);
      console.log(`  Created: ${conv.created_at}`);
    });
  }
  
  // Check messages
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (msgError) {
    console.error('❌ Error fetching messages:', msgError);
  } else {
    console.log(`\n📊 Found ${messages?.length || 0} recent messages:`);
    messages?.forEach(msg => {
      console.log(`\n  ID: ${msg.id}`);
      console.log(`  Conversation: ${msg.conversation_id}`);
      console.log(`  Sender: ${msg.sender}`);
      console.log(`  Content: ${msg.content.substring(0, 50)}...`);
      console.log(`  Created: ${msg.created_at}`);
    });
  }
}

async function testChatFlow() {
  console.log('\n🧪 Testing chat flow...\n');
  
  // Step 1: Send initial message
  console.log('1️⃣ Sending initial message...');
  const chatResponse = await fetch(`${API_URL}/api/chat/v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'test_user_123'
    },
    body: JSON.stringify({
      message: 'Tell me about Spain',
      mode: 'travel',
      searchKnowledge: true
    })
  });
  
  const chatData = await chatResponse.json();
  console.log('\n📤 Chat response:', {
    success: chatData.success,
    hasResponse: !!chatData.response,
    conversationId: chatData.conversationId,
    responseLength: chatData.response?.length
  });
  
  if (!chatData.conversationId) {
    console.error('❌ No conversation ID returned!');
    return;
  }
  
  // Step 2: Check if conversation exists in DB
  console.log('\n2️⃣ Checking if conversation exists in database...');
  const supabase = getSupabaseService();
  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', chatData.conversationId)
    .single();
    
  if (convError) {
    console.error('❌ Conversation not found in database:', convError);
    console.log('   Conversation ID:', chatData.conversationId);
  } else {
    console.log('✅ Conversation found in database:', {
      id: conv.id,
      userId: conv.user_id,
      title: conv.title,
      createdAt: conv.created_at
    });
  }
  
  // Step 3: Check messages
  console.log('\n3️⃣ Checking messages for conversation...');
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', chatData.conversationId)
    .order('message_index', { ascending: true });
    
  if (msgError) {
    console.error('❌ Error fetching messages:', msgError);
  } else {
    console.log(`✅ Found ${messages?.length || 0} messages in conversation`);
    messages?.forEach((msg, i) => {
      console.log(`\n  Message ${i + 1}:`);
      console.log(`    Sender: ${msg.sender}`);
      console.log(`    Content: ${msg.content.substring(0, 100)}...`);
    });
  }
  
  // Step 4: Try to retrieve history
  console.log('\n4️⃣ Testing history endpoint...');
  const historyResponse = await fetch(`${API_URL}/api/chat/history?conversationId=${chatData.conversationId}`, {
    method: 'GET',
    headers: {
      'x-user-id': 'test_user_123'
    }
  });
  
  const historyData = await historyResponse.json();
  console.log('\n📤 History response:', {
    status: historyResponse.status,
    success: historyData.success,
    messagesCount: historyData.messages?.length,
    error: historyData.error
  });
  
  // Step 5: Send follow-up message
  console.log('\n5️⃣ Sending follow-up message...');
  const followUpResponse = await fetch(`${API_URL}/api/chat/v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'test_user_123'
    },
    body: JSON.stringify({
      message: 'What about hotels there?',
      conversationId: chatData.conversationId,
      mode: 'travel',
      searchKnowledge: true
    })
  });
  
  const followUpData = await followUpResponse.json();
  console.log('\n📤 Follow-up response:', {
    success: followUpData.success,
    conversationId: followUpData.conversationId,
    sameConversation: followUpData.conversationId === chatData.conversationId
  });
  
  // Final DB check
  console.log('\n6️⃣ Final database check...');
  const { data: finalMessages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', chatData.conversationId)
    .order('message_index', { ascending: true });
    
  console.log(`\n✅ Final message count: ${finalMessages?.length || 0}`);
}

async function main() {
  try {
    // First check initial state
    await checkDatabase();
    
    // Then test the flow
    await testChatFlow();
    
    // Final state check
    console.log('\n\n🔍 Final database state:');
    await checkDatabase();
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

main().catch(console.error);