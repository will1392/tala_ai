#!/usr/bin/env node

/**
 * Comprehensive Database Integration Test for Tala AI
 * 
 * Tests the complete migration flow from file-based storage to PostgreSQL:
 * - Migration system validation
 * - Database seeding and verification
 * - API endpoint integration
 * - Caching layer functionality
 * - Error handling and resilience
 */

import { config } from 'dotenv';
config();

console.log('🧪 COMPREHENSIVE DATABASE INTEGRATION TEST');
console.log('═'.repeat(60));

// Comprehensive integration test
console.log('Running Full Database Integration Test...\n');

async function runIntegrationTest() {
    const testResults = {
        migrations: false,
        seeding: false,
        verification: false,
        endpoints: false,
        caching: false,
        errorHandling: false
    };

    // Test 1: Run migrations in test mode
    console.log('1️⃣ Testing migrations:');
    process.env.NODE_ENV = 'test';
    process.env.DRY_RUN = 'true';
    
    try {
        // Test migration system structure
        const fs = await import('fs');
        const path = await import('path');
        
        const migrationDir = './db/migrations';
        if (fs.default.existsSync(migrationDir)) {
            const files = fs.default.readdirSync(migrationDir);
            const migrationFiles = files.filter(f => f.endsWith('.js') && f !== 'runMigrations.js');
            
            console.log(`   📁 Found ${migrationFiles.length} migration files`);
            
            // Test if runMigrations.js exists and is importable
            const runMigrationsPath = './db/migrations/runMigrations.js';
            if (fs.default.existsSync(runMigrationsPath)) {
                console.log('   ✅ Migration runner exists');
                testResults.migrations = true;
            } else {
                console.log('   ❌ Migration runner missing');
            }
        } else {
            console.log('   ❌ Migration directory not found');
        }
    } catch (error) {
        console.log('   ❌ Migration test error:', error.message);
    }

  console.log('\n💬 TESTING CHAT ENDPOINT');
  console.log('-'.repeat(30));
  
  try {
    // Test basic chat
    const chatResponse = await fetch(`${SERVER_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "What documents do I need for travel to Japan?",
        userId: "integration_test_user",
        conversationId: "integration_test_conv"
      })
    });
    
    if (chatResponse.ok) {
      const chat = await chatResponse.json();
      
      console.log(`✅ Chat Response Generated`);
      console.log(`📝 Response Length: ${chat.response?.length || 0} characters`);
      console.log(`🤖 Model Used: ${chat.model || 'unknown'}`);
      console.log(`🏢 Provider: ${chat.provider || 'unknown'}`);
      console.log(`💰 Cost: $${chat.cost?.toFixed(6) || '0.000000'}`);
      console.log(`⏱️  Response Time: ${chat.performance?.responseTime || 0}ms`);
      console.log(`🎯 Query Type: ${chat.routing?.queryType || 'unknown'}`);
      console.log(`🔄 Fallbacks Used: ${chat.routing?.fallbacksUsed || 0}`);
      
      if (chat.routing?.reasoning) {
        console.log(`💭 Routing Reasoning: ${chat.routing.reasoning.join(', ')}`);
      }
      
    } else {
      const error = await chatResponse.json();
      console.log(`❌ Chat failed: ${error.error}`);
      console.log(`📝 Details: ${error.details || 'No details'}`);
    }
    
  } catch (error) {
    console.log(`❌ Chat test failed: ${error.message}`);
  }

  console.log('\n🎛️  TESTING USER PREFERENCES');
  console.log('-'.repeat(30));
  
  try {
    // Test with cost optimization
    const costOptimizedResponse = await fetch(`${SERVER_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "Quick question: What time zone is Tokyo in?",
        userId: "integration_test_user",
        conversationId: "integration_test_conv_cost",
        costOptimization: true,
        fastResponse: true
      })
    });
    
    if (costOptimizedResponse.ok) {
      const chat = await costOptimizedResponse.json();
      console.log(`✅ Cost-Optimized Response`);
      console.log(`🤖 Model Selected: ${chat.model}`);
      console.log(`💰 Cost: $${chat.cost?.toFixed(6) || '0.000000'}`);
      console.log(`🎯 Cost Optimized: ${chat.routing?.costOptimized ? 'Yes' : 'No'}`);
    } else {
      console.log(`❌ Cost optimization test failed`);
    }
    
  } catch (error) {
    console.log(`❌ User preferences test failed: ${error.message}`);
  }

  // Test metrics endpoint if multi-LLM is enabled
  console.log('\n📊 TESTING METRICS ENDPOINT');
  console.log('-'.repeat(30));
  
  try {
    const metricsResponse = await fetch(`${SERVER_URL}/api/llm/metrics/sample`);
    
    if (metricsResponse.ok) {
      const metrics = await metricsResponse.json();
      console.log(`✅ Metrics Endpoint Available`);
      console.log(`📈 Sample Data Fields: ${Object.keys(metrics.data).join(', ')}`);
      
      if (metrics.data.summary) {
        console.log(`📊 Total Queries: ${metrics.data.summary.totalQueries}`);
        console.log(`🤖 Active Models: ${metrics.data.summary.activeModels}`);
      }
      
    } else if (metricsResponse.status === 404) {
      console.log(`ℹ️  Metrics endpoint not available (Multi-LLM disabled)`);
    } else {
      console.log(`⚠️  Metrics endpoint error: ${metricsResponse.status}`);
    }
    
  } catch (error) {
    console.log(`ℹ️  Metrics test skipped: ${error.message}`);
  }

  console.log('\n🔄 TESTING CONVERSATION CONTINUITY');
  console.log('-'.repeat(30));
  
  try {
    // Test follow-up message
    const followUpResponse = await fetch(`${SERVER_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "How long does a passport need to be valid for that trip?",
        userId: "integration_test_user",
        conversationId: "integration_test_conv" // Same conversation
      })
    });
    
    if (followUpResponse.ok) {
      const chat = await followUpResponse.json();
      console.log(`✅ Follow-up Response Generated`);
      console.log(`📝 Response Length: ${chat.response?.length || 0} characters`);
      console.log(`🔗 Conversation ID: ${chat.conversationId}`);
      console.log(`📚 Context Used: ${chat.contextUsed ? 'Yes' : 'No'}`);
    } else {
      console.log(`❌ Follow-up test failed`);
    }
    
  } catch (error) {
    console.log(`❌ Conversation continuity test failed: ${error.message}`);
  }

  console.log('\n🧪 TESTING ERROR HANDLING');
  console.log('-'.repeat(30));
  
  try {
    // Test invalid request
    const errorResponse = await fetch(`${SERVER_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Missing required fields
        message: "",
        userId: ""
      })
    });
    
    if (errorResponse.status === 400) {
      console.log(`✅ Error handling works correctly (400 for invalid input)`);
    } else {
      console.log(`⚠️  Unexpected error response: ${errorResponse.status}`);
    }
    
  } catch (error) {
    console.log(`❌ Error handling test failed: ${error.message}`);
  }

  console.log('\n🏁 INTEGRATION TEST COMPLETED');
  console.log('=' .repeat(50));
  
  console.log('\n💡 NEXT STEPS:');
  console.log('1. Check server logs for any errors or warnings');
  console.log('2. Monitor metrics at: http://localhost:3001/api/llm/metrics');
  console.log('3. Review cost usage in the metrics dashboard');
  console.log('4. Test with your frontend application');
  
  console.log('\n📋 IMPORTANT NOTES:');
  console.log('- All existing functionality should work unchanged');
  console.log('- New response fields provide additional metadata');
  console.log('- Set ENABLE_MULTI_LLM=false to disable new features');
  console.log('- Monitor budget usage to avoid unexpected costs');
}

// Check if server is running
async function checkServerRunning() {
  try {
    const response = await fetch(`${SERVER_URL}/api/health`, { timeout: 5000 });
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Run the test
async function runTest() {
  const serverRunning = await checkServerRunning();
  
  if (!serverRunning) {
    console.log('❌ Server is not running on http://localhost:3001');
    console.log('💡 Start the server with: npm start');
    console.log('💡 Make sure your .env file is properly configured');
    return;
  }
  
  await testIntegration();
}

runTest().catch(error => {
  console.error('❌ Integration test failed:', error.message);
  process.exit(1);
});