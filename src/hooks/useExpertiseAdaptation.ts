import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { expertiseService, ExpertiseLevel } from '../services/expertiseService';

interface UseExpertiseAdaptationReturn {
  expertiseLevel: ExpertiseLevel | null;
  loading: boolean;
  showOnboarding: boolean;
  adaptResponse: (response: string, context?: any) => Promise<string>;
  updateExpertise: (newLevel: ExpertiseLevel) => void;
  trackProgress: (area: string, action: any) => void;
  checkReassessment: () => Promise<void>;
}

export const useExpertiseAdaptation = (): UseExpertiseAdaptationReturn => {
  const { user } = useAuthStore();
  const [expertiseLevel, setExpertiseLevel] = useState<ExpertiseLevel | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadUserExpertise();
    }
  }, [user?.id]);

  const loadUserExpertise = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const expertise = await expertiseService.getUserExpertise(user.id);
      
      if (expertise) {
        setExpertiseLevel(expertise);
        setShowOnboarding(false);
      } else {
        // No expertise assessment found, show onboarding
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('Error loading user expertise:', error);
      setShowOnboarding(true);
    } finally {
      setLoading(false);
    }
  };

  const adaptResponse = useCallback(async (
    response: string, 
    context?: {
      topic?: string;
      includeSteps?: boolean;
      hasData?: boolean;
    }
  ): Promise<string> => {
    if (!user?.id || !expertiseLevel) {
      return response;
    }

    try {
      const adaptedResponse = await expertiseService.getAdaptedResponse(
        user.id,
        response,
        context
      );
      return adaptedResponse;
    } catch (error) {
      console.error('Error adapting response:', error);
      return response;
    }
  }, [user?.id, expertiseLevel]);

  const updateExpertise = useCallback((newLevel: ExpertiseLevel) => {
    setExpertiseLevel(newLevel);
    setShowOnboarding(false);
  }, []);

  const trackProgress = useCallback(async (area: string, action: any) => {
    if (!user?.id) return;

    try {
      await expertiseService.trackProgress(user.id, area, action);
    } catch (error) {
      console.error('Error tracking progress:', error);
    }
  }, [user?.id]);

  const checkReassessment = useCallback(async () => {
    if (!user?.id) return;

    try {
      const result = await expertiseService.checkReassessmentNeeded(user.id);
      if (result.needed) {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('Error checking reassessment:', error);
    }
  }, [user?.id]);

  return {
    expertiseLevel,
    loading,
    showOnboarding,
    adaptResponse,
    updateExpertise,
    trackProgress,
    checkReassessment
  };
};

// Helper hook for quick expertise checks
export const useExpertiseLevel = () => {
  const { expertiseLevel } = useExpertiseAdaptation();
  
  return {
    level: expertiseLevel?.level || 'beginner',
    isBeginnerLevel: expertiseLevel?.level === 'beginner',
    isIntermediateLevel: expertiseLevel?.level === 'intermediate',
    isAdvancedLevel: expertiseLevel?.level === 'advanced',
    isExpertLevel: expertiseLevel?.level === 'expert',
    communicationStyle: expertiseLevel?.communicationStyle || 'simple'
  };
};