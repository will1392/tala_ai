/**
 * Context Debugging Tools
 * 
 * Provides debugging capabilities for context detection including
 * logging, visualization, and performance monitoring
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ContextDebugger {
  constructor() {
    this.enabled = process.env.CMO_DEBUG === 'true' || process.env.NODE_ENV === 'development';
    this.logFile = path.join(__dirname, '../../logs/context-debug.log');
    this.detectionHistory = [];
    this.performanceMetrics = {
      detectionTimes: [],
      cacheHits: 0,
      cacheMisses: 0,
      contextSwitches: 0,
      ambiguousCases: 0
    };
    
    // Ensure logs directory exists
    if (this.enabled) {
      const logsDir = path.dirname(this.logFile);
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
    }
  }
  
  /**
   * Log context detection result with full details
   */
  logDetection(query, result, timing = null) {
    if (!this.enabled) return;
    
    const entry = {
      timestamp: new Date().toISOString(),
      query,
      result: {
        primaryContext: result.primaryContext,
        confidence: result.confidence,
        secondaryContexts: result.secondaryContexts,
        intent: result.intent,
        entities: result.entities,
        keywords: result.keywords,
        isMultiChannel: result.isMultiChannel
      },
      timing: timing ? `${timing.toFixed(2)}ms` : null,
      debugInfo: {
        queryLength: query.length,
        wordCount: query.split(/\s+/).length,
        hasQuestionMark: query.includes('?'),
        hasExclamation: query.includes('!'),
        language: this.detectLanguage(query)
      }
    };
    
    // Add to history
    this.detectionHistory.push(entry);
    if (this.detectionHistory.length > 1000) {
      this.detectionHistory.shift(); // Keep only last 1000 entries
    }
    
    // Log to console in dev mode
    if (process.env.CMO_DEBUG === 'true') {
      console.log('\n🔍 Context Detection Debug:');
      console.log(`Query: "${query}"`);
      console.log(`Primary: ${result.primaryContext} (${result.confidence.toFixed(2)})`);
      if (result.secondaryContexts.length > 0) {
        console.log(`Secondary: ${result.secondaryContexts.map(c => `${c.context}(${c.confidence.toFixed(2)})`).join(', ')}`);
      }
      console.log(`Intent: ${result.intent}`);
      if (result.entities.length > 0) {
        console.log(`Entities: ${result.entities.map(e => `${e.type}:${e.value}`).join(', ')}`);
      }
      if (timing) {
        console.log(`Time: ${timing.toFixed(2)}ms`);
      }
      console.log('---');
    }
    
    // Log to file
    this.writeToLog(entry);
    
    // Update metrics
    if (timing) {
      this.performanceMetrics.detectionTimes.push(timing);
    }
    if (result.confidence < 0.5) {
      this.performanceMetrics.ambiguousCases++;
    }
  }
  
  /**
   * Log context switch
   */
  logContextSwitch(fromContext, toContext, query) {
    if (!this.enabled) return;
    
    this.performanceMetrics.contextSwitches++;
    
    const entry = {
      timestamp: new Date().toISOString(),
      type: 'context_switch',
      from: fromContext,
      to: toContext,
      query,
      switchReason: this.detectSwitchReason(query, fromContext, toContext)
    };
    
    if (process.env.CMO_DEBUG === 'true') {
      console.log(`\n🔄 Context Switch: ${fromContext} → ${toContext}`);
      console.log(`Reason: ${entry.switchReason}`);
    }
    
    this.writeToLog(entry);
  }
  
  /**
   * Log cache hit/miss
   */
  logCacheAccess(query, hit) {
    if (!this.enabled) return;
    
    if (hit) {
      this.performanceMetrics.cacheHits++;
    } else {
      this.performanceMetrics.cacheMisses++;
    }
    
    if (process.env.CMO_DEBUG_VERBOSE === 'true') {
      console.log(`💾 Cache ${hit ? 'HIT' : 'MISS'}: "${query.substring(0, 50)}..."`);
    }
  }
  
  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    const times = this.performanceMetrics.detectionTimes;
    if (times.length === 0) {
      return {
        totalDetections: 0,
        avgTime: 0,
        medianTime: 0,
        p95Time: 0,
        cacheHitRate: 0,
        contextSwitchRate: 0,
        ambiguityRate: 0
      };
    }
    
    const sorted = [...times].sort((a, b) => a - b);
    const total = this.detectionHistory.length;
    
    return {
      totalDetections: total,
      avgTime: (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2),
      medianTime: sorted[Math.floor(sorted.length / 2)].toFixed(2),
      p95Time: sorted[Math.floor(sorted.length * 0.95)].toFixed(2),
      cacheHitRate: ((this.performanceMetrics.cacheHits / (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses)) * 100).toFixed(1),
      contextSwitchRate: ((this.performanceMetrics.contextSwitches / total) * 100).toFixed(1),
      ambiguityRate: ((this.performanceMetrics.ambiguousCases / total) * 100).toFixed(1)
    };
  }
  
  /**
   * Get recent detection history
   */
  getRecentHistory(limit = 10) {
    return this.detectionHistory.slice(-limit).reverse();
  }
  
  /**
   * Generate debug report
   */
  generateDebugReport() {
    const stats = this.getPerformanceStats();
    const history = this.getRecentHistory(20);
    
    const report = {
      timestamp: new Date().toISOString(),
      performanceStats: stats,
      contextDistribution: this.getContextDistribution(),
      intentDistribution: this.getIntentDistribution(),
      commonPatterns: this.identifyCommonPatterns(),
      recentHistory: history,
      recommendations: this.generateRecommendations(stats)
    };
    
    // Save report
    const reportPath = path.join(__dirname, '../../logs/context-debug-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    return report;
  }
  
  /**
   * Get distribution of detected contexts
   */
  getContextDistribution() {
    const distribution = {};
    
    this.detectionHistory.forEach(entry => {
      const context = entry.result.primaryContext;
      distribution[context] = (distribution[context] || 0) + 1;
    });
    
    // Convert to percentages
    const total = this.detectionHistory.length;
    Object.keys(distribution).forEach(key => {
      distribution[key] = {
        count: distribution[key],
        percentage: ((distribution[key] / total) * 100).toFixed(1)
      };
    });
    
    return distribution;
  }
  
  /**
   * Get distribution of detected intents
   */
  getIntentDistribution() {
    const distribution = {};
    
    this.detectionHistory.forEach(entry => {
      const intent = entry.result.intent;
      distribution[intent] = (distribution[intent] || 0) + 1;
    });
    
    return distribution;
  }
  
  /**
   * Identify common query patterns
   */
  identifyCommonPatterns() {
    const patterns = {
      questions: 0,
      commands: 0,
      statements: 0,
      shortQueries: 0,
      longQueries: 0,
      multiChannel: 0
    };
    
    this.detectionHistory.forEach(entry => {
      const query = entry.query;
      
      if (query.includes('?')) patterns.questions++;
      if (query.match(/^(create|make|build|setup|design)/i)) patterns.commands++;
      if (!query.includes('?') && !query.match(/^(create|make|build|setup|design)/i)) patterns.statements++;
      if (query.split(/\s+/).length <= 3) patterns.shortQueries++;
      if (query.split(/\s+/).length > 10) patterns.longQueries++;
      if (entry.result.isMultiChannel) patterns.multiChannel++;
    });
    
    return patterns;
  }
  
  /**
   * Generate recommendations based on stats
   */
  generateRecommendations(stats) {
    const recommendations = [];
    
    if (parseFloat(stats.avgTime) > 50) {
      recommendations.push({
        type: 'performance',
        message: 'Average detection time is high. Consider optimizing regex patterns.',
        priority: 'high'
      });
    }
    
    if (parseFloat(stats.cacheHitRate) < 30) {
      recommendations.push({
        type: 'cache',
        message: 'Low cache hit rate. Consider increasing cache size or TTL.',
        priority: 'medium'
      });
    }
    
    if (parseFloat(stats.ambiguityRate) > 20) {
      recommendations.push({
        type: 'accuracy',
        message: 'High ambiguity rate. Add more specific keywords or implement clarification prompts.',
        priority: 'high'
      });
    }
    
    if (parseFloat(stats.contextSwitchRate) > 30) {
      recommendations.push({
        type: 'ux',
        message: 'Frequent context switches. Consider implementing context persistence.',
        priority: 'medium'
      });
    }
    
    return recommendations;
  }
  
  /**
   * Detect language of query
   */
  detectLanguage(query) {
    // Simple language detection based on character sets
    if (/[\u0400-\u04FF]/.test(query)) return 'russian';
    if (/[\u4E00-\u9FFF]/.test(query)) return 'chinese';
    if (/[\u0600-\u06FF]/.test(query)) return 'arabic';
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(query)) return 'japanese';
    return 'english';
  }
  
  /**
   * Detect reason for context switch
   */
  detectSwitchReason(query, fromContext, toContext) {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('now') || lowerQuery.includes('next') || lowerQuery.includes('also')) {
      return 'explicit_transition';
    }
    
    if (lowerQuery.includes(toContext)) {
      return 'context_mentioned';
    }
    
    if (lowerQuery.includes('switch') || lowerQuery.includes('change')) {
      return 'explicit_switch';
    }
    
    return 'implicit_change';
  }
  
  /**
   * Write to log file
   */
  writeToLog(entry) {
    if (!this.enabled) return;
    
    try {
      const logLine = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.logFile, logLine);
    } catch (error) {
      console.error('Failed to write to debug log:', error);
    }
  }
  
  /**
   * Clear logs
   */
  clearLogs() {
    this.detectionHistory = [];
    this.performanceMetrics = {
      detectionTimes: [],
      cacheHits: 0,
      cacheMisses: 0,
      contextSwitches: 0,
      ambiguousCases: 0
    };
    
    if (fs.existsSync(this.logFile)) {
      fs.writeFileSync(this.logFile, '');
    }
  }
  
  /**
   * Export debug data
   */
  exportDebugData() {
    const exportData = {
      history: this.detectionHistory,
      metrics: this.performanceMetrics,
      stats: this.getPerformanceStats(),
      timestamp: new Date().toISOString()
    };
    
    const exportPath = path.join(__dirname, `../../logs/context-debug-export-${Date.now()}.json`);
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    
    return exportPath;
  }
}

// Export singleton instance
export const contextDebugger = new ContextDebugger();
export default ContextDebugger;