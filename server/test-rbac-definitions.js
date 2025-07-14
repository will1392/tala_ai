#!/usr/bin/env node

/**
 * Test RBAC role and permission definitions
 */

import { ROLES, getAllRoles, getEffectivePermissions, roleHasPermission } from './auth/rbac/roles.js';
import { PERMISSIONS, getAllPermissions, getPermissionsByCategory } from './auth/rbac/permissions.js';

console.log('🔐 Testing RBAC Definitions...\n');

function testRoleDefinitions() {
  console.log('1️⃣ Testing Role Definitions:');
  
  const allRoles = getAllRoles();
  console.log(`   Total roles defined: ${allRoles.length}`);
  
  allRoles.forEach(role => {
    console.log(`   - ${role.name} (${role.displayName})`);
    console.log(`     Level: ${role.level}, Permissions: ${role.permissions.length}`);
    console.log(`     Color: ${role.color}, Icon: ${role.icon}`);
    console.log(`     System Role: ${role.isSystemRole}`);
  });
  
  console.log();
}

function testPermissionDefinitions() {
  console.log('2️⃣ Testing Permission Definitions:');
  
  const allPermissions = getAllPermissions();
  console.log(`   Total permissions defined: ${allPermissions.length}`);
  
  // Test permissions by category
  const categories = Object.keys(PERMISSIONS);
  categories.forEach(category => {
    const categoryPermissions = getPermissionsByCategory(category);
    console.log(`   ${category}: ${categoryPermissions.length} permissions`);
  });
  
  // Show some example permissions
  console.log('\n   Sample permissions:');
  allPermissions.slice(0, 10).forEach(perm => {
    console.log(`   - ${perm}`);
  });
  
  console.log();
}

function testRoleHierarchy() {
  console.log('3️⃣ Testing Role Hierarchy:');
  
  // Test permission inheritance
  const testRoles = ['CLIENT', 'TRAVEL_AGENT', 'AGENCY_ADMIN', 'AGENCY_OWNER', 'SUPER_ADMIN'];
  
  testRoles.forEach(roleName => {
    const effectivePermissions = getEffectivePermissions(roleName);
    console.log(`   ${roleName}: ${effectivePermissions.length} effective permissions`);
  });
  
  // Test specific permission checks
  console.log('\n   Permission inheritance test:');
  const testPermission = 'documents:read:own';
  testRoles.forEach(roleName => {
    const hasPermission = roleHasPermission(roleName, testPermission);
    console.log(`   ${roleName} has '${testPermission}': ${hasPermission}`);
  });
  
  console.log();
}

function testPermissionStructure() {
  console.log('4️⃣ Testing Permission Structure:');
  
  // Test permission parsing
  const samplePermissions = [
    'documents:read:own',
    'conversations:create:agency',
    'users:delete:any',
    'settings:update:system'
  ];
  
  samplePermissions.forEach(perm => {
    const parts = perm.split(':');
    console.log(`   ${perm} -> Resource: ${parts[0]}, Action: ${parts[1]}, Scope: ${parts[2] || 'default'}`);
  });
  
  console.log();
}

function testRoleCompatibility() {
  console.log('5️⃣ Testing Role Compatibility:');
  
  // Test role levels
  Object.values(ROLES).forEach(role => {
    const directPermissions = role.permissions.length;
    const effectivePermissions = getEffectivePermissions(role.name).length;
    const inheritedCount = effectivePermissions - directPermissions;
    
    console.log(`   ${role.name}:`);
    console.log(`     Direct: ${directPermissions}, Inherited: ${inheritedCount}, Total: ${effectivePermissions}`);
  });
  
  console.log();
}

function generatePermissionReport() {
  console.log('6️⃣ Permission Distribution Report:');
  
  const categories = Object.keys(PERMISSIONS);
  const report = {};
  
  categories.forEach(category => {
    const categoryPermissions = Object.keys(PERMISSIONS[category]);
    report[category] = {
      total: categoryPermissions.length,
      critical: categoryPermissions.filter(perm => 
        PERMISSIONS[category][perm].critical
      ).length
    };
  });
  
  console.log('   Category breakdown:');
  Object.entries(report).forEach(([category, stats]) => {
    console.log(`   ${category}: ${stats.total} total (${stats.critical} critical)`);
  });
  
  console.log();
}

// Run all tests
try {
  testRoleDefinitions();
  testPermissionDefinitions();
  testRoleHierarchy();
  testPermissionStructure();
  testRoleCompatibility();
  generatePermissionReport();
  
  console.log('🎉 All RBAC definition tests completed successfully!');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error(error);
}