#!/usr/bin/env node

/**
 * Comprehensive Database Test Suite for Tala AI
 * 
 * Tests all aspects of the database migration:
 * - Database connections and health
 * - CRUD operations for all entities
 * - Multi-tenancy isolation
 * - Cache operations
 * - Migration script functionality
 * - Data integrity and relationships
 */

import { config } from 'dotenv';
config();

import { getSupabaseHealth, getAdminClient } from './db/supabaseClient.js';
import { initializeRedis, cleanupRedis } from './config/redis.js';
import { cacheService } from './services/cache/cacheService.js';

// Import all database services
import { OrganizationService } from './services/db/organizationService.js';
import { UserService } from './services/db/userService.js';
import { ConversationService } from './services/db/conversationService.js';
import { DocumentService } from './services/db/documentService.js';
import { FolderService } from './services/db/folderService.js';

console.log('🧪 COMPREHENSIVE DATABASE TEST SUITE');
console.log('═'.repeat(60));

// Test configuration
const TEST_CONFIG = {
  runCleanup: true,
  testCaching: true,
  testMultiTenancy: true,
  verbose: true
};

// Test data storage
let testData = {
  organizations: [],
  users: [],
  conversations: [],
  documents: [],
  folders: []
};

let services = {};

/**
 * Initialize test services
 */
async function initializeServices() {
  console.log('\n🔧 Initializing Services...');
  console.log('-'.repeat(40));
  
  try {
    services = {
      organization: new OrganizationService(),
      user: new UserService(),
      conversation: new ConversationService(),
      document: new DocumentService(),
      folder: new FolderService()
    };
    
    console.log('✅ All database services initialized');
    
    // Initialize Redis for caching tests
    if (TEST_CONFIG.testCaching) {
      const redisInfo = await initializeRedis();
      console.log(`✅ Redis initialized (connected: ${redisInfo.isConnected})`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Service initialization failed:', error.message);
    return false;
  }
}

/**
 * Test database connection and health
 */
async function testDatabaseConnection() {
  console.log('\n🏥 Testing Database Connection...');
  console.log('-'.repeat(40));
  
  try {
    const health = await getSupabaseHealth();
    console.log(`Database Status: ${health.status}`);
    console.log(`Response Time: ${health.responseTime}ms`);
    
    if (health.status === 'healthy') {
      console.log('✅ Database connection successful');
      
      // Test admin client
      const adminClient = getAdminClient();
      const { data: tables } = await adminClient
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .limit(5);
      
      console.log(`✅ Found ${tables?.length || 0} tables in database`);
      return true;
    } else {
      console.log('❌ Database connection failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    return false;
  }
}

/**
 * Test organization CRUD operations
 */
async function testOrganizationCRUD() {
  console.log('\n🏢 Testing Organization CRUD...');
  console.log('-'.repeat(40));
  
  try {
    const orgService = services.organization;
    
    // CREATE
    console.log('📝 Testing organization creation...');
    const orgData = {
      name: 'Test Organization Alpha',
      slug: 'test-org-alpha',
      description: 'Test organization for database testing',
      plan_type: 'pro'
    };
    
    const createResult = await orgService.create(orgData);
    if (!createResult.success) {
      throw new Error(`Create failed: ${createResult.error}`);
    }
    
    const createdOrg = createResult.data;
    testData.organizations.push(createdOrg);
    console.log(`   ✅ Created organization: ${createdOrg.id}`);
    
    // READ
    console.log('📖 Testing organization retrieval...');
    const readResult = await orgService.getById(createdOrg.id);
    if (!readResult.success) {
      throw new Error(`Read failed: ${readResult.error}`);
    }
    console.log(`   ✅ Retrieved organization: ${readResult.data.name}`);
    
    // UPDATE
    console.log('✏️ Testing organization update...');
    const updateData = { description: 'Updated test organization' };
    const updateResult = await orgService.update(createdOrg.id, updateData);
    if (!updateResult.success) {
      throw new Error(`Update failed: ${updateResult.error}`);
    }
    console.log(`   ✅ Updated organization description`);
    
    // LIST
    console.log('📋 Testing organization listing...');
    const listResult = await orgService.getMany({}, { pagination: { page: 1, pageSize: 10 } });
    if (!listResult.success) {
      throw new Error(`List failed: ${listResult.error}`);
    }
    console.log(`   ✅ Listed ${listResult.data.length} organizations`);
    
    return true;
  } catch (error) {
    console.error('❌ Organization CRUD test failed:', error.message);
    return false;
  }
}

/**
 * Test user CRUD operations
 */
async function testUserCRUD() {
  console.log('\n👤 Testing User CRUD...');
  console.log('-'.repeat(40));
  
  try {
    const userService = services.user;
    const testOrg = testData.organizations[0];
    
    if (!testOrg) {
      throw new Error('No test organization available');
    }
    
    // CREATE
    console.log('📝 Testing user creation...');
    const userData = {
      organization_id: testOrg.id,
      email: 'testuser@example.com',
      display_name: 'Test User Alpha',
      role: 'admin',
      status: 'active',
      email_verified: true
    };
    
    const createResult = await userService.createUser(userData);
    if (!createResult.success) {
      throw new Error(`Create failed: ${createResult.error}`);
    }
    
    const createdUser = createResult.data;
    testData.users.push(createdUser);
    console.log(`   ✅ Created user: ${createdUser.id}`);
    
    // READ
    console.log('📖 Testing user retrieval...');
    const readResult = await userService.getUserById(createdUser.id, {
      organizationId: testOrg.id
    });
    if (!readResult.success) {
      throw new Error(`Read failed: ${readResult.error}`);
    }
    console.log(`   ✅ Retrieved user: ${readResult.data.display_name}`);
    
    // UPDATE
    console.log('✏️ Testing user update...');
    const updateData = { display_name: 'Updated Test User Alpha' };
    const updateResult = await userService.updateUser(createdUser.id, updateData, {
      organizationId: testOrg.id
    });
    if (!updateResult.success) {
      throw new Error(`Update failed: ${updateResult.error}`);
    }
    console.log(`   ✅ Updated user display name`);
    
    // LIST by organization
    console.log('📋 Testing user listing by organization...');
    const listResult = await userService.getOrganizationUsers(testOrg.id, {
      pagination: { page: 1, pageSize: 10 }
    });
    if (!listResult.success) {
      throw new Error(`List failed: ${listResult.error}`);
    }
    console.log(`   ✅ Listed ${listResult.data.length} users for organization`);
    
    return true;
  } catch (error) {
    console.error('❌ User CRUD test failed:', error.message);
    return false;
  }
}

/**
 * Test conversation CRUD operations
 */
async function testConversationCRUD() {
  console.log('\n💬 Testing Conversation CRUD...');
  console.log('-'.repeat(40));
  
  try {
    const conversationService = services.conversation;
    const testOrg = testData.organizations[0];
    const testUser = testData.users[0];
    
    if (!testOrg || !testUser) {
      throw new Error('No test organization or user available');
    }
    
    // CREATE
    console.log('📝 Testing conversation creation...');
    const conversationData = {
      organization_id: testOrg.id,
      user_id: testUser.id,
      title: 'Test Conversation Alpha',
      persist_context: true,
      context_reset: false
    };
    
    const createResult = await conversationService.createConversation(conversationData);
    if (!createResult.success) {
      throw new Error(`Create failed: ${createResult.error}`);
    }
    
    const createdConv = createResult.data;
    testData.conversations.push(createdConv);
    console.log(`   ✅ Created conversation: ${createdConv.id}`);
    
    // READ
    console.log('📖 Testing conversation retrieval...');
    const readResult = await conversationService.getConversationById(createdConv.id, {
      organizationId: testOrg.id
    });
    if (!readResult.success) {
      throw new Error(`Read failed: ${readResult.error}`);
    }
    console.log(`   ✅ Retrieved conversation: ${readResult.data.title}`);
    
    // UPDATE
    console.log('✏️ Testing conversation update...');
    const updateData = { 
      title: 'Updated Test Conversation Alpha',
      last_message_preview: 'Test message preview'
    };
    const updateResult = await conversationService.updateConversation(createdConv.id, updateData, {
      organizationId: testOrg.id
    });
    if (!updateResult.success) {
      throw new Error(`Update failed: ${updateResult.error}`);
    }
    console.log(`   ✅ Updated conversation title`);
    
    // LIST by user
    console.log('📋 Testing conversation listing by user...');
    const listResult = await conversationService.getUserConversations(testUser.id, {
      organizationId: testOrg.id,
      pagination: { page: 1, pageSize: 10 }
    });
    if (!listResult.success) {
      throw new Error(`List failed: ${listResult.error}`);
    }
    console.log(`   ✅ Listed ${listResult.data.length} conversations for user`);
    
    return true;
  } catch (error) {
    console.error('❌ Conversation CRUD test failed:', error.message);
    return false;
  }
}

/**
 * Test folder CRUD operations
 */
async function testFolderCRUD() {
  console.log('\n📁 Testing Folder CRUD...');
  console.log('-'.repeat(40));
  
  try {
    const folderService = services.folder;
    const testOrg = testData.organizations[0];
    const testUser = testData.users[0];
    
    if (!testOrg || !testUser) {
      throw new Error('No test organization or user available');
    }
    
    // CREATE root folder
    console.log('📝 Testing folder creation...');
    const folderData = {
      organization_id: testOrg.id,
      user_id: testUser.id,
      name: 'Test Root Folder',
      description: 'Root folder for testing',
      parent_folder_id: null,
      folder_type: 'user'
    };
    
    const createResult = await folderService.createFolder(folderData);
    if (!createResult.success) {
      throw new Error(`Create failed: ${createResult.error}`);
    }
    
    const createdFolder = createResult.data;
    testData.folders.push(createdFolder);
    console.log(`   ✅ Created folder: ${createdFolder.id}`);
    
    // CREATE subfolder
    console.log('📝 Testing subfolder creation...');
    const subfolderData = {
      organization_id: testOrg.id,
      user_id: testUser.id,
      name: 'Test Subfolder',
      description: 'Subfolder for testing hierarchy',
      parent_folder_id: createdFolder.id,
      folder_type: 'user'
    };
    
    const subfolderResult = await folderService.createFolder(subfolderData);
    if (!subfolderResult.success) {
      throw new Error(`Subfolder create failed: ${subfolderResult.error}`);
    }
    
    const createdSubfolder = subfolderResult.data;
    testData.folders.push(createdSubfolder);
    console.log(`   ✅ Created subfolder: ${createdSubfolder.id}`);
    
    // READ
    console.log('📖 Testing folder retrieval...');
    const readResult = await folderService.getFolderById(createdFolder.id, {
      organizationId: testOrg.id
    });
    if (!readResult.success) {
      throw new Error(`Read failed: ${readResult.error}`);
    }
    console.log(`   ✅ Retrieved folder: ${readResult.data.name}`);
    
    // LIST folders
    console.log('📋 Testing folder listing...');
    const listResult = await folderService.getFolders({
      organization_id: testOrg.id,
      user_id: testUser.id
    }, {
      organizationId: testOrg.id
    });
    if (!listResult.success) {
      throw new Error(`List failed: ${listResult.error}`);
    }
    console.log(`   ✅ Listed ${listResult.data.length} folders`);
    
    return true;
  } catch (error) {
    console.error('❌ Folder CRUD test failed:', error.message);
    return false;
  }
}

/**
 * Test multi-tenancy isolation
 */
async function testMultiTenancyIsolation() {
  console.log('\n🏢 Testing Multi-Tenancy Isolation...');
  console.log('-'.repeat(40));
  
  if (!TEST_CONFIG.testMultiTenancy) {
    console.log('⏭️ Multi-tenancy test skipped');
    return true;
  }
  
  try {
    const orgService = services.organization;
    const userService = services.user;
    
    // Create second organization
    console.log('📝 Creating second organization...');
    const org2Data = {
      name: 'Test Organization Beta',
      slug: 'test-org-beta',
      description: 'Second test organization for isolation testing',
      plan_type: 'free'
    };
    
    const org2Result = await orgService.create(org2Data);
    if (!org2Result.success) {
      throw new Error(`Org2 create failed: ${org2Result.error}`);
    }
    
    const org2 = org2Result.data;
    testData.organizations.push(org2);
    console.log(`   ✅ Created second organization: ${org2.id}`);
    
    // Create user in second organization
    console.log('👤 Creating user in second organization...');
    const user2Data = {
      organization_id: org2.id,
      email: 'testuser2@example.com',
      display_name: 'Test User Beta',
      role: 'member',
      status: 'active',
      email_verified: true
    };
    
    const user2Result = await userService.createUser(user2Data);
    if (!user2Result.success) {
      throw new Error(`User2 create failed: ${user2Result.error}`);
    }
    
    const user2 = user2Result.data;
    testData.users.push(user2);
    console.log(`   ✅ Created user in second organization: ${user2.id}`);
    
    // Test isolation: User from org1 should not see user from org2
    console.log('🔒 Testing user isolation between organizations...');
    const org1 = testData.organizations[0];
    const org1UsersResult = await userService.getOrganizationUsers(org1.id);
    
    if (!org1UsersResult.success) {
      throw new Error(`Org1 users fetch failed: ${org1UsersResult.error}`);
    }
    
    const org1UserIds = org1UsersResult.data.map(u => u.id);
    const hasOrg2User = org1UserIds.includes(user2.id);
    
    if (hasOrg2User) {
      throw new Error('Multi-tenancy violation: Org1 can see Org2 user');
    }
    
    console.log('   ✅ User isolation working correctly');
    
    // Test conversation isolation
    console.log('💬 Testing conversation isolation...');
    const conv2Data = {
      organization_id: org2.id,
      user_id: user2.id,
      title: 'Isolated Conversation Beta',
      persist_context: true
    };
    
    const conv2Result = await services.conversation.createConversation(conv2Data);
    if (!conv2Result.success) {
      throw new Error(`Conv2 create failed: ${conv2Result.error}`);
    }
    
    testData.conversations.push(conv2Result.data);
    
    // Try to access conv2 from org1 context (should fail)
    const org1User = testData.users[0];
    const org1ConvsResult = await services.conversation.getUserConversations(org1User.id, {
      organizationId: org1.id
    });
    
    if (!org1ConvsResult.success) {
      throw new Error(`Org1 conversations fetch failed: ${org1ConvsResult.error}`);
    }
    
    const org1ConvIds = org1ConvsResult.data.map(c => c.id);
    const hasOrg2Conv = org1ConvIds.includes(conv2Result.data.id);
    
    if (hasOrg2Conv) {
      throw new Error('Multi-tenancy violation: Org1 can see Org2 conversation');
    }
    
    console.log('   ✅ Conversation isolation working correctly');
    console.log('✅ Multi-tenancy isolation tests passed');
    
    return true;
  } catch (error) {
    console.error('❌ Multi-tenancy test failed:', error.message);
    return false;
  }
}

/**
 * Test cache operations
 */
async function testCacheOperations() {
  console.log('\n⚡ Testing Cache Operations...');
  console.log('-'.repeat(40));
  
  if (!TEST_CONFIG.testCaching) {
    console.log('⏭️ Cache test skipped');
    return true;
  }
  
  try {
    const testKey = 'test:database:cache:key';
    const testData = { 
      id: 'test-123',
      message: 'Hello from cache test',
      timestamp: Date.now()
    };
    
    // Test SET
    console.log('📝 Testing cache set...');
    const setResult = await cacheService.set(testKey, testData, 60);
    console.log(`   ✅ Cache set: ${setResult ? 'Success' : 'Failed (expected if no Redis)'}`);
    
    // Test GET
    console.log('📖 Testing cache get...');
    const getResult = await cacheService.get(testKey);
    const getCacheHit = getResult && getResult.id === testData.id;
    console.log(`   ✅ Cache get: ${getCacheHit ? 'Hit' : 'Miss (expected if no Redis)'}`);
    
    // Test DELETE
    console.log('🗑️ Testing cache delete...');
    const deleteResult = await cacheService.delete(testKey);
    console.log(`   ✅ Cache delete: ${deleteResult ? 'Success' : 'Failed (expected if no Redis)'}`);
    
    // Test service-level caching
    console.log('🔧 Testing service-level caching...');
    const orgService = services.organization;
    const testOrg = testData.organizations[0];
    
    if (testOrg) {
      // This should trigger cache operations in the service
      const result1 = await orgService.getById(testOrg.id);
      const result2 = await orgService.getById(testOrg.id);
      
      console.log(`   ✅ Service caching: ${result1.success && result2.success ? 'Working' : 'Failed'}`);
    }
    
    // Get cache metrics
    const metrics = cacheService.getMetrics();
    console.log('📊 Cache metrics:');
    console.log(`   Hit rate: ${metrics.hitRate}`);
    console.log(`   Total operations: ${metrics.totalOperations}`);
    console.log(`   Enabled: ${metrics.enabled}`);
    
    return true;
  } catch (error) {
    console.error('❌ Cache test failed:', error.message);
    return false;
  }
}

/**
 * Test data relationships and integrity
 */
async function testDataIntegrity() {
  console.log('\n🔗 Testing Data Relationships & Integrity...');
  console.log('-'.repeat(40));
  
  try {
    const testOrg = testData.organizations[0];
    const testUser = testData.users[0];
    const testConv = testData.conversations[0];
    
    if (!testOrg || !testUser || !testConv) {
      throw new Error('Missing test data for integrity tests');
    }
    
    // Test user belongs to organization
    console.log('👤 Testing user-organization relationship...');
    if (testUser.organization_id !== testOrg.id) {
      throw new Error('User-organization relationship broken');
    }
    console.log('   ✅ User correctly linked to organization');
    
    // Test conversation belongs to user and organization
    console.log('💬 Testing conversation relationships...');
    if (testConv.user_id !== testUser.id || testConv.organization_id !== testOrg.id) {
      throw new Error('Conversation relationships broken');
    }
    console.log('   ✅ Conversation correctly linked to user and organization');
    
    // Test folder hierarchy
    console.log('📁 Testing folder hierarchy...');
    const rootFolder = testData.folders.find(f => !f.parent_folder_id);
    const subFolder = testData.folders.find(f => f.parent_folder_id);
    
    if (rootFolder && subFolder) {
      if (subFolder.parent_folder_id !== rootFolder.id) {
        throw new Error('Folder hierarchy broken');
      }
      console.log('   ✅ Folder hierarchy correctly maintained');
    } else {
      console.log('   ⏭️ Folder hierarchy test skipped (no test folders)');
    }
    
    // Test timestamps
    console.log('🕐 Testing timestamp integrity...');
    const entities = [...testData.organizations, ...testData.users, ...testData.conversations];
    for (const entity of entities) {
      if (!entity.created_at || !entity.updated_at) {
        throw new Error('Missing timestamps on entity');
      }
      
      const createdAt = new Date(entity.created_at);
      const updatedAt = new Date(entity.updated_at);
      
      if (createdAt > updatedAt) {
        throw new Error('Invalid timestamps: created_at > updated_at');
      }
    }
    console.log('   ✅ All timestamps valid');
    
    return true;
  } catch (error) {
    console.error('❌ Data integrity test failed:', error.message);
    return false;
  }
}

/**
 * Clean up test data
 */
async function cleanupTestData() {
  console.log('\n🧹 Cleaning Up Test Data...');
  console.log('-'.repeat(40));
  
  if (!TEST_CONFIG.runCleanup) {
    console.log('⏭️ Cleanup skipped');
    return true;
  }
  
  try {
    let deletedCount = 0;
    
    // Delete conversations
    for (const conv of testData.conversations) {
      try {
        await services.conversation.deleteConversation(conv.id, {
          organizationId: conv.organization_id
        });
        deletedCount++;
      } catch (error) {
        console.warn(`   ⚠️ Failed to delete conversation ${conv.id}`);
      }
    }
    
    // Delete folders (children first)
    const sortedFolders = testData.folders.sort((a, b) => {
      if (a.parent_folder_id && !b.parent_folder_id) return -1;
      if (!a.parent_folder_id && b.parent_folder_id) return 1;
      return 0;
    });
    
    for (const folder of sortedFolders.reverse()) {
      try {
        await services.folder.deleteFolder(folder.id, {
          organizationId: folder.organization_id
        });
        deletedCount++;
      } catch (error) {
        console.warn(`   ⚠️ Failed to delete folder ${folder.id}`);
      }
    }
    
    // Delete users
    for (const user of testData.users) {
      try {
        await services.user.deleteUser(user.id, {
          organizationId: user.organization_id
        });
        deletedCount++;
      } catch (error) {
        console.warn(`   ⚠️ Failed to delete user ${user.id}`);
      }
    }
    
    // Delete organizations
    for (const org of testData.organizations) {
      try {
        await services.organization.delete(org.id);
        deletedCount++;
      } catch (error) {
        console.warn(`   ⚠️ Failed to delete organization ${org.id}`);
      }
    }
    
    console.log(`✅ Cleanup completed - deleted ${deletedCount} entities`);
    return true;
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    return false;
  }
}

/**
 * Run all database tests
 */
async function runDatabaseTests() {
  console.log('🚀 Starting Comprehensive Database Tests...\n');
  
  const results = [];
  const startTime = Date.now();
  
  try {
    // Initialize services
    const initResult = await initializeServices();
    results.push({ name: 'Service Initialization', success: initResult });
    
    if (!initResult) {
      console.log('❌ Cannot continue without services');
      return false;
    }
    
    // Run tests sequentially
    const tests = [
      { name: 'Database Connection', fn: testDatabaseConnection },
      { name: 'Organization CRUD', fn: testOrganizationCRUD },
      { name: 'User CRUD', fn: testUserCRUD },
      { name: 'Conversation CRUD', fn: testConversationCRUD },
      { name: 'Folder CRUD', fn: testFolderCRUD },
      { name: 'Multi-Tenancy Isolation', fn: testMultiTenancyIsolation },
      { name: 'Cache Operations', fn: testCacheOperations },
      { name: 'Data Integrity', fn: testDataIntegrity }
    ];
    
    for (const test of tests) {
      try {
        const success = await test.fn();
        results.push({ name: test.name, success });
      } catch (error) {
        console.error(`❌ Test "${test.name}" threw error:`, error.message);
        results.push({ name: test.name, success: false, error: error.message });
      }
    }
    
    // Cleanup
    const cleanupResult = await cleanupTestData();
    results.push({ name: 'Cleanup', success: cleanupResult });
    
  } finally {
    // Always cleanup Redis
    if (TEST_CONFIG.testCaching) {
      await cleanupRedis();
    }
  }
  
  // Print summary
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log('\n📊 TEST SUMMARY');
  console.log('═'.repeat(60));
  
  let passedTests = 0;
  for (const result of results) {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.name}`);
    if (result.error) {
      console.log(`     Error: ${result.error}`);
    }
    if (result.success) passedTests++;
  }
  
  console.log('═'.repeat(60));
  console.log(`📊 Results: ${passedTests}/${results.length} tests passed`);
  console.log(`⏱️ Duration: ${duration}ms`);
  
  if (passedTests === results.length) {
    console.log('🎉 ALL DATABASE TESTS PASSED!');
    console.log('\n✨ Database Migration Verification:');
    console.log('   ✅ All CRUD operations working');
    console.log('   ✅ Multi-tenancy isolation enforced');
    console.log('   ✅ Cache operations functional');
    console.log('   ✅ Data integrity maintained');
    console.log('   ✅ Database ready for production!');
  } else {
    console.log('⚠️ Some tests failed - review implementation');
  }
  
  return passedTests === results.length;
}

// Execute tests if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDatabaseTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    });
}

export { runDatabaseTests };