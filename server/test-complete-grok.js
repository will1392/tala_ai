import dotenv from 'dotenv';
dotenv.config();

import { GrokService } from './services/llm/providers/index.js';

console.log('🔥 Testing ALL Grok Models (2 & 3)...');
console.log('=' .repeat(60));

const allGrokModels = [
  // Grok 2 models
  'grok-2-1212',
  'grok-2-latest', 
  'grok-2',
  // Grok 3 models
  'grok-3',
  'grok-3-latest',
  'grok-3-fast',
  'grok-3-mini',
  'grok-3-beta'
];

async function testModel(modelId) {
  try {
    console.log(`\n🧪 Testing ${modelId}...`);
    
    const service = new GrokService(modelId);
    service.initialize();
    
    const startTime = Date.now();
    const response = await service.chat([
      { role: 'user', content: `Hello! Which version of Grok are you? Tell me about your capabilities.` }
    ], { maxTokens: 100 });
    const duration = Date.now() - startTime;
    
    console.log(`✅ ${modelId}: SUCCESS!`);
    console.log(`   Response: "${response.content.substring(0, 120)}..."`);
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
  
  for (const modelId of allGrokModels) {
    const result = await testModel(modelId);
    results.push(result);
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('🔥 COMPLETE GROK MODEL TEST RESULTS');
  console.log('=' .repeat(60));
  
  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'failed');
  
  console.log(`🎯 Success Rate: ${successful.length}/${results.length} models`);
  
  // Group by version
  const grok2Models = successful.filter(r => r.model.includes('grok-2'));
  const grok3Models = successful.filter(r => r.model.includes('grok-3'));
  
  if (grok2Models.length > 0) {
    console.log('\n🚀 WORKING GROK 2 MODELS:');
    grok2Models.forEach(result => {
      console.log(`✅ ${result.model} - ${result.speed.toFixed(1)} tokens/sec - $${result.cost.toFixed(6)}`);
    });
  }
  
  if (grok3Models.length > 0) {
    console.log('\n🔥 WORKING GROK 3 MODELS:');
    grok3Models.forEach(result => {
      console.log(`✅ ${result.model} - ${result.speed.toFixed(1)} tokens/sec - $${result.cost.toFixed(6)}`);
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
    const cheapestModel = successful.reduce((prev, current) => (prev.cost < current.cost) ? prev : current);
    
    console.log('\n📈 GROK PERFORMANCE METRICS:');
    console.log(`   🏃 Average Speed: ${avgSpeed.toFixed(1)} tokens/sec`);
    console.log(`   💵 Average Cost: $${avgCost.toFixed(6)} per request`);
    console.log(`   🥇 Fastest Model: ${fastestModel.model} (${fastestModel.speed.toFixed(1)} tokens/sec)`);
    console.log(`   💎 Cheapest Model: ${cheapestModel.model} ($${cheapestModel.cost.toFixed(6)})`);
  }
  
  console.log('\n🎉 GROK MODEL PORTFOLIO:');
  console.log(`   🔥 Grok 3 Models: ${grok3Models.length} available`);
  console.log(`   🚀 Grok 2 Models: ${grok2Models.length} available`);
  console.log(`   🏆 Total Working: ${successful.length}/${results.length} models`);
  
  console.log('\n✨ Complete Grok testing finished!');
}

runTests().catch(console.error);