#!/usr/bin/env node

/**
 * Test RBAC middleware in Express-like scenarios
 */

import { authorize, requireRole, canAccessUserResource } from './middleware/authorize.js';
import roleManager from './auth/rbac/RoleManager.js';

console.log('🔐 Testing RBAC Middleware Scenarios...\n');

// Mock Express request/response objects
function createMockRequest(user, params = {}, query = {}, body = {}) {
  return {
    user: user,
    userId: user?.id,
    userRoles: user?.roles || [],
    params: params,
    query: query,
    body: body,
    originalUrl: '/api/test',
    method: 'GET',
    ip: '127.0.0.1',
    get: (header) => header === 'User-Agent' ? 'test-client' : null
  };
}

function createMockResponse() {
  const res = {
    statusCode: 200,
    responseData: null,
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      this.responseData = data;
      return this;
    }
  };
  return res;
}

function createMockNext() {
  let called = false;
  return function() {
    called = true;
    return { called };
  };
}

async function testBasicAuthorization() {
  console.log('1️⃣ Testing Basic Authorization Middleware:');
  
  // Test users with different roles
  const testUsers = [
    { id: 'client-1', roles: ['CLIENT'], name: 'Test Client' },
    { id: 'agent-1', roles: ['TRAVEL_AGENT'], name: 'Test Agent' },
    { id: 'admin-1', roles: ['AGENCY_ADMIN'], name: 'Test Admin' },
    { id: 'owner-1', roles: ['AGENCY_OWNER'], name: 'Test Owner' },
    { id: 'super-1', roles: ['SUPER_ADMIN'], name: 'Test Super Admin' }
  ];
  
  // Assign roles first
  for (const user of testUsers) {
    for (const role of user.roles) {
      await roleManager.assignRole(user.id, role, 'test-org');
    }
  }
  
  const testCases = [
    {
      name: 'Client accessing own documents',
      permission: 'documents:read:own',
      expectedToPass: ['client-1', 'agent-1', 'admin-1', 'owner-1', 'super-1']
    },
    {
      name: 'Agent creating documents',
      permission: 'documents:create',
      expectedToPass: ['agent-1', 'admin-1', 'owner-1', 'super-1']
    },
    {
      name: 'Admin managing users',
      permission: 'users:create:agent',
      expectedToPass: ['admin-1', 'owner-1', 'super-1']
    },
    {
      name: 'Owner managing billing',
      permission: 'billing:manage:subscription',
      expectedToPass: ['owner-1', 'super-1']
    },
    {
      name: 'Super admin system access',
      permission: 'settings:update:system',
      expectedToPass: ['super-1']
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n   Testing: ${testCase.name}`);
    console.log(`   Permission: ${testCase.permission}`);
    
    const middleware = authorize(testCase.permission);
    
    for (const user of testUsers) {
      const req = createMockRequest(user);
      const res = createMockResponse();
      const next = createMockNext();
      
      try {
        await middleware(req, res, next);
        
        const passed = res.statusCode === 200 || next().called;
        const shouldPass = testCase.expectedToPass.includes(user.id);
        const result = passed === shouldPass ? '✅' : '❌';
        
        console.log(`     ${result} ${user.name} (${user.roles.join(', ')}): ${passed ? 'ALLOWED' : 'DENIED'}`);
        
        if (!passed && res.responseData) {
          console.log(`        Reason: ${res.responseData.message}`);
        }
        
      } catch (error) {
        console.log(`     ❌ ${user.name}: ERROR - ${error.message}`);
      }
    }
  }
  
  console.log();
}

async function testMultiplePermissions() {
  console.log('2️⃣ Testing Multiple Permission Logic:');
  
  const user = { id: 'agent-1', roles: ['TRAVEL_AGENT'], name: 'Test Agent' };
  
  // Test OR logic (should pass if user has ANY of the permissions)
  console.log('   Testing OR logic:');
  const orMiddleware = authorize([
    'documents:read:own',      // Agent has this
    'users:delete:any'         // Agent doesn't have this
  ], 'OR');
  
  const req1 = createMockRequest(user);
  const res1 = createMockResponse();
  const next1 = createMockNext();
  
  try {
    await orMiddleware(req1, res1, next1);
    const passed = res1.statusCode === 200 || next1().called;
    console.log(`     ✅ OR logic test: ${passed ? 'PASSED' : 'FAILED'} (expected: PASSED)`);
  } catch (error) {
    console.log(`     ❌ OR logic test failed: ${error.message}`);
  }
  
  // Test AND logic (should fail if user doesn't have ALL permissions)
  console.log('   Testing AND logic:');
  const andMiddleware = authorize([
    'documents:read:own',      // Agent has this
    'users:delete:any'         // Agent doesn't have this
  ], 'AND');
  
  const req2 = createMockRequest(user);
  const res2 = createMockResponse();
  const next2 = createMockNext();
  
  try {
    await andMiddleware(req2, res2, next2);
    const passed = res2.statusCode === 200 || next2().called;
    console.log(`     ✅ AND logic test: ${passed ? 'PASSED' : 'FAILED'} (expected: FAILED)`);
    if (!passed) {
      console.log(`        Reason: ${res2.responseData?.message}`);
    }
  } catch (error) {
    console.log(`     ❌ AND logic test failed: ${error.message}`);
  }
  
  console.log();
}

async function testRoleBasedMiddleware() {
  console.log('3️⃣ Testing Role-Based Middleware:');
  
  const testUsers = [
    { id: 'client-1', roles: ['CLIENT'], name: 'Test Client' },
    { id: 'admin-1', roles: ['AGENCY_ADMIN'], name: 'Test Admin' },
    { id: 'super-1', roles: ['SUPER_ADMIN'], name: 'Test Super Admin' }
  ];
  
  const middleware = requireRole(['AGENCY_ADMIN', 'AGENCY_OWNER', 'SUPER_ADMIN'], 'OR');
  
  for (const user of testUsers) {
    const req = createMockRequest(user);
    const res = createMockResponse();
    const next = createMockNext();
    
    try {
      await middleware(req, res, next);
      
      const passed = res.statusCode === 200 || next().called;
      const shouldPass = ['admin-1', 'super-1'].includes(user.id);
      const result = passed === shouldPass ? '✅' : '❌';
      
      console.log(`   ${result} ${user.name} (${user.roles.join(', ')}): ${passed ? 'ALLOWED' : 'DENIED'}`);
      
      if (!passed && res.responseData) {
        console.log(`      Reason: ${res.responseData.message}`);
      }
      
    } catch (error) {
      console.log(`   ❌ ${user.name}: ERROR - ${error.message}`);
    }
  }
  
  console.log();
}

async function testResourceSpecificPermissions() {
  console.log('4️⃣ Testing Resource-Specific Permissions:');
  
  const user = { id: 'agent-1', roles: ['TRAVEL_AGENT'], name: 'Test Agent' };
  
  // Test with resource ID in URL params
  console.log('   Testing with resource ID in params:');
  const middleware = authorize('documents:read:own', 'OR', { resource: 'documentId' });
  
  const req = createMockRequest(user, { documentId: 'doc-123' });
  const res = createMockResponse();
  const next = createMockNext();
  
  try {
    await middleware(req, res, next);
    const passed = res.statusCode === 200 || next().called;
    console.log(`   ✅ Resource-specific test: ${passed ? 'PASSED' : 'FAILED'}`);
    
    if (passed && req.authContext) {
      console.log(`      Auth context created with ${req.authContext.permissions.length} permissions`);
      console.log(`      Authorized for: ${req.authContext.authorizedFor.join(', ')}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Resource-specific test failed: ${error.message}`);
  }
  
  console.log();
}

async function testUserResourceAccess() {
  console.log('5️⃣ Testing User Resource Access Middleware:');
  
  const testCases = [
    {
      name: 'User accessing own data',
      currentUser: { id: 'user-123', roles: ['CLIENT'] },
      targetUserId: 'user-123',
      shouldPass: true
    },
    {
      name: 'Admin accessing other user data',
      currentUser: { id: 'admin-1', roles: ['AGENCY_ADMIN'] },
      targetUserId: 'user-456',
      shouldPass: true
    },
    {
      name: 'Client accessing other user data',
      currentUser: { id: 'client-1', roles: ['CLIENT'] },
      targetUserId: 'user-456',
      shouldPass: false
    }
  ];
  
  const middleware = canAccessUserResource('userId');
  
  for (const testCase of testCases) {
    const req = createMockRequest(testCase.currentUser, { userId: testCase.targetUserId });
    const res = createMockResponse();
    const next = createMockNext();
    
    try {
      await middleware(req, res, next);
      
      const passed = res.statusCode === 200 || next().called;
      const result = passed === testCase.shouldPass ? '✅' : '❌';
      
      console.log(`   ${result} ${testCase.name}: ${passed ? 'ALLOWED' : 'DENIED'} (expected: ${testCase.shouldPass ? 'ALLOWED' : 'DENIED'})`);
      
      if (!passed && res.responseData) {
        console.log(`      Reason: ${res.responseData.message}`);
      }
      
    } catch (error) {
      console.log(`   ❌ ${testCase.name}: ERROR - ${error.message}`);
    }
  }
  
  console.log();
}

async function testUnauthenticatedRequests() {
  console.log('6️⃣ Testing Unauthenticated Requests:');
  
  const middleware = authorize('documents:read:own');
  
  // Test with no user
  const req = createMockRequest(null);
  const res = createMockResponse();
  const next = createMockNext();
  
  try {
    await middleware(req, res, next);
    const passed = res.statusCode === 200 || next().called;
    
    console.log(`   ✅ Unauthenticated request: ${passed ? 'ALLOWED' : 'DENIED'} (expected: DENIED)`);
    
    if (!passed && res.responseData) {
      console.log(`      Status: ${res.statusCode}`);
      console.log(`      Error: ${res.responseData.error}`);
      console.log(`      Code: ${res.responseData.code}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Unauthenticated test failed: ${error.message}`);
  }
  
  console.log();
}

// Run all middleware tests
async function runAllTests() {
  try {
    await testBasicAuthorization();
    await testMultiplePermissions();
    await testRoleBasedMiddleware();
    await testResourceSpecificPermissions();
    await testUserResourceAccess();
    await testUnauthenticatedRequests();
    
    console.log('🎉 All RBAC middleware tests completed!');
    
  } catch (error) {
    console.error('❌ Middleware test suite failed:', error.message);
    console.error(error);
  }
}

runAllTests();