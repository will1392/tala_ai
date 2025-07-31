import React, { useState } from 'react';
import { CMODashboardWithTour } from '../components/cmo/CMODashboardWithTour';
import { NotificationProvider } from '../components/cmo/NotificationSystem';
import { motion } from 'framer-motion';
import { Info, AlertCircle } from 'lucide-react';

const CMOModeDebug: React.FC = () => {
  const [showDebug, setShowDebug] = useState(true);

  // Clear all localStorage to test first-time experience
  const clearAllData = () => {
    localStorage.removeItem('cmo-dashboard-visited');
    localStorage.removeItem('cmo-show-onboarding');
    localStorage.removeItem('cmo-onboarding-completed');
    localStorage.removeItem('cmo-completed-tours');
    window.location.reload();
  };

  return (
    <div className="relative min-h-screen">
      {/* Debug Panel */}
      {showDebug && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-4 left-4 z-[100] bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-600 rounded-lg p-4 max-w-md"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                CMO Mode Debug Info
              </h3>
              <div className="space-y-2 text-sm text-yellow-700 dark:text-yellow-300">
                <p>Look for these elements:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>Bottom-Right:</strong> 4 circular buttons (Trophy, Help, Play, Sparkles)</li>
                  <li><strong>Bottom-Left:</strong> Quick Actions panel with tours</li>
                  <li><strong>First Visit:</strong> Should show onboarding automatically</li>
                </ul>
                
                <div className="mt-3 space-y-2">
                  <p className="font-semibold">Current State:</p>
                  <div className="bg-white dark:bg-gray-800 rounded p-2 font-mono text-xs">
                    <div>Visited: {localStorage.getItem('cmo-dashboard-visited') || 'false'}</div>
                    <div>Onboarding Complete: {localStorage.getItem('cmo-onboarding-completed') || 'false'}</div>
                    <div>Tours: {localStorage.getItem('cmo-completed-tours') || 'none'}</div>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={clearAllData}
                    className="px-3 py-1.5 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors text-xs"
                  >
                    Reset to First Visit
                  </button>
                  <button
                    onClick={() => setShowDebug(false)}
                    className="px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-xs"
                  >
                    Hide Debug
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Hidden debug toggle */}
      {!showDebug && (
        <button
          onClick={() => setShowDebug(true)}
          className="fixed top-4 left-4 z-[100] p-2 bg-gray-200 dark:bg-gray-700 rounded opacity-50 hover:opacity-100 transition-opacity"
          title="Show debug info"
        >
          <Info className="w-4 h-4" />
        </button>
      )}

      {/* The actual CMO Dashboard */}
      <NotificationProvider>
        <CMODashboardWithTour />
      </NotificationProvider>
    </div>
  );
};

export default CMOModeDebug;