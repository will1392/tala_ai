#!/usr/bin/env node
/**
 * SQL Migration Helper for Tala AI
 * 
 * Helps identify and apply SQL migration files that need to be run manually
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSupabaseService } from './db/supabaseClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🗄️  Tala AI SQL Migration Helper');
console.log('═'.repeat(60));

async function findSQLMigrations() {
  const migrationsDir = path.join(__dirname, 'db', 'migrations');
  const files = await fs.readdir(migrationsDir);
  
  // Find all SQL files
  const sqlFiles = files
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`\n📁 Found ${sqlFiles.length} SQL migration files:`);
  
  const migrations = [];
  for (const file of sqlFiles) {
    const filePath = path.join(migrationsDir, file);
    const content = await fs.readFile(filePath, 'utf8');
    const firstLine = content.split('\n')[0];
    const description = firstLine.startsWith('--') ? firstLine.replace('--', '').trim() : file;
    
    migrations.push({
      file,
      path: filePath,
      description,
      content
    });
    
    console.log(`   • ${file}`);
    if (description !== file) {
      console.log(`     ${description}`);
    }
  }
  
  return migrations;
}

async function checkMigrationStatus(client, migrations) {
  console.log('\n🔍 Checking migration status...');
  
  const status = [];
  
  for (const migration of migrations) {
    let applied = false;
    let error = null;
    
    // Special checks for known tables
    if (migration.file === 'create-user-profiles-table.sql') {
      try {
        const { error: checkError } = await client
          .from('user_profiles')
          .select('id')
          .limit(1);
        
        if (!checkError || checkError.code !== '42P01') {
          applied = true;
        }
      } catch (e) {
        error = e.message;
      }
    } else if (migration.file === 'create_migrations_table.sql') {
      try {
        const { error: checkError } = await client
          .from('migrations')
          .select('id')
          .limit(1);
        
        if (!checkError || checkError.code !== '42P01') {
          applied = true;
        }
      } catch (e) {
        error = e.message;
      }
    }
    // Add more specific checks as needed
    
    status.push({
      ...migration,
      applied,
      error
    });
  }
  
  return status;
}

async function generateMigrationScript(migrations) {
  console.log('\n📝 Generating combined migration script...');
  
  let script = `-- Tala AI Combined SQL Migrations
-- Generated on ${new Date().toISOString()}
-- 
-- IMPORTANT: Review this script before running in production!
-- Some migrations may need to be run in a specific order.

`;

  // Order migrations by priority
  const priorityOrder = [
    'create_migrations_table.sql',
    'create-user-profiles-table.sql',
    // Add other migrations in order
  ];
  
  const orderedMigrations = [
    ...migrations.filter(m => priorityOrder.includes(m.file)),
    ...migrations.filter(m => !priorityOrder.includes(m.file))
  ];
  
  for (const migration of orderedMigrations) {
    script += `\n-- =========================================\n`;
    script += `-- Migration: ${migration.file}\n`;
    script += `-- ${migration.description}\n`;
    script += `-- =========================================\n\n`;
    script += migration.content;
    script += `\n\n`;
  }
  
  const outputPath = path.join(__dirname, 'combined-migrations.sql');
  await fs.writeFile(outputPath, script);
  
  return outputPath;
}

async function main() {
  try {
    // Find SQL migrations
    const migrations = await findSQLMigrations();
    
    // Check connection
    console.log('\n🔗 Checking database connection...');
    let client;
    try {
      client = getSupabaseService();
      console.log('   ✅ Connected to database');
    } catch (error) {
      console.log('   ❌ Cannot connect to database');
      console.log('   💡 Check your .env configuration');
      return;
    }
    
    // Check migration status
    const status = await checkMigrationStatus(client, migrations);
    
    const pending = status.filter(s => !s.applied);
    const applied = status.filter(s => s.applied);
    
    console.log(`\n📊 Migration Status:`);
    console.log(`   ✅ Applied: ${applied.length}`);
    console.log(`   ⏳ Pending: ${pending.length}`);
    
    if (applied.length > 0) {
      console.log('\n✅ Already applied:');
      applied.forEach(m => console.log(`   • ${m.file}`));
    }
    
    if (pending.length > 0) {
      console.log('\n⏳ Pending migrations:');
      pending.forEach(m => console.log(`   • ${m.file}`));
      
      // Generate combined script
      const scriptPath = await generateMigrationScript(pending);
      console.log(`\n✅ Combined migration script generated: ${scriptPath}`);
      
      console.log('\n📋 Next Steps:');
      console.log('   1. Review the generated script: combined-migrations.sql');
      console.log('   2. Go to Supabase Dashboard > SQL Editor');
      console.log('   3. Copy and paste the script content');
      console.log('   4. Run the migrations');
      console.log('');
      console.log('   Or run individually:');
      pending.forEach(m => {
        console.log(`   • Copy content from: db/migrations/${m.file}`);
      });
    } else {
      console.log('\n✅ All SQL migrations appear to be applied!');
    }
    
    // Special handling for reported errors
    console.log('\n🔍 Checking for reported issues...');
    
    // Check user_profiles
    try {
      const { error } = await client.from('user_profiles').select('id').limit(1);
      if (error && error.code === '42P01') {
        console.log('   ❌ user_profiles table is missing');
        console.log('   💡 Run: db/migrations/create-user-profiles-table.sql');
      } else {
        console.log('   ✅ user_profiles table exists');
      }
    } catch (e) {
      console.log('   ❌ Could not check user_profiles table');
    }
    
    // Check conversation_contexts
    try {
      const { error } = await client.from('conversation_contexts').select('id').limit(1);
      if (error && error.code === '42P01') {
        console.log('   ❌ conversation_contexts table is missing');
        console.log('   💡 This table might be created by a JavaScript migration');
      } else {
        console.log('   ✅ conversation_contexts table exists');
      }
    } catch (e) {
      console.log('   ❌ Could not check conversation_contexts table');
    }
    
  } catch (error) {
    console.error('\n💥 Migration helper failed:', error.message);
  }
}

main();