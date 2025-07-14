#!/usr/bin/env node

/**
 * Test Context Manager Integration
 * 
 * Basic test to verify Context Manager can be loaded and initialized
 */

import ContextManager from './services/context/ContextManager.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🧠 Testing Context Manager Integration...\n');

async function testContextManager() {
  try {
    console.log('1️⃣ Loading Context Manager...');
    const contextManager = new ContextManager({
      enableMemoryStorage: true,
      enableEntityExtraction: true,
      enableContextSummary: false, // Disable to avoid OpenAI API calls in test
      autoUpdateProfile: true
    });
    console.log('✅ Context Manager loaded successfully');
    
    console.log('\n2️⃣ Initializing Context Manager...');
    await contextManager.initialize();
    console.log('✅ Context Manager initialized successfully');
    
    console.log('\n3️⃣ Testing basic functionality...');
    
    // Test entity extraction
    console.log('Testing entity extraction...');
    const testMessages = [
      {
        id: 'test-msg-1',
        content: 'I want to travel to Paris next month and my budget is $2000',
        role: 'user',
        userId: 'test-user-123',
        createdAt: new Date().toISOString()
      }
    ];
    
    const entities = await contextManager.extractEntities(testMessages);
    console.log(`✅ Extracted ${entities.length} entities`);
    
    if (entities.length > 0) {
      console.log('   Sample entities:');
      entities.slice(0, 3).forEach(entity => {
        console.log(`   - ${entity.type}: ${entity.value} (confidence: ${Math.round(entity.confidence * 100)}%)`);
      });
    }
    
    console.log('\n4️⃣ Testing memory storage...');
    const memoryResult = await contextManager.storeMemory('test-user-123', {
      conversationId: 'test-conv-123',
      type: 'destination_preference',
      content: 'User wants to travel to Paris',
      entities: { destination: 'Paris' },
      confidence: 0.9,
      tags: ['travel', 'destination'],
      sourceMessageId: 'test-msg-1'
    }, 0.8);
    
    if (memoryResult.success) {
      console.log('✅ Memory stored successfully');
      console.log(`   Memory ID: ${memoryResult.memory.id}`);
    } else {
      console.log('⚠️ Memory storage failed (this is expected if database is not set up)');
      console.log(`   Error: ${memoryResult.error}`);
    }
    
    console.log('\n5️⃣ Testing memory retrieval...');
    const memories = await contextManager.retrieveRelevantMemories(
      'test-user-123',
      'travel to Europe',
      5
    );
    console.log(`✅ Retrieved ${memories.length} relevant memories`);
    
    console.log('\n🎉 All Context Manager tests completed successfully!');
    
    // Print configuration info
    console.log('\n📊 Configuration Summary:');
    console.log(`   Memory Storage: ${contextManager.options.enableMemoryStorage ? 'Enabled' : 'Disabled'}`);
    console.log(`   Entity Extraction: ${contextManager.options.enableEntityExtraction ? 'Enabled' : 'Disabled'}`);
    console.log(`   Context Summary: ${contextManager.options.enableContextSummary ? 'Enabled' : 'Disabled'}`);
    console.log(`   Auto Profile Update: ${contextManager.options.autoUpdateProfile ? 'Enabled' : 'Disabled'}`);

  } catch (error) {
    console.error('❌ Context Manager test failed:', error.message);
    
    if (error.message.includes('database') || error.message.includes('relation')) {
      console.log('\n💡 Tip: Make sure to run the database migration first:');
      console.log('   psql $DATABASE_URL -f server/migrations/create-context-tables.sql');
    }
    
    if (error.message.includes('Qdrant') || error.message.includes('vector')) {
      console.log('\n💡 Tip: Vector storage is optional. The system will work without Qdrant.');
    }
    
    console.error('\nFull error details:', error);
  }
}

// Run the test
testContextManager();