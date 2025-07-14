/**
 * Database Setup Test Script
 * 
 * Tests Supabase configuration, connection, and schema setup
 */

import dotenv from 'dotenv';
dotenv.config();

import { 
  getSupabaseHealth, 
  testDatabaseConnection, 
  checkSchemaStatus,
  getDatabaseStats
} from './db/supabaseClient.js';
import { validateDatabaseConfig, logDatabaseStatus } from './config/database.js';
import { runSchemaMigration, migrateJsonData } from './db/migrate.js';

console.log('🧪 TESTING DATABASE SETUP');
console.log('=' .repeat(50));

async function testDatabaseSetup() {
  
  // Step 1: Configuration Test
  console.log('\n1️⃣  Testing Configuration...');
  console.log('-'.repeat(30));
  
  const configValidation = validateDatabaseConfig();
  
  if (configValidation.valid) {
    console.log('✅ Configuration is valid');
    if (configValidation.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      configValidation.warnings.forEach(warning => {
        console.log(`   ${warning}`);
      });
    }
  } else {
    console.log('❌ Configuration is invalid');
    console.log('Missing:', configValidation.missing.join(', '));
    console.log('\n💡 Add missing environment variables to .env file:');
    configValidation.missing.forEach(field => {
      console.log(`   ${field}=your-value-here`);
    });
    return;
  }

  // Step 2: Connection Test
  console.log('\n2️⃣  Testing Database Connection...');
  console.log('-'.repeat(30));
  
  const connectionTest = await testDatabaseConnection();
  
  if (connectionTest.success) {
    console.log('✅ Database connection successful');
    console.log(`   Schema version: ${connectionTest.version}`);
  } else {
    console.log('❌ Database connection failed');
    console.log(`   Error: ${connectionTest.error}`);
    
    if (connectionTest.type === 'connection_error') {
      console.log('\n💡 Troubleshooting:');
      console.log('   1. Check your SUPABASE_URL');
      console.log('   2. Verify your SUPABASE_ANON_KEY');
      console.log('   3. Ensure your Supabase project is active');
    }
    return;
  }

  // Step 3: Schema Status
  console.log('\n3️⃣  Checking Schema Status...');
  console.log('-'.repeat(30));
  
  const schemaStatus = await checkSchemaStatus();
  
  if (schemaStatus.success) {
    if (schemaStatus.schemaExists) {
      console.log('✅ Database schema exists');
      console.log(`   Tables found: ${schemaStatus.existingTables.join(', ')}`);
    } else {
      console.log('⚠️  Database schema not found');
      if (schemaStatus.missingTables.length > 0) {
        console.log(`   Missing tables: ${schemaStatus.missingTables.join(', ')}`);
      }
      console.log('\n💡 Run schema migration:');
      console.log('   node db/migrate.js schema');
    }
  } else {
    console.log('❌ Schema check failed');
    console.log(`   Error: ${schemaStatus.error}`);
  }

  // Step 4: Health Check
  console.log('\n4️⃣  Overall Health Check...');
  console.log('-'.repeat(30));
  
  const health = await getSupabaseHealth();
  
  console.log(`Status: ${health.status.toUpperCase()}`);
  console.log(`Configured: ${health.configured ? 'Yes' : 'No'}`);
  console.log(`Connected: ${health.connected ? 'Yes' : 'No'}`);
  console.log(`Schema Exists: ${health.schemaExists ? 'Yes' : 'No'}`);
  
  if (health.clients) {
    console.log(`Anonymous Client: ${health.clients.anonymous ? 'Ready' : 'Not Ready'}`);
    console.log(`Service Client: ${health.clients.service ? 'Ready' : 'Not Ready'}`);
  }

  // Step 5: Database Statistics (if schema exists)
  if (health.schemaExists) {
    console.log('\n5️⃣  Database Statistics...');
    console.log('-'.repeat(30));
    
    const stats = await getDatabaseStats();
    
    if (stats.success) {
      console.log('📊 Table Row Counts:');
      Object.entries(stats.tables).forEach(([table, count]) => {
        if (count !== 'error') {
          console.log(`   ${table}: ${count} records`);
        }
      });
    } else {
      console.log('❌ Failed to get database statistics');
    }
  }

  // Step 6: Migration Options
  console.log('\n6️⃣  Migration Options...');
  console.log('-'.repeat(30));
  
  if (!health.schemaExists) {
    console.log('📋 Available migration commands:');
    console.log('   node db/migrate.js schema         # Create database schema');
    console.log('   node db/migrate.js data --dry-run # Test data migration');
    console.log('   node db/migrate.js data           # Migrate JSON data');
    console.log('   node db/migrate.js full --dry-run # Test full migration');
    console.log('   node db/migrate.js full           # Complete migration');
  } else {
    console.log('✅ Schema exists - ready for data migration or use');
    console.log('   node db/migrate.js data --dry-run # Test data migration');
    console.log('   node db/migrate.js data           # Migrate JSON data');
  }

  // Step 7: Environment Recommendations
  console.log('\n7️⃣  Environment Recommendations...');
  console.log('-'.repeat(30));
  
  if (health.status === 'healthy') {
    console.log('✅ Database setup is complete and healthy');
    console.log('\n🚀 Next Steps:');
    console.log('   1. Run data migration if needed');
    console.log('   2. Enable dual-write mode: ENABLE_DUAL_WRITE=true');
    console.log('   3. Test with your application');
    console.log('   4. Gradually switch to database reads');
  } else {
    console.log('⚠️  Database setup needs attention');
    console.log('\n🔧 Required Actions:');
    
    if (!health.configured) {
      console.log('   1. Complete environment configuration');
    }
    
    if (!health.connected) {
      console.log('   2. Fix database connection issues');
    }
    
    if (!health.schemaExists) {
      console.log('   3. Run schema migration');
    }
  }

  console.log('\n🏁 Database Setup Test Completed');
  console.log('=' .repeat(50));
}

// Interactive migration helper
async function interactiveMigration() {
  console.log('\n🔄 INTERACTIVE MIGRATION HELPER');
  console.log('=' .repeat(40));
  
  const health = await getSupabaseHealth();
  
  if (!health.configured) {
    console.log('❌ Database not configured. Please add environment variables first.');
    return;
  }
  
  if (!health.connected) {
    console.log('❌ Cannot connect to database. Please check your configuration.');
    return;
  }
  
  if (!health.schemaExists) {
    console.log('📋 Schema not found. Running schema migration...');
    const schemaResult = await runSchemaMigration();
    
    if (!schemaResult.success) {
      console.log('❌ Schema migration failed');
      return;
    }
  }
  
  console.log('📂 Testing data migration (dry run)...');
  const dryRunResult = await migrateJsonData({ dryRun: true });
  
  if (dryRunResult.success) {
    console.log('✅ Dry run successful');
    console.log('\n📊 Would migrate:');
    Object.entries(dryRunResult.results).forEach(([type, stats]) => {
      console.log(`   ${type}: ${stats.migrated} records`);
    });
    
    console.log('\n💡 To proceed with actual migration:');
    console.log('   node db/migrate.js data');
  } else {
    console.log('❌ Dry run failed:', dryRunResult.error);
  }
}

// Run the appropriate test based on command line arguments
const command = process.argv[2];

switch (command) {
  case 'migrate':
    interactiveMigration();
    break;
  case 'status':
    logDatabaseStatus();
    break;
  default:
    testDatabaseSetup();
    break;
}

export default testDatabaseSetup;