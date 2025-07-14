/**
 * Migration Rollback Script
 * Rolls back migrations in reverse order
 */

const path = require('path');
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

// Migration registry (in order of application)
const migrations = [
  InitialSchemaMigration,
  MigrateConversationsMigration,
  MigrateFoldersMigration
];

async function rollbackMigration(migrationName) {
  const MigrationClass = migrations.find(m => {
    const instance = new m(SUPABASE_URL, SUPABASE_KEY);
    return instance.migrationName === migrationName;
  });

  if (!MigrationClass) {
    throw new Error(`Migration ${migrationName} not found`);
  }

  const migration = new MigrationClass(SUPABASE_URL, SUPABASE_KEY);
  await migration.down();
}

async function rollbackLastMigration() {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    // Get the last applied migration
    const { data: lastMigration, error } = await supabase
      .from('migrations')
      .select('*')
      .order('applied_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !lastMigration) {
      console.log('No migrations to rollback');
      return;
    }

    console.log(`Rolling back migration: ${lastMigration.name}`);
    await rollbackMigration(lastMigration.name);
    
    console.log('Rollback completed successfully');
  } catch (error) {
    console.error('Rollback failed:', error);
    process.exit(1);
  }
}

async function rollbackAllMigrations() {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    // Get all applied migrations in reverse order
    const { data: appliedMigrations, error } = await supabase
      .from('migrations')
      .select('*')
      .order('applied_at', { ascending: false });

    if (error || !appliedMigrations || appliedMigrations.length === 0) {
      console.log('No migrations to rollback');
      return;
    }

    console.log(`Rolling back ${appliedMigrations.length} migrations...`);

    for (const migration of appliedMigrations) {
      console.log(`Rolling back: ${migration.name}`);
      try {
        await rollbackMigration(migration.name);
      } catch (error) {
        console.error(`Failed to rollback ${migration.name}:`, error);
        console.log('Stopping rollback process due to error');
        process.exit(1);
      }
    }

    console.log('All migrations rolled back successfully');
  } catch (error) {
    console.error('Rollback process failed:', error);
    process.exit(1);
  }
}

async function rollbackToMigration(targetMigration) {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    // Get all migrations after the target migration
    const { data: targetMigrationData, error: targetError } = await supabase
      .from('migrations')
      .select('*')
      .eq('name', targetMigration)
      .single();

    if (targetError || !targetMigrationData) {
      console.error(`Target migration ${targetMigration} not found`);
      process.exit(1);
    }

    const { data: migrationsToRollback, error } = await supabase
      .from('migrations')
      .select('*')
      .gt('applied_at', targetMigrationData.applied_at)
      .order('applied_at', { ascending: false });

    if (error || !migrationsToRollback || migrationsToRollback.length === 0) {
      console.log('No migrations to rollback');
      return;
    }

    console.log(`Rolling back ${migrationsToRollback.length} migrations to reach ${targetMigration}...`);

    for (const migration of migrationsToRollback) {
      console.log(`Rolling back: ${migration.name}`);
      try {
        await rollbackMigration(migration.name);
      } catch (error) {
        console.error(`Failed to rollback ${migration.name}:`, error);
        console.log('Stopping rollback process due to error');
        process.exit(1);
      }
    }

    console.log(`Successfully rolled back to ${targetMigration}`);
  } catch (error) {
    console.error('Rollback process failed:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

async function main() {
  console.log('Tala AI Migration Rollback Tool');
  console.log('================================\n');

  switch (command) {
    case 'last':
      console.log('Rolling back last migration...');
      await rollbackLastMigration();
      break;

    case 'all':
      console.log('Rolling back all migrations...');
      await rollbackAllMigrations();
      break;

    case 'to':
      if (!args[1]) {
        console.error('Error: Please specify a migration name to rollback to');
        console.log('Usage: node rollback.js to <migration_name>');
        process.exit(1);
      }
      console.log(`Rolling back to migration: ${args[1]}`);
      await rollbackToMigration(args[1]);
      break;

    default:
      console.log('Usage:');
      console.log('  node rollback.js last           - Rollback the last applied migration');
      console.log('  node rollback.js all            - Rollback all migrations');
      console.log('  node rollback.js to <migration> - Rollback to a specific migration');
      console.log('\nExample:');
      console.log('  node rollback.js to 001_initial_schema');
      process.exit(0);
  }

  // Display current migration status
  const { displayMigrationStatus } = require('./runMigrations');
  await displayMigrationStatus();
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { rollbackMigration, rollbackLastMigration, rollbackAllMigrations };