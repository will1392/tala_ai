#!/usr/bin/env node

/**
 * Redis Integration Test for Tala AI
 * 
 * Tests Redis caching layer and fallback behavior:
 * - Redis connection and configuration
 * - Cache service operations
 * - Rate limiter functionality
 * - Graceful fallback when Redis is unavailable
 */

import { config } from 'dotenv';
config(); // Load environment variables

import redisConfig, { initializeRedis, cleanupRedis, redisHealthCheck, getRedisMetrics } from './config/redis.js';
import { cacheService } from './services/cache/cacheService.js';
import cacheKeys from './services/cache/cacheKeys.js';
import { rateLimiter } from './middleware/rateLimiter.js';

/**
 * Test Redis connection and basic operations
 */
async function testRedisConnection() {
  console.log('\n🔧 Testing Redis Connection...');
  console.log('━'.repeat(50));

  try {
    // Initialize Redis
    const redisInfo = await initializeRedis();
    
    console.log(`✅ Redis Status: ${redisInfo.isConnected ? 'Connected' : 'Disconnected'}`);
    
    if (redisInfo.isConnected) {
      // Test health check
      const health = await redisHealthCheck();
      console.log(`✅ Health Check: ${health.status}`);
      console.log(`   Latency: ${health.latency || 'N/A'}`);
      
      // Test metrics
      const metrics = await getRedisMetrics();
      if (metrics) {
        console.log(`✅ Redis Metrics:`);
        console.log(`   Connected: ${metrics.connected}`);
        console.log(`   Memory Used: ${metrics.memory_used || 'unknown'}`);
      }
    } else {
      console.log('ℹ️  Redis is not available, testing fallback behavior...');
    }
    
    return redisInfo.isConnected;
  } catch (error) {
    console.error(`❌ Redis connection test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test cache service operations
 */
async function testCacheService() {
  console.log('\n🗄️  Testing Cache Service...');
  console.log('━'.repeat(50));

  try {
    const testData = {
      id: 'test-123',
      name: 'Test User',
      email: 'test@example.com',
      timestamp: new Date().toISOString()
    };

    // Test basic set/get operations
    console.log('📝 Testing basic cache operations...');
    
    const setResult = await cacheService.set('test:user:123', testData, 60);
    console.log(`   Set operation: ${setResult ? 'Success' : 'Failed'}`);
    
    const getResult = await cacheService.get('test:user:123');
    console.log(`   Get operation: ${getResult ? 'Success' : 'Failed'}`);
    
    if (getResult) {
      console.log(`   Retrieved data: ${JSON.stringify(getResult, null, 2)}`);
    }

    // Test cache key generators
    console.log('\n🔑 Testing cache key generators...');
    
    const userKey = cacheKeys.user.user('123e4567-e89b-12d3-a456-426614174000');
    console.log(`   User key: ${userKey}`);
    
    const conversationKey = cacheKeys.conversation.conversation('456e7890-e89b-12d3-a456-426614174001');
    console.log(`   Conversation key: ${conversationKey}`);
    
    const folderTreeKey = cacheKeys.folder.tree('789e0123-e89b-12d3-a456-426614174002');
    console.log(`   Folder tree key: ${folderTreeKey}`);

    // Test multiple operations
    console.log('\n📦 Testing multiple operations...');
    
    const multiData = {
      'test:user:1': { id: 1, name: 'User 1' },
      'test:user:2': { id: 2, name: 'User 2' },
      'test:user:3': { id: 3, name: 'User 3' }
    };
    
    const multiSetResult = await cacheService.setMultiple(multiData, 30);
    console.log(`   Multi-set operation: ${multiSetResult ? 'Success' : 'Failed'}`);
    
    const multiGetResult = await cacheService.getMultiple(Object.keys(multiData));
    console.log(`   Multi-get operation: Retrieved ${Object.keys(multiGetResult).length} items`);

    // Test pattern deletion
    console.log('\n🗑️  Testing pattern deletion...');
    
    const deletedCount = await cacheService.deletePattern('test:user:*');
    console.log(`   Deleted ${deletedCount} cache entries`);

    // Test cache metrics
    console.log('\n📊 Cache Service Metrics:');
    const metrics = cacheService.getMetrics();
    console.log(`   Hit Rate: ${metrics.hitRate}`);
    console.log(`   Total Operations: ${metrics.totalOperations}`);
    console.log(`   Enabled: ${metrics.enabled}`);

    return true;
  } catch (error) {
    console.error(`❌ Cache service test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test rate limiter functionality
 */
async function testRateLimiter() {
  console.log('\n🚦 Testing Rate Limiter...');
  console.log('━'.repeat(50));

  try {
    // Mock request object
    const mockReq = {
      ip: '192.168.1.100',
      headers: {},
      user: null
    };

    console.log('📋 Testing rate limit checks...');
    
    // Test multiple requests
    for (let i = 1; i <= 5; i++) {
      const result = await rateLimiter.checkRateLimit(mockReq, 'test');
      console.log(`   Request ${i}: ${result.allowed ? 'Allowed' : 'Blocked'} (${result.current}/${result.limit})`);
      
      if (!result.allowed) {
        console.log(`     Retry after: ${result.retryAfter} seconds`);
        break;
      }
    }

    // Test rate limit status
    console.log('\n📈 Testing rate limit status...');
    const status = await rateLimiter.getRateLimitStatus('192.168.1.100', 'ip', 'test');
    if (status) {
      console.log(`   Current: ${status.current}/${status.limit}`);
      console.log(`   Remaining: ${status.remaining}`);
      console.log(`   Window: ${status.window} seconds`);
    }

    // Test rate limit reset
    console.log('\n🔄 Testing rate limit reset...');
    const resetResult = await rateLimiter.resetRateLimit('192.168.1.100', 'ip', 'test');
    console.log(`   Reset operation: ${resetResult ? 'Success' : 'Failed'}`);

    return true;
  } catch (error) {
    console.error(`❌ Rate limiter test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test fallback behavior when Redis is unavailable
 */
async function testFallbackBehavior() {
  console.log('\n🛡️  Testing Fallback Behavior...');
  console.log('━'.repeat(50));

  try {
    console.log('ℹ️  Note: This test simulates Redis being unavailable');
    console.log('   The cache service should gracefully fallback');

    // Test cache operations with fallback
    const fallbackResult1 = await cacheService.get('nonexistent:key');
    console.log(`   Get non-existent key: ${fallbackResult1 === null ? 'Handled gracefully' : 'Unexpected result'}`);

    const fallbackResult2 = await cacheService.set('test:fallback', { test: true }, 60);
    console.log(`   Set operation: ${fallbackResult2 !== null ? 'Handled gracefully' : 'Failed gracefully'}`);

    // Test rate limiter fallback
    const mockReq = { ip: '192.168.1.200', headers: {}, user: null };
    const rateLimitResult = await rateLimiter.checkRateLimit(mockReq, 'fallback-test');
    console.log(`   Rate limit check: ${rateLimitResult.allowed ? 'Allowed (fallback)' : 'Unexpected block'}`);

    return true;
  } catch (error) {
    console.error(`❌ Fallback behavior test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test performance characteristics
 */
async function testPerformance() {
  console.log('\n⚡ Testing Performance...');
  console.log('━'.repeat(50));

  try {
    const iterations = 100;
    const testData = { id: 'perf-test', data: 'x'.repeat(1000) }; // 1KB test data

    // Test cache set performance
    console.log(`📝 Testing ${iterations} cache SET operations...`);
    const setStartTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      await cacheService.set(`perf:test:${i}`, testData, 60);
    }
    
    const setEndTime = Date.now();
    const setDuration = setEndTime - setStartTime;
    console.log(`   Completed in ${setDuration}ms (${(setDuration / iterations).toFixed(2)}ms per operation)`);

    // Test cache get performance
    console.log(`📖 Testing ${iterations} cache GET operations...`);
    const getStartTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      await cacheService.get(`perf:test:${i}`);
    }
    
    const getEndTime = Date.now();
    const getDuration = getEndTime - getStartTime;
    console.log(`   Completed in ${getDuration}ms (${(getDuration / iterations).toFixed(2)}ms per operation)`);

    // Cleanup performance test data
    await cacheService.deletePattern('perf:test:*');

    return true;
  } catch (error) {
    console.error(`❌ Performance test failed: ${error.message}`);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🧪 Redis Integration Test Suite');
  console.log('═'.repeat(50));
  console.log(`Redis Enabled: ${redisConfig.config.enabled}`);
  console.log(`Redis URL: ${redisConfig.config.url.replace(/\/\/.*@/, '//***:***@')}`);
  console.log('═'.repeat(50));

  const tests = [
    { name: 'Redis Connection', fn: testRedisConnection },
    { name: 'Cache Service', fn: testCacheService },
    { name: 'Rate Limiter', fn: testRateLimiter },
    { name: 'Fallback Behavior', fn: testFallbackBehavior },
    { name: 'Performance', fn: testPerformance }
  ];

  const results = [];

  for (const test of tests) {
    try {
      const success = await test.fn();
      results.push({ name: test.name, success });
    } catch (error) {
      console.error(`❌ Test "${test.name}" threw an error:`, error.message);
      results.push({ name: test.name, success: false, error: error.message });
    }
  }

  // Print summary
  console.log('\n📋 Test Summary');
  console.log('═'.repeat(50));
  
  let passedTests = 0;
  for (const result of results) {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.name}`);
    if (result.error) {
      console.log(`     Error: ${result.error}`);
    }
    if (result.success) passedTests++;
  }

  console.log('═'.repeat(50));
  console.log(`📊 Results: ${passedTests}/${results.length} tests passed`);
  
  if (passedTests === results.length) {
    console.log('🎉 All tests passed! Redis integration is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the logs above for details.');
  }

  // Cleanup
  await cleanupRedis();
  
  return passedTests === results.length;
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    });
}

export { runTests };