/**
 * Apply task metadata migration to Supabase
 */

import { config } from 'dotenv';
config();

import { getSupabaseService } from './db/supabaseClient.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration() {
  console.log('🔄 Applying task metadata migration...\n');
  
  try {
    const supabase = getSupabaseService();
    
    // Read the migration SQL
    const migrationPath = path.join(__dirname, 'db', 'migrations', 'add-task-metadata-column.sql');
    const sql = await fs.readFile(migrationPath, 'utf8');
    
    console.log('📝 Migration SQL:');
    console.log(sql);
    console.log('\n');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // If RPC doesn't exist, try direct execution (this might not work depending on Supabase setup)
      console.log('⚠️ RPC method not available, attempting direct execution...');
      
      // For Supabase, we might need to run this migration through the Supabase dashboard
      // or using their CLI. Let's at least check the current schema
      const { data: columns, error: schemaError } = await supabase
        .from('tasks')
        .select('*')
        .limit(0);
      
      if (!schemaError) {
        console.log('\n📊 Current tasks table schema:');
        console.log('Unable to directly modify schema through client.');
        console.log('\n⚠️ Please run the following SQL in your Supabase SQL Editor:');
        console.log('=' * 60);
        console.log(sql);
        console.log('=' * 60);
      }
    } else {
      console.log('✅ Migration applied successfully!');
    }
    
    // Test the schema by attempting to insert a task with metadata
    console.log('\n🧪 Testing task creation with metadata...');
    const testTask = {
      id: 'test-' + Date.now(),
      title: 'Test task with metadata',
      description: 'Testing metadata column',
      status: 'pending',
      priority: 'low',
      created_by: '00000000-0000-0000-0000-000000000002',
      metadata: {
        source: 'migration-test',
        timestamp: new Date().toISOString()
      }
    };
    
    const { data: createdTask, error: createError } = await supabase
      .from('tasks')
      .insert([testTask])
      .select()
      .single();
    
    if (createError) {
      console.log('❌ Metadata column not available:', createError.message);
      console.log('\n📋 Next steps:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Run the migration SQL shown above');
      console.log('4. Run this test again');
    } else {
      console.log('✅ Task created successfully with metadata!');
      console.log('Task ID:', createdTask.id);
      
      // Clean up test task
      await supabase.from('tasks').delete().eq('id', testTask.id);
      console.log('🧹 Test task cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  }
}

applyMigration();