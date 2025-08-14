#!/usr/bin/env node

/**
 * Direct test of ThreadingService without going through HTTP
 */

import ThreadingServiceHybrid from './services/conversations/ThreadingServiceHybrid.js';

async function testDirectThreading() {
  console.log('🧪 Direct ThreadingService Test\n');
  console.log('=' .repeat(60) + '\n');
  
  const threadingService = new ThreadingServiceHybrid();
  await threadingService.initialize();
  
  console.log('\n1️⃣ Creating thread directly...');
  const thread = await threadingService.createThread({
    userId: 'admin-1',
    organizationId: 'default',
    title: 'Direct Test Thread',
    metadata: { test: true }
  });
  
  console.log('✅ Created thread:', thread.id);
  
  console.log('\n2️⃣ Adding messages...');
  await threadingService.addMessage(thread.id, {
    role: 'user',
    content: 'First message from user'
  });
  console.log('✅ Added user message');
  
  await threadingService.addMessage(thread.id, {
    role: 'assistant',
    content: 'Response from assistant'
  });
  console.log('✅ Added assistant message');
  
  console.log('\n3️⃣ Retrieving messages...');
  const messages = await threadingService.getThreadMessages(thread.id);
  console.log(`✅ Found ${messages.length} messages:`);
  messages.forEach((msg, i) => {
    console.log(`   ${i + 1}. [${msg.role}]: ${msg.content}`);
  });
  
  console.log('\n4️⃣ Getting user threads...');
  const threads = await threadingService.getUserThreads('admin-1');
  console.log(`✅ Found ${threads.length} threads for admin-1`);
  
  console.log('\n' + '=' .repeat(60));
  console.log('✨ Direct test complete!');
  console.log('\nIf this works but HTTP doesn\'t, the issue is in the routes.');
  console.log('If this fails, the issue is in ThreadingService itself.');
}

testDirectThreading().then(() => {
  console.log('\n✅ ThreadingService is working correctly!');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ ThreadingService test failed:', error);
  console.error(error.stack);
  process.exit(1);
});