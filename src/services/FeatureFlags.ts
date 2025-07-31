/**
 * Feature Flags Service for CMO Mode
 * Enables gradual rollout, A/B testing, and easy rollback
 */

interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage: number;
  variants?: Record<string, any>;
  segments?: UserSegment[];
  metadata?: Record<string, any>;
}

interface UserSegment {
  type: 'user' | 'role' | 'plan' | 'region' | 'custom';
  values: string[];
  operator: 'includes' | 'excludes';
}

interface ABTestConfig {
  name: string;
  variants: ABVariant[];
  allocation: 'random' | 'weighted' | 'sticky';
  goal: string;
  startDate: Date;
  endDate?: Date;
}

interface ABVariant {
  name: string;
  weight: number;
  features: Record<string, any>;
}

class FeatureFlagsService {
  private flags: Map<string, FeatureFlag> = new Map();
  private abTests: Map<string, ABTestConfig> = new Map();
  private userOverrides: Map<string, Map<string, boolean>> = new Map();
  private userVariants: Map<string, Map<string, string>> = new Map();

  constructor() {
    this.initializeFlags();
    this.loadRemoteFlags();
    this.setupPolling();
  }

  /**
   * Initialize default feature flags
   */
  private initializeFlags() {
    // CMO Mode features
    this.flags.set('cmo-mode', {
      name: 'cmo-mode',
      enabled: true,
      rolloutPercentage: 100,
      segments: [{
        type: 'plan',
        values: ['professional', 'enterprise'],
        operator: 'includes'
      }]
    });

    this.flags.set('cmo-onboarding-v2', {
      name: 'cmo-onboarding-v2',
      enabled: true,
      rolloutPercentage: 50,
      metadata: {
        description: 'Enhanced onboarding flow with practice scenarios'
      }
    });

    this.flags.set('cmo-achievements', {
      name: 'cmo-achievements',
      enabled: true,
      rolloutPercentage: 100,
      metadata: {
        description: 'Achievement and gamification system'
      }
    });

    this.flags.set('cmo-advanced-analytics', {
      name: 'cmo-advanced-analytics',
      enabled: true,
      rolloutPercentage: 30,
      segments: [{
        type: 'plan',
        values: ['enterprise'],
        operator: 'includes'
      }]
    });

    this.flags.set('cmo-ai-insights', {
      name: 'cmo-ai-insights',
      enabled: true,
      rolloutPercentage: 75,
      metadata: {
        description: 'AI-powered marketing insights and recommendations'
      }
    });

    this.flags.set('cmo-offline-mode', {
      name: 'cmo-offline-mode',
      enabled: false,
      rolloutPercentage: 0,
      metadata: {
        description: 'Work offline with syncing capabilities'
      }
    });

    // Performance features
    this.flags.set('lazy-loading', {
      name: 'lazy-loading',
      enabled: true,
      rolloutPercentage: 100
    });

    this.flags.set('virtualized-lists', {
      name: 'virtualized-lists',
      enabled: true,
      rolloutPercentage: 100
    });

    this.flags.set('performance-monitoring', {
      name: 'performance-monitoring',
      enabled: true,
      rolloutPercentage: 100
    });
  }

  /**
   * Load feature flags from remote configuration
   */
  private async loadRemoteFlags() {
    try {
      if (process.env.REACT_APP_FEATURE_FLAGS_ENDPOINT) {
        const response = await fetch(process.env.REACT_APP_FEATURE_FLAGS_ENDPOINT);
        const remoteFlags = await response.json();
        
        // Merge remote flags with local
        remoteFlags.forEach((flag: FeatureFlag) => {
          this.flags.set(flag.name, flag);
        });
      }
    } catch (error) {
      console.warn('Failed to load remote feature flags:', error);
    }
  }

  /**
   * Set up polling for flag updates
   */
  private setupPolling() {
    // Poll for updates every 5 minutes
    setInterval(() => this.loadRemoteFlags(), 5 * 60 * 1000);
  }

  /**
   * Check if a feature is enabled for a user
   */
  isEnabled(featureName: string, userId?: string, userContext?: Record<string, any>): boolean {
    // Check user overrides first
    if (userId && this.userOverrides.has(userId)) {
      const overrides = this.userOverrides.get(userId)!;
      if (overrides.has(featureName)) {
        return overrides.get(featureName)!;
      }
    }

    const flag = this.flags.get(featureName);
    if (!flag) {
      console.warn(`Feature flag '${featureName}' not found`);
      return false;
    }

    // Check if globally disabled
    if (!flag.enabled) {
      return false;
    }

    // Check segments
    if (flag.segments && userContext) {
      const passesSegments = this.checkSegments(flag.segments, userContext);
      if (!passesSegments) {
        return false;
      }
    }

    // Check rollout percentage
    if (flag.rolloutPercentage < 100) {
      const hash = this.hashUserId(userId || 'anonymous', featureName);
      const bucket = Math.abs(hash % 100);
      return bucket < flag.rolloutPercentage;
    }

    return true;
  }

  /**
   * Get variant for A/B test
   */
  getVariant(testName: string, userId?: string): string | null {
    // Check if user already has a variant assigned
    if (userId && this.userVariants.has(userId)) {
      const variants = this.userVariants.get(userId)!;
      if (variants.has(testName)) {
        return variants.get(testName)!;
      }
    }

    const test = this.abTests.get(testName);
    if (!test) {
      return null;
    }

    // Check if test is active
    const now = new Date();
    if (now < test.startDate || (test.endDate && now > test.endDate)) {
      return null;
    }

    // Assign variant
    const variant = this.assignVariant(test, userId);
    
    // Store assignment
    if (userId && variant) {
      if (!this.userVariants.has(userId)) {
        this.userVariants.set(userId, new Map());
      }
      this.userVariants.get(userId)!.set(testName, variant);
    }

    return variant;
  }

  /**
   * Create or update a feature flag
   */
  setFlag(flag: FeatureFlag) {
    this.flags.set(flag.name, flag);
    this.notifyFlagChange(flag.name);
  }

  /**
   * Override feature flag for specific user
   */
  setUserOverride(userId: string, featureName: string, enabled: boolean) {
    if (!this.userOverrides.has(userId)) {
      this.userOverrides.set(userId, new Map());
    }
    this.userOverrides.get(userId)!.set(featureName, enabled);
  }

  /**
   * Create A/B test
   */
  createABTest(config: ABTestConfig) {
    this.abTests.set(config.name, config);
  }

  /**
   * Get all feature flags
   */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  /**
   * Get feature flag details
   */
  getFlag(featureName: string): FeatureFlag | undefined {
    return this.flags.get(featureName);
  }

  /**
   * Rollback a feature
   */
  rollback(featureName: string) {
    const flag = this.flags.get(featureName);
    if (flag) {
      flag.enabled = false;
      flag.rolloutPercentage = 0;
      this.notifyFlagChange(featureName);
    }
  }

  /**
   * Gradual rollout
   */
  setRolloutPercentage(featureName: string, percentage: number) {
    const flag = this.flags.get(featureName);
    if (flag) {
      flag.rolloutPercentage = Math.max(0, Math.min(100, percentage));
      this.notifyFlagChange(featureName);
    }
  }

  /**
   * Check if user passes segment criteria
   */
  private checkSegments(segments: UserSegment[], userContext: Record<string, any>): boolean {
    return segments.every(segment => {
      const userValue = userContext[segment.type];
      if (!userValue) return false;

      const matches = segment.values.includes(userValue);
      return segment.operator === 'includes' ? matches : !matches;
    });
  }

  /**
   * Hash user ID for consistent bucketing
   */
  private hashUserId(userId: string, featureName: string): number {
    const str = `${userId}-${featureName}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  /**
   * Assign variant based on test configuration
   */
  private assignVariant(test: ABTestConfig, userId?: string): string | null {
    if (test.variants.length === 0) return null;

    if (test.allocation === 'random' || !userId) {
      // Random assignment
      const rand = Math.random() * 100;
      let cumulative = 0;
      
      for (const variant of test.variants) {
        cumulative += variant.weight;
        if (rand < cumulative) {
          return variant.name;
        }
      }
    } else if (test.allocation === 'sticky' && userId) {
      // Consistent assignment based on user ID
      const hash = this.hashUserId(userId, test.name);
      const bucket = Math.abs(hash % 100);
      
      let cumulative = 0;
      for (const variant of test.variants) {
        cumulative += variant.weight;
        if (bucket < cumulative) {
          return variant.name;
        }
      }
    }

    return test.variants[0].name; // Fallback to first variant
  }

  /**
   * Notify listeners of flag changes
   */
  private notifyFlagChange(featureName: string) {
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('featureFlagChanged', {
      detail: { featureName }
    }));
  }

  /**
   * Export feature flag configuration
   */
  exportConfiguration(): string {
    const config = {
      flags: Array.from(this.flags.entries()),
      abTests: Array.from(this.abTests.entries()),
      exportedAt: new Date()
    };
    return JSON.stringify(config, null, 2);
  }
}

// Singleton instance
export const featureFlags = new FeatureFlagsService();

// React hook for feature flags
export const useFeatureFlag = (featureName: string, userId?: string, userContext?: Record<string, any>): boolean => {
  const [enabled, setEnabled] = React.useState(() => 
    featureFlags.isEnabled(featureName, userId, userContext)
  );

  React.useEffect(() => {
    const handleFlagChange = (event: CustomEvent) => {
      if (event.detail.featureName === featureName) {
        setEnabled(featureFlags.isEnabled(featureName, userId, userContext));
      }
    };

    window.addEventListener('featureFlagChanged' as any, handleFlagChange);
    return () => {
      window.removeEventListener('featureFlagChanged' as any, handleFlagChange);
    };
  }, [featureName, userId, userContext]);

  return enabled;
};

// React hook for A/B testing
export const useABTest = (testName: string, userId?: string): string | null => {
  return featureFlags.getVariant(testName, userId);
};

// Add React import for hooks
import * as React from 'react';