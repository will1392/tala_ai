/**
 * API Endpoint for LLM Metrics Dashboard
 * 
 * Provides comprehensive metrics, performance data, and cost analytics
 * for the Tala AI multi-LLM architecture monitoring dashboard.
 */

import express from 'express';
import LLMRouter from './services/llm/LLMRouter.js';

// Initialize router with monitoring enabled
const llmRouter = new LLMRouter({
  enableLogging: true,
  enableMonitoring: true,
  enableCostOptimization: true,
  enableHealthChecks: true,
  dailyBudget: 50.00,      // $50/day budget
  monthlyBudget: 1000.00   // $1000/month budget
});

const router = express.Router();

/**
 * GET /api/llm/metrics
 * 
 * Returns comprehensive metrics for the dashboard
 */
router.get('/metrics', async (req, res) => {
  try {
    const { timeRange, format } = req.query;
    
    // Parse time range (default to 24 hours)
    let timeRangeMs = 24 * 60 * 60 * 1000; // 24 hours
    if (timeRange) {
      const match = timeRange.match(/^(\d+)([hdwm])$/);
      if (match) {
        const value = parseInt(match[1]);
        const unit = match[2];
        
        switch (unit) {
          case 'h': timeRangeMs = value * 60 * 60 * 1000; break;
          case 'd': timeRangeMs = value * 24 * 60 * 60 * 1000; break;
          case 'w': timeRangeMs = value * 7 * 24 * 60 * 60 * 1000; break;
          case 'm': timeRangeMs = value * 30 * 24 * 60 * 60 * 1000; break;
        }
      }
    }
    
    // Get comprehensive monitoring report
    const report = llmRouter.getMonitoringReport({ 
      timeRange: timeRangeMs,
      includePatterns: true,
      includeAggregations: true
    });
    
    // Add dashboard-specific data
    const dashboardData = llmRouter.getDashboardData();
    
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      timeRange: {
        value: timeRangeMs,
        description: timeRange || '24h'
      },
      data: {
        ...report,
        dashboard: dashboardData
      }
    };
    
    // Return different formats based on request
    if (format === 'dashboard') {
      res.json({
        success: true,
        data: dashboardData
      });
    } else {
      res.json(response);
    }
    
  } catch (error) {
    console.error('Metrics endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve metrics',
      message: error.message
    });
  }
});

/**
 * GET /api/llm/metrics/performance
 * 
 * Returns performance-specific metrics
 */
router.get('/metrics/performance', async (req, res) => {
  try {
    const { models } = req.query;
    
    const performanceData = {
      summary: llmRouter.performanceMonitor?.getPerformanceReport() || null,
      comparison: llmRouter.performanceMonitor?.compareModels(
        models ? models.split(',') : []
      ) || null,
      status: llmRouter.performanceMonitor?.getStatus() || null
    };
    
    res.json({
      success: true,
      data: performanceData
    });
    
  } catch (error) {
    console.error('Performance metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve performance metrics'
    });
  }
});

/**
 * GET /api/llm/metrics/costs
 * 
 * Returns cost and budget information
 */
router.get('/metrics/costs', async (req, res) => {
  try {
    const costData = {
      budget: llmRouter.costOptimizer?.getBudgetStatus() || null,
      breakdown: llmRouter.costOptimizer?.getCostBreakdown() || null,
      projections: llmRouter.costOptimizer?.getCostProjection(30) || null,
      optimization: llmRouter.costOptimizer?.getOptimizationOpportunities() || []
    };
    
    res.json({
      success: true,
      data: costData
    });
    
  } catch (error) {
    console.error('Cost metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve cost metrics'
    });
  }
});

/**
 * GET /api/llm/metrics/health
 * 
 * Returns health status of all services
 */
router.get('/metrics/health', async (req, res) => {
  try {
    const healthData = {
      services: llmRouter.getHealthStatus(),
      circuitBreakers: llmRouter.fallbackManager.getCircuitBreakerStatuses(),
      overall: {
        healthyServices: llmRouter.getHealthyServiceCount(),
        totalServices: llmRouter.serviceHealth.size,
        uptime: Date.now() - llmRouter.routingStats.uptime,
        lastHealthCheck: new Date().toISOString()
      }
    };
    
    res.json({
      success: true,
      data: healthData
    });
    
  } catch (error) {
    console.error('Health metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve health metrics'
    });
  }
});

/**
 * GET /api/llm/metrics/alerts
 * 
 * Returns current system alerts
 */
router.get('/metrics/alerts', async (req, res) => {
  try {
    const alerts = llmRouter.generateAlerts();
    
    res.json({
      success: true,
      data: {
        alerts,
        count: alerts.length,
        critical: alerts.filter(a => a.type === 'error').length,
        warnings: alerts.filter(a => a.type === 'warning').length
      }
    });
    
  } catch (error) {
    console.error('Alerts endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve alerts'
    });
  }
});

/**
 * POST /api/llm/metrics/export
 * 
 * Export metrics data for analysis
 */
router.post('/metrics/export', async (req, res) => {
  try {
    const { format = 'json', timeRange, includeRawData = false } = req.body;
    
    if (!llmRouter.metricsCollector) {
      return res.status(404).json({
        success: false,
        error: 'Metrics collection not enabled'
      });
    }
    
    const timeRangeMs = timeRange ? parseInt(timeRange) : null;
    
    const exportResult = await llmRouter.metricsCollector.exportData({
      format,
      timeRange: timeRangeMs,
      includeRawData
    });
    
    res.json({
      success: true,
      data: exportResult
    });
    
  } catch (error) {
    console.error('Export endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export metrics'
    });
  }
});

/**
 * PUT /api/llm/metrics/budget
 * 
 * Update budget limits
 */
router.put('/metrics/budget', async (req, res) => {
  try {
    const { dailyBudget, monthlyBudget } = req.body;
    
    if (!llmRouter.costOptimizer) {
      return res.status(404).json({
        success: false,
        error: 'Cost optimization not enabled'
      });
    }
    
    // Update budget limits
    if (dailyBudget !== undefined) {
      llmRouter.costOptimizer.budgets.daily.limit = dailyBudget;
      llmRouter.costOptimizer.budgets.daily.remaining = Math.max(0, 
        dailyBudget - llmRouter.costOptimizer.budgets.daily.spent
      );
    }
    
    if (monthlyBudget !== undefined) {
      llmRouter.costOptimizer.budgets.monthly.limit = monthlyBudget;
      llmRouter.costOptimizer.budgets.monthly.remaining = Math.max(0,
        monthlyBudget - llmRouter.costOptimizer.budgets.monthly.spent
      );
    }
    
    const updatedStatus = llmRouter.costOptimizer.getBudgetStatus();
    
    res.json({
      success: true,
      message: 'Budget limits updated',
      data: updatedStatus
    });
    
  } catch (error) {
    console.error('Budget update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update budget'
    });
  }
});

/**
 * POST /api/llm/metrics/reset-circuit-breakers
 * 
 * Reset circuit breakers for specified models
 */
router.post('/metrics/reset-circuit-breakers', async (req, res) => {
  try {
    const { modelId } = req.body;
    
    if (modelId) {
      llmRouter.resetCircuitBreakers(modelId);
    } else {
      llmRouter.resetCircuitBreakers(); // Reset all
    }
    
    const circuitBreakerStatus = llmRouter.fallbackManager.getCircuitBreakerStatuses();
    
    res.json({
      success: true,
      message: modelId ? `Circuit breaker reset for ${modelId}` : 'All circuit breakers reset',
      data: circuitBreakerStatus
    });
    
  } catch (error) {
    console.error('Circuit breaker reset error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset circuit breakers'
    });
  }
});

/**
 * Sample dashboard data structure for frontend integration
 */
const SAMPLE_DASHBOARD_DATA = {
  summary: {
    totalQueries: 15420,
    uptime: 86400000, // 24 hours in ms
    activeModels: 12,
    healthyServices: 11,
    lastUpdated: "2025-07-13T15:30:00.000Z"
  },
  
  performance: {
    current: {
      summary: {
        totalRequests: 1250,
        successfulRequests: 1198,
        totalCost: 12.45,
        totalTokens: 145000,
        avgResponseTime: 1850
      },
      modelPerformance: [
        {
          modelId: "gpt-4o-mini",
          totalRequests: 456,
          successRate: 98.5,
          avgResponseTime: 1200,
          avgCostPerRequest: 0.008
        },
        {
          modelId: "claude-sonnet-4-20250514",
          totalRequests: 324,
          successRate: 97.2,
          avgResponseTime: 2100,
          avgCostPerRequest: 0.015
        }
      ]
    }
  },
  
  costs: {
    budget: {
      daily: {
        limit: 50.00,
        spent: 23.45,
        remaining: 26.55,
        usage: 0.469
      },
      monthly: {
        limit: 1000.00,
        spent: 456.78,
        remaining: 543.22,
        usage: 0.457
      }
    },
    breakdown: {
      byModel: [
        { modelId: "gpt-4o-mini", cost: 8.45 },
        { modelId: "claude-sonnet-4-20250514", cost: 6.78 },
        { modelId: "gemini-2.5-flash", cost: 4.32 }
      ]
    }
  },
  
  routing: {
    queryTypeDistribution: {
      factual: 567,
      realTime: 234,
      complexPlanning: 123,
      documentAnalysis: 89,
      creative: 67
    },
    circuitBreakerStatus: {
      "gpt-4o-mini": { state: "closed", isHealthy: true },
      "claude-sonnet-4-20250514": { state: "closed", isHealthy: true }
    }
  },
  
  alerts: [
    {
      type: "warning",
      category: "budget",
      message: "Daily budget 80% used",
      timestamp: "2025-07-13T15:25:00.000Z"
    }
  ],
  
  charts: {
    responseTime: [
      { timestamp: 1705147200000, avgResponseTime: 1800, requests: 45 },
      { timestamp: 1705150800000, avgResponseTime: 1650, requests: 52 }
    ],
    costTrend: [
      { date: "2025-07-12", cost: 18.45 },
      { date: "2025-07-13", cost: 23.45 }
    ],
    queryVolume: [
      { date: "2025-07-12", queries: 1150, successRate: 97.8 },
      { date: "2025-07-13", queries: 1250, successRate: 95.8 }
    ]
  }
};

/**
 * GET /api/llm/metrics/sample
 * 
 * Returns sample dashboard data for frontend development
 */
router.get('/metrics/sample', (req, res) => {
  res.json({
    success: true,
    data: SAMPLE_DASHBOARD_DATA,
    note: "This is sample data for frontend development"
  });
});

export default router;

/**
 * Usage in main server.js:
 * 
 * import express from 'express';
 * import metricsRoutes from './api-metrics-endpoint.js';
 * 
 * const app = express();
 * app.use('/api/llm', metricsRoutes);
 * 
 * Available endpoints:
 * - GET  /api/llm/metrics              - Comprehensive metrics
 * - GET  /api/llm/metrics/performance  - Performance data
 * - GET  /api/llm/metrics/costs        - Cost analytics
 * - GET  /api/llm/metrics/health       - Service health
 * - GET  /api/llm/metrics/alerts       - System alerts
 * - POST /api/llm/metrics/export       - Export data
 * - PUT  /api/llm/metrics/budget       - Update budgets
 * - POST /api/llm/metrics/reset-circuit-breakers - Reset circuit breakers
 * - GET  /api/llm/metrics/sample       - Sample data for frontend
 */