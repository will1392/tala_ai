/**
 * Example Integration of LLM Router into Tala AI Server
 * 
 * This file shows how to integrate the intelligent LLM Router
 * into your existing Tala AI Express server routes.
 */

import express from 'express';
import LLMRouter from './services/llm/LLMRouter.js';

// Initialize router instance (do this once at server startup)
const llmRouter = new LLMRouter({
  enableLogging: true,
  costOptimization: true,
  fallbackChain: [
    'gpt-4o-mini',           // Fast and cost-effective
    'claude-sonnet-4-20250514',  // High quality backup
    'gemini-2.5-flash',     // Ultra-fast backup
    'grok-3-latest',        // Real-time backup
    'mock-model'            // Final fallback for testing
  ]
});

// Example Express route integration
const router = express.Router();

/**
 * Main chat endpoint with intelligent routing
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, context = {}, options = {} } = req.body;
    
    if (!message) {
      return res.status(400).json({
        error: 'Message is required'
      });
    }

    // Extract user preferences from request
    const userContext = {
      userId: req.user?.id,
      userPreferences: {
        preferredModel: req.user?.preferences?.llmModel,
        fastResponse: req.query.fast === 'true',
        costOptimization: req.user?.preferences?.costOptimization !== false
      },
      conversationHistory: context.history || [],
      hasAttachments: req.files && req.files.length > 0,
      sessionId: req.sessionID
    };

    // Use intelligent routing
    const response = await llmRouter.routeQuery(message, userContext, {
      maxTokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.7,
      ...options
    });

    // Return response with routing metadata
    res.json({
      success: true,
      message: response.content,
      metadata: {
        model: response.metadata.model,
        routing: response.routing,
        usage: response.usage,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Travel planning endpoint with forced complex planning
 */
router.post('/plan-trip', async (req, res) => {
  try {
    const { destination, duration, preferences = {} } = req.body;
    
    const planningQuery = `Create a detailed ${duration}-day travel itinerary for ${destination} 
      with the following preferences: ${JSON.stringify(preferences)}`;

    // Force complex planning model selection
    const response = await llmRouter.routeQuery(planningQuery, {
      forceQueryType: 'complexPlanning',
      userPreferences: {
        preferredModel: 'claude-opus-4-20250514' // Best for complex planning
      }
    }, {
      maxTokens: 2000,
      temperature: 0.8
    });

    res.json({
      success: true,
      itinerary: response.content,
      metadata: response.routing
    });

  } catch (error) {
    console.error('Trip planning error:', error);
    res.status(500).json({
      error: 'Failed to generate itinerary',
      message: error.message
    });
  }
});

/**
 * Real-time information endpoint
 */
router.get('/current/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { location } = req.query;
    
    let query;
    switch (type) {
      case 'weather':
        query = `What's the current weather in ${location}?`;
        break;
      case 'time':
        query = `What's the current time in ${location}?`;
        break;
      case 'events':
        query = `What events are happening in ${location} right now?`;
        break;
      default:
        return res.status(400).json({ error: 'Invalid type' });
    }

    // Force real-time routing
    const response = await llmRouter.routeQuery(query, {
      forceQueryType: 'realTime',
      userPreferences: {
        fastResponse: true
      }
    }, {
      maxTokens: 500
    });

    res.json({
      success: true,
      data: response.content,
      type,
      location,
      metadata: response.routing
    });

  } catch (error) {
    console.error('Real-time info error:', error);
    res.status(500).json({
      error: 'Failed to get real-time information',
      message: error.message
    });
  }
});

/**
 * Document analysis endpoint
 */
router.post('/analyze-document', async (req, res) => {
  try {
    const { content, analysisType = 'general' } = req.body;
    
    const analysisQuery = `Analyze this ${analysisType} document and extract key information: ${content}`;

    // Force document analysis routing
    const response = await llmRouter.routeQuery(analysisQuery, {
      forceQueryType: 'documentAnalysis',
      hasDocuments: true
    }, {
      maxTokens: 1500
    });

    res.json({
      success: true,
      analysis: response.content,
      analysisType,
      metadata: response.routing
    });

  } catch (error) {
    console.error('Document analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze document',
      message: error.message
    });
  }
});

/**
 * Router analytics endpoint
 */
router.get('/analytics', async (req, res) => {
  try {
    const stats = llmRouter.getRoutingStats();
    
    res.json({
      success: true,
      analytics: {
        totalQueries: stats.totalQueries,
        cacheSize: stats.cacheSize,
        routingDecisions: stats.routingDecisions,
        fallbackUsage: stats.fallbackUsage,
        uptime: Math.floor((Date.now() - stats.uptime) / 1000) + ' seconds'
      }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      error: 'Failed to get analytics',
      message: error.message
    });
  }
});

/**
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    // Test routing with a simple query
    const testResponse = await llmRouter.routeQuery(
      "Test message for health check",
      {},
      { maxTokens: 10 }
    );

    res.json({
      success: true,
      status: 'healthy',
      routerWorking: true,
      selectedModel: testResponse.routing.selectedModel,
      responseTime: testResponse.routing.routingTime
    });

  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      routerWorking: false,
      error: error.message
    });
  }
});

// Example middleware for request logging
router.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

export default router;

/**
 * Usage in your main server.js:
 * 
 * import express from 'express';
 * import llmRouterRoutes from './example-router-integration.js';
 * 
 * const app = express();
 * app.use('/api/llm', llmRouterRoutes);
 * 
 * This provides endpoints like:
 * - POST /api/llm/chat
 * - POST /api/llm/plan-trip
 * - GET /api/llm/current/weather?location=Paris
 * - POST /api/llm/analyze-document
 * - GET /api/llm/analytics
 * - GET /api/llm/health
 */