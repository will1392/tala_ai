#!/usr/bin/env node

/**
 * Test script that sets up proper environment for mock authentication
 */

// Set environment for testing
process.env.NODE_ENV = 'development';
process.env.MOCK_AUTH = 'true';
process.env.FALLBACK_TO_JSON = 'true';

console.log('🧪 Testing with Mock Environment Setup...\n');

// Now run the endpoint tests
import('./test-db-endpoints.js').catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});