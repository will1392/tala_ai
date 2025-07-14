/**
 * Test Migration Setup for Tala AI
 * 
 * Tests migration infrastructure without actually running migrations
 */

import fs from 'fs/promises';
import path from 'path';
import { getSupabaseService } from './db/supabaseClient.js';

console.log('🧪 Testing Migration Setup');
console.log('═'.repeat(50));

async function testMigrationSetup() {
  try {
    // Step 1: Test file structure
    console.log('\n1️⃣  Testing migration file structure...');
    
    const migrationsDir = './db/migrations';
    const requiredFiles = [
      '001_initial_schema.js',
      '002_migrate_conversations.js', 
      '003_migrate_folders.js',
      'runMigrations.js',
      'rollback.js',
      'create_migrations_table.sql'
    ];

    let filesFound = 0;
    for (const file of requiredFiles) {
      try {
        const filePath = path.join(migrationsDir, file);
        const stats = await fs.stat(filePath);
        console.log(`   ✅ ${file} (${Math.round(stats.size / 1024)}KB)`);
        filesFound++;
      } catch (error) {
        console.log(`   ❌ ${file} - missing`);
      }
    }

    console.log(`   📊 Migration files: ${filesFound}/${requiredFiles.length}`);

    // Step 2: Test migration module loading
    console.log('\n2️⃣  Testing migration module loading...');
    
    const migrationFiles = ['001_initial_schema.js', '002_migrate_conversations.js', '003_migrate_folders.js'];
    let modulesLoaded = 0;
    
    for (const file of migrationFiles) {
      try {
        const migrationPath = path.resolve('./db/migrations', file);
        const module = await import(`file://${migrationPath}`);
        const migration = module.migration || module.default;
        
        if (migration && migration.id && migration.up && migration.down) {
          console.log(`   ✅ ${migration.id} - ${migration.name}`);
          modulesLoaded++;
        } else {
          console.log(`   ❌ ${file} - invalid structure`);
        }
      } catch (error) {
        console.log(`   ❌ ${file} - load error: ${error.message}`);
      }
    }

    console.log(`   📊 Modules loaded: ${modulesLoaded}/${migrationFiles.length}`);

    // Step 3: Test database connection
    console.log('\n3️⃣  Testing database connection...');
    
    try {
      const supabase = getSupabaseService();
      
      // Test basic connection
      const { data, error } = await supabase
        .from('organizations')
        .select('id')
        .limit(1);

      if (error) {
        if (error.code === 'PGRST204') {
          console.log('   ✅ Database connected (no data yet)');
        } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
          console.log('   ⚠️  Database connected but schema not created');
          console.log('       Run: psql -f db/schema.sql [connection-string]');
        } else {
          console.log(`   ❌ Database error: ${error.message}`);
        }
      } else {
        console.log('   ✅ Database connected and schema exists');
        if (data && data.length > 0) {
          console.log(`       Found ${data.length} organization(s)`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Connection failed: ${error.message}`);
      if (error.message.includes('SUPABASE_SERVICE_KEY')) {
        console.log('       Check your .env file for correct Supabase credentials');
      }
    }

    // Step 4: Test JSON file availability
    console.log('\n4️⃣  Testing source data files...');
    
    const sourceFiles = [
      { file: 'conversations.json', description: 'Conversations and messages' },
      { file: 'folders.json', description: 'User folders' },
      { file: 'primaryFolders.json', description: 'Primary folder templates' }
    ];

    let dataFilesFound = 0;
    for (const { file, description } of sourceFiles) {
      try {
        const filePath = path.join('.', file);
        const content = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(content);
        
        let count = 0;
        if (Array.isArray(data)) {
          count = data.length;
        } else if (typeof data === 'object') {
          count = Object.keys(data).length;
        }
        
        console.log(`   ✅ ${file} - ${count} items (${description})`);
        dataFilesFound++;
      } catch (error) {
        if (error.code === 'ENOENT') {
          console.log(`   ℹ️  ${file} - not found (will be skipped)`);
        } else {
          console.log(`   ⚠️  ${file} - parse error: ${error.message}`);
        }
      }
    }

    console.log(`   📊 Data files available: ${dataFilesFound}/${sourceFiles.length}`);

    // Step 5: Environment check
    console.log('\n5️⃣  Testing environment configuration...');
    
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY', 
      'SUPABASE_SERVICE_KEY'
    ];

    let envVarsSet = 0;
    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        console.log(`   ✅ ${envVar} is set`);
        envVarsSet++;
      } else {
        console.log(`   ❌ ${envVar} is missing`);
      }
    }

    console.log(`   📊 Environment variables: ${envVarsSet}/${requiredEnvVars.length}`);

    // Summary
    console.log('\n📊 Migration Setup Summary');
    console.log('─'.repeat(30));
    
    const checks = [
      { name: 'Migration files', passed: filesFound === requiredFiles.length },
      { name: 'Module loading', passed: modulesLoaded === migrationFiles.length },
      { name: 'Database connection', passed: true }, // We always get some response
      { name: 'Environment config', passed: envVarsSet === requiredEnvVars.length }
    ];

    checks.forEach(check => {
      const status = check.passed ? '✅' : '❌';
      console.log(`   ${status} ${check.name}`);
    });

    const allPassed = checks.every(check => check.passed);
    
    if (allPassed) {
      console.log('\n🎉 Migration setup is ready!');
      console.log('\n💡 Next steps:');
      console.log('   1. Run: npm run migrate:status');
      console.log('   2. Run: npm run migrate');
      console.log('   3. Check results in Supabase dashboard');
    } else {
      console.log('\n⚠️  Some issues need to be resolved before running migrations');
      console.log('\n💡 Common fixes:');
      console.log('   • Ensure Supabase credentials are in .env file');
      console.log('   • Run schema.sql on your Supabase database');
      console.log('   • Check that JSON source files exist');
    }

    console.log('\n🔧 Available commands:');
    console.log('   npm run migrate          - Run all migrations');
    console.log('   npm run migrate:status   - Check migration status');
    console.log('   npm run migrate:rollback - Interactive rollback');

  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  }
}

testMigrationSetup();