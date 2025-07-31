import React, { useState, useEffect } from 'react';
import CMODashboardEnhanced from './CMODashboardEnhanced';
import { NotificationProvider } from '../components/cmo/NotificationSystem';
import { OnboardingFlowEnhanced } from '../components/cmo/OnboardingFlowEnhanced';
import { HelpModal } from '../components/cmo/HelpSystem';
import { motion } from 'framer-motion';
import { Trophy, HelpCircle, Play, Sparkles } from 'lucide-react';

// Simplified CMO Mode without complex hooks to avoid render loops
const CMOSimple: React.FC = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [hasVisited, setHasVisited] = useState(false);

  useEffect(() => {
    // Simple check for first visit
    const visited = localStorage.getItem('cmo-simple-visited');
    if (!visited) {
      setShowOnboarding(true);
      localStorage.setItem('cmo-simple-visited', 'true');
    } else {
      setHasVisited(true);
    }
  }, []);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setHasVisited(true);
  };

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Main Dashboard */}
        <CMODashboardEnhanced />

        {/* Control Buttons */}
        <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
          <motion.button
            onClick={() => alert('Achievements coming soon!')}
            className="bg-white dark:bg-gray-800 shadow-lg rounded-full p-3 hover:scale-105 transition-transform"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="View achievements"
          >
            <Trophy className="w-5 h-5 text-yellow-500" />
          </motion.button>
          
          <motion.button
            onClick={() => setShowHelp(true)}
            className="bg-white dark:bg-gray-800 shadow-lg rounded-full p-3 hover:scale-105 transition-transform"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Get help"
          >
            <HelpCircle className="w-5 h-5 text-blue-500" />
          </motion.button>
          
          <motion.button
            onClick={() => alert('Guided tour coming soon!')}
            className="bg-teal-500 text-white shadow-lg rounded-full p-3 hover:scale-105 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Take a guided tour"
          >
            <Play className="w-5 h-5" />
          </motion.button>
          
          {hasVisited && (
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

        {/* Quick Actions Panel */}
        <div className="fixed bottom-6 left-6 z-40">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
            <h4 className="text-sm font-semibold mb-2">Quick Actions</h4>
            <div className="space-y-2">
              <button 
                onClick={() => setShowOnboarding(true)}
                className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1 w-full text-left"
              >
                <Sparkles className="w-4 h-4" />
                View Onboarding
              </button>
              <button 
                onClick={() => {
                  localStorage.removeItem('cmo-simple-visited');
                  window.location.reload();
                }}
                className="text-sm text-gray-600 hover:text-gray-700 w-full text-left"
              >
                Reset to First Visit
              </button>
            </div>
          </div>
        </div>

        {/* Modals */}
        {showOnboarding && (
          <OnboardingFlowEnhanced
            onComplete={handleOnboardingComplete}
            onSkip={() => setShowOnboarding(false)}
          />
        )}

        {showHelp && (
          <HelpModal
            context="CMO Dashboard"
            onClose={() => setShowHelp(false)}
          />
        )}

        {/* Status Badge */}
        <div className="fixed top-4 right-4 z-30 bg-teal-500 text-white px-3 py-1 rounded-full text-xs">
          CMO Mode Active
        </div>
      </div>
    </NotificationProvider>
  );
};

export default CMOSimple;