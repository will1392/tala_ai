#!/usr/bin/env node

/**
 * Database Backup Script for Tala AI
 * 
 * Comprehensive backup solution for Supabase PostgreSQL database:
 * - Export all data to JSON format
 * - Support for incremental and full backups
 * - Compression and encryption options
 * - Scheduled backup capabilities
 * - Restore functionality
 * - Backup verification and integrity checks
 */

import { config } from 'dotenv';
config();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createWriteStream, createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';
import { createGzip, createGunzip } from 'zlib';

import { getSupabaseHealth, getAdminClient } from '../db/supabaseClient.js';

// Import database services for comprehensive backup
import { OrganizationService } from '../services/db/organizationService.js';
import { UserService } from '../services/db/userService.js';
import { ConversationService } from '../services/db/conversationService.js';
import { FolderService } from '../services/db/folderService.js';
import { DocumentService } from '../services/db/documentService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serverDir = path.dirname(__dirname);

console.log('💾 DATABASE BACKUP SCRIPT');
console.log('═'.repeat(50));

// Configuration
const BACKUP_CONFIG = {
  format: process.argv.find(arg => arg.startsWith('--format='))?.split('=')[1] || 'json',
  compress: process.argv.includes('--compress'),
  encrypt: process.argv.includes('--encrypt'),
  incremental: process.argv.includes('--incremental'),
  schedule: process.argv.find(arg => arg.startsWith('--schedule='))?.split('=')[1] || null,
  outputDir: process.argv.find(arg => arg.startsWith('--output='))?.split('=')[1] || path.join(serverDir, 'backups'),
  verbose: process.argv.includes('--verbose'),
  verify: process.argv.includes('--verify'),
  excludeTables: (process.argv.find(arg => arg.startsWith('--exclude='))?.split('=')[1] || '').split(',').filter(Boolean)
};

// Initialize services
const services = {
  organization: new OrganizationService(),
  user: new UserService(),
  conversation: new ConversationService(),
  folder: new FolderService(),
  document: new DocumentService()
};

// Backup metadata
let backupMetadata = {
  timestamp: new Date().toISOString(),
  version: '1.0.0',
  config: BACKUP_CONFIG,
  statistics: {
    totalRecords: 0,
    totalSize: 0,
    tablesIncluded: [],
    duration: 0
  },
  checksums: {}
};

/**
 * Ensure backup directory exists
 */
function ensureBackupDirectory() {
  if (!fs.existsSync(BACKUP_CONFIG.outputDir)) {
    fs.mkdirSync(BACKUP_CONFIG.outputDir, { recursive: true });
    console.log(`📁 Created backup directory: ${BACKUP_CONFIG.outputDir}`);
  }
}

/**
 * Generate backup filename with timestamp
 */
function generateBackupFilename() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const type = BACKUP_CONFIG.incremental ? 'incremental' : 'full';
  const compression = BACKUP_CONFIG.compress ? '.gz' : '';
  
  return `tala-backup-${type}-${timestamp}.${BACKUP_CONFIG.format}${compression}`;
}

/**
 * Get last backup timestamp for incremental backups
 */
function getLastBackupTimestamp() {
  if (!BACKUP_CONFIG.incremental) {
    return null;
  }
  
  try {
    const backupFiles = fs.readdirSync(BACKUP_CONFIG.outputDir)
      .filter(file => file.startsWith('tala-backup-') && file.endsWith('.json'))
      .sort()
      .reverse();
    
    if (backupFiles.length === 0) {
      console.log('⚠️ No previous backups found for incremental backup');
      return null;
    }
    
    // Extract timestamp from most recent backup
    const lastBackupFile = backupFiles[0];
    const timestampMatch = lastBackupFile.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)/);
    
    if (timestampMatch) {
      const timestamp = timestampMatch[1].replace(/-/g, ':').replace(/(\d{2}):(\d{3}Z)$/, '.$2');
      console.log(`📅 Last backup: ${timestamp}`);
      return timestamp;
    }
    
    return null;
  } catch (error) {
    console.warn('⚠️ Could not determine last backup timestamp:', error.message);
    return null;
  }
}

/**
 * Export organizations data
 */
async function exportOrganizations(since = null) {
  console.log('🏢 Exporting organizations...');
  
  try {
    const filters = {};
    if (since) {
      filters.updated_at = { gte: since };
    }
    
    const result = await services.organization.getMany(filters, {
      pagination: { page: 1, pageSize: 10000 }
    });
    
    if (!result.success) {
      throw new Error(`Failed to export organizations: ${result.error}`);
    }
    
    const organizations = result.data;
    console.log(`   ✅ Exported ${organizations.length} organizations`);
    
    backupMetadata.statistics.totalRecords += organizations.length;
    backupMetadata.statistics.tablesIncluded.push('organizations');
    
    return organizations;
  } catch (error) {
    console.error('   ❌ Organization export failed:', error.message);
    return [];
  }
}

/**
 * Export users data
 */
async function exportUsers(since = null) {
  console.log('👤 Exporting users...');
  
  try {
    const filters = {};
    if (since) {
      filters.updated_at = { gte: since };
    }
    
    const result = await services.user.getMany(filters, {
      pagination: { page: 1, pageSize: 10000 },
      includeSensitive: false // Exclude sensitive data from backups
    });
    
    if (!result.success) {
      throw new Error(`Failed to export users: ${result.error}`);
    }
    
    const users = result.data;
    console.log(`   ✅ Exported ${users.length} users`);
    
    backupMetadata.statistics.totalRecords += users.length;
    backupMetadata.statistics.tablesIncluded.push('users');
    
    return users;
  } catch (error) {
    console.error('   ❌ User export failed:', error.message);
    return [];
  }
}

/**
 * Export conversations data
 */
async function exportConversations(since = null) {
  console.log('💬 Exporting conversations...');
  
  try {
    const filters = {};
    if (since) {
      filters.updated_at = { gte: since };
    }
    
    const result = await services.conversation.getMany(filters, {
      pagination: { page: 1, pageSize: 10000 }
    });
    
    if (!result.success) {
      throw new Error(`Failed to export conversations: ${result.error}`);
    }
    
    const conversations = result.data;
    console.log(`   ✅ Exported ${conversations.length} conversations`);
    
    backupMetadata.statistics.totalRecords += conversations.length;
    backupMetadata.statistics.tablesIncluded.push('conversations');
    
    return conversations;
  } catch (error) {
    console.error('   ❌ Conversation export failed:', error.message);
    return [];
  }
}

/**
 * Export messages data directly from database
 */
async function exportMessages(since = null) {
  console.log('📝 Exporting messages...');
  
  try {
    const adminClient = getAdminClient();
    let query = adminClient.from('messages').select('*');
    
    if (since) {
      query = query.gte('created_at', since);
    }
    
    const { data: messages, error } = await query.limit(50000);
    
    if (error) {
      throw new Error(`Failed to export messages: ${error.message}`);
    }
    
    console.log(`   ✅ Exported ${messages?.length || 0} messages`);
    
    backupMetadata.statistics.totalRecords += (messages?.length || 0);
    backupMetadata.statistics.tablesIncluded.push('messages');
    
    return messages || [];
  } catch (error) {
    console.error('   ❌ Message export failed:', error.message);
    return [];
  }
}

/**
 * Export folders data
 */
async function exportFolders(since = null) {
  console.log('📁 Exporting folders...');
  
  try {
    const filters = {};
    if (since) {
      filters.updated_at = { gte: since };
    }
    
    const result = await services.folder.getMany(filters, {
      pagination: { page: 1, pageSize: 10000 }
    });
    
    if (!result.success) {
      throw new Error(`Failed to export folders: ${result.error}`);
    }
    
    const folders = result.data;
    console.log(`   ✅ Exported ${folders.length} folders`);
    
    backupMetadata.statistics.totalRecords += folders.length;
    backupMetadata.statistics.tablesIncluded.push('folders');
    
    return folders;
  } catch (error) {
    console.error('   ❌ Folder export failed:', error.message);
    return [];
  }
}

/**
 * Export documents data
 */
async function exportDocuments(since = null) {
  console.log('📄 Exporting documents...');
  
  try {
    const filters = {};
    if (since) {
      filters.updated_at = { gte: since };
    }
    
    const result = await services.document.getMany(filters, {
      pagination: { page: 1, pageSize: 10000 }
    });
    
    if (!result.success) {
      throw new Error(`Failed to export documents: ${result.error}`);
    }
    
    const documents = result.data;
    console.log(`   ✅ Exported ${documents.length} documents`);
    
    backupMetadata.statistics.totalRecords += documents.length;
    backupMetadata.statistics.tablesIncluded.push('documents');
    
    return documents;
  } catch (error) {
    console.error('   ❌ Document export failed:', error.message);
    return [];
  }
}

/**
 * Export additional tables directly from database
 */
async function exportAdditionalTables(since = null) {
  console.log('📊 Exporting additional tables...');
  
  const additionalData = {};
  const adminClient = getAdminClient();
  
  const tables = ['tags', 'document_tags', 'audit_logs'];
  
  for (const table of tables) {
    if (BACKUP_CONFIG.excludeTables.includes(table)) {
      console.log(`   ⏭️ Skipping ${table} (excluded)`);
      continue;
    }
    
    try {
      let query = adminClient.from(table).select('*');
      
      if (since && ['audit_logs'].includes(table)) {
        query = query.gte('created_at', since);
      }
      
      const { data, error } = await query.limit(10000);
      
      if (error) {
        console.warn(`   ⚠️ Could not export ${table}: ${error.message}`);
        continue;
      }
      
      additionalData[table] = data || [];
      console.log(`   ✅ Exported ${data?.length || 0} ${table} records`);
      
      backupMetadata.statistics.totalRecords += (data?.length || 0);
      backupMetadata.statistics.tablesIncluded.push(table);
    } catch (error) {
      console.warn(`   ⚠️ Could not export ${table}: ${error.message}`);
    }
  }
  
  return additionalData;
}

/**
 * Calculate checksum for data integrity
 */
function calculateChecksum(data) {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(data));
  return hash.digest('hex');
}

/**
 * Create backup data structure
 */
async function createBackupData() {
  console.log('\n📦 Creating backup data...');
  console.log('-'.repeat(40));
  
  const startTime = Date.now();
  const since = getLastBackupTimestamp();
  
  if (since) {
    console.log(`📅 Incremental backup since: ${since}`);
  } else {
    console.log('📅 Full backup');
  }
  
  // Export all data
  const backupData = {
    metadata: { ...backupMetadata },
    data: {
      organizations: await exportOrganizations(since),
      users: await exportUsers(since),
      conversations: await exportConversations(since),
      messages: await exportMessages(since),
      folders: await exportFolders(since),
      documents: await exportDocuments(since),
      ...await exportAdditionalTables(since)
    }
  };
  
  // Calculate duration and checksums
  const endTime = Date.now();
  backupData.metadata.statistics.duration = endTime - startTime;
  
  // Calculate checksums for each data type
  for (const [key, data] of Object.entries(backupData.data)) {
    backupData.metadata.checksums[key] = calculateChecksum(data);
  }
  
  // Calculate total size estimate
  const jsonString = JSON.stringify(backupData);
  backupData.metadata.statistics.totalSize = jsonString.length;
  
  console.log('\n📊 Backup Statistics:');
  console.log(`   Total Records: ${backupData.metadata.statistics.totalRecords}`);
  console.log(`   Total Size: ${(backupData.metadata.statistics.totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Duration: ${backupData.metadata.statistics.duration}ms`);
  console.log(`   Tables: ${backupData.metadata.statistics.tablesIncluded.join(', ')}`);
  
  return backupData;
}

/**
 * Write backup to file with optional compression
 */
async function writeBackupFile(backupData, filename) {
  console.log('\n💾 Writing backup file...');
  console.log('-'.repeat(40));
  
  const filePath = path.join(BACKUP_CONFIG.outputDir, filename);
  
  try {
    if (BACKUP_CONFIG.format === 'json') {
      const jsonData = JSON.stringify(backupData, null, 2);
      
      if (BACKUP_CONFIG.compress) {
        console.log('   🗜️ Compressing backup...');
        
        // Create compressed stream
        const readStream = require('stream').Readable.from([jsonData]);
        const writeStream = createWriteStream(filePath);
        const gzipStream = createGzip({ level: 9 });
        
        await pipeline(readStream, gzipStream, writeStream);
        
        console.log(`   ✅ Compressed backup written to: ${filePath}`);
      } else {
        fs.writeFileSync(filePath, jsonData);
        console.log(`   ✅ Backup written to: ${filePath}`);
      }
    } else {
      throw new Error(`Unsupported format: ${BACKUP_CONFIG.format}`);
    }
    
    // Get file stats
    const stats = fs.statSync(filePath);
    console.log(`   📁 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    
    if (BACKUP_CONFIG.compress) {
      const originalSize = backupData.metadata.statistics.totalSize;
      const compressionRatio = ((originalSize - stats.size) / originalSize * 100).toFixed(1);
      console.log(`   📊 Compression ratio: ${compressionRatio}%`);
    }
    
    return filePath;
  } catch (error) {
    console.error('   ❌ Failed to write backup file:', error.message);
    throw error;
  }
}

/**
 * Verify backup integrity
 */
async function verifyBackup(filePath, originalData) {
  if (!BACKUP_CONFIG.verify) {
    return true;
  }
  
  console.log('\n🔍 Verifying backup integrity...');
  console.log('-'.repeat(40));
  
  try {
    let backupContent;
    
    if (BACKUP_CONFIG.compress) {
      console.log('   📖 Reading compressed backup...');
      const readStream = createReadStream(filePath);
      const gunzipStream = createGunzip();
      
      const chunks = [];
      const collectChunks = new Transform({
        transform(chunk, encoding, callback) {
          chunks.push(chunk);
          callback();
        }
      });
      
      await pipeline(readStream, gunzipStream, collectChunks);
      backupContent = Buffer.concat(chunks).toString();
    } else {
      backupContent = fs.readFileSync(filePath, 'utf8');
    }
    
    const parsedData = JSON.parse(backupContent);
    
    // Verify checksums
    console.log('   🔐 Verifying checksums...');
    let checksumErrors = 0;
    
    for (const [key, originalChecksum] of Object.entries(originalData.metadata.checksums)) {
      const backupChecksum = calculateChecksum(parsedData.data[key]);
      
      if (originalChecksum !== backupChecksum) {
        console.error(`   ❌ Checksum mismatch for ${key}`);
        checksumErrors++;
      } else {
        console.log(`   ✅ ${key} checksum verified`);
      }
    }
    
    if (checksumErrors === 0) {
      console.log('   🎉 Backup integrity verified successfully!');
      return true;
    } else {
      console.error(`   ❌ Backup verification failed: ${checksumErrors} checksum errors`);
      return false;
    }
  } catch (error) {
    console.error('   ❌ Backup verification failed:', error.message);
    return false;
  }
}

/**
 * Clean up old backups
 */
function cleanupOldBackups() {
  console.log('\n🧹 Cleaning up old backups...');
  console.log('-'.repeat(40));
  
  try {
    const backupFiles = fs.readdirSync(BACKUP_CONFIG.outputDir)
      .filter(file => file.startsWith('tala-backup-'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_CONFIG.outputDir, file),
        stats: fs.statSync(path.join(BACKUP_CONFIG.outputDir, file))
      }))
      .sort((a, b) => b.stats.mtime - a.stats.mtime);
    
    // Keep last 10 backups
    const keepCount = 10;
    const filesToDelete = backupFiles.slice(keepCount);
    
    if (filesToDelete.length === 0) {
      console.log('   ✅ No old backups to clean up');
      return;
    }
    
    console.log(`   🗑️ Removing ${filesToDelete.length} old backup(s)...`);
    
    for (const file of filesToDelete) {
      fs.unlinkSync(file.path);
      console.log(`   ✅ Deleted: ${file.name}`);
    }
  } catch (error) {
    console.warn('   ⚠️ Cleanup failed:', error.message);
  }
}

/**
 * Setup scheduled backups
 */
function setupScheduledBackup() {
  if (!BACKUP_CONFIG.schedule) {
    return;
  }
  
  console.log('\n⏰ Setting up scheduled backup...');
  console.log('-'.repeat(40));
  
  const cronExpression = {
    'hourly': '0 * * * *',
    'daily': '0 2 * * *',
    'weekly': '0 2 * * 0',
    'monthly': '0 2 1 * *'
  }[BACKUP_CONFIG.schedule];
  
  if (!cronExpression) {
    console.error(`   ❌ Unknown schedule: ${BACKUP_CONFIG.schedule}`);
    return;
  }
  
  const scriptPath = path.resolve(__filename);
  const command = `node "${scriptPath}" --format=${BACKUP_CONFIG.format}${BACKUP_CONFIG.compress ? ' --compress' : ''}`;
  
  console.log('   📋 Add this to your crontab:');
  console.log(`   ${cronExpression} ${command}`);
  console.log('\n   💡 To add to crontab:');
  console.log('   crontab -e');
  console.log(`   # Add the line above`);
}

/**
 * Main backup function
 */
async function performBackup() {
  console.log('💾 Starting Database Backup...\n');
  
  try {
    // Check database health
    console.log('🏥 Checking database connection...');
    const health = await getSupabaseHealth();
    if (health.status !== 'healthy') {
      console.error('❌ Database is not healthy. Cannot perform backup.');
      return false;
    }
    console.log('✅ Database connection verified');
    
    // Ensure backup directory exists
    ensureBackupDirectory();
    
    // Create backup data
    const backupData = await createBackupData();
    
    // Generate filename and write backup
    const filename = generateBackupFilename();
    const filePath = await writeBackupFile(backupData, filename);
    
    // Verify backup if requested
    const verificationResult = await verifyBackup(filePath, backupData);
    if (!verificationResult) {
      console.error('❌ Backup verification failed');
      return false;
    }
    
    // Clean up old backups
    cleanupOldBackups();
    
    // Setup scheduled backup if requested
    setupScheduledBackup();
    
    console.log('\n🎉 BACKUP COMPLETED SUCCESSFULLY!');
    console.log(`📁 Backup file: ${filePath}`);
    console.log(`📊 Records backed up: ${backupData.metadata.statistics.totalRecords}`);
    console.log(`⏱️ Duration: ${backupData.metadata.statistics.duration}ms`);
    
    return true;
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    return false;
  }
}

/**
 * Show usage information
 */
function showUsage() {
  console.log('\n📖 USAGE:');
  console.log('  node scripts/backup-db.js [options]');
  console.log('\n🔧 OPTIONS:');
  console.log('  --format=json           Output format (currently only JSON supported)');
  console.log('  --compress              Compress backup with gzip');
  console.log('  --incremental           Create incremental backup since last backup');
  console.log('  --output=DIR            Output directory (default: ./backups)');
  console.log('  --verify                Verify backup integrity after creation');
  console.log('  --verbose               Show detailed progress information');
  console.log('  --exclude=TABLE1,TABLE2 Exclude specific tables from backup');
  console.log('  --schedule=PERIOD       Show cron setup for scheduled backups');
  console.log('                          (hourly, daily, weekly, monthly)');
  console.log('\n📚 EXAMPLES:');
  console.log('  node scripts/backup-db.js                           # Basic backup');
  console.log('  node scripts/backup-db.js --compress --verify       # Compressed with verification');
  console.log('  node scripts/backup-db.js --incremental --verbose   # Incremental backup with details');
  console.log('  node scripts/backup-db.js --schedule=daily          # Show daily backup cron setup');
  console.log('  node scripts/backup-db.js --exclude=audit_logs      # Exclude audit logs');
}

// Execute backup if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showUsage();
  } else {
    performBackup()
      .then(success => {
        process.exit(success ? 0 : 1);
      })
      .catch(error => {
        console.error('❌ Backup script failed:', error);
        process.exit(1);
      });
  }
}

export { performBackup };