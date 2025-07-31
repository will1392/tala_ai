import { useEffect, useCallback } from 'react';
import { cmoAnalytics } from '../services/analytics/CMOAnalytics';

export const useCMOAnalytics = () => {
  // Track component mount
  useEffect(() => {
    cmoAnalytics.trackEvent('cmo_mode_viewed', 'feature');
  }, []);

  // Track feature usage
  const trackFeature = useCallback((featureName: string, properties?: Record<string, any>) => {
    cmoAnalytics.trackEvent(featureName, 'feature', properties);
  }, []);

  // Track user interactions
  const trackInteraction = useCallback((action: string, properties?: Record<string, any>) => {
    cmoAnalytics.trackEvent(action, 'interaction', properties);
  }, []);

  // Track journey steps
  const startJourney = useCallback((journeyName: string) => {
    cmoAnalytics.startJourney(journeyName);
  }, []);

  const addJourneyStep = useCallback((journeyName: string, stepName: string, metadata?: Record<string, any>) => {
    cmoAnalytics.addJourneyStep(journeyName, stepName, metadata);
  }, []);

  const completeJourney = useCallback((journeyName: string) => {
    cmoAnalytics.completeJourney(journeyName);
  }, []);

  // Track performance
  const trackPerformance = useCallback((metricName: string, value: number, unit: 'ms' | 'bytes' | 'count', context?: Record<string, any>) => {
    cmoAnalytics.trackPerformance(metricName, value, unit, context);
  }, []);

  // Track errors
  const trackError = useCallback((error: any) => {
    cmoAnalytics.trackError(error);
  }, []);

  return {
    trackFeature,
    trackInteraction,
    startJourney,
    addJourneyStep,
    completeJourney,
    trackPerformance,
    trackError
  };
};