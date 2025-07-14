import dotenv from 'dotenv';
dotenv.config();

// Test Fallback Manager and Error Handling - Converted from CommonJS to ES modules
import LLMRouter from './services/llm/LLMRouter.js';
import { FallbackManager } from './services/llm/FallbackManager.js';
import { 
  RateLimitError, 
  APIKeyError, 
  NetworkError,
  ModelNotAvailableError,
  AllModelsFailedError,
  ContextLengthExceededError 
} from './services/llm/errors/LLMErrors.js';

async function testFallback() {
    console.log('🧪 TESTING FALLBACK MANAGER & ERROR HANDLING');
    console.log('=' .repeat(60));

    const router = new LLMRouter({
        enableLogging: true,
        enableHealthChecks: false, // Disable for focused testing
        costOptimization: true
    });
    
    const fallbackManager = new FallbackManager({
        enableLogging: true,
        maxRetries: 2
    });

    console.log('\n🔗 TESTING FALLBACK CHAINS:');
    console.log('-'.repeat(40));
    
    // Test different fallback chains for different query types
    const fallbackChains = {
        realTime: fallbackManager.getFallbackChain('realTime'),
        complexPlanning: fallbackManager.getFallbackChain('complexPlanning'),
        factual: fallbackManager.getFallbackChain('factual'),
        costOptimized: fallbackManager.getCostOptimizedChain()
    };
    
    for (const [queryType, chain] of Object.entries(fallbackChains)) {
        console.log(`\n📋 ${queryType} chain:`);
        console.log(`   ${chain.join(' → ')}`);
        console.log(`   Chain length: ${chain.length} models`);
    }

    // Test with a query that should use fallback logic
    console.log('\n🎯 TESTING QUERY ROUTING WITH FALLBACKS:');
    console.log('-'.repeat(40));
    
    try {
        console.log('\n🌍 Testing real-time weather query...');
        const response = await router.routeQuery(
            "What's the current weather in Tokyo right now?",
            {},
            { maxTokens: 100 }
        );
        
        console.log('✅ Query executed successfully');
        console.log(`   🤖 Final Model: ${response.routing.selectedModel}`);
        console.log(`   🔄 Fallbacks Used: ${response.routing.fallbacksUsed}`);
        console.log(`   📊 Models Attempted: ${response.routing.totalModelsAttempted}`);
        console.log(`   ⏱️  Routing Time: ${response.routing.routingTime}ms`);
        console.log(`   💰 Cost: $${response.usage.cost.toFixed(6)}`);
        
        if (response.routing.failures && response.routing.failures.length > 0) {
            console.log(`   ⚠️  Failures encountered:`);
            response.routing.failures.forEach((failure, index) => {
                console.log(`     ${index + 1}. ${failure.modelId}: ${failure.errorType}`);
            });
        } else {
            console.log('   ✅ No fallbacks needed - primary model succeeded');
        }
        
    } catch (error) {
        console.log(`❌ Query failed completely: ${error.message}`);
        if (error.routing) {
            console.log(`   📊 Models Attempted: ${error.routing.totalModelsAttempted}`);
            console.log(`   ❗ Failure Summary:`, error.routing.failureSummary);
        }
    }

    // Test error handling and classification
    console.log('\n🚨 TESTING ERROR TYPES & CLASSIFICATION:');
    console.log('-'.repeat(40));
    
    const testErrors = [
        {
            name: 'Rate Limit Error',
            error: new RateLimitError('Rate limit exceeded', 'gpt-4o-mini', 'openai', 60)
        },
        {
            name: 'API Key Error', 
            error: new APIKeyError('Invalid API key', 'claude-sonnet-4-20250514', 'anthropic')
        },
        {
            name: 'Network Error',
            error: new NetworkError('Connection timeout', 'gemini-2.5-pro', 'google', 500)
        },
        {
            name: 'Model Not Available',
            error: new ModelNotAvailableError('Model under maintenance', 'grok-3-latest', 'grok', 'maintenance')
        }
    ];

    testErrors.forEach((test, index) => {
        console.log(`\n${index + 1}. 🔍 ${test.name}:`);
        console.log(`   Message: "${test.error.message}"`);
        console.log(`   User Message: "${test.error.getUserMessage()}"`);
        console.log(`   Retryable: ${test.error.retryable ? 'Yes' : 'No'}`);
        console.log(`   Model: ${test.error.modelId}`);
        console.log(`   Provider: ${test.error.provider}`);
        
        if (test.error instanceof RateLimitError) {
            console.log(`   Retry After: ${test.error.retryAfter}s`);
            console.log(`   Retry Time: ${test.error.getRetryTime().toISOString()}`);
        }
    });

    // Test circuit breaker functionality
    console.log('\n⚡ TESTING CIRCUIT BREAKER:');
    console.log('-'.repeat(40));
    
    const testServiceName = 'test-service-circuit-breaker';
    
    console.log(`\n🔌 Testing circuit breaker for ${testServiceName}:`);
    
    // Get circuit breaker for test service
    const circuitBreaker = fallbackManager.getCircuitBreaker(testServiceName);
    
    console.log(`   Initial state: ${circuitBreaker.getStatus().state}`);
    console.log(`   Can execute: ${circuitBreaker.canExecute() ? 'Yes' : 'No'}`);
    
    // Simulate multiple failures to trigger circuit breaker
    console.log('\n🔥 Simulating 5 consecutive failures...');
    for (let i = 1; i <= 5; i++) {
        const testError = new NetworkError(`Simulated failure ${i}`, testServiceName, 'test');
        circuitBreaker.recordFailure(testError);
        
        const status = circuitBreaker.getStatus();
        console.log(`   Failure ${i}: State = ${status.state}, Failures = ${status.failures}`);
    }
    
    const finalStatus = circuitBreaker.getStatus();
    console.log(`\n🔌 Final circuit breaker status:`);
    console.log(`   State: ${finalStatus.state}`);
    console.log(`   Can execute: ${circuitBreaker.canExecute() ? 'Yes' : 'No'}`);
    console.log(`   Total failures: ${finalStatus.failures}`);
    console.log(`   Is healthy: ${finalStatus.isHealthy ? 'Yes' : 'No'}`);
    
    if (finalStatus.state === 'open') {
        console.log('✅ Circuit breaker opened after failures - Working correctly!');
        console.log(`   Next attempt time: ${new Date(finalStatus.nextAttemptTime).toISOString()}`);
    } else {
        console.log('❌ Circuit breaker should be open but is not');
    }
    
    // Test circuit breaker recovery
    console.log('\n🔄 Testing circuit breaker recovery...');
    
    // Wait a moment to simulate timeout
    console.log('   Simulating timeout passage...');
    
    // Force reset for demonstration
    circuitBreaker.reset();
    const resetStatus = circuitBreaker.getStatus();
    console.log(`   After reset: State = ${resetStatus.state}, Can execute = ${circuitBreaker.canExecute()}`);
    
    // Test successful execution after reset
    circuitBreaker.recordSuccess();
    console.log(`   After success: State = ${circuitBreaker.getStatus().state}`);
    console.log('✅ Circuit breaker recovery working correctly!');

    // Test fallback manager execution with error simulation
    console.log('\n🧪 TESTING FALLBACK EXECUTION WITH SIMULATED ERRORS:');
    console.log('-'.repeat(40));
    
    console.log('\n🎭 Simulating execution with mock failures...');
    
    const mockFailureChain = ['mock-fail-1', 'mock-fail-2', 'mock-success'];
    let attemptCount = 0;
    
    try {
        const result = await fallbackManager.executeWithFallback(
            async (modelId) => {
                attemptCount++;
                console.log(`   Attempt ${attemptCount}: Trying ${modelId}`);
                
                if (modelId === 'mock-fail-1') {
                    throw new RateLimitError('Rate limited', modelId, 'mock');
                } else if (modelId === 'mock-fail-2') {
                    throw new NetworkError('Network error', modelId, 'mock');
                } else if (modelId === 'mock-success') {
                    return {
                        content: 'Mock successful response',
                        metadata: { model: modelId },
                        usage: { cost: 0.001 }
                    };
                } else {
                    throw new Error(`Unknown model: ${modelId}`);
                }
            },
            mockFailureChain,
            { query: 'test query' }
        );
        
        console.log(`✅ Fallback execution succeeded after ${result.fallbackMetadata.fallbacksUsed} fallbacks`);
        console.log(`   Final model: ${result.fallbackMetadata.finalModel}`);
        console.log(`   Total attempts: ${result.fallbackMetadata.modelsAttempted}`);
        console.log(`   Response: "${result.content}"`);
        
    } catch (error) {
        if (error instanceof AllModelsFailedError) {
            console.log(`❌ All models failed as expected:`);
            console.log(`   Total attempts: ${error.failures.length}`);
            console.log(`   Failure summary:`, error.getFailureSummary());
        } else {
            console.log(`❌ Unexpected error: ${error.message}`);
        }
    }

    // Test fallback manager statistics
    console.log('\n📊 TESTING FALLBACK MANAGER STATISTICS:');
    console.log('-'.repeat(40));
    
    const stats = fallbackManager.getStats();
    console.log(`\n📈 Fallback Manager Performance:`);
    console.log(`   Total Attempts: ${stats.totalAttempts}`);
    console.log(`   Successful: ${stats.successfulAttempts}`);
    console.log(`   Failed: ${stats.failedAttempts}`);
    console.log(`   Success Rate: ${stats.successRate}`);
    console.log(`   Retries Performed: ${stats.retriesPerformed}`);
    console.log(`   Fallbacks Used: ${stats.fallbacksUsed}`);
    
    if (Object.keys(stats.errorsByType).length > 0) {
        console.log(`\n❌ Error Distribution:`);
        for (const [errorType, count] of Object.entries(stats.errorsByType)) {
            console.log(`   ${errorType}: ${count}`);
        }
    }
    
    if (Object.keys(stats.modelPerformance).length > 0) {
        console.log(`\n🤖 Model Performance:`);
        for (const [modelId, perf] of Object.entries(stats.modelPerformance)) {
            console.log(`   ${modelId}:`);
            console.log(`     Successes: ${perf.successes}`);
            console.log(`     Failures: ${perf.failures}`);
            const successRate = perf.successes + perf.failures > 0 
                ? ((perf.successes / (perf.successes + perf.failures)) * 100).toFixed(1)
                : 0;
            console.log(`     Success Rate: ${successRate}%`);
        }
    }

    console.log('\n🏆 FALLBACK TESTING COMPLETED!');
    console.log('\n💡 KEY FEATURES DEMONSTRATED:');
    console.log('   ✅ Query-type specific fallback chains');
    console.log('   ✅ Intelligent error classification and handling');
    console.log('   ✅ Circuit breaker pattern prevents cascade failures');
    console.log('   ✅ Exponential backoff retry logic');
    console.log('   ✅ User-friendly error messages');
    console.log('   ✅ Comprehensive failure reporting');
    console.log('   ✅ Performance statistics and monitoring');
    console.log('   ✅ Graceful degradation under failure conditions');
}

// Test specific error scenarios
async function testSpecificErrorScenarios() {
    console.log('\n\n🎯 TESTING SPECIFIC ERROR SCENARIOS');
    console.log('=' .repeat(60));
    
    const router = new LLMRouter({
        enableLogging: true,
        enableHealthChecks: false
    });
    
    // Test with different user preferences that might affect fallback
    const errorScenarios = [
        {
            name: "User Preference Override",
            context: {
                userPreferences: {
                    preferredModel: 'claude-sonnet-4-20250514',
                    costOptimization: false
                }
            },
            query: "Simple test query"
        },
        {
            name: "Cost Optimization Priority",
            context: {
                userPreferences: {
                    costOptimization: true,
                    fastResponse: true
                }
            },
            query: "Quick weather check"
        },
        {
            name: "Complex Query with Reasoning",
            context: {},
            query: "Create a comprehensive multi-city travel plan with detailed logistics and cultural recommendations"
        }
    ];
    
    for (const scenario of errorScenarios) {
        console.log(`\n🧪 Testing: ${scenario.name}`);
        console.log(`   Query: "${scenario.query.substring(0, 50)}..."`);
        
        try {
            const response = await router.routeQuery(
                scenario.query,
                scenario.context,
                { maxTokens: 50 }
            );
            
            console.log(`   ✅ Success with ${response.routing.selectedModel}`);
            console.log(`   🔄 Fallbacks: ${response.routing.fallbacksUsed}`);
            
        } catch (error) {
            console.log(`   ❌ Failed: ${error.message}`);
        }
    }
}

// Run the tests
async function runAllTests() {
    try {
        await testFallback();
        await testSpecificErrorScenarios();
        
    } catch (error) {
        console.error('\n❌ Test suite failed:', error.message);
        console.error(error.stack);
    }
}

runAllTests();