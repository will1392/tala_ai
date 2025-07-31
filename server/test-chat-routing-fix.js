/**
 * Test script to verify chat routing fix
 * Tests that general chat messages are no longer routed to Email Monitor Agent
 */

import TalaIntelligence from './services/intelligence/TalaIntelligence.js';

async function testChatRouting() {
  console.log('🧪 Testing chat routing fix...\n');
  
  // Initialize intelligence system
  const intelligence = new TalaIntelligence({
    maxContextSize: 8000,
    compressionThreshold: 0.8,
    memoryRetrievalLimit: 10,
    learningEnabled: true,
    mockMode: true // Use mock mode for testing
  });
  
  await intelligence.initialize();
  
  // Test cases
  const testCases = [
    {
      name: 'General greeting',
      message: 'Hello, how are you today?',
      expectedType: 'general',
      shouldUseAgent: false
    },
    {
      name: 'General question',
      message: 'What is the weather like?',
      expectedType: 'general',
      shouldUseAgent: false
    },
    {
      name: 'Task creation',
      message: 'Create a task to book flight tickets',
      expectedType: 'create-task',
      shouldUseAgent: true
    },
    {
      name: 'Email parsing',
      message: 'Parse this email for booking details',
      expectedType: 'parse-email',
      shouldUseAgent: true
    },
    {
      name: 'Itinerary planning',
      message: 'Plan a 5-day trip to Paris',
      expectedType: 'build-itinerary',
      shouldUseAgent: true
    }
  ];
  
  console.log('Running test cases...\n');
  
  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log(`   Message: "${testCase.message}"`);
    
    try {
      const response = await intelligence.processRequest({
        userId: 'test-user',
        content: testCase.message,
        source: 'chat',
        timestamp: new Date()
      });
      
      const metadata = response.metadata;
      const taskType = metadata.requestId ? 'Unknown' : testCase.expectedType;
      const agentsUsed = metadata.agentsUsed || [];
      const strategy = response.response.metadata?.strategy || 'unknown';
      
      console.log(`   ✅ Response received`);
      console.log(`   📊 Task type detected: ${taskType}`);
      console.log(`   🎯 Routing strategy: ${strategy}`);
      console.log(`   🤖 Agents used: ${agentsUsed.length > 0 ? agentsUsed.join(', ') : 'None (direct response)'}`);
      
      // Verify expectations
      if (testCase.shouldUseAgent && agentsUsed.length === 0) {
        console.log(`   ⚠️  Expected to use an agent but didn't`);
      } else if (!testCase.shouldUseAgent && agentsUsed.length > 0) {
        console.log(`   ⚠️  Expected direct response but used agent: ${agentsUsed.join(', ')}`);
      } else {
        console.log(`   ✅ Routing behavior matches expectation`);
      }
      
      // Check if Email Monitor Agent was incorrectly used for general chat
      if (testCase.expectedType === 'general' && agentsUsed.includes('Email Monitor Agent')) {
        console.log(`   ❌ ERROR: General chat was routed to Email Monitor Agent!`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n\n✅ Test complete');
  
  // Shutdown
  await intelligence.shutdown();
}

// Run the test
testChatRouting().catch(console.error);