/**
 * Debug Conversation Storage
 * 
 * Check if messages are being properly saved and retrieved
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';

async function debugConversationStorage() {
  console.log('🔍 Debugging Conversation Storage\n');
  console.log('=' . repeat(80));
  
  const conversationId = 'debug_conv_' + Date.now();
  const userId = 'debug-user-' + Date.now();
  
  console.log(`📝 Conversation ID: ${conversationId}`);
  console.log(`👤 User ID: ${userId}\n`);
  
  // Send first message
  console.log('📌 Sending First Message');
  console.log('-'.repeat(80));
  
  const message1 = "Tell me about Greece";
  
  const response1 = await fetch(`${API_URL}/api/chat/v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId
    },
    body: JSON.stringify({
      message: message1,
      conversationId: conversationId,
      mode: 'travel',
      searchKnowledge: true
    })
  });
  
  const data1 = await response1.json();
  
  if (data1.success) {
    console.log('✅ First message sent');
    console.log('Response preview:', data1.response?.substring(0, 100) + '...');
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Try to retrieve conversation history
    console.log('\n📚 Retrieving Conversation History');
    console.log('-'.repeat(80));
    
    const historyResponse = await fetch(`${API_URL}/api/chat/history?conversationId=${conversationId}`, {
      method: 'GET',
      headers: {
        'x-user-id': userId
      }
    });
    
    const historyData = await historyResponse.json();
    
    if (historyData.success) {
      console.log(`\n✅ Retrieved ${historyData.messages?.length || 0} messages`);
      
      if (historyData.messages?.length > 0) {
        console.log('\nMessages found:');
        historyData.messages.forEach((msg, i) => {
          console.log(`${i + 1}. [${msg.sender}] ${msg.content?.substring(0, 80)}...`);
          console.log(`   Timestamp: ${msg.timestamp}`);
          console.log(`   Thread ID: ${msg.threadId || 'N/A'}`);
        });
      } else {
        console.log('❌ No messages found in history!');
      }
      
      if (historyData.memories?.length > 0) {
        console.log('\n📝 Memories found:');
        historyData.memories.forEach((mem, i) => {
          console.log(`${i + 1}. ${mem.content?.substring(0, 80)}...`);
          console.log(`   Importance: ${mem.importance}`);
        });
      }
    } else {
      console.log('❌ Failed to retrieve history:', historyData.error);
    }
    
    // Send second message to test context
    console.log('\n📌 Sending Second Message');
    console.log('-'.repeat(80));
    
    const message2 = "What did I just ask about?";
    
    const response2 = await fetch(`${API_URL}/api/chat/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId
      },
      body: JSON.stringify({
        message: message2,
        conversationId: conversationId,
        mode: 'travel',
        searchKnowledge: true
      })
    });
    
    const data2 = await response2.json();
    
    if (data2.success) {
      console.log('✅ Second message sent');
      
      // Check if response acknowledges previous context
      const acknowledgesContext = data2.response?.toLowerCase().includes('greece') ||
                                 data2.response?.toLowerCase().includes('asked about');
      
      console.log('\n📊 Context Check:');
      console.log('Response acknowledges previous query:', acknowledgesContext ? '✅' : '❌');
      console.log('\nResponse:', data2.response?.substring(0, 200) + '...');
      
      // Check metadata for conversation context
      if (data2.metadata) {
        console.log('\n📋 Response Metadata:');
        console.log('Has conversation context:', data2.metadata.hasConversationContext || false);
        console.log('Sources used:', data2.metadata.sourcesUsed?.length || 0);
      }
    }
    
  } else {
    console.log('❌ First message failed:', data1.error);
  }
  
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 STORAGE DEBUG SUMMARY');
  console.log('='.repeat(80));
  console.log('\nKey Findings:');
  console.log('1. Check if messages are being stored in ThreadingService');
  console.log('2. Verify conversation history is retrieved in simple flow');
  console.log('3. Ensure conversation context is included in prompts');
}

debugConversationStorage().catch(console.error);