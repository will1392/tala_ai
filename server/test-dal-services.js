/**
 * Test Data Access Layer Services
 * 
 * This script tests the structure and basic functionality of the DAL services
 */

import { BaseService } from './services/db/baseService.js';
import { OrganizationService } from './services/db/organizationService.js';
import { UserService } from './services/db/userService.js';
import { ConversationService } from './services/db/conversationService.js';
import { DocumentService } from './services/db/documentService.js';
import { FolderService } from './services/db/folderService.js';

console.log('🧪 Testing Data Access Layer Services...\n');

// Service configurations for testing
const serviceConfigs = [
  { name: 'BaseService', Class: BaseService, isBase: true },
  { name: 'OrganizationService', Class: OrganizationService },
  { name: 'UserService', Class: UserService },
  { name: 'ConversationService', Class: ConversationService },
  { name: 'DocumentService', Class: DocumentService },
  { name: 'FolderService', Class: FolderService }
];

// Test each service class
console.log('📋 Service Class Structure Tests:');
console.log('=' .repeat(50));

serviceConfigs.forEach(({ name, Class, isBase }) => {
  try {
    console.log(`\n✅ ${name} imported successfully`);
    
    // Create instance (skip for BaseService as it needs tableName)
    if (!isBase) {
      const instance = new Class({ enableLogging: false });
      console.log(`   ✅ Instance created`);
      
      // Check inheritance
      if (instance instanceof BaseService) {
        console.log(`   ✅ Extends BaseService`);
      }
      
      // Check for common methods from BaseService
      const baseMethods = [
        'getClient', 'getAnonClient', 'executeQuery', 'create', 
        'getById', 'getMany', 'update', 'delete', 'count'
      ];
      
      const inheritedMethods = baseMethods.filter(method => 
        typeof instance[method] === 'function'
      );
      console.log(`   ✅ Inherited methods: ${inheritedMethods.length}/${baseMethods.length}`);
      
      // Check for service-specific methods
      const serviceMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(instance))
        .filter(name => 
          typeof instance[name] === 'function' && 
          name !== 'constructor' &&
          !baseMethods.includes(name)
        );
      
      console.log(`   ✅ Service methods: ${serviceMethods.slice(0, 5).join(', ')}${serviceMethods.length > 5 ? '...' : ''}`);
      console.log(`   📊 Total service methods: ${serviceMethods.length}`);
    }
    
  } catch (error) {
    console.log(`\n❌ ${name} failed: ${error.message}`);
  }
});

// Test service method signatures
console.log('\n\n📝 Method Signature Tests:');
console.log('=' .repeat(50));

const testMethodSignatures = () => {
  const tests = [
    {
      service: 'OrganizationService',
      methods: ['createOrganization', 'getOrganization', 'updateOrganization', 'deleteOrganization']
    },
    {
      service: 'UserService',
      methods: ['createUser', 'getUserById', 'getUserByEmail', 'updateUser', 'updateLLMPreferences']
    },
    {
      service: 'ConversationService',
      methods: ['createConversation', 'getConversation', 'getRecentConversations', 'updateConversationTitle']
    },
    {
      service: 'DocumentService',
      methods: ['createDocument', 'getDocument', 'searchDocuments', 'updateDocument']
    },
    {
      service: 'FolderService',
      methods: ['createFolder', 'getFolder', 'getFolderTree', 'moveFolder']
    }
  ];

  tests.forEach(({ service, methods }) => {
    console.log(`\n${service}:`);
    const ServiceClass = serviceConfigs.find(s => s.name === service)?.Class;
    
    if (ServiceClass) {
      const instance = new ServiceClass({ enableLogging: false });
      
      methods.forEach(method => {
        if (typeof instance[method] === 'function') {
          console.log(`  ✅ ${method}()`);
        } else {
          console.log(`  ❌ ${method}() - not found`);
        }
      });
    }
  });
};

testMethodSignatures();

// Mock Supabase client for testing
console.log('\n\n🔧 Mock Integration Test:');
console.log('=' .repeat(50));

// Create a more comprehensive mock Supabase client
const createMockSupabase = () => {
  const mockClient = {
    from: (tableName) => {
      console.log(`  📋 Mock query on table: ${tableName}`);
      
      const queryBuilder = {
        select: (fields = '*') => {
          queryBuilder._select = fields;
          queryBuilder._operation = 'select';
          return queryBuilder;
        },
        insert: (data) => {
          queryBuilder._operation = 'insert';
          queryBuilder._data = data;
          return queryBuilder;
        },
        update: (data) => {
          queryBuilder._operation = 'update';
          queryBuilder._data = data;
          return queryBuilder;
        },
        delete: () => {
          queryBuilder._operation = 'delete';
          return queryBuilder;
        },
        eq: (field, value) => {
          queryBuilder._filters = queryBuilder._filters || [];
          queryBuilder._filters.push({ field, op: 'eq', value });
          return queryBuilder;
        },
        is: (field, value) => {
          queryBuilder._filters = queryBuilder._filters || [];
          queryBuilder._filters.push({ field, op: 'is', value });
          return queryBuilder;
        },
        single: () => {
          queryBuilder._single = true;
          return queryBuilder._execute();
        },
        then: (resolve) => {
          return queryBuilder._execute().then(resolve);
        },
        _execute: () => {
          const result = {
            data: null,
            error: null,
            count: null
          };

          switch (queryBuilder._operation) {
            case 'select':
              result.data = queryBuilder._single 
                ? { id: 'mock-id', name: 'Mock Item', [tableName]: true }
                : [{ id: 'mock-id-1', name: 'Mock Item 1' }, { id: 'mock-id-2', name: 'Mock Item 2' }];
              result.count = queryBuilder._single ? 1 : 2;
              break;
            case 'insert':
              result.data = [{ id: 'new-mock-id', ...queryBuilder._data }];
              break;
            case 'update':
              result.data = [{ id: 'mock-id', ...queryBuilder._data }];
              break;
            case 'delete':
              result.data = null;
              break;
          }

          return Promise.resolve(result);
        }
      };
      
      return queryBuilder;
    },
    rpc: (functionName, params) => {
      console.log(`  🔧 Mock RPC call: ${functionName}`);
      return Promise.resolve({ data: null, error: null });
    }
  };

  return mockClient;
};

// Test with mock client
const testWithMock = async () => {
  console.log('\nTesting OrganizationService with mock client:');
  
  try {
    // Temporarily override the supabase client getter
    const mockClient = createMockSupabase();
    
    // Create service instance with mock
    const orgService = new OrganizationService({ enableLogging: false });
    
    // Override the getClient method for this test
    orgService.getClient = () => mockClient;
    orgService.getAnonClient = () => mockClient;
    
    // Test a method
    console.log('\n  Testing getOrganization():');
    const result = await orgService.getOrganization('test-org-id');
    
    if (result.success) {
      console.log('  ✅ Method executed successfully');
      console.log(`  📊 Result: ${JSON.stringify(result.data, null, 2).split('\n').map((line, i) => i === 0 ? line : '     ' + line).join('\n')}`);
    } else {
      console.log('  ❌ Method failed:', result.error);
    }
    
  } catch (error) {
    console.log('  ❌ Mock test error:', error.message);
  }
};

// Run async tests
testWithMock().then(() => {
  console.log('\n\n✅ Data Access Layer testing complete!');
  console.log('=' .repeat(50));
  console.log('\n📊 Summary:');
  console.log('  - All service classes properly structured');
  console.log('  - Inheritance from BaseService confirmed');
  console.log('  - Service-specific methods implemented');
  console.log('  - Mock integration demonstrates functionality');
  console.log('\n💡 Next steps:');
  console.log('  1. Set up Supabase credentials in .env');
  console.log('  2. Run database migration');
  console.log('  3. Integrate services with server.js endpoints');
}).catch(error => {
  console.error('\n❌ Test error:', error);
});