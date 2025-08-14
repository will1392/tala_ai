/**
 * Test Direct Database Creation
 * 
 * This script tests creating conversations directly in the database
 */

import { ConversationService } from './services/db/conversationService.js';
import { v4 as uuidv4 } from 'uuid';

async function testDirectCreate() {
  console.log('🧪 Testing Direct Database Creation...\n');
  
  const conversationService = new ConversationService();
  
  try {
    // Create a conversation directly
    const conversationId = uuidv4();
    console.log('📍 Creating conversation with ID:', conversationId);
    
    const result = await conversationService.createConversation({
      id: conversationId,
      organization_id: 'b3ecf30a-0a5f-48c9-a7d6-0f4a4f5e1234', // Default org
      user_id: '3ecec9f4-0d93-4ffa-a173-3531c524f96c', // Admin user UUID
      title: 'Test Direct Creation',
      metadata: {
        test: true,
        createdAt: new Date().toISOString()
      }
    });
    
    console.log('\n✅ Create result:');
    console.log('  - Success:', result.success);
    if (result.success) {
      console.log('  - ID:', result.data.id);
      console.log('  - Title:', result.data.title);
    } else {
      console.log('  - Error:', result.error);
    }
    
    // Try to retrieve it
    if (result.success) {
      console.log('\n📍 Retrieving conversation...');
      const getResult = await conversationService.getConversation(conversationId);
      
      console.log('✅ Retrieve result:');
      console.log('  - Success:', getResult.success);
      if (getResult.success) {
        console.log('  - Found:', getResult.data.title);
      } else {
        console.log('  - Error:', getResult.error);
      }
      
      // Add a message
      console.log('\n📍 Adding message...');
      const msgResult = await conversationService.addMessage({
        conversation_id: conversationId,
        role: 'user',
        content: 'Test message'
      });
      
      console.log('✅ Message result:');
      console.log('  - Success:', msgResult.success);
      if (!msgResult.success) {
        console.log('  - Error:', msgResult.error);
      }
      
      // Get messages
      console.log('\n📍 Getting messages...');
      const msgsResult = await conversationService.getMessages(conversationId);
      
      console.log('✅ Messages result:');
      console.log('  - Success:', msgsResult.success);
      console.log('  - Count:', msgsResult.data?.length || 0);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testDirectCreate().catch(console.error);