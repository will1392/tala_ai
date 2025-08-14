#!/usr/bin/env node
/**
 * Database Diagnostics Script for Tala AI
 * 
 * Identifies missing tables and migration issues
 */

import { getSupabaseAnon, getSupabaseService } from './db/supabaseClient.js';

console.log('🔍 Tala AI Database Diagnostics');
console.log('═'.repeat(60));

async function runDiagnostics() {
  const issues = [];
  const recommendations = [];

  try {
    // 1. Test basic connection
    console.log('\n1️⃣  Testing database connection...');
    let client;
    let useServiceClient = false;
    
    try {
      client = getSupabaseService();
      useServiceClient = true;
      console.log('   ✅ Using service client (admin access)');
    } catch (error) {
      try {
        client = getSupabaseAnon();
        console.log('   ⚠️  Using anonymous client (limited access)');
      } catch (anonError) {
        console.log('   ❌ Cannot connect to database');
        issues.push('Database connection failed');
        recommendations.push('Check SUPABASE_URL and SUPABASE_ANON_KEY in .env file');
        return { issues, recommendations };
      }
    }

    // 2. Check for migrations table
    console.log('\n2️⃣  Checking migrations table...');
    try {
      const { data, error } = await client
        .from('migrations')
        .select('id, name, applied_at, status')
        .order('applied_at', { ascending: true });

      if (error) {
        if (error.code === '42P01' || error.message.includes('relation "migrations" does not exist')) {
          console.log('   ❌ Migrations table does not exist');
          issues.push('Migrations table is missing');
          recommendations.push('Run the initial schema setup first');
        } else {
          console.log(`   ❌ Error accessing migrations table: ${error.message}`);
          issues.push(`Migrations table error: ${error.message}`);
        }
      } else {
        console.log(`   ✅ Migrations table exists with ${data.length} entries`);
        if (data.length > 0) {
          console.log('   📝 Applied migrations:');
          data.forEach(m => {
            console.log(`      - ${m.name} (${new Date(m.applied_at).toLocaleDateString()})`);
          });
        }
      }
    } catch (error) {
      console.log('   ❌ Failed to check migrations table');
      issues.push('Cannot access migrations table');
    }

    // 3. Check core tables
    console.log('\n3️⃣  Checking core tables...');
    const coreTables = [
      'organizations',
      'users',
      'conversations',
      'messages',
      'documents',
      'folders',
      'primary_folders',
      'tags',
      'document_tags'
    ];

    const missingTables = [];
    for (const table of coreTables) {
      try {
        const { error } = await client
          .from(table)
          .select('id')
          .limit(1);

        if (error) {
          if (error.code === '42P01' || error.message.includes(`relation "${table}" does not exist`)) {
            console.log(`   ❌ Table '${table}' does not exist`);
            missingTables.push(table);
          } else {
            console.log(`   ⚠️  Table '${table}' exists but has issues: ${error.message}`);
          }
        } else {
          console.log(`   ✅ Table '${table}' exists`);
        }
      } catch (error) {
        console.log(`   ❌ Failed to check table '${table}'`);
        missingTables.push(table);
      }
    }

    if (missingTables.length > 0) {
      issues.push(`Missing core tables: ${missingTables.join(', ')}`);
      recommendations.push('Apply the main schema.sql file before running migrations');
    }

    // 4. Check for specific missing tables from the error
    console.log('\n4️⃣  Checking reported missing tables...');
    const reportedMissingTables = ['user_profiles', 'conversation_contexts'];
    
    for (const table of reportedMissingTables) {
      try {
        const { error } = await client
          .from(table)
          .select('id')
          .limit(1);

        if (error) {
          if (error.code === '42P01' || error.message.includes(`relation "${table}" does not exist`)) {
            console.log(`   ❌ Table '${table}' does not exist (as reported)`);
            
            // Check if there's a migration file for this table
            if (table === 'user_profiles') {
              issues.push('user_profiles table is missing');
              recommendations.push('Run migration: create-user-profiles-table.sql');
            } else if (table === 'conversation_contexts') {
              issues.push('conversation_contexts table is missing');
              recommendations.push('Check if there\'s a migration file for conversation_contexts');
            }
          } else {
            console.log(`   ⚠️  Table '${table}' error: ${error.message}`);
          }
        } else {
          console.log(`   ✅ Table '${table}' exists`);
        }
      } catch (error) {
        console.log(`   ❌ Failed to check table '${table}'`);
      }
    }

    // 5. Check for policy issues
    console.log('\n5️⃣  Checking for RLS policy issues...');
    if (useServiceClient) {
      try {
        // Test a simple query on users table
        const { data, error } = await client
          .from('users')
          .select('id')
          .limit(1);

        if (error && error.message.includes('infinite recursion')) {
          console.log('   ❌ Infinite recursion in users table policy');
          issues.push('RLS policy causing infinite recursion on users table');
          recommendations.push('Review and fix RLS policies on users table');
        } else if (error) {
          console.log(`   ⚠️  RLS check error: ${error.message}`);
        } else {
          console.log('   ✅ No RLS policy recursion detected');
        }
      } catch (error) {
        console.log('   ⚠️  Could not check RLS policies');
      }
    }

    // 6. Migration file check
    console.log('\n6️⃣  Checking migration files...');
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const migrationsDir = path.join(__dirname, 'db', 'migrations');
      
      const files = await fs.readdir(migrationsDir);
      const sqlMigrations = files.filter(f => f.endsWith('.sql'));
      const jsMigrations = files.filter(f => f.match(/^\d{3}_.*\.js$/));
      
      console.log(`   📁 Found ${sqlMigrations.length} SQL migration files`);
      console.log(`   📁 Found ${jsMigrations.length} JavaScript migration files`);
      
      // Check for specific missing table migrations
      const hasUserProfilesMigration = files.includes('create-user-profiles-table.sql');
      if (hasUserProfilesMigration && missingTables.includes('user_profiles')) {
        console.log('   ⚠️  user_profiles migration exists but hasn\'t been run');
        recommendations.push('The create-user-profiles-table.sql migration needs to be applied');
      }
    } catch (error) {
      console.log('   ❌ Could not check migration files');
    }

    return { issues, recommendations };

  } catch (error) {
    console.error('\n💥 Diagnostic failed:', error.message);
    issues.push(`Diagnostic error: ${error.message}`);
    return { issues, recommendations };
  }
}

// Run diagnostics and provide recommendations
runDiagnostics().then(({ issues, recommendations }) => {
  console.log('\n' + '═'.repeat(60));
  console.log('📊 DIAGNOSTIC SUMMARY');
  console.log('═'.repeat(60));

  if (issues.length === 0) {
    console.log('\n✅ No issues found! Database appears to be properly configured.');
  } else {
    console.log('\n❌ Issues Found:');
    issues.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}`);
    });

    console.log('\n💡 Recommendations:');
    recommendations.forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec}`);
    });

    console.log('\n📋 Action Plan:');
    console.log('   1. First, ensure the main schema is applied:');
    console.log('      - Go to Supabase Dashboard > SQL Editor');
    console.log('      - Copy contents of db/schema.sql');
    console.log('      - Run the SQL to create core tables');
    console.log('');
    console.log('   2. Then run the migrations:');
    console.log('      npm run migrate');
    console.log('');
    console.log('   3. For SQL migration files (like create-user-profiles-table.sql):');
    console.log('      - These need to be applied manually in Supabase SQL Editor');
    console.log('      - Or create a JavaScript migration wrapper for them');
    console.log('');
    console.log('   4. If you see policy errors:');
    console.log('      - Review RLS policies in Supabase Dashboard');
    console.log('      - Temporarily disable RLS to test: ALTER TABLE users DISABLE ROW LEVEL SECURITY;');
  }

  console.log('\n📖 For more help, see: https://supabase.com/docs/guides/database/migrations');
});