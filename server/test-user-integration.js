// Test full integration
import dotenv from 'dotenv';
dotenv.config();

import fetch from 'node-fetch';

async function testIntegration() {
    const baseURL = 'http://localhost:3001';
    
    console.log('🧪 Testing Chat Integration with Multi-LLM:');
    console.log('=' .repeat(50));
    
    try {
        // Test regular chat
        console.log('\n1️⃣  Testing Regular Chat...');
        const chatResponse = await fetch(`${baseURL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "What's the weather in Paris?",
                userId: "test_user",
                conversationId: "test-123"
            })
        });
        
        if (chatResponse.ok) {
            const chatData = await chatResponse.json();
            console.log('✅ Chat Response Generated');
            console.log(`📝 Response: "${chatData.response?.substring(0, 100)}..."`);
            console.log(`🤖 Model Used: ${chatData.model || 'unknown'}`);
            console.log(`🏢 Provider: ${chatData.provider || 'unknown'}`);
            console.log(`💰 Cost: $${chatData.cost?.toFixed(6) || '0.000000'}`);
            console.log(`⏱️  Response Time: ${chatData.performance?.responseTime || 0}ms`);
            console.log(`🎯 Query Type: ${chatData.routing?.queryType || 'unknown'}`);
        } else {
            const error = await chatResponse.json();
            console.log('❌ Chat failed:', error);
        }
        
        // Test with user preferences  
        console.log('\n2️⃣  Testing with User Preferences...');
        const preferredResponse = await fetch(`${baseURL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "Plan a detailed trip to Tokyo with cultural sites",
                userId: "test_user",
                conversationId: "test-456",
                preferredModel: "claude-sonnet-4-20250514",
                costOptimization: false
            })
        });
        
        if (preferredResponse.ok) {
            const preferredData = await preferredResponse.json();
            console.log('✅ Preferred Model Response Generated');
            console.log(`🤖 Model Used: ${preferredData.model || 'unknown'}`);
            console.log(`🎯 Routing Reasoning: ${preferredData.routing?.reasoning?.join(', ') || 'none'}`);
            console.log(`💰 Cost: $${preferredData.cost?.toFixed(6) || '0.000000'}`);
        } else {
            console.log('❌ Preferred model test failed');
        }

        // Test cost optimization
        console.log('\n3️⃣  Testing Cost Optimization...');
        const costOptimizedResponse = await fetch(`${baseURL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "Quick answer: What time zone is Tokyo in?",
                userId: "test_user",
                conversationId: "test-789",
                costOptimization: true,
                fastResponse: true
            })
        });
        
        if (costOptimizedResponse.ok) {
            const costData = await costOptimizedResponse.json();
            console.log('✅ Cost-Optimized Response Generated');
            console.log(`🤖 Model Used: ${costData.model || 'unknown'}`);
            console.log(`💡 Cost Optimized: ${costData.routing?.costOptimized ? 'Yes' : 'No'}`);
            console.log(`💰 Cost: $${costData.cost?.toFixed(6) || '0.000000'}`);
        } else {
            console.log('❌ Cost optimization test failed');
        }
        
        // Test metrics endpoint
        console.log('\n4️⃣  Testing Metrics Endpoint...');
        const metricsResponse = await fetch(`${baseURL}/api/llm/metrics/sample`);
        
        if (metricsResponse.ok) {
            const metricsData = await metricsResponse.json();
            console.log('✅ Metrics Retrieved Successfully');
            console.log(`📊 Sample Data Available: ${metricsData.success}`);
            
            if (metricsData.data) {
                console.log(`📈 Total Queries: ${metricsData.data.summary?.totalQueries || 0}`);
                console.log(`🤖 Active Models: ${metricsData.data.summary?.activeModels || 0}`);
                console.log(`💰 Daily Budget Usage: ${(metricsData.data.costs?.budget?.daily?.usage * 100 || 0).toFixed(1)}%`);
            }
        } else if (metricsResponse.status === 404) {
            console.log('ℹ️  Metrics endpoint not available (Multi-LLM disabled)');
        } else {
            console.log('⚠️  Metrics endpoint error:', metricsResponse.status);
        }

        // Test health endpoint
        console.log('\n5️⃣  Testing Health Endpoint...');
        const healthResponse = await fetch(`${baseURL}/api/health`);
        
        if (healthResponse.ok) {
            const healthData = await healthResponse.json();
            console.log('✅ Health Check Passed');
            console.log(`🤖 Multi-LLM Mode: ${healthData.multiLLM ? 'ENABLED' : 'DISABLED'}`);
            console.log(`🔧 Available Services:`);
            Object.entries(healthData.services || {}).forEach(([service, available]) => {
                console.log(`   ${service}: ${available ? '✅' : '❌'}`);
            });
            
            if (healthData.llmRouter) {
                console.log(`📊 LLM Router Queries: ${healthData.llmRouter.totalQueries}`);
                console.log(`⏱️  Uptime: ${Math.floor(healthData.llmRouter.uptime / 1000)}s`);
            }
        } else {
            console.log('❌ Health check failed');
        }

        // Test conversation continuity
        console.log('\n6️⃣  Testing Conversation Continuity...');
        const followUpResponse = await fetch(`${baseURL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "What's the best time of year to visit there?", // Reference to previous Tokyo question
                userId: "test_user",
                conversationId: "test-456" // Same conversation as Tokyo question
            })
        });
        
        if (followUpResponse.ok) {
            const followUpData = await followUpResponse.json();
            console.log('✅ Follow-up Response Generated');
            console.log(`📚 Context Used: ${followUpData.contextUsed ? 'Yes' : 'No'}`);
            console.log(`🔗 Conversation ID: ${followUpData.conversationId}`);
            
            // Check if the response understands "there" refers to Tokyo
            const response = followUpData.response.toLowerCase();
            const understoodContext = response.includes('tokyo') || response.includes('japan');
            console.log(`🧠 Context Understanding: ${understoodContext ? '✅ Good' : '⚠️  Check response'}`);
        } else {
            console.log('❌ Follow-up test failed');
        }
        
    } catch (error) {
        console.log('❌ Integration test failed:', error.message);
        if (error.response) {
            console.log('Response:', error.response.data);
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
        const response = await fetch('http://localhost:3001/api/health', { timeout: 5000 });
        return response.ok;
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

runTest().catch(error => {
    console.error('❌ Test runner failed:', error.message);
    process.exit(1);
});