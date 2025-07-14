import dotenv from 'dotenv';
dotenv.config();

import { GrokService } from './services/llm/providers/index.js';

console.log('🔥 Testing All Available Grok Models...');
console.log('=' .repeat(60));

const availableGrokModels = [
  'grok-2-1212',
  'grok-2-latest', 
  'grok-2'
];

async function testModel(modelId) {
  try {
    console.log(`\n🧪 Testing ${modelId}...`);
    
    const service = new GrokService(modelId);
    service.initialize();
    
    const startTime = Date.now();
    const response = await service.chat([
      { role: 'user', content: `Hello! Please tell me what version of Grok you are and your key capabilities.` }
    ], { maxTokens: 100 });
    const duration = Date.now() - startTime;
    
    console.log(`✅ ${modelId}: SUCCESS!`);
    console.log(`   Response: "${response.content}"`);
    console.log(`   Tokens: ${response.usage.totalTokens}`);
    console.log(`   Cost: $${response.usage.cost.toFixed(6)}`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Speed: ${(response.usage.outputTokens / (duration / 1000)).toFixed(1)} tokens/sec`);
    
    return { 
      status: 'success', 
      model: modelId, 
      duration, 
      cost: response.usage.cost,
      speed: response.usage.outputTokens / (duration / 1000),
      tokens: response.usage.totalTokens,
      response: response.content
    };
    
  } catch (error) {
    console.log(`❌ ${modelId}: ${error.message}`);
    return { status: 'failed', model: modelId, error: error.message };
  }
}

async function runTests() {
  console.log(`🔑 API Key: ${process.env.GROK_API_KEY ? `${process.env.GROK_API_KEY.substring(0, 20)}...` : 'Missing'}`);
  
  const results = [];
  
  for (const modelId of availableGrokModels) {
    const result = await testModel(modelId);
    results.push(result);
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('🔥 ALL GROK MODELS TEST RESULTS');
  console.log('=' .repeat(60));
  
  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'failed');
  
  console.log(`🎯 Success Rate: ${successful.length}/${results.length} models`);
  
  if (successful.length > 0) {
    console.log('\n🚀 WORKING GROK MODELS:');
    successful.forEach(result => {
      console.log(`✅ ${result.model}`);
      console.log(`   ⚡ Speed: ${result.speed.toFixed(1)} tokens/sec`);
      console.log(`   ⏱️  Duration: ${result.duration}ms`);
      console.log(`   💰 Cost: $${result.cost.toFixed(6)}`);
      console.log(`   🔢 Tokens: ${result.tokens}`);
      console.log(`   💬 Response: "${result.response.substring(0, 100)}..."`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ FAILED MODELS:');
    failed.forEach(result => {
      console.log(`❌ ${result.model}: ${result.error}`);
    });
  }

  if (successful.length > 0) {
    const avgSpeed = successful.reduce((sum, r) => sum + r.speed, 0) / successful.length;
    const avgCost = successful.reduce((sum, r) => sum + r.cost, 0) / successful.length;
    const fastestModel = successful.reduce((prev, current) => (prev.speed > current.speed) ? prev : current);
    
    console.log('\n📈 GROK PERFORMANCE METRICS:');
    console.log(`   🏃 Average Speed: ${avgSpeed.toFixed(1)} tokens/sec`);
    console.log(`   💵 Average Cost: $${avgCost.toFixed(6)} per request`);
    console.log(`   🥇 Fastest Model: ${fastestModel.model} (${fastestModel.speed.toFixed(1)} tokens/sec)`);
  }
  
  console.log('\n✨ All Grok models testing completed!');
  console.log(`🏆 Available Grok Models: ${successful.length}`);
}

runTests().catch(console.error);