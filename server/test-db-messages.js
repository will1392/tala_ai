/**
 * Test Database Message Storage
 * 
 * This script verifies that messages are actually being stored in the database
 */

import { ConversationService } from './services/db/conversationService.js';

async function testDatabaseMessages() {
  console.log('🧪 Testing Database Message Storage...\n');
  
  const conversationService = new ConversationService();
  
  try {
    // List recent conversations
    const conversationsResult = await conversationService.getRecentConversations('3ecec9f4-0d93-4ffa-a173-3531c524f96c', {
      pagination: { page: 1, pageSize: 5 }
    });
    
    console.log('📋 Recent conversations:');
    console.log(`Found ${conversationsResult.data?.length || 0} conversations`);
    
    if (conversationsResult.success && conversationsResult.data.length > 0) {
      // Check the first conversation
      const firstConv = conversationsResult.data[0];
      console.log('\n📍 Checking conversation:', firstConv.id);
      console.log('Title:', firstConv.title);
      console.log('Created:', firstConv.created_at);
      
      // Try to get messages for this conversation
      const messagesResult = await conversationService.getMessages(firstConv.id);
      
      if (messagesResult.success) {
        console.log(`\n💬 Messages in conversation: ${messagesResult.data.length}`);
        messagesResult.data.forEach((msg, index) => {
          console.log(`  ${index + 1}. [${msg.sender}]: ${msg.content.substring(0, 50)}...`);
        });
      } else {
        console.error('❌ Failed to get messages:', messagesResult.error);
      }
      
      // Check if messages table exists
      const { getSupabaseService } = await import('./db/supabaseClient.js');
      const supabase = getSupabaseService();
      
      // Try to query messages table directly
      const { data: directMessages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', firstConv.id)
        .limit(5);
        
      if (error) {
        console.error('\n❌ Direct query error:', error);
      } else {
        console.log(`\n✅ Direct query found ${directMessages?.length || 0} messages`);
      }
      
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testDatabaseMessages().catch(console.error);