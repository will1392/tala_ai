import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '../shared/Button';

interface GmailConnectProps {
  onConnectionSuccess: () => void;
}

export const GmailConnect = ({ onConnectionSuccess }: GmailConnectProps) => {
  const [connectionState, setConnectionState] = useState<'idle' | 'connecting' | 'connected' | 'error' | 'checking'>('checking');
  const [testMode, setTestMode] = useState(true);
  const [existingEmail, setExistingEmail] = useState<string | null>(null);
  
  const handleGmailConnect = () => {
    if (testMode) {
      // Simulate connection for testing
      setConnectionState('connecting');
      setTimeout(() => {
        setConnectionState('connected');
        // Don't call onConnectionSuccess() in test mode since there's no real connection
      }, 2000);
    } else {
      // Real OAuth flow - include auth header via query param for redirect
      const userId = localStorage.getItem('userId') || 'test_user_123';
      window.location.href = `http://localhost:3001/api/email/connect/gmail?userId=${userId}`;
    }
  };
  
  // Check for existing connection first
  React.useEffect(() => {
    checkExistingConnection();
  }, []);
  
  const checkExistingConnection = async () => {
    setConnectionState('checking');
    try {
      const response = await fetch('http://localhost:3001/api/email/status', {
        headers: { 'x-user-id': 'test_user_123' },
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Existing connection check:', data);
        if (data.connected) {
          setConnectionState('connected');
          setExistingEmail(data.email);
          setTestMode(false); // It's a real connection
          // Notify parent component immediately
          onConnectionSuccess();
        } else {
          setConnectionState('idle');
        }
      } else {
        setConnectionState('idle');
      }
    } catch (error) {
      console.error('Error checking existing connection:', error);
      setConnectionState('idle');
    }
  };
  
  // Check URL params for OAuth callback
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const email = params.get('email');
    const realGmail = params.get('realGmail');
    const errorParam = params.get('error');
    
    console.log('GmailConnect URL params:', { connected, email, realGmail, errorParam });
    
    if (connected === 'true' && realGmail === 'true' && email) {
      // OAuth callback - new connection
      setConnectionState('connected');
      setTestMode(false);
      setExistingEmail(email);
      console.log('Real Gmail connection detected:', email);
      
      // Clear URL params after processing
      window.history.replaceState({}, document.title, window.location.pathname);
      
      setTimeout(() => {
        onConnectionSuccess();
      }, 1000);
    } else if (errorParam) {
      setConnectionState('error');
      console.error('OAuth error:', errorParam);
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [onConnectionSuccess]);
  
  const handleSimpleSetup = () => {
    setTestMode(true);
    handleGmailConnect();
  };
  
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-8 max-w-md w-full"
      >
        {connectionState === 'checking' && (
          <div className="text-center py-8">
            <Loader2 className="animate-spin text-primary mx-auto mb-4" size={48} />
            <h3 className="text-xl font-semibold text-white mb-2">
              Checking connection...
            </h3>
            <p className="text-white/60">
              Please wait while we check your Gmail status
            </p>
          </div>
        )}
        
        {connectionState === 'idle' && (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="text-primary" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Connect Your Email</h2>
              <p className="text-white/60">
                Choose how you'd like to connect your email account
              </p>
            </div>
            
            <div className="space-y-3">
              <Button
                variant="primary"
                className="w-full gap-2"
                onClick={handleSimpleSetup}
              >
                <CheckCircle size={18} />
                Quick Demo (Test Mode)
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-900 text-white/40">or</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Button
                  variant="secondary"
                  className="w-full gap-2"
                  onClick={() => {
                    setTestMode(false);
                    setConnectionState('connecting');
                    // Real OAuth flow - include auth header via query param for redirect
                    const userId = localStorage.getItem('userId') || 'test_user_123';
                    window.location.href = `http://localhost:3001/api/email/connect/gmail?userId=${userId}`;
                  }}
                >
                  <ExternalLink size={18} />
                  Connect Real Gmail Account
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full gap-2 text-xs"
                  onClick={() => {
                    // Test OAuth flow without Google
                    const userId = localStorage.getItem('userId') || 'test_user_123';
                    const state = btoa(JSON.stringify({
                      userId: userId,
                      returnUrl: 'http://localhost:5173/email?connected=true'
                    }));
                    window.location.href = `http://localhost:3001/api/email/test-oauth?state=${state}`;
                  }}
                >
                  Test OAuth Flow (Skip Google)
                </Button>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm text-blue-400 flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>
                  For testing, use Quick Demo mode. For production, you'll need to set up 
                  Google OAuth credentials.
                </span>
              </p>
            </div>
          </>
        )}
        
        {connectionState === 'connecting' && (
          <div className="text-center py-8">
            <Loader2 className="animate-spin text-primary mx-auto mb-4" size={48} />
            <h3 className="text-xl font-semibold text-white mb-2">
              Connecting to Gmail...
            </h3>
            <p className="text-white/60">
              {testMode ? 'Setting up test environment' : 'Authenticating with Google'}
            </p>
          </div>
        )}
        
        {connectionState === 'connected' && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-8"
          >
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-green-400" size={32} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Successfully Connected!
            </h3>
            <p className="text-white/60">
              {testMode ? 'Demo mode active - connect real Gmail to see your emails' : 
               existingEmail ? `Connected: ${existingEmail}` : 'Your Gmail account is now connected'}
            </p>
            {testMode && (
              <Button 
                variant="primary" 
                className="mt-4"
                onClick={() => {
                  setTestMode(false);
                  setConnectionState('connecting');
                  const userId = localStorage.getItem('userId') || 'test_user_123';
                  window.location.href = `http://localhost:3001/api/email/connect/gmail?userId=${userId}`;
                }}
              >
                Connect Real Gmail Now
              </Button>
            )}
          </motion.div>
        )}
        
        {connectionState === 'error' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="text-red-400" size={32} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Connection Failed
            </h3>
            <p className="text-white/60 mb-4">
              Unable to connect to Gmail. Please try again.
            </p>
            <Button variant="secondary" onClick={() => setConnectionState('idle')}>
              Try Again
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
};