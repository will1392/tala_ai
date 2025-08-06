/**
 * Test conversation creation and message storage
 */

import { getSupabaseService } from './db/supabaseClient.js';
import { ConversationService } from './services/db/conversationService.js';
import userResolver from './services/auth/UserResolver.js';

async function testConversationCreation() {
  const supabase = getSupabaseService();
  const conversationService = new ConversationService();
  
  console.log('🧪 Testing Conversation Creation and Message Storage\n');
  
  // Step 1: Resolve user ID
  console.log('📍 Step 1: Resolving user ID');
  console.log('─'.repeat(50));
  
  const userId = await userResolver.resolveUserId('admin-1');
  const orgId = await userResolver.resolveOrgId('org-1');
  
  console.log('User ID:', userId);
  console.log('Org ID:', orgId);
  
  // Step 2: Create conversation directly
  console.log('\n📍 Step 2: Creating conversation directly');
  console.log('─'.repeat(50));
  
  const createResult = await conversationService.createConversation({
    user_id: userId,
    organization_id: orgId,
    title: 'Test Conversation',
    description: 'Testing conversation creation'
  });
  
  console.log('Create result:', {
    success: createResult.success,
    conversationId: createResult.data?.id,
    error: createResult.error
  });
  
  if (!createResult.success) {
    console.error('Failed to create conversation:', createResult.error);
    return;
  }
  
  const conversationId = createResult.data.id;
  
  // Step 3: Add a message
  console.log('\n📍 Step 3: Adding message to conversation');
  console.log('─'.repeat(50));
  
  const messageResult = await conversationService.addMessage({
    conversation_id: conversationId,
    role: 'user',
    content: 'This is a test message'
  });
  
  console.log('Message result:', {
    success: messageResult.success,
    messageId: messageResult.data?.id,
    error: messageResult.error
  });
  
  // Step 4: Verify in database
  console.log('\n📍 Step 4: Verifying in database');
  console.log('─'.repeat(50));
  
  // Check conversation
  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single();
    
  console.log('Conversation in DB:', {
    found: !!conv,
    id: conv?.id,
    title: conv?.title,
    error: convError
  });
  
  // Check messages
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId);
    
  console.log('Messages in DB:', {
    count: messages?.length || 0,
    error: msgError
  });
  
  if (messages?.length > 0) {
    console.log('\nMessage details:');
    messages.forEach((msg, i) => {
      console.log(`  ${i + 1}. Sender: ${msg.sender}, Content: ${msg.content}`);
    });
  }
  
  // Step 5: Test getConversation with includeMessages
  console.log('\n📍 Step 5: Testing getConversation with includeMessages');
  console.log('─'.repeat(50));
  
  const getResult = await conversationService.getConversation(conversationId, {
    includeMessages: true
  });
  
  console.log('Get conversation result:', {
    success: getResult.success,
    hasMessages: !!getResult.data?.messages,
    messageCount: getResult.data?.messages?.length || 0
  });
  
  // Step 6: Test getMessages directly
  console.log('\n📍 Step 6: Testing getMessages directly');
  console.log('─'.repeat(50));
  
  const messagesResult = await conversationService.getMessages(conversationId);
  
  console.log('Get messages result:', {
    success: messagesResult.success,
    messageCount: messagesResult.data?.length || 0
  });
}

testConversationCreation().catch(console.error);