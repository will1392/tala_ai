import React, { useEffect, useState } from 'react';
import CMODashboardEnhanced from '../../pages/CMODashboardEnhanced';
import GuidedTour, { CMO_TOURS, TourTrigger, TourStyles, useTourManager } from './GuidedTour';
import { HelpButton, HelpModal } from './HelpSystem';
import { OnboardingFlowEnhanced } from './OnboardingFlowEnhanced';
import { AchievementsPanel, useAchievements } from './AchievementDisplay';
import { Info, Play, HelpCircle, Trophy, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { useLocalStorage } from '../../hooks/useLocalStorage';

export const CMODashboardWithTour: React.FC = () => {
  const { activeTour, startTour, completeTour, isTourCompleted } = useTourManager();
  const [showTourPrompt, setShowTourPrompt] = useState(false);
  const [showOnboarding, setShowOnboarding] = useLocalStorage('cmo-show-onboarding', false);
  const [showHelp, setShowHelp] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useLocalStorage('cmo-onboarding-completed', false);
  const userId = 'user-123'; // This should come from your auth system
  const { trackAction, showNotification, clearNotification } = useAchievements(userId);

  useEffect(() => {
    // Check if this is user's first time on CMO dashboard
    const hasSeenDashboard = localStorage.getItem('cmo-dashboard-visited');
    if (!hasSeenDashboard) {
      if (!hasCompletedOnboarding) {
        setShowOnboarding(true);
      } else if (!isTourCompleted('dashboard')) {
        setShowTourPrompt(true);
      }
      localStorage.setItem('cmo-dashboard-visited', 'true');
    }
  }, [isTourCompleted, hasCompletedOnboarding]);

  const handleStartTour = () => {
    setShowTourPrompt(false);
    startTour(CMO_TOURS.dashboard);
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setHasCompletedOnboarding(true);
    // Track achievement for completing onboarding
    trackAction({
      type: 'onboarding_completed',
      data: { timestamp: new Date() }
    });
    // Show tour prompt after onboarding
    if (!isTourCompleted('dashboard')) {
      setShowTourPrompt(true);
    }
  };

  return (
    <>
      <TourStyles />
      
      {/* Control Panel - Fixed position */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
        {/* Achievement Button */}
        <motion.button
          onClick={() => setShowAchievements(true)}
          className="bg-white dark:bg-gray-800 shadow-lg rounded-full p-3 hover:scale-105 transition-transform group"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="View achievements"
        >
          <Trophy className="w-5 h-5 text-yellow-500 group-hover:text-yellow-600" />
        </motion.button>
        
        {/* Help Button */}
        <motion.button
          onClick={() => setShowHelp(true)}
          className="bg-white dark:bg-gray-800 shadow-lg rounded-full p-3 hover:scale-105 transition-transform"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Get help"
        >
          <HelpCircle className="w-5 h-5 text-blue-500" />
        </motion.button>
        
        {/* Tour Button */}
        <motion.button
          onClick={() => startTour(CMO_TOURS.dashboard)}
          className={cn(
            "bg-primary text-white shadow-lg rounded-full p-3 hover:scale-105 transition-all",
            "flex items-center gap-2",
            activeTour && "opacity-50 pointer-events-none"
          )}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Take a guided tour"
        >
          <Play className="w-5 h-5" />
        </motion.button>
        
        {/* Onboarding Button (if skipped) */}
        {hasCompletedOnboarding && (
          <motion.button
            onClick={() => setShowOnboarding(true)}
            className="bg-white dark:bg-gray-800 shadow-lg rounded-full p-3 hover:scale-105 transition-transform"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="View onboarding again"
          >
            <Sparkles className="w-5 h-5 text-purple-500" />
          </motion.button>
        )}
      </div>

      {/* Tour Prompt */}
      {showTourPrompt && !activeTour && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 max-w-md"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Info className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">Welcome to CMO Dashboard!</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Would you like a quick tour to learn about all the features?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleStartTour}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Start Tour
                </button>
                <button
                  onClick={() => setShowTourPrompt(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Dashboard with tour target elements */}
      <div className="relative">
        {/* Add classes for tour targets */}
        <div className="metric-cards">
          <CMODashboardEnhanced />
        </div>
      </div>

      {/* Active Tour */}
      {activeTour && (
        <GuidedTour
          tour={activeTour}
          onComplete={() => completeTour(activeTour.id)}
          onSkip={() => completeTour(activeTour.id)}
        />
      )}

      {/* Tour Status Badge */}
      <div className="fixed bottom-6 left-6 z-40">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
          <h4 className="text-sm font-semibold mb-2">Quick Actions</h4>
          <div className="space-y-2">
            <TourTrigger tourId="dashboard" className="text-sm hover:text-primary">
              <span>Dashboard Tour</span>
            </TourTrigger>
            <TourTrigger tourId="tools" className="text-sm hover:text-primary">
              <span>Tools Tour</span>
            </TourTrigger>
            <TourTrigger tourId="workflow" className="text-sm hover:text-primary">
              <span>Workflow Tour</span>
            </TourTrigger>
            <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowOnboarding(true)}
                className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                <Sparkles className="w-4 h-4" />
                View Onboarding
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {/* Onboarding Flow */}
        {showOnboarding && (
          <OnboardingFlowEnhanced
            onComplete={handleOnboardingComplete}
            onSkip={() => setShowOnboarding(false)}
          />
        )}

        {/* Help Modal */}
        {showHelp && (
          <HelpModal
            context="CMO Dashboard"
            onClose={() => setShowHelp(false)}
          />
        )}

        {/* Achievements Panel */}
        {showAchievements && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowAchievements(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <AchievementsPanel
                userId={userId}
                onClose={() => setShowAchievements(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Quick Tour Component for reuse
export const QuickTourButton: React.FC<{
  tourId: keyof typeof CMO_TOURS;
  label?: string;
  className?: string;
}> = ({ tourId, label, className }) => {
  const { startTour, isTourCompleted } = useTourManager();
  const tour = CMO_TOURS[tourId];

  if (!tour) return null;

  return (
    <button
      onClick={() => startTour(tour)}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg",
        "bg-primary/10 text-primary hover:bg-primary/20 transition-colors",
        className
      )}
    >
      <HelpCircle className="w-4 h-4" />
      <span>{label || `Take ${tour.name}`}</span>
      {isTourCompleted(tourId) && (
        <span className="text-xs text-green-600">✓</span>
      )}
    </button>
  );
};

export default CMODashboardWithTour;