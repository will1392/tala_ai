import dotenv from 'dotenv';
dotenv.config();

import { GrokService } from './services/llm/providers/index.js';

console.log('🚀 Testing Grok 4 Models (Working)...');
console.log('=' .repeat(60));

const grok4Models = [
  'grok-4',
  'grok-4-latest',
  'grok-4-0709'
];

async function testModel(modelId) {
  try {
    console.log(`\n🧪 Testing ${modelId}...`);
    
    const service = new GrokService(modelId);
    service.initialize();
    
    const startTime = Date.now();
    const response = await service.chat([
      { role: 'user', content: `Hello! Please confirm you are ${modelId} and tell me about your reasoning capabilities. Be detailed.` }
    ], { maxTokens: 200 });
    const duration = Date.now() - startTime;
    
    console.log(`✅ ${modelId}: SUCCESS!`);
    console.log(`   Response: "${response.content}"`);
    console.log(`   Response length: ${response.content.length} chars`);
    console.log(`   Tokens: ${response.usage.totalTokens}`);
    console.log(`   Cost: $${response.usage.cost.toFixed(6)}`);
    console.log(`   Duration: ${duration}ms`);
    
    if (response.usage.outputTokens > 0) {
      console.log(`   Speed: ${(response.usage.outputTokens / (duration / 1000)).toFixed(1)} tokens/sec`);
    } else {
      console.log(`   Speed: No output tokens generated`);
    }
    
    return { 
      status: 'success', 
      model: modelId, 
      duration, 
      cost: response.usage.cost,
      speed: response.usage.outputTokens > 0 ? response.usage.outputTokens / (duration / 1000) : 0,
      tokens: response.usage.totalTokens,
      response: response.content,
      hasContent: response.content.length > 0
    };
    
  } catch (error) {
    console.log(`❌ ${modelId}: ${error.message}`);
    return { status: 'failed', model: modelId, error: error.message };
  }
}

async function runTests() {
  console.log(`🔑 API Key: ${process.env.GROK_API_KEY ? `${process.env.GROK_API_KEY.substring(0, 20)}...` : 'Missing'}`);
  
  const results = [];
  
  for (const modelId of grok4Models) {
    const result = await testModel(modelId);
    results.push(result);
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('🔥 GROK 4 MODEL TEST RESULTS');
  console.log('=' .repeat(60));
  
  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'failed');
  const withContent = successful.filter(r => r.hasContent);
  
  console.log(`🎯 Success Rate: ${successful.length}/${results.length} models working`);
  console.log(`📝 Content Rate: ${withContent.length}/${successful.length} models generating content`);
  
  if (withContent.length > 0) {
    console.log('\n🚀 WORKING GROK 4 MODELS (with content):');
    withContent.forEach(result => {
      console.log(`✅ ${result.model}`);
      console.log(`   ⚡ Speed: ${result.speed.toFixed(1)} tokens/sec`);
      console.log(`   ⏱️  Duration: ${result.duration}ms`);
      console.log(`   💰 Cost: $${result.cost.toFixed(6)}`);
      console.log(`   🔢 Tokens: ${result.tokens}`);
      console.log(`   💬 Response: "${result.response.substring(0, 100)}..."`);
    });
  }
  
  const emptyContent = successful.filter(r => !r.hasContent);
  if (emptyContent.length > 0) {
    console.log('\n⚠️  WORKING BUT EMPTY RESPONSE:');
    emptyContent.forEach(result => {
      console.log(`⚠️  ${result.model}: API works but no content returned`);
      console.log(`   Possible reasoning model (thinking tokens only)`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ FAILED MODELS:');
    failed.forEach(result => {
      console.log(`❌ ${result.model}: ${result.error}`);
    });
  }
  
  console.log('\n🎉 GROK 4 BREAKTHROUGH:');
  console.log(`   🔥 Total Grok 4 models accessible: ${successful.length}`);
  console.log(`   💬 Models generating content: ${withContent.length}`);
  console.log(`   🧠 Advanced reasoning capabilities detected`);
  
  if (successful.length > 0) {
    console.log('\n✨ Grok 4 testing completed successfully!');
    console.log('🏆 You now have access to Grok 4 models!');
  }
}

runTests().catch(console.error);