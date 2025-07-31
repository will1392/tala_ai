/**
 * CMO Mode Analytics Service
 * Tracks usage, adoption, user journeys, and errors
 */

interface AnalyticsEvent {
  eventName: string;
  category: 'feature' | 'interaction' | 'error' | 'performance' | 'journey';
  properties?: Record<string, any>;
  timestamp: Date;
  userId?: string;
  sessionId: string;
}

interface UserJourney {
  sessionId: string;
  userId?: string;
  steps: JourneyStep[];
  startTime: Date;
  endTime?: Date;
  completed: boolean;
}

interface JourneyStep {
  name: string;
  timestamp: Date;
  duration?: number;
  metadata?: Record<string, any>;
}

interface FeatureAdoption {
  featureName: string;
  firstUsed: Date;
  lastUsed: Date;
  useCount: number;
  userId: string;
}

interface PerformanceMetric {
  metricName: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count';
  timestamp: Date;
  context?: Record<string, any>;
}

class CMOAnalytics {
  private events: AnalyticsEvent[] = [];
  private journeys: Map<string, UserJourney> = new Map();
  private featureAdoption: Map<string, FeatureAdoption> = new Map();
  private performanceMetrics: PerformanceMetric[] = [];
  private sessionId: string;
  private errorQueue: any[] = [];

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeAnalytics();
    this.setupErrorTracking();
    this.setupPerformanceObserver();
  }

  /**
   * Initialize analytics with stored data
   */
  private initializeAnalytics() {
    // Load stored analytics data
    const stored = localStorage.getItem('cmo-analytics');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        this.events = data.events || [];
        this.featureAdoption = new Map(data.featureAdoption || []);
      } catch (error) {
        console.error('Failed to load analytics data:', error);
      }
    }

    // Set up periodic data sync
    setInterval(() => this.syncAnalytics(), 30000); // Sync every 30 seconds

    // Track session start
    this.trackEvent('session_start', 'journey');
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Track analytics event
   */
  trackEvent(eventName: string, category: AnalyticsEvent['category'], properties?: Record<string, any>) {
    const event: AnalyticsEvent = {
      eventName,
      category,
      properties,
      timestamp: new Date(),
      userId: this.getCurrentUserId(),
      sessionId: this.sessionId
    };

    this.events.push(event);

    // Update feature adoption if applicable
    if (category === 'feature') {
      this.updateFeatureAdoption(eventName);
    }

    // Real-time event dispatch (if needed)
    this.dispatchEvent(event);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Analytics Event:', event);
    }
  }

  /**
   * Track user journey steps
   */
  startJourney(journeyName: string) {
    const journey: UserJourney = {
      sessionId: this.sessionId,
      userId: this.getCurrentUserId(),
      steps: [{
        name: journeyName,
        timestamp: new Date()
      }],
      startTime: new Date(),
      completed: false
    };

    this.journeys.set(journeyName, journey);
    this.trackEvent(`journey_started_${journeyName}`, 'journey');
  }

  addJourneyStep(journeyName: string, stepName: string, metadata?: Record<string, any>) {
    const journey = this.journeys.get(journeyName);
    if (!journey) {
      console.warn(`Journey ${journeyName} not found`);
      return;
    }

    const lastStep = journey.steps[journey.steps.length - 1];
    const duration = new Date().getTime() - lastStep.timestamp.getTime();

    journey.steps.push({
      name: stepName,
      timestamp: new Date(),
      duration,
      metadata
    });

    this.trackEvent(`journey_step_${stepName}`, 'journey', { journeyName, ...metadata });
  }

  completeJourney(journeyName: string) {
    const journey = this.journeys.get(journeyName);
    if (!journey) return;

    journey.endTime = new Date();
    journey.completed = true;

    const duration = journey.endTime.getTime() - journey.startTime.getTime();
    
    this.trackEvent(`journey_completed_${journeyName}`, 'journey', {
      duration,
      steps: journey.steps.length
    });
  }

  /**
   * Track feature adoption
   */
  private updateFeatureAdoption(featureName: string) {
    const key = `${featureName}-${this.getCurrentUserId()}`;
    const existing = this.featureAdoption.get(key);

    if (existing) {
      existing.lastUsed = new Date();
      existing.useCount++;
    } else {
      this.featureAdoption.set(key, {
        featureName,
        firstUsed: new Date(),
        lastUsed: new Date(),
        useCount: 1,
        userId: this.getCurrentUserId() || 'anonymous'
      });
    }
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metricName: string, value: number, unit: PerformanceMetric['unit'], context?: Record<string, any>) {
    const metric: PerformanceMetric = {
      metricName,
      value,
      unit,
      timestamp: new Date(),
      context
    };

    this.performanceMetrics.push(metric);

    // Alert if performance is degraded
    if (unit === 'ms' && value > 1000) {
      this.trackEvent('performance_degradation', 'performance', {
        metric: metricName,
        value,
        threshold: 1000
      });
    }
  }

  /**
   * Error tracking
   */
  private setupErrorTracking() {
    window.addEventListener('error', (event) => {
      this.trackError({
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        error: event.error
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        message: 'Unhandled Promise Rejection',
        reason: event.reason
      });
    });
  }

  trackError(error: any) {
    const errorEvent = {
      ...error,
      timestamp: new Date(),
      sessionId: this.sessionId,
      userId: this.getCurrentUserId(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.errorQueue.push(errorEvent);
    
    this.trackEvent('error_occurred', 'error', {
      message: error.message,
      source: error.source
    });

    // Send errors immediately in batches
    if (this.errorQueue.length >= 5) {
      this.flushErrors();
    }
  }

  /**
   * Performance observer for Web Vitals
   */
  private setupPerformanceObserver() {
    if ('PerformanceObserver' in window) {
      // Observe Largest Contentful Paint
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.trackPerformance('lcp', lastEntry.startTime, 'ms');
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        console.warn('LCP observer not supported');
      }

      // Observe First Input Delay
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            this.trackPerformance('fid', entry.processingStart - entry.startTime, 'ms');
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        console.warn('FID observer not supported');
      }

      // Observe Cumulative Layout Shift
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
              this.trackPerformance('cls', clsValue, 'count');
            }
          });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        console.warn('CLS observer not supported');
      }
    }
  }

  /**
   * Get analytics reports
   */
  getFeatureAdoptionReport(): Record<string, any> {
    const report: Record<string, any> = {};
    
    this.featureAdoption.forEach((adoption, key) => {
      const feature = adoption.featureName;
      if (!report[feature]) {
        report[feature] = {
          totalUsers: 0,
          totalUses: 0,
          avgUsesPerUser: 0,
          firstUsed: adoption.firstUsed,
          lastUsed: adoption.lastUsed
        };
      }
      
      report[feature].totalUsers++;
      report[feature].totalUses += adoption.useCount;
      report[feature].avgUsesPerUser = report[feature].totalUses / report[feature].totalUsers;
      
      if (adoption.firstUsed < report[feature].firstUsed) {
        report[feature].firstUsed = adoption.firstUsed;
      }
      if (adoption.lastUsed > report[feature].lastUsed) {
        report[feature].lastUsed = adoption.lastUsed;
      }
    });

    return report;
  }

  getUserJourneyReport(): Record<string, any> {
    const report: Record<string, any> = {
      totalJourneys: this.journeys.size,
      completedJourneys: 0,
      abandonedJourneys: 0,
      avgStepsPerJourney: 0,
      avgCompletionTime: 0
    };

    let totalSteps = 0;
    let totalCompletionTime = 0;
    let completedCount = 0;

    this.journeys.forEach((journey) => {
      totalSteps += journey.steps.length;
      
      if (journey.completed) {
        report.completedJourneys++;
        if (journey.endTime && journey.startTime) {
          const duration = journey.endTime.getTime() - journey.startTime.getTime();
          totalCompletionTime += duration;
          completedCount++;
        }
      } else {
        report.abandonedJourneys++;
      }
    });

    report.avgStepsPerJourney = totalSteps / this.journeys.size;
    report.avgCompletionTime = completedCount > 0 ? totalCompletionTime / completedCount : 0;

    return report;
  }

  getPerformanceReport(): Record<string, any> {
    const report: Record<string, any> = {};
    
    // Group metrics by name
    this.performanceMetrics.forEach((metric) => {
      if (!report[metric.metricName]) {
        report[metric.metricName] = {
          avg: 0,
          min: Infinity,
          max: -Infinity,
          count: 0,
          p50: 0,
          p90: 0,
          p99: 0,
          values: []
        };
      }
      
      const metricReport = report[metric.metricName];
      metricReport.values.push(metric.value);
      metricReport.count++;
      metricReport.min = Math.min(metricReport.min, metric.value);
      metricReport.max = Math.max(metricReport.max, metric.value);
    });

    // Calculate percentiles and averages
    Object.keys(report).forEach((metricName) => {
      const metricReport = report[metricName];
      const values = metricReport.values.sort((a: number, b: number) => a - b);
      
      metricReport.avg = values.reduce((a: number, b: number) => a + b, 0) / values.length;
      metricReport.p50 = this.percentile(values, 0.5);
      metricReport.p90 = this.percentile(values, 0.9);
      metricReport.p99 = this.percentile(values, 0.99);
      
      delete metricReport.values; // Remove raw values to save space
    });

    return report;
  }

  /**
   * Utility functions
   */
  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const index = Math.ceil(arr.length * p) - 1;
    return arr[index];
  }

  private getCurrentUserId(): string | undefined {
    // This should be replaced with actual user ID from auth system
    return localStorage.getItem('userId') || undefined;
  }

  private dispatchEvent(event: AnalyticsEvent) {
    // Send to analytics service (e.g., Google Analytics, Mixpanel, etc.)
    if (window.gtag) {
      window.gtag('event', event.eventName, {
        event_category: event.category,
        ...event.properties
      });
    }

    // Custom analytics endpoint
    if (process.env.REACT_APP_ANALYTICS_ENDPOINT) {
      fetch(process.env.REACT_APP_ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      }).catch(error => console.error('Analytics dispatch failed:', error));
    }
  }

  private syncAnalytics() {
    // Save to local storage
    const data = {
      events: this.events.slice(-1000), // Keep last 1000 events
      featureAdoption: Array.from(this.featureAdoption.entries()),
      lastSync: new Date()
    };
    
    localStorage.setItem('cmo-analytics', JSON.stringify(data));

    // Flush errors if any
    if (this.errorQueue.length > 0) {
      this.flushErrors();
    }
  }

  private flushErrors() {
    if (this.errorQueue.length === 0) return;

    const errors = [...this.errorQueue];
    this.errorQueue = [];

    // Send errors to logging service
    if (process.env.REACT_APP_ERROR_ENDPOINT) {
      fetch(process.env.REACT_APP_ERROR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errors, sessionId: this.sessionId })
      }).catch(error => console.error('Error logging failed:', error));
    }
  }

  /**
   * Export analytics data
   */
  exportAnalytics(): string {
    const data = {
      events: this.events,
      journeys: Array.from(this.journeys.entries()),
      featureAdoption: Array.from(this.featureAdoption.entries()),
      performanceMetrics: this.performanceMetrics,
      reports: {
        featureAdoption: this.getFeatureAdoptionReport(),
        userJourneys: this.getUserJourneyReport(),
        performance: this.getPerformanceReport()
      },
      exportedAt: new Date()
    };

    return JSON.stringify(data, null, 2);
  }
}

// Singleton instance
export const cmoAnalytics = new CMOAnalytics();

// Declare gtag for TypeScript
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}