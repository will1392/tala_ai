import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { Layout } from './components/layout/Layout';
import { PremiumLayout } from './components/layout/PremiumLayout';
import { LoginPage } from './components/auth/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { UnifiedDashboard } from './pages/UnifiedDashboard';
import { ModernDashboard } from './pages/ModernDashboard';
import { PremiumDashboard } from './pages/PremiumDashboard';
import { PremiumDashboardContent } from './pages/PremiumDashboardContent';
import { Knowledge } from './pages/Knowledge';
import { KnowledgeImproved } from './pages/KnowledgeImproved';
import { KnowledgeFinal } from './pages/KnowledgeFinal';
import { TalaFinalChat } from './pages/TalaFinalChat';
import { Email } from './pages/Email';
import { Settings } from './pages/Settings';
import CMOModeFull from './pages/CMOModeFull';
import CMOModeDebug from './pages/CMOModeDebug';
import CMOTest from './pages/CMOTest';
import CMOComplete from './pages/CMOComplete';
import CMOSimple from './pages/CMOSimple';
import CMOBasic from './pages/CMOBasic';
import CMODebugSimple from './pages/CMODebugSimple';
import CMOWorking from './pages/CMOWorking';
import CMOFull from './pages/CMOFull';
// import EmailInbox from './components/email/EmailInbox';
import { DueTaskBanner } from './components/notifications/DueTaskBanner';
import { useAuthStore } from './store/authStore';
import ErrorBoundary from './components/shared/ErrorBoundary';
import TalaFinalChatRedesigned from './pages/TalaFinalChatRedesigned';
import ChatView from './components/chat/ChatView';
import DemoFlow from './components/demo/DemoFlow';
import UIComponentShowcase from './pages/UIComponentShowcase';
import MarkdownTest from './pages/MarkdownTest';
import MarketingDashboard from './pages/MarketingDashboard';
import { TourProvider } from './components/tour/TourProvider';
import { DEFAULT_TOUR_STEPS } from './tour/steps';
import { srOnly } from './utils/accessibility';
import { LiveRegionManager } from './components/accessibility';
import Credits from './pages/Credits';
import { ensureUserId } from './utils/ensureUserId';
import './styles/globals.css';

function App() {
  const { isAuthenticated } = useAuthStore();
  
  // Ensure userId is set on app load
  useEffect(() => {
    ensureUserId();
  }, []);
  
  return (
    <ErrorBoundary
        onError={(error, errorInfo) => {
          console.error('App Error Boundary:', error, errorInfo);
          // In production, send to error monitoring service
          if (process.env.NODE_ENV === 'production') {
            // Send to monitoring service
          }
        }}
      >
        <Router>
          <TourProvider defaultSteps={DEFAULT_TOUR_STEPS}>
            {/* Skip to main content link for keyboard navigation */}
            <a 
              href="#main-content" 
              className={`${srOnly} focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-light`}
            >
              Skip to main content
            </a>
            
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'rgba(39, 45, 65, 0.9)',
                  color: '#fff',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                },
              }}
            />
            
            {/* Live regions for screen reader announcements */}
            <LiveRegionManager />
            
            {isAuthenticated && <DueTaskBanner />}
            <Routes>
              {!isAuthenticated ? (
                <Route path="*" element={<LoginPage />} />
              ) : (
                <>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/" element={<PremiumLayout />}>
                    <Route path="dashboard" element={<PremiumDashboard />} />
                    <Route path="chat" element={<TalaFinalChat />} />
                    <Route path="chat-redesigned" element={<TalaFinalChatRedesigned />} />
                    <Route path="chat-demo" element={<ChatView />} />
                    <Route path="demo-flow" element={<DemoFlow />} />
                    <Route path="email" element={<Email />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="knowledge" element={<KnowledgeFinal />} />
                    <Route path="knowledge-final" element={<KnowledgeFinal />} />
                    <Route path="knowledge-original" element={<Knowledge />} />
                    <Route path="ui-components" element={<UIComponentShowcase />} />
                    <Route path="markdown-test" element={<MarkdownTest />} />
                    <Route path="marketing" element={<MarketingDashboard />} />
                    <Route path="credits" element={<Credits />} />
                  </Route>
                  <Route path="/" element={<Layout />}>
                    <Route path="dashboard-old" element={<Dashboard />} />
                    <Route path="dashboard-unified" element={<UnifiedDashboard />} />
                    <Route path="dashboard-modern" element={<ModernDashboard />} />
                    <Route path="cmo" element={<CMOFull />} />
                    <Route path="cmo-debug" element={<CMOModeDebug />} />
                    <Route path="cmo-test" element={<CMOTest />} />
                    <Route path="cmo-complete" element={<CMOComplete />} />
                    <Route path="cmo-simple" element={<CMOSimple />} />
                    <Route path="cmo-basic" element={<CMOBasic />} />
                    <Route path="cmo-working" element={<CMOWorking />} />
                  </Route>
                </>
              )}
            </Routes>
          </TourProvider>
        </Router>
      </ErrorBoundary>
  );
}

export default App;
