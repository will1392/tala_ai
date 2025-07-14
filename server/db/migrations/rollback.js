/**
 * Migration Rollback for Tala AI
 * 
 * Provides rollback functionality for database migrations
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { getSupabaseService } from '../supabaseClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MigrationRollback {
  constructor() {
    this.migrationsDir = __dirname;
    this.supabase = null;
  }

  /**
   * Initialize the rollback tool
   */
  async init() {
    try {
      this.supabase = getSupabaseService();
      
      // Test connection
      const { error } = await this.supabase
        .from('migrations')
        .select('id')
        .limit(1);

      if (error && error.code === 'PGRST204') {
        throw new Error('Migrations table not found. No migrations to rollback.');
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize rollback tool:', error.message);
      return false;
    }
  }

  /**
   * Get completed migrations from database
   */
  async getCompletedMigrations() {
    try {
      const { data, error } = await this.supabase
        .from('migrations')
        .select('*')
        .eq('status', 'completed')
        .order('applied_at', { ascending: false }); // Most recent first

      if (error) {
        throw new Error(`Failed to get completed migrations: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  /**
   * Load a migration module
   */
  async loadMigration(migrationId) {
    try {
      // Find the migration file by ID
      const files = await fs.readdir(this.migrationsDir);
      const migrationFile = files.find(file => 
        file.match(/^\d{3}_.*\.js$/) && 
        file.includes(migrationId.replace('_', ''))
      );

      if (!migrationFile) {
        throw new Error(`Migration file for ${migrationId} not found`);
      }

      const migrationPath = path.join(this.migrationsDir, migrationFile);
      const module = await import(migrationPath);
      return module.migration || module.default;
    } catch (error) {
      throw new Error(`Failed to load migration ${migrationId}: ${error.message}`);
    }
  }

  /**
   * Rollback the last migration
   */
  async rollbackLast() {
    console.log('🔄 Rolling Back Last Migration');
    console.log('═'.repeat(50));

    try {
      const initialized = await this.init();
      if (!initialized) {
        return;
      }

      const completedMigrations = await this.getCompletedMigrations();
      
      if (completedMigrations.length === 0) {
        console.log('\n✅ No migrations to rollback');
        return;
      }

      const lastMigration = completedMigrations[0];
      
      console.log(`\n📦 Last Migration:`);
      console.log(`   ID: ${lastMigration.id}`);
      console.log(`   Name: ${lastMigration.name}`);
      console.log(`   Applied: ${new Date(lastMigration.applied_at).toLocaleString()}`);
      console.log(`   Description: ${lastMigration.description}`);

      // Confirm rollback
      const confirmed = await this.confirmRollback(lastMigration.name);
      if (!confirmed) {
        console.log('\n❌ Rollback cancelled');
        return;
      }

      // Load and execute rollback
      await this.executeMigrationRollback(lastMigration);

      console.log('\n✅ Rollback completed successfully');

    } catch (error) {
      console.error('\n❌ Rollback failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Rollback all migrations
   */
  async rollbackAll() {
    console.log('🔄 Rolling Back ALL Migrations');
    console.log('═'.repeat(50));

    try {
      const initialized = await this.init();
      if (!initialized) {
        return;
      }

      const completedMigrations = await this.getCompletedMigrations();
      
      if (completedMigrations.length === 0) {
        console.log('\n✅ No migrations to rollback');
        return;
      }

      console.log(`\n⚠️  This will rollback ${completedMigrations.length} migration(s):`);
      completedMigrations.forEach((m, i) => {
        console.log(`   ${i + 1}. ${m.name} (${new Date(m.applied_at).toLocaleDateString()})`);
      });

      console.log('\n🚨 WARNING: This will delete ALL migrated data!');
      
      // Double confirmation for rollback all
      const confirmed1 = await this.promptUser('\nAre you sure you want to rollback ALL migrations? (yes/no): ');
      if (confirmed1.toLowerCase() !== 'yes') {
        console.log('\n❌ Rollback cancelled');
        return;
      }

      const confirmed2 = await this.promptUser('\nType "DELETE ALL DATA" to confirm: ');
      if (confirmed2 !== 'DELETE ALL DATA') {
        console.log('\n❌ Rollback cancelled');
        return;
      }

      console.log('\n🔄 Rolling back migrations...');

      // Rollback in reverse order (most recent first)
      let rolledBack = 0;
      for (const migration of completedMigrations) {
        try {
          console.log(`\n📦 Rolling back: ${migration.name}`);
          await this.executeMigrationRollback(migration);
          rolledBack++;
          console.log(`   ✅ Completed (${rolledBack}/${completedMigrations.length})`);
        } catch (error) {
          console.error(`   ❌ Failed: ${error.message}`);
          
          // Ask if user wants to continue
          const continueRollback = await this.promptUser('\nContinue with remaining rollbacks? (y/n): ');
          if (continueRollback.toLowerCase() !== 'y') {
            break;
          }
        }
      }

      console.log(`\n✅ Rollback completed: ${rolledBack}/${completedMigrations.length} migrations rolled back`);

    } catch (error) {
      console.error('\n❌ Rollback failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Rollback to a specific migration
   */
  async rollbackTo(targetMigrationId) {
    console.log(`🔄 Rolling Back to Migration: ${targetMigrationId}`);
    console.log('═'.repeat(50));

    try {
      const initialized = await this.init();
      if (!initialized) {
        return;
      }

      const completedMigrations = await this.getCompletedMigrations();
      
      if (completedMigrations.length === 0) {
        console.log('\n✅ No migrations to rollback');
        return;
      }

      // Find target migration
      const targetIndex = completedMigrations.findIndex(m => m.id === targetMigrationId);
      if (targetIndex === -1) {
        console.log(`\n❌ Migration ${targetMigrationId} not found or not completed`);
        return;
      }

      const migrationsToRollback = completedMigrations.slice(0, targetIndex + 1);
      
      console.log(`\n📋 Migrations to rollback (${migrationsToRollback.length}):`);
      migrationsToRollback.forEach((m, i) => {
        console.log(`   ${i + 1}. ${m.name}`);
      });

      // Confirm rollback
      const confirmed = await this.confirmRollback(`${migrationsToRollback.length} migration(s) back to ${targetMigrationId}`);
      if (!confirmed) {
        console.log('\n❌ Rollback cancelled');
        return;
      }

      // Rollback migrations
      let rolledBack = 0;
      for (const migration of migrationsToRollback) {
        try {
          console.log(`\n📦 Rolling back: ${migration.name}`);
          await this.executeMigrationRollback(migration);
          rolledBack++;
          console.log(`   ✅ Completed (${rolledBack}/${migrationsToRollback.length})`);
        } catch (error) {
          console.error(`   ❌ Failed: ${error.message}`);
          throw error;
        }
      }

      console.log(`\n✅ Rollback completed: ${rolledBack} migrations rolled back`);

    } catch (error) {
      console.error('\n❌ Rollback failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Execute rollback for a specific migration
   */
  async executeMigrationRollback(migrationData) {
    try {
      const migration = await this.loadMigration(migrationData.id);
      
      if (!migration.down || typeof migration.down !== 'function') {
        throw new Error(`Migration ${migrationData.id} does not support rollback`);
      }

      const startTime = Date.now();
      await migration.down();
      const duration = Date.now() - startTime;

      console.log(`   ⏱️  Rollback completed in ${duration}ms`);

    } catch (error) {
      throw new Error(`Rollback execution failed: ${error.message}`);
    }
  }

  /**
   * Interactive migration selection
   */
  async interactiveRollback() {
    console.log('🔄 Interactive Migration Rollback');
    console.log('═'.repeat(50));

    try {
      const initialized = await this.init();
      if (!initialized) {
        return;
      }

      const completedMigrations = await this.getCompletedMigrations();
      
      if (completedMigrations.length === 0) {
        console.log('\n✅ No migrations to rollback');
        return;
      }

      console.log('\n📋 Available Rollback Options:');
      console.log('   1. Rollback last migration');
      console.log('   2. Rollback all migrations');
      console.log('   3. Select specific migration to rollback to');
      console.log('   4. Cancel');

      const choice = await this.promptUser('\nSelect option (1-4): ');

      switch (choice) {
        case '1':
          await this.rollbackLast();
          break;
        case '2':
          await this.rollbackAll();
          break;
        case '3':
          await this.selectMigrationRollback(completedMigrations);
          break;
        case '4':
          console.log('\n❌ Rollback cancelled');
          break;
        default:
          console.log('\n❌ Invalid option');
          break;
      }

    } catch (error) {
      console.error('\n❌ Interactive rollback failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Select specific migration for rollback
   */
  async selectMigrationRollback(completedMigrations) {
    console.log('\n📋 Completed Migrations:');
    
    completedMigrations.forEach((m, i) => {
      const date = new Date(m.applied_at).toLocaleDateString();
      console.log(`   ${i + 1}. ${m.name} (${date})`);
    });

    const selection = await this.promptUser(`\nSelect migration to rollback to (1-${completedMigrations.length}): `);
    const index = parseInt(selection) - 1;

    if (isNaN(index) || index < 0 || index >= completedMigrations.length) {
      console.log('\n❌ Invalid selection');
      return;
    }

    const selectedMigration = completedMigrations[index];
    await this.rollbackTo(selectedMigration.id);
  }

  /**
   * Confirm rollback action
   */
  async confirmRollback(description) {
    console.log(`\n⚠️  WARNING: This will rollback ${description}`);
    console.log('   This action cannot be undone and will delete data from the database.');
    
    const answer = await this.promptUser('\nDo you want to continue? (y/n): ');
    return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
  }

  /**
   * Prompt user for input
   */
  async promptUser(question) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }
}

// CLI handling
const rollback = new MigrationRollback();

const command = process.argv[2];

switch (command) {
  case 'last':
    rollback.rollbackLast();
    break;
  case 'all':
    rollback.rollbackAll();
    break;
  case 'to':
    const targetMigration = process.argv[3];
    if (!targetMigration) {
      console.log('❌ Please specify target migration ID');
      console.log('Usage: node rollback.js to <migration_id>');
      process.exit(1);
    }
    rollback.rollbackTo(targetMigration);
    break;
  case 'interactive':
  default:
    rollback.interactiveRollback();
    break;
}

export default MigrationRollback;