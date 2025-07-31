#!/usr/bin/env node

/**
 * Migration script to set up Supabase database for tasks
 * 
 * This script:
 * 1. Creates the database schema
 * 2. Migrates existing tasks from JSON file
 * 3. Updates the application to use real database
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSupabaseClient } from './db/supabaseClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log('🚀 Starting migration to Supabase...\n');

  // 1. Get Supabase client
  console.log('1️⃣ Connecting to Supabase...');
  const clientResult = getSupabaseClient();
  
  if (!clientResult.success) {
    console.error('❌ Failed to connect to Supabase:', clientResult.error);
    console.error('\nPlease ensure you have set the following environment variables:');
    console.error('- SUPABASE_URL');
    console.error('- SUPABASE_ANON_KEY');
    console.error('- SUPABASE_SERVICE_KEY (optional but recommended)');
    process.exit(1);
  }

  const supabase = clientResult.client;
  console.log('✅ Connected to Supabase\n');

  // 2. Check if tasks table exists
  console.log('2️⃣ Checking database schema...');
  const { data: tables, error: tablesError } = await supabase
    .from('tasks')
    .select('id')
    .limit(1);

  if (tablesError && tablesError.code === 'PGRST116') {
    console.log('❌ Tasks table not found');
    console.log('\nPlease run the following SQL in your Supabase dashboard:');
    console.log('📄 SQL file: server/db/schema/tasks.sql');
    console.log('\nSteps:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of tasks.sql');
    console.log('4. Click "Run" to create the tables');
    console.log('5. Run this migration script again\n');
    process.exit(1);
  }

  console.log('✅ Database schema verified\n');

  // 3. Load existing tasks from JSON
  console.log('3️⃣ Loading existing tasks from JSON...');
  const tasksJsonPath = path.join(__dirname, 'data', 'tasks.json');
  
  let existingTasks = [];
  try {
    const tasksData = await fs.readFile(tasksJsonPath, 'utf-8');
    existingTasks = JSON.parse(tasksData);
    console.log(`✅ Found ${existingTasks.length} existing tasks\n`);
  } catch (error) {
    console.log('ℹ️ No existing tasks.json file found\n');
  }

  // 4. Migrate tasks to Supabase
  if (existingTasks.length > 0) {
    console.log('4️⃣ Migrating tasks to Supabase...');
    
    for (const task of existingTasks) {
      try {
        // Transform task to match new schema
        const supabaseTask = {
          id: task.id,
          title: task.title,
          description: task.description || null,
          status: task.status || 'pending',
          priority: task.priority || 'medium',
          due_date: task.dueDate || null,
          created_by: task.userId || task.createdBy || 'migrated_user',
          organization_id: task.organizationId || null,
          source: task.source || 'manual',
          source_id: task.sourceId || null,
          tags: task.tags || [],
          created_at: task.createdAt || new Date().toISOString(),
          updated_at: task.updatedAt || new Date().toISOString()
        };

        const { error } = await supabase
          .from('tasks')
          .insert([supabaseTask]);

        if (error) {
          console.error(`❌ Failed to migrate task "${task.title}":`, error.message);
        } else {
          console.log(`✅ Migrated: "${task.title}"`);
        }
      } catch (error) {
        console.error(`❌ Error migrating task:`, error);
      }
    }
    console.log('\n✅ Task migration complete\n');
  }

  // 5. Update DatabaseService to use Supabase
  console.log('5️⃣ Updating application configuration...');
  
  // Create a new sharedDatabase.js that uses Supabase
  const sharedDbContent = `/**
 * Shared Database Instance - Using Supabase
 * 
 * This module ensures that all parts of the application use the same
 * SupabaseDatabaseService instance, maintaining data consistency.
 */

import { SupabaseDatabaseService } from './SupabaseDatabaseService.js';

// Create a single shared instance
const sharedDb = new SupabaseDatabaseService();
let initialized = false;

// Initialize the database
export const initializeSharedDb = async () => {
  if (!initialized) {
    await sharedDb.initialize();
    initialized = true;
    console.log('✅ Shared database initialized (Supabase)');
  }
  return sharedDb;
};

// Get the shared database instance
export const getSharedDb = () => {
  if (!initialized) {
    console.warn('⚠️ Shared database accessed before initialization');
  }
  return sharedDb;
};

// Export the instance directly for convenience
export default sharedDb;
`;

  const sharedDbPath = path.join(__dirname, 'services', 'db', 'sharedDatabase.js');
  const backupPath = path.join(__dirname, 'services', 'db', 'sharedDatabase.mock.js');
  
  // Backup current file
  try {
    const currentContent = await fs.readFile(sharedDbPath, 'utf-8');
    await fs.writeFile(backupPath, currentContent);
    console.log('✅ Backed up current sharedDatabase.js to sharedDatabase.mock.js');
  } catch (error) {
    console.log('ℹ️ No existing sharedDatabase.js to backup');
  }
  
  // Write new file
  await fs.writeFile(sharedDbPath, sharedDbContent);
  console.log('✅ Updated sharedDatabase.js to use Supabase\n');

  // 6. Create .env template if needed
  console.log('6️⃣ Checking environment configuration...');
  const envExample = `
# Supabase Configuration
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
`;

  const envPath = path.join(__dirname, '.env');
  try {
    await fs.access(envPath);
    console.log('✅ .env file exists');
  } catch {
    console.log('ℹ️ Creating .env template...');
    await fs.writeFile(envPath, envExample);
    console.log('✅ Created .env template - please update with your Supabase credentials');
  }

  console.log('\n✅ Migration complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Ensure your .env file has correct Supabase credentials');
  console.log('2. Restart your server');
  console.log('3. Test task creation and listing');
  console.log('\n🎉 Your app is now using a real PostgreSQL database!');
}

// Run the migration
runMigration().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});