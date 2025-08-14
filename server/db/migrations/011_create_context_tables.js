/**
 * Migration: 011_create_context_tables
 * 
 * Creates context management tables for advanced memory and conversation handling
 * Includes conversation_contexts, user_profiles (enhanced), and related tables
 */

import { getSupabaseService } from '../supabaseClient.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const migration = {
  id: '011_create_context_tables',
  name: 'Create Context Management Tables',
  description: 'Creates tables for conversation contexts, enhanced user profiles, memories, and entity extraction',

  async up() {
    const supabase = getSupabaseService();
    const results = {
      tables_created: 0,
      indexes_created: 0,
      functions_created: 0,
      errors: []
    };

    console.log('\n🔄 Creating context management tables...');

    try {
      // Read the SQL migration file
      const sqlPath = path.join(__dirname, '..', '..', 'migrations', 'create-context-tables.sql');
      const sqlContent = await fs.readFile(sqlPath, 'utf8');
      
      // Split SQL into individual statements (simple approach)
      // In production, you'd want a more robust SQL parser
      const statements = sqlContent
        .split(/;\s*$/m)
        .filter(stmt => stmt.trim().length > 0)
        .map(stmt => stmt.trim() + ';');

      console.log(`   📄 Found ${statements.length} SQL statements to execute`);

      // Execute each statement
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        
        // Skip comments
        if (statement.trim().startsWith('--') || statement.trim().length === 0) {
          continue;
        }

        // Identify statement type for logging
        let statementType = 'UNKNOWN';
        if (statement.match(/CREATE\s+TABLE/i)) {
          statementType = 'TABLE';
          results.tables_created++;
        } else if (statement.match(/CREATE\s+INDEX/i)) {
          statementType = 'INDEX';
          results.indexes_created++;
        } else if (statement.match(/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/i)) {
          statementType = 'FUNCTION';
          results.functions_created++;
        } else if (statement.match(/CREATE\s+TYPE/i)) {
          statementType = 'TYPE';
        } else if (statement.match(/CREATE\s+TRIGGER/i)) {
          statementType = 'TRIGGER';
        } else if (statement.match(/CREATE\s+(OR\s+REPLACE\s+)?VIEW/i)) {
          statementType = 'VIEW';
        }

        try {
          // Execute via RPC if available
          const { error } = await supabase.rpc('execute_sql', {
            sql: statement
          });

          if (error) {
            // If RPC doesn't exist, we can't execute raw SQL
            console.log(`   ⚠️  Cannot execute ${statementType} statement ${i + 1}: RPC not available`);
            results.errors.push(`Statement ${i + 1} (${statementType}): RPC not available`);
          } else {
            console.log(`   ✅ ${statementType} statement ${i + 1} executed`);
          }
        } catch (execError) {
          console.log(`   ❌ Failed to execute ${statementType} statement ${i + 1}: ${execError.message}`);
          results.errors.push(`Statement ${i + 1} (${statementType}): ${execError.message}`);
        }
      }

      // If RPC isn't available, check if tables exist already
      if (results.errors.length > 0) {
        console.log('\n   🔍 Checking if tables already exist...');
        
        const tablesToCheck = [
          'conversation_contexts',
          'user_profiles',
          'context_memories',
          'conversation_threads',
          'entity_extractions'
        ];

        let existingTables = 0;
        for (const table of tablesToCheck) {
          const { error } = await supabase
            .from(table)
            .select('id')
            .limit(1);

          if (!error || error.code !== '42P01') {
            console.log(`   ✅ Table '${table}' exists`);
            existingTables++;
          } else {
            console.log(`   ❌ Table '${table}' does not exist`);
          }
        }

        if (existingTables === tablesToCheck.length) {
          console.log('\n   ✅ All context tables already exist!');
          results.tables_created = tablesToCheck.length;
          results.errors = []; // Clear errors if tables exist
        } else if (existingTables > 0) {
          console.log(`\n   ⚠️  Partial migration: ${existingTables}/${tablesToCheck.length} tables exist`);
        }
      }

      // Record migration
      if (results.errors.length === 0) {
        await this.recordMigration(supabase, {
          tables_created: results.tables_created,
          indexes_created: results.indexes_created,
          functions_created: results.functions_created
        });
      }

      return results;

    } catch (error) {
      console.error('   ❌ Migration failed:', error.message);
      throw error;
    }
  },

  async recordMigration(supabase, metadata) {
    try {
      const { error } = await supabase
        .from('migrations')
        .insert({
          id: this.id,
          name: this.name,
          description: this.description,
          applied_by: 'system',
          status: 'completed',
          metadata
        });

      if (error && error.code !== '23505') { // Ignore duplicate key errors
        console.log('   ⚠️  Could not record migration:', error.message);
      }
    } catch (error) {
      console.log('   ⚠️  Could not record migration:', error.message);
    }
  }
};

// Export for migration runner
export default migration;