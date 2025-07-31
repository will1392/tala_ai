// Performance Monitoring Service for CMO Mode

import { useEffect } from 'react';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
}

interface PerformanceEntry {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

interface MemoryMetrics {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp: Date;
}

interface RenderMetrics {
  componentName: string;
  renderCount: number;
  averageRenderTime: number;
  lastRenderTime: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private entries: Map<string, PerformanceEntry> = new Map();
  private renderMetrics: Map<string, RenderMetrics> = new Map();
  private observers: Set<PerformanceObserver> = new Set();
  private isMonitoring = false;
  private metricsBuffer: PerformanceMetric[] = [];
  private bufferFlushInterval?: NodeJS.Timeout;

  constructor() {
    this.initialize();
  }

  // Initialize performance monitoring
  private initialize() {
    if (typeof window === 'undefined' || !window.performance) {
      console.warn('Performance API not available');
      return;
    }

    // Set up Performance Observer for various entry types
    this.setupPerformanceObserver();
    
    // Start buffer flushing
    this.startBufferFlushing();
  }

  // Start monitoring
  startMonitoring() {
    this.isMonitoring = true;
    
    // Monitor memory usage
    this.startMemoryMonitoring();
    
    // Monitor long tasks
    this.monitorLongTasks();
    
    // Monitor resource loading
    this.monitorResourceLoading();
  }

  // Stop monitoring
  stopMonitoring() {
    this.isMonitoring = false;
    
    // Clear observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    
    // Clear intervals
    if (this.bufferFlushInterval) {
      clearInterval(this.bufferFlushInterval);
    }
  }

  // Mark the start of a performance measurement
  mark(name: string, metadata?: Record<string, any>) {
    if (!this.isMonitoring) return;

    const entry: PerformanceEntry = {
      name,
      startTime: performance.now(),
      metadata
    };

    this.entries.set(name, entry);
    
    // Also create a performance mark
    if (performance.mark) {
      performance.mark(`${name}-start`);
    }
  }

  // Measure the duration between marks
  measure(name: string, startMark?: string, endMark?: string) {
    if (!this.isMonitoring) return;

    const endTime = performance.now();
    
    if (startMark && endMark) {
      // Use Performance API measure
      if (performance.measure) {
        try {
          performance.measure(name, startMark, endMark);
        } catch (error) {
          console.warn(`Failed to measure ${name}:`, error);
        }
      }
    } else {
      // Use our stored entry
      const entry = this.entries.get(name);
      if (entry) {
        entry.endTime = endTime;
        entry.duration = endTime - entry.startTime;
        
        // Record metric
        this.recordMetric({
          name: `performance.${name}`,
          value: entry.duration,
          timestamp: new Date(),
          tags: { type: 'timing' }
        });
        
        // Create performance mark for end
        if (performance.mark) {
          performance.mark(`${name}-end`);
        }
      }
    }
  }

  // Track component render performance
  trackComponentRender(componentName: string, renderTime: number) {
    if (!this.isMonitoring) return;

    let metrics = this.renderMetrics.get(componentName);
    if (!metrics) {
      metrics = {
        componentName,
        renderCount: 0,
        averageRenderTime: 0,
        lastRenderTime: 0
      };
      this.renderMetrics.set(componentName, metrics);
    }

    metrics.renderCount++;
    metrics.lastRenderTime = renderTime;
    metrics.averageRenderTime = 
      (metrics.averageRenderTime * (metrics.renderCount - 1) + renderTime) / metrics.renderCount;

    // Record metric if render time is significant
    if (renderTime > 16) { // More than one frame (60fps)
      this.recordMetric({
        name: `render.slow.${componentName}`,
        value: renderTime,
        timestamp: new Date(),
        tags: { 
          type: 'render',
          component: componentName,
          severity: renderTime > 100 ? 'critical' : renderTime > 50 ? 'warning' : 'info'
        }
      });
    }
  }

  // Get current memory usage
  getMemoryUsage(): MemoryMetrics | null {
    if (typeof window === 'undefined' || !(performance as any).memory) {
      return null;
    }

    const memory = (performance as any).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      timestamp: new Date()
    };
  }

  // Get performance summary
  getPerformanceSummary() {
    const memory = this.getMemoryUsage();
    const recentMetrics = this.metrics.slice(-100); // Last 100 metrics
    
    // Calculate averages
    const timingMetrics = recentMetrics.filter(m => m.tags?.type === 'timing');
    const avgLoadTime = timingMetrics.length > 0
      ? timingMetrics.reduce((sum, m) => sum + m.value, 0) / timingMetrics.length
      : 0;

    // Get slow renders
    const slowRenders = Array.from(this.renderMetrics.values())
      .filter(m => m.averageRenderTime > 16)
      .sort((a, b) => b.averageRenderTime - a.averageRenderTime)
      .slice(0, 5);

    return {
      memory: memory ? {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) // MB
      } : null,
      timing: {
        averageLoadTime: Math.round(avgLoadTime),
        totalMeasurements: timingMetrics.length
      },
      rendering: {
        slowComponents: slowRenders,
        totalComponents: this.renderMetrics.size
      },
      metrics: {
        total: this.metrics.length,
        recent: recentMetrics.length
      }
    };
  }

  // Record a metric
  private recordMetric(metric: PerformanceMetric) {
    this.metricsBuffer.push(metric);
    
    // Keep only recent metrics in memory
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-500);
    }
    
    this.metrics.push(metric);
  }

  // Set up performance observer
  private setupPerformanceObserver() {
    if (!window.PerformanceObserver) return;

    try {
      // Observe navigation timing
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const nav = entry as PerformanceNavigationTiming;
            this.recordMetric({
              name: 'navigation.loadTime',
              value: nav.loadEventEnd - nav.loadEventStart,
              timestamp: new Date(),
              tags: { type: 'navigation' }
            });
          }
        }
      });
      navigationObserver.observe({ entryTypes: ['navigation'] });
      this.observers.add(navigationObserver);
    } catch (error) {
      console.warn('Failed to set up navigation observer:', error);
    }
  }

  // Monitor memory usage
  private startMemoryMonitoring() {
    if (!(performance as any).memory) return;

    const checkMemory = () => {
      if (!this.isMonitoring) return;

      const memory = this.getMemoryUsage();
      if (memory) {
        const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        
        // Alert if memory usage is high
        if (usagePercent > 90) {
          this.recordMetric({
            name: 'memory.high_usage',
            value: usagePercent,
            timestamp: new Date(),
            tags: { 
              type: 'memory',
              severity: 'critical'
            }
          });
        }
      }
    };

    // Check memory every 30 seconds
    setInterval(checkMemory, 30000);
  }

  // Monitor long tasks
  private monitorLongTasks() {
    if (!window.PerformanceObserver) return;

    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric({
            name: 'task.long',
            value: entry.duration,
            timestamp: new Date(),
            tags: { 
              type: 'longtask',
              severity: entry.duration > 100 ? 'critical' : 'warning'
            }
          });
        }
      });
      
      // Note: 'longtask' may not be supported in all browsers
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.add(longTaskObserver);
    } catch (error) {
      console.warn('Long task monitoring not supported:', error);
    }
  }

  // Monitor resource loading
  private monitorResourceLoading() {
    if (!window.PerformanceObserver) return;

    try {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resource = entry as PerformanceResourceTiming;
            
            // Track slow resources
            if (resource.duration > 1000) {
              this.recordMetric({
                name: 'resource.slow',
                value: resource.duration,
                timestamp: new Date(),
                tags: { 
                  type: 'resource',
                  name: resource.name,
                  initiatorType: resource.initiatorType
                }
              });
            }
          }
        }
      });
      
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.add(resourceObserver);
    } catch (error) {
      console.warn('Resource monitoring not supported:', error);
    }
  }

  // Start buffer flushing
  private startBufferFlushing() {
    this.bufferFlushInterval = setInterval(() => {
      if (this.metricsBuffer.length > 0) {
        // In production, send metrics to backend
        console.log('Performance metrics buffer:', this.metricsBuffer);
        this.metricsBuffer = [];
      }
    }, 60000); // Flush every minute
  }

  // Export metrics for analysis
  exportMetrics() {
    return {
      metrics: this.metrics,
      renderMetrics: Array.from(this.renderMetrics.values()),
      summary: this.getPerformanceSummary()
    };
  }

  // Clear all metrics
  clearMetrics() {
    this.metrics = [];
    this.entries.clear();
    this.renderMetrics.clear();
    this.metricsBuffer = [];
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export const usePerformanceMonitor = (componentName: string) => {
  const renderStartTime = performance.now();
  
  // Track render on unmount
  useEffect(() => {
    return () => {
      const renderTime = performance.now() - renderStartTime;
      performanceMonitor.trackComponentRender(componentName, renderTime);
    };
  }, [componentName, renderStartTime]);

  return {
    mark: (name: string) => performanceMonitor.mark(`${componentName}.${name}`),
    measure: (name: string) => performanceMonitor.measure(`${componentName}.${name}`)
  };
};

// Export types
export type { PerformanceMetric, MemoryMetrics, RenderMetrics };

// Helper for React Profiler
export const onRenderCallback = (
  id: string,
  phase: 'mount' | 'update',
  actualDuration: number
) => {
  performanceMonitor.trackComponentRender(id, actualDuration);
};