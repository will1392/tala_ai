import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Mail, 
  Send, 
  Inbox, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Sparkles,
  RefreshCw,
  Filter,
  Search,
  Loader2
} from 'lucide-react';
import { Button } from '../components/shared/Button';
import { GmailConnect } from '../components/email/GmailConnect';

interface EmailMessage {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  isUnread: boolean;
  hasAttachments: boolean;
  labels?: string[];
}

interface ExtractedTask {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  assignee?: string;
  tags: string[];
  description: string;
}

export const Email = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'processed'>('all');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  console.log('Email component render - isConnected:', isConnected, 'error:', error);

  // Fetch emails when connected
  useEffect(() => {
    console.log('isConnected changed to:', isConnected);
    if (isConnected) {
      // Double check we should actually be fetching
      const urlParams = new URLSearchParams(window.location.search);
      const realGmail = urlParams.get('realGmail');
      
      if (realGmail === 'true') {
        console.log('Fetching emails for real Gmail connection');
        fetchEmails();
      } else {
        console.log('Not fetching emails - no real Gmail connection detected, realGmail:', realGmail);
        setIsConnected(false); // Reset if no real connection
      }
    }
  }, [isConnected]);

  const fetchEmails = async () => {
    console.log('fetchEmails called, isConnected:', isConnected);
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:3001/api/email/messages', {
        headers: {
          'x-user-id': 'test_user_123'
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched emails:', data);
        setEmails(data.messages || []);
      } else if (response.status === 401) {
        // Gmail not connected - this is expected if user hasn't connected Gmail yet
        const errorData = await response.json();
        console.log('Gmail not connected (expected):', errorData.message);
        setEmails([]);
        setIsConnected(false); // Reset connection status
      } else {
        setError(`Failed to fetch emails: ${response.status}`);
        setEmails([]);
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
      setError('Unable to connect to email service');
      setEmails([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Check Gmail connection status on mount
  useEffect(() => {
    checkGmailStatus();
  }, []);
  
  const checkGmailStatus = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/email/status', {
        headers: { 'x-user-id': 'test_user_123' },
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.connected) {
          console.log('Gmail already connected:', data.email);
          setIsConnected(true);
          setError(null);
          // Fetch emails if connected
          fetchEmails();
        } else {
          setIsConnected(false);
        }
      }
    } catch (error) {
      console.error('Error checking Gmail status:', error);
      setIsConnected(false);
    }
  };

  const handleSendToTala = async (email: EmailMessage) => {
    setIsProcessing(true);
    setSelectedEmail(email);
    
    // Simulate AI processing
    setTimeout(() => {
      setExtractedTasks([
        {
          id: '1',
          title: 'Finalize investor presentation',
          priority: 'urgent',
          dueDate: 'Tomorrow',
          assignee: 'Product Team',
          tags: ['presentation', 'investor-meeting'],
          description: 'Update slides with Q1 metrics and projections'
        },
        {
          id: '2',
          title: 'Book flights to San Francisco',
          priority: 'urgent',
          dueDate: 'Today',
          assignee: 'Travel Coordinator',
          tags: ['travel', 'investor-meeting'],
          description: 'Business class flights for 3 team members'
        },
        {
          id: '3',
          title: 'Reserve conference room for prep meeting',
          priority: 'high',
          dueDate: 'Friday',
          tags: ['meeting', 'preparation'],
          description: 'Book large conference room for final rehearsal'
        }
      ]);
      setIsProcessing(false);
    }, 2000);
  };

  const filteredEmails = emails.filter(email => {
    const matchesSearch = email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         email.from.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'unread') return matchesSearch && email.isUnread;
    if (filter === 'processed') return matchesSearch && email.labels?.includes('processed');
    return matchesSearch;
  });

  return (
    <div className="h-full">
      {!isConnected ? (
        <div>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4 mx-6 mt-6">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle size={18} />
                <span className="font-medium">Gmail Connection Error</span>
              </div>
              <p className="text-red-300 mt-1">{error}</p>
            </div>
          )}
          <GmailConnect onConnectionSuccess={async () => {
            console.log('GmailConnect onConnectionSuccess called');
            
            // Verify we actually have valid tokens before setting connected
            try {
              const testResponse = await fetch('http://localhost:3001/api/email/test', {
                headers: { 'x-user-id': 'test_user_123' },
                credentials: 'include'
              });
              
              if (testResponse.ok) {
                console.log('Token validation successful');
                setIsConnected(true);
                setError(null);
              } else {
                console.log('Token validation failed:', testResponse.status);
                setError('Gmail connection expired. Please reconnect.');
                setIsConnected(false);
              }
            } catch (error) {
              console.error('Token validation error:', error);
              setError('Unable to verify Gmail connection');
              setIsConnected(false);
            }
          }} />
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="glass-light border-b border-white/10 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Mail className="text-primary" />
              Email Intelligence
            </h1>
            <p className="text-white/60 mt-1">
              Transform emails into actionable tasks with AI
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="primary" 
              className="gap-2" 
              onClick={fetchEmails}
              disabled={isLoading}
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              {isLoading ? 'Syncing...' : 'Sync Emails'}
            </Button>
            <Button
              variant="secondary"
              className="gap-2"
              onClick={async () => {
                try {
                  const response = await fetch('http://localhost:3001/api/email/disconnect', {
                    method: 'POST',
                    headers: { 'x-user-id': 'test_user_123' },
                    credentials: 'include'
                  });
                  
                  if (response.ok) {
                    setIsConnected(false);
                    setEmails([]);
                    setSelectedEmail(null);
                    setError(null);
                  }
                } catch (error) {
                  console.error('Error disconnecting Gmail:', error);
                }
              }}
            >
              <AlertCircle size={18} />
              Disconnect
            </Button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100%-88px)]">
        {/* Email List */}
        <div className="w-1/3 border-r border-white/10 overflow-y-auto">
          {/* Search and Filter */}
          <div className="p-4 border-b border-white/10">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
              <input
                type="text"
                placeholder="Search emails..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white placeholder-white/40"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-full text-sm ${
                  filter === 'all' ? 'bg-primary text-white' : 'bg-white/10 text-white/60'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1 rounded-full text-sm ${
                  filter === 'unread' ? 'bg-primary text-white' : 'bg-white/10 text-white/60'
                }`}
              >
                Unread
              </button>
              <button
                onClick={() => setFilter('processed')}
                className={`px-3 py-1 rounded-full text-sm ${
                  filter === 'processed' ? 'bg-primary text-white' : 'bg-white/10 text-white/60'
                }`}
              >
                Processed
              </button>
            </div>
          </div>

          {/* Email Items */}
          <div className="divide-y divide-white/10">
            {error && (
              <div className="p-4 text-center">
                <AlertCircle className="mx-auto text-red-400 mb-2" size={24} />
                <p className="text-red-400 font-medium">Gmail Connection Error</p>
                <p className="text-red-300 text-sm mt-1">{error}</p>
                <Button 
                  variant="secondary" 
                  className="mt-3"
                  onClick={() => window.location.href = 'http://localhost:3001/api/email/connect/gmail'}
                >
                  Reconnect Gmail
                </Button>
              </div>
            )}
            {!error && emails.length === 0 && !isLoading && (
              <div className="p-4 text-center">
                <Inbox className="mx-auto text-white/20 mb-2" size={24} />
                <p className="text-white/60">No emails found</p>
                <p className="text-white/40 text-sm">Try syncing your emails</p>
              </div>
            )}
            {isLoading && (
              <div className="p-4 text-center">
                <Loader2 className="mx-auto text-primary animate-spin mb-2" size={24} />
                <p className="text-white/60">Loading emails...</p>
              </div>
            )}
            {!error && !isLoading && filteredEmails.map((email) => (
              <motion.div
                key={email.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-4 hover:bg-white/5 cursor-pointer transition-colors ${
                  selectedEmail?.id === email.id ? 'bg-white/10' : ''
                }`}
                onClick={() => setSelectedEmail(email)}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {email.isUnread && (
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    )}
                    <span className="font-medium text-white">{email.from}</span>
                  </div>
                  <span className="text-xs text-white/40">{email.date}</span>
                </div>
                <h3 className="font-medium text-white/90 mb-1">{email.subject}</h3>
                <p className="text-sm text-white/60 line-clamp-1">{email.snippet}</p>
                {email.labels && (
                  <div className="flex gap-1 mt-2">
                    {email.labels.map((label) => (
                      <span
                        key={label}
                        className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Email Content and Task Extraction */}
        <div className="flex-1 overflow-y-auto">
          {selectedEmail ? (
            <div className="p-6">
              {/* Email Header */}
              <div className="glass rounded-xl p-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">
                      {selectedEmail.subject}
                    </h2>
                    <p className="text-white/60">From: {selectedEmail.from}</p>
                    <p className="text-white/60">Date: {selectedEmail.date}</p>
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => handleSendToTala(selectedEmail)}
                    disabled={isProcessing}
                    className="gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        Send to Tala
                      </>
                    )}
                  </Button>
                </div>
                <div className="text-white/80">
                  <p className="mb-4">{selectedEmail.snippet}</p>
                  <p>Dear Team,</p>
                  <p className="mt-2">
                    We have an important investor meeting scheduled for next week in San Francisco. 
                    This is a critical opportunity for our Series B funding round.
                  </p>
                  <p className="mt-2">
                    Please ensure the following items are completed by Friday:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Finalize the investor presentation with Q1 metrics</li>
                    <li>Book business class flights for the team</li>
                    <li>Reserve a conference room for final preparation</li>
                    <li>Update financial projections</li>
                  </ul>
                  <p className="mt-4">Best regards,<br />CEO</p>
                </div>
              </div>

              {/* Extracted Tasks */}
              {extractedTasks.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <CheckCircle2 className="text-green-400" />
                    Extracted Tasks ({extractedTasks.length})
                  </h3>
                  
                  {extractedTasks.map((task) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="glass rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-white">{task.title}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          task.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                          task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                          task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {task.priority}
                        </span>
                      </div>
                      <p className="text-sm text-white/60 mb-3">{task.description}</p>
                      <div className="flex items-center gap-4 text-sm">
                        {task.dueDate && (
                          <div className="flex items-center gap-1 text-white/60">
                            <Clock size={14} />
                            {task.dueDate}
                          </div>
                        )}
                        {task.assignee && (
                          <div className="flex items-center gap-1 text-white/60">
                            <AlertCircle size={14} />
                            {task.assignee}
                          </div>
                        )}
                      </div>
                      {task.tags.length > 0 && (
                        <div className="flex gap-1 mt-3">
                          {task.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-white/10 text-white/70 text-xs rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ))}

                  <div className="flex gap-3 mt-6">
                    <Button variant="primary" className="flex-1">
                      Create All Tasks
                    </Button>
                    <Button variant="secondary" className="flex-1">
                      Edit Tasks
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Inbox className="mx-auto text-white/20 mb-4" size={64} />
                <p className="text-white/40">Select an email to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
};