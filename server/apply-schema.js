#!/usr/bin/env node
/**
 * Schema Application Helper for Tala AI
 * 
 * Helps apply the database schema to Supabase PostgreSQL
 */

import fs from 'fs/promises';
import { getSupabaseService } from './db/supabaseClient.js';

console.log('🗄️  Tala AI Schema Application Helper');
console.log('═'.repeat(50));

async function applySchema() {
  try {
    // Step 1: Check if we can connect to Supabase
    console.log('\n1️⃣  Testing Supabase connection...');
    
    let supabase;
    try {
      supabase = getSupabaseService();
      console.log('   ✅ Supabase client initialized');
    } catch (error) {
      console.log('   ❌ Cannot connect to Supabase:', error.message);
      console.log('\n💡 To apply schema manually:');
      console.log('   1. Go to your Supabase Dashboard');
      console.log('   2. Open SQL Editor');
      console.log('   3. Copy contents of db/schema.sql');
      console.log('   4. Paste and run in SQL Editor');
      console.log('\n📖 See APPLY_SCHEMA_GUIDE.md for detailed instructions');
      return;
    }

    // Step 2: Read schema file
    console.log('\n2️⃣  Reading schema file...');
    
    let schemaContent;
    try {
      schemaContent = await fs.readFile('./db/schema.sql', 'utf8');
      const lines = schemaContent.split('\n').length;
      console.log(`   ✅ Schema loaded (${lines} lines)`);
    } catch (error) {
      console.log('   ❌ Cannot read db/schema.sql:', error.message);
      console.log('   💡 Make sure you are in the server directory');
      return;
    }

    // Step 3: Check if schema is already applied
    console.log('\n3️⃣  Checking existing schema...');
    
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (tableError && !tableError.message.includes('permission denied')) {
      console.log('   ⚠️  Cannot check existing tables:', tableError.message);
    } else if (tables && tables.length > 0) {
      const existingTables = tables.map(t => t.table_name);
      const requiredTables = [
        'organizations', 'users', 'conversations', 'messages',
        'documents', 'folders', 'primary_folders', 'tags', 'document_tags'
      ];
      
      const hasRequiredTables = requiredTables.filter(table => 
        existingTables.includes(table)
      );
      
      if (hasRequiredTables.length === requiredTables.length) {
        console.log('   ✅ All required tables already exist');
        console.log('\n🎉 Schema appears to be already applied!');
        console.log('\n💡 Next steps:');
        console.log('   • Run: npm run test:migrations');
        console.log('   • Run: npm run migrate:status');
        console.log('   • Run: npm run migrate');
        return;
      } else if (hasRequiredTables.length > 0) {
        console.log(`   ⚠️  Partial schema found (${hasRequiredTables.length}/${requiredTables.length} tables)`);
        console.log(`   Missing: ${requiredTables.filter(t => !existingTables.includes(t)).join(', ')}`);
      } else {
        console.log('   ℹ️  No application tables found - ready for schema application');
      }
    }

    // Step 4: Attempt to apply schema via RPC (if available)
    console.log('\n4️⃣  Attempting automatic schema application...');
    
    // Check if we have RPC capability
    try {
      const { data, error } = await supabase.rpc('version');
      
      if (error) {
        console.log('   ❌ RPC not available for automatic application');
        console.log('   💡 Please apply schema manually using Supabase Dashboard');
      } else {
        console.log('   ⚠️  Automatic schema application not recommended');
        console.log('   💡 For safety, please apply schema manually');
      }
    } catch (error) {
      console.log('   ❌ Cannot execute RPC functions');
    }

    // Step 5: Provide manual instructions
    console.log('\n5️⃣  Manual Application Instructions:');
    console.log('─'.repeat(40));
    
    console.log('\n📋 Method 1: Supabase Dashboard (Recommended)');
    console.log('   1. Go to your Supabase Dashboard');
    console.log('   2. Select your project');
    console.log('   3. Click "SQL Editor" in sidebar');
    console.log('   4. Click "New Query"');
    console.log('   5. Copy contents of db/schema.sql');
    console.log('   6. Paste and click "Run"');
    
    console.log('\n🔧 Method 2: Command Line');
    console.log('   psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" -f db/schema.sql');
    
    console.log('\n📖 For detailed instructions, see: APPLY_SCHEMA_GUIDE.md');

    // Step 6: Test after application
    console.log('\n6️⃣  After applying schema:');
    console.log('   • Test setup: npm run test:migrations');
    console.log('   • Check status: npm run migrate:status');
    console.log('   • Run migrations: npm run migrate');

  } catch (error) {
    console.error('\n💥 Schema application helper failed:', error.message);
    
    console.log('\n🛟 Fallback Options:');
    console.log('   1. Use Supabase Dashboard SQL Editor');
    console.log('   2. Use psql command line tool');
    console.log('   3. Use a database GUI tool (pgAdmin, DBeaver, etc.)');
    console.log('\n📖 See APPLY_SCHEMA_GUIDE.md for step-by-step instructions');
  }
}

// Step 7: Show connection info
async function showConnectionInfo() {
  console.log('\n🔗 Connection Information:');
  console.log('─'.repeat(30));
  
  const url = process.env.SUPABASE_URL;
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_KEY;
  
  if (url) {
    console.log(`   Supabase URL: ${url}`);
    console.log(`   Service Key: ${hasServiceKey ? 'Configured' : 'Missing'}`);
    
    // Extract host from URL for psql command
    try {
      const urlObj = new URL(url);
      const host = urlObj.hostname.replace('supabase.co', 'supabase.co').replace(/^/, 'db.');
      console.log('\n💡 For psql, use:');
      console.log(`   Host: ${host}`);
      console.log(`   Port: 5432`);
      console.log(`   Database: postgres`);
      console.log(`   Username: postgres`);
    } catch (error) {
      // Invalid URL format
    }
  } else {
    console.log('   ❌ SUPABASE_URL not configured');
    console.log('   💡 Add to .env file first');
  }
}

// Run the helper
applySchema().then(() => {
  showConnectionInfo();
}).catch(error => {
  console.error('Helper failed:', error.message);
});