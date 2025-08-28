/**
 * CMO Context Detection Service
 * 
 * Intelligently detects marketing context and suggests appropriate sub-modes
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { contextDebugger } from './ContextDebugger.js';
import { contextOptimizer } from './ContextOptimizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
let patterns = {};
try {
  patterns = JSON.parse(readFileSync(join(__dirname, '../../knowledge/cmo/patterns.json'), 'utf8'));
  console.log('✅ Loaded CMO patterns successfully. Keys:', Object.keys(patterns));
} catch (error) {
  console.error('❌ Failed to load CMO patterns:', error.message);
  console.error('❌ Attempted path:', join(__dirname, '../../knowledge/cmo/patterns.json'));
}

export class ContextDetector {
  constructor() {
    this.contextHistory = [];
    this.maxHistorySize = 10;
    this.confidenceThresholds = {
      high: 0.8,
      medium: 0.5,
      low: 0.3
    };
    
    console.log('🎯 CMO Context Detector initialized');
  }

  /**
   * Tokenize message into words
   */
  tokenize(text) {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  /**
   * Detect marketing context from message
   */
  async detectMarketingContext(message) {
    const startTime = process.hrtime.bigint();
    
    // Check cache first
    const cached = contextOptimizer.getCachedResult(message);
    if (cached) {
      return cached;
    }
    
    // Try quick detection for obvious queries
    const quickResult = contextOptimizer.quickDetect(message);
    if (quickResult) {
      const results = {
        primaryContext: quickResult.context,
        confidence: quickResult.confidence,
        subContexts: [],
        secondaryContexts: [],
        entities: [],
        intent: 'general',
        suggestedTools: [],
        keywords: [],
        isMultiChannel: false,
        method: quickResult.method
      };
      
      // Cache and return
      contextOptimizer.cacheResult(message, results);
      contextDebugger.logDetection(message, results, 0.1); // Quick detection is fast
      return results;
    }
    
    const tokens = this.tokenize(message);
    const results = {
      primaryContext: null,
      confidence: 0,
      subContexts: [],
      secondaryContexts: [], // Add for compatibility
      entities: [],
      intent: null,
      suggestedTools: [],
      keywords: [], // Add detected keywords
      isMultiChannel: false // Add multi-channel flag
    };

    // Analyze message against each sub-mode pattern
    const contextScores = this.analyzeContextScores(message, tokens);
    
    // Sort by confidence score
    const sortedContexts = Object.entries(contextScores)
      .sort(([, a], [, b]) => b - a)
      .filter(([, score]) => score > 0);

    if (sortedContexts.length > 0) {
      const [primaryContext, confidence] = sortedContexts[0];
      results.primaryContext = primaryContext;
      results.confidence = confidence;
      
      // Add other relevant contexts
      results.subContexts = sortedContexts.slice(1)
        .filter(([, score]) => score > this.confidenceThresholds.low)
        .map(([context, score]) => ({ context, score }));
    }

    // Detect intent
    results.intent = await this.detectIntent(message, tokens);
    
    // Extract entities
    results.entities = await this.extractEntities(message, tokens);
    
    // Suggest tools based on context
    if (results.primaryContext) {
      results.suggestedTools = await this.suggestTools(results.primaryContext, results.intent);
    }

    // Update context history
    this.updateContextHistory(results);
    
    // Add secondary contexts for compatibility
    results.secondaryContexts = results.subContexts.map(sc => ({
      context: sc.context,
      confidence: sc.score
    }));
    
    // Detect multi-channel
    if (results.subContexts.length > 0 && results.confidence < 0.8) {
      results.isMultiChannel = true;
    }
    
    // Extract keywords that were matched
    const detectedKeywords = [];
    if (results.primaryContext && patterns[results.primaryContext]) {
      patterns[results.primaryContext].keywords.forEach(keyword => {
        if (message.toLowerCase().includes(keyword.toLowerCase())) {
          detectedKeywords.push(keyword);
        }
      });
    }
    results.keywords = detectedKeywords;
    
    // Debug logging
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to ms
    contextDebugger.logDetection(message, results, duration);
    
    // Check for ambiguous queries
    if (results.confidence < 0.5) {
      const ambiguousResult = contextOptimizer.processAmbiguousQuery(message, tokens);
      if (ambiguousResult) {
        results.isAmbiguous = true;
        results.suggestedClarification = ambiguousResult.suggestedClarification;
        results.possibleContexts = ambiguousResult.contexts;
      }
    }
    
    // Track context switches
    if (this.contextHistory.length > 1) {
      const previousContext = this.contextHistory[this.contextHistory.length - 2].primaryContext;
      if (previousContext && previousContext !== results.primaryContext) {
        contextDebugger.logContextSwitch(previousContext, results.primaryContext, message);
      }
    }
    
    // Cache the result
    contextOptimizer.cacheResult(message, results);

    return results;
  }

  /**
   * Analyze context scores for each sub-mode
   */
  analyzeContextScores(message, tokens) {
    const scores = {
      seo: 0,
      email: 0,
      social: 0,
      directMail: 0,
      ads: 0
    };

    // Direct keyword matching
    Object.entries(patterns).forEach(([subMode, data]) => {
      let score = 0;
      
      // Debug: Check if data exists
      if (!data || !data.keywords) {
        console.log(`⚠️ Missing data for subMode: ${subMode}`);
        return;
      }
      
      // Check keywords (higher weight)
      data.keywords.forEach(keyword => {
        if (message.toLowerCase().includes(keyword.toLowerCase())) {
          score += 0.3;
          if (subMode === 'directMail') {
            console.log(`🎯 DirectMail keyword match: "${keyword}" in message`);
          }
        }
      });
      
      // Check phrases (highest weight)
      data.phrases.forEach(phrase => {
        if (message.toLowerCase().includes(phrase.toLowerCase())) {
          score += 0.5;
          if (subMode === 'directMail') {
            console.log(`🎯 DirectMail phrase match: "${phrase}" in message`);
          }
        }
      });
      
      // Check entities (medium weight)
      data.entities.forEach(entity => {
        if (tokens.includes(entity.toLowerCase())) {
          score += 0.2;
        }
      });
      
      // Check action verbs
      data.actions?.forEach(action => {
        if (tokens.includes(action.toLowerCase())) {
          score += 0.15;
        }
      });
      
      scores[subMode] = Math.min(score, 1.0); // Cap at 1.0
    });

    console.log('📊 Context scores for message:', message);
    console.log('📊 Scores:', scores);
    console.log('📊 Debug - patterns object exists?', !!patterns);
    console.log('📊 Debug - directMail patterns:', patterns.directMail ? 
      { keywords: patterns.directMail.keywords.slice(0, 5), phrases: patterns.directMail.phrases.slice(0, 5) } : 
      'NOT FOUND');

    return scores;
  }

  /**
   * Detect user's intent from message
   */
  async detectIntent(message, tokens) {
    const intents = {
      create: ['create', 'make', 'build', 'design', 'write', 'generate', 'develop'],
      analyze: ['analyze', 'review', 'check', 'audit', 'examine', 'evaluate', 'assess'],
      optimize: ['optimize', 'improve', 'enhance', 'boost', 'increase', 'maximize'],
      track: ['track', 'measure', 'monitor', 'watch', 'follow', 'report'],
      learn: ['what', 'how', 'why', 'explain', 'teach', 'understand', 'learn'],
      fix: ['fix', 'solve', 'repair', 'troubleshoot', 'debug', 'resolve'],
      plan: ['plan', 'strategy', 'schedule', 'organize', 'prepare', 'outline']
    };

    for (const [intent, keywords] of Object.entries(intents)) {
      if (keywords.some(keyword => tokens.includes(keyword))) {
        return intent;
      }
    }

    // Check for question patterns
    if (message.includes('?') || tokens[0] === 'what' || tokens[0] === 'how') {
      return 'learn';
    }

    return 'general';
  }

  /**
   * Extract marketing entities from message
   */
  async extractEntities(message, tokens) {
    const entities = [];

    // Extract metrics
    const metricPatterns = [
      { pattern: /(\d+(?:\.\d+)?%)/g, type: 'percentage' },
      { pattern: /\$(\d+(?:,\d+)*(?:\.\d+)?)/g, type: 'money' },
      { pattern: /(\d+(?:,\d+)*)\s*(visitors?|users?|clicks?|impressions?|conversions?)/gi, type: 'metric' }
    ];

    metricPatterns.forEach(({ pattern, type }) => {
      const matches = message.match(pattern);
      if (matches) {
        matches.forEach(match => {
          entities.push({ value: match, type });
        });
      }
    });

    // Extract platforms
    const platforms = ['google', 'facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube'];
    platforms.forEach(platform => {
      if (tokens.includes(platform)) {
        entities.push({ value: platform, type: 'platform' });
      }
    });

    // Extract time periods
    const timePatterns = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'last week', 'this month'];
    timePatterns.forEach(period => {
      if (message.toLowerCase().includes(period)) {
        entities.push({ value: period, type: 'time_period' });
      }
    });

    // Extract marketing channels
    const channels = ['email', 'seo', 'ppc', 'social media', 'content', 'affiliate', 'display'];
    channels.forEach(channel => {
      if (message.toLowerCase().includes(channel)) {
        entities.push({ value: channel, type: 'channel' });
      }
    });

    return entities;
  }

  /**
   * Suggest relevant tools based on context and intent
   */
  async suggestTools(context, intent) {
    const toolSuggestions = {
      seo: {
        create: ['Title Tag Generator', 'Meta Description Writer', 'Schema Markup Builder'],
        analyze: ['SEO Analyzer', 'Keyword Research Tool', 'Competitor Analysis'],
        optimize: ['Content Optimizer', 'Page Speed Analyzer', 'Mobile Optimization Checker'],
        track: ['Rank Tracker', 'Traffic Monitor', 'Conversion Analytics']
      },
      email: {
        create: ['Email Template Designer', 'Subject Line Generator', 'A/B Test Builder'],
        analyze: ['Campaign Performance Analyzer', 'List Health Checker', 'Deliverability Tester'],
        optimize: ['Send Time Optimizer', 'Personalization Engine', 'Segmentation Tool'],
        track: ['Open Rate Tracker', 'Click-Through Monitor', 'ROI Calculator']
      },
      social: {
        create: ['Post Generator', 'Hashtag Research', 'Content Calendar'],
        analyze: ['Engagement Analyzer', 'Audience Insights', 'Competitor Tracker'],
        optimize: ['Best Time to Post', 'Content Performance Optimizer', 'Ad Optimizer'],
        track: ['Social Metrics Dashboard', 'Mention Monitor', 'Growth Tracker']
      },
      directMail: {
        create: ['Postcard Designer', 'Letter Template', 'QR Code Generator'],
        analyze: ['Response Rate Analyzer', 'ROI Calculator', 'List Quality Checker'],
        optimize: ['Target Audience Refiner', 'Offer Optimizer', 'Design A/B Tester'],
        track: ['Campaign Tracker', 'Response Monitor', 'Cost Analyzer']
      },
      ads: {
        create: ['Ad Copy Generator', 'Landing Page Builder', 'Audience Creator'],
        analyze: ['Campaign Analyzer', 'Cost Per Acquisition Calculator', 'Quality Score Checker'],
        optimize: ['Bid Optimizer', 'Ad Performance Enhancer', 'Budget Allocator'],
        track: ['Conversion Tracker', 'ROI Dashboard', 'Attribution Analyzer']
      }
    };

    const defaultTools = ['Marketing Calendar', 'Budget Planner', 'Report Generator'];
    
    const tools = toolSuggestions[context]?.[intent] || 
                  toolSuggestions[context]?.general || 
                  defaultTools;

    return tools;
  }

  /**
   * Get confidence level from score
   */
  getConfidenceLevel(score) {
    if (score >= this.confidenceThresholds.high) return 'high';
    if (score >= this.confidenceThresholds.medium) return 'medium';
    if (score >= this.confidenceThresholds.low) return 'low';
    return 'none';
  }

  /**
   * Determine if context switch should happen
   */
  shouldSwitchContext(currentContext, detectedContext, confidence) {
    // Always switch on high confidence if different context
    if (confidence >= this.confidenceThresholds.high && currentContext !== detectedContext) {
      return { switch: true, type: 'auto' };
    }
    
    // Suggest switch on medium confidence
    if (confidence >= this.confidenceThresholds.medium && currentContext !== detectedContext) {
      return { switch: true, type: 'suggest' };
    }
    
    // Check context history for patterns
    const recentContexts = this.contextHistory.slice(-3);
    const contextCounts = recentContexts.reduce((acc, ctx) => {
      acc[ctx.primaryContext] = (acc[ctx.primaryContext] || 0) + 1;
      return acc;
    }, {});
    
    // If detected context appears frequently in recent history, suggest switch
    if (contextCounts[detectedContext] >= 2 && currentContext !== detectedContext) {
      return { switch: true, type: 'suggest' };
    }
    
    return { switch: false };
  }

  /**
   * Update context history
   */
  updateContextHistory(context) {
    this.contextHistory.push({
      ...context,
      timestamp: new Date()
    });
    
    // Maintain history size
    if (this.contextHistory.length > this.maxHistorySize) {
      this.contextHistory.shift();
    }
  }

  /**
   * Get context insights from history
   */
  getContextInsights() {
    if (this.contextHistory.length === 0) {
      return null;
    }

    const insights = {
      dominantContext: null,
      contextSwitches: 0,
      averageConfidence: 0,
      recentTrend: null
    };

    // Calculate dominant context
    const contextCounts = {};
    let previousContext = null;
    let totalConfidence = 0;

    this.contextHistory.forEach(ctx => {
      contextCounts[ctx.primaryContext] = (contextCounts[ctx.primaryContext] || 0) + 1;
      totalConfidence += ctx.confidence;
      
      if (previousContext && previousContext !== ctx.primaryContext) {
        insights.contextSwitches++;
      }
      previousContext = ctx.primaryContext;
    });

    // Find dominant context
    const sortedContexts = Object.entries(contextCounts).sort(([, a], [, b]) => b - a);
    if (sortedContexts.length > 0) {
      insights.dominantContext = sortedContexts[0][0];
    }

    // Calculate average confidence
    insights.averageConfidence = totalConfidence / this.contextHistory.length;

    // Determine recent trend (last 3 contexts)
    const recentContexts = this.contextHistory.slice(-3).map(ctx => ctx.primaryContext);
    const uniqueRecent = [...new Set(recentContexts)];
    if (uniqueRecent.length === 1) {
      insights.recentTrend = uniqueRecent[0];
    }

    return insights;
  }

  /**
   * Clear context history
   */
  clearHistory() {
    this.contextHistory = [];
  }
}

// Export singleton instance
export const contextDetector = new ContextDetector();