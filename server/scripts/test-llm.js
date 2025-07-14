/**
 * LLM Services Test Script
 * 
 * Tests all configured LLM services to verify they're working correctly.
 */

import dotenv from 'dotenv';
import LLMManager from '../services/llm/LLMManager.js';
import { LLM_MODELS } from '../services/llm/config.js';

dotenv.config();

const TEST_MESSAGE = [
  { role: 'user', content: 'Hello! Please respond with exactly "LLM Test Successful" to confirm you are working.' }
];

async function testLLMService(modelId) {
  console.log(`\n🧪 Testing ${modelId}...`);
  
  try {
    const service = LLMManager.getService(modelId);
    
    // Test availability first
    const isAvailable = await service.isAvailable();
    if (!isAvailable) {
      console.log(`❌ ${modelId}: Not available (likely missing API key)`);
      return { modelId, status: 'unavailable', error: 'Service not available' };
    }

    // Test chat functionality (skip embedding models)
    const { getModelConfig } = await import('../services/llm/config.js');
    const modelConfig = getModelConfig(modelId);
    if (!modelConfig.capabilities.chat) {
      console.log(`⏭️  ${modelId}: Skipping chat test (embedding model)`);
      return { modelId, status: 'skipped', reason: 'embedding model' };
    }

    const startTime = Date.now();
    const response = await service.chat(TEST_MESSAGE, { maxTokens: 50 });
    const duration = Date.now() - startTime;

    console.log(`✅ ${modelId}: SUCCESS`);
    console.log(`   Response: ${response.content}`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Cost: $${response.usage.cost.toFixed(6)}`);
    console.log(`   Tokens: ${response.usage.totalTokens}`);

    return {
      modelId,
      status: 'success',
      response: response.content,
      duration,
      cost: response.usage.cost,
      tokens: response.usage.totalTokens
    };

  } catch (error) {
    console.log(`❌ ${modelId}: FAILED`);
    console.log(`   Error: ${error.message}`);
    
    return {
      modelId,
      status: 'failed',
      error: error.message
    };
  }
}

async function testEmbedding() {
  console.log(`\n🧪 Testing Embeddings...`);
  
  try {
    const response = await LLMManager.embed('Hello world test embedding');
    console.log(`✅ Embedding: SUCCESS`);
    console.log(`   Dimensions: ${response.metadata.dimensions}`);
    console.log(`   Cost: $${response.usage.cost.toFixed(6)}`);
    
    return {
      status: 'success',
      dimensions: response.metadata.dimensions,
      cost: response.usage.cost
    };
  } catch (error) {
    console.log(`❌ Embedding: FAILED`);
    console.log(`   Error: ${error.message}`);
    
    return {
      status: 'failed',
      error: error.message
    };
  }
}

async function testLLMManager() {
  console.log(`\n🧪 Testing LLM Manager...`);
  
  try {
    // Test auto-selection
    const response = await LLMManager.chat(TEST_MESSAGE, { maxTokens: 50 });
    console.log(`✅ LLM Manager: SUCCESS`);
    console.log(`   Selected Model: ${response.metadata.model}`);
    console.log(`   Response: ${response.content}`);
    
    return {
      status: 'success',
      selectedModel: response.metadata.model,
      response: response.content
    };
  } catch (error) {
    console.log(`❌ LLM Manager: FAILED`);
    console.log(`   Error: ${error.message}`);
    
    return {
      status: 'failed',
      error: error.message
    };
  }
}

async function runTests() {
  console.log('🚀 Starting LLM Services Test Suite');
  console.log('=' .repeat(50));

  // Initialize LLM Manager
  try {
    await LLMManager.initialize();
  } catch (error) {
    console.error('Failed to initialize LLM Manager:', error);
    process.exit(1);
  }

  const results = {
    timestamp: new Date().toISOString(),
    models: {},
    embedding: null,
    manager: null,
    summary: {
      total: 0,
      successful: 0,
      failed: 0,
      unavailable: 0,
      skipped: 0
    }
  };

  // Test individual models
  console.log('\n📊 Testing Individual Models');
  console.log('-' .repeat(30));

  for (const modelId of Object.keys(LLM_MODELS)) {
    const result = await testLLMService(modelId);
    results.models[modelId] = result;
    results.summary.total++;

    switch (result.status) {
      case 'success':
        results.summary.successful++;
        break;
      case 'failed':
        results.summary.failed++;
        break;
      case 'unavailable':
        results.summary.unavailable++;
        break;
      case 'skipped':
        results.summary.skipped++;
        break;
    }

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Test embeddings
  console.log('\n📊 Testing Embeddings');
  console.log('-' .repeat(20));
  results.embedding = await testEmbedding();

  // Test LLM Manager
  console.log('\n📊 Testing LLM Manager');
  console.log('-' .repeat(22));
  results.manager = await testLLMManager();

  // Get usage stats
  const usageStats = LLMManager.getUsageStats();

  // Print summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(50));
  console.log(`Total Models Tested: ${results.summary.total}`);
  console.log(`✅ Successful: ${results.summary.successful}`);
  console.log(`❌ Failed: ${results.summary.failed}`);
  console.log(`⚠️  Unavailable: ${results.summary.unavailable}`);
  console.log(`⏭️  Skipped: ${results.summary.skipped}`);
  
  console.log(`\n💰 Total Cost: $${usageStats.totalCost.toFixed(6)}`);
  console.log(`📞 Total Requests: ${usageStats.totalRequests}`);

  if (results.embedding.status === 'success') {
    console.log(`✅ Embeddings: Working`);
  } else {
    console.log(`❌ Embeddings: Failed`);
  }

  if (results.manager.status === 'success') {
    console.log(`✅ LLM Manager: Working`);
  } else {
    console.log(`❌ LLM Manager: Failed`);
  }

  // Check if we have at least one working model
  if (results.summary.successful > 0) {
    console.log(`\n🎉 SUCCESS: Multi-LLM system is operational!`);
    console.log(`   Working models: ${results.summary.successful}/${results.summary.total}`);
  } else {
    console.log(`\n💥 FAILURE: No working models found!`);
    console.log(`   Check your API keys and network connectivity.`);
  }

  // Health check
  console.log('\n🏥 Health Check');
  console.log('-' .repeat(15));
  const health = await LLMManager.healthCheck();
  console.log(`Overall Status: ${health.overall.toUpperCase()}`);
  
  for (const [modelId, status] of Object.entries(health.services)) {
    const icon = status.status === 'healthy' ? '✅' : 
                 status.status === 'unavailable' ? '⚠️' : '❌';
    console.log(`${icon} ${modelId}: ${status.status}`);
  }

  console.log('\n🔍 Available Models for Chat:');
  const availableModels = LLMManager.getAvailableModels('chat');
  availableModels.forEach(model => console.log(`  - ${model}`));

  console.log('\n🔍 Available Models for Embeddings:');
  const availableEmbeddings = LLMManager.getAvailableModels('embedding');
  availableEmbeddings.forEach(model => console.log(`  - ${model}`));

  return results;
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests()
    .then(results => {
      console.log('\n✨ Test completed!');
      
      // Exit with error code if no models are working
      if (results.summary.successful === 0) {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Test suite failed:', error);
      process.exit(1);
    });
}

export { runTests, testLLMService };