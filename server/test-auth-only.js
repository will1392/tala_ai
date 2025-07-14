#!/usr/bin/env node

/**
 * Test authentication middleware in isolation
 */

// Set up environment for testing
process.env.NODE_ENV = 'development';
process.env.MOCK_AUTH = 'true';

import { config } from 'dotenv';
config();

console.log('🔐 Testing Authentication Middleware in Isolation...\n');

async function testAuthMiddleware() {
  try {
    const { authenticate, initializeAuth } = await import('./middleware/authentication.js');
    
    console.log('📥 Importing authentication middleware...');
    console.log('   ✅ Authentication middleware imported successfully');
    
    console.log('\n🔧 Initializing authentication system...');
    await initializeAuth();
    console.log('   ✅ Authentication system initialized');
    
    console.log('\n🧪 Testing authentication function...');
    
    // Mock request and response objects
    const mockReq = {
      headers: {
        authorization: 'Bearer mock-token'
      }
    };
    
    const mockRes = {
      headers: {},
      status: (code) => ({
        json: (data) => {
          console.log(`   📤 Response: ${code} -`, data);
          return mockRes;
        }
      }),
      setHeader: (name, value) => {
        mockRes.headers[name] = value;
      },
      removeHeader: (name) => {
        delete mockRes.headers[name];
      }
    };
    
    const mockNext = () => {
      console.log('   ✅ Authentication passed - next() called');
      console.log('   👤 User ID:', mockReq.userId);
      console.log('   🏢 Organization ID:', mockReq.organizationId);
    };
    
    // Test authentication
    await authenticate(mockReq, mockRes, mockNext);
    
    console.log('\n🎉 Authentication test completed successfully!');
    
  } catch (error) {
    console.error('❌ Authentication test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testAuthMiddleware();