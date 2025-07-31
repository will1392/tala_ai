import React, { useState, useEffect } from 'react';
import { NotificationProvider } from '../components/cmo/NotificationSystem';
import CMODashboardEnhanced from './CMODashboardEnhanced';
import { OnboardingFlowEnhanced } from '../components/cmo/OnboardingFlowEnhanced';
import { GuidedTour } from '../components/cmo/GuidedTour';
import { HelpModal } from '../components/cmo/HelpSystem';
import { AchievementsPanel } from '../components/cmo/AchievementDisplay';
import { Trophy, HelpCircle, Play, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocalStorage } from '../hooks/useLocalStorage';
import ErrorBoundary from '../components/ErrorBoundary';

// Full CMO Mode with all functionality
const CMOFull: React.FC = () => {
  const [showOnboarding, setShowOnboarding] = useLocalStorage('cmo-show-onboarding', true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useLocalStorage('cmo-seen-onboarding', false);
  const [showHelp, setShowHelp] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const userId = 'user-123'; // This should come from auth

  useEffect(() => {
    // Show onboarding on first visit
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, [hasSeenOnboarding]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setHasSeenOnboarding(true);
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
    setHasSeenOnboarding(true);
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
              setShowOnboarding(true);
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

        {/* Status Badge */}
        <div className="fixed top-4 right-4 z-30 bg-gradient-to-r from-teal-500 to-teal-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
          ✨ CMO Mode Active
        </div>
      </div>
    </NotificationProvider>
  );
};

export default CMOFull;