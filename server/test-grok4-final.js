import dotenv from 'dotenv';
dotenv.config();

import { GrokService } from './services/llm/providers/index.js';

console.log('🚀 Testing Grok 4 (Correct Model Name)...');
console.log('=' .repeat(50));

async function testGrok4() {
  try {
    console.log('\n🔥 Testing grok-4...');
    
    const service = new GrokService('grok-4');
    service.initialize();
    
    const startTime = Date.now();
    const response = await service.chat([
      { role: 'user', content: 'Hello! Please confirm you are Grok 4 and tell me about your enhanced reasoning capabilities.' }
    ], { maxTokens: 150 });
    const duration = Date.now() - startTime;
    
    console.log(`✅ grok-4: SUCCESS!`);
    console.log(`   Response: "${response.content}"`);
    console.log(`   Tokens: ${response.usage.totalTokens}`);
    console.log(`   Cost: $${response.usage.cost.toFixed(6)}`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Speed: ${(response.usage.outputTokens / (duration / 1000)).toFixed(1)} tokens/sec`);
    
    return { status: 'success', duration, response: response.content };
    
  } catch (error) {
    console.log(`❌ grok-4: ${error.message}`);
    return { status: 'failed', error: error.message };
  }
}

async function runTest() {
  console.log(`🔑 API Key: ${process.env.GROK_API_KEY ? `${process.env.GROK_API_KEY.substring(0, 20)}...` : 'Missing'}`);
  
  const result = await testGrok4();
  
  console.log('\n' + '=' .repeat(50));
  console.log('🔥 GROK 4 TEST RESULTS');
  console.log('=' .repeat(50));
  
  if (result.status === 'success') {
    console.log('🎉 SUCCESS: Grok 4 is working!');
    console.log(`⚡ Performance: ${result.duration}ms`);
    console.log(`💡 Response: "${result.response.substring(0, 150)}..."`);
    console.log('\n✨ Grok 4 Features:');
    console.log('   • Enhanced reasoning capabilities');
    console.log('   • 128K token context window');
    console.log('   • Improved instruction following');
    console.log('   • Better performance on complex tasks');
  } else {
    console.log('❌ FAILED: Grok 4 not accessible');
    console.log(`   Error: ${result.error}`);
  }
  
  console.log('\n🔥 Grok 4 testing completed!');
}

runTest().catch(console.error);