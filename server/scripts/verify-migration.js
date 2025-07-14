#!/usr/bin/env node

/**
 * Migration Verification Script for Tala AI
 * 
 * Compares data between JSON files and database to ensure migration accuracy:
 * - Reads existing JSON files (conversations, folders, etc.)
 * - Queries corresponding database tables
 * - Reports missing, mismatched, or corrupted data
 * - Validates relationships and data integrity
 * - Provides detailed migration status report
 */

import { config } from 'dotenv';
config();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import { getSupabaseHealth, getAdminClient } from '../db/supabaseClient.js';

// Import database services
import { OrganizationService } from '../services/db/organizationService.js';
import { UserService } from '../services/db/userService.js';
import { ConversationService } from '../services/db/conversationService.js';
import { FolderService } from '../services/db/folderService.js';
import { DocumentService } from '../services/db/documentService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serverDir = path.dirname(__dirname);

console.log('🔍 MIGRATION VERIFICATION SCRIPT');
console.log('═'.repeat(60));

// Configuration
const VERIFICATION_CONFIG = {
  verbose: process.argv.includes('--verbose'),
  fixMissing: process.argv.includes('--fix'),
  exportReport: process.argv.includes('--export'),
  jsonFilesPath: serverDir
};

// Data storage
let verificationData = {
  jsonData: {},
  databaseData: {},
  comparison: {
    missing: [],
    mismatched: [],
    orphaned: [],
    statistics: {}
  }
};

// Initialize services
const services = {
  organization: new OrganizationService(),
  user: new UserService(),
  conversation: new ConversationService(),
  folder: new FolderService(),
  document: new DocumentService()
};

/**
 * Read JSON data files
 */
async function readJsonFiles() {
  console.log('\n📂 Reading JSON Data Files...');
  console.log('-'.repeat(40));
  
  try {
    const jsonFiles = {
      conversations: 'conversations.json',
      folders: 'folders.json',
      primaryFolders: 'primaryFolders.json',
      documents: 'documents.json' // If exists
    };
    
    for (const [key, filename] of Object.entries(jsonFiles)) {
      const filePath = path.join(VERIFICATION_CONFIG.jsonFilesPath, filename);
      
      if (!fs.existsSync(filePath)) {
        console.log(`   ⏭️ Skipping ${filename} (file not found)`);
        verificationData.jsonData[key] = null;
        continue;
      }
      
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(fileContent);
        
        // Handle different JSON file formats
        if (key === 'conversations' && jsonData.conversations) {
          // Handle nested array format: { "conversations": [[id, data], ...] }
          if (Array.isArray(jsonData.conversations) && jsonData.conversations.length > 0 && Array.isArray(jsonData.conversations[0])) {
            verificationData.jsonData[key] = {
              conversations: new Map(jsonData.conversations),
              messages: jsonData.messages ? new Map(jsonData.messages) : new Map()
            };
          } else {
            verificationData.jsonData[key] = jsonData;
          }
        } else if (key === 'folders' && Array.isArray(jsonData)) {
          // Handle array format
          verificationData.jsonData[key] = jsonData;
        } else if (key === 'primaryFolders' && Array.isArray(jsonData)) {
          verificationData.jsonData[key] = jsonData;
        } else {
          verificationData.jsonData[key] = jsonData;
        }
        
        const count = getDataCount(verificationData.jsonData[key]);
        console.log(`   ✅ Read ${filename}: ${count} items`);
        
        if (VERIFICATION_CONFIG.verbose) {
          console.log(`      Structure: ${typeof verificationData.jsonData[key]}`);
          if (key === 'conversations') {
            const convData = verificationData.jsonData[key];
            if (convData.conversations && convData.messages) {
              console.log(`      Conversations: ${convData.conversations.size}`);
              console.log(`      Messages: ${convData.messages.size}`);
            }
          }
        }
        
      } catch (parseError) {
        console.error(`   ❌ Failed to parse ${filename}: ${parseError.message}`);
        verificationData.jsonData[key] = null;
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to read JSON files:', error.message);
    return false;
  }
}

/**
 * Get count of items in data structure
 */
function getDataCount(data) {
  if (!data) return 0;
  if (Array.isArray(data)) return data.length;
  if (data instanceof Map) return data.size;
  if (typeof data === 'object') {
    if (data.conversations && data.messages) {
      return (data.conversations.size || 0) + (data.messages.size || 0);
    }
    return Object.keys(data).length;
  }
  return 0;
}

/**
 * Read database data
 */
async function readDatabaseData() {
  console.log('\n🗄️ Reading Database Data...');
  console.log('-'.repeat(40));
  
  try {
    const adminClient = getAdminClient();
    
    // Read all organizations
    console.log('   📊 Reading organizations...');
    const orgResult = await services.organization.getMany({}, { pagination: { page: 1, pageSize: 1000 } });
    verificationData.databaseData.organizations = orgResult.success ? orgResult.data : [];
    console.log(`   ✅ Organizations: ${verificationData.databaseData.organizations.length}`);
    
    // Read all users
    console.log('   👤 Reading users...');
    const userResult = await services.user.getMany({}, { pagination: { page: 1, pageSize: 1000 } });
    verificationData.databaseData.users = userResult.success ? userResult.data : [];
    console.log(`   ✅ Users: ${verificationData.databaseData.users.length}`);
    
    // Read all conversations
    console.log('   💬 Reading conversations...');
    const convResult = await services.conversation.getMany({}, { pagination: { page: 1, pageSize: 1000 } });
    verificationData.databaseData.conversations = convResult.success ? convResult.data : [];
    console.log(`   ✅ Conversations: ${verificationData.databaseData.conversations.length}`);
    
    // Read all folders
    console.log('   📁 Reading folders...');
    const folderResult = await services.folder.getMany({}, { pagination: { page: 1, pageSize: 1000 } });
    verificationData.databaseData.folders = folderResult.success ? folderResult.data : [];
    console.log(`   ✅ Folders: ${verificationData.databaseData.folders.length}`);
    
    // Read all documents
    console.log('   📄 Reading documents...');
    const docResult = await services.document.getMany({}, { pagination: { page: 1, pageSize: 1000 } });
    verificationData.databaseData.documents = docResult.success ? docResult.data : [];
    console.log(`   ✅ Documents: ${verificationData.databaseData.documents.length}`);
    
    // Read messages directly from database (if table exists)
    console.log('   📝 Reading messages...');
    try {
      const { data: messages, error } = await adminClient
        .from('messages')
        .select('*')
        .limit(1000);
      
      if (error) {
        console.log(`   ⏭️ Messages table not accessible: ${error.message}`);
        verificationData.databaseData.messages = [];
      } else {
        verificationData.databaseData.messages = messages || [];
        console.log(`   ✅ Messages: ${verificationData.databaseData.messages.length}`);
      }
    } catch (msgError) {
      console.log(`   ⏭️ Messages not available: ${msgError.message}`);
      verificationData.databaseData.messages = [];
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to read database data:', error.message);
    return false;
  }
}

/**
 * Compare conversations between JSON and database
 */
function compareConversations() {
  console.log('\n💬 Comparing Conversations...');
  console.log('-'.repeat(40));
  
  const jsonConversations = verificationData.jsonData.conversations;
  const dbConversations = verificationData.databaseData.conversations;
  
  if (!jsonConversations) {
    console.log('   ⏭️ No JSON conversations to compare');
    return { missing: [], mismatched: [], extra: [] };
  }
  
  const missing = [];
  const mismatched = [];
  const extra = [...dbConversations]; // Start with all DB conversations
  
  let jsonConvMap;
  if (jsonConversations.conversations instanceof Map) {
    jsonConvMap = jsonConversations.conversations;
  } else if (Array.isArray(jsonConversations)) {
    jsonConvMap = new Map(jsonConversations.map(c => [c.id, c]));
  } else {
    console.log('   ❌ Unexpected JSON conversations format');
    return { missing: [], mismatched: [], extra: [] };
  }
  
  console.log(`   Comparing ${jsonConvMap.size} JSON vs ${dbConversations.length} DB conversations`);
  
  for (const [jsonId, jsonConv] of jsonConvMap) {
    // Find corresponding database conversation
    const dbConv = dbConversations.find(c => {
      // Try matching by original ID stored in metadata
      return c.metadata?.original_id === jsonId || 
             c.id === jsonId || 
             c.title === jsonConv.title;
    });
    
    if (!dbConv) {
      missing.push({
        type: 'conversation',
        id: jsonId,
        title: jsonConv.title,
        data: jsonConv
      });
    } else {
      // Remove from extra list
      const extraIndex = extra.findIndex(c => c.id === dbConv.id);
      if (extraIndex !== -1) {
        extra.splice(extraIndex, 1);
      }
      
      // Check for mismatches
      const mismatches = [];
      if (jsonConv.title !== dbConv.title) {
        mismatches.push(`title: "${jsonConv.title}" vs "${dbConv.title}"`);
      }
      if (jsonConv.userId && jsonConv.userId !== dbConv.user_id) {
        mismatches.push(`user_id: "${jsonConv.userId}" vs "${dbConv.user_id}"`);
      }
      
      if (mismatches.length > 0) {
        mismatched.push({
          type: 'conversation',
          id: jsonId,
          dbId: dbConv.id,
          mismatches
        });
      }
    }
  }
  
  console.log(`   📊 Missing: ${missing.length}, Mismatched: ${mismatched.length}, Extra: ${extra.length}`);
  
  if (VERIFICATION_CONFIG.verbose) {
    missing.forEach(item => {
      console.log(`      Missing: ${item.title} (${item.id})`);
    });
    mismatched.forEach(item => {
      console.log(`      Mismatched: ${item.id} - ${item.mismatches.join(', ')}`);
    });
    extra.forEach(item => {
      console.log(`      Extra in DB: ${item.title} (${item.id})`);
    });
  }
  
  return { missing, mismatched, extra };
}

/**
 * Compare messages between JSON and database
 */
function compareMessages() {
  console.log('\n📝 Comparing Messages...');
  console.log('-'.repeat(40));
  
  const jsonConversations = verificationData.jsonData.conversations;
  const dbMessages = verificationData.databaseData.messages;
  
  if (!jsonConversations || !jsonConversations.messages) {
    console.log('   ⏭️ No JSON messages to compare');
    return { missing: [], mismatched: [], extra: [] };
  }
  
  const jsonMessages = jsonConversations.messages;
  const missing = [];
  const mismatched = [];
  const extra = [...dbMessages];
  
  console.log(`   Comparing ${jsonMessages.size} JSON message groups vs ${dbMessages.length} DB messages`);
  
  // Count total JSON messages
  let totalJsonMessages = 0;
  for (const [conversationId, messages] of jsonMessages) {
    if (Array.isArray(messages)) {
      totalJsonMessages += messages.length;
      
      for (const jsonMessage of messages) {
        // Find corresponding database message
        const dbMessage = dbMessages.find(m => {
          return m.conversation_id === conversationId ||
                 m.content === jsonMessage.content ||
                 m.metadata?.original_id === jsonMessage.id;
        });
        
        if (!dbMessage) {
          missing.push({
            type: 'message',
            id: jsonMessage.id,
            conversationId,
            content: jsonMessage.content?.substring(0, 50) + '...',
            data: jsonMessage
          });
        } else {
          // Remove from extra list
          const extraIndex = extra.findIndex(m => m.id === dbMessage.id);
          if (extraIndex !== -1) {
            extra.splice(extraIndex, 1);
          }
        }
      }
    }
  }
  
  console.log(`   📊 Total JSON messages: ${totalJsonMessages}`);
  console.log(`   📊 Missing: ${missing.length}, Mismatched: ${mismatched.length}, Extra: ${extra.length}`);
  
  return { missing, mismatched, extra };
}

/**
 * Compare folders between JSON and database
 */
function compareFolders() {
  console.log('\n📁 Comparing Folders...');
  console.log('-'.repeat(40));
  
  const jsonFolders = verificationData.jsonData.folders;
  const jsonPrimaryFolders = verificationData.jsonData.primaryFolders;
  const dbFolders = verificationData.databaseData.folders;
  
  const missing = [];
  const mismatched = [];
  const extra = [...dbFolders];
  
  // Compare regular folders
  if (jsonFolders && Array.isArray(jsonFolders)) {
    console.log(`   Comparing ${jsonFolders.length} JSON folders vs ${dbFolders.length} DB folders`);
    
    for (const jsonFolder of jsonFolders) {
      const dbFolder = dbFolders.find(f => {
        return f.metadata?.original_id === jsonFolder.id ||
               f.id === jsonFolder.id ||
               f.name === jsonFolder.name;
      });
      
      if (!dbFolder) {
        missing.push({
          type: 'folder',
          id: jsonFolder.id,
          name: jsonFolder.name,
          data: jsonFolder
        });
      } else {
        // Remove from extra list
        const extraIndex = extra.findIndex(f => f.id === dbFolder.id);
        if (extraIndex !== -1) {
          extra.splice(extraIndex, 1);
        }
      }
    }
  }
  
  // Compare primary folders
  if (jsonPrimaryFolders && Array.isArray(jsonPrimaryFolders)) {
    console.log(`   Comparing ${jsonPrimaryFolders.length} JSON primary folders`);
    
    for (const jsonPrimaryFolder of jsonPrimaryFolders) {
      const dbFolder = dbFolders.find(f => {
        return f.metadata?.original_id === jsonPrimaryFolder.id ||
               f.folder_type === 'admin' && f.name === jsonPrimaryFolder.name;
      });
      
      if (!dbFolder) {
        missing.push({
          type: 'primary_folder',
          id: jsonPrimaryFolder.id,
          name: jsonPrimaryFolder.name,
          data: jsonPrimaryFolder
        });
      }
    }
  }
  
  console.log(`   📊 Missing: ${missing.length}, Mismatched: ${mismatched.length}, Extra: ${extra.length}`);
  
  return { missing, mismatched, extra };
}

/**
 * Validate data relationships
 */
function validateRelationships() {
  console.log('\n🔗 Validating Data Relationships...');
  console.log('-'.repeat(40));
  
  const issues = [];
  
  // Check user-organization relationships
  console.log('   👤 Checking user-organization relationships...');
  const orphanedUsers = verificationData.databaseData.users.filter(user => {
    return !verificationData.databaseData.organizations.find(org => org.id === user.organization_id);
  });
  
  if (orphanedUsers.length > 0) {
    issues.push({
      type: 'orphaned_users',
      count: orphanedUsers.length,
      items: orphanedUsers.map(u => ({ id: u.id, organization_id: u.organization_id }))
    });
    console.log(`   ❌ Found ${orphanedUsers.length} orphaned users`);
  } else {
    console.log('   ✅ All users have valid organizations');
  }
  
  // Check conversation-user relationships
  console.log('   💬 Checking conversation-user relationships...');
  const orphanedConversations = verificationData.databaseData.conversations.filter(conv => {
    return !verificationData.databaseData.users.find(user => user.id === conv.user_id);
  });
  
  if (orphanedConversations.length > 0) {
    issues.push({
      type: 'orphaned_conversations',
      count: orphanedConversations.length,
      items: orphanedConversations.map(c => ({ id: c.id, user_id: c.user_id }))
    });
    console.log(`   ❌ Found ${orphanedConversations.length} orphaned conversations`);
  } else {
    console.log('   ✅ All conversations have valid users');
  }
  
  // Check folder hierarchy
  console.log('   📁 Checking folder hierarchy...');
  const invalidFolderHierarchy = verificationData.databaseData.folders.filter(folder => {
    if (!folder.parent_folder_id) return false; // Root folders are OK
    return !verificationData.databaseData.folders.find(parent => parent.id === folder.parent_folder_id);
  });
  
  if (invalidFolderHierarchy.length > 0) {
    issues.push({
      type: 'invalid_folder_hierarchy',
      count: invalidFolderHierarchy.length,
      items: invalidFolderHierarchy.map(f => ({ id: f.id, parent_folder_id: f.parent_folder_id }))
    });
    console.log(`   ❌ Found ${invalidFolderHierarchy.length} folders with invalid parent references`);
  } else {
    console.log('   ✅ Folder hierarchy is valid');
  }
  
  console.log(`   📊 Total relationship issues: ${issues.length}`);
  
  return issues;
}

/**
 * Generate verification statistics
 */
function generateStatistics() {
  console.log('\n📊 Generating Statistics...');
  console.log('-'.repeat(40));
  
  const stats = {
    json: {
      conversations: verificationData.jsonData.conversations ? 
        (verificationData.jsonData.conversations.conversations?.size || 0) : 0,
      messages: verificationData.jsonData.conversations?.messages?.size || 0,
      folders: Array.isArray(verificationData.jsonData.folders) ? verificationData.jsonData.folders.length : 0,
      primaryFolders: Array.isArray(verificationData.jsonData.primaryFolders) ? verificationData.jsonData.primaryFolders.length : 0
    },
    database: {
      organizations: verificationData.databaseData.organizations.length,
      users: verificationData.databaseData.users.length,
      conversations: verificationData.databaseData.conversations.length,
      messages: verificationData.databaseData.messages.length,
      folders: verificationData.databaseData.folders.length,
      documents: verificationData.databaseData.documents.length
    },
    migration: {
      conversationsMigrated: 0,
      messagesMigrated: 0,
      foldersMigrated: 0,
      migrationCompleteness: 0
    }
  };
  
  // Calculate migration completeness
  const totalJsonItems = stats.json.conversations + stats.json.messages + stats.json.folders + stats.json.primaryFolders;
  const totalDbItems = stats.database.conversations + stats.database.messages + stats.database.folders;
  
  if (totalJsonItems > 0) {
    stats.migration.migrationCompleteness = Math.round((totalDbItems / totalJsonItems) * 100);
  }
  
  console.log('   📈 JSON Data:');
  console.log(`      Conversations: ${stats.json.conversations}`);
  console.log(`      Messages: ${stats.json.messages}`);
  console.log(`      Folders: ${stats.json.folders}`);
  console.log(`      Primary Folders: ${stats.json.primaryFolders}`);
  
  console.log('   📊 Database Data:');
  console.log(`      Organizations: ${stats.database.organizations}`);
  console.log(`      Users: ${stats.database.users}`);
  console.log(`      Conversations: ${stats.database.conversations}`);
  console.log(`      Messages: ${stats.database.messages}`);
  console.log(`      Folders: ${stats.database.folders}`);
  console.log(`      Documents: ${stats.database.documents}`);
  
  console.log('   🎯 Migration Status:');
  console.log(`      Completeness: ${stats.migration.migrationCompleteness}%`);
  
  verificationData.comparison.statistics = stats;
  return stats;
}

/**
 * Export verification report
 */
function exportReport() {
  if (!VERIFICATION_CONFIG.exportReport) {
    return;
  }
  
  console.log('\n📄 Exporting Verification Report...');
  console.log('-'.repeat(40));
  
  try {
    const reportData = {
      timestamp: new Date().toISOString(),
      configuration: VERIFICATION_CONFIG,
      statistics: verificationData.comparison.statistics,
      issues: {
        missing: verificationData.comparison.missing,
        mismatched: verificationData.comparison.mismatched,
        orphaned: verificationData.comparison.orphaned
      },
      summary: {
        totalIssues: verificationData.comparison.missing.length + 
                    verificationData.comparison.mismatched.length + 
                    verificationData.comparison.orphaned.length,
        migrationHealth: verificationData.comparison.statistics.migration.migrationCompleteness >= 90 ? 'Good' : 
                        verificationData.comparison.statistics.migration.migrationCompleteness >= 70 ? 'Fair' : 'Poor'
      }
    };
    
    const reportPath = path.join(serverDir, 'migration-verification-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    
    console.log(`   ✅ Report exported to: ${reportPath}`);
  } catch (error) {
    console.error('   ❌ Failed to export report:', error.message);
  }
}

/**
 * Main verification function
 */
async function verifyMigration() {
  console.log('🔍 Starting Migration Verification...\n');
  
  try {
    // Check database health
    console.log('🏥 Checking database connection...');
    const health = await getSupabaseHealth();
    if (health.status !== 'healthy') {
      console.error('❌ Database is not healthy. Cannot verify migration.');
      return false;
    }
    console.log('✅ Database connection verified');
    
    // Read data sources
    const jsonReadSuccess = await readJsonFiles();
    if (!jsonReadSuccess) {
      console.error('❌ Failed to read JSON files');
      return false;
    }
    
    const dbReadSuccess = await readDatabaseData();
    if (!dbReadSuccess) {
      console.error('❌ Failed to read database data');
      return false;
    }
    
    // Perform comparisons
    const conversationComparison = compareConversations();
    const messageComparison = compareMessages();
    const folderComparison = compareFolders();
    
    // Validate relationships
    const relationshipIssues = validateRelationships();
    
    // Store results
    verificationData.comparison.missing = [
      ...conversationComparison.missing,
      ...messageComparison.missing,
      ...folderComparison.missing
    ];
    
    verificationData.comparison.mismatched = [
      ...conversationComparison.mismatched,
      ...messageComparison.mismatched,
      ...folderComparison.mismatched
    ];
    
    verificationData.comparison.orphaned = relationshipIssues;
    
    // Generate statistics
    const stats = generateStatistics();
    
    // Export report if requested
    exportReport();
    
    // Print final summary
    console.log('\n🎯 VERIFICATION SUMMARY');
    console.log('═'.repeat(60));
    
    const totalIssues = verificationData.comparison.missing.length + 
                       verificationData.comparison.mismatched.length + 
                       verificationData.comparison.orphaned.length;
    
    console.log(`📊 Migration Completeness: ${stats.migration.migrationCompleteness}%`);
    console.log(`🔍 Total Issues Found: ${totalIssues}`);
    console.log(`   Missing Items: ${verificationData.comparison.missing.length}`);
    console.log(`   Mismatched Items: ${verificationData.comparison.mismatched.length}`);
    console.log(`   Relationship Issues: ${verificationData.comparison.orphaned.length}`);
    
    let migrationHealth;
    if (stats.migration.migrationCompleteness >= 90 && totalIssues === 0) {
      migrationHealth = '🟢 EXCELLENT';
    } else if (stats.migration.migrationCompleteness >= 70 && totalIssues <= 5) {
      migrationHealth = '🟡 GOOD';
    } else if (stats.migration.migrationCompleteness >= 50) {
      migrationHealth = '🟠 FAIR';
    } else {
      migrationHealth = '🔴 POOR';
    }
    
    console.log(`🏥 Migration Health: ${migrationHealth}`);
    
    if (totalIssues === 0) {
      console.log('\n🎉 MIGRATION VERIFICATION PASSED!');
      console.log('✨ All data successfully migrated to database');
    } else {
      console.log('\n⚠️ MIGRATION VERIFICATION FOUND ISSUES');
      console.log('💡 Review the details above and consider running migration scripts again');
      
      if (VERIFICATION_CONFIG.fixMissing) {
        console.log('🔧 Auto-fix functionality not implemented yet');
      }
    }
    
    return totalIssues === 0;
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  }
}

// Show usage information
function showUsage() {
  console.log('\n📖 USAGE:');
  console.log('  node scripts/verify-migration.js [options]');
  console.log('\n🔧 OPTIONS:');
  console.log('  --verbose   Show detailed comparison information');
  console.log('  --export    Export verification report to JSON file');
  console.log('  --fix       Attempt to fix missing data (not implemented)');
  console.log('\n📚 EXAMPLES:');
  console.log('  node scripts/verify-migration.js                    # Basic verification');
  console.log('  node scripts/verify-migration.js --verbose --export # Detailed verification with report');
}

// Execute verification if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showUsage();
  } else {
    verifyMigration()
      .then(success => {
        process.exit(success ? 0 : 1);
      })
      .catch(error => {
        console.error('❌ Verification script failed:', error);
        process.exit(1);
      });
  }
}

export { verifyMigration };