#!/usr/bin/env node

/**
 * Database Table Protection Script
 * 
 * This script monitors critical database tables and prevents accidental drops
 * Run this before starting the server or as a scheduled health check
 */

import { getSupabaseService } from './db/supabaseClient.js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Critical tables that must exist
const CRITICAL_TABLES = [
  'organizations',
  'users',
  'conversations',
  'messages',
  'documents',
  'folders',
  'user_profiles',
  'conversation_contexts'
];

// Optional tables that might exist
const OPTIONAL_TABLES = [
  'migrations',
  'tags',
  'document_tags',
  'primary_folders',
  'tasks',
  'integrations',
  'context_memories',
  'conversation_threads',
  'entity_extractions'
];

class DatabaseProtector {
  constructor() {
    this.supabase = null;
    this.logFile = path.join(__dirname, 'database-protection.log');
  }

  async init() {
    try {
      this.supabase = getSupabaseService();
      await this.log('Database Protector initialized');
      return true;
    } catch (error) {
      await this.log(`Failed to initialize: ${error.message}`, 'ERROR');
      return false;
    }
  }

  async log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}\n`;
    
    console.log(logEntry.trim());
    
    try {
      await fs.appendFile(this.logFile, logEntry);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  async checkTable(tableName) {
    try {
      const { count, error } = await this.supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        if (error.code === '42P01') {
          return { exists: false, error: 'Table does not exist' };
        }
        return { exists: false, error: error.message };
      }

      return { exists: true, rowCount: count || 0 };
    } catch (error) {
      return { exists: false, error: error.message };
    }
  }

  async checkAllTables() {
    await this.log('Starting table existence check...');
    
    const results = {
      critical: {},
      optional: {},
      missing: [],
      errors: []
    };

    // Check critical tables
    for (const table of CRITICAL_TABLES) {
      const result = await this.checkTable(table);
      results.critical[table] = result;
      
      if (!result.exists) {
        results.missing.push(table);
        await this.log(`CRITICAL: Table '${table}' is missing!`, 'ERROR');
      } else {
        await this.log(`✓ Table '${table}' exists (${result.rowCount} rows)`);
      }
    }

    // Check optional tables
    for (const table of OPTIONAL_TABLES) {
      const result = await this.checkTable(table);
      results.optional[table] = result;
      
      if (!result.exists) {
        await this.log(`Optional table '${table}' not found`, 'WARN');
      } else {
        await this.log(`✓ Optional table '${table}' exists (${result.rowCount} rows)`);
      }
    }

    return results;
  }

  async disableDangerousFunctions() {
    await this.log('Checking for dangerous database functions...');
    
    try {
      // Check if drop_table_if_exists function exists
      const { data: functions } = await this.supabase.rpc('execute_sql', {
        sql: `
          SELECT proname 
          FROM pg_proc 
          WHERE proname IN ('drop_table_if_exists', 'drop_type_if_exists')
        `
      });

      if (functions && functions.length > 0) {
        await this.log('WARNING: Dangerous drop functions detected in database!', 'WARN');
        await this.log('Consider removing these functions to prevent accidental data loss', 'WARN');
      }
    } catch (error) {
      // RPC might not exist, which is actually safer
      await this.log('Could not check for dangerous functions (RPC not available)');
    }
  }

  async createBackupScript() {
    const backupScript = `#!/bin/bash
# Auto-generated backup script
# Run this to create a backup of critical tables

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups/\${TIMESTAMP}"

echo "Creating backup directory: \${BACKUP_DIR}"
mkdir -p "\${BACKUP_DIR}"

# Export critical tables
${CRITICAL_TABLES.map(table => `
echo "Backing up ${table}..."
npx supabase db dump --data-only -f "\${BACKUP_DIR}/${table}.sql" --include-table=public.${table}
`).join('')}

echo "Backup completed in \${BACKUP_DIR}"
`;

    const scriptPath = path.join(__dirname, 'backup-critical-tables.sh');
    await fs.writeFile(scriptPath, backupScript);
    await fs.chmod(scriptPath, '755');
    
    await this.log(`Backup script created at: ${scriptPath}`);
  }

  async protectMigrationFiles() {
    await this.log('Protecting migration files...');
    
    const migrationsDir = path.join(__dirname, 'db/migrations');
    const migrationFiles = await fs.readdir(migrationsDir);
    
    let protectedCount = 0;
    
    for (const file of migrationFiles) {
      if (!file.endsWith('.js')) continue;
      
      const filePath = path.join(migrationsDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Check if file contains dangerous down() function
      if (content.includes('drop_table_if_exists') || content.includes('DROP TABLE')) {
        await this.log(`WARNING: Migration file '${file}' contains DROP TABLE statements!`, 'WARN');
        
        // Create a backup
        const backupPath = filePath + '.backup';
        await fs.copyFile(filePath, backupPath);
        
        // Comment out the dangerous parts
        const safeContent = content.replace(
          /async down\(\) {[\s\S]*?^  }/gm,
          `async down() {
    throw new Error('Table rollback disabled for safety. To enable, edit ${file} manually.');
    // Original down() function has been disabled
    // See ${file}.backup for original code
  }`
        );
        
        await fs.writeFile(filePath, safeContent);
        protectedCount++;
        await this.log(`Protected migration file: ${file}`);
      }
    }
    
    if (protectedCount > 0) {
      await this.log(`Protected ${protectedCount} migration files from accidental rollback`);
    }
  }

  async generateReport() {
    const results = await this.checkAllTables();
    
    const report = {
      timestamp: new Date().toISOString(),
      status: results.missing.length === 0 ? 'HEALTHY' : 'CRITICAL',
      summary: {
        criticalTables: Object.keys(results.critical).length,
        missingTables: results.missing.length,
        totalRows: Object.values(results.critical)
          .filter(r => r.exists)
          .reduce((sum, r) => sum + r.rowCount, 0)
      },
      missing: results.missing,
      details: results
    };

    const reportPath = path.join(__dirname, 'database-health-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    await this.log(`Health report saved to: ${reportPath}`);
    
    return report;
  }

  async setupProtection() {
    console.log('🛡️  Database Protection Setup');
    console.log('═'.repeat(50));
    
    const initialized = await this.init();
    if (!initialized) {
      console.error('Failed to initialize database protection!');
      process.exit(1);
    }

    // 1. Check all tables
    const report = await this.generateReport();
    
    // 2. Check for dangerous functions
    await this.disableDangerousFunctions();
    
    // 3. Protect migration files
    if (process.argv.includes('--protect-migrations')) {
      await this.protectMigrationFiles();
    }
    
    // 4. Create backup script
    await this.createBackupScript();
    
    // 5. Summary
    console.log('\n' + '═'.repeat(50));
    console.log('📊 Protection Summary:');
    console.log('═'.repeat(50));
    console.log(`Status: ${report.status}`);
    console.log(`Critical Tables: ${report.summary.criticalTables}`);
    console.log(`Missing Tables: ${report.summary.missingTables}`);
    console.log(`Total Rows: ${report.summary.totalRows}`);
    
    if (report.missing.length > 0) {
      console.log('\n⚠️  MISSING TABLES:');
      report.missing.forEach(table => {
        console.log(`   - ${table}`);
      });
      console.log('\n🚨 CRITICAL: Some tables are missing!');
      console.log('💡 Run migrations or restore from backup immediately.');
    } else {
      console.log('\n✅ All critical tables are present.');
    }
    
    console.log('\n📝 Recommendations:');
    console.log('1. Enable Supabase backups in your dashboard');
    console.log('2. Run ./backup-critical-tables.sh regularly');
    console.log('3. Add --protect-migrations flag to disable dangerous rollbacks');
    console.log('4. Monitor database-protection.log for issues');
    
    return report;
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const protector = new DatabaseProtector();
  
  protector.setupProtection()
    .then(report => {
      if (report.status === 'CRITICAL') {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Protection setup failed:', error);
      process.exit(1);
    });
}

export default DatabaseProtector;