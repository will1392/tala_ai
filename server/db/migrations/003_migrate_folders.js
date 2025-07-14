/**
 * Migration: 003_migrate_folders
 * 
 * Migrates folders from JSON files to database
 * Handles both primary folders and user folders with hierarchy
 */

import fs from 'fs/promises';
import path from 'path';
import { getSupabaseService } from '../supabaseClient.js';

export const migration = {
  id: '003_migrate_folders',
  name: 'Migrate Folders',
  description: 'Migrates primary folders and user folders from JSON files to database',

  /**
   * Run the migration
   */
  async up() {
    const supabase = getSupabaseService();
    const results = {
      primary_folders_migrated: 0,
      user_folders_migrated: 0,
      folder_hierarchy_built: 0,
      errors: [],
      warnings: []
    };

    console.log('\n🔄 Running migration: 003_migrate_folders');
    console.log('━'.repeat(50));

    try {
      // Step 1: Get default organization
      console.log('\n1️⃣  Getting default organization...');
      const { data: orgs, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .limit(1)
        .single();

      if (orgError || !orgs) {
        throw new Error('No organization found. Run 001_initial_schema migration first.');
      }
      
      const defaultOrgId = orgs.id;
      console.log(`   ✅ Using organization: ${defaultOrgId}`);

      // Step 2: Get default user
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('organization_id', defaultOrgId)
        .limit(1)
        .single();

      if (userError || !users?.id) {
        throw new Error('No user found. Run 001_initial_schema migration first.');
      }
      
      const defaultUserId = users.id;
      console.log(`   ✅ Using user: ${defaultUserId}`);

      // Step 3: Migrate primary folders
      console.log('\n2️⃣  Migrating primary folders...');
      await this.migratePrimaryFolders(supabase, defaultOrgId, defaultUserId, results);

      // Step 4: Migrate user folders
      console.log('\n3️⃣  Migrating user folders...');
      await this.migrateUserFolders(supabase, defaultOrgId, defaultUserId, results);

      // Step 5: Update folder hierarchies and paths
      console.log('\n4️⃣  Building folder hierarchies...');
      await this.buildFolderHierarchy(supabase, defaultOrgId, results);

      // Summary
      console.log('\n5️⃣  Migration summary:');
      console.log(`   ✅ Primary folders migrated: ${results.primary_folders_migrated}`);
      console.log(`   ✅ User folders migrated: ${results.user_folders_migrated}`);
      console.log(`   ✅ Hierarchies updated: ${results.folder_hierarchy_built}`);
      if (results.warnings.length > 0) {
        console.log(`   ⚠️  Warnings: ${results.warnings.length}`);
      }

      // Record successful migration
      await this.recordMigration(supabase, 'completed', results);

      console.log('\n✅ Migration 003_migrate_folders completed successfully');
      return results;

    } catch (error) {
      console.error('\n❌ Migration failed:', error.message);
      results.errors.push(error.message);
      
      // Record failed migration
      await this.recordMigration(supabase, 'failed', results);
      
      throw error;
    }
  },

  /**
   * Migrate primary folders from primaryFolders.json
   */
  async migratePrimaryFolders(supabase, organizationId, userId, results) {
    try {
      const primaryFoldersPath = path.join(process.cwd(), 'primaryFolders.json');
      
      let primaryFoldersData;
      try {
        const fileContent = await fs.readFile(primaryFoldersPath, 'utf8');
        primaryFoldersData = JSON.parse(fileContent);
        console.log(`   📂 Found ${primaryFoldersData.length} primary folders`);
      } catch (error) {
        if (error.code === 'ENOENT') {
          console.log('   ℹ️  No primaryFolders.json found - skipping');
          return;
        }
        throw error;
      }

      // Migrate each primary folder
      for (const folder of primaryFoldersData) {
        try {
          // Check if already exists
          const { data: existing } = await supabase
            .from('primary_folders')
            .select('id')
            .eq('id', folder.id)
            .single();

          if (existing) {
            console.log(`   ⏭️  Primary folder ${folder.id} already exists - skipping`);
            continue;
          }

          // Insert primary folder
          const { error: primaryError } = await supabase
            .from('primary_folders')
            .insert({
              id: folder.id,
              name: folder.name,
              description: folder.description || null,
              icon: folder.icon || null,
              color: folder.color || null,
              sort_order: folder.sortOrder || folder.order || 0,
              is_default: folder.isDefault || false,
              category: folder.category || 'general',
              metadata: {
                migrated: true,
                originalData: folder,
                permissions: folder.permissions || {
                  canEdit: true,
                  canDelete: false,
                  canShare: true
                }
              },
              created_at: folder.createdAt || new Date().toISOString(),
              updated_at: folder.updatedAt || folder.createdAt || new Date().toISOString()
            });

          if (primaryError) {
            results.warnings.push(`Primary folder ${folder.id}: ${primaryError.message}`);
            console.log(`   ⚠️  Failed to migrate primary folder ${folder.id}: ${primaryError.message}`);
          } else {
            results.primary_folders_migrated++;
            
            // Also create a corresponding folder entry for backward compatibility
            await supabase
              .from('folders')
              .insert({
                id: `primary_${folder.id}`,
                organization_id: organizationId,
                user_id: userId,
                name: folder.name,
                description: folder.description,
                parent_id: null,
                visibility: 'organization',
                color: folder.color,
                icon: folder.icon,
                sort_order: folder.sortOrder || folder.order || 0,
                is_system: true,
                is_shared: true,
                path: folder.name,
                depth: 0,
                metadata: {
                  migrated: true,
                  isPrimaryFolder: true,
                  primaryFolderId: folder.id
                },
                created_at: folder.createdAt || new Date().toISOString(),
                updated_at: folder.updatedAt || folder.createdAt || new Date().toISOString()
              });
          }

        } catch (error) {
          results.errors.push(`Primary folder ${folder.id}: ${error.message}`);
          console.log(`   ❌ Error migrating primary folder ${folder.id}: ${error.message}`);
        }
      }

    } catch (error) {
      throw new Error(`Failed to migrate primary folders: ${error.message}`);
    }
  },

  /**
   * Migrate user folders from folders.json
   */
  async migrateUserFolders(supabase, organizationId, defaultUserId, results) {
    try {
      const foldersPath = path.join(process.cwd(), 'folders.json');
      
      let foldersData;
      try {
        const fileContent = await fs.readFile(foldersPath, 'utf8');
        foldersData = JSON.parse(fileContent);
        
        // Handle both array and object formats
        const folderArray = Array.isArray(foldersData) ? foldersData : Object.values(foldersData);
        console.log(`   📁 Found ${folderArray.length} user folders`);
        
        foldersData = folderArray;
      } catch (error) {
        if (error.code === 'ENOENT') {
          console.log('   ℹ️  No folders.json found - skipping');
          return;
        }
        throw error;
      }

      // Sort folders by depth to handle parent dependencies
      foldersData.sort((a, b) => {
        const depthA = (a.path || '').split('/').length;
        const depthB = (b.path || '').split('/').length;
        return depthA - depthB;
      });

      // Create user mapping for folders
      const userMap = new Map();
      userMap.set(defaultUserId, defaultUserId);

      // Extract unique user IDs from folders
      const uniqueUserIds = new Set();
      foldersData.forEach(folder => {
        if (folder.userId && folder.userId !== defaultUserId) {
          uniqueUserIds.add(folder.userId);
        }
      });

      // Create users if they don't exist (handle non-UUID user IDs)
      for (const userId of uniqueUserIds) {
        // Check if userId is a valid UUID format
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
        
        if (!isValidUUID) {
          console.log(`   ⚠️  Invalid UUID format for user ${userId}, mapping to default user`);
          userMap.set(userId, defaultUserId);
          continue;
        }

        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', userId)
          .eq('organization_id', organizationId)
          .single();

        if (!existingUser) {
          const { data: newUser, error: userError } = await supabase
            .from('users')
            .insert({
              id: userId,
              organization_id: organizationId,
              email: `${userId}@migrated.local`,
              email_verified: true,
              display_name: userId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              role: 'member',
              status: 'active',
              preferences: {},
              llm_preferences: {
                preferredModel: null,
                costOptimization: false,
                maxTokens: 1000,
                temperature: 0.7
              },
              metadata: {
                migrated: true,
                createdForFolders: true
              }
            })
            .select()
            .single();

          if (userError) {
            console.log(`   ⚠️  Could not create user ${userId}: ${userError.message}`);
            userMap.set(userId, defaultUserId);
          } else {
            userMap.set(userId, newUser.id);
          }
        } else {
          userMap.set(userId, userId);
        }
      }

      // Migrate each folder
      for (const folder of foldersData) {
        try {
          // Generate folder ID if not present
          const folderId = folder.id || `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          // Check if already exists
          const { data: existing } = await supabase
            .from('folders')
            .select('id')
            .eq('id', folderId)
            .single();

          if (existing) {
            console.log(`   ⏭️  Folder ${folderId} already exists - skipping`);
            continue;
          }

          // Calculate folder path and depth
          const pathParts = folder.path ? folder.path.split('/').filter(p => p) : [folder.name];
          const folderPath = pathParts.join('/');
          const folderDepth = pathParts.length - 1;

          // Insert folder
          const { error: folderError } = await supabase
            .from('folders')
            .insert({
              id: folderId,
              organization_id: organizationId,
              user_id: userMap.get(folder.userId) || defaultUserId,
              name: folder.name,
              description: folder.description || null,
              parent_id: folder.parentId || null,
              visibility: folder.visibility || 'private',
              color: folder.color || null,
              icon: folder.icon || null,
              sort_order: folder.sortOrder || folder.order || 0,
              is_system: folder.isSystem || false,
              is_shared: folder.isShared || false,
              path: folderPath,
              depth: folderDepth,
              metadata: {
                shareSettings: folder.shareSettings,
                migrated: true,
                originalData: {
                  ...folder,
                  migratedAt: new Date().toISOString()
                }
              },
              created_at: folder.createdAt || new Date().toISOString(),
              updated_at: folder.updatedAt || folder.createdAt || new Date().toISOString()
            });

          if (folderError) {
            results.warnings.push(`Folder ${folderId}: ${folderError.message}`);
            console.log(`   ⚠️  Failed to migrate folder ${folderId}: ${folderError.message}`);
          } else {
            results.user_folders_migrated++;
          }

        } catch (error) {
          results.errors.push(`Folder ${folder.id || 'unknown'}: ${error.message}`);
          console.log(`   ❌ Error migrating folder: ${error.message}`);
        }
      }

    } catch (error) {
      throw new Error(`Failed to migrate user folders: ${error.message}`);
    }
  },

  /**
   * Build folder hierarchy and update paths
   */
  async buildFolderHierarchy(supabase, organizationId, results) {
    try {
      // Get all folders for this organization
      const { data: folders, error: fetchError } = await supabase
        .from('folders')
        .select('*')
        .eq('organization_id', organizationId)
        .order('depth', { ascending: true });

      if (fetchError) {
        throw new Error(`Failed to fetch folders: ${fetchError.message}`);
      }

      console.log(`   📂 Processing ${folders.length} folders for hierarchy`);

      // Update parent relationships and paths
      const folderMap = new Map(folders.map(f => [f.id, f]));
      let hierarchyUpdates = 0;

      for (const folder of folders) {
        try {
          let needsUpdate = false;
          const updates = {};

          // Recalculate path if has parent
          if (folder.parent_id && folderMap.has(folder.parent_id)) {
            const parent = folderMap.get(folder.parent_id);
            const newPath = `${parent.path}/${folder.name}`;
            const newDepth = parent.depth + 1;

            if (folder.path !== newPath) {
              updates.path = newPath;
              needsUpdate = true;
            }

            if (folder.depth !== newDepth) {
              updates.depth = newDepth;
              needsUpdate = true;
            }
          } else if (!folder.parent_id) {
            // Root folder
            if (folder.path !== folder.name) {
              updates.path = folder.name;
              needsUpdate = true;
            }
            if (folder.depth !== 0) {
              updates.depth = 0;
              needsUpdate = true;
            }
          }

          // Update if needed
          if (needsUpdate) {
            const { error: updateError } = await supabase
              .from('folders')
              .update(updates)
              .eq('id', folder.id);

            if (updateError) {
              results.warnings.push(`Failed to update hierarchy for ${folder.id}: ${updateError.message}`);
            } else {
              hierarchyUpdates++;
              // Update our local copy
              Object.assign(folder, updates);
            }
          }

        } catch (error) {
          results.warnings.push(`Hierarchy error for ${folder.id}: ${error.message}`);
        }
      }

      results.folder_hierarchy_built = hierarchyUpdates;
      console.log(`   ✅ Updated hierarchy for ${hierarchyUpdates} folders`);

    } catch (error) {
      throw new Error(`Failed to build folder hierarchy: ${error.message}`);
    }
  },

  /**
   * Rollback the migration
   */
  async down() {
    const supabase = getSupabaseService();
    console.log('\n🔄 Rolling back migration: 003_migrate_folders');
    console.log('━'.repeat(50));

    try {
      // Delete user folders first
      console.log('\n1️⃣  Removing migrated user folders...');
      const { error: foldersError } = await supabase
        .from('folders')
        .delete()
        .eq('metadata->>migrated', 'true');

      if (foldersError) {
        console.log(`   ⚠️  Could not remove folders: ${foldersError.message}`);
      } else {
        console.log('   ✅ User folders removed');
      }

      // Delete primary folders
      console.log('\n2️⃣  Removing migrated primary folders...');
      const { error: primaryError } = await supabase
        .from('primary_folders')
        .delete()
        .eq('metadata->>migrated', 'true');

      if (primaryError) {
        console.log(`   ⚠️  Could not remove primary folders: ${primaryError.message}`);
      } else {
        console.log('   ✅ Primary folders removed');
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