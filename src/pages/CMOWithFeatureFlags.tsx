import React, { useState, useEffect } from 'react';
import { NotificationProvider } from '../components/cmo/NotificationSystem';
import CMODashboardEnhanced from './CMODashboardEnhanced';
import { OnboardingFlowEnhanced } from '../components/cmo/OnboardingFlowEnhanced';
import { GuidedTour } from '../components/cmo/GuidedTour';
import { HelpModal } from '../components/cmo/HelpSystem';
import { AchievementsPanel } from '../components/cmo/AchievementDisplay';
import { Trophy, HelpCircle, Play, Sparkles, Flag } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useFeatureFlag, useABTest, featureFlags } from '../services/FeatureFlags';
import { useCMOAnalytics } from '../hooks/useCMOAnalytics';
import ErrorBoundary from '../components/ErrorBoundary';

// CMO Mode with Feature Flags
const CMOWithFeatureFlags: React.FC = () => {
  const userId = 'user-123'; // This should come from auth
  const userContext = {
    plan: 'enterprise',
    role: 'cmo',
    region: 'us'
  };

  // Feature flags
  const cmoEnabled = useFeatureFlag('cmo-mode', userId, userContext);
  const achievementsEnabled = useFeatureFlag('cmo-achievements', userId, userContext);
  const advancedAnalyticsEnabled = useFeatureFlag('cmo-advanced-analytics', userId, userContext);
  const aiInsightsEnabled = useFeatureFlag('cmo-ai-insights', userId, userContext);
  
  // A/B test for onboarding
  const onboardingVariant = useABTest('cmo-onboarding-v2', userId);

  // Analytics
  const { trackFeature, trackInteraction } = useCMOAnalytics();

  // State
  const [showOnboarding, setShowOnboarding] = useLocalStorage('cmo-show-onboarding', true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useLocalStorage('cmo-seen-onboarding', false);
  const [showHelp, setShowHelp] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [showFeatureFlags, setShowFeatureFlags] = useState(false);

  // Check if CMO mode is enabled
  if (!cmoEnabled) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">CMO Mode Coming Soon</h1>
          <p className="text-gray-600 dark:text-gray-400">
            This feature is being rolled out gradually. Check back soon!
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    // Track feature view
    trackFeature('cmo_mode_viewed', { variant: onboardingVariant });

    // Show onboarding based on variant
    if (!hasSeenOnboarding && onboardingVariant === 'enhanced') {
      setShowOnboarding(true);
    }
  }, [hasSeenOnboarding, onboardingVariant, trackFeature]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setHasSeenOnboarding(true);
    trackInteraction('onboarding_completed', { variant: onboardingVariant });
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
    setHasSeenOnboarding(true);
    trackInteraction('onboarding_skipped', { variant: onboardingVariant });
  };

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Main Dashboard */}
        <ErrorBoundary name="CMODashboardEnhanced">
          <CMODashboardEnhanced />
        </ErrorBoundary>

        {/* Control Buttons - Always Visible */}
        <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
          {achievementsEnabled && (
            <motion.button
              onClick={() => {
                setShowAchievements(!showAchievements);
                setShowHelp(false);
                setShowTour(false);
                trackInteraction('achievements_opened');
              }}
              className="bg-white dark:bg-gray-800 shadow-lg rounded-full p-3 hover:scale-105 transition-transform"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="View achievements"
            >
              <Trophy className="w-5 h-5 text-yellow-500" />
            </motion.button>
          )}
          
          <motion.button
            onClick={() => {
              setShowHelp(!showHelp);
              setShowAchievements(false);
              setShowTour(false);
              trackInteraction('help_opened');
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
              trackInteraction('tour_started');
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
              setShowOnboarding(true);
              setShowHelp(false);
              setShowAchievements(false);
              setShowTour(false);
              trackInteraction('onboarding_restarted');
            }}
            className="bg-white dark:bg-gray-800 shadow-lg rounded-full p-3 hover:scale-105 transition-transform"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="View onboarding"
          >
            <Sparkles className="w-5 h-5 text-purple-500" />
          </motion.button>

          {/* Feature Flags Debug Button (dev only) */}
          {process.env.NODE_ENV === 'development' && (
            <motion.button
              onClick={() => setShowFeatureFlags(!showFeatureFlags)}
              className="bg-gray-600 text-white shadow-lg rounded-full p-3 hover:scale-105 transition-transform"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Feature flags"
            >
              <Flag className="w-5 h-5" />
            </motion.button>
          )}
        </div>

        {/* Quick Actions Panel */}
        <div className="fixed bottom-6 left-6 z-40">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
            <h4 className="text-sm font-semibold mb-2">Quick Actions</h4>
            <div className="space-y-2">
              <button 
                onClick={() => {
                  setHasSeenOnboarding(false);
                  setShowOnboarding(true);
                }}
                className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1 w-full text-left"
              >
                <Sparkles className="w-4 h-4" />
                Restart Onboarding
              </button>
              <button 
                onClick={() => {
                  localStorage.removeItem('cmo-show-onboarding');
                  localStorage.removeItem('cmo-seen-onboarding');
                  localStorage.removeItem('cmo-tour-completed');
                  window.location.reload();
                }}
                className="text-sm text-gray-600 hover:text-gray-700 w-full text-left"
              >
                Reset All Settings
              </button>
            </div>
          </div>
        </div>

        {/* Modals and Overlays */}
        {showOnboarding && (
          <ErrorBoundary name="OnboardingFlowEnhanced">
            <OnboardingFlowEnhanced
              onComplete={handleOnboardingComplete}
              onSkip={handleOnboardingSkip}
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
            />
          </ErrorBoundary>
        )}

        {showAchievements && achievementsEnabled && (
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

        {/* Feature Flags Panel (dev only) */}
        {showFeatureFlags && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Feature Flags</h2>
              <div className="space-y-3">
                {featureFlags.getAllFlags().map(flag => (
                  <div key={flag.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <div>
                      <p className="font-medium">{flag.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Rollout: {flag.rolloutPercentage}%
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded ${flag.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {flag.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <button
                        onClick={() => {
                          featureFlags.setUserOverride(userId, flag.name, !featureFlags.isEnabled(flag.name, userId));
                          window.location.reload();
                        }}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Toggle
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowFeatureFlags(false)}
                className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Status Badge with Feature Info */}
        <div className="fixed top-4 right-4 z-30 bg-gradient-to-r from-teal-500 to-teal-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
          ✨ CMO Mode Active
          {advancedAnalyticsEnabled && <span className="ml-2 text-xs opacity-80">• Advanced Analytics</span>}
          {aiInsightsEnabled && <span className="ml-2 text-xs opacity-80">• AI Insights</span>}
        </div>
      </div>
    </NotificationProvider>
  );
};

export default CMOWithFeatureFlags;