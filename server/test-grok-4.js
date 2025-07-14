import dotenv from 'dotenv';
dotenv.config();

import { GrokService } from './services/llm/providers/index.js';

console.log('🔥 Testing Grok 4 Models...');
console.log('=' .repeat(50));

const grok4Models = [
  'grok-4',
  'grok-4-0709',
  'grok-3',
  'grok-3-fast'
];

async function testModel(modelId) {
  try {
    console.log(`\n🧪 Testing ${modelId}...`);
    
    const service = new GrokService(modelId);
    service.initialize();
    
    const startTime = Date.now();
    const response = await service.chat([
      { role: 'user', content: `Hello! Please confirm you are ${modelId} and tell me about your capabilities.` }
    ], { maxTokens: 100 });
    const duration = Date.now() - startTime;
    
    console.log(`✅ ${modelId}: SUCCESS!`);
    console.log(`   Response: "${response.content}"`);
    console.log(`   Tokens: ${response.usage.totalTokens}`);
    console.log(`   Cost: $${response.usage.cost.toFixed(6)}`);
    console.log(`   Duration: ${duration}ms`);
    
    return { status: 'success', model: modelId, duration, response: response.content };
    
  } catch (error) {
    console.log(`❌ ${modelId}: ${error.message}`);
    if (error.status) {
      console.log(`   Status: ${error.status}`);
    }
    return { status: 'failed', model: modelId, error: error.message };
  }
}

async function runTests() {
  console.log(`🔑 API Key: ${process.env.GROK_API_KEY ? `${process.env.GROK_API_KEY.substring(0, 20)}...` : 'Missing'}`);
  
  const results = {};
  
  for (const modelId of grok4Models) {
    results[modelId] = await testModel(modelId);
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('🔥 GROK 4 TEST RESULTS');
  console.log('=' .repeat(50));
  
  const successful = Object.values(results).filter(r => r.status === 'success').length;
  const total = Object.keys(results).length;
  
  console.log(`🎯 Success Rate: ${successful}/${total} models`);
  
  if (successful > 0) {
    console.log('\n✅ WORKING GROK MODELS:');
    for (const [model, result] of Object.entries(results)) {
      if (result.status === 'success') {
        console.log(`✅ ${model}: ${result.duration}ms`);
        console.log(`   "${result.response.substring(0, 100)}..."`);
      }
    }
  }
  
  if (successful < total) {
    console.log('\n❌ FAILED MODELS:');
    for (const [model, result] of Object.entries(results)) {
      if (result.status === 'failed') {
        console.log(`❌ ${model}: ${result.error}`);
      }
    }
  }
  
  console.log('\n✨ Grok testing completed!');
  
  if (successful > 0) {
    console.log('🎉 Grok models are working!');
  }
}

runTests().catch(console.error);