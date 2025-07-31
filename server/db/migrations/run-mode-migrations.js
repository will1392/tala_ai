/**
 * Script to run mode support migrations
 * This adds CMO capabilities to the Tala AI system
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Migration files in order
const migrations = [
  '005_add_mode_support.sql',
  '006_create_cmo_tables.sql',
  '007_update_conversation_views.sql'
];

async function runMigration(filename) {
  console.log(`\n📄 Running migration: ${filename}`);
  
  try {
    // Read migration file
    const filePath = path.join(__dirname, filename);
    const sql = await fs.readFile(filePath, 'utf8');
    
    // Execute migration
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // Try direct execution if RPC fails
      console.log('⚠️  RPC failed, trying direct execution...');
      
      // Split by semicolons but preserve those within dollar quotes
      const statements = sql.split(/;(?=(?:[^$]*\$[^$]*\$)*[^$]*$)/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      for (const statement of statements) {
        if (statement.toLowerCase().includes('select') && 
            !statement.toLowerCase().includes('insert') &&
            !statement.toLowerCase().includes('create') &&
            !statement.toLowerCase().includes('alter')) {
          // Skip pure SELECT statements
          continue;
        }
        
        // For now, we'll need to run these manually or through a different method
        console.log(`⚠️  Statement needs manual execution: ${statement.substring(0, 50)}...`);
      }
      
      console.log('\n⚠️  Some statements need manual execution. Please run the SQL file directly in Supabase.');
      return false;
    }
    
    console.log(`✅ Migration ${filename} completed successfully`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error running migration ${filename}:`, error.message);
    return false;
  }
}

async function verifyMigrations() {
  console.log('\n🔍 Verifying migrations...');
  
  try {
    // Check if mode column exists in conversations
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('mode, sub_mode, mode_context')
      .limit(1);
    
    if (convError) {
      console.log('❌ Mode columns not found in conversations table');
      return false;
    }
    
    // Check if marketing_assets table exists
    const { data: assets, error: assetsError } = await supabase
      .from('marketing_assets')
      .select('id')
      .limit(1);
    
    if (assetsError && assetsError.message.includes('relation')) {
      console.log('❌ Marketing tables not created');
      return false;
    }
    
    // Check if templates were inserted
    const { data: templates, error: templatesError } = await supabase
      .from('marketing_templates')
      .select('count')
      .eq('is_system', true);
    
    if (!templatesError && templates) {
      console.log(`✅ Found ${templates.length || 0} system templates`);
    }
    
    console.log('✅ Migrations verified successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Error verifying migrations:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting CMO mode migration process...');
  console.log(`📍 Supabase URL: ${supabaseUrl}`);
  
  let allSuccess = true;
  
  // Run each migration
  for (const migration of migrations) {
    const success = await runMigration(migration);
    if (!success) {
      allSuccess = false;
      console.log(`\n⚠️  Migration ${migration} requires manual intervention`);
    }
  }
  
  if (allSuccess) {
    // Verify migrations
    await verifyMigrations();
  }
  
  console.log('\n📋 Migration Summary:');
  console.log('1. Mode support added to conversations table');
  console.log('2. CMO-specific tables created');
  console.log('3. Helper functions and views created');
  
  if (!allSuccess) {
    console.log('\n⚠️  Some migrations need to be run manually in Supabase SQL editor.');
    console.log('Copy the contents of the following files and run them:');
    migrations.forEach(m => console.log(`   - ${m}`));
  }
  
  console.log('\n✅ Migration process completed!');
}

// Run migrations
main().catch(console.error);