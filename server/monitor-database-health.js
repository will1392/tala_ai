#!/usr/bin/env node

/**
 * Database Health Monitor for Tala AI
 * 
 * This script monitors critical database tables and alerts if any are missing.
 * Run this as a cron job or before server startup to ensure database integrity.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Critical tables that must exist
const CRITICAL_TABLES = [
  'organizations',
  'users',
  'conversations',
  'messages',
  'documents',
  'folders',
  'user_profiles',
  'conversation_contexts',
  'migrations'
];

// Log file for monitoring history
const LOG_FILE = 'database-health.log';

/**
 * Check if a table exists
 */
async function checkTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('id')
      .limit(1);
    
    if (error && error.code === '42P01') {
      // Table does not exist
      return false;
    }
    
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Log monitoring results
 */
function logResult(message, isError = false) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${isError ? 'ERROR' : 'INFO'}: ${message}\n`;
  
  console.log(isError ? `❌ ${message}` : `✅ ${message}`);
  
  // Append to log file
  fs.appendFileSync(LOG_FILE, logEntry);
}

/**
 * Send alert (customize based on your alerting system)
 */
function sendAlert(message) {
  console.error('\n🚨 CRITICAL ALERT 🚨');
  console.error(message);
  console.error('🚨 CRITICAL ALERT 🚨\n');
  
  // TODO: Add your alerting mechanism here
  // - Send email
  // - Send Slack message
  // - Trigger PagerDuty
  // - etc.
}

/**
 * Main monitoring function
 */
async function monitorDatabaseHealth() {
  console.log('🔍 Starting database health check...\n');
  logResult('Database health check started');
  
  let missingTables = [];
  let healthyTables = [];
  
  // Check each critical table
  for (const table of CRITICAL_TABLES) {
    const exists = await checkTableExists(table);
    
    if (exists) {
      healthyTables.push(table);
      logResult(`Table '${table}' exists`);
    } else {
      missingTables.push(table);
      logResult(`Table '${table}' is MISSING!`, true);
    }
  }
  
  // Generate report
  console.log('\n📊 Database Health Report');
  console.log('========================');
  console.log(`✅ Healthy tables: ${healthyTables.length}/${CRITICAL_TABLES.length}`);
  console.log(`❌ Missing tables: ${missingTables.length}`);
  
  if (missingTables.length > 0) {
    console.log('\n❌ Missing tables:');
    missingTables.forEach(table => console.log(`   - ${table}`));
    
    // Send critical alert
    const alertMessage = `
CRITICAL: ${missingTables.length} database tables are missing!

Missing tables:
${missingTables.map(t => `- ${t}`).join('\n')}

Action required:
1. Check if someone ran migration rollback commands
2. Apply fix-missing-tables.sql in Supabase dashboard
3. Review database access logs

This could indicate:
- Accidental rollback execution
- Database reset
- Permission issues
    `;
    
    sendAlert(alertMessage);
    
    // Exit with error code
    process.exit(1);
  } else {
    console.log('\n✅ All critical tables are present');
    logResult('All critical tables are healthy');
  }
  
  // Additional checks
  console.log('\n🔍 Running additional checks...');
  
  // Check for dangerous rollback files
  const rollbackPath = path.join(process.cwd(), 'db', 'migrations', 'rollback.js');
  if (fs.existsSync(rollbackPath)) {
    console.log('⚠️  WARNING: Dangerous rollback.js file still exists');
    console.log('   Consider renaming or removing this file to prevent accidental data loss');
  }
  
  // Check package.json for rollback commands
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dangerousScripts = Object.keys(packageJson.scripts || {})
      .filter(script => script.includes('rollback') && !script.includes('DISABLED'));
    
    if (dangerousScripts.length > 0) {
      console.log('⚠️  WARNING: Active rollback scripts found in package.json:');
      dangerousScripts.forEach(script => console.log(`   - ${script}`));
    }
  }
  
  console.log('\n✅ Database health check completed');
  logResult('Database health check completed successfully');
}

/**
 * Run as a service (optional)
 */
function runAsService(intervalMinutes = 5) {
  console.log(`🏃 Running database health monitor every ${intervalMinutes} minutes...\n`);
  
  // Run immediately
  monitorDatabaseHealth();
  
  // Schedule regular checks
  setInterval(() => {
    monitorDatabaseHealth();
  }, intervalMinutes * 60 * 1000);
}

// Command line interface
const args = process.argv.slice(2);

if (args.includes('--service')) {
  // Run as a monitoring service
  const interval = parseInt(args[args.indexOf('--service') + 1]) || 5;
  runAsService(interval);
} else {
  // Run once and exit
  monitorDatabaseHealth().catch(err => {
    console.error('❌ Monitor error:', err);
    process.exit(1);
  });
}