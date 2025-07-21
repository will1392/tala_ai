import React, { useState, useEffect } from 'react';
import { Mail, Check, X, Loader2, AlertCircle, RefreshCw, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

const EmailSettings = () => {
  const [status, setStatus] = useState({
    loading: true,
    connected: false,
    accounts: []
  });
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(null);

  // Check Gmail connection status on mount
  useEffect(() => {
    checkConnectionStatus();

    // Check for OAuth callback parameters
    const params = new URLSearchParams(window.location.search);
    const gmailStatus = params.get('gmail');
    const email = params.get('email');
    const error = params.get('error');

    if (gmailStatus === 'connected' && email) {
      toast.success(`Gmail connected successfully: ${email}`);
      checkConnectionStatus();
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (gmailStatus === 'denied') {
      toast.error('Gmail connection was denied');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      toast.error('Failed to connect Gmail. Please try again.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch('/api/email/status', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setStatus({
          loading: false,
          connected: data.connected,
          accounts: data.accounts || []
        });
      } else {
        throw new Error('Failed to check status');
      }
    } catch (error) {
      console.error('Failed to check Gmail status:', error);
      setStatus({ loading: false, connected: false, accounts: [], error: true });
    }
  };

  const connectGmail = () => {
    setConnecting(true);
    // Redirect to OAuth flow
    window.location.href = '/api/email/connect/gmail';
  };

  const disconnectGmail = async (email) => {
    if (!confirm(`Are you sure you want to disconnect ${email}?`)) {
      return;
    }

    setDisconnecting(email);
    
    try {
      const response = await fetch('/api/email/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        toast.success('Gmail disconnected successfully');
        checkConnectionStatus();
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch (error) {
      console.error('Failed to disconnect Gmail:', error);
      toast.error('Failed to disconnect Gmail');
    } finally {
      setDisconnecting(null);
    }
  };

  const testConnection = async (email) => {
    try {
      const response = await fetch(`/api/email/test/${encodeURIComponent(email)}`, {
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(`Connection verified: ${result.messagesTotal} total messages`);
      } else {
        toast.error(`Connection test failed: ${result.error}`);
      }
    } catch (error) {
      toast.error('Failed to test connection');
    }
  };

  if (status.loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading email settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Mail className="w-5 h-5 mr-2" />
              Email Integration
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Connect your Gmail account to manage emails directly in Tala AI
            </p>
          </div>
          {status.connected && (
            <button
              onClick={connectGmail}
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              Add another account
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {!status.connected ? (
          <div className="text-center py-6">
            <Mail className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No email accounts connected
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Connect your Gmail to start managing emails with AI assistance
            </p>
            <div className="mt-6">
              <button
                onClick={connectGmail}
                disabled={connecting}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {connecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Connect Gmail
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {status.accounts.map((account) => (
              <div
                key={account.email}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center">
                  {account.picture ? (
                    <img
                      src={account.picture}
                      alt={account.name || account.email}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-gray-500" />
                    </div>
                  )}
                  <div className="ml-3">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-gray-900">
                        {account.email}
                      </p>
                      <Check className="w-4 h-4 ml-2 text-green-500" />
                    </div>
                    <p className="text-xs text-gray-500">
                      Connected {new Date(account.connectedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => testConnection(account.email)}
                    className="p-2 text-gray-400 hover:text-gray-500"
                    title="Test connection"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => disconnectGmail(account.email)}
                    disabled={disconnecting === account.email}
                    className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-50"
                    title="Disconnect"
                  >
                    {disconnecting === account.email ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Gmail Integration Active
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      Tala AI can now:
                    </p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Read and organize your emails</li>
                      <li>Extract important information and attachments</li>
                      <li>Help you draft and manage responses</li>
                      <li>Create smart summaries of email threads</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {status.error && (
          <div className="mt-4 p-4 bg-red-50 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <X className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Connection Error
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    Unable to verify Gmail connection. Please try reconnecting.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailSettings;