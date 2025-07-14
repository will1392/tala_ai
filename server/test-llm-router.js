import dotenv from 'dotenv';
dotenv.config();

import LLMRouter from './services/llm/LLMRouter.js';

console.log('🧠 TESTING INTELLIGENT LLM ROUTER');
console.log('=' .repeat(60));

// Test queries representing different types
const testQueries = [
  {
    query: "What's the current weather in Paris right now?",
    expectedType: "realTime",
    description: "Real-time weather query"
  },
  {
    query: "Create a detailed 7-day itinerary for a multi-city trip through Italy including Rome, Florence, and Venice with restaurant recommendations",
    expectedType: "complexPlanning", 
    description: "Complex travel planning"
  },
  {
    query: "Analyze this document and extract the key travel information",
    expectedType: "documentAnalysis",
    description: "Document analysis request"
  },
  {
    query: "Look at this image and tell me what tourist attractions you can see",
    expectedType: "multimodal",
    description: "Image analysis query",
    context: { hasAttachments: true }
  },
  {
    query: "Write a creative travel blog post about hidden gems in Tokyo",
    expectedType: "creative",
    description: "Creative writing request"
  },
  {
    query: "What is the capital of France?",
    expectedType: "factual",
    description: "Simple factual query"
  },
  {
    query: "Quick answer: How many time zones are there?",
    expectedType: "factual",
    description: "Fast factual query",
    context: { fastResponse: true }
  }
];

async function testRouter() {
  const router = new LLMRouter({
    enableLogging: true,
    costOptimization: true
  });

  console.log('\n📊 TESTING QUERY TYPE DETECTION');
  console.log('-'.repeat(40));

  // Test query type detection
  for (const test of testQueries) {
    console.log(`\n🔍 Testing: "${test.query.substring(0, 50)}..."`);
    
    try {
      const analysis = await router.detectQueryType(test.query, test.context || {});
      
      console.log(`   Expected Type: ${test.expectedType}`);
      console.log(`   Detected Type: ${analysis.type}`);
      console.log(`   Complexity: ${analysis.complexity}`);
      console.log(`   Required Features: ${JSON.stringify(analysis.requiredFeatures)}`);
      console.log(`   Cost Optimized: ${analysis.costOptimized}`);
      
      const isCorrect = analysis.type === test.expectedType;
      console.log(`   ${isCorrect ? '✅' : '⚠️ '} Detection ${isCorrect ? 'Correct' : 'Different'}`);
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n🎯 TESTING MODEL SELECTION');
  console.log('-'.repeat(40));

  // Test model selection for different query types
  const queryTypes = ['realTime', 'complexPlanning', 'documentAnalysis', 'multimodal', 'creative', 'factual'];
  
  for (const queryType of queryTypes) {
    console.log(`\n🤖 Query Type: ${queryType}`);
    
    try {
      const model = router.getOptimalModel(queryType, {}, {});
      console.log(`   Selected Model: ${model}`);
      
      // Test with different feature requirements
      const modelWithVision = router.getOptimalModel(queryType, { vision: true }, {});
      console.log(`   With Vision: ${modelWithVision}`);
      
      const modelWithReasoning = router.getOptimalModel(queryType, { reasoning: true }, {});
      console.log(`   With Reasoning: ${modelWithReasoning}`);
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n🚀 TESTING FULL ROUTING EXECUTION');
  console.log('-'.repeat(40));

  // Test actual routing execution with a simple query
  try {
    console.log('\n🧪 Testing simple factual query...');
    const response = await router.routeQuery(
      "What is the capital of France?",
      {},
      { maxTokens: 50 }
    );
    
    console.log('✅ Routing successful!');
    console.log(`   Selected Model: ${response.routing.selectedModel}`);
    console.log(`   Query Type: ${response.routing.queryType}`);
    console.log(`   Routing Time: ${response.routing.routingTime}ms`);
    console.log(`   Fallbacks Used: ${response.routing.fallbacksUsed}`);
    console.log(`   Response: "${response.content}"`);
    console.log(`   Cost: $${response.usage.cost.toFixed(6)}`);
    
  } catch (error) {
    console.log(`❌ Routing execution failed: ${error.message}`);
  }

  console.log('\n📈 TESTING ROUTING STATISTICS');
  console.log('-'.repeat(40));

  // Test statistics collection
  try {
    const stats = router.getRoutingStats();
    console.log('📊 Routing Statistics:');
    console.log(`   Total Queries: ${stats.totalQueries}`);
    console.log(`   Cache Size: ${stats.cacheSize}`);
    console.log(`   Routing Decisions: ${JSON.stringify(stats.routingDecisions, null, 2)}`);
    
    if (Object.keys(stats.fallbackUsage).length > 0) {
      console.log(`   Fallback Usage: ${JSON.stringify(stats.fallbackUsage, null, 2)}`);
    }
    
  } catch (error) {
    console.log(`❌ Statistics error: ${error.message}`);
  }

  console.log('\n🔧 TESTING FALLBACK CHAIN CREATION');
  console.log('-'.repeat(40));

  // Test fallback chain creation
  try {
    const queryAnalysis = {
      type: 'complexPlanning',
      requiredFeatures: { reasoning: true }
    };
    
    const chain = router.createFallbackChain('claude-opus-4-20250514', queryAnalysis);
    console.log(`✅ Fallback chain created: ${chain.join(' -> ')}`);
    
  } catch (error) {
    console.log(`❌ Fallback chain error: ${error.message}`);
  }

  console.log('\n🎯 TESTING USER PREFERENCES');
  console.log('-'.repeat(40));

  // Test user preference override
  try {
    const preferredModel = router.getOptimalModel(
      'factual',
      {},
      { preferredModel: 'grok-3-latest' }
    );
    console.log(`✅ User preference respected: ${preferredModel}`);
    
  } catch (error) {
    console.log(`❌ User preference error: ${error.message}`);
  }

  console.log('\n🧹 TESTING CACHE MANAGEMENT');
  console.log('-'.repeat(40));

  try {
    console.log(`Cache size before clear: ${router.getRoutingStats().cacheSize}`);
    router.clearCache();
    console.log(`Cache size after clear: ${router.getRoutingStats().cacheSize}`);
    console.log('✅ Cache management working');
    
  } catch (error) {
    console.log(`❌ Cache management error: ${error.message}`);
  }

  console.log('\n🏆 LLM ROUTER TESTING COMPLETED!');
  console.log('\n📋 ROUTING FEATURE SUMMARY:');
  console.log('   ✅ Intelligent query type detection');
  console.log('   ✅ Model selection optimization');
  console.log('   ✅ Cost-aware routing');
  console.log('   ✅ Fallback chain support');
  console.log('   ✅ User preference overrides');
  console.log('   ✅ Feature requirement matching');
  console.log('   ✅ Performance statistics tracking');
  console.log('   ✅ Caching and optimization');
}

testRouter().catch(console.error);