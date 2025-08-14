/**
 * Test ThreadingServiceDB directly to see if messages are being stored
 */

import ThreadingServiceDB from './services/conversations/ThreadingServiceDB.js';
import { getSupabaseService } from './db/supabaseClient.js';

async function testThreadingServiceDirect() {
  const threadingService = new ThreadingServiceDB();
  const supabase = getSupabaseService();
  
  console.log('🧪 Testing ThreadingServiceDB Directly\n');
  
  // Initialize the service
  await threadingService.initialize();
  
  // Step 1: Create a thread
  console.log('📍 Step 1: Creating a thread');
  console.log('─'.repeat(50));
  
  const thread = await threadingService.createThread({
    userId: 'admin-1',
    organizationId: 'org-1',
    title: 'Direct Test Thread',
    metadata: { test: true }
  });
  
  console.log('Thread created:', {
    id: thread.id,
    conversationId: thread.conversationId,
    userId: thread.userId
  });
  
  // Step 2: Add messages to the thread
  console.log('\n📍 Step 2: Adding messages');
  console.log('─'.repeat(50));
  
  try {
    const userMessage = await threadingService.addMessage(thread.id, {
      role: 'user',
      content: 'This is a test user message'
    });
    console.log('User message added:', !!userMessage);
    
    const assistantMessage = await threadingService.addMessage(thread.id, {
      role: 'assistant',
      content: 'This is a test assistant response',
      model_used: 'test-model',
      provider: 'test-provider'
    });
    console.log('Assistant message added:', !!assistantMessage);
  } catch (error) {
    console.error('Error adding messages:', error.message);
  }
  
  // Step 3: Get messages from the thread
  console.log('\n📍 Step 3: Getting messages from thread');
  console.log('─'.repeat(50));
  
  const messages = await threadingService.getThreadMessages(thread.id);
  console.log('Messages retrieved:', messages.length);
  
  // Step 4: Check database directly
  console.log('\n📍 Step 4: Checking database directly');
  console.log('─'.repeat(50));
  
  // Check conversation
  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', thread.conversationId)
    .single();
    
  if (convError) {
    console.error('Error fetching conversation:', convError);
  } else {
    console.log('Conversation in DB:', {
      id: conv.id,
      title: conv.title,
      message_count: conv.message_count
    });
  }
  
  // Check messages
  const { data: dbMessages, error: msgError } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', thread.conversationId)
    .order('created_at', { ascending: true });
    
  if (msgError) {
    console.error('Error fetching messages:', msgError);
  } else {
    console.log('Messages in DB:', dbMessages?.length || 0);
    dbMessages?.forEach((msg, i) => {
      console.log(`  ${i + 1}. [${msg.sender}] ${msg.content}`);
    });
  }
  
  // Step 5: Test getOrCreateThread
  console.log('\n📍 Step 5: Testing getOrCreateThread');
  console.log('─'.repeat(50));
  
  const existingThread = await threadingService.getOrCreateThread({
    userId: 'admin-1',
    conversationId: thread.conversationId,
    organizationId: 'org-1'
  });
  
  console.log('Retrieved thread:', {
    id: existingThread.id,
    conversationId: existingThread.conversationId,
    messageCount: existingThread.messages?.length || 0
  });
}

testThreadingServiceDirect().catch(console.error);