#!/usr/bin/env node

import ContextCompressor from './services/context/ContextCompressor.js';

async function quickTest() {
  try {
    // Create test messages
    const testMessages = Array(100).fill(null).map((_, i) => ({
      id: `msg-${i}`,
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Test message ${i}: Planning a trip to ${['Paris', 'Rome', 'Tokyo'][i % 3]} in ${['June', 'July', 'August'][i % 3]}. Budget is $${1000 + i * 50}.`,
      created_at: new Date(Date.now() - (100 - i) * 60000).toISOString()
    }));
    
    console.log('🧪 Quick Compression Test\n');
    console.log('Original messages:', testMessages.length);
    
    // Initialize compressor
    const compressor = new ContextCompressor();
    await compressor.initialize();
    
    // Test compression
    const result = await compressor.compressContext(testMessages, 4000);
    
    if (result.success) {
      console.log('\n✅ Compression Results:');
      console.log('Compressed messages:', result.compressed ? result.compressedCount : result.messages.length);
      console.log('Strategy used:', result.strategy);
      console.log('Token reduction:', result.compressed ? `${Math.round((1 - result.compressionRatio) * 100)}%` : 'No compression needed');
      console.log('Has summary:', result.summary ? 'Yes' : 'No');
      
      if (result.compressed) {
        console.log('\n📊 Compression Details:');
        console.log(`Original: ${result.originalCount} messages`);
        console.log(`Compressed: ${result.compressedCount} messages`);
        console.log(`Dropped: ${result.droppedMessages.length} messages`);
      }
    } else {
      console.log('❌ Compression failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

quickTest();