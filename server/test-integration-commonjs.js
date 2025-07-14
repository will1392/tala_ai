// Test full integration - CommonJS version
require('dotenv').config();
const axios = require('axios');

async function testIntegration() {
    const baseURL = 'http://localhost:3001';
    
    console.log('🧪 Testing Chat Integration with Multi-LLM:');
    console.log('=' .repeat(50));
    
    try {
        // Test regular chat
        console.log('\n1️⃣  Testing Regular Chat...');
        const chatResponse = await axios.post(`${baseURL}/api/chat`, {
            message: "What's the weather in Paris?",
            userId: "test_user",
            conversationId: "test-123"
        });
        
        console.log('✅ Chat Response Generated');
        console.log(`📝 Response: "${chatResponse.data.response?.substring(0, 100)}..."`);
        console.log(`🤖 Model Used: ${chatResponse.data.model || 'unknown'}`);
        console.log(`🏢 Provider: ${chatResponse.data.provider || 'unknown'}`);
        console.log(`💰 Cost: $${chatResponse.data.cost?.toFixed(6) || '0.000000'}`);
        console.log(`⏱️  Response Time: ${chatResponse.data.performance?.responseTime || 0}ms`);
        console.log(`🎯 Query Type: ${chatResponse.data.routing?.queryType || 'unknown'}`);
        
        // Test with user preferences  
        console.log('\n2️⃣  Testing with User Preferences...');
        const preferredResponse = await axios.post(`${baseURL}/api/chat`, {
            message: "Plan a detailed trip to Tokyo with cultural sites",
            userId: "test_user",
            conversationId: "test-456",
            preferredModel: "claude-sonnet-4-20250514",
            costOptimization: false
        });
        
        console.log('✅ Preferred Model Response Generated');
        console.log(`🤖 Model Used: ${preferredResponse.data.model || 'unknown'}`);
        console.log(`🎯 Routing Reasoning: ${preferredResponse.data.routing?.reasoning?.join(', ') || 'none'}`);
        console.log(`💰 Cost: $${preferredResponse.data.cost?.toFixed(6) || '0.000000'}`);

        // Test cost optimization
        console.log('\n3️⃣  Testing Cost Optimization...');
        const costOptimizedResponse = await axios.post(`${baseURL}/api/chat`, {
            message: "Quick answer: What time zone is Tokyo in?",
            userId: "test_user",
            conversationId: "test-789",
            costOptimization: true,
            fastResponse: true
        });
        
        console.log('✅ Cost-Optimized Response Generated');
        console.log(`🤖 Model Used: ${costOptimizedResponse.data.model || 'unknown'}`);
        console.log(`💡 Cost Optimized: ${costOptimizedResponse.data.routing?.costOptimized ? 'Yes' : 'No'}`);
        console.log(`💰 Cost: $${costOptimizedResponse.data.cost?.toFixed(6) || '0.000000'}`);
        
        // Test metrics endpoint
        console.log('\n4️⃣  Testing Metrics Endpoint...');
        try {
            const metricsResponse = await axios.get(`${baseURL}/api/llm/metrics/sample`);
            console.log('✅ Metrics Retrieved Successfully');
            console.log(`📊 Sample Data Available: ${metricsResponse.data.success}`);
            
            if (metricsResponse.data.data) {
                console.log(`📈 Total Queries: ${metricsResponse.data.data.summary?.totalQueries || 0}`);
                console.log(`🤖 Active Models: ${metricsResponse.data.data.summary?.activeModels || 0}`);
                console.log(`💰 Daily Budget Usage: ${(metricsResponse.data.data.costs?.budget?.daily?.usage * 100 || 0).toFixed(1)}%`);
            }
        } catch (metricsError) {
            if (metricsError.response?.status === 404) {
                console.log('ℹ️  Metrics endpoint not available (Multi-LLM disabled)');
            } else {
                console.log('⚠️  Metrics endpoint error:', metricsError.response?.status || metricsError.message);
            }
        }

        // Test health endpoint
        console.log('\n5️⃣  Testing Health Endpoint...');
        const healthResponse = await axios.get(`${baseURL}/api/health`);
        
        console.log('✅ Health Check Passed');
        console.log(`🤖 Multi-LLM Mode: ${healthResponse.data.multiLLM ? 'ENABLED' : 'DISABLED'}`);
        console.log(`🔧 Available Services:`);
        Object.entries(healthResponse.data.services || {}).forEach(([service, available]) => {
            console.log(`   ${service}: ${available ? '✅' : '❌'}`);
        });
        
        if (healthResponse.data.llmRouter) {
            console.log(`📊 LLM Router Queries: ${healthResponse.data.llmRouter.totalQueries}`);
            console.log(`⏱️  Uptime: ${Math.floor(healthResponse.data.llmRouter.uptime / 1000)}s`);
        }

        // Test conversation continuity
        console.log('\n6️⃣  Testing Conversation Continuity...');
        const followUpResponse = await axios.post(`${baseURL}/api/chat`, {
            message: "What's the best time of year to visit there?", // Reference to previous Tokyo question
            userId: "test_user",
            conversationId: "test-456" // Same conversation as Tokyo question
        });
        
        console.log('✅ Follow-up Response Generated');
        console.log(`📚 Context Used: ${followUpResponse.data.contextUsed ? 'Yes' : 'No'}`);
        console.log(`🔗 Conversation ID: ${followUpResponse.data.conversationId}`);
        
        // Check if the response understands "there" refers to Tokyo
        const response = followUpResponse.data.response.toLowerCase();
        const understoodContext = response.includes('tokyo') || response.includes('japan');
        console.log(`🧠 Context Understanding: ${understoodContext ? '✅ Good' : '⚠️  Check response'}`);
        
    } catch (error) {
        console.log('❌ Integration test failed:', error.message);
        if (error.response) {
            console.log('Response Status:', error.response.status);
            console.log('Response Data:', error.response.data);
        }
    }
    
    console.log('\n🏁 Integration Test Completed');
    console.log('=' .repeat(50));
    
    console.log('\n💡 Next Steps:');
    console.log('1. Check server logs for any errors');
    console.log('2. Monitor costs at: http://localhost:3001/api/llm/metrics');
    console.log('3. Test with your frontend application');
    console.log('4. Adjust budget limits if needed');
}

// Check if server is running first
async function checkServerRunning() {
    try {
        await axios.get('http://localhost:3001/api/health', { timeout: 5000 });
        return true;
    } catch (error) {
        return false;
    }
}

async function runTest() {
    console.log('🔍 Checking if server is running on port 3001...');
    
    const serverRunning = await checkServerRunning();
    
    if (!serverRunning) {
        console.log('❌ Server is not running on http://localhost:3001');
        console.log('');
        console.log('💡 To start the server:');
        console.log('   1. Make sure your .env file is configured');
        console.log('   2. Run: npm start');
        console.log('   3. Wait for "Server running on port 3001" message');
        console.log('');
        console.log('💡 For OpenAI-only mode (safest), add to .env:');
        console.log('   ENABLE_MULTI_LLM=false');
        console.log('');
        console.log('💡 For multi-LLM mode, add to .env:');
        console.log('   ENABLE_MULTI_LLM=true');
        console.log('   ANTHROPIC_API_KEY=your-key-here');
        console.log('   DAILY_LLM_BUDGET=50.00');
        return;
    }
    
    console.log('✅ Server is running! Starting integration test...\n');
    await testIntegration();
}

// Make sure server is running first
console.log('Make sure your server is running on port 3001');
console.log('Starting integration test in 3 seconds...\n');
setTimeout(() => {
    runTest().catch(error => {
        console.error('❌ Test runner failed:', error.message);
        process.exit(1);
    });
}, 3000);