import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/layout/Layout';
import { PremiumLayout } from './components/layout/PremiumLayout';
import { LoginPage } from './components/auth/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { UnifiedDashboard } from './pages/UnifiedDashboard';
import { ModernDashboard } from './pages/ModernDashboard';
import { PremiumDashboard } from './pages/PremiumDashboard';
import { Knowledge } from './pages/Knowledge';
import { Chat } from './pages/Chat';
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
import './styles/globals.css';

function App() {
  const { isAuthenticated } = useAuthStore();
  
  try {
    return (
      <Router>
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
        {isAuthenticated && <DueTaskBanner />}
        <Routes>
          {!isAuthenticated ? (
            <Route path="*" element={<LoginPage />} />
          ) : (
            <>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<PremiumDashboard />} />
              <Route path="/" element={<PremiumLayout />}>
                <Route path="chat" element={<Chat />} />
                <Route path="email" element={<Email />} />
                <Route path="settings" element={<Settings />} />
                <Route path="knowledge" element={<Knowledge />} />
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
      </Router>
    );
  } catch (error) {
    console.error('App render error:', error);
    return (
      <div style={{ padding: '20px', color: 'white', backgroundColor: '#1a1a1a' }}>
        <h1>Error loading app</h1>
        <pre>{String(error)}</pre>
      </div>
    );
  }
}

export default App;
