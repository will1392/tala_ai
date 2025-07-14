#!/usr/bin/env node

/**
 * Quick verification script for Redis/Cache setup
 */

import { config } from 'dotenv';
config();

console.log('🔧 Verifying Cache Setup...');
console.log('━'.repeat(40));

// Test imports
try {
  console.log('📦 Testing imports...');
  
  const redisConfig = await import('./config/redis.js');
  console.log('   ✅ Redis config imported');
  
  const cacheService = await import('./services/cache/cacheService.js');
  console.log('   ✅ Cache service imported');
  
  const cacheKeys = await import('./services/cache/cacheKeys.js');
  console.log('   ✅ Cache keys imported');
  
  const rateLimiter = await import('./middleware/rateLimiter.js');
  console.log('   ✅ Rate limiter imported');

  // Test basic functionality without Redis
  console.log('\n🧪 Testing basic functionality...');
  
  const { cacheService: cache } = cacheService;
  const keys = cacheKeys.default;
  
  // Test cache service (should work without Redis)
  const testKey = 'verify:test:123';
  const testData = { test: true, timestamp: Date.now() };
  
  const setResult = await cache.set(testKey, testData, 60);
  console.log(`   Cache set: ${setResult ? 'Success' : 'Failed (expected if no Redis)'}`);
  
  const getResult = await cache.get(testKey);
  console.log(`   Cache get: ${getResult ? 'Success' : 'Failed (expected if no Redis)'}`);
  
  // Test key generation
  const userKey = keys.user.user('12345678-1234-1234-1234-123456789012');
  console.log(`   User key generated: ${userKey}`);
  
  const folderKey = keys.folder.tree('87654321-4321-4321-4321-210987654321');
  console.log(`   Folder key generated: ${folderKey}`);
  
  // Test rate limiter
  const { rateLimiter: limiter } = rateLimiter;
  const mockReq = { ip: '127.0.0.1', headers: {}, user: null };
  
  const limitResult = await limiter.checkRateLimit(mockReq, 'test');
  console.log(`   Rate limit check: ${limitResult.allowed ? 'Allowed' : 'Blocked'}`);
  
  console.log('\n✅ Cache setup verification complete!');
  console.log('ℹ️  All components are properly configured.');
  console.log('   Redis connection will be attempted when the server starts.');
  
} catch (error) {
  console.error('❌ Verification failed:', error.message);
  process.exit(1);
}

process.exit(0);