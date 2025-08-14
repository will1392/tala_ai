/**
 * Database Configuration for Tala AI
 * 
 * Manages Supabase PostgreSQL connection settings and validation
 * Supports both development and production environments
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Config is in /server/config, so go up two levels to reach root
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Database configuration object
 */
export const databaseConfig = {
  // Supabase connection settings
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
  },
  
  // Connection options
  options: {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'X-Client-Info': 'tala-ai-backend'
      }
    }
  },

  // Feature flags for migration
  migration: {
    enableDualWrite: process.env.ENABLE_DUAL_WRITE === 'true',
    enableDatabaseRead: process.env.ENABLE_DATABASE_READ === 'true',
    fallbackToJson: process.env.FALLBACK_TO_JSON !== 'false' // Default true for safety
  },

  // Performance settings
  performance: {
    connectionPoolSize: parseInt(process.env.DB_POOL_SIZE) || 10,
    queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT) || 30000,
    enableQueryLogging: process.env.DB_ENABLE_LOGGING === 'true'
  }
};

/**
 * Validate database configuration
 * @returns {Object} Validation result with status and missing fields
 */
export function validateDatabaseConfig() {
  const missing = [];
  const warnings = [];

  // Check required Supabase fields
  if (!databaseConfig.supabase.url) {
    missing.push('SUPABASE_URL');
  }
  
  if (!databaseConfig.supabase.anonKey) {
    missing.push('SUPABASE_ANON_KEY');
  }

  // Service key is optional for basic operations but recommended
  if (!databaseConfig.supabase.serviceKey) {
    warnings.push('SUPABASE_SERVICE_KEY not set - some admin operations may not work');
  }

  // Validate URL format
  if (databaseConfig.supabase.url && !databaseConfig.supabase.url.includes('supabase.co')) {
    warnings.push('SUPABASE_URL format may be incorrect');
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
    ready: missing.length === 0 && databaseConfig.supabase.serviceKey
  };
}

/**
 * Get database connection info for logging
 * @returns {Object} Safe connection info (no secrets)
 */
export function getDatabaseInfo() {
  const validation = validateDatabaseConfig();
  
  return {
    provider: 'Supabase PostgreSQL',
    url: databaseConfig.supabase.url ? 
      `${databaseConfig.supabase.url.split('.')[0]}...` : 'Not configured',
    schema: databaseConfig.options.db.schema,
    poolSize: databaseConfig.performance.connectionPoolSize,
    queryTimeout: databaseConfig.performance.queryTimeout,
    status: validation.valid ? 'Configured' : 'Missing configuration',
    migration: {
      dualWrite: databaseConfig.migration.enableDualWrite,
      databaseRead: databaseConfig.migration.enableDatabaseRead,
      fallbackToJson: databaseConfig.migration.fallbackToJson
    },
    ready: validation.ready
  };
}

/**
 * Environment-specific configuration
 */
export const environmentConfig = {
  development: {
    enableQueryLogging: true,
    connectionPoolSize: 5,
    strictMode: false
  },
  
  production: {
    enableQueryLogging: false,
    connectionPoolSize: 20,
    strictMode: true
  },
  
  test: {
    enableQueryLogging: false,
    connectionPoolSize: 2,
    strictMode: true
  }
};

/**
 * Get current environment configuration
 * @returns {Object} Environment-specific settings
 */
export function getEnvironmentConfig() {
  const env = process.env.NODE_ENV || 'development';
  return environmentConfig[env] || environmentConfig.development;
}

/**
 * Migration phases configuration
 */
export const migrationPhases = {
  PHASE_1_SETUP: 'setup',           // Database and schema creation
  PHASE_2_DUAL_WRITE: 'dual_write', // Write to both JSON and DB
  PHASE_3_DUAL_READ: 'dual_read',   // Read from DB, fallback to JSON
  PHASE_4_DB_ONLY: 'db_only'        // Full database migration
};

/**
 * Get current migration phase
 * @returns {string} Current migration phase
 */
export function getCurrentMigrationPhase() {
  if (!databaseConfig.migration.enableDualWrite) {
    return migrationPhases.PHASE_1_SETUP;
  }
  
  if (!databaseConfig.migration.enableDatabaseRead) {
    return migrationPhases.PHASE_2_DUAL_WRITE;
  }
  
  if (databaseConfig.migration.fallbackToJson) {
    return migrationPhases.PHASE_3_DUAL_READ;
  }
  
  return migrationPhases.PHASE_4_DB_ONLY;
}

/**
 * Log database configuration status
 */
export function logDatabaseStatus() {
  const info = getDatabaseInfo();
  const validation = validateDatabaseConfig();
  const phase = getCurrentMigrationPhase();
  
  console.log('\n🗄️  DATABASE CONFIGURATION');
  console.log('=' .repeat(40));
  console.log(`Provider: ${info.provider}`);
  console.log(`URL: ${info.url}`);
  console.log(`Status: ${info.status}`);
  console.log(`Migration Phase: ${phase.toUpperCase()}`);
  console.log(`Pool Size: ${info.poolSize}`);
  console.log(`Query Timeout: ${info.queryTimeout}ms`);
  
  if (validation.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    validation.warnings.forEach(warning => {
      console.log(`   ${warning}`);
    });
  }
  
  if (!validation.valid) {
    console.log('\n❌ Missing Configuration:');
    validation.missing.forEach(field => {
      console.log(`   ${field}`);
    });
    console.log('\n💡 Add missing environment variables to .env file');
  } else {
    console.log('\n✅ Database configuration ready');
  }
  
  console.log('=' .repeat(40));
}

export default databaseConfig;