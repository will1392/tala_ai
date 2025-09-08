/**
 * Feature flags and configuration for optional/non-critical features
 */

export const featureConfig = {
  // Task management system
  tasks: {
    enabled: import.meta.env.VITE_TASKS_ENABLED !== 'false',
    checkInterval: 60000, // 1 minute
    showBanner: import.meta.env.VITE_SHOW_TASK_BANNER !== 'false'
  },
  
  // Email integration
  email: {
    enabled: import.meta.env.VITE_EMAIL_ENABLED !== 'false'
  },
  
  // Analytics and monitoring
  analytics: {
    enabled: import.meta.env.VITE_ANALYTICS_ENABLED === 'true'
  },
  
  // Development features
  debug: {
    enabled: import.meta.env.DEV,
    showApiErrors: import.meta.env.VITE_SHOW_API_ERRORS === 'true'
  }
};

// Helper to check if a feature is enabled
export function isFeatureEnabled(feature: keyof typeof featureConfig): boolean {
  return featureConfig[feature]?.enabled ?? false;
}