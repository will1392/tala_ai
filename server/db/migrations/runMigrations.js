/**
 * Migration Runner for Tala AI
 * 
 * Executes database migrations in order and tracks their status
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSupabaseService } from '../supabaseClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MigrationRunner {
  constructor() {
    this.migrationsDir = __dirname;
    this.supabase = null;
  }

  /**
   * Initialize the migration runner
   */
  async init() {
    try {
      this.supabase = getSupabaseService();
      
      // Test connection
      const { data, error } = await this.supabase
        .from('migrations')
        .select('id')
        .limit(1);

      if (error && error.code === 'PGRST204') {
        console.log('🔧 Migrations table not found - will be created by first migration');
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize migration runner:', error.message);
      return false;
    }
  }

  /**
   * Get all migration files
   */
  async getMigrationFiles() {
    try {
      const files = await fs.readdir(this.migrationsDir);
      
      // Filter migration files (numbered .js files, exclude this runner)
      const migrationFiles = files
        .filter(file => 
          file.match(/^\d{3}_.*\.js$/) && 
          file !== 'runMigrations.js' && 
          file !== 'rollback.js'
        )
        .sort();

      return migrationFiles;
    } catch (error) {
      throw new Error(`Failed to read migrations directory: ${error.message}`);
    }
  }

  /**
   * Get completed migrations from database
   */
  async getCompletedMigrations() {
    try {
      const { data, error } = await this.supabase
        .from('migrations')
        .select('id, status, applied_at')
        .eq('status', 'completed')
        .order('applied_at', { ascending: true });

      if (error && error.code !== 'PGRST204') {
        throw new Error(`Failed to get completed migrations: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      // If migrations table doesn't exist, return empty array
      return [];
    }
  }

  /**
   * Load a migration module
   */
  async loadMigration(filename) {
    try {
      const migrationPath = path.join(this.migrationsDir, filename);
      const module = await import(migrationPath);
      return module.migration || module.default;
    } catch (error) {
      throw new Error(`Failed to load migration ${filename}: ${error.message}`);
    }
  }

  /**
   * Run all pending migrations
   */
  async runAll() {
    console.log('🚀 Starting Tala AI Database Migration');
    console.log('═'.repeat(60));

    try {
      // Initialize
      const initialized = await this.init();
      if (!initialized) {
        throw new Error('Failed to initialize migration runner');
      }

      // Get migration files and completed migrations
      const migrationFiles = await this.getMigrationFiles();
      const completedMigrations = await this.getCompletedMigrations();
      const completedIds = completedMigrations.map(m => m.id);

      console.log(`\n📋 Migration Status:`);
      console.log(`   Available migrations: ${migrationFiles.length}`);
      console.log(`   Completed migrations: ${completedMigrations.length}`);

      if (migrationFiles.length === 0) {
        console.log('\n⚠️  No migration files found');
        return;
      }

      // Determine pending migrations
      const pendingMigrations = [];
      for (const filename of migrationFiles) {
        const migration = await this.loadMigration(filename);
        if (!completedIds.includes(migration.id)) {
          pendingMigrations.push({ filename, migration });
        }
      }

      if (pendingMigrations.length === 0) {
        console.log('\n✅ All migrations are already completed');
        await this.showCurrentStatus();
        return;
      }

      console.log(`\n🔄 Pending migrations: ${pendingMigrations.length}`);
      console.log('─'.repeat(40));

      // Run each pending migration
      const results = {
        successful: [],
        failed: []
      };

      for (let i = 0; i < pendingMigrations.length; i++) {
        const { filename, migration } = pendingMigrations[i];
        
        console.log(`\n📦 [${i + 1}/${pendingMigrations.length}] ${migration.name}`);
        console.log(`   ID: ${migration.id}`);
        console.log(`   File: ${filename}`);
        console.log(`   Description: ${migration.description}`);

        try {
          const startTime = Date.now();
          const result = await migration.up();
          const duration = Date.now() - startTime;

          results.successful.push({
            id: migration.id,
            name: migration.name,
            duration,
            result
          });

          console.log(`\n   ✅ Completed in ${duration}ms`);
          
          // Show result summary if available
          if (result && typeof result === 'object') {
            const summary = this.formatMigrationResult(result);
            if (summary) {
              console.log(`   📊 ${summary}`);
            }
          }

        } catch (error) {
          results.failed.push({
            id: migration.id,
            name: migration.name,
            error: error.message
          });

          console.error(`\n   ❌ Failed: ${error.message}`);
          
          // Stop on first failure unless in force mode
          if (!process.argv.includes('--force')) {
            console.log('\n🛑 Migration stopped due to error. Use --force to continue on errors.');
            break;
          }
        }
      }

      // Final summary
      console.log('\n' + '═'.repeat(60));
      console.log('📊 Migration Summary');
      console.log('═'.repeat(60));

      if (results.successful.length > 0) {
        console.log(`\n✅ Successful migrations (${results.successful.length}):`);
        results.successful.forEach(r => {
          console.log(`   • ${r.name} (${r.duration}ms)`);
        });
      }

      if (results.failed.length > 0) {
        console.log(`\n❌ Failed migrations (${results.failed.length}):`);
        results.failed.forEach(r => {
          console.log(`   • ${r.name}: ${r.error}`);
        });
      }

      // Show current database status
      if (results.successful.length > 0) {
        await this.showCurrentStatus();
      }

      if (results.failed.length > 0) {
        console.log('\n💡 To rollback the last migration: npm run migrate:rollback:last');
        process.exit(1);
      } else {
        console.log('\n🎉 All migrations completed successfully!');
        console.log('\n💡 Next steps:');
        console.log('   • Check your Supabase dashboard for the migrated data');
        console.log('   • Update your application to use the database instead of JSON files');
        console.log('   • Test the application thoroughly');
      }

    } catch (error) {
      console.error('\n💥 Migration runner failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Show current database status
   */
  async showCurrentStatus() {
    try {
      console.log('\n📊 Current Database Status:');
      console.log('─'.repeat(30));

      // Get counts for each table
      const tables = [
        'organizations',
        'users', 
        'conversations',
        'messages',
        'folders',
        'primary_folders'
      ];

      for (const table of tables) {
        try {
          const { count, error } = await this.supabase
            .from(table)
            .select('id', { count: 'exact', head: true });

          if (error) {
            console.log(`   ${table}: Error (${error.message})`);
          } else {
            console.log(`   ${table}: ${count || 0} records`);
          }
        } catch (error) {
          console.log(`   ${table}: Unknown`);
        }
      }

      // Get migration history
      try {
        const { data: migrations, error } = await this.supabase
          .from('migrations')
          .select('id, name, applied_at, status')
          .order('applied_at', { ascending: true });

        if (!error && migrations) {
          console.log('\n📜 Migration History:');
          migrations.forEach(m => {
            const date = new Date(m.applied_at).toLocaleString();
            const status = m.status === 'completed' ? '✅' : '❌';
            console.log(`   ${status} ${m.name} (${date})`);
          });
        }
      } catch (error) {
        // Ignore errors for migration history
      }

    } catch (error) {
      console.log('   ⚠️  Could not retrieve database status');
    }
  }

  /**
   * Format migration result for display
   */
  formatMigrationResult(result) {
    const parts = [];
    
    if (result.conversations_migrated) {
      parts.push(`${result.conversations_migrated} conversations`);
    }
    if (result.messages_migrated) {
      parts.push(`${result.messages_migrated} messages`);
    }
    if (result.users_created) {
      parts.push(`${result.users_created} users created`);
    }
    if (result.primary_folders_migrated) {
      parts.push(`${result.primary_folders_migrated} primary folders`);
    }
    if (result.user_folders_migrated) {
      parts.push(`${result.user_folders_migrated} user folders`);
    }
    
    return parts.length > 0 ? parts.join(', ') : null;
  }

  /**
   * Check migration status
   */
  async checkStatus() {
    console.log('🔍 Checking Migration Status');
    console.log('═'.repeat(50));

    try {
      const initialized = await this.init();
      if (!initialized) {
        throw new Error('Failed to initialize migration runner');
      }

      const migrationFiles = await this.getMigrationFiles();
      const completedMigrations = await this.getCompletedMigrations();

      console.log(`\n📋 Available Migrations: ${migrationFiles.length}`);
      console.log(`📋 Completed Migrations: ${completedMigrations.length}`);

      if (migrationFiles.length === 0) {
        console.log('\n⚠️  No migration files found');
        return;
      }

      console.log('\n📝 Migration Status:');
      console.log('─'.repeat(30));

      const completedIds = completedMigrations.map(m => m.id);

      for (const filename of migrationFiles) {
        const migration = await this.loadMigration(filename);
        const isCompleted = completedIds.includes(migration.id);
        const status = isCompleted ? '✅ Completed' : '⏳ Pending';
        
        console.log(`   ${status} ${migration.name}`);
        if (isCompleted) {
          const completed = completedMigrations.find(m => m.id === migration.id);
          console.log(`              Applied: ${new Date(completed.applied_at).toLocaleString()}`);
        }
      }

      const pendingCount = migrationFiles.length - completedMigrations.length;
      if (pendingCount > 0) {
        console.log(`\n💡 Run 'npm run migrate' to apply ${pendingCount} pending migration(s)`);
      } else {
        console.log('\n🎉 All migrations are up to date!');
      }

    } catch (error) {
      console.error('\n❌ Status check failed:', error.message);
      process.exit(1);
    }
  }
}

// CLI handling
const runner = new MigrationRunner();

const command = process.argv[2];

switch (command) {
  case 'status':
    runner.checkStatus();
    break;
  case 'run':
  default:
    runner.runAll();
    break;
}

export default MigrationRunner;