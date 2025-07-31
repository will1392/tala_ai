import React from 'react';
import { NotificationProvider } from '../components/cmo/NotificationSystem';

// Ultra-simple CMO Mode for debugging
const CMODebugSimple: React.FC = () => {
  return (
    <NotificationProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <h1 className="text-2xl font-bold mb-4">CMO Mode - Debug Version</h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-2">Debug Info</h2>
          <p className="text-gray-600 dark:text-gray-400">
            This is a minimal CMO mode to isolate rendering issues.
          </p>
          
          <div className="mt-4 space-y-2">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded">
              ✅ NotificationProvider wrapped
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
              ℹ️ No complex components loaded
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded">
              🎯 Basic HTML only
            </div>
          </div>
        </div>
        
        {/* Status Badge */}
        <div className="fixed top-4 right-4 bg-teal-500 text-white px-3 py-1 rounded-full text-xs">
          CMO Mode Active - Debug Simple
        </div>
      </div>
    </NotificationProvider>
  );
};

export default CMODebugSimple;