/**
 * Migration: 012_create_user_profiles
 * 
 * Creates user_profiles table for onboarding information
 * This is separate from the context management user_profiles table
 */

import { getSupabaseService } from '../supabaseClient.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const migration = {
  id: '012_create_user_profiles',
  name: 'Create User Profiles Table',
  description: 'Creates user_profiles table for storing user onboarding information',

  async up() {
    const supabase = getSupabaseService();
    const results = {
      table_created: false,
      indexes_created: 0,
      policies_created: 0,
      errors: []
    };

    console.log('\n🔄 Creating user_profiles table...');

    try {
      // First check if the table already exists
      const { error: checkError } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(1);

      if (!checkError || checkError.code !== '42P01') {
        console.log('   ✅ user_profiles table already exists');
        results.table_created = true;
        
        // Record migration as completed
        await this.recordMigration(supabase, results);
        return results;
      }

      // Read the SQL migration file
      const sqlPath = path.join(__dirname, 'create-user-profiles-table.sql');
      const sqlContent = await fs.readFile(sqlPath, 'utf8');
      
      // Try to execute via RPC
      const { error: rpcError } = await supabase.rpc('execute_sql', {
        sql: sqlContent
      });

      if (rpcError) {
        console.log('   ⚠️  Cannot execute via RPC, attempting alternative approach...');
        
        // Parse and execute individual statements
        const statements = sqlContent
          .split(/;\s*$/m)
          .filter(stmt => stmt.trim().length > 0 && !stmt.trim().startsWith('--'))
          .map(stmt => stmt.trim() + ';');

        console.log(`   📄 Found ${statements.length} SQL statements`);

        // Since we can't execute raw SQL without RPC, we'll need to use Supabase's API
        // This is limited but we can try to create the table structure
        
        console.log('\n   ❌ Cannot create table without RPC access');
        console.log('   💡 Please run the following SQL manually in Supabase Dashboard:');
        console.log('   📁 File: db/migrations/create-user-profiles-table.sql');
        
        results.errors.push('Manual execution required - RPC not available');
        
        return results;
      }

      console.log('   ✅ SQL executed successfully');
      results.table_created = true;
      results.indexes_created = 3; // Based on the SQL file
      results.policies_created = 2; // Based on the SQL file

      // Verify table creation
      const { error: verifyError } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(1);

      if (verifyError && verifyError.code === '42P01') {
        console.log('   ❌ Table creation verification failed');
        results.errors.push('Table not created despite successful execution');
        results.table_created = false;
      } else {
        console.log('   ✅ Table creation verified');
      }

      // Record migration
      if (results.table_created) {
        await this.recordMigration(supabase, results);
      }

      return results;

    } catch (error) {
      console.error('   ❌ Migration failed:', error.message);
      results.errors.push(error.message);
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