import { useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

interface OnboardingState {
  completed: boolean;
  skipped: boolean;
  completedAt?: string;
  userData?: any;
}

export const useCMOOnboarding = () => {
  const [onboardingState, setOnboardingState] = useLocalStorage<OnboardingState>(
    'cmo-onboarding-state',
    {
      completed: false,
      skipped: false
    }
  );
  
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check if onboarding should be shown
    if (!onboardingState.completed && !onboardingState.skipped) {
      // Check if this is the first time accessing CMO mode
      const hasCMOAccess = localStorage.getItem('cmo-mode-accessed');
      if (!hasCMOAccess) {
        setShowOnboarding(true);
        localStorage.setItem('cmo-mode-accessed', 'true');
      }
    }
  }, [onboardingState]);

  const completeOnboarding = useCallback((userData?: any) => {
    setOnboardingState({
      completed: true,
      skipped: false,
      completedAt: new Date().toISOString(),
      userData
    });
    setShowOnboarding(false);
  }, [setOnboardingState]);

  const skipOnboarding = useCallback(() => {
    setOnboardingState({
      ...onboardingState,
      skipped: true
    });
    setShowOnboarding(false);
  }, [onboardingState, setOnboardingState]);

  const resetOnboarding = useCallback(() => {
    setOnboardingState({
      completed: false,
      skipped: false
    });
    localStorage.removeItem('cmo-mode-accessed');
    setShowOnboarding(true);
  }, [setOnboardingState]);

  const shouldShowOnboarding = showOnboarding || 
    (!onboardingState.completed && !onboardingState.skipped);

  return {
    shouldShowOnboarding,
    onboardingState,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
    showOnboarding: () => setShowOnboarding(true)
  };
};