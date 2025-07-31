import React from 'react';
import { CMODashboardWithTour } from '../components/cmo/CMODashboardWithTour';
import { NotificationProvider } from '../components/cmo/NotificationSystem';

// This is the main CMO Mode page with all features integrated:
// - Onboarding Flow (shows on first visit)
// - Guided Tours (accessible via play button)
// - Help System (accessible via help button)
// - Achievement System (accessible via trophy button)
// - Full CMO Dashboard

const CMOModeFull: React.FC = () => {
  return (
    <NotificationProvider>
      <CMODashboardWithTour />
    </NotificationProvider>
  );
};

export default CMOModeFull;