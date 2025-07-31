import React, { useState } from 'react';
import CMODashboardEnhanced from './CMODashboardEnhanced';
import { NotificationProvider } from '../components/cmo/NotificationSystem';
import { Trophy, HelpCircle, Play, Sparkles } from 'lucide-react';

// Most basic CMO Mode - no complex components
const CMOBasic: React.FC = () => {
  const [showMessage, setShowMessage] = useState('');

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Main Dashboard */}
        <CMODashboardEnhanced />

        {/* Simple Control Buttons */}
        <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
          <button
            onClick={() => setShowMessage('Achievements feature coming soon!')}
            className="bg-white dark:bg-gray-800 shadow-lg rounded-full p-3 hover:scale-105 transition-transform"
            title="View achievements"
          >
            <Trophy className="w-5 h-5 text-yellow-500" />
          </button>
          
          <button
            onClick={() => setShowMessage('Help system coming soon!')}
            className="bg-white dark:bg-gray-800 shadow-lg rounded-full p-3 hover:scale-105 transition-transform"
            title="Get help"
          >
            <HelpCircle className="w-5 h-5 text-blue-500" />
          </button>
          
          <button
            onClick={() => setShowMessage('Guided tour coming soon!')}
            className="bg-teal-500 text-white shadow-lg rounded-full p-3 hover:scale-105 transition-all"
            title="Take a guided tour"
          >
            <Play className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => setShowMessage('Onboarding coming soon!')}
            className="bg-white dark:bg-gray-800 shadow-lg rounded-full p-3 hover:scale-105 transition-transform"
            title="View onboarding"
          >
            <Sparkles className="w-5 h-5 text-purple-500" />
          </button>
        </div>

        {/* Simple message display */}
        {showMessage && (
          <div className="fixed top-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-sm">
            <p className="text-sm">{showMessage}</p>
            <button
              onClick={() => setShowMessage('')}
              className="mt-2 text-xs text-gray-500 hover:text-gray-700"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Status Badge */}
        <div className="fixed top-4 left-4 z-30 bg-teal-500 text-white px-3 py-1 rounded-full text-xs">
          CMO Mode Active - Basic Version
        </div>
      </div>
    </NotificationProvider>
  );
};

export default CMOBasic;