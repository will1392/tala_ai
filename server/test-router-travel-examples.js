import dotenv from 'dotenv';
dotenv.config();

import LLMRouter from './services/llm/LLMRouter.js';

console.log('✈️  TESTING LLM ROUTER WITH TRAVEL SCENARIOS');
console.log('=' .repeat(60));

// Real-world travel queries for Tala AI
const travelScenarios = [
  {
    name: "Real-time Flight Status",
    query: "What's the current status of flight AA123 from New York to London?",
    userPreferences: { fastResponse: true },
    expectedModel: "grok-3-latest" // Real-time queries
  },
  {
    name: "Complex Itinerary Planning", 
    query: "Create a detailed 10-day itinerary for a family trip to Japan including Tokyo, Kyoto, and Osaka with cultural experiences, family-friendly restaurants, and efficient transportation between cities",
    userPreferences: { preferredModel: "claude-opus-4-20250514" },
    expectedModel: "claude-opus-4-20250514" // Complex planning
  },
  {
    name: "Budget Travel Planning",
    query: "What are some budget-friendly accommodation options in Barcelona?",
    userPreferences: { costOptimization: true },
    expectedModel: "gpt-4o-mini" // Cost-optimized
  },
  {
    name: "Document Analysis",
    query: "Analyze this travel insurance document and extract the coverage details for international trips",
    context: { hasDocuments: true },
    expectedModel: "claude-sonnet-4-20250514" // Document analysis
  },
  {
    name: "Photo Recognition",
    query: "Look at this photo and tell me what landmarks or tourist attractions you can identify",
    context: { hasAttachments: true },
    expectedModel: "gemini-2.5-pro" // Multimodal
  },
  {
    name: "Creative Travel Writing",
    query: "Write an engaging travel blog post about the hidden culinary gems of Thailand",
    expectedModel: "claude-opus-4-20250514" // Creative content
  },
  {
    name: "Quick Facts",
    query: "What currency is used in Switzerland?",
    userPreferences: { fastResponse: true },
    expectedModel: "gpt-4o-mini" // Simple factual
  },
  {
    name: "Weather Check",
    query: "What's the current weather and forecast for Rome this week?",
    expectedModel: "grok-3-latest" // Real-time weather
  }
];

async function testTravelScenarios() {
  const router = new LLMRouter({
    enableLogging: false, // Reduce noise for this demo
    costOptimization: true
  });

  console.log('\n🧪 TESTING TRAVEL-SPECIFIC ROUTING');
  console.log('-'.repeat(50));

  for (let i = 0; i < travelScenarios.length; i++) {
    const scenario = travelScenarios[i];
    console.log(`\n${i + 1}. ${scenario.name}`);
    console.log(`   Query: "${scenario.query.substring(0, 80)}..."`);
    
    try {
      // Detect query type
      const analysis = await router.detectQueryType(scenario.query, scenario.context || {});
      
      // Get optimal model
      const selectedModel = router.getOptimalModel(
        analysis.type,
        analysis.requiredFeatures,
        scenario.userPreferences || {}
      );
      
      console.log(`   🎯 Query Type: ${analysis.type}`);
      console.log(`   🤖 Selected Model: ${selectedModel}`);
      console.log(`   💡 Features: ${Object.keys(analysis.requiredFeatures).filter(k => analysis.requiredFeatures[k]).join(', ') || 'basic'}`);
      console.log(`   💰 Cost Optimized: ${analysis.costOptimized ? 'Yes' : 'No'}`);
      console.log(`   🔄 Complexity: ${analysis.complexity}`);
      
      // Check if selection matches expectation (if provided)
      if (scenario.expectedModel) {
        const matches = selectedModel === scenario.expectedModel;
        console.log(`   ${matches ? '✅' : '⚠️ '} Expected: ${scenario.expectedModel} | ${matches ? 'Match!' : 'Different selection'}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n🚀 TESTING ACTUAL EXECUTION');
  console.log('-'.repeat(50));

  // Test actual execution with a few scenarios
  const executionTests = [
    {
      name: "Simple Question",
      query: "What currency is used in Japan?",
      maxTokens: 50
    },
    {
      name: "Planning Query", 
      query: "Suggest 3 must-visit attractions in Paris",
      maxTokens: 150
    }
  ];

  for (const test of executionTests) {
    console.log(`\n🧪 Executing: ${test.name}`);
    console.log(`   Query: "${test.query}"`);
    
    try {
      const startTime = Date.now();
      const response = await router.routeQuery(test.query, {}, { maxTokens: test.maxTokens });
      const totalTime = Date.now() - startTime;
      
      console.log(`   ✅ Success!`);
      console.log(`   🤖 Model Used: ${response.routing.selectedModel}`);
      console.log(`   📝 Response: "${response.content.substring(0, 100)}..."`);
      console.log(`   ⏱️  Total Time: ${totalTime}ms (routing: ${response.routing.routingTime}ms)`);
      console.log(`   💰 Cost: $${response.usage.cost.toFixed(6)}`);
      console.log(`   🔄 Fallbacks: ${response.routing.fallbacksUsed}`);
      
    } catch (error) {
      console.log(`   ❌ Execution failed: ${error.message}`);
    }
  }

  console.log('\n📊 ROUTER PERFORMANCE ANALYTICS');
  console.log('-'.repeat(50));

  try {
    const stats = router.getRoutingStats();
    console.log(`📈 Total Queries Processed: ${stats.totalQueries}`);
    console.log(`🗄️  Service Cache Size: ${stats.cacheSize}`);
    
    console.log('\n📋 Query Type Distribution:');
    for (const [queryType, models] of Object.entries(stats.routingDecisions)) {
      const totalQueries = Object.values(models).reduce((sum, count) => sum + count, 0);
      console.log(`   ${queryType}: ${totalQueries} queries`);
      
      for (const [model, count] of Object.entries(models)) {
        const percentage = ((count / totalQueries) * 100).toFixed(1);
        console.log(`     - ${model}: ${count} (${percentage}%)`);
      }
    }
    
    if (Object.keys(stats.fallbackUsage).length > 0) {
      console.log('\n🔄 Fallback Usage:');
      for (const [model, count] of Object.entries(stats.fallbackUsage)) {
        console.log(`   ${model}: ${count} fallbacks`);
      }
    }
    
  } catch (error) {
    console.log(`❌ Analytics error: ${error.message}`);
  }

  console.log('\n🏆 TRAVEL ROUTING TESTING COMPLETED!');
  console.log('\n💡 ROUTING INSIGHTS FOR TALA AI:');
  console.log('   ✈️  Real-time queries → Grok models (current info)');
  console.log('   🗺️  Complex planning → Claude Opus (best reasoning)');
  console.log('   📄 Document analysis → Claude Sonnet (text analysis)');
  console.log('   🖼️  Image queries → Gemini (multimodal)');
  console.log('   💰 Simple questions → GPT-4o Mini (cost-effective)');
  console.log('   ✍️  Creative content → Claude Opus (creativity)');
  console.log('   🔄 Automatic fallbacks ensure reliability');
  console.log('   📊 Analytics help optimize routing over time');
}

testTravelScenarios().catch(console.error);