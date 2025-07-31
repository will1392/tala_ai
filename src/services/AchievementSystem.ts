/**
 * Achievement System for CMO Mode
 * Tracks and rewards user progress and milestones
 */

import { toolAnalyticsService } from './ToolAnalyticsService';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'campaign' | 'tool' | 'channel' | 'result' | 'special';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  points: number;
  criteria: AchievementCriteria;
  unlockedAt?: Date;
  progress?: number;
}

interface AchievementCriteria {
  type: 'count' | 'milestone' | 'streak' | 'performance' | 'time';
  target: number;
  current?: number;
  metadata?: Record<string, any>;
}

interface UserAchievements {
  userId: string;
  achievements: Achievement[];
  totalPoints: number;
  level: number;
  nextLevelPoints: number;
  streaks: Record<string, number>;
  statistics: UserStatistics;
}

interface UserStatistics {
  campaignsCreated: number;
  toolsUsed: Set<string>;
  channelsExplored: Set<string>;
  tasksCompleted: number;
  successRate: number;
  totalTimeSpent: number;
}

class AchievementSystem {
  private achievements: Map<string, Achievement> = new Map();
  private userProgress: Map<string, UserAchievements> = new Map();
  private listeners: Array<(achievement: Achievement) => void> = [];

  constructor() {
    this.initializeAchievements();
    this.loadUserProgress();
  }

  /**
   * Initialize all available achievements
   */
  private initializeAchievements() {
    const achievementDefinitions: Achievement[] = [
      // Campaign Achievements
      {
        id: 'first-campaign',
        name: 'First Campaign',
        description: 'Create your first marketing campaign',
        icon: '🎯',
        category: 'campaign',
        tier: 'bronze',
        points: 10,
        criteria: { type: 'count', target: 1 }
      },
      {
        id: 'campaign-veteran',
        name: 'Campaign Veteran',
        description: 'Create 10 marketing campaigns',
        icon: '⚡',
        category: 'campaign',
        tier: 'silver',
        points: 50,
        criteria: { type: 'count', target: 10 }
      },
      {
        id: 'campaign-master',
        name: 'Campaign Master',
        description: 'Create 50 marketing campaigns',
        icon: '👑',
        category: 'campaign',
        tier: 'gold',
        points: 100,
        criteria: { type: 'count', target: 50 }
      },
      {
        id: 'multi-channel-campaign',
        name: 'Multi-Channel Maestro',
        description: 'Create a campaign using all 4 channels',
        icon: '🌟',
        category: 'campaign',
        tier: 'gold',
        points: 75,
        criteria: { type: 'milestone', target: 4, metadata: { type: 'channels' } }
      },

      // Tool Achievements
      {
        id: 'tool-explorer',
        name: 'Tool Explorer',
        description: 'Use 5 different marketing tools',
        icon: '🔧',
        category: 'tool',
        tier: 'bronze',
        points: 15,
        criteria: { type: 'count', target: 5 }
      },
      {
        id: 'tool-expert',
        name: 'Tool Expert',
        description: 'Use 15 different marketing tools',
        icon: '🛠️',
        category: 'tool',
        tier: 'silver',
        points: 40,
        criteria: { type: 'count', target: 15 }
      },
      {
        id: 'tool-master',
        name: 'Tool Master',
        description: 'Use all 30+ marketing tools',
        icon: '🏆',
        category: 'tool',
        tier: 'platinum',
        points: 150,
        criteria: { type: 'count', target: 30 }
      },
      {
        id: 'speed-demon',
        name: 'Speed Demon',
        description: 'Complete 10 tasks in under 5 minutes each',
        icon: '⚡',
        category: 'tool',
        tier: 'silver',
        points: 30,
        criteria: { type: 'performance', target: 10, metadata: { timeLimit: 300 } }
      },

      // Channel Achievements
      {
        id: 'seo-specialist',
        name: 'SEO Specialist',
        description: 'Complete 10 SEO optimization tasks',
        icon: '📈',
        category: 'channel',
        tier: 'silver',
        points: 35,
        criteria: { type: 'count', target: 10, metadata: { channel: 'seo' } }
      },
      {
        id: 'email-expert',
        name: 'Email Expert',
        description: 'Send 20 successful email campaigns',
        icon: '📧',
        category: 'channel',
        tier: 'silver',
        points: 35,
        criteria: { type: 'count', target: 20, metadata: { channel: 'email' } }
      },
      {
        id: 'social-savvy',
        name: 'Social Media Savvy',
        description: 'Create 30 social media posts',
        icon: '📱',
        category: 'channel',
        tier: 'silver',
        points: 35,
        criteria: { type: 'count', target: 30, metadata: { channel: 'social' } }
      },
      {
        id: 'direct-mail-pro',
        name: 'Direct Mail Pro',
        description: 'Design 5 direct mail campaigns',
        icon: '📮',
        category: 'channel',
        tier: 'silver',
        points: 35,
        criteria: { type: 'count', target: 5, metadata: { channel: 'directmail' } }
      },
      {
        id: 'channel-hopper',
        name: 'Channel Hopper',
        description: 'Use all 4 marketing channels in one day',
        icon: '🎪',
        category: 'channel',
        tier: 'gold',
        points: 60,
        criteria: { type: 'milestone', target: 4, metadata: { timeframe: 'day' } }
      },

      // Result Achievements
      {
        id: 'high-performer',
        name: 'High Performer',
        description: 'Achieve 90% success rate on campaigns',
        icon: '🎖️',
        category: 'result',
        tier: 'gold',
        points: 80,
        criteria: { type: 'performance', target: 90, metadata: { metric: 'successRate' } }
      },
      {
        id: 'roi-champion',
        name: 'ROI Champion',
        description: 'Generate 300% ROI on a campaign',
        icon: '💰',
        category: 'result',
        tier: 'gold',
        points: 100,
        criteria: { type: 'performance', target: 300, metadata: { metric: 'roi' } }
      },
      {
        id: 'engagement-guru',
        name: 'Engagement Guru',
        description: 'Achieve 50% engagement rate',
        icon: '💬',
        category: 'result',
        tier: 'silver',
        points: 50,
        criteria: { type: 'performance', target: 50, metadata: { metric: 'engagement' } }
      },
      {
        id: 'conversion-wizard',
        name: 'Conversion Wizard',
        description: 'Convert 1000 leads',
        icon: '🧙',
        category: 'result',
        tier: 'platinum',
        points: 200,
        criteria: { type: 'count', target: 1000, metadata: { metric: 'conversions' } }
      },

      // Special Achievements
      {
        id: 'early-bird',
        name: 'Early Bird',
        description: 'Complete 5 tasks before 9 AM',
        icon: '🌅',
        category: 'special',
        tier: 'bronze',
        points: 20,
        criteria: { type: 'time', target: 5, metadata: { beforeHour: 9 } }
      },
      {
        id: 'night-owl',
        name: 'Night Owl',
        description: 'Complete 5 tasks after 9 PM',
        icon: '🦉',
        category: 'special',
        tier: 'bronze',
        points: 20,
        criteria: { type: 'time', target: 5, metadata: { afterHour: 21 } }
      },
      {
        id: 'streak-master',
        name: 'Streak Master',
        description: 'Use CMO Mode for 30 consecutive days',
        icon: '🔥',
        category: 'special',
        tier: 'gold',
        points: 100,
        criteria: { type: 'streak', target: 30 }
      },
      {
        id: 'perfectionist',
        name: 'Perfectionist',
        description: 'Complete 10 tasks with 100% quality score',
        icon: '💎',
        category: 'special',
        tier: 'platinum',
        points: 150,
        criteria: { type: 'performance', target: 10, metadata: { qualityScore: 100 } }
      }
    ];

    achievementDefinitions.forEach(achievement => {
      this.achievements.set(achievement.id, achievement);
    });
  }

  /**
   * Track user action and check for achievements
   */
  async trackAction(userId: string, action: {
    type: 'campaign_created' | 'tool_used' | 'task_completed' | 'channel_used' | 'result_achieved';
    data: any;
  }): Promise<Achievement[]> {
    const userAchievements = this.getUserAchievements(userId);
    const unlockedAchievements: Achievement[] = [];

    // Update statistics
    this.updateStatistics(userAchievements, action);

    // Check each achievement
    for (const achievement of this.achievements.values()) {
      if (!this.isUnlocked(userId, achievement.id)) {
        const progress = this.checkProgress(userAchievements, achievement);
        
        if (progress >= achievement.criteria.target) {
          // Unlock achievement!
          const unlockedAchievement = this.unlockAchievement(userId, achievement.id);
          if (unlockedAchievement) {
            unlockedAchievements.push(unlockedAchievement);
          }
        } else {
          // Update progress
          this.updateProgress(userId, achievement.id, progress);
        }
      }
    }

    // Save progress
    this.saveUserProgress(userId);

    return unlockedAchievements;
  }

  /**
   * Get user achievements and stats
   */
  getUserAchievements(userId: string): UserAchievements {
    if (!this.userProgress.has(userId)) {
      this.userProgress.set(userId, {
        userId,
        achievements: [],
        totalPoints: 0,
        level: 1,
        nextLevelPoints: 100,
        streaks: {},
        statistics: {
          campaignsCreated: 0,
          toolsUsed: new Set(),
          channelsExplored: new Set(),
          tasksCompleted: 0,
          successRate: 0,
          totalTimeSpent: 0
        }
      });
    }
    return this.userProgress.get(userId)!;
  }

  /**
   * Check if achievement is unlocked
   */
  isUnlocked(userId: string, achievementId: string): boolean {
    const userAchievements = this.getUserAchievements(userId);
    return userAchievements.achievements.some(a => a.id === achievementId && a.unlockedAt);
  }

  /**
   * Unlock achievement
   */
  private unlockAchievement(userId: string, achievementId: string): Achievement | null {
    const achievement = this.achievements.get(achievementId);
    if (!achievement) return null;

    const userAchievements = this.getUserAchievements(userId);
    const unlockedAchievement = {
      ...achievement,
      unlockedAt: new Date(),
      progress: achievement.criteria.target
    };

    // Add to user achievements
    userAchievements.achievements.push(unlockedAchievement);
    userAchievements.totalPoints += achievement.points;

    // Check for level up
    this.checkLevelUp(userAchievements);

    // Notify listeners
    this.listeners.forEach(listener => listener(unlockedAchievement));

    // Track in analytics
    toolAnalyticsService.trackEvent({
      toolId: 'achievement-system',
      userId,
      eventType: 'complete',
      metadata: {
        achievementId,
        achievementName: achievement.name,
        points: achievement.points
      }
    });

    return unlockedAchievement;
  }

  /**
   * Update achievement progress
   */
  private updateProgress(userId: string, achievementId: string, progress: number): void {
    const userAchievements = this.getUserAchievements(userId);
    const existingIndex = userAchievements.achievements.findIndex(a => a.id === achievementId);
    
    if (existingIndex >= 0) {
      userAchievements.achievements[existingIndex].progress = progress;
    } else {
      const achievement = this.achievements.get(achievementId);
      if (achievement) {
        userAchievements.achievements.push({
          ...achievement,
          progress
        });
      }
    }
  }

  /**
   * Check progress for specific achievement
   */
  private checkProgress(userAchievements: UserAchievements, achievement: Achievement): number {
    const { criteria } = achievement;
    const { statistics, streaks } = userAchievements;

    switch (criteria.type) {
      case 'count':
        if (criteria.metadata?.channel) {
          // Channel-specific count
          return this.getChannelCount(userAchievements, criteria.metadata.channel);
        }
        // General count based on achievement category
        switch (achievement.category) {
          case 'campaign':
            return statistics.campaignsCreated;
          case 'tool':
            return statistics.toolsUsed.size;
          case 'channel':
            return statistics.channelsExplored.size;
          default:
            return 0;
        }

      case 'milestone':
        if (criteria.metadata?.type === 'channels') {
          return statistics.channelsExplored.size;
        }
        return 0;

      case 'streak':
        return streaks.daily || 0;

      case 'performance':
        if (criteria.metadata?.metric === 'successRate') {
          return statistics.successRate;
        }
        return 0;

      case 'time':
        // Would need to track time-based actions
        return 0;

      default:
        return 0;
    }
  }

  /**
   * Update user statistics
   */
  private updateStatistics(userAchievements: UserAchievements, action: any): void {
    const { statistics } = userAchievements;

    switch (action.type) {
      case 'campaign_created':
        statistics.campaignsCreated++;
        if (action.data.channel) {
          statistics.channelsExplored.add(action.data.channel);
        }
        break;

      case 'tool_used':
        statistics.toolsUsed.add(action.data.toolId);
        break;

      case 'task_completed':
        statistics.tasksCompleted++;
        if (action.data.success) {
          const totalTasks = statistics.tasksCompleted;
          const successfulTasks = Math.floor(statistics.successRate * (totalTasks - 1) / 100) + 1;
          statistics.successRate = Math.round((successfulTasks / totalTasks) * 100);
        }
        break;

      case 'channel_used':
        statistics.channelsExplored.add(action.data.channel);
        break;
    }
  }

  /**
   * Check and handle level up
   */
  private checkLevelUp(userAchievements: UserAchievements): void {
    while (userAchievements.totalPoints >= userAchievements.nextLevelPoints) {
      userAchievements.level++;
      userAchievements.nextLevelPoints = this.calculateNextLevelPoints(userAchievements.level);
      
      // Notify level up
      this.listeners.forEach(listener => listener({
        id: 'level-up',
        name: `Level ${userAchievements.level}`,
        description: `Reached level ${userAchievements.level}!`,
        icon: '🎉',
        category: 'special',
        tier: 'gold',
        points: 0,
        criteria: { type: 'milestone', target: userAchievements.level },
        unlockedAt: new Date()
      }));
    }
  }

  /**
   * Calculate points needed for next level
   */
  private calculateNextLevelPoints(currentLevel: number): number {
    // Exponential growth: 100, 250, 500, 1000, etc.
    return Math.floor(100 * Math.pow(1.5, currentLevel));
  }

  /**
   * Get channel-specific count
   */
  private getChannelCount(userAchievements: UserAchievements, channel: string): number {
    // This would need to be tracked separately
    // For now, return a placeholder
    return 0;
  }

  /**
   * Subscribe to achievement unlocks
   */
  onAchievementUnlocked(callback: (achievement: Achievement) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Get achievement leaderboard
   */
  getLeaderboard(limit: number = 10): Array<{
    userId: string;
    totalPoints: number;
    level: number;
    achievementCount: number;
  }> {
    const leaderboard = Array.from(this.userProgress.values())
      .map(user => ({
        userId: user.userId,
        totalPoints: user.totalPoints,
        level: user.level,
        achievementCount: user.achievements.filter(a => a.unlockedAt).length
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, limit);

    return leaderboard;
  }

  /**
   * Get achievement by category
   */
  getAchievementsByCategory(category?: string): Achievement[] {
    if (!category) {
      return Array.from(this.achievements.values());
    }
    return Array.from(this.achievements.values())
      .filter(a => a.category === category);
  }

  /**
   * Save/Load user progress
   */
  private saveUserProgress(userId: string): void {
    const userAchievements = this.userProgress.get(userId);
    if (userAchievements) {
      // Convert Sets to Arrays for serialization
      const serializable = {
        ...userAchievements,
        statistics: {
          ...userAchievements.statistics,
          toolsUsed: Array.from(userAchievements.statistics.toolsUsed),
          channelsExplored: Array.from(userAchievements.statistics.channelsExplored)
        }
      };
      localStorage.setItem(`achievements_${userId}`, JSON.stringify(serializable));
    }
  }

  private loadUserProgress(): void {
    // Load from localStorage
    const keys = Object.keys(localStorage).filter(k => k.startsWith('achievements_'));
    keys.forEach(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        if (data.userId) {
          // Convert Arrays back to Sets
          if (data.statistics) {
            data.statistics.toolsUsed = new Set(data.statistics.toolsUsed || []);
            data.statistics.channelsExplored = new Set(data.statistics.channelsExplored || []);
          }
          this.userProgress.set(data.userId, data);
        }
      } catch (error) {
        console.error('Failed to load achievements:', error);
      }
    });
  }
}

// Export singleton instance
export const achievementSystem = new AchievementSystem();

// Export types
export type { Achievement, AchievementCriteria, UserAchievements, UserStatistics };