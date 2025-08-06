/**
 * Test ThreadingService directly
 */

import TalaIntelligence from './services/intelligence/TalaIntelligence.js';

async function testThreadingService() {
  console.log('🧪 Testing ThreadingService Directly\n');
  console.log('=' . repeat(80));
  
  // Initialize intelligence system
  const intelligence = new TalaIntelligence({
    maxContextSize: 8000,
    compressionThreshold: 0.8,
    memoryRetrievalLimit: 10,
    learningEnabled: true,
    mockMode: false
  });
  
  try {
    await intelligence.initialize();
    console.log('✅ Intelligence system initialized');
    
    const testConvId = 'test_thread_' + Date.now();
    const testUserId = 'test_user_' + Date.now();
    
    console.log(`\n📝 Test Conversation ID: ${testConvId}`);
    console.log(`👤 Test User ID: ${testUserId}`);
    
    // Add test messages
    console.log('\n📌 Adding Test Messages');
    console.log('-'.repeat(80));
    
    await intelligence.threadingService.addMessage(testConvId, {
      sender: 'user',
      content: 'Hello, tell me about Greece',
      timestamp: new Date(),
      metadata: { userId: testUserId }
    });
    console.log('✅ Added user message');
    
    await intelligence.threadingService.addMessage(testConvId, {
      sender: 'assistant',
      content: 'Greece is a wonderful destination...',
      timestamp: new Date(),
      metadata: { model: 'test' }
    });
    console.log('✅ Added assistant message');
    
    // Retrieve messages
    console.log('\n📚 Retrieving Messages');
    console.log('-'.repeat(80));
    
    const messages = await intelligence.threadingService.getThreadMessages(
      testConvId,
      { limit: 10 }
    );
    
    console.log(`\n✅ Retrieved ${messages?.length || 0} messages`);
    
    if (messages && messages.length > 0) {
      messages.forEach((msg, i) => {
        console.log(`${i + 1}. [${msg.sender}] ${msg.content}`);
        console.log(`   Timestamp: ${msg.timestamp}`);
      });
    } else {
      console.log('❌ No messages found!');
    }
    
    // Test conversation summary
    console.log('\n📊 Testing Conversation Summary');
    console.log('-'.repeat(80));
    
    const summary = await intelligence.threadingService.getConversationSummary(testConvId);
    console.log('Summary:', summary || 'No summary available');
    
    // Shutdown
    await intelligence.shutdown();
    console.log('\n✅ Test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testThreadingService().catch(console.error);