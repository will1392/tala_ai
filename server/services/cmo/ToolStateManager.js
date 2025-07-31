// CMO Tool State Manager
// Manages tool usage, preferences, and state synchronization

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ToolStateManager {
  constructor() {
    this.states = new Map();
    this.usage = new Map();
    this.preferences = new Map();
    this.stateFile = path.join(__dirname, '../../data/cmo-tool-states.json');
    this.usageFile = path.join(__dirname, '../../data/cmo-tool-usage.json');
    this.loadPersistedData();
  }

  // Load persisted state and usage data
  async loadPersistedData() {
    try {
      // Load states
      try {
        const stateData = await fs.readFile(this.stateFile, 'utf8');
        const states = JSON.parse(stateData);
        Object.entries(states).forEach(([key, value]) => {
          this.states.set(key, value);
        });
      } catch (err) {
        console.log('No existing tool states found');
      }

      // Load usage data
      try {
        const usageData = await fs.readFile(this.usageFile, 'utf8');
        const usage = JSON.parse(usageData);
        Object.entries(usage).forEach(([key, value]) => {
          this.usage.set(key, value);
        });
      } catch (err) {
        console.log('No existing usage data found');
      }
    } catch (error) {
      console.error('Error loading tool data:', error);
    }
  }

  // Save state to disk
  async persistData() {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.stateFile);
      await fs.mkdir(dir, { recursive: true });

      // Save states
      const states = Object.fromEntries(this.states);
      await fs.writeFile(this.stateFile, JSON.stringify(states, null, 2));

      // Save usage
      const usage = Object.fromEntries(this.usage);
      await fs.writeFile(this.usageFile, JSON.stringify(usage, null, 2));
    } catch (error) {
      console.error('Error persisting tool data:', error);
    }
  }

  // Get tool state
  getToolState(userId, toolId) {
    const key = `${userId}:${toolId}`;
    return this.states.get(key) || null;
  }

  // Set tool state
  async setToolState(userId, toolId, state) {
    const key = `${userId}:${toolId}`;
    const timestamp = new Date().toISOString();
    
    const toolState = {
      ...state,
      toolId,
      userId,
      timestamp,
      version: (this.states.get(key)?.version || 0) + 1
    };
    
    this.states.set(key, toolState);
    await this.persistData();
    
    return toolState;
  }

  // Track tool usage
  async trackUsage(userId, toolId, action, data = {}) {
    const key = `${userId}:${toolId}`;
    const timestamp = new Date().toISOString();
    
    // Get or create usage record
    let usageRecord = this.usage.get(key) || {
      userId,
      toolId,
      firstUsed: timestamp,
      lastUsed: timestamp,
      totalUses: 0,
      actions: {}
    };
    
    // Update usage stats
    usageRecord.lastUsed = timestamp;
    usageRecord.totalUses++;
    
    // Track specific actions
    if (!usageRecord.actions[action]) {
      usageRecord.actions[action] = {
        count: 0,
        lastUsed: timestamp,
        history: []
      };
    }
    
    usageRecord.actions[action].count++;
    usageRecord.actions[action].lastUsed = timestamp;
    
    // Add to history (keep last 10)
    usageRecord.actions[action].history.unshift({
      timestamp,
      data
    });
    
    if (usageRecord.actions[action].history.length > 10) {
      usageRecord.actions[action].history = 
        usageRecord.actions[action].history.slice(0, 10);
    }
    
    this.usage.set(key, usageRecord);
    await this.persistData();
    
    return usageRecord;
  }

  // Get user preferences
  getUserPreferences(userId) {
    return this.preferences.get(userId) || {
      pinnedTools: [],
      recentTools: [],
      favoriteTools: [],
      toolbarPosition: 'right',
      toolbarExpanded: true,
      defaultContext: null
    };
  }

  // Update user preferences
  async updateUserPreferences(userId, preferences) {
    const current = this.getUserPreferences(userId);
    const updated = {
      ...current,
      ...preferences,
      lastUpdated: new Date().toISOString()
    };
    
    this.preferences.set(userId, updated);
    await this.persistData();
    
    return updated;
  }

  // Get tool recommendations
  getToolRecommendations(userId, context) {
    const userUsage = new Map();
    
    // Collect user's tool usage
    for (const [key, usage] of this.usage.entries()) {
      if (key.startsWith(`${userId}:`)) {
        const toolId = key.split(':')[1];
        userUsage.set(toolId, usage);
      }
    }
    
    // Sort by usage frequency and recency
    const recommendations = Array.from(userUsage.entries())
      .map(([toolId, usage]) => ({
        toolId,
        score: this.calculateRecommendationScore(usage),
        lastUsed: usage.lastUsed,
        totalUses: usage.totalUses
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    
    return recommendations;
  }

  // Calculate recommendation score
  calculateRecommendationScore(usage) {
    const now = Date.now();
    const lastUsed = new Date(usage.lastUsed).getTime();
    const daysSinceUse = (now - lastUsed) / (1000 * 60 * 60 * 24);
    
    // Recency factor (decays over time)
    const recencyScore = Math.max(0, 100 - daysSinceUse * 2);
    
    // Frequency factor (logarithmic)
    const frequencyScore = Math.min(100, Math.log10(usage.totalUses + 1) * 30);
    
    // Combined score
    return (recencyScore * 0.6) + (frequencyScore * 0.4);
  }

  // Get usage analytics
  getUsageAnalytics(userId = null) {
    const analytics = {
      totalUsers: new Set(),
      totalUsage: 0,
      toolPopularity: {},
      actionBreakdown: {},
      timePatterns: {
        hourly: new Array(24).fill(0),
        daily: new Array(7).fill(0)
      }
    };
    
    for (const [key, usage] of this.usage.entries()) {
      const [uid, toolId] = key.split(':');
      
      // Filter by user if specified
      if (userId && uid !== userId) continue;
      
      analytics.totalUsers.add(uid);
      analytics.totalUsage += usage.totalUses;
      
      // Tool popularity
      if (!analytics.toolPopularity[toolId]) {
        analytics.toolPopularity[toolId] = {
          users: 0,
          totalUses: 0
        };
      }
      analytics.toolPopularity[toolId].users++;
      analytics.toolPopularity[toolId].totalUses += usage.totalUses;
      
      // Action breakdown
      Object.entries(usage.actions).forEach(([action, data]) => {
        if (!analytics.actionBreakdown[action]) {
          analytics.actionBreakdown[action] = 0;
        }
        analytics.actionBreakdown[action] += data.count;
      });
      
      // Time patterns
      const lastUsedDate = new Date(usage.lastUsed);
      analytics.timePatterns.hourly[lastUsedDate.getHours()]++;
      analytics.timePatterns.daily[lastUsedDate.getDay()]++;
    }
    
    analytics.totalUsers = analytics.totalUsers.size;
    
    return analytics;
  }

  // Clean old data
  async cleanOldData(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffTime = cutoffDate.getTime();
    
    let cleaned = 0;
    
    // Clean old states
    for (const [key, state] of this.states.entries()) {
      const stateTime = new Date(state.timestamp).getTime();
      if (stateTime < cutoffTime) {
        this.states.delete(key);
        cleaned++;
      }
    }
    
    // Clean old usage data
    for (const [key, usage] of this.usage.entries()) {
      const lastUsedTime = new Date(usage.lastUsed).getTime();
      if (lastUsedTime < cutoffTime) {
        this.usage.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      await this.persistData();
      console.log(`Cleaned ${cleaned} old tool data entries`);
    }
    
    return cleaned;
  }

  // Export user data
  async exportUserData(userId) {
    const userData = {
      states: {},
      usage: {},
      preferences: this.getUserPreferences(userId)
    };
    
    // Collect user's states
    for (const [key, state] of this.states.entries()) {
      if (key.startsWith(`${userId}:`)) {
        userData.states[key] = state;
      }
    }
    
    // Collect user's usage
    for (const [key, usage] of this.usage.entries()) {
      if (key.startsWith(`${userId}:`)) {
        userData.usage[key] = usage;
      }
    }
    
    return userData;
  }
}

// Create singleton instance
let instance = null;

function getToolStateManager() {
  if (!instance) {
    instance = new ToolStateManager();
  }
  return instance;
}

export { ToolStateManager, getToolStateManager };