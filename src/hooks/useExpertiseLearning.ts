/**
 * Hook for expertise learning and dynamic adjustment
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { expertiseLearningService, InteractionData, LearningInsights } from '../services/expertiseLearningService';

interface UseExpertiseLearningReturn {
  insights: LearningInsights | null;
  loading: boolean;
  trackInteraction: (interaction: InteractionData) => Promise<void>;
  trackMessage: (userMessage: string, botResponse: string, context?: any) => Promise<void>;
  trackTaskCompletion: (task: string, success: boolean, timeToComplete: number) => Promise<void>;
  checkForAdjustment: () => Promise<void>;
  refreshInsights: () => Promise<void>;
  hasAdjustmentSuggestion: boolean;
  adjustmentSuggestion: any;
}

export const useExpertiseLearning = (): UseExpertiseLearningReturn => {
  const { user } = useAuthStore();
  const [insights, setInsights] = useState<LearningInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [adjustmentSuggestion, setAdjustmentSuggestion] = useState<any>(null);
  
  // Track interaction counts to trigger periodic checks
  const interactionCount = useRef(0);
  const lastAdjustmentCheck = useRef<Date | null>(null);

  // Load insights on component mount
  useEffect(() => {
    if (user?.id) {
      refreshInsights();
    }
  }, [user?.id]);

  // Refresh insights from server
  const refreshInsights = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const newInsights = await expertiseLearningService.getLearningInsights(user.id);
      setInsights(newInsights);
    } catch (error) {
      console.error('Error refreshing insights:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Track interaction and handle learning
  const trackInteraction = useCallback(async (interaction: InteractionData) => {
    if (!user?.id) return;

    try {
      const result = await expertiseLearningService.trackInteraction(interaction);
      
      // Increment interaction counter
      interactionCount.current++;
      
      // Check for adjustment if we have enough interactions
      if (result.adjustment?.needed) {
        setAdjustmentSuggestion(result.adjustment);
      }
      
      // Refresh insights every 5 interactions
      if (interactionCount.current % 5 === 0) {
        await refreshInsights();
      }
      
      return result;
    } catch (error) {
      console.error('Error tracking interaction:', error);
    }
  }, [user?.id, refreshInsights]);

  // Track message with automatic analysis
  const trackMessage = useCallback(async (
    userMessage: string, 
    botResponse: string, 
    context: any = {}
  ) => {
    if (!user?.id) return;

    // Analyze message for signals
    const signals = expertiseLearningService.analyzeMessageForSignals(userMessage);
    
    const interaction: InteractionData = {
      message: userMessage,
      response: botResponse,
      topic: context.topic || 'general',
      type: 'message',
      duration: context.duration || 0,
      success: !signals.hasConfusionSignals, // Assume success unless confusion detected
      metadata: {
        hasConfusionSignals: signals.hasConfusionSignals,
        hasMasterySignals: signals.hasMasterySignals,
        confusionPhrases: signals.confusionPhrases,
        masteryPhrases: signals.masteryPhrases,
        messageLength: userMessage.length,
        responseLength: botResponse.length,
        ...context
      }
    };

    await trackInteraction(interaction);
  }, [trackInteraction, user?.id]);

  // Track task completion
  const trackTaskCompletion = useCallback(async (
    task: string,
    success: boolean,
    timeToComplete: number
  ) => {
    if (!user?.id) return;

    const interaction: InteractionData = {
      message: `Completed task: ${task}`,
      type: 'completion',
      success,
      duration: timeToComplete,
      topic: 'task-completion',
      metadata: {
        task,
        timeToComplete,
        completionRate: success ? 1 : 0
      }
    };

    await trackInteraction(interaction);
  }, [trackInteraction, user?.id]);

  // Check for adjustment suggestion
  const checkForAdjustment = useCallback(async () => {
    if (!user?.id) return;

    // Don't check too frequently
    const now = new Date();
    if (lastAdjustmentCheck.current && 
        now.getTime() - lastAdjustmentCheck.current.getTime() < 5 * 60 * 1000) {
      return; // Wait at least 5 minutes between checks
    }

    try {
      const adjustment = await expertiseLearningService.checkAdjustment(user.id);
      
      if (adjustment.needed && adjustment.confidence && adjustment.confidence > 0.7) {
        setAdjustmentSuggestion(adjustment);
      }
      
      lastAdjustmentCheck.current = now;
    } catch (error) {
      console.error('Error checking for adjustment:', error);
    }
  }, [user?.id]);

  // Auto-check for adjustments periodically
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      checkForAdjustment();
    }, 10 * 60 * 1000); // Check every 10 minutes

    return () => clearInterval(interval);
  }, [user?.id, checkForAdjustment]);

  return {
    insights,
    loading,
    trackInteraction,
    trackMessage,
    trackTaskCompletion,
    checkForAdjustment,
    refreshInsights,
    hasAdjustmentSuggestion: !!adjustmentSuggestion,
    adjustmentSuggestion
  };
};

// Simplified hook for basic tracking
export const useInteractionTracking = () => {
  const { trackMessage, trackTaskCompletion } = useExpertiseLearning();
  
  return {
    trackMessage,
    trackTaskCompletion
  };
};