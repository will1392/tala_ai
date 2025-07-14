/**
 * Migration: 001_initial_schema
 * 
 * Creates initial schema and default data for Tala AI
 * This migration is idempotent and can be run multiple times safely
 */

import { getSupabaseService, handleSupabaseError } from '../supabaseClient.js';

export const migration = {
  id: '001_initial_schema',
  name: 'Initial Schema Setup',
  description: 'Creates migrations table, verifies schema, and creates default organization/user',

  /**
   * Run the migration
   */
  async up() {
    const supabase = getSupabaseService();
    const results = {
      migrations_table: false,
      schema_verified: false,
      default_org: false,
      default_user: false,
      errors: []
    };

    console.log('\n🔄 Running migration: 001_initial_schema');
    console.log('━'.repeat(50));

    try {
      // Step 1: Create migrations table if it doesn't exist
      console.log('\n1️⃣  Creating migrations table...');
      const { error: migrationsError } = await supabase.rpc('execute_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS migrations (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            applied_by VARCHAR(255),
            status VARCHAR(50) DEFAULT 'completed',
            metadata JSONB DEFAULT '{}'::jsonb
          );

          -- Create index for faster lookups
          CREATE INDEX IF NOT EXISTS idx_migrations_applied_at ON migrations(applied_at DESC);
        `
      });

      if (migrationsError) {
        // If RPC doesn't exist, try direct table creation
        const { error: directError } = await supabase
          .from('migrations')
          .select('id')
          .limit(1);

        if (directError && directError.code === 'PGRST204') {
          console.log('   ⚠️  Migrations table needs manual creation');
          results.errors.push('Migrations table needs to be created manually');
        } else {
          results.migrations_table = true;
          console.log('   ✅ Migrations table ready');
        }
      } else {
        results.migrations_table = true;
        console.log('   ✅ Migrations table created/verified');
      }

      // Step 2: Verify core tables exist
      console.log('\n2️⃣  Verifying database schema...');
      const tables = [
        'organizations', 'users', 'conversations', 'messages',
        'documents', 'folders', 'tags', 'document_tags', 'primary_folders'
      ];

      const tableChecks = await Promise.all(
        tables.map(async (table) => {
          const { error } = await supabase
            .from(table)
            .select('id')
            .limit(1);
          
          return {
            table,
            exists: !error || error.code === 'PGRST116' // No rows is OK
          };
        })
      );

      const missingTables = tableChecks.filter(t => !t.exists);
      
      if (missingTables.length === 0) {
        results.schema_verified = true;
        console.log('   ✅ All required tables exist');
      } else {
        console.log(`   ❌ Missing tables: ${missingTables.map(t => t.table).join(', ')}`);
        results.errors.push(`Missing tables: ${missingTables.map(t => t.table).join(', ')}`);
        throw new Error('Required tables are missing. Please run schema.sql first.');
      }

      // Step 3: Create default organization if none exists
      console.log('\n3️⃣  Checking for default organization...');
      const { data: existingOrgs, error: orgCheckError } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .limit(1);

      if (orgCheckError) {
        throw new Error(`Failed to check organizations: ${orgCheckError.message}`);
      }

      let defaultOrgId;
      
      if (!existingOrgs || existingOrgs.length === 0) {
        console.log('   📝 Creating default organization...');
        
        const { data: newOrg, error: createOrgError } = await supabase
          .from('organizations')
          .insert({
            name: 'Default Organization',
            slug: 'default',
            description: 'Default organization for migrated data',
            plan_type: 'free',
            max_users: 10,
            max_documents: 1000,
            max_monthly_llm_requests: 10000,
            features: {
              multiLLM: true,
              documentUpload: true,
              folderManagement: true,
              advancedSearch: true
            },
            settings: {
              allowSignup: true,
              requireEmailVerification: false
            }
          })
          .select()
          .single();

        if (createOrgError) {
          throw new Error(`Failed to create default organization: ${createOrgError.message}`);
        }

        defaultOrgId = newOrg.id;
        results.default_org = true;
        console.log(`   ✅ Created default organization: ${newOrg.name} (${newOrg.id})`);
      } else {
        defaultOrgId = existingOrgs[0].id;
        console.log(`   ✅ Using existing organization: ${existingOrgs[0].name} (${defaultOrgId})`);
      }

      // Step 4: Create default admin user if none exists
      console.log('\n4️⃣  Checking for default user...');
      const { data: existingUsers, error: userCheckError } = await supabase
        .from('users')
        .select('id, email, display_name')
        .eq('organization_id', defaultOrgId)
        .limit(1);

      if (userCheckError) {
        throw new Error(`Failed to check users: ${userCheckError.message}`);
      }

      if (!existingUsers || existingUsers.length === 0) {
        console.log('   📝 Creating default admin user...');
        
        const { data: newUser, error: createUserError } = await supabase
          .from('users')
          .insert({
            organization_id: defaultOrgId,
            email: 'admin@localhost',
            email_verified: true,
            display_name: 'Admin User',
            role: 'owner',
            status: 'active',
            preferences: {
              theme: 'light',
              notifications: true
            },
            llm_preferences: {
              preferredModel: 'gpt-4',
              costOptimization: false,
              maxTokens: 2000,
              temperature: 0.7
            },
            metadata: {
              createdBy: 'migration',
              isDefault: true
            }
          })
          .select()
          .single();

        if (createUserError) {
          throw new Error(`Failed to create default user: ${createUserError.message}`);
        }

        results.default_user = true;
        console.log(`   ✅ Created default user: ${newUser.display_name} (${newUser.id})`);
      } else {
        console.log(`   ✅ Using existing user: ${existingUsers[0].display_name}`);
      }

      // Step 5: Verify UUID extension
      console.log('\n5️⃣  Verifying database extensions...');
      try {
        const { data: testUuid } = await supabase.rpc('uuid_generate_v4');
        console.log('   ✅ UUID extension is active');
      } catch (error) {
        console.log('   ⚠️  UUID extension may need to be enabled manually');
      }

      // Record successful migration
      if (results.migrations_table) {
        await this.recordMigration(supabase, 'completed', results);
      }

      console.log('\n✅ Migration 001_initial_schema completed successfully');
      return results;

    } catch (error) {
      console.error('\n❌ Migration failed:', error.message);
      results.errors.push(error.message);
      
      // Try to record failed migration
      if (results.migrations_table) {
        await this.recordMigration(supabase, 'failed', results);
      }
      
      throw error;
    }
  },

  /**
   * Rollback the migration
   */
  async down() {
    const supabase = getSupabaseService();
    console.log('\n🔄 Rolling back migration: 001_initial_schema');
    console.log('━'.repeat(50));

    try {
      // We don't delete the schema or migrations table on rollback
      // Only remove the default data if it was created by this migration

      // Check if we created default user
      const { data: defaultUsers } = await supabase
        .from('users')
        .select('id')
        .eq('metadata->>createdBy', 'migration');

      if (defaultUsers && defaultUsers.length > 0) {
        console.log('\n1️⃣  Removing default users...');
        for (const user of defaultUsers) {
          await supabase
            .from('users')
            .delete()
            .eq('id', user.id);
        }
        console.log('   ✅ Default users removed');
      }

      // Check if we created default organization
      const { data: defaultOrgs } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', 'default');

      if (defaultOrgs && defaultOrgs.length > 0) {
        console.log('\n2️⃣  Removing default organization...');
        for (const org of defaultOrgs) {
          await supabase
            .from('organizations')
            .delete()
            .eq('id', org.id);
        }
        console.log('   ✅ Default organization removed');
      }

      // Remove migration record
      await supabase
        .from('migrations')
        .delete()
        .eq('id', this.id);

      console.log('\n✅ Rollback completed successfully');
      
    } catch (error) {
      console.error('\n❌ Rollback failed:', error.message);
      throw error;
    }
  },

  /**
   * Record migration in database
   */
  async recordMigration(supabase, status, metadata) {
    try {
      await supabase
        .from('migrations')
        .upsert({
          id: this.id,
          name: this.name,
          description: this.description,
          status,
          metadata,
          applied_at: new Date().toISOString(),
          applied_by: 'migration-script'
        });
    } catch (error) {
      console.warn('   ⚠️  Could not record migration status:', error.message);
    }
  }
};

export default migration;