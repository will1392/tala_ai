/**
 * Migration Runner
 * Runs all migrations in order
 */

const path = require('path');
const fs = require('fs').promises;
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import migration classes
const InitialSchemaMigration = require('./001_initial_schema');
const MigrateConversationsMigration = require('./002_migrate_conversations');
const MigrateFoldersMigration = require('./003_migrate_folders');

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_KEY must be set in environment variables');
  process.exit(1);
}

// Migration registry
const migrations = [
  InitialSchemaMigration,
  MigrateConversationsMigration,
  MigrateFoldersMigration
];

async function ensureMigrationTable() {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  try {
    // Create migrations table if it doesn't exist
    const { error } = await supabase.from('migrations').select('count').limit(1);
    
    if (error && error.message.includes('relation "migrations" does not exist')) {
      console.log('Creating migrations table...');
      
      // Use raw SQL via RPC or create a function in your database
      // For now, we'll assume the table exists from schema.sql
      console.log('Note: Ensure migrations table exists in your database schema');
    }
  } catch (error) {
    console.error('Error checking migrations table:', error);
  }
}

async function runMigrations() {
  console.log('Starting migration process...');
  console.log(`Found ${migrations.length} migrations to process`);
  
  try {
    // Ensure migration tracking table exists
    await ensureMigrationTable();
    
    // Run each migration in order
    for (const MigrationClass of migrations) {
      const migration = new MigrationClass(SUPABASE_URL, SUPABASE_KEY);
      
      try {
        await migration.up();
      } catch (error) {
        console.error(`Migration ${migration.migrationName} failed:`, error);
        console.log('Stopping migration process due to error');
        process.exit(1);
      }
    }
    
    console.log('All migrations completed successfully!');
    
    // Display migration status
    await displayMigrationStatus();
    
  } catch (error) {
    console.error('Migration process failed:', error);
    process.exit(1);
  }
}

async function displayMigrationStatus() {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  try {
    const { data: migrations, error } = await supabase
      .from('migrations')
      .select('*')
      .order('applied_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching migration status:', error);
      return;
    }
    
    console.log('\nMigration Status:');
    console.log('=================');
    
    if (migrations && migrations.length > 0) {
      migrations.forEach(migration => {
        console.log(`✓ ${migration.name} - Applied at: ${new Date(migration.applied_at).toLocaleString()}`);
      });
    } else {
      console.log('No migrations have been applied yet.');
    }
    
    // Show data statistics
    await showDataStatistics(supabase);
    
  } catch (error) {
    console.error('Error displaying migration status:', error);
  }
}

async function showDataStatistics(supabase) {
  console.log('\nData Statistics:');
  console.log('================');
  
  try {
    // Count organizations
    const { count: orgCount } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true });
    
    // Count users
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    // Count folders
    const { count: folderCount } = await supabase
      .from('folders')
      .select('*', { count: 'exact', head: true });
    
    // Count conversations
    const { count: convCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true });
    
    // Count messages
    const { count: msgCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true });
    
    console.log(`Organizations: ${orgCount || 0}`);
    console.log(`Users: ${userCount || 0}`);
    console.log(`Folders: ${folderCount || 0}`);
    console.log(`Conversations: ${convCount || 0}`);
    console.log(`Messages: ${msgCount || 0}`);
    
  } catch (error) {
    console.error('Error fetching data statistics:', error);
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { runMigrations, displayMigrationStatus };