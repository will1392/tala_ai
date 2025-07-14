import dotenv from 'dotenv';
dotenv.config();

import { GeminiService } from './services/llm/providers/index.js';

console.log('🚀 Testing Gemini 2.5 Pro...');
console.log('=' .repeat(50));

async function testGemini25() {
  try {
    console.log('\n🧪 Testing gemini-2.5-pro...');
    
    const service = new GeminiService('gemini-2.5-pro');
    service.initialize();
    
    const startTime = Date.now();
    const response = await service.chat([
      { role: 'user', content: 'Hello! Are you Gemini 2.5 Pro? Tell me briefly about your capabilities.' }
    ], {});
    const duration = Date.now() - startTime;
    
    console.log(`✅ gemini-2.5-pro: SUCCESS!`);
    console.log(`   Response: "${response.content}"`);
    console.log(`   Response length: ${response.content.length} chars`);
    console.log(`   Full response object:`, JSON.stringify(response, null, 2));
    console.log(`   Tokens: ${response.usage.totalTokens} (estimated)`);
    console.log(`   Cost: $${response.usage.cost.toFixed(6)}`);
    console.log(`   Duration: ${duration}ms`);
    
    return { status: 'success', duration, response: response.content };
    
  } catch (error) {
    console.log(`❌ gemini-2.5-pro: ${error.message}`);
    if (error.status) {
      console.log(`   Status: ${error.status}`);
    }
    return { status: 'failed', error: error.message };
  }
}

async function runTest() {
  console.log(`🔑 API Key: ${process.env.GOOGLE_AI_API_KEY ? `${process.env.GOOGLE_AI_API_KEY.substring(0, 20)}...` : 'Missing'}`);
  
  const result = await testGemini25();
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 GEMINI 2.5 PRO TEST RESULTS');
  console.log('=' .repeat(50));
  
  if (result.status === 'success') {
    console.log('🎉 SUCCESS: Gemini 2.5 Pro is working!');
    console.log(`⚡ Performance: ${result.duration}ms`);
    console.log(`💡 Response: "${result.response.substring(0, 150)}..."`);
    console.log('\n✨ Key Features Available:');
    console.log('   • 1M+ token context window');
    console.log('   • Advanced multimodal understanding');
    console.log('   • Thinking capabilities');
    console.log('   • Code execution');
    console.log('   • Search grounding');
  } else {
    console.log('❌ FAILED: Gemini 2.5 Pro not accessible');
    console.log(`   Error: ${result.error}`);
  }
  
  console.log('\n🚀 Gemini 2.5 Pro testing completed!');
}

runTest().catch(console.error);