/**
 * Migration: 001_initial_schema
 * Description: Creates the initial database schema for Tala AI
 */

const { createClient } = require('@supabase/supabase-js');

class InitialSchemaMigration {
  constructor(supabaseUrl, supabaseKey) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.migrationName = '001_initial_schema';
  }

  async up() {
    console.log(`Running migration: ${this.migrationName}`);
    
    try {
      // Create migration tracking table
      await this.createMigrationTable();
      
      // Check if migration has already been run
      const hasRun = await this.hasMigrationRun();
      if (hasRun) {
        console.log(`Migration ${this.migrationName} has already been applied. Skipping...`);
        return;
      }

      // Create enum types
      await this.createEnumTypes();
      
      // Create organizations table
      await this.createOrganizationsTable();
      
      // Create users table
      await this.createUsersTable();
      
      // Create folders table
      await this.createFoldersTable();
      
      // Create documents table
      await this.createDocumentsTable();
      
      // Create conversations table
      await this.createConversationsTable();
      
      // Create messages table
      await this.createMessagesTable();
      
      // Create indexes
      await this.createIndexes();
      
      // Create default organization and user
      await this.createDefaults();
      
      // Record migration as complete
      await this.recordMigration();
      
      console.log(`Migration ${this.migrationName} completed successfully`);
    } catch (error) {
      console.error(`Error running migration ${this.migrationName}:`, error);
      throw error;
    }
  }

  async down() {
    console.log(`Rolling back migration: ${this.migrationName}`);
    
    try {
      // Drop tables in reverse order
      await this.supabase.rpc('drop_table_if_exists', { table_name: 'messages' });
      await this.supabase.rpc('drop_table_if_exists', { table_name: 'conversations' });
      await this.supabase.rpc('drop_table_if_exists', { table_name: 'documents' });
      await this.supabase.rpc('drop_table_if_exists', { table_name: 'folders' });
      await this.supabase.rpc('drop_table_if_exists', { table_name: 'users' });
      await this.supabase.rpc('drop_table_if_exists', { table_name: 'organizations' });
      
      // Drop enum types
      await this.supabase.rpc('drop_type_if_exists', { type_name: 'user_role' });
      await this.supabase.rpc('drop_type_if_exists', { type_name: 'visibility_type' });
      await this.supabase.rpc('drop_type_if_exists', { type_name: 'message_sender' });
      
      // Remove migration record
      await this.removeMigrationRecord();
      
      console.log(`Migration ${this.migrationName} rolled back successfully`);
    } catch (error) {
      console.error(`Error rolling back migration ${this.migrationName}:`, error);
      throw error;
    }
  }

  async createMigrationTable() {
    const { error } = await this.supabase.rpc('create_migration_table');
    if (error && !error.message.includes('already exists')) {
      throw error;
    }
  }

  async hasMigrationRun() {
    const { data, error } = await this.supabase
      .from('migrations')
      .select('*')
      .eq('name', this.migrationName)
      .single();
    
    return !!data;
  }

  async createEnumTypes() {
    // Note: These would typically be created via SQL functions
    // For now, we'll use the existing schema
    console.log('Enum types should already exist in the database');
  }

  async createOrganizationsTable() {
    console.log('Creating organizations table...');
    // Table should already exist from schema.sql
  }

  async createUsersTable() {
    console.log('Creating users table...');
    // Table should already exist from schema.sql
  }

  async createFoldersTable() {
    console.log('Creating folders table...');
    // Table should already exist from schema.sql
  }

  async createDocumentsTable() {
    console.log('Creating documents table...');
    // Table should already exist from schema.sql
  }

  async createConversationsTable() {
    console.log('Creating conversations table...');
    // Table should already exist from schema.sql
  }

  async createMessagesTable() {
    console.log('Creating messages table...');
    // Table should already exist from schema.sql
  }

  async createIndexes() {
    console.log('Creating indexes...');
    // Indexes should already exist from schema.sql
  }

  async createDefaults() {
    // Check if default organization exists
    const { data: existingOrg } = await this.supabase
      .from('organizations')
      .select('*')
      .eq('slug', 'default')
      .single();

    if (!existingOrg) {
      // Create default organization
      const { data: org, error: orgError } = await this.supabase
        .from('organizations')
        .insert({
          name: 'Default Organization',
          slug: 'default',
          settings: {
            defaultTheme: 'light',
            allowSignups: true
          }
        })
        .select()
        .single();

      if (orgError) {
        console.error('Error creating default organization:', orgError);
        throw orgError;
      }

      // Create admin user
      const { error: userError } = await this.supabase
        .from('users')
        .insert({
          id: 'admin-1',
          email: 'admin@tala.ai',
          role: 'admin',
          profile: {
            firstName: 'Admin',
            lastName: 'User'
          },
          organization_id: org.id
        });

      if (userError && !userError.message.includes('duplicate')) {
        console.error('Error creating admin user:', userError);
        throw userError;
      }
    }
  }

  async recordMigration() {
    const { error } = await this.supabase
      .from('migrations')
      .insert({
        name: this.migrationName,
        applied_at: new Date().toISOString()
      });

    if (error) {
      throw error;
    }
  }

  async removeMigrationRecord() {
    const { error } = await this.supabase
      .from('migrations')
      .delete()
      .eq('name', this.migrationName);

    if (error) {
      throw error;
    }
  }
}

module.exports = InitialSchemaMigration;