#!/usr/bin/env node

/**
 * Debug authentication issues
 */

import { authenticate, initializeAuth } from './middleware/authentication.js';

console.log('🔍 Testing authentication middleware...');

try {
  console.log('1. Initializing auth...');
  await initializeAuth();
  console.log('✅ Auth initialized successfully');
  
  // Mock request/response objects
  const mockReq = {
    headers: {
      'authorization': 'Bearer mock-token',
      'content-type': 'application/json'
    },
    method: 'POST',
    url: '/api/chat',
    body: { message: 'test' }
  };
  
  const mockRes = {
    status: (code) => {
      console.log(`❌ Response status: ${code}`);
      return {
        json: (data) => {
          console.log('❌ Response body:', JSON.stringify(data, null, 2));
        }
      };
    }
  };
  
  const mockNext = () => {
    console.log('✅ Middleware passed, user authenticated');
    console.log('User ID:', mockReq.userId);
    console.log('Organization ID:', mockReq.organizationId);
  };
  
  console.log('2. Testing authenticate middleware...');
  await authenticate(mockReq, mockRes, mockNext);
  
} catch (error) {
  console.error('❌ Auth test failed:', error.message);
  console.error('Stack:', error.stack);
}