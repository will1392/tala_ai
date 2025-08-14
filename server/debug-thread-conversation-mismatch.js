/**
 * Debug the mismatch between thread IDs and conversation IDs
 */

import { getSupabaseService } from './db/supabaseClient.js';

async function debugThreadConversationMismatch() {
  const supabase = getSupabaseService();
  
  console.log('🔍 Debugging Thread ID vs Conversation ID Mismatch\n');
  
  // Get the most recent conversation
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);
    
  if (!conversations || conversations.length === 0) {
    console.log('No conversations found');
    return;
  }
  
  const conv = conversations[0];
  
  console.log('Most recent conversation:');
  console.log('  ID:', conv.id);
  console.log('  Title:', conv.title);
  console.log('  Created:', conv.created_at);
  console.log('  Metadata:', JSON.stringify(conv.metadata, null, 2));
  
  // Check for messages
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conv.id)
    .order('created_at', { ascending: true });
    
  console.log('\nMessages in this conversation:', messages?.length || 0);
  
  if (messages && messages.length > 0) {
    messages.forEach((msg, i) => {
      console.log(`\nMessage ${i + 1}:`);
      console.log('  ID:', msg.id);
      console.log('  Sender:', msg.sender);
      console.log('  Content preview:', msg.content?.substring(0, 100) + '...');
      console.log('  Metadata:', JSON.stringify(msg.metadata, null, 2));
    });
  }
  
  // Look for conversations with threadId in metadata
  console.log('\n📍 Checking for conversations with threadId in metadata:');
  console.log('─'.repeat(50));
  
  const { data: threadsInMetadata } = await supabase
    .from('conversations')
    .select('id, metadata')
    .not('metadata->threadId', 'is', null)
    .limit(5);
    
  if (threadsInMetadata && threadsInMetadata.length > 0) {
    console.log(`Found ${threadsInMetadata.length} conversations with threadId:`);
    threadsInMetadata.forEach(conv => {
      console.log(`  Conversation: ${conv.id}`);
      console.log(`  Thread ID: ${conv.metadata.threadId}`);
    });
  } else {
    console.log('No conversations found with threadId in metadata');
  }
  
  // Check if the conversation ID format is the issue
  console.log('\n📍 Analyzing ID formats:');
  console.log('─'.repeat(50));
  
  // Get a sample of conversation IDs
  const { data: sampleConvs } = await supabase
    .from('conversations')
    .select('id')
    .limit(5);
    
  console.log('Sample conversation IDs:');
  sampleConvs?.forEach(conv => {
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conv.id);
    console.log(`  ${conv.id} - Valid UUID: ${isValidUUID}`);
  });
}

debugThreadConversationMismatch().catch(console.error);