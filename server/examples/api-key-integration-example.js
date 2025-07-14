/**
 * API Key Integration Example
 * 
 * Demonstrates how to integrate the API Key Management System
 * into your Express.js application.
 */

import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

// Import API Key Management components
import apiKeyManager from '../auth/ApiKeyManager.js';
import { apiKeyAuth, requireApiKey, requirePermissions, userOrApiKey } from '../middleware/apiKeyAuth.js';
import { rateLimitMiddleware, createApiKeyAwareRateLimit } from '../middleware/rateLimiter.js';
import apiKeysRouter from '../routes/apiKeys.js';
import authManager from '../auth/AuthManager.js';

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

/**
 * 1. Initialize API Key Manager
 */
async function initializeApiKeySystem() {
  try {
    // Initialize with your database client
    const dbClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    await apiKeyManager.initialize(dbClient);
    console.log('✅ API Key Manager initialized');
    
    // Initialize auth manager for user authentication
    const authConfig = {
      local: { enabled: true },
      mock: { enabled: process.env.NODE_ENV === 'development' }
    };
    
    await authManager.initialize(authConfig);
    console.log('✅ Auth Manager initialized');
    
  } catch (error) {
    console.error('❌ Failed to initialize API Key system:', error);
    process.exit(1);
  }
}

/**
 * 2. Setup API Key Management Routes
 */
app.use('/api/keys', apiKeysRouter);

/**
 * 3. Example: Public endpoint (no authentication)
 */
app.get('/api/public', (req, res) => {
  res.json({
    message: 'This is a public endpoint',
    timestamp: new Date().toISOString()
  });
});

/**
 * 4. Example: API Key OR User authentication
 */
app.get('/api/protected', 
  userOrApiKey(authManager),
  (req, res) => {
    res.json({
      message: 'This endpoint accepts either API key or user authentication',
      authMethod: req.authMethod,
      user: req.user,
      timestamp: new Date().toISOString()
    });
  }
);

/**
 * 5. Example: API Key required with rate limiting
 */
app.get('/api/data', 
  requireApiKey(),
  rateLimitMiddleware.default,
  (req, res) => {
    res.json({
      message: 'Data accessed with API key',
      apiKey: {
        id: req.apiKey.id,
        prefix: req.apiKey.prefix,
        name: req.apiKey.name
      },
      data: [
        { id: 1, value: 'Sample data 1' },
        { id: 2, value: 'Sample data 2' },
        { id: 3, value: 'Sample data 3' }
      ],
      timestamp: new Date().toISOString()
    });
  }
);

/**
 * 6. Example: API Key with specific permissions
 */
app.get('/api/analytics', 
  requirePermissions(['analytics:read'], 'OR'),
  rateLimitMiddleware.default,
  (req, res) => {
    res.json({
      message: 'Analytics data (requires analytics:read permission)',
      analytics: {
        totalRequests: 12345,
        avgResponseTime: 245,
        errorRate: 0.02
      },
      timestamp: new Date().toISOString()
    });
  }
);

/**
 * 7. Example: High-rate endpoint with custom rate limiting
 */
app.post('/api/search', 
  requireApiKey(),
  createApiKeyAwareRateLimit('search', {
    burstAllowance: true,
    burstMultiplier: 3
  }),
  (req, res) => {
    const { query, filters = {} } = req.body;
    
    if (!query) {
      return res.status(400).json({
        error: 'Search query is required',
        code: 'MISSING_QUERY'
      });
    }
    
    // Simulate search results
    const results = [
      { id: 1, title: `Result for "${query}"`, score: 0.95 },
      { id: 2, title: `Another result for "${query}"`, score: 0.87 },
      { id: 3, title: `Related to "${query}"`, score: 0.73 }
    ];
    
    res.json({
      query,
      filters,
      results,
      total: results.length,
      timestamp: new Date().toISOString()
    });
  }
);

/**
 * 8. Example: Admin endpoint (restricted permissions)
 */
app.get('/api/admin/stats', 
  requirePermissions(['system:read', 'admin:read'], 'OR'),
  rateLimitMiddleware.admin,
  (req, res) => {
    res.json({
      message: 'System statistics (admin only)',
      stats: {
        totalApiKeys: 42,
        activeKeys: 38,
        totalRequests: 156789,
        avgRequestsPerKey: 3731
      },
      timestamp: new Date().toISOString()
    });
  }
);

/**
 * 9. Example: File upload with API key auth
 */
app.post('/api/upload', 
  requireApiKey({ permissions: ['documents:write'] }),
  rateLimitMiddleware.upload,
  (req, res) => {
    // In a real app, you'd handle file upload here
    res.json({
      message: 'File upload endpoint (requires documents:write)',
      uploadId: 'upload_' + Date.now(),
      status: 'pending',
      timestamp: new Date().toISOString()
    });
  }
);

/**
 * 10. Example: Webhook endpoint with API key validation
 */
app.post('/api/webhooks/:source', 
  apiKeyAuth({ 
    required: true,
    logUsage: true,
    permissions: ['webhooks:receive']
  }),
  (req, res) => {
    const { source } = req.params;
    const payload = req.body;
    
    console.log(`Webhook received from ${source}:`, payload);
    
    res.json({
      message: 'Webhook received successfully',
      source,
      processedAt: new Date().toISOString()
    });
  }
);

/**
 * 11. Example: Optional API key endpoint
 */
app.get('/api/content', 
  apiKeyAuth({ required: false }),
  (req, res) => {
    const hasApiKey = !!req.apiKey;
    
    // Provide different content based on authentication
    const content = hasApiKey ? {
      premium: true,
      data: 'Premium content with full details',
      analysis: 'Detailed analysis available',
      metadata: 'Complete metadata'
    } : {
      premium: false,
      data: 'Basic content',
      analysis: 'Limited analysis',
      metadata: 'Basic metadata'
    };
    
    res.json({
      message: hasApiKey ? 'Premium content (API key provided)' : 'Basic content (no API key)',
      hasAuthentication: hasApiKey,
      content,
      timestamp: new Date().toISOString()
    });
  }
);

/**
 * 12. Example: Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    services: {
      apiKeyManager: apiKeyManager.initialized,
      authManager: authManager.initialized
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * 13. Error handling middleware
 */
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  
  // Handle API key specific errors
  if (err.code && err.code.startsWith('API_KEY_')) {
    return res.status(err.statusCode || 401).json({
      error: err.message,
      code: err.code,
      timestamp: new Date().toISOString()
    });
  }
  
  // Handle rate limiting errors
  if (err.status === 429) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: err.retryAfter,
      timestamp: new Date().toISOString()
    });
  }
  
  // Generic error handling
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  });
});

/**
 * 14. Start the server
 */
async function startServer() {
  await initializeApiKeySystem();
  
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(`📋 API Key endpoints available at http://localhost:${port}/api/keys`);
    console.log(`🔑 Test endpoints:`);
    console.log(`   GET  /api/public - Public endpoint`);
    console.log(`   GET  /api/protected - User OR API key auth`);
    console.log(`   GET  /api/data - API key required`);
    console.log(`   GET  /api/analytics - Requires analytics:read permission`);
    console.log(`   POST /api/search - High-rate endpoint with burst allowance`);
    console.log(`   GET  /api/admin/stats - Admin permissions required`);
    console.log(`   POST /api/upload - Requires documents:write permission`);
    console.log(`   GET  /api/content - Optional API key (different content)`);
    console.log(`   GET  /health - Health check`);
  });
}

/**
 * 15. Example usage in client code
 */
function exampleClientUsage() {
  console.log('\n📝 Example client usage:');
  console.log('');
  console.log('// Using curl with API key:');
  console.log('curl -H "X-API-Key: tlai_test_your_api_key_here" http://localhost:3001/api/data');
  console.log('');
  console.log('// Using JavaScript fetch:');
  console.log('fetch("http://localhost:3001/api/analytics", {');
  console.log('  headers: {');
  console.log('    "X-API-Key": "tlai_test_your_api_key_here",');
  console.log('    "Content-Type": "application/json"');
  console.log('  }');
  console.log('});');
  console.log('');
  console.log('// Creating a new API key:');
  console.log('curl -X POST http://localhost:3001/api/keys \\');
  console.log('  -H "Authorization: Bearer your_user_token" \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"name": "My API Key", "permissions": ["documents:read", "analytics:read"]}\'');
  console.log('');
}

// Export for use in other files
export { app, initializeApiKeySystem };

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().then(() => {
    exampleClientUsage();
  }).catch(console.error);
}