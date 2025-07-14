import dotenv from 'dotenv';
dotenv.config();

import { GeminiService } from './services/llm/providers/index.js';

console.log('⚡ Testing Gemini 2.5 Flash...');
console.log('=' .repeat(50));

async function testGemini25Flash() {
  try {
    console.log('\n🧪 Testing gemini-2.5-flash...');
    
    const service = new GeminiService('gemini-2.5-flash');
    service.initialize();
    
    const startTime = Date.now();
    const response = await service.chat([
      { role: 'user', content: 'Hello! Are you Gemini 2.5 Flash? Tell me about your speed and capabilities compared to other models.' }
    ], {});
    const duration = Date.now() - startTime;
    
    console.log(`✅ gemini-2.5-flash: SUCCESS!`);
    console.log(`   Response: "${response.content}"`);
    console.log(`   Tokens: ${response.usage.totalTokens}`);
    console.log(`   Cost: $${response.usage.cost.toFixed(6)}`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Speed: ${(response.usage.outputTokens / (duration / 1000)).toFixed(1)} tokens/sec`);
    
    return { status: 'success', duration, response: response.content, tokensPerSec: response.usage.outputTokens / (duration / 1000) };
    
  } catch (error) {
    console.log(`❌ gemini-2.5-flash: ${error.message}`);
    if (error.status) {
      console.log(`   Status: ${error.status}`);
    }
    return { status: 'failed', error: error.message };
  }
}

async function compareWithGemini15Flash() {
  try {
    console.log('\n🏃 Comparing with Gemini 1.5 Flash...');
    
    const service = new GeminiService('gemini-1.5-flash');
    service.initialize();
    
    const startTime = Date.now();
    const response = await service.chat([
      { role: 'user', content: 'Hello! Are you Gemini 1.5 Flash? Tell me about your speed and capabilities.' }
    ], {});
    const duration = Date.now() - startTime;
    
    console.log(`✅ gemini-1.5-flash: SUCCESS!`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Speed: ${(response.usage.outputTokens / (duration / 1000)).toFixed(1)} tokens/sec`);
    
    return { status: 'success', duration, tokensPerSec: response.usage.outputTokens / (duration / 1000) };
    
  } catch (error) {
    console.log(`❌ gemini-1.5-flash: ${error.message}`);
    return { status: 'failed', error: error.message };
  }
}

async function runTests() {
  console.log(`🔑 API Key: ${process.env.GOOGLE_AI_API_KEY ? `${process.env.GOOGLE_AI_API_KEY.substring(0, 20)}...` : 'Missing'}`);
  
  const result25 = await testGemini25Flash();
  const result15 = await compareWithGemini15Flash();
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 GEMINI FLASH COMPARISON');
  console.log('=' .repeat(50));
  
  if (result25.status === 'success') {
    console.log('🚀 Gemini 2.5 Flash:');
    console.log(`   ⚡ Speed: ${result25.tokensPerSec.toFixed(1)} tokens/sec`);
    console.log(`   ⏱️  Duration: ${result25.duration}ms`);
  }
  
  if (result15.status === 'success') {
    console.log('📈 Gemini 1.5 Flash:');
    console.log(`   ⚡ Speed: ${result15.tokensPerSec.toFixed(1)} tokens/sec`);
    console.log(`   ⏱️  Duration: ${result15.duration}ms`);
    
    if (result25.status === 'success') {
      const speedImprovement = ((result25.tokensPerSec - result15.tokensPerSec) / result15.tokensPerSec * 100);
      console.log(`\n🏆 Speed Improvement: ${speedImprovement > 0 ? '+' : ''}${speedImprovement.toFixed(1)}%`);
    }
  }
  
  console.log('\n✨ Key Gemini 2.5 Flash Features:');
  console.log('   • Ultra-fast response times');
  console.log('   • 1M+ token context window');
  console.log('   • Advanced multimodal capabilities');
  console.log('   • Thinking and reasoning');
  console.log('   • Cost-effective pricing');
  
  console.log('\n⚡ Gemini 2.5 Flash testing completed!');
}

runTests().catch(console.error);