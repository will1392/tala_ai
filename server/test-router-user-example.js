import dotenv from 'dotenv';
dotenv.config();

// Test LLM Router - Converted from CommonJS to ES modules
import LLMRouter from './services/llm/LLMRouter.js';

async function testRouter() {
    const router = new LLMRouter({
        enableLogging: true,
        costOptimization: true
    });
    
    // Test query type detection
    const testQueries = [
        { query: "What's the current weather in Paris?", expected: "realTime" },
        { query: "Create a 2-week itinerary for Japan", expected: "complexPlanning" },
        { query: "Analyze this travel document", expected: "documentAnalysis" },
        { query: "What is the capital of France?", expected: "factual" },
        { query: "Describe this image of the Eiffel Tower", expected: "multimodal" }
    ];

    console.log('🧪 TESTING QUERY TYPE DETECTION:');
    console.log('=' .repeat(50));
    
    for (const test of testQueries) {
        const analysis = await router.detectQueryType(test.query, {});
        console.log(`\n📝 Query: "${test.query}"`);
        console.log(`   Expected: ${test.expected}`);
        console.log(`   Detected: ${analysis.type}`);
        console.log(`   Complexity: ${analysis.complexity}`);
        console.log(`   Features: ${Object.keys(analysis.requiredFeatures).filter(k => analysis.requiredFeatures[k]).join(', ') || 'basic'}`);
        console.log(`   ${analysis.type === test.expected ? '✅ Correct' : '❌ Incorrect'}`);
    }

    // Test routing decisions
    console.log('\n\n🎯 TESTING ROUTING DECISIONS:');
    console.log('=' .repeat(50));
    
    try {
        const realTimeModel = router.getOptimalModel('realTime', {}, {});
        console.log(`\n🌍 Optimal model for real-time queries: ${realTimeModel}`);
        
        const simpleModel = router.getOptimalModel('factual', {}, {});
        console.log(`💡 Optimal model for simple queries: ${simpleModel}`);
        
        const complexModel = router.getOptimalModel('complexPlanning', { reasoning: true }, {});
        console.log(`🧠 Optimal model for complex planning: ${complexModel}`);
        
        const multimodalModel = router.getOptimalModel('multimodal', { vision: true }, {});
        console.log(`🖼️  Optimal model for multimodal queries: ${multimodalModel}`);
        
        const creativeModel = router.getOptimalModel('creative', {}, {});
        console.log(`✍️  Optimal model for creative content: ${creativeModel}`);
        
    } catch (error) {
        console.log('❌ Router failed:', error.message);
    }

    // Test user preferences
    console.log('\n\n👤 TESTING USER PREFERENCES:');
    console.log('=' .repeat(50));
    
    try {
        const userPreferredModel = router.getOptimalModel('factual', {}, { 
            preferredModel: 'claude-sonnet-4-20250514' 
        });
        console.log(`\n🎯 User prefers Claude Sonnet: ${userPreferredModel}`);
        
        const costOptimizedModel = router.getOptimalModel('factual', {}, { 
            costOptimization: true,
            fastResponse: true
        });
        console.log(`💰 Cost-optimized selection: ${costOptimizedModel}`);
        
    } catch (error) {
        console.log('❌ User preference test failed:', error.message);
    }

    // Test actual execution
    console.log('\n\n🚀 TESTING ACTUAL EXECUTION:');
    console.log('=' .repeat(50));
    
    try {
        console.log('\n🧪 Testing simple factual query execution...');
        const response = await router.routeQuery(
            "What is the capital of France?",
            {},
            { maxTokens: 50 }
        );
        
        console.log('✅ Execution successful!');
        console.log(`   🤖 Model Used: ${response.routing.selectedModel}`);
        console.log(`   📝 Response: "${response.content}"`);
        console.log(`   ⏱️  Routing Time: ${response.routing.routingTime}ms`);
        console.log(`   💰 Cost: $${response.usage.cost.toFixed(6)}`);
        console.log(`   🔄 Fallbacks Used: ${response.routing.fallbacksUsed}`);
        
    } catch (error) {
        console.log(`❌ Execution failed: ${error.message}`);
    }

    // Show routing statistics
    console.log('\n\n📊 ROUTING STATISTICS:');
    console.log('=' .repeat(50));
    
    const stats = router.getRoutingStats();
    console.log(`\n📈 Total Queries: ${stats.totalQueries}`);
    console.log(`🗄️  Cache Size: ${stats.cacheSize}`);
    
    if (Object.keys(stats.routingDecisions).length > 0) {
        console.log('\n📋 Query Type Distribution:');
        for (const [queryType, models] of Object.entries(stats.routingDecisions)) {
            const totalQueries = Object.values(models).reduce((sum, count) => sum + count, 0);
            console.log(`   ${queryType}: ${totalQueries} queries`);
            
            for (const [model, count] of Object.entries(models)) {
                console.log(`     - ${model}: ${count}`);
            }
        }
    }

    console.log('\n🏆 USER EXAMPLE TESTING COMPLETED!');
}

testRouter().catch(console.error);