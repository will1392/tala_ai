#!/usr/bin/env node

/**
 * Test RBAC integration - RoleManager and Authorization
 */

import roleManager from './auth/rbac/RoleManager.js';
import { authorize, requireRole } from './middleware/authorize.js';
import { canUserAccessDocument, canUserManageOrganization, getUserPermissionSummary } from './utils/rbac.js';

console.log('🔐 Testing RBAC Integration...\n');

async function testRoleManager() {
  console.log('1️⃣ Testing RoleManager:');
  
  const testUserId = 'test-user-123';
  const testOrgId = 'org-456';
  
  try {
    // Test role assignment
    console.log('   Testing role assignment...');
    const assignResult = await roleManager.assignRole(
      testUserId, 
      'TRAVEL_AGENT', 
      testOrgId, 
      'admin-user'
    );
    console.log(`   ✅ Role assignment: ${assignResult.success ? 'SUCCESS' : 'FAILED'}`);
    if (assignResult.success) {
      console.log(`      Assigned: ${assignResult.role} to ${assignResult.userId}`);
    }
    
    // Test getting user roles
    console.log('   Testing role retrieval...');
    const userRoles = await roleManager.getUserRoles(testUserId, testOrgId);
    console.log(`   ✅ User roles: [${userRoles.join(', ')}]`);
    
    // Test permission checking
    console.log('   Testing permission checking...');
    const hasPermission = await roleManager.hasPermission(
      testUserId, 
      'documents:read:assigned', 
      null, 
      testOrgId
    );
    console.log(`   ✅ Has permission 'documents:read:assigned': ${hasPermission.hasPermission}`);
    if (hasPermission.hasPermission) {
      console.log(`      Granted by role: ${hasPermission.grantedBy}`);
    }
    
    // Test effective permissions
    console.log('   Testing effective permissions...');
    const effectivePermissions = await roleManager.getEffectivePermissions(testUserId, testOrgId);
    console.log(`   ✅ Effective permissions: ${effectivePermissions.length} total`);
    console.log(`      Sample: ${effectivePermissions.slice(0, 5).join(', ')}...`);
    
    // Test role removal
    console.log('   Testing role removal...');
    const removeResult = await roleManager.removeRole(
      testUserId, 
      'TRAVEL_AGENT', 
      testOrgId, 
      'admin-user'
    );
    console.log(`   ✅ Role removal: ${removeResult.success ? 'SUCCESS' : 'FAILED'}`);
    
  } catch (error) {
    console.error('   ❌ RoleManager test failed:', error.message);
  }
  
  console.log();
}

async function testUtilityFunctions() {
  console.log('2️⃣ Testing Utility Functions:');
  
  const testUserId = 'agent-456';
  const testDocumentId = 'doc-789';
  const testOrgId = 'org-123';
  
  try {
    // Test document access
    console.log('   Testing document access check...');
    const docAccess = await canUserAccessDocument(testUserId, testDocumentId, 'read', testOrgId);
    console.log(`   ✅ Document access allowed: ${docAccess.allowed}`);
    if (docAccess.allowed) {
      console.log(`      Access type: ${docAccess.accessType || 'standard'}`);
      console.log(`      Permission: ${docAccess.permission || 'N/A'}`);
    } else {
      console.log(`      Reason: ${docAccess.reason}`);
    }
    
    // Test organization management
    console.log('   Testing organization management check...');
    const orgAccess = await canUserManageOrganization(testUserId, testOrgId, 'edit');
    console.log(`   ✅ Organization management allowed: ${orgAccess.allowed}`);
    if (orgAccess.allowed) {
      console.log(`      User roles: [${orgAccess.userRoles?.join(', ') || 'N/A'}]`);
    } else {
      console.log(`      Reason: ${orgAccess.reason}`);
    }
    
    // Test permission summary
    console.log('   Testing permission summary...');
    const summary = await getUserPermissionSummary(testUserId, testOrgId);
    console.log(`   ✅ Permission summary generated`);
    console.log(`      Total permissions: ${summary.permissions.length}`);
    console.log(`      Roles: [${summary.roles.join(', ')}]`);
    console.log(`      Highest role: ${summary.highestRole || 'None'}`);
    console.log(`      Can manage users: ${summary.canManageUsers}`);
    console.log(`      Can manage organization: ${summary.canManageOrganization}`);
    
  } catch (error) {
    console.error('   ❌ Utility functions test failed:', error.message);
  }
  
  console.log();
}

function testMiddlewareCreation() {
  console.log('3️⃣ Testing Middleware Creation:');
  
  try {
    // Test authorization middleware creation
    console.log('   Testing authorize middleware...');
    const authMiddleware = authorize('documents:read:own');
    console.log(`   ✅ Authorization middleware created`);
    console.log(`      Type: ${typeof authMiddleware}`);
    console.log(`      Function length: ${authMiddleware.length} (expects req, res, next)`);
    
    // Test multiple permissions middleware
    console.log('   Testing multiple permissions middleware...');
    const multiAuthMiddleware = authorize(['documents:read:own', 'documents:read:shared'], 'OR');
    console.log(`   ✅ Multi-permission middleware created`);
    console.log(`      Type: ${typeof multiAuthMiddleware}`);
    
    // Test role-based middleware
    console.log('   Testing role-based middleware...');
    const roleMiddleware = requireRole(['AGENCY_ADMIN', 'AGENCY_OWNER'], 'OR');
    console.log(`   ✅ Role-based middleware created`);
    console.log(`      Type: ${typeof roleMiddleware}`);
    
    // Test middleware with options
    console.log('   Testing middleware with resource options...');
    const resourceMiddleware = authorize('documents:update:own', 'OR', { resource: 'documentId' });
    console.log(`   ✅ Resource-specific middleware created`);
    
  } catch (error) {
    console.error('   ❌ Middleware creation test failed:', error.message);
  }
  
  console.log();
}

async function testRoleHierarchyScenarios() {
  console.log('4️⃣ Testing Role Hierarchy Scenarios:');
  
  const scenarios = [
    { userId: 'client-1', role: 'CLIENT', permission: 'documents:read:own' },
    { userId: 'agent-1', role: 'TRAVEL_AGENT', permission: 'clients:read:assigned' },
    { userId: 'admin-1', role: 'AGENCY_ADMIN', permission: 'users:create:agent' },
    { userId: 'owner-1', role: 'AGENCY_OWNER', permission: 'billing:manage:subscription' },
    { userId: 'super-1', role: 'SUPER_ADMIN', permission: 'users:impersonate' }
  ];
  
  for (const scenario of scenarios) {
    try {
      console.log(`   Testing ${scenario.role} with permission '${scenario.permission}':`);
      
      // Assign role
      const assignResult = await roleManager.assignRole(scenario.userId, scenario.role, 'test-org');
      console.log(`     Role assignment: ${assignResult.success ? 'SUCCESS' : 'FAILED'}`);
      
      // Check permission
      const hasPermission = await roleManager.hasPermission(scenario.userId, scenario.permission);
      console.log(`     Has permission: ${hasPermission.hasPermission ? 'YES' : 'NO'}`);
      
      // Check a higher-level permission (should fail for lower roles)
      const hasHigherPermission = await roleManager.hasPermission(scenario.userId, 'users:delete:any');
      console.log(`     Has system permission: ${hasHigherPermission.hasPermission ? 'YES' : 'NO'}`);
      
    } catch (error) {
      console.error(`     ❌ Scenario test failed for ${scenario.role}:`, error.message);
    }
  }
  
  console.log();
}

async function testErrorHandling() {
  console.log('5️⃣ Testing Error Handling:');
  
  try {
    // Test invalid role assignment
    console.log('   Testing invalid role assignment...');
    const invalidRole = await roleManager.assignRole('user-1', 'INVALID_ROLE');
    console.log(`   ✅ Invalid role handled: ${!invalidRole.success ? 'CORRECTLY' : 'INCORRECTLY'}`);
    if (!invalidRole.success) {
      console.log(`      Error: ${invalidRole.error}`);
    }
    
    // Test invalid permission check
    console.log('   Testing invalid permission check...');
    const invalidPermission = await roleManager.hasPermission('user-1', 'invalid:permission:format');
    console.log(`   ✅ Invalid permission handled: ${!invalidPermission.hasPermission ? 'CORRECTLY' : 'INCORRECTLY'}`);
    if (!invalidPermission.hasPermission) {
      console.log(`      Reason: ${invalidPermission.reason}`);
    }
    
    // Test missing parameters
    console.log('   Testing missing parameters...');
    const missingParams = await roleManager.assignRole(null, 'CLIENT');
    console.log(`   ✅ Missing parameters handled: ${!missingParams.success ? 'CORRECTLY' : 'INCORRECTLY'}`);
    if (!missingParams.success) {
      console.log(`      Error: ${missingParams.error}`);
    }
    
  } catch (error) {
    console.error('   ❌ Error handling test failed:', error.message);
  }
  
  console.log();
}

function testRoleManagerStatistics() {
  console.log('6️⃣ Testing RoleManager Statistics:');
  
  try {
    const stats = roleManager.getStatistics();
    console.log('   ✅ Statistics retrieved:');
    console.log(`      Cache enabled: ${stats.cacheEnabled}`);
    console.log(`      User roles cache size: ${stats.cacheSize.userRoles}`);
    console.log(`      Permissions cache size: ${stats.cacheSize.permissions}`);
    console.log(`      Audit enabled: ${stats.auditEnabled}`);
    console.log(`      Validation enabled: ${stats.validationEnabled}`);
    
  } catch (error) {
    console.error('   ❌ Statistics test failed:', error.message);
  }
  
  console.log();
}

// Run all integration tests
async function runAllTests() {
  try {
    await testRoleManager();
    await testUtilityFunctions();
    testMiddlewareCreation();
    await testRoleHierarchyScenarios();
    await testErrorHandling();
    testRoleManagerStatistics();
    
    console.log('🎉 All RBAC integration tests completed!');
    
  } catch (error) {
    console.error('❌ Integration test suite failed:', error.message);
    console.error(error);
  }
}

runAllTests();