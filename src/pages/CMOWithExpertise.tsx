import React, { useState, useEffect } from 'react';
import { NotificationProvider } from '../components/cmo/NotificationSystem';
import CMODashboardEnhanced from './CMODashboardEnhanced';
import { OnboardingFlowEnhanced } from '../components/cmo/OnboardingFlowEnhanced';
import { GuidedTour } from '../components/cmo/GuidedTourWorking';
import { HelpModal } from '../components/cmo/HelpSystem';
import { AchievementsPanel } from '../components/cmo/AchievementDisplay';
import { ExpertiseOnboarding } from '../components/expertise/ExpertiseOnboarding';
import { Trophy, HelpCircle, Play, Sparkles, Brain } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useExpertiseAdaptation } from '../hooks/useExpertiseAdaptation';
import { useExpertiseLearning } from '../hooks/useExpertiseLearning';
import { useExpertiseProfiles } from '../hooks/useExpertiseProfiles';
import { LearningInsightsComponent } from '../components/expertise/LearningInsights';
import { ExpertiseProfileDashboard } from '../components/expertise/ExpertiseProfileDashboard';
import { expertiseLearningService } from '../services/expertiseLearningService';
import ErrorBoundary from '../components/ErrorBoundary';

// CMO Mode with Expertise-based Onboarding
const CMOWithExpertise: React.FC = () => {
  const { 
    expertiseLevel, 
    loading: expertiseLoading, 
    showOnboarding: showExpertiseOnboarding,
    updateExpertise,
    checkReassessment
  } = useExpertiseAdaptation();

  const {
    insights,
    loading: learningLoading,
    hasAdjustmentSuggestion,
    adjustmentSuggestion,
    refreshInsights
  } = useExpertiseLearning();

  const {
    profile: expertiseProfile,
    summary: expertiseSummary,
    loading: profileLoading,
    createProfile,
    refreshProfile
  } = useExpertiseProfiles();

  const [showCMOOnboarding, setShowCMOOnboarding] = useLocalStorage('cmo-show-onboarding', true);
  const [hasSeenCMOOnboarding, setHasSeenCMOOnboarding] = useLocalStorage('cmo-seen-onboarding', false);
  const [showHelp, setShowHelp] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [showLearningInsights, setShowLearningInsights] = useState(false);
  const [showExpertiseProfile, setShowExpertiseProfile] = useState(false);
  const userId = 'user-123'; // This should come from auth

  useEffect(() => {
    // Check if reassessment is needed periodically
    checkReassessment();
  }, [checkReassessment]);

  useEffect(() => {
    // Show CMO onboarding after expertise assessment
    if (!expertiseLoading && expertiseLevel && !hasSeenCMOOnboarding) {
      setShowCMOOnboarding(true);
    }
  }, [expertiseLoading, expertiseLevel, hasSeenCMOOnboarding]);

  const handleExpertiseComplete = async (expertise: any) => {
    updateExpertise(expertise);
    
    // Create detailed profile from assessment
    try {
      await createProfile(expertise);
    } catch (error) {
      console.error('Error creating detailed profile:', error);
    }
    
    // After expertise assessment, show CMO onboarding
    if (!hasSeenCMOOnboarding) {
      setShowCMOOnboarding(true);
    }
  };

  const handleCMOOnboardingComplete = () => {
    setShowCMOOnboarding(false);
    setHasSeenCMOOnboarding(true);
  };

  const handleCMOOnboardingSkip = () => {
    setShowCMOOnboarding(false);
    setHasSeenCMOOnboarding(true);
  };

  const handleApplyAdjustment = async (adjustment: any) => {
    try {
      const result = await expertiseLearningService.applyAdjustment(adjustment);
      if (result.success) {
        // Refresh expertise level and insights
        await updateExpertise({
          level: result.newLevel,
          confidence: adjustment.confidence,
          areas: {},
          communicationStyle: result.newLevel === 'beginner' ? 'simple' : 
                             result.newLevel === 'expert' ? 'technical' : 'balanced'
        });
        await refreshInsights();
      }
    } catch (error) {
      console.error('Error applying adjustment:', error);
    }
  };

  const handleDismissAdjustment = () => {
    // Clear the adjustment suggestion
    // This would typically be handled by the learning service
  };

  // Show loading while checking expertise
  if (expertiseLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your personalized experience...</p>
        </div>
      </div>
    );
  }

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Main Dashboard */}
        <ErrorBoundary name="CMODashboardEnhanced">
          <CMODashboardEnhanced />
        </ErrorBoundary>

        {/* Expertise Level Indicator with Learning Badge */}
        {expertiseLevel && (
          <div className="fixed top-4 left-4 z-30 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Your Level</p>
                <p className="font-semibold capitalize">{expertiseLevel.level}</p>
              </div>
              {hasAdjustmentSuggestion && (
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              )}
            </div>
            <div className="mt-2 space-y-1">
              <button
                onClick={() => setShowLearningInsights(true)}
                className="block text-xs text-purple-600 hover:text-purple-700"
              >
                View Learning Progress
              </button>
              <button
                onClick={() => setShowExpertiseProfile(true)}
                className="block text-xs text-blue-600 hover:text-blue-700"
              >
                Detailed Profile
              </button>
            </div>
          </div>
        )}

        {/* Control Buttons - Always Visible */}
        <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
          <motion.button
            onClick={() => {
              setShowAchievements(!showAchievements);
              setShowHelp(false);
              setShowTour(false);
            }}
            className="bg-white dark:bg-gray-800 shadow-lg rounded-full p-3 hover:scale-105 transition-transform"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="View achievements"
          >
            <Trophy className="w-5 h-5 text-yellow-500" />
          </motion.button>
          
          <motion.button
            onClick={() => {
              setShowHelp(!showHelp);
              setShowAchievements(false);
              setShowTour(false);
            }}
            className="bg-white dark:bg-gray-800 shadow-lg rounded-full p-3 hover:scale-105 transition-transform"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Get help"
          >
            <HelpCircle className="w-5 h-5 text-blue-500" />
          </motion.button>
          
          <motion.button
            onClick={() => {
              setShowTour(!showTour);
              setShowHelp(false);
              setShowAchievements(false);
            }}
            className="bg-teal-500 text-white shadow-lg rounded-full p-3 hover:scale-105 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Take a guided tour"
          >
            <Play className="w-5 h-5" />
          </motion.button>
          
          <motion.button
            onClick={() => {
              setShowCMOOnboarding(true);
              setShowHelp(false);
              setShowAchievements(false);
              setShowTour(false);
            }}
            className="bg-white dark:bg-gray-800 shadow-lg rounded-full p-3 hover:scale-105 transition-transform"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="View onboarding"
          >
            <Sparkles className="w-5 h-5 text-purple-500" />
          </motion.button>
        </div>

        {/* Quick Actions Panel */}
        <div className="fixed bottom-6 left-6 z-40">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
            <h4 className="text-sm font-semibold mb-2">Quick Actions</h4>
            <div className="space-y-2">
              <button 
                onClick={() => {
                  setHasSeenCMOOnboarding(false);
                  setShowCMOOnboarding(true);
                }}
                className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1 w-full text-left"
              >
                <Sparkles className="w-4 h-4" />
                Restart CMO Tour
              </button>
              <button 
                onClick={() => {
                  localStorage.removeItem('cmo-expertise-level');
                  window.location.reload();
                }}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 w-full text-left"
              >
                <Brain className="w-4 h-4" />
                Retake Expertise Assessment
              </button>
              <button 
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="text-sm text-gray-600 hover:text-gray-700 w-full text-left"
              >
                Reset Everything
              </button>
            </div>
          </div>
        </div>

        {/* Modals and Overlays */}
        
        {/* Expertise Onboarding - Shows first for new users */}
        {showExpertiseOnboarding && (
          <ExpertiseOnboarding
            onComplete={handleExpertiseComplete}
            onSkip={() => handleExpertiseComplete({
              level: 'beginner',
              confidence: 0.5,
              areas: {},
              communicationStyle: 'simple'
            })}
          />
        )}

        {/* CMO Onboarding - Shows after expertise assessment */}
        {showCMOOnboarding && !showExpertiseOnboarding && (
          <ErrorBoundary name="OnboardingFlowEnhanced">
            <OnboardingFlowEnhanced
              onComplete={handleCMOOnboardingComplete}
              onSkip={handleCMOOnboardingSkip}
            />
          </ErrorBoundary>
        )}

        {showTour && (
          <ErrorBoundary name="GuidedTour">
            <GuidedTour
              onComplete={() => setShowTour(false)}
              onSkip={() => setShowTour(false)}
            />
          </ErrorBoundary>
        )}

        {showHelp && (
          <ErrorBoundary name="HelpModal">
            <HelpModal
              context="CMO Dashboard"
              onClose={() => setShowHelp(false)}
              expertiseLevel={expertiseLevel?.level}
            />
          </ErrorBoundary>
        )}

        {showAchievements && (
          <ErrorBoundary name="AchievementsPanel">
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto"
              onClick={() => setShowAchievements(false)}
            >
              <div 
                className="max-w-6xl w-full my-8"
                onClick={(e) => e.stopPropagation()}
              >
                <AchievementsPanel
                  userId={userId}
                  onClose={() => setShowAchievements(false)}
                />
              </div>
            </div>
          </ErrorBoundary>
        )}

        {/* Learning Insights Modal */}
        {showLearningInsights && (
          <ErrorBoundary name="LearningInsights">
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto"
              onClick={() => setShowLearningInsights(false)}
            >
              <div 
                className="max-w-4xl w-full my-8"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl">
                  <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Learning Insights & Progress
                    </h2>
                    <button
                      onClick={() => setShowLearningInsights(false)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="p-6">
                    <LearningInsightsComponent
                      insights={insights}
                      adjustmentSuggestion={adjustmentSuggestion}
                      onApplyAdjustment={handleApplyAdjustment}
                      onDismissAdjustment={handleDismissAdjustment}
                      loading={learningLoading}
                    />
                  </div>
                </div>
              </div>
            </div>
          </ErrorBoundary>
        )}

        {/* Expertise Profile Modal */}
        {showExpertiseProfile && (
          <ErrorBoundary name="ExpertiseProfileDashboard">
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto"
              onClick={() => setShowExpertiseProfile(false)}
            >
              <div 
                className="max-w-6xl w-full my-8"
                onClick={(e) => e.stopPropagation()}
              >
                <ExpertiseProfileDashboard
                  userId={userId}
                  onClose={() => setShowExpertiseProfile(false)}
                />
              </div>
            </div>
          </ErrorBoundary>
        )}

        {/* Status Badge */}
        <div className="fixed top-4 right-4 z-30 bg-gradient-to-r from-teal-500 to-teal-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
          ✨ CMO Mode Active
          {expertiseLevel && (
            <span className="ml-2 text-xs opacity-80">
              • Personalized for {expertiseLevel.level}s
            </span>
          )}
        </div>
      </div>
    </NotificationProvider>
  );
};

export default CMOWithExpertise;