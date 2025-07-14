/**
 * Monitoring Dashboard Routes
 * 
 * Provides comprehensive metrics and analytics for the Tala AI system
 */

import express from 'express';
import authenticate from '../middleware/auth.js';
import TalaIntelligence from '../services/intelligence/TalaIntelligence.js';
import MemoryManager from '../services/memory/MemoryManager.js';
import ProfileManager from '../services/profiles/ProfileManager.js';
import { CompressionService } from '../services/compression/CompressionService.js';
import conversationService from '../services/conversations/conversationDAL.js';

const router = express.Router();

// Get intelligence instance (assuming it's initialized elsewhere)
let intelligence;

export function setIntelligence(intelligenceInstance) {
  intelligence = intelligenceInstance;
}

/**
 * GET /api/monitoring/overview
 * Get system overview metrics
 */
router.get('/overview', authenticate, async (req, res) => {
  try {
    // Admin check
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const overview = {
      timestamp: new Date(),
      system: {
        status: 'operational',
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version
      },
      intelligence: intelligence ? intelligence.getMetrics() : null,
      services: await getServiceStatuses()
    };
    
    res.json({ success: true, data: overview });
    
  } catch (error) {
    console.error('❌ Monitoring overview error:', error);
    res.status(500).json({ error: 'Failed to retrieve overview' });
  }
});

/**
 * GET /api/monitoring/agents
 * Get agent performance metrics
 */
router.get('/agents', authenticate, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { period = '24h', agentId } = req.query;
    
    const agentMetrics = await getAgentMetrics(period, agentId);
    
    res.json({
      success: true,
      data: {
        period,
        metrics: agentMetrics,
        summary: calculateAgentSummary(agentMetrics)
      }
    });
    
  } catch (error) {
    console.error('❌ Agent metrics error:', error);
    res.status(500).json({ error: 'Failed to retrieve agent metrics' });
  }
});

/**
 * GET /api/monitoring/memory
 * Get memory storage statistics
 */
router.get('/memory', authenticate, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const memoryManager = new MemoryManager();
    const stats = await memoryManager.getStats();
    
    const memoryMetrics = {
      totalMemories: stats.totalCount || 0,
      byType: stats.typeDistribution || {},
      byImportance: await getMemoryImportanceDistribution(),
      storageSize: stats.totalSize || 0,
      averageImportance: stats.averageImportance || 0,
      recentActivity: await getRecentMemoryActivity()
    };
    
    res.json({
      success: true,
      data: memoryMetrics
    });
    
  } catch (error) {
    console.error('❌ Memory metrics error:', error);
    res.status(500).json({ error: 'Failed to retrieve memory metrics' });
  }
});

/**
 * GET /api/monitoring/context
 * Get context compression statistics
 */
router.get('/context', authenticate, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const compressionService = new CompressionService();
    const contextMetrics = {
      compressionRatio: intelligence?.performanceMetrics.contextCompressionRatio || 0,
      averageContextSize: await getAverageContextSize(),
      compressionEvents: await getCompressionEvents(),
      strategies: {
        simple: 0,
        intelligent: 0,
        aggressive: 0
      }
    };
    
    res.json({
      success: true,
      data: contextMetrics
    });
    
  } catch (error) {
    console.error('❌ Context metrics error:', error);
    res.status(500).json({ error: 'Failed to retrieve context metrics' });
  }
});

/**
 * GET /api/monitoring/users
 * Get user engagement metrics
 */
router.get('/users', authenticate, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { period = '7d' } = req.query;
    
    const userMetrics = {
      activeUsers: await getActiveUserCount(period),
      totalUsers: await getTotalUserCount(),
      engagementRate: await calculateEngagementRate(period),
      satisfactionScore: await getAverageSatisfactionScore(period),
      topUsers: await getTopUsers(5),
      userActivity: await getUserActivityTimeline(period)
    };
    
    res.json({
      success: true,
      data: userMetrics
    });
    
  } catch (error) {
    console.error('❌ User metrics error:', error);
    res.status(500).json({ error: 'Failed to retrieve user metrics' });
  }
});

/**
 * GET /api/monitoring/conversations
 * Get conversation analytics
 */
router.get('/conversations', authenticate, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { period = '24h' } = req.query;
    
    const conversationMetrics = {
      totalConversations: await getTotalConversations(),
      activeConversations: await getActiveConversations(period),
      averageLength: await getAverageConversationLength(),
      topTopics: await getTopConversationTopics(10),
      responseTime: await getAverageResponseTime(),
      threadingStats: await getThreadingStatistics()
    };
    
    res.json({
      success: true,
      data: conversationMetrics
    });
    
  } catch (error) {
    console.error('❌ Conversation metrics error:', error);
    res.status(500).json({ error: 'Failed to retrieve conversation metrics' });
  }
});

/**
 * GET /api/monitoring/learning
 * Get learning engine insights
 */
router.get('/learning', authenticate, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    if (!intelligence?.learningEngine) {
      return res.json({
        success: true,
        data: { message: 'Learning engine not initialized' }
      });
    }
    
    const learningMetrics = intelligence.learningEngine.getMetrics();
    const insights = intelligence.learningEngine.getPatternInsights();
    
    res.json({
      success: true,
      data: {
        metrics: learningMetrics,
        insights,
        modelAccuracy: learningMetrics.modelAccuracy || 0,
        feedbackCount: learningMetrics.feedbackReceived || 0,
        lastUpdate: learningMetrics.lastUpdate
      }
    });
    
  } catch (error) {
    console.error('❌ Learning metrics error:', error);
    res.status(500).json({ error: 'Failed to retrieve learning metrics' });
  }
});

/**
 * GET /api/monitoring/performance
 * Get detailed performance metrics
 */
router.get('/performance', authenticate, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { period = '1h', interval = '5m' } = req.query;
    
    const performanceMetrics = {
      responseTime: await getResponseTimeMetrics(period, interval),
      throughput: await getThroughputMetrics(period, interval),
      errorRate: await getErrorRateMetrics(period, interval),
      saturation: await getSaturationMetrics(),
      latencyPercentiles: await getLatencyPercentiles(period)
    };
    
    res.json({
      success: true,
      data: performanceMetrics
    });
    
  } catch (error) {
    console.error('❌ Performance metrics error:', error);
    res.status(500).json({ error: 'Failed to retrieve performance metrics' });
  }
});

/**
 * GET /api/monitoring/alerts
 * Get system alerts and anomalies
 */
router.get('/alerts', authenticate, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const alerts = await getSystemAlerts();
    
    res.json({
      success: true,
      data: {
        active: alerts.filter(a => a.status === 'active'),
        resolved: alerts.filter(a => a.status === 'resolved'),
        totalCount: alerts.length
      }
    });
    
  } catch (error) {
    console.error('❌ Alerts error:', error);
    res.status(500).json({ error: 'Failed to retrieve alerts' });
  }
});

// Helper functions

async function getServiceStatuses() {
  const services = {
    memoryManager: { status: 'unknown', responseTime: null },
    profileManager: { status: 'unknown', responseTime: null },
    contextManager: { status: 'unknown', responseTime: null },
    agentOrchestrator: { status: 'unknown', responseTime: null },
    learningEngine: { status: 'unknown', responseTime: null }
  };
  
  // Check each service
  try {
    const start = Date.now();
    const memoryManager = new MemoryManager();
    const stats = await memoryManager.getStats();
    services.memoryManager = {
      status: stats ? 'operational' : 'degraded',
      responseTime: Date.now() - start
    };
  } catch (error) {
    services.memoryManager.status = 'error';
  }
  
  // Add similar checks for other services...
  
  return services;
}

async function getAgentMetrics(period, agentId) {
  if (!intelligence) return [];
  
  const metrics = [];
  const agentUtilization = intelligence.performanceMetrics.agentUtilization;
  
  agentUtilization.forEach((count, id) => {
    if (!agentId || id === agentId) {
      metrics.push({
        agentId: id,
        totalTasks: count,
        successRate: 0.95, // Would be calculated from real data
        averageExecutionTime: 1500, // Would be calculated from real data
        lastUsed: new Date()
      });
    }
  });
  
  return metrics;
}

function calculateAgentSummary(metrics) {
  const totalTasks = metrics.reduce((sum, m) => sum + m.totalTasks, 0);
  const avgSuccessRate = metrics.reduce((sum, m) => sum + m.successRate, 0) / metrics.length;
  
  return {
    totalAgents: metrics.length,
    totalTasks,
    averageSuccessRate: avgSuccessRate || 0,
    mostUsedAgent: metrics.sort((a, b) => b.totalTasks - a.totalTasks)[0]?.agentId
  };
}

async function getMemoryImportanceDistribution() {
  // This would query the actual memory storage
  return {
    high: 120,
    medium: 340,
    low: 89
  };
}

async function getRecentMemoryActivity() {
  // This would query recent memory operations
  return {
    created: 45,
    retrieved: 230,
    updated: 12,
    deleted: 3
  };
}

async function getAverageContextSize() {
  // This would calculate from actual context data
  return 4500; // tokens
}

async function getCompressionEvents() {
  // This would query compression history
  return {
    total: 156,
    successful: 150,
    failed: 6,
    averageReduction: 0.65
  };
}

async function getActiveUserCount(period) {
  // This would query actual user activity
  return 42;
}

async function getTotalUserCount() {
  // This would query user database
  return 156;
}

async function calculateEngagementRate(period) {
  // Active users / total users
  return 0.27;
}

async function getAverageSatisfactionScore(period) {
  // From feedback data
  return 4.2;
}

async function getTopUsers(limit) {
  // This would query actual usage data
  return [
    { userId: 'user_1', interactions: 145, satisfaction: 4.8 },
    { userId: 'user_2', interactions: 98, satisfaction: 4.5 },
    { userId: 'user_3', interactions: 76, satisfaction: 4.3 }
  ].slice(0, limit);
}

async function getUserActivityTimeline(period) {
  // This would generate timeline data
  const timeline = [];
  const now = Date.now();
  const intervalMs = 3600000; // 1 hour
  
  for (let i = 24; i >= 0; i--) {
    timeline.push({
      timestamp: new Date(now - i * intervalMs),
      activeUsers: Math.floor(Math.random() * 20) + 5,
      interactions: Math.floor(Math.random() * 50) + 10
    });
  }
  
  return timeline;
}

async function getTotalConversations() {
  try {
    const result = await conversationService.getTotalCount();
    return result.data || 0;
  } catch {
    return 0;
  }
}

async function getActiveConversations(period) {
  // This would query conversations updated within period
  return 28;
}

async function getAverageConversationLength() {
  // Average number of messages per conversation
  return 12.5;
}

async function getTopConversationTopics(limit) {
  // This would analyze conversation content
  return [
    { topic: 'visa-requirements', count: 89 },
    { topic: 'flight-booking', count: 67 },
    { topic: 'itinerary-planning', count: 54 },
    { topic: 'document-preparation', count: 43 },
    { topic: 'travel-insurance', count: 38 }
  ].slice(0, limit);
}

async function getAverageResponseTime() {
  if (intelligence) {
    return intelligence.performanceMetrics.averageResponseTime || 0;
  }
  return 1250; // ms
}

async function getThreadingStatistics() {
  return {
    totalThreads: 156,
    averageMessagesPerThread: 8.3,
    threadsWithContext: 142,
    threadsWithCompression: 23
  };
}

async function getResponseTimeMetrics(period, interval) {
  // This would query actual response time data
  const metrics = [];
  const now = Date.now();
  const intervalMs = parseInterval(interval);
  const periodMs = parsePeriod(period);
  
  for (let i = 0; i < periodMs / intervalMs; i++) {
    metrics.push({
      timestamp: new Date(now - i * intervalMs),
      average: Math.random() * 500 + 800,
      min: Math.random() * 200 + 400,
      max: Math.random() * 1000 + 1500
    });
  }
  
  return metrics.reverse();
}

async function getThroughputMetrics(period, interval) {
  // Requests per second
  const metrics = [];
  const now = Date.now();
  const intervalMs = parseInterval(interval);
  const periodMs = parsePeriod(period);
  
  for (let i = 0; i < periodMs / intervalMs; i++) {
    metrics.push({
      timestamp: new Date(now - i * intervalMs),
      requestsPerSecond: Math.random() * 5 + 2
    });
  }
  
  return metrics.reverse();
}

async function getErrorRateMetrics(period, interval) {
  const metrics = [];
  const now = Date.now();
  const intervalMs = parseInterval(interval);
  const periodMs = parsePeriod(period);
  
  for (let i = 0; i < periodMs / intervalMs; i++) {
    metrics.push({
      timestamp: new Date(now - i * intervalMs),
      errorRate: Math.random() * 0.05 // 0-5% error rate
    });
  }
  
  return metrics.reverse();
}

async function getSaturationMetrics() {
  return {
    cpu: process.cpuUsage(),
    memory: process.memoryUsage(),
    eventLoop: {
      delay: 0, // Would measure actual event loop delay
      utilization: 0.3
    }
  };
}

async function getLatencyPercentiles(period) {
  return {
    p50: 850,
    p90: 1200,
    p95: 1500,
    p99: 2200
  };
}

async function getSystemAlerts() {
  const alerts = [];
  
  // Check various conditions and generate alerts
  if (intelligence) {
    const metrics = intelligence.getMetrics();
    
    if (metrics.averageResponseTime > 2000) {
      alerts.push({
        id: 'alert_1',
        type: 'performance',
        severity: 'warning',
        message: 'High average response time detected',
        metric: 'responseTime',
        value: metrics.averageResponseTime,
        threshold: 2000,
        status: 'active',
        timestamp: new Date()
      });
    }
    
    if (metrics.contextCompressionRatio > 0.8) {
      alerts.push({
        id: 'alert_2',
        type: 'resource',
        severity: 'info',
        message: 'High context compression ratio',
        metric: 'compressionRatio',
        value: metrics.contextCompressionRatio,
        threshold: 0.8,
        status: 'active',
        timestamp: new Date()
      });
    }
  }
  
  return alerts;
}

// Utility functions
function parseInterval(interval) {
  const match = interval.match(/(\d+)([mhd])/);
  if (!match) return 300000; // Default 5 minutes
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 300000;
  }
}

function parsePeriod(period) {
  const match = period.match(/(\d+)([hd])/);
  if (!match) return 86400000; // Default 24 hours
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 86400000;
  }
}

export default router;