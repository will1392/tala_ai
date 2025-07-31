import React from 'react';
import { Trophy, HelpCircle, Play, Sparkles } from 'lucide-react';

const CMOTest: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <h1 className="text-2xl font-bold mb-8">CMO Mode Test - Checking if buttons render</h1>
      
      {/* Test rendering the control buttons */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">These buttons should appear in bottom-right corner:</h2>
        <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3 border-4 border-red-500 p-2 bg-white">
          <button className="bg-white dark:bg-gray-800 shadow-lg rounded-full p-3 hover:scale-105 transition-transform group">
            <Trophy className="w-5 h-5 text-yellow-500 group-hover:text-yellow-600" />
          </button>
          <button className="bg-white dark:bg-gray-800 shadow-lg rounded-full p-3 hover:scale-105 transition-transform">
            <HelpCircle className="w-5 h-5 text-blue-500" />
          </button>
          <button className="bg-primary text-white shadow-lg rounded-full p-3 hover:scale-105 transition-all">
            <Play className="w-5 h-5" />
          </button>
          <button className="bg-white dark:bg-gray-800 shadow-lg rounded-full p-3 hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-purple-500" />
          </button>
        </div>
      </div>

      {/* Test quick actions panel */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">This panel should appear in bottom-left corner:</h2>
        <div className="fixed bottom-6 left-6 z-40 border-4 border-blue-500">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
            <h4 className="text-sm font-semibold mb-2">Quick Actions</h4>
            <div className="space-y-2">
              <button className="text-sm hover:text-primary">Dashboard Tour</button>
              <button className="text-sm hover:text-primary">Tools Tour</button>
              <button className="text-sm hover:text-primary">Workflow Tour</button>
              <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                <button className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1">
                  <Sparkles className="w-4 h-4" />
                  View Onboarding
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">What you should see:</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>Bottom-right corner: 4 circular buttons with red border</li>
          <li>Bottom-left corner: Quick Actions panel with blue border</li>
          <li>If you see both, the UI is rendering correctly</li>
          <li>If not, there may be CSS or z-index issues</li>
        </ol>
        
        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded">
          <p className="font-semibold">Next steps:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Go to <code className="bg-gray-200 px-1 rounded">/cmo-debug</code> for the debug version</li>
            <li>Click "Reset to First Visit" to see onboarding</li>
            <li>Check browser console for any errors</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CMOTest;