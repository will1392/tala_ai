import React, { useState, useEffect } from 'react';
import { Mail, Check, Loader2 } from 'lucide-react';

const GmailConnectButton = ({ className = '', onConnected }) => {
  const [status, setStatus] = useState({
    loading: true,
    connected: false,
    email: null
  });
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/email/status', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setStatus({
          loading: false,
          connected: data.connected,
          email: data.accounts[0]?.email || null
        });
      } else {
        setStatus({ loading: false, connected: false, email: null });
      }
    } catch (error) {
      console.error('Failed to check Gmail status:', error);
      setStatus({ loading: false, connected: false, email: null });
    }
  };

  const handleConnect = () => {
    setConnecting(true);
    window.location.href = '/api/email/connect/gmail';
  };

  if (status.loading) {
    return (
      <button className={`inline-flex items-center ${className}`} disabled>
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Checking...
      </button>
    );
  }

  if (status.connected) {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <Check className="w-4 h-4 mr-2 text-green-500" />
        <span className="text-sm text-gray-600">
          Gmail connected ({status.email})
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={connecting}
      className={`inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${className}`}
    >
      {connecting ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <Mail className="w-4 h-4 mr-2" />
          Connect Gmail
        </>
      )}
    </button>
  );
};

export default GmailConnectButton;