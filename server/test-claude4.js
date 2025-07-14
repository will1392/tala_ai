import dotenv from 'dotenv';
dotenv.config();

import { AnthropicService } from './services/llm/providers/index.js';

console.log('🧪 Testing Claude 4 Models...');
console.log('=' .repeat(40));

const claude4Models = [
  'claude-4-opus',
  'claude-4-sonnet'
];

async function testModel(modelId) {
  try {
    console.log(`\n🤖 Testing ${modelId}...`);
    
    const service = new AnthropicService(modelId);
    service.initialize();
    
    const startTime = Date.now();
    const response = await service.chat([
      { role: 'user', content: `Hello! I'm testing ${modelId}. Please confirm you're working by saying "Claude 4 is ready!"` }
    ], { maxTokens: 20 });
    const duration = Date.now() - startTime;
    
    console.log(`✅ ${modelId}: SUCCESS!`);
    console.log(`   Response: "${response.content}"`);
    console.log(`   Tokens: ${response.usage.totalTokens} (${response.usage.inputTokens}+${response.usage.outputTokens})`);
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
  console.log(`🔑 API Key: ${process.env.ANTHROPIC_API_KEY ? `${process.env.ANTHROPIC_API_KEY.substring(0, 20)}...` : 'Missing'}`);
  
  const results = {};
  
  for (const modelId of claude4Models) {
    results[modelId] = await testModel(modelId);
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n' + '=' .repeat(40));
  console.log('📊 CLAUDE 4 TEST RESULTS');
  console.log('=' .repeat(40));
  
  const successful = Object.values(results).filter(r => r.status === 'success').length;
  const total = Object.keys(results).length;
  
  console.log(`🎯 Success Rate: ${successful}/${total} models`);
  
  if (successful > 0) {
    console.log('\n✅ WORKING MODELS:');
    for (const [model, result] of Object.entries(results)) {
      if (result.status === 'success') {
        console.log(`✅ ${model}: ${result.duration}ms - "${result.response}"`);
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
  
  console.log('\n✨ Claude 4 testing completed!');
}

runTests().catch(console.error);