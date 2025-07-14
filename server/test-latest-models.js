import dotenv from 'dotenv';
dotenv.config();

import { 
  AnthropicService, 
  GeminiService, 
  OpenAIService, 
  GrokService 
} from './services/llm/providers/index.js';

console.log('🚀 TESTING LATEST AI MODELS');
console.log('=' .repeat(60));

const latestModels = [
  { service: AnthropicService, model: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
  { service: AnthropicService, model: 'claude-opus-4-20250514', name: 'Claude Opus 4' },
  { service: GeminiService, model: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { service: GeminiService, model: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { service: OpenAIService, model: 'gpt-4o-mini', name: 'GPT-4o Mini' },
  { service: GrokService, model: 'grok-2-1212', name: 'Grok 2.0' }
];

async function testModel(serviceClass, modelId, modelName) {
  try {
    console.log(`\n🧪 Testing ${modelName} (${modelId})...`);
    
    const service = new serviceClass(modelId);
    service.initialize();
    
    const startTime = Date.now();
    const response = await service.chat([
      { role: 'user', content: `Hello! Please confirm you are ${modelName} and briefly describe your key capabilities.` }
    ], { maxTokens: 150 });
    const duration = Date.now() - startTime;
    
    console.log(`✅ ${modelName}: SUCCESS!`);
    console.log(`   Response: "${response.content.substring(0, 100)}..."`);
    console.log(`   Tokens: ${response.usage.totalTokens}`);
    console.log(`   Cost: $${response.usage.cost.toFixed(6)}`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Speed: ${(response.usage.outputTokens / (duration / 1000)).toFixed(1)} tokens/sec`);
    
    return { 
      status: 'success', 
      model: modelName, 
      duration, 
      cost: response.usage.cost,
      speed: response.usage.outputTokens / (duration / 1000),
      tokens: response.usage.totalTokens
    };
    
  } catch (error) {
    console.log(`❌ ${modelName}: ${error.message}`);
    return { status: 'failed', model: modelName, error: error.message };
  }
}

async function runTests() {
  console.log(`🔑 Testing with API keys configured...`);
  
  const results = [];
  
  for (const { service, model, name } of latestModels) {
    const result = await testModel(service, model, name);
    results.push(result);
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 LATEST AI MODELS TEST RESULTS');
  console.log('=' .repeat(60));
  
  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'failed');
  
  console.log(`🎯 Success Rate: ${successful.length}/${results.length} models working`);
  
  if (successful.length > 0) {
    console.log('\n🚀 WORKING LATEST MODELS:');
    successful
      .sort((a, b) => a.speed - b.speed)
      .forEach(result => {
        console.log(`✅ ${result.model}`);
        console.log(`   ⚡ Speed: ${result.speed.toFixed(1)} tokens/sec`);
        console.log(`   ⏱️  Duration: ${result.duration}ms`);
        console.log(`   💰 Cost: $${result.cost.toFixed(6)}`);
        console.log(`   🔢 Tokens: ${result.tokens}`);
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
    
    console.log('\n📈 PERFORMANCE METRICS:');
    console.log(`   🏃 Average Speed: ${avgSpeed.toFixed(1)} tokens/sec`);
    console.log(`   💵 Average Cost: $${avgCost.toFixed(6)} per request`);
    console.log(`   🥇 Fastest Model: ${fastestModel.model} (${fastestModel.speed.toFixed(1)} tokens/sec)`);
    console.log(`   💎 Cheapest Model: ${cheapestModel.model} ($${cheapestModel.cost.toFixed(6)})`);
  }
  
  console.log('\n🎉 TALA AI MODEL PORTFOLIO:');
  console.log('   🤖 Claude 4 (Sonnet & Opus) - Advanced reasoning');
  console.log('   ⚡ Gemini 2.5 (Pro & Flash) - Multimodal with thinking');
  console.log('   🚀 GPT-4o Mini - Fast and cost-effective');
  console.log('   🔥 Grok 2.0 - Real-time intelligence');
  
  console.log('\n✨ Latest AI models testing completed!');
  console.log('🏆 Tala AI now has access to the most advanced AI models available!');
}

runTests().catch(console.error);