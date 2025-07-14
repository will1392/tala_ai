/**
 * Redis Configuration for Tala AI
 * 
 * Provides Redis connection management with:
 * - Automatic reconnection
 * - Error handling
 * - Graceful fallback when Redis is unavailable
 * - Connection pooling and optimization
 */

import Redis from 'ioredis';

// Redis configuration
export const redisConfig = {
  // Connection settings
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  
  // Connection pool settings
  maxConnections: parseInt(process.env.REDIS_MAX_CONNECTIONS || '10'),
  connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000'),
  commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT || '5000'),
  
  // Retry settings
  retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100'),
  maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
  
  // Cache TTL defaults (in seconds)
  defaultTTL: parseInt(process.env.CACHE_TTL_DEFAULT || '300'), // 5 minutes
  shortTTL: parseInt(process.env.CACHE_TTL_SHORT || '60'),     // 1 minute
  longTTL: parseInt(process.env.CACHE_TTL_LONG || '600'),     // 10 minutes
  
  // Feature flags
  enabled: process.env.REDIS_ENABLED !== 'false', // Enabled by default
  enableLogging: process.env.REDIS_LOGGING === 'true'
};

// Redis client instances
let redisClient = null;
let redisSubscriber = null;
let redisPublisher = null;

/**
 * Create Redis client with optimal configuration
 */
function createRedisClient(name = 'default') {
  const options = {
    // Connection
    connectTimeout: redisConfig.connectTimeout,
    commandTimeout: redisConfig.commandTimeout,
    
    // Retry strategy
    retryDelayOnFailover: redisConfig.retryDelayOnFailover,
    maxRetriesPerRequest: redisConfig.maxRetries,
    
    // Keep alive
    keepAlive: 30000,
    
    // Family preference (IPv4)
    family: 4,
    
    // Lazy connect (don't connect immediately)
    lazyConnect: true,
    
    // Connection name for debugging
    connectionName: `tala-ai-${name}`,
    
    // Password if configured
    password: redisConfig.password,
    
    // Database selection
    db: redisConfig.db
  };

  // Create client instance
  const client = new Redis(redisConfig.url, options);

  // Event handlers
  client.on('connect', () => {
    if (redisConfig.enableLogging) {
      console.log(`✅ Redis ${name} client connected`);
    }
  });

  client.on('ready', () => {
    if (redisConfig.enableLogging) {
      console.log(`🚀 Redis ${name} client ready`);
    }
  });

  client.on('error', (error) => {
    if (redisConfig.enableLogging) {
      console.warn(`⚠️  Redis ${name} error:`, error.message);
    }
  });

  client.on('close', () => {
    if (redisConfig.enableLogging) {
      console.log(`❌ Redis ${name} connection closed`);
    }
  });

  client.on('reconnecting', () => {
    if (redisConfig.enableLogging) {
      console.log(`🔄 Redis ${name} reconnecting...`);
    }
  });

  return client;
}

/**
 * Initialize Redis connections
 */
export async function initializeRedis() {
  if (!redisConfig.enabled) {
    console.log('📴 Redis is disabled, running without cache');
    return {
      client: null,
      subscriber: null,
      publisher: null,
      isConnected: false
    };
  }

  try {
    console.log('🔄 Initializing Redis connections...');

    // Create client instances
    redisClient = createRedisClient('main');
    redisSubscriber = createRedisClient('subscriber');
    redisPublisher = createRedisClient('publisher');

    // Test connection
    await redisClient.connect();
    await redisClient.ping();

    // Connect subscriber and publisher
    await redisSubscriber.connect();
    await redisPublisher.connect();

    console.log('✅ Redis connections initialized successfully');

    return {
      client: redisClient,
      subscriber: redisSubscriber,
      publisher: redisPublisher,
      isConnected: true
    };

  } catch (error) {
    console.warn('⚠️  Redis initialization failed:', error.message);
    console.log('📴 Running without Redis cache');

    // Clean up any partial connections
    await cleanupRedis();

    return {
      client: null,
      subscriber: null,
      publisher: null,
      isConnected: false
    };
  }
}

/**
 * Get Redis client instance
 */
export function getRedisClient() {
  return redisClient;
}

/**
 * Get Redis subscriber instance
 */
export function getRedisSubscriber() {
  return redisSubscriber;
}

/**
 * Get Redis publisher instance
 */
export function getRedisPublisher() {
  return redisPublisher;
}

/**
 * Check if Redis is connected and available
 */
export async function isRedisConnected() {
  if (!redisClient || !redisConfig.enabled) {
    return false;
  }

  try {
    await redisClient.ping();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Execute Redis command with error handling
 * Falls back gracefully if Redis is unavailable
 */
export async function safeRedisCommand(command, fallbackValue = null) {
  if (!redisClient || !redisConfig.enabled) {
    return fallbackValue;
  }

  try {
    return await command();
  } catch (error) {
    if (redisConfig.enableLogging) {
      console.warn('⚠️  Redis command failed:', error.message);
    }
    return fallbackValue;
  }
}

/**
 * Cleanup Redis connections
 */
export async function cleanupRedis() {
  const connections = [redisClient, redisSubscriber, redisPublisher];
  
  for (const connection of connections) {
    if (connection) {
      try {
        await connection.quit();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }

  redisClient = null;
  redisSubscriber = null;
  redisPublisher = null;

  if (redisConfig.enableLogging) {
    console.log('🧹 Redis connections cleaned up');
  }
}

/**
 * Health check for Redis
 */
export async function redisHealthCheck() {
  if (!redisConfig.enabled) {
    return {
      status: 'disabled',
      message: 'Redis is disabled'
    };
  }

  if (!redisClient) {
    return {
      status: 'error',
      message: 'Redis client not initialized'
    };
  }

  try {
    const start = Date.now();
    await redisClient.ping();
    const latency = Date.now() - start;

    return {
      status: 'healthy',
      message: 'Redis is connected and responding',
      latency: `${latency}ms`,
      config: {
        url: redisConfig.url.replace(/\/\/.*@/, '//***:***@'), // Hide credentials
        db: redisConfig.db,
        maxConnections: redisConfig.maxConnections
      }
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message,
      lastError: new Date().toISOString()
    };
  }
}

/**
 * Redis metrics for monitoring
 */
export async function getRedisMetrics() {
  if (!redisClient || !redisConfig.enabled) {
    return null;
  }

  try {
    const info = await redisClient.info();
    const memoryInfo = await redisClient.info('memory');
    const keyspaceInfo = await redisClient.info('keyspace');

    return {
      connected: true,
      uptime: info.match(/uptime_in_seconds:(\d+)/)?.[1] || 'unknown',
      memory_used: memoryInfo.match(/used_memory_human:(\S+)/)?.[1] || 'unknown',
      total_connections: info.match(/total_connections_received:(\d+)/)?.[1] || 'unknown',
      keyspace: keyspaceInfo || 'no keys',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Export configuration for external use
export { redisConfig as config };

// Export default configuration object
export default {
  config: redisConfig,
  initialize: initializeRedis,
  getClient: getRedisClient,
  getSubscriber: getRedisSubscriber,
  getPublisher: getRedisPublisher,
  isConnected: isRedisConnected,
  safeCommand: safeRedisCommand,
  cleanup: cleanupRedis,
  healthCheck: redisHealthCheck,
  getMetrics: getRedisMetrics
};