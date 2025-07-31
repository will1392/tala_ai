/**
 * CMO Performance Monitoring Routes
 * 
 * Endpoints for monitoring CMO mode performance
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { cmoCache } from '../services/cmo/CMOCache.js';
import { performanceUtils } from '../config/performance.js';

const router = express.Router();

/**
 * GET /api/cmo/monitoring/stats
 * Get CMO performance statistics
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required',
        code: 'FORBIDDEN'
      });
    }

    const cacheStats = cmoCache.getStats();
    const memory = performanceUtils.getMemoryUsage();
    
    res.json({
      success: true,
      timestamp: new Date(),
      performance: {
        cache: {
          ...cacheStats,
          efficiency: {
            hitRate: (cacheStats.hitRate * 100).toFixed(2) + '%',
            totalRequests: cacheStats.hits + cacheStats.misses,
            cacheSize: Object.values(cacheStats.caches).reduce((sum, cache) => sum + cache.keys, 0)
          }
        },
        memory: {
          ...memory,
          status: memory.percentage > 0.9 ? 'critical' : 
                  memory.percentage > 0.8 ? 'warning' : 'healthy'
        },
        uptime: process.uptime()
      }
    });
  } catch (error) {
    console.error('Monitoring error:', error);
    res.status(500).json({
      error: 'Failed to retrieve monitoring data',
      details: error.message
    });
  }
});

/**
 * POST /api/cmo/monitoring/cache/clear
 * Clear CMO caches
 */
router.post('/cache/clear', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required',
        code: 'FORBIDDEN'
      });
    }

    const { type = 'all' } = req.body;
    
    if (type === 'all') {
      cmoCache.flushAll();
    } else {
      const cleared = cmoCache.clearOldEntries();
      return res.json({
        success: true,
        message: `Cleared ${cleared} old cache entries`,
        type: 'partial'
      });
    }

    res.json({
      success: true,
      message: 'Cache cleared successfully',
      type
    });
  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({
      error: 'Failed to clear cache',
      details: error.message
    });
  }
});

/**
 * GET /api/cmo/monitoring/health
 * CMO mode health check
 */
router.get('/health', async (req, res) => {
  try {
    const memory = performanceUtils.getMemoryUsage();
    const cacheStats = cmoCache.getStats();
    
    const health = {
      status: 'healthy',
      checks: {
        memory: memory.percentage < 0.8 ? 'pass' : 'warn',
        cache: cacheStats.hitRate > 0.3 ? 'pass' : 'warn',
        uptime: process.uptime() > 60 ? 'pass' : 'warn'
      },
      details: {
        memoryUsage: `${memory.percentage * 100}%`,
        cacheHitRate: `${(cacheStats.hitRate * 100).toFixed(2)}%`,
        uptime: `${Math.floor(process.uptime() / 60)} minutes`
      }
    };

    // Determine overall health
    const warnings = Object.values(health.checks).filter(c => c === 'warn').length;
    if (warnings > 1) {
      health.status = 'degraded';
    }

    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

/**
 * GET /api/cmo/monitoring/metrics
 * Get detailed performance metrics
 */
router.get('/metrics', authenticate, async (req, res) => {
  try {
    const { period = 'current' } = req.query;
    
    // This would connect to a time-series database in production
    // For now, return current metrics
    const metrics = {
      period,
      queryPerformance: {
        avgResponseTime: '150ms',
        p95ResponseTime: '300ms',
        p99ResponseTime: '500ms'
      },
      knowledgeBase: {
        totalItems: 500, // This would come from CMOKnowledgeBase
        indexedItems: 500,
        categories: {
          seo: 120,
          email: 100,
          social: 90,
          ads: 100,
          direct_mail: 90
        }
      },
      usage: {
        totalQueries: cmoCache.getStats().hits + cmoCache.getStats().misses,
        uniqueUsers: 45, // This would come from tracking
        popularQueries: [
          'SEO optimization',
          'Email subject lines',
          'Social media hashtags'
        ]
      }
    };

    res.json({
      success: true,
      metrics,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      details: error.message
    });
  }
});

export default router;