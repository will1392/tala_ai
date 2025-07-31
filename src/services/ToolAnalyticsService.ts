/**
 * Tool Analytics Service
 * Tracks tool usage, measures effectiveness, and provides insights
 */

interface ToolUsageEvent {
  toolId: string;
  userId: string;
  eventType: 'open' | 'close' | 'action' | 'complete' | 'error';
  timestamp: Date;
  duration?: number;
  metadata?: Record<string, any>;
}

interface ToolMetrics {
  toolId: string;
  totalUses: number;
  uniqueUsers: number;
  avgDuration: number;
  completionRate: number;
  errorRate: number;
  satisfactionScore: number;
  lastUsed: Date;
  peakUsageTime: string;
  commonActions: ActionMetric[];
}

interface ActionMetric {
  action: string;
  count: number;
  avgTime: number;
  successRate: number;
}

interface UserToolMetrics {
  userId: string;
  toolId: string;
  usageCount: number;
  totalDuration: number;
  lastUsed: Date;
  proficiencyLevel: number; // 0-100
  preferredFeatures: string[];
  customSettings: Record<string, any>;
}

interface ToolEffectiveness {
  toolId: string;
  goalCompletionRate: number;
  timeToGoal: number;
  userRetention: number;
  featureAdoption: Record<string, number>;
  comparativePerformance: number; // vs similar tools
}

interface UsagePattern {
  pattern: string;
  frequency: number;
  userSegment: string[];
  timeframe: string;
  associatedTools: string[];
}

interface AnalyticsReport {
  period: { start: Date; end: Date };
  summary: {
    totalEvents: number;
    activeTools: number;
    activeUsers: number;
    avgSessionDuration: number;
  };
  topTools: ToolMetrics[];
  userSegments: UserSegment[];
  patterns: UsagePattern[];
  recommendations: ToolRecommendation[];
}

interface UserSegment {
  name: string;
  size: number;
  characteristics: string[];
  preferredTools: string[];
  avgProficiency: number;
}

interface ToolRecommendation {
  type: 'feature' | 'tool' | 'workflow';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
}

class ToolAnalyticsService {
  private events: ToolUsageEvent[] = [];
  private toolMetrics: Map<string, ToolMetrics> = new Map();
  private userMetrics: Map<string, Map<string, UserToolMetrics>> = new Map();
  private patterns: Map<string, UsagePattern> = new Map();
  private sessionData: Map<string, any> = new Map();
  
  constructor() {
    this.initializeAnalytics();
    this.startPeriodicAnalysis();
  }

  /**
   * Initialize analytics system
   */
  private initializeAnalytics() {
    // Load historical data if available
    this.loadHistoricalData();
    
    // Set up real-time processing
    this.setupRealTimeProcessing();
  }

  /**
   * Track a tool usage event
   */
  trackEvent(event: Omit<ToolUsageEvent, 'timestamp'>): void {
    const fullEvent: ToolUsageEvent = {
      ...event,
      timestamp: new Date()
    };

    this.events.push(fullEvent);
    this.processEvent(fullEvent);
    
    // Update real-time metrics
    this.updateMetrics(fullEvent);
    
    // Detect patterns
    this.detectPatterns(fullEvent);
  }

  /**
   * Track tool action
   */
  trackAction(toolId: string, userId: string, action: string, metadata?: any): void {
    this.trackEvent({
      toolId,
      userId,
      eventType: 'action',
      metadata: { action, ...metadata }
    });
  }

  /**
   * Track tool completion
   */
  trackCompletion(toolId: string, userId: string, duration: number, success: boolean): void {
    this.trackEvent({
      toolId,
      userId,
      eventType: 'complete',
      duration,
      metadata: { success }
    });

    // Update user proficiency
    this.updateUserProficiency(userId, toolId, success);
  }

  /**
   * Get tool metrics
   */
  getToolMetrics(toolId: string): ToolMetrics | null {
    return this.toolMetrics.get(toolId) || null;
  }

  /**
   * Get user tool metrics
   */
  getUserToolMetrics(userId: string, toolId?: string): UserToolMetrics[] {
    const userMap = this.userMetrics.get(userId);
    if (!userMap) return [];

    if (toolId) {
      const metric = userMap.get(toolId);
      return metric ? [metric] : [];
    }

    return Array.from(userMap.values());
  }

  /**
   * Get tool effectiveness analysis
   */
  async getToolEffectiveness(toolId: string): Promise<ToolEffectiveness> {
    const metrics = this.toolMetrics.get(toolId);
    if (!metrics) {
      return {
        toolId,
        goalCompletionRate: 0,
        timeToGoal: 0,
        userRetention: 0,
        featureAdoption: {},
        comparativePerformance: 0
      };
    }

    // Calculate effectiveness metrics
    const completionEvents = this.events.filter(e => 
      e.toolId === toolId && e.eventType === 'complete'
    );

    const successfulCompletions = completionEvents.filter(e => 
      e.metadata?.success === true
    ).length;

    const goalCompletionRate = completionEvents.length > 0 
      ? successfulCompletions / completionEvents.length 
      : 0;

    // Calculate average time to goal
    const timeToGoal = completionEvents
      .filter(e => e.duration)
      .reduce((sum, e) => sum + (e.duration || 0), 0) / completionEvents.length || 0;

    // Calculate user retention (users who used tool more than once)
    const toolUsers = new Set(this.events
      .filter(e => e.toolId === toolId)
      .map(e => e.userId)
    );
    
    const returnUsers = Array.from(toolUsers).filter(userId => {
      const userEvents = this.events.filter(e => 
        e.toolId === toolId && e.userId === userId
      );
      return userEvents.length > 1;
    }).length;

    const userRetention = toolUsers.size > 0 
      ? returnUsers / toolUsers.size 
      : 0;

    // Calculate feature adoption
    const featureAdoption = this.calculateFeatureAdoption(toolId);

    // Compare with similar tools
    const comparativePerformance = this.calculateComparativePerformance(toolId);

    return {
      toolId,
      goalCompletionRate,
      timeToGoal,
      userRetention,
      featureAdoption,
      comparativePerformance
    };
  }

  /**
   * Get usage patterns
   */
  getUsagePatterns(filters?: {
    timeframe?: string;
    userSegment?: string;
    minFrequency?: number;
  }): UsagePattern[] {
    let patterns = Array.from(this.patterns.values());

    if (filters) {
      if (filters.timeframe) {
        patterns = patterns.filter(p => p.timeframe === filters.timeframe);
      }
      if (filters.userSegment) {
        patterns = patterns.filter(p => p.userSegment.includes(filters.userSegment));
      }
      if (filters.minFrequency) {
        patterns = patterns.filter(p => p.frequency >= filters.minFrequency);
      }
    }

    return patterns.sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Generate analytics report
   */
  async generateReport(startDate: Date, endDate: Date): Promise<AnalyticsReport> {
    const periodEvents = this.events.filter(e => 
      e.timestamp >= startDate && e.timestamp <= endDate
    );

    // Calculate summary metrics
    const uniqueTools = new Set(periodEvents.map(e => e.toolId));
    const uniqueUsers = new Set(periodEvents.map(e => e.userId));
    
    const sessions = this.calculateSessions(periodEvents);
    const avgSessionDuration = sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length || 0;

    // Get top tools
    const topTools = this.getTopTools(periodEvents, 10);

    // Analyze user segments
    const userSegments = this.analyzeUserSegments(periodEvents);

    // Get patterns for period
    const patterns = this.getUsagePatterns({ timeframe: 'period' });

    // Generate recommendations
    const recommendations = this.generateRecommendations({
      events: periodEvents,
      topTools,
      userSegments,
      patterns
    });

    return {
      period: { start: startDate, end: endDate },
      summary: {
        totalEvents: periodEvents.length,
        activeTools: uniqueTools.size,
        activeUsers: uniqueUsers.size,
        avgSessionDuration
      },
      topTools,
      userSegments,
      patterns,
      recommendations
    };
  }

  /**
   * Get personalized insights for a user
   */
  getUserInsights(userId: string): {
    proficiencyGrowth: number;
    favoriteTools: string[];
    recommendedTools: string[];
    usagePatterns: string[];
    achievements: Achievement[];
  } {
    const userTools = this.getUserToolMetrics(userId);
    
    // Calculate proficiency growth
    const proficiencyGrowth = this.calculateProficiencyGrowth(userId);
    
    // Get favorite tools (most used)
    const favoriteTools = userTools
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5)
      .map(m => m.toolId);
    
    // Get personalized recommendations
    const recommendedTools = this.getPersonalizedRecommendations(userId);
    
    // Identify usage patterns
    const usagePatterns = this.getUserPatterns(userId);
    
    // Check achievements
    const achievements = this.checkAchievements(userId);

    return {
      proficiencyGrowth,
      favoriteTools,
      recommendedTools,
      usagePatterns,
      achievements
    };
  }

  /**
   * Private helper methods
   */
  private processEvent(event: ToolUsageEvent): void {
    // Handle session tracking
    if (event.eventType === 'open') {
      this.sessionData.set(`${event.userId}-${event.toolId}`, {
        startTime: event.timestamp,
        actions: []
      });
    } else if (event.eventType === 'close' || event.eventType === 'complete') {
      const session = this.sessionData.get(`${event.userId}-${event.toolId}`);
      if (session) {
        const duration = event.timestamp.getTime() - session.startTime.getTime();
        this.trackEvent({
          ...event,
          duration: duration / 1000 // Convert to seconds
        });
        this.sessionData.delete(`${event.userId}-${event.toolId}`);
      }
    }
  }

  private updateMetrics(event: ToolUsageEvent): void {
    // Update tool metrics
    let toolMetric = this.toolMetrics.get(event.toolId);
    if (!toolMetric) {
      toolMetric = {
        toolId: event.toolId,
        totalUses: 0,
        uniqueUsers: 0,
        avgDuration: 0,
        completionRate: 0,
        errorRate: 0,
        satisfactionScore: 0,
        lastUsed: event.timestamp,
        peakUsageTime: '',
        commonActions: []
      };
      this.toolMetrics.set(event.toolId, toolMetric);
    }

    if (event.eventType === 'open') {
      toolMetric.totalUses++;
    }
    toolMetric.lastUsed = event.timestamp;

    // Update user metrics
    let userMap = this.userMetrics.get(event.userId);
    if (!userMap) {
      userMap = new Map();
      this.userMetrics.set(event.userId, userMap);
    }

    let userToolMetric = userMap.get(event.toolId);
    if (!userToolMetric) {
      userToolMetric = {
        userId: event.userId,
        toolId: event.toolId,
        usageCount: 0,
        totalDuration: 0,
        lastUsed: event.timestamp,
        proficiencyLevel: 30, // Start at 30%
        preferredFeatures: [],
        customSettings: {}
      };
      userMap.set(event.toolId, userToolMetric);
    }

    if (event.eventType === 'open') {
      userToolMetric.usageCount++;
    }
    if (event.duration) {
      userToolMetric.totalDuration += event.duration;
    }
    userToolMetric.lastUsed = event.timestamp;
  }

  private detectPatterns(event: ToolUsageEvent): void {
    // Simple pattern detection - would be more sophisticated in production
    const hour = event.timestamp.getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    
    const patternKey = `${event.toolId}-${timeOfDay}`;
    let pattern = this.patterns.get(patternKey);
    
    if (!pattern) {
      pattern = {
        pattern: `${event.toolId} usage in ${timeOfDay}`,
        frequency: 0,
        userSegment: [],
        timeframe: timeOfDay,
        associatedTools: []
      };
      this.patterns.set(patternKey, pattern);
    }
    
    pattern.frequency++;
    if (!pattern.userSegment.includes(event.userId)) {
      pattern.userSegment.push(event.userId);
    }
  }

  private updateUserProficiency(userId: string, toolId: string, success: boolean): void {
    const userMap = this.userMetrics.get(userId);
    if (!userMap) return;

    const metric = userMap.get(toolId);
    if (!metric) return;

    // Simple proficiency calculation
    const delta = success ? 2 : -1;
    metric.proficiencyLevel = Math.max(0, Math.min(100, metric.proficiencyLevel + delta));
  }

  private calculateFeatureAdoption(toolId: string): Record<string, number> {
    const toolEvents = this.events.filter(e => 
      e.toolId === toolId && e.eventType === 'action'
    );

    const featureCounts: Record<string, number> = {};
    const totalUsers = new Set(toolEvents.map(e => e.userId)).size;

    toolEvents.forEach(event => {
      const action = event.metadata?.action;
      if (action) {
        featureCounts[action] = (featureCounts[action] || 0) + 1;
      }
    });

    // Convert to adoption rate
    const adoption: Record<string, number> = {};
    Object.entries(featureCounts).forEach(([feature, count]) => {
      adoption[feature] = totalUsers > 0 ? count / totalUsers : 0;
    });

    return adoption;
  }

  private calculateComparativePerformance(toolId: string): number {
    // Compare with tools in same category
    // This is simplified - would use more sophisticated comparison in production
    const toolMetric = this.toolMetrics.get(toolId);
    if (!toolMetric) return 0;

    const avgCompletionRate = 0.7; // Baseline
    return toolMetric.completionRate / avgCompletionRate;
  }

  private calculateSessions(events: ToolUsageEvent[]): Array<{ duration: number }> {
    const sessions: Array<{ duration: number }> = [];
    const openEvents = events.filter(e => e.eventType === 'open');
    
    openEvents.forEach(openEvent => {
      const closeEvent = events.find(e => 
        e.userId === openEvent.userId &&
        e.toolId === openEvent.toolId &&
        (e.eventType === 'close' || e.eventType === 'complete') &&
        e.timestamp > openEvent.timestamp
      );
      
      if (closeEvent) {
        const duration = (closeEvent.timestamp.getTime() - openEvent.timestamp.getTime()) / 1000;
        sessions.push({ duration });
      }
    });
    
    return sessions;
  }

  private getTopTools(events: ToolUsageEvent[], limit: number): ToolMetrics[] {
    const toolCounts = new Map<string, number>();
    
    events
      .filter(e => e.eventType === 'open')
      .forEach(e => {
        toolCounts.set(e.toolId, (toolCounts.get(e.toolId) || 0) + 1);
      });
    
    const topToolIds = Array.from(toolCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([toolId]) => toolId);
    
    return topToolIds
      .map(id => this.toolMetrics.get(id))
      .filter((m): m is ToolMetrics => m !== undefined);
  }

  private analyzeUserSegments(events: ToolUsageEvent[]): UserSegment[] {
    // Simplified segmentation - would be more sophisticated in production
    const beginners: Set<string> = new Set();
    const intermediate: Set<string> = new Set();
    const advanced: Set<string> = new Set();
    
    this.userMetrics.forEach((toolMap, userId) => {
      const avgProficiency = Array.from(toolMap.values())
        .reduce((sum, m) => sum + m.proficiencyLevel, 0) / toolMap.size;
      
      if (avgProficiency < 40) beginners.add(userId);
      else if (avgProficiency < 70) intermediate.add(userId);
      else advanced.add(userId);
    });
    
    return [
      {
        name: 'Beginners',
        size: beginners.size,
        characteristics: ['Low tool proficiency', 'Need guidance', 'Simple workflows'],
        preferredTools: ['title-tag-tester', 'hashtag-generator'],
        avgProficiency: 30
      },
      {
        name: 'Intermediate',
        size: intermediate.size,
        characteristics: ['Growing proficiency', 'Exploring features', 'Regular usage'],
        preferredTools: ['campaign-builder', 'ab-test-calculator'],
        avgProficiency: 55
      },
      {
        name: 'Advanced',
        size: advanced.size,
        characteristics: ['High proficiency', 'Complex workflows', 'Power users'],
        preferredTools: ['schema-markup-generator', 'competitor-analyzer'],
        avgProficiency: 85
      }
    ];
  }

  private generateRecommendations(data: any): ToolRecommendation[] {
    const recommendations: ToolRecommendation[] = [];
    
    // Analyze underutilized tools
    const underutilized = data.topTools.filter((t: ToolMetrics) => 
      t.completionRate < 0.5
    );
    
    underutilized.forEach((tool: ToolMetrics) => {
      recommendations.push({
        type: 'tool',
        title: `Improve ${tool.toolId} onboarding`,
        description: `${tool.toolId} has low completion rate. Consider adding tutorials.`,
        impact: 'high',
        effort: 'medium'
      });
    });
    
    // Check for workflow opportunities
    data.patterns.forEach((pattern: UsagePattern) => {
      if (pattern.associatedTools.length > 1) {
        recommendations.push({
          type: 'workflow',
          title: `Create workflow for ${pattern.pattern}`,
          description: `Users often use these tools together. Consider creating a workflow.`,
          impact: 'medium',
          effort: 'low'
        });
      }
    });
    
    return recommendations;
  }

  private calculateProficiencyGrowth(userId: string): number {
    const userMap = this.userMetrics.get(userId);
    if (!userMap) return 0;
    
    // Calculate average proficiency change over time
    // This is simplified - would track historical proficiency in production
    const currentAvg = Array.from(userMap.values())
      .reduce((sum, m) => sum + m.proficiencyLevel, 0) / userMap.size;
    
    const initialAvg = 30; // Default starting proficiency
    return ((currentAvg - initialAvg) / initialAvg) * 100;
  }

  private getPersonalizedRecommendations(userId: string): string[] {
    // Get user's tool usage patterns
    const userTools = this.getUserToolMetrics(userId);
    const usedToolIds = userTools.map(m => m.toolId);
    
    // Recommend tools used by similar users
    const similarUsers = this.findSimilarUsers(userId);
    const recommendedTools = new Set<string>();
    
    similarUsers.forEach(similarUserId => {
      const similarUserTools = this.getUserToolMetrics(similarUserId);
      similarUserTools.forEach(metric => {
        if (!usedToolIds.includes(metric.toolId)) {
          recommendedTools.add(metric.toolId);
        }
      });
    });
    
    return Array.from(recommendedTools).slice(0, 5);
  }

  private findSimilarUsers(userId: string): string[] {
    // Simple similarity based on tool usage overlap
    const userTools = new Set(this.getUserToolMetrics(userId).map(m => m.toolId));
    const similarities: Array<{ userId: string; similarity: number }> = [];
    
    this.userMetrics.forEach((toolMap, otherUserId) => {
      if (otherUserId === userId) return;
      
      const otherTools = new Set(Array.from(toolMap.keys()));
      const intersection = new Set([...userTools].filter(x => otherTools.has(x)));
      const union = new Set([...userTools, ...otherTools]);
      
      const similarity = union.size > 0 ? intersection.size / union.size : 0;
      similarities.push({ userId: otherUserId, similarity });
    });
    
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10)
      .map(s => s.userId);
  }

  private getUserPatterns(userId: string): string[] {
    const userEvents = this.events.filter(e => e.userId === userId);
    const patterns: string[] = [];
    
    // Time-based patterns
    const hourCounts = new Array(24).fill(0);
    userEvents.forEach(e => {
      hourCounts[e.timestamp.getHours()]++;
    });
    
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    patterns.push(`Most active at ${peakHour}:00`);
    
    // Tool sequence patterns
    const sequences = this.findToolSequences(userEvents);
    if (sequences.length > 0) {
      patterns.push(`Often uses ${sequences[0].join(' → ')}`);
    }
    
    return patterns;
  }

  private findToolSequences(events: ToolUsageEvent[]): string[][] {
    const sequences: string[][] = [];
    const openEvents = events.filter(e => e.eventType === 'open')
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    for (let i = 0; i < openEvents.length - 1; i++) {
      const timeDiff = openEvents[i + 1].timestamp.getTime() - openEvents[i].timestamp.getTime();
      if (timeDiff < 10 * 60 * 1000) { // Within 10 minutes
        sequences.push([openEvents[i].toolId, openEvents[i + 1].toolId]);
      }
    }
    
    return sequences;
  }

  private checkAchievements(userId: string): Achievement[] {
    const achievements: Achievement[] = [];
    const userTools = this.getUserToolMetrics(userId);
    
    // Tool mastery achievements
    userTools.forEach(metric => {
      if (metric.proficiencyLevel >= 80) {
        achievements.push({
          id: `master-${metric.toolId}`,
          title: `${metric.toolId} Master`,
          description: 'Achieved high proficiency',
          icon: '🏆',
          unlockedAt: new Date()
        });
      }
    });
    
    // Usage milestones
    const totalUses = userTools.reduce((sum, m) => sum + m.usageCount, 0);
    if (totalUses >= 100) {
      achievements.push({
        id: 'power-user',
        title: 'Power User',
        description: 'Used tools 100+ times',
        icon: '⚡',
        unlockedAt: new Date()
      });
    }
    
    return achievements;
  }

  private loadHistoricalData(): void {
    // Load from localStorage or API
    try {
      const stored = localStorage.getItem('tool-analytics-events');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.events = parsed.map((e: any) => ({
          ...e,
          timestamp: new Date(e.timestamp)
        }));
      }
    } catch (error) {
      console.error('Failed to load historical analytics data:', error);
    }
  }

  private setupRealTimeProcessing(): void {
    // Save events periodically
    setInterval(() => {
      this.saveEvents();
    }, 30000); // Every 30 seconds
  }

  private saveEvents(): void {
    try {
      // Keep only last 7 days of events
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      
      const recentEvents = this.events.filter(e => e.timestamp > cutoff);
      localStorage.setItem('tool-analytics-events', JSON.stringify(recentEvents));
    } catch (error) {
      console.error('Failed to save analytics events:', error);
    }
  }

  private startPeriodicAnalysis(): void {
    // Run analysis every hour
    setInterval(() => {
      this.runPeriodicAnalysis();
    }, 3600000);
  }

  private runPeriodicAnalysis(): void {
    // Update aggregated metrics
    this.updateAggregatedMetrics();
    
    // Detect new patterns
    this.detectNewPatterns();
    
    // Clean old data
    this.cleanOldData();
  }

  private updateAggregatedMetrics(): void {
    // Recalculate tool metrics
    this.toolMetrics.forEach((metric, toolId) => {
      const toolEvents = this.events.filter(e => e.toolId === toolId);
      
      // Update unique users
      metric.uniqueUsers = new Set(toolEvents.map(e => e.userId)).size;
      
      // Update completion rate
      const completions = toolEvents.filter(e => e.eventType === 'complete');
      const successfulCompletions = completions.filter(e => e.metadata?.success);
      metric.completionRate = completions.length > 0 
        ? successfulCompletions.length / completions.length 
        : 0;
      
      // Update error rate
      const errors = toolEvents.filter(e => e.eventType === 'error');
      metric.errorRate = toolEvents.length > 0 
        ? errors.length / toolEvents.length 
        : 0;
    });
  }

  private detectNewPatterns(): void {
    // Look for emerging patterns in recent data
    const recentCutoff = new Date();
    recentCutoff.setHours(recentCutoff.getHours() - 24);
    
    const recentEvents = this.events.filter(e => e.timestamp > recentCutoff);
    
    // Detect tool combinations
    const toolPairs = new Map<string, number>();
    
    for (let i = 0; i < recentEvents.length - 1; i++) {
      if (recentEvents[i].userId === recentEvents[i + 1].userId) {
        const pair = `${recentEvents[i].toolId}-${recentEvents[i + 1].toolId}`;
        toolPairs.set(pair, (toolPairs.get(pair) || 0) + 1);
      }
    }
    
    // Create patterns for frequent pairs
    toolPairs.forEach((count, pair) => {
      if (count >= 5) {
        const [tool1, tool2] = pair.split('-');
        const patternKey = `sequence-${pair}`;
        
        if (!this.patterns.has(patternKey)) {
          this.patterns.set(patternKey, {
            pattern: `${tool1} followed by ${tool2}`,
            frequency: count,
            userSegment: [],
            timeframe: '24h',
            associatedTools: [tool1, tool2]
          });
        }
      }
    });
  }

  private cleanOldData(): void {
    // Remove events older than 30 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    
    this.events = this.events.filter(e => e.timestamp > cutoff);
  }
}

// Achievement interface
interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: Date;
}

// Export singleton instance
export const toolAnalyticsService = new ToolAnalyticsService();

// Export types
export type {
  ToolUsageEvent,
  ToolMetrics,
  UserToolMetrics,
  ToolEffectiveness,
  UsagePattern,
  AnalyticsReport,
  UserSegment,
  ToolRecommendation,
  Achievement
};