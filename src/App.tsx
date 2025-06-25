import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './components/auth/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { Knowledge } from './pages/Knowledge';
import { Chat } from './pages/Chat';
import { Settings } from './pages/Settings';
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
        <Routes>
          {!isAuthenticated ? (
            <Route path="*" element={<LoginPage />} />
          ) : (
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="knowledge" element={<Knowledge />} />
              <Route path="chat" element={<Chat />} />
              <Route path="settings" element={<Settings />} />
            </Route>
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
