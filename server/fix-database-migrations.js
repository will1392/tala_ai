#!/usr/bin/env node
/**
 * Database Migration Fix Script for Tala AI
 * 
 * This script helps fix database migration issues by:
 * 1. Checking what's missing
 * 2. Providing SQL to run manually
 * 3. Guiding through the migration process
 */

import { getSupabaseService, getSupabaseAnon } from './db/supabaseClient.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Tala AI Database Migration Fix');
console.log('═'.repeat(60));

async function checkDatabaseStatus() {
  console.log('\n1️⃣  Checking database connection...');
  
  let client;
  let hasServiceAccess = false;
  
  try {
    client = getSupabaseService();
    hasServiceAccess = true;
    console.log('   ✅ Connected with service access');
  } catch (error) {
    try {
      client = getSupabaseAnon();
      console.log('   ⚠️  Connected with anonymous access (limited)');
    } catch (anonError) {
      console.log('   ❌ Cannot connect to database');
      return null;
    }
  }
  
  return { client, hasServiceAccess };
}

async function checkMissingTables(client) {
  console.log('\n2️⃣  Checking for missing tables...');
  
  const requiredTables = [
    // Core tables from schema.sql
    'organizations',
    'users',
    'conversations',
    'messages',
    'documents',
    'folders',
    'primary_folders',
    'tags',
    'document_tags',
    
    // Tables from migrations
    'migrations',
    'user_profiles',
    'conversation_contexts',
    'context_memories',
    'conversation_threads',
    'entity_extractions'
  ];
  
  const tableStatus = {};
  
  for (const table of requiredTables) {
    try {
      const { error } = await client
        .from(table)
        .select('id')
        .limit(1);
      
      if (error) {
        if (error.code === '42P01' || error.message.includes(`relation "${table}" does not exist`)) {
          tableStatus[table] = 'missing';
        } else if (error.message.includes('infinite recursion')) {
          tableStatus[table] = 'policy_error';
        } else {
          tableStatus[table] = 'error';
        }
      } else {
        tableStatus[table] = 'exists';
      }
    } catch (error) {
      tableStatus[table] = 'unknown';
    }
  }
  
  // Display results
  const missing = Object.entries(tableStatus).filter(([_, status]) => status === 'missing');
  const existing = Object.entries(tableStatus).filter(([_, status]) => status === 'exists');
  const errors = Object.entries(tableStatus).filter(([_, status]) => status === 'error' || status === 'policy_error');
  
  console.log(`\n   📊 Table Status:`);
  console.log(`   ✅ Existing: ${existing.length}`);
  console.log(`   ❌ Missing: ${missing.length}`);
  console.log(`   ⚠️  Errors: ${errors.length}`);
  
  if (missing.length > 0) {
    console.log('\n   Missing tables:');
    missing.forEach(([table]) => console.log(`   - ${table}`));
  }
  
  if (errors.length > 0) {
    console.log('\n   Tables with errors:');
    errors.forEach(([table, status]) => console.log(`   - ${table} (${status})`));
  }
  
  return { tableStatus, missing, existing, errors };
}

async function generateFixSQL() {
  console.log('\n3️⃣  Generating fix SQL...');
  
  const sqlFiles = [
    {
      path: path.join(__dirname, 'db', 'schema.sql'),
      description: 'Main database schema',
      priority: 1
    },
    {
      path: path.join(__dirname, 'db', 'migrations', 'create_migrations_table.sql'),
      description: 'Migrations tracking table',
      priority: 2
    },
    {
      path: path.join(__dirname, 'db', 'migrations', 'create-user-profiles-table.sql'),
      description: 'User profiles for onboarding',
      priority: 3
    },
    {
      path: path.join(__dirname, 'migrations', 'create-context-tables.sql'),
      description: 'Context management tables',
      priority: 4
    }
  ];
  
  const fixSQL = [];
  
  console.log('\n   📄 SQL files to apply:');
  
  for (const file of sqlFiles) {
    try {
      const exists = await fs.access(file.path).then(() => true).catch(() => false);
      if (exists) {
        const content = await fs.readFile(file.path, 'utf8');
        fixSQL.push({
          ...file,
          content,
          exists: true
        });
        console.log(`   ✅ ${file.description} (${file.path})`);
      } else {
        console.log(`   ❌ ${file.description} (file not found)`);
        fixSQL.push({
          ...file,
          exists: false
        });
      }
    } catch (error) {
      console.log(`   ❌ ${file.description} (error reading file)`);
    }
  }
  
  return fixSQL;
}

async function generateFixInstructions(tableStatus, sqlFiles) {
  console.log('\n' + '═'.repeat(60));
  console.log('📋 FIX INSTRUCTIONS');
  console.log('═'.repeat(60));
  
  console.log('\n🚨 IMPORTANT: The following SQL needs to be run manually in Supabase Dashboard');
  console.log('   because the RPC function for executing raw SQL is not available.\n');
  
  console.log('📝 Step-by-Step Instructions:\n');
  
  console.log('1. Go to your Supabase Dashboard');
  console.log('2. Select your project');
  console.log('3. Click "SQL Editor" in the left sidebar');
  console.log('4. Click "New Query"');
  console.log('5. Run the following SQL files in order:\n');
  
  // Sort by priority
  const sortedFiles = sqlFiles
    .filter(f => f.exists)
    .sort((a, b) => a.priority - b.priority);
  
  for (let i = 0; i < sortedFiles.length; i++) {
    const file = sortedFiles[i];
    console.log(`   ${i + 1}. ${file.description}`);
    console.log(`      File: ${file.path}`);
    console.log(`      Copy the contents and run in SQL Editor\n`);
  }
  
  // Generate combined fix script
  console.log('💡 Alternative: Use the generated combined script:\n');
  
  const combinedPath = path.join(__dirname, 'fix-missing-tables.sql');
  let combinedSQL = `-- Tala AI Database Fix Script
-- Generated on ${new Date().toISOString()}
-- 
-- This script creates all missing tables
-- Review before running in production!

`;

  for (const file of sortedFiles) {
    combinedSQL += `\n-- =========================================\n`;
    combinedSQL += `-- ${file.description}\n`;
    combinedSQL += `-- From: ${file.path}\n`;
    combinedSQL += `-- =========================================\n\n`;
    combinedSQL += file.content;
    combinedSQL += `\n\n`;
  }
  
  // Add RLS policy fixes
  if (tableStatus.users === 'policy_error') {
    combinedSQL += `\n-- =========================================\n`;
    combinedSQL += `-- Fix RLS Policy Issues\n`;
    combinedSQL += `-- =========================================\n\n`;
    combinedSQL += `-- Temporarily disable RLS to fix infinite recursion\n`;
    combinedSQL += `ALTER TABLE users DISABLE ROW LEVEL SECURITY;\n\n`;
    combinedSQL += `-- Drop problematic policies\n`;
    combinedSQL += `DROP POLICY IF EXISTS "Users can view organization members" ON users;\n`;
    combinedSQL += `DROP POLICY IF EXISTS "Users can update own profile" ON users;\n\n`;
    combinedSQL += `-- Re-enable RLS with fixed policies\n`;
    combinedSQL += `ALTER TABLE users ENABLE ROW LEVEL SECURITY;\n\n`;
    combinedSQL += `-- Create simplified policies\n`;
    combinedSQL += `CREATE POLICY "Enable read access for all users" ON users\n`;
    combinedSQL += `    FOR SELECT USING (true);\n\n`;
    combinedSQL += `CREATE POLICY "Enable update for users based on id" ON users\n`;
    combinedSQL += `    FOR UPDATE USING (auth.uid()::text = id);\n`;
  }
  
  await fs.writeFile(combinedPath, combinedSQL);
  console.log(`   ✅ Combined fix script saved to: ${combinedPath}`);
  console.log('   📋 Copy this file's contents to Supabase SQL Editor and run\n');
  
  console.log('6. After running the SQL:');
  console.log('   - Run: npm run migrate:status');
  console.log('   - Run: npm run migrate');
  console.log('   - Test the application\n');
  
  console.log('⚠️  Common Issues and Solutions:\n');
  console.log('   • "permission denied" errors:');
  console.log('     → Make sure you\'re using the service role key');
  console.log('     → Check RLS policies on tables\n');
  console.log('   • "infinite recursion" in policies:');
  console.log('     → Temporarily disable RLS: ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;');
  console.log('     → Fix or remove problematic policies');
  console.log('     → Re-enable RLS with corrected policies\n');
  console.log('   • "relation does not exist" errors:');
  console.log('     → Run the schema.sql file first');
  console.log('     → Then run migration files in order\n');
}

async function main() {
  try {
    // Check database connection
    const dbStatus = await checkDatabaseStatus();
    if (!dbStatus) {
      console.log('\n❌ Cannot proceed without database connection');
      console.log('💡 Check your .env file for:');
      console.log('   - SUPABASE_URL');
      console.log('   - SUPABASE_ANON_KEY');
      console.log('   - SUPABASE_SERVICE_KEY (recommended)');
      return;
    }
    
    // Check missing tables
    const { tableStatus, missing, errors } = await checkMissingTables(dbStatus.client);
    
    // Generate fix SQL
    const sqlFiles = await generateFixSQL();
    
    // Generate instructions
    await generateFixInstructions(tableStatus, sqlFiles);
    
    console.log('📖 Additional Resources:');
    console.log('   • Supabase Migrations Guide: https://supabase.com/docs/guides/cli/migrations');
    console.log('   • RLS Policies: https://supabase.com/docs/guides/auth/row-level-security');
    console.log('   • Database Functions: https://supabase.com/docs/guides/database/functions\n');
    
  } catch (error) {
    console.error('\n💥 Fix script failed:', error.message);
    console.error(error.stack);
  }
}

main();