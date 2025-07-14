#!/usr/bin/env node

/**
 * Test authentication middleware directly
 */

import fetch from 'node-fetch';

console.log('🔍 Testing authentication middleware...');

async function testAuthenticatedEndpoint() {
  try {
    // Test an endpoint that uses authentication
    console.log('Testing authenticated endpoint: /api/chat/conversations');
    
    const response = await fetch('http://localhost:3001/api/chat/conversations?userId=admin-1', {
      headers: {
        'Authorization': 'Bearer mock-token',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status:', response.status);
    const data = await response.text();
    console.log('Response:', data);
    
    if (response.status === 200) {
      console.log('✅ Authentication middleware working');
    } else {
      console.log('❌ Authentication middleware failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAuthenticatedEndpoint();