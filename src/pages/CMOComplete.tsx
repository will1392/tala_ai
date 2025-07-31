import React from 'react';
import { CMODashboardWithTour } from '../components/cmo/CMODashboardWithTour';
import { NotificationProvider } from '../components/cmo/NotificationSystem';
import { CMOThemeProvider } from '../components/cmo/CMOTheme';

// Complete CMO Mode with all providers and features
const CMOComplete: React.FC = () => {
  return (
    <CMOThemeProvider>
      <NotificationProvider>
        <div className="min-h-screen">
          <CMODashboardWithTour />
          
          {/* Status indicator for debugging */}
          <div className="fixed top-4 left-4 z-50 bg-green-500 text-white px-3 py-1 rounded text-xs">
            CMO Mode Active
          </div>
        </div>
      </NotificationProvider>
    </CMOThemeProvider>
  );
};

export default CMOComplete;