/**
 * Database Migration Script for Tala AI
 * 
 * Handles schema creation, data migration from JSON files to Supabase,
 * and provides migration management utilities.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { getSupabaseService, checkSchemaStatus, getDatabaseStats } from './supabaseClient.js';
import { logDatabaseStatus } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Run database schema migration
 * @returns {Object} Migration result
 */
export async function runSchemaMigration() {
  console.log('\n🗄️  RUNNING DATABASE SCHEMA MIGRATION');
  console.log('=' .repeat(50));

  try {
    // Check current schema status
    const schemaStatus = await checkSchemaStatus();
    
    if (schemaStatus.schemaExists) {
      console.log('✅ Database schema already exists');
      console.log(`   Tables: ${schemaStatus.existingTables.join(', ')}`);
      return {
        success: true,
        message: 'Schema already exists',
        tables: schemaStatus.existingTables
      };
    }

    console.log('📋 Creating database schema...');
    
    // Read schema SQL file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = await fs.readFile(schemaPath, 'utf8');
    
    // Execute schema creation
    const client = getSupabaseService();
    
    // Split SQL into individual statements (basic approach)
    const statements = schemaSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`   Executing ${statements.length} SQL statements...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        // Skip comments and empty statements
        if (statement.startsWith('--') || statement.trim().length === 0) {
          continue;
        }
        
        const { error } = await client.rpc('exec_sql', {
          sql: statement + ';'
        });
        
        if (error) {
          console.warn(`   ⚠️  Statement ${i + 1} warning:`, error.message);
          errorCount++;
        } else {
          successCount++;
        }
        
      } catch (error) {
        console.warn(`   ⚠️  Statement ${i + 1} failed:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`✅ Schema migration completed: ${successCount} successful, ${errorCount} warnings`);
    
    // Verify schema creation
    const finalStatus = await checkSchemaStatus();
    
    if (finalStatus.schemaExists) {
      console.log('✅ Schema verification successful');
      console.log(`   Created tables: ${finalStatus.existingTables.join(', ')}`);
      
      return {
        success: true,
        message: 'Schema created successfully',
        tables: finalStatus.existingTables,
        statements: {
          total: statements.length,
          successful: successCount,
          errors: errorCount
        }
      };
    } else {
      return {
        success: false,
        message: 'Schema creation incomplete',
        missingTables: finalStatus.missingTables
      };
    }
    
  } catch (error) {
    console.error('❌ Schema migration failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Migrate JSON data to database
 * @param {Object} options - Migration options
 * @returns {Object} Migration result
 */
export async function migrateJsonData(options = {}) {
  const {
    dryRun = false,
    skipExisting = true,
    batchSize = 100
  } = options;

  console.log('\n📂 MIGRATING JSON DATA TO DATABASE');
  console.log('=' .repeat(50));
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`);
  
  try {
    const client = getSupabaseService();
    const results = {
      conversations: { migrated: 0, skipped: 0, errors: 0 },
      messages: { migrated: 0, skipped: 0, errors: 0 },
      folders: { migrated: 0, skipped: 0, errors: 0 },
      primaryFolders: { migrated: 0, skipped: 0, errors: 0 }
    };

    // Create default organization first
    let organizationId = null;
    
    if (!dryRun) {
      const { data: org, error: orgError } = await client
        .from('organizations')
        .insert({
          name: 'Default Organization',
          slug: 'default',
          description: 'Migrated from JSON files'
        })
        .select()
        .single();

      if (orgError && !orgError.message.includes('unique')) {
        throw orgError;
      }
      
      organizationId = org?.id || (await client
        .from('organizations')
        .select('id')
        .eq('slug', 'default')
        .single()).data?.id;
    }

    // Migrate primary folders
    console.log('\n📁 Migrating primary folders...');
    try {
      const primaryFoldersPath = path.join(__dirname, '../primaryFolders.json');
      const primaryFoldersData = JSON.parse(await fs.readFile(primaryFoldersPath, 'utf8'));
      
      for (const folder of primaryFoldersData) {
        if (dryRun) {
          console.log(`   [DRY RUN] Would migrate folder: ${folder.name}`);
          results.primaryFolders.migrated++;
        } else {
          const { error } = await client
            .from('primary_folders')
            .insert({
              name: folder.name,
              description: folder.description,
              icon: folder.icon,
              color: folder.color,
              sort_order: folder.sortOrder || 0,
              is_default: true,
              category: 'migrated'
            });

          if (error && !skipExisting) {
            console.error(`   ❌ Failed to migrate folder ${folder.name}:`, error.message);
            results.primaryFolders.errors++;
          } else {
            console.log(`   ✅ Migrated folder: ${folder.name}`);
            results.primaryFolders.migrated++;
          }
        }
      }
    } catch (error) {
      console.warn('⚠️  Primary folders file not found or invalid');
    }

    // Migrate conversations and messages
    console.log('\n💬 Migrating conversations...');
    try {
      const conversationsPath = path.join(__dirname, '../conversations.json');
      const conversationsData = JSON.parse(await fs.readFile(conversationsPath, 'utf8'));
      
      // Create default user if needed
      let defaultUserId = null;
      if (!dryRun && organizationId) {
        const { data: user, error: userError } = await client
          .from('users')
          .insert({
            organization_id: organizationId,
            email: 'migrated@tala.ai',
            first_name: 'Migrated',
            last_name: 'User',
            display_name: 'Migrated User',
            role: 'admin'
          })
          .select()
          .single();

        if (userError && !userError.message.includes('unique')) {
          console.log('   Using existing default user');
        }
        
        defaultUserId = user?.id || (await client
          .from('users')
          .select('id')
          .eq('email', 'migrated@tala.ai')
          .single()).data?.id;
      }

      // Process conversations
      const conversations = Array.isArray(conversationsData) ? conversationsData : Object.values(conversationsData);
      
      for (const conv of conversations) {
        if (dryRun) {
          console.log(`   [DRY RUN] Would migrate conversation: ${conv.title || conv.id}`);
          results.conversations.migrated++;
          
          // Count messages
          if (conv.messages) {
            results.messages.migrated += conv.messages.length;
          }
        } else {
          // Insert conversation
          const { data: newConv, error: convError } = await client
            .from('conversations')
            .insert({
              id: conv.id,
              organization_id: organizationId,
              user_id: defaultUserId,
              title: conv.title || 'Untitled Conversation',
              status: 'active',
              message_count: conv.messages?.length || 0,
              created_at: conv.createdAt || new Date().toISOString(),
              updated_at: conv.lastActivity || new Date().toISOString()
            })
            .select()
            .single();

          if (convError) {
            console.error(`   ❌ Failed to migrate conversation ${conv.id}:`, convError.message);
            results.conversations.errors++;
            continue;
          }

          console.log(`   ✅ Migrated conversation: ${conv.title}`);
          results.conversations.migrated++;

          // Migrate messages
          if (conv.messages && Array.isArray(conv.messages)) {
            for (let i = 0; i < conv.messages.length; i++) {
              const msg = conv.messages[i];
              
              const { error: msgError } = await client
                .from('messages')
                .insert({
                  id: msg.id,
                  conversation_id: newConv.id,
                  content: msg.content,
                  sender: msg.sender,
                  message_index: i,
                  model_used: msg.model,
                  total_tokens: msg.tokensUsed,
                  created_at: msg.timestamp || new Date().toISOString()
                });

              if (msgError) {
                console.error(`     ❌ Failed to migrate message ${msg.id}:`, msgError.message);
                results.messages.errors++;
              } else {
                results.messages.migrated++;
              }
            }
            console.log(`     ✅ Migrated ${conv.messages.length} messages`);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️  Conversations file not found or invalid:', error.message);
    }

    // Migrate folders
    console.log('\n📂 Migrating folders...');
    try {
      const foldersPath = path.join(__dirname, '../folders.json');
      const foldersData = JSON.parse(await fs.readFile(foldersPath, 'utf8'));
      
      const folders = Array.isArray(foldersData) ? foldersData : Object.values(foldersData);
      
      for (const folder of folders) {
        if (dryRun) {
          console.log(`   [DRY RUN] Would migrate folder: ${folder.name}`);
          results.folders.migrated++;
        } else {
          const { error } = await client
            .from('folders')
            .insert({
              id: folder.id,
              organization_id: organizationId,
              name: folder.name,
              description: folder.description,
              color: folder.color,
              icon: folder.icon,
              is_system: folder.isSystem || false,
              sort_order: folder.sortOrder || 0,
              created_at: folder.createdAt || new Date().toISOString()
            });

          if (error) {
            console.error(`   ❌ Failed to migrate folder ${folder.name}:`, error.message);
            results.folders.errors++;
          } else {
            console.log(`   ✅ Migrated folder: ${folder.name}`);
            results.folders.migrated++;
          }
        }
      }
    } catch (error) {
      console.warn('⚠️  Folders file not found or invalid:', error.message);
    }

    // Summary
    console.log('\n📊 MIGRATION SUMMARY');
    console.log('-'.repeat(30));
    Object.entries(results).forEach(([type, stats]) => {
      console.log(`${type}: ${stats.migrated} migrated, ${stats.skipped} skipped, ${stats.errors} errors`);
    });

    const totalMigrated = Object.values(results).reduce((sum, stats) => sum + stats.migrated, 0);
    const totalErrors = Object.values(results).reduce((sum, stats) => sum + stats.errors, 0);

    return {
      success: totalErrors === 0,
      dryRun,
      results,
      summary: {
        totalMigrated,
        totalErrors,
        organizationId
      }
    };

  } catch (error) {
    console.error('❌ Data migration failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Full migration: schema + data
 * @param {Object} options - Migration options
 * @returns {Object} Migration result
 */
export async function runFullMigration(options = {}) {
  console.log('\n🚀 RUNNING FULL DATABASE MIGRATION');
  console.log('=' .repeat(60));
  
  logDatabaseStatus();
  
  // Step 1: Schema migration
  const schemaResult = await runSchemaMigration();
  if (!schemaResult.success) {
    return {
      success: false,
      error: 'Schema migration failed',
      details: schemaResult
    };
  }

  // Step 2: Data migration
  const dataResult = await migrateJsonData(options);
  
  // Step 3: Get final database stats
  const stats = await getDatabaseStats();
  
  console.log('\n🏆 MIGRATION COMPLETED');
  console.log('=' .repeat(30));
  
  if (stats.success) {
    console.log('📊 Final Database Statistics:');
    Object.entries(stats.tables).forEach(([table, count]) => {
      console.log(`   ${table}: ${count} records`);
    });
  }
  
  return {
    success: dataResult.success,
    schema: schemaResult,
    data: dataResult,
    stats: stats.tables
  };
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const isDryRun = process.argv.includes('--dry-run');
  
  switch (command) {
    case 'schema':
      runSchemaMigration();
      break;
    case 'data':
      migrateJsonData({ dryRun: isDryRun });
      break;
    case 'full':
      runFullMigration({ dryRun: isDryRun });
      break;
    default:
      console.log('Usage: node migrate.js <schema|data|full> [--dry-run]');
      break;
  }
}

export default {
  runSchemaMigration,
  migrateJsonData,
  runFullMigration
};