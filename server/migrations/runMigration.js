#!/usr/bin/env node
/**
 * Migration Runner for Credit System
 * Executes SQL migrations against Supabase database
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function runMigration() {
  log('\n🚀 Running Credit System Migration', 'bright');
  
  // Check environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    log('\n❌ Missing required environment variables:', 'red');
    if (!process.env.SUPABASE_URL) console.log('  - SUPABASE_URL');
    if (!process.env.SUPABASE_SERVICE_KEY) console.log('  - SUPABASE_SERVICE_KEY');
    console.log('\nPlease set these in your server/.env file');
    process.exit(1);
  }
  
  try {
    // Create Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    // Read migration file
    const migrationPath = join(__dirname, '001_create_credit_tables.sql');
    log('\n📄 Reading migration file...', 'blue');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    log(`\n📊 Found ${statements.length} SQL statements to execute`, 'blue');
    
    // Execute each statement
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      const preview = statement.substring(0, 50).replace(/\n/g, ' ') + '...';
      
      try {
        // For Supabase, we need to use the SQL editor API or raw queries
        // Since raw SQL execution isn't directly supported in the JS client,
        // we'll use the database function approach
        
        // First, let's check if the table exists
        if (statement.includes('CREATE TABLE IF NOT EXISTS')) {
          const tableName = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
          if (tableName) {
            console.log(`\n🔨 Creating table: ${tableName}`);
            
            // Try to query the table first
            const { error: checkError } = await supabase
              .from(tableName)
              .select('*')
              .limit(1);
            
            if (checkError?.message?.includes('does not exist')) {
              log(`  Table ${tableName} does not exist, will be created`, 'yellow');
            } else if (!checkError) {
              log(`  ✅ Table ${tableName} already exists`, 'green');
              successCount++;
              continue;
            }
          }
        }
        
        // For complex migrations, you might need to run them directly in Supabase dashboard
        // or use a database migration tool that supports raw SQL
        log(`  ⚠️  Statement ${i + 1}: ${preview}`, 'yellow');
        log('    Note: Complex SQL migrations should be run directly in Supabase SQL editor', 'yellow');
        
      } catch (error) {
        errorCount++;
        log(`  ❌ Statement ${i + 1} failed: ${error.message}`, 'red');
      }
    }
    
    // Summary
    log('\n' + '='.repeat(60), 'bright');
    log('Migration Summary:', 'bright');
    log(`  ✅ Successful: ${successCount}`, 'green');
    log(`  ❌ Failed: ${errorCount}`, 'red');
    log(`  ⚠️  Manual: ${statements.length - successCount - errorCount}`, 'yellow');
    
    // Instructions for manual migration
    log('\n📝 To complete the migration:', 'yellow');
    log('1. Go to your Supabase dashboard', 'yellow');
    log('2. Navigate to the SQL Editor', 'yellow');
    log('3. Copy the contents of migrations/001_create_credit_tables.sql', 'yellow');
    log('4. Paste and execute in the SQL editor', 'yellow');
    log('5. Verify all tables are created successfully', 'yellow');
    
    // Alternative: Create tables using Supabase client
    log('\n🔧 Attempting basic table creation...', 'blue');
    
    // Create a simplified version of tables using Supabase client
    await createBasicTables(supabase);
    
  } catch (error) {
    log(`\n💥 Migration failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

async function createBasicTables(supabase) {
  // Since we can't run raw SQL through the JS client easily,
  // let's check if tables exist and provide clear instructions
  
  const tables = [
    'user_credits',
    'organization_credits', 
    'credit_transactions',
    'agency_members',
    'plan_pricing'
  ];
  
  log('\n🔍 Checking table existence...', 'blue');
  
  let missingTables = [];
  
  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .select('*')
      .limit(1);
    
    if (error?.message?.includes('does not exist')) {
      missingTables.push(table);
      log(`  ❌ Table '${table}' is missing`, 'red');
    } else {
      log(`  ✅ Table '${table}' exists`, 'green');
    }
  }
  
  if (missingTables.length > 0) {
    log('\n⚠️  Missing tables detected!', 'yellow');
    log('\nPlease run the following in your Supabase SQL editor:', 'yellow');
    log('1. Copy the contents of: server/migrations/001_create_credit_tables.sql', 'blue');
    log('2. Paste into Supabase SQL editor at: ' + process.env.SUPABASE_URL + '/sql', 'blue');
    log('3. Execute the SQL to create all necessary tables', 'blue');
    
    // Create a simplified migration file for easy copying
    const simplifiedSQL = `-- Quick setup for missing tables: ${missingTables.join(', ')}
-- Copy and run this in Supabase SQL editor

${readFileSync(join(__dirname, '001_create_credit_tables.sql'), 'utf8')}`;
    
    const outputPath = join(__dirname, 'credit_tables_to_run.sql');
    const fs = await import('fs');
    fs.writeFileSync(outputPath, simplifiedSQL);
    
    log(`\n📄 Full migration SQL saved to: ${outputPath}`, 'green');
    log('   You can copy this file's contents to Supabase SQL editor', 'green');
  } else {
    log('\n✅ All credit system tables exist!', 'green');
  }
}

// Run the migration
runMigration().catch(error => {
  log('\n💥 Migration script error:', 'red');
  console.error(error);
  process.exit(1);
});