/**
 * Migration: 003_migrate_folders
 * Description: Migrates folders from JSON files to PostgreSQL
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

class MigrateFoldersMigration {
  constructor(supabaseUrl, supabaseKey) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.migrationName = '003_migrate_folders';
  }

  async up() {
    console.log(`Running migration: ${this.migrationName}`);
    
    try {
      // Check if migration has already been run
      const hasRun = await this.hasMigrationRun();
      if (hasRun) {
        console.log(`Migration ${this.migrationName} has already been applied. Skipping...`);
        return;
      }

      // Get default organization
      const { data: org } = await this.supabase
        .from('organizations')
        .select('*')
        .eq('slug', 'default')
        .single();

      if (!org) {
        throw new Error('Default organization not found. Run 001_initial_schema first.');
      }

      // Load primary folders from JSON
      const primaryFoldersPath = path.join(__dirname, '..', 'primaryFolders.json');
      const primaryFoldersData = await fs.readFile(primaryFoldersPath, 'utf8');
      const primaryFolders = JSON.parse(primaryFoldersData);

      // Load folders from JSON
      const foldersPath = path.join(__dirname, '..', 'folders.json');
      const foldersData = await fs.readFile(foldersPath, 'utf8');
      const folders = JSON.parse(foldersData);

      // Migrate primary folders first
      console.log(`Migrating ${primaryFolders.length} primary folders...`);
      let primaryFolderCount = 0;

      for (const folder of primaryFolders) {
        try {
          // Ensure user exists
          const { data: user } = await this.supabase
            .from('users')
            .select('*')
            .eq('id', folder.userId)
            .single();

          if (!user) {
            console.log(`User ${folder.userId} not found. Creating...`);
            const { error: userError } = await this.supabase
              .from('users')
              .insert({
                id: folder.userId,
                email: `${folder.userId}@tala.ai`,
                role: 'admin',
                organization_id: org.id,
                profile: {
                  firstName: folder.userId.split('-')[0],
                  lastName: 'User'
                }
              });

            if (userError && !userError.message.includes('duplicate')) {
              console.error(`Error creating user ${folder.userId}:`, userError);
              continue;
            }
          }

          // Insert primary folder
          const { error: folderError } = await this.supabase
            .from('folders')
            .insert({
              id: folder.id,
              name: folder.name,
              slug: folder.slug,
              description: folder.description,
              icon: folder.icon,
              color: folder.color,
              order_index: folder.order,
              is_system: folder.isSystem,
              visibility: folder.permissions?.visibility || 'public',
              created_at: folder.createdAt,
              updated_at: folder.updatedAt,
              created_by: folder.userId,
              organization_id: org.id,
              metadata: {
                permissions: folder.permissions,
                subFolderCount: folder.subFolderCount || 0,
                documentCount: folder.documentCount || 0,
                totalSize: folder.totalSize || 0
              }
            });

          if (folderError && !folderError.message.includes('duplicate')) {
            console.error(`Error inserting primary folder ${folder.id}:`, folderError);
            continue;
          }

          primaryFolderCount++;
        } catch (error) {
          console.error(`Error processing primary folder ${folder.id}:`, error);
        }
      }

      // Migrate regular folders (subfolders)
      console.log(`Migrating ${folders.length} folders...`);
      let folderCount = 0;

      for (const folder of folders) {
        try {
          // Skip if this folder is already migrated as a primary folder
          const { data: existingFolder } = await this.supabase
            .from('folders')
            .select('*')
            .eq('id', folder.id)
            .single();

          if (existingFolder) {
            console.log(`Folder ${folder.id} already exists. Skipping...`);
            continue;
          }

          // Ensure user exists
          const { data: user } = await this.supabase
            .from('users')
            .select('*')
            .eq('id', folder.userId)
            .single();

          if (!user) {
            console.log(`User ${folder.userId} not found. Creating...`);
            const { error: userError } = await this.supabase
              .from('users')
              .insert({
                id: folder.userId,
                email: `${folder.userId}@tala.ai`,
                role: folder.isAdmin ? 'admin' : 'agent',
                organization_id: org.id,
                profile: {
                  firstName: folder.userId.split('-')[0],
                  lastName: 'User'
                }
              });

            if (userError && !userError.message.includes('duplicate')) {
              console.error(`Error creating user ${folder.userId}:`, userError);
              continue;
            }
          }

          // Insert folder
          const { error: folderError } = await this.supabase
            .from('folders')
            .insert({
              id: folder.id,
              name: folder.name,
              parent_id: folder.primaryFolderId || null,
              created_at: folder.createdAt,
              created_by: folder.userId,
              organization_id: org.id,
              visibility: folder.isAdmin ? 'admin-only' : 'public',
              metadata: {
                documentCount: folder.documentCount || 0,
                isAdmin: folder.isAdmin
              }
            });

          if (folderError && !folderError.message.includes('duplicate')) {
            console.error(`Error inserting folder ${folder.id}:`, folderError);
            continue;
          }

          folderCount++;
        } catch (error) {
          console.error(`Error processing folder ${folder.id}:`, error);
        }
      }

      console.log(`Migrated ${primaryFolderCount} primary folders and ${folderCount} regular folders`);

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
      // Load folder IDs from JSON to delete only migrated data
      const primaryFoldersPath = path.join(__dirname, '..', 'primaryFolders.json');
      const primaryFoldersData = await fs.readFile(primaryFoldersPath, 'utf8');
      const primaryFolders = JSON.parse(primaryFoldersData);

      const foldersPath = path.join(__dirname, '..', 'folders.json');
      const foldersData = await fs.readFile(foldersPath, 'utf8');
      const folders = JSON.parse(foldersData);

      const allFolderIds = [
        ...primaryFolders.map(f => f.id),
        ...folders.map(f => f.id)
      ];

      // Delete folders
      const { error: folderError } = await this.supabase
        .from('folders')
        .delete()
        .in('id', allFolderIds);

      if (folderError) {
        console.error('Error deleting folders:', folderError);
      }

      // Remove migration record
      await this.removeMigrationRecord();
      
      console.log(`Migration ${this.migrationName} rolled back successfully`);
    } catch (error) {
      console.error(`Error rolling back migration ${this.migrationName}:`, error);
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

module.exports = MigrateFoldersMigration;