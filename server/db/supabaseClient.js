/**
 * Supabase Client Configuration for Tala AI
 * 
 * Provides configured Supabase client instances for different use cases:
 * - Anonymous client for public operations
 * - Service client for admin operations
 * - Authenticated client for user operations
 */

import { createClient } from '@supabase/supabase-js';
import { databaseConfig, validateDatabaseConfig, logDatabaseStatus } from '../config/database.js';

// Store client instances
let supabaseAnon = null;
let supabaseService = null;

/**
 * Initialize Supabase clients
 * @returns {Object} Initialization result with client status
 */
export function initializeSupabase() {
  const validation = validateDatabaseConfig();
  
  if (!validation.valid) {
    console.error('❌ Cannot initialize Supabase: Missing configuration');
    console.error('Missing:', validation.missing.join(', '));
    return {
      success: false,
      error: 'Missing configuration',
      missing: validation.missing
    };
  }

  try {
    // Initialize anonymous client (for basic operations)
    supabaseAnon = createClient(
      databaseConfig.supabase.url,
      databaseConfig.supabase.anonKey,
      {
        ...databaseConfig.options,
        auth: {
          ...databaseConfig.options.auth,
          autoRefreshToken: false, // Anonymous doesn't need token refresh
          persistSession: false
        }
      }
    );

    // Initialize service client (for admin operations)
    if (databaseConfig.supabase.serviceKey) {
      supabaseService = createClient(
        databaseConfig.supabase.url,
        databaseConfig.supabase.serviceKey,
        {
          ...databaseConfig.options,
          auth: {
            autoRefreshToken: false, // Service key doesn't expire
            persistSession: false
          }
        }
      );
    }

    console.log('✅ Supabase clients initialized successfully');
    
    return {
      success: true,
      hasAnonClient: !!supabaseAnon,
      hasServiceClient: !!supabaseService,
      url: databaseConfig.supabase.url
    };

  } catch (error) {
    console.error('❌ Failed to initialize Supabase clients:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get anonymous Supabase client (for basic operations)
 * @returns {Object} Supabase client instance
 */
export function getSupabaseAnon() {
  if (!supabaseAnon) {
    const result = initializeSupabase();
    if (!result.success) {
      throw new Error(`Supabase not initialized: ${result.error}`);
    }
  }
  return supabaseAnon;
}

/**
 * Get service Supabase client (for admin operations)
 * @returns {Object} Supabase client instance with service role
 */
export function getSupabaseService() {
  if (!supabaseService) {
    const result = initializeSupabase();
    if (!result.success || !result.hasServiceClient) {
      throw new Error('Supabase service client not available. Check SUPABASE_SERVICE_KEY.');
    }
  }
  return supabaseService;
}

/**
 * Create authenticated Supabase client for specific user
 * @param {string} accessToken - User's access token
 * @returns {Object} Authenticated Supabase client
 */
export function getSupabaseUser(accessToken) {
  if (!accessToken) {
    throw new Error('Access token required for authenticated client');
  }

  return createClient(
    databaseConfig.supabase.url,
    databaseConfig.supabase.anonKey,
    {
      ...databaseConfig.options,
      global: {
        ...databaseConfig.options.global,
        headers: {
          ...databaseConfig.options.global.headers,
          Authorization: `Bearer ${accessToken}`
        }
      }
    }
  );
}

/**
 * Test database connection
 * @returns {Object} Connection test result
 */
export async function testDatabaseConnection() {
  try {
    const client = getSupabaseAnon();
    
    // Test basic connection with a simple query
    const { data, error } = await client
      .from('schema_version')
      .select('version')
      .limit(1);

    if (error) {
      return {
        success: false,
        error: error.message,
        details: error
      };
    }

    return {
      success: true,
      version: data?.[0]?.version || 'unknown',
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      type: 'connection_error'
    };
  }
}

/**
 * Execute raw SQL query using service client
 * @param {string} query - SQL query to execute
 * @param {Array} params - Query parameters
 * @returns {Object} Query result
 */
export async function executeRawQuery(query, params = []) {
  try {
    const client = getSupabaseService();
    
    const { data, error } = await client.rpc('execute_sql', {
      query: query,
      params: params
    });

    if (error) {
      throw error;
    }

    return {
      success: true,
      data,
      rowCount: data?.length || 0
    };

  } catch (error) {
    console.error('Raw query failed:', error);
    return {
      success: false,
      error: error.message,
      query: query.substring(0, 100) + '...' // Log first 100 chars for debugging
    };
  }
}

/**
 * Get database statistics
 * @returns {Object} Database usage statistics
 */
export async function getDatabaseStats() {
  try {
    const client = getSupabaseService();
    
    // Get table row counts
    const tables = [
      'organizations', 'users', 'conversations', 'messages',
      'documents', 'folders', 'tags', 'document_tags'
    ];
    
    const stats = {};
    
    for (const table of tables) {
      try {
        const { count, error } = await client
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          stats[table] = count || 0;
        }
      } catch (e) {
        stats[table] = 'error';
      }
    }

    return {
      success: true,
      tables: stats,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Migration helper: Check if schema exists
 * @returns {Object} Schema status
 */
export async function checkSchemaStatus() {
  try {
    const client = getSupabaseAnon();
    
    // Check if our main tables exist
    const { data: tables, error } = await client
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', [
        'organizations', 'users', 'conversations', 'messages',
        'documents', 'folders', 'primary_folders', 'tags', 'document_tags'
      ]);

    if (error) {
      return {
        success: false,
        error: error.message,
        schemaExists: false
      };
    }

    const existingTables = tables.map(t => t.table_name);
    const expectedTables = [
      'organizations', 'users', 'conversations', 'messages',
      'documents', 'folders', 'primary_folders', 'tags', 'document_tags'
    ];
    
    const missingTables = expectedTables.filter(t => !existingTables.includes(t));
    
    return {
      success: true,
      schemaExists: missingTables.length === 0,
      existingTables,
      missingTables,
      tableCount: existingTables.length
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      schemaExists: false
    };
  }
}

/**
 * Health check for Supabase connection
 * @returns {Object} Health status
 */
export async function getSupabaseHealth() {
  const validation = validateDatabaseConfig();
  
  if (!validation.valid) {
    return {
      status: 'unhealthy',
      configured: false,
      missing: validation.missing,
      warnings: validation.warnings
    };
  }

  const connectionTest = await testDatabaseConnection();
  const schemaStatus = await checkSchemaStatus();
  
  return {
    status: connectionTest.success && schemaStatus.schemaExists ? 'healthy' : 'unhealthy',
    configured: validation.valid,
    connected: connectionTest.success,
    schemaExists: schemaStatus.schemaExists,
    version: connectionTest.version,
    clients: {
      anonymous: !!supabaseAnon,
      service: !!supabaseService
    },
    tables: schemaStatus.existingTables || [],
    missingTables: schemaStatus.missingTables || [],
    warnings: validation.warnings,
    lastChecked: new Date().toISOString()
  };
}

/**
 * Utility function to handle Supabase errors
 * @param {Object} error - Supabase error object
 * @returns {Object} Formatted error response
 */
export function handleSupabaseError(error) {
  if (!error) return null;

  return {
    code: error.code || 'UNKNOWN_ERROR',
    message: error.message || 'An unknown error occurred',
    details: error.details || null,
    hint: error.hint || null,
    timestamp: new Date().toISOString()
  };
}

/**
 * Auto-initialize on import (if configuration is available)
 */
const validation = validateDatabaseConfig();
if (validation.valid) {
  initializeSupabase();
} else {
  console.log('⚠️  Supabase configuration incomplete - manual initialization required');
}

// Log database status on startup
if (process.env.NODE_ENV !== 'test') {
  setTimeout(() => {
    logDatabaseStatus();
  }, 1000);
}

export default {
  getSupabaseAnon,
  getSupabaseService,
  getSupabaseUser,
  testDatabaseConnection,
  getDatabaseStats,
  checkSchemaStatus,
  getSupabaseHealth,
  handleSupabaseError,
  initializeSupabase
};