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
import taskService from '../services/taskService';

// Decode HTML entities
const decodeHTMLEntities = (text: string): string => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

// Format email body for better readability
const formatEmailBody = (body: string): string => {
  if (!body) return '';
  
  // Decode HTML entities
  let formatted = decodeHTMLEntities(body);
  
  // Replace non-breaking spaces with regular spaces
  formatted = formatted.replace(/&nbsp;/g, ' ');
  
  // Add proper line breaks before common email thread patterns
  // Match "On [date] at [time], [name] <email> wrote:"
  formatted = formatted.replace(/On ([A-Z][a-z]{2} \d{1,2}, \d{4}(?:,)? at \d{1,2}:\d{2} [AP]M), ([^<]+)<([^>]+)> wrote:/g, '\n\n---\n\nOn $1, $2<$3> wrote:\n\n');
  
  // Match "On [date], [name] <email> wrote:"
  formatted = formatted.replace(/On ([A-Z][a-z]{2,} \d{1,2}, \d{4}), ([^<]+)<([^>]+)> wrote:/g, '\n\n---\n\nOn $1, $2<$3> wrote:\n\n');
  
  // Add line breaks before "Sent from my iPhone/iPad"
  formatted = formatted.replace(/(Sent from my \w+)/g, '\n\n$1\n');
  
  // Clean up excessive whitespace
  formatted = formatted.replace(/\s{3,}/g, '\n\n');
  
  // Ensure proper spacing after punctuation
  formatted = formatted.replace(/\.([A-Z])/g, '. $1');
  
  // Remove any remaining HTML tags
  formatted = formatted.replace(/<[^>]*>/g, '');
  
  // Trim whitespace
  return formatted.trim();
};

// Parse email thread to identify quoted sections
const parseEmailThread = (body: string) => {
  const formatted = formatEmailBody(body);
  const sections = [];
  
  // Split by thread separators
  const parts = formatted.split(/\n---\n/);
  
  parts.forEach((part, index) => {
    const trimmed = part.trim();
    if (trimmed) {
      sections.push({
        content: trimmed,
        isQuoted: index > 0
      });
    }
  });
  
  return sections;
};

// Format email date to be more readable
const formatEmailDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  // Today - show time
  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }
  
  // Yesterday
  if (diffDays === 1) {
    return 'Yesterday';
  }
  
  // Within this year - show MM/DD
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('en-US', { 
      month: 'numeric', 
      day: 'numeric' 
    });
  }
  
  // Older - show MM/DD/YY
  return date.toLocaleDateString('en-US', { 
    month: 'numeric', 
    day: 'numeric',
    year: '2-digit'
  });
};

interface EmailMessage {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  body?: string;
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
  const [isCheckingConnection, setIsCheckingConnection] = useState(true); // New state for initial check
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'processed'>('all');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  console.log('Email component render - isConnected:', isConnected, 'error:', error);
  console.log('Current extractedTasks:', extractedTasks);

  // Fetch emails when connected
  useEffect(() => {
    console.log('isConnected changed to:', isConnected);
    if (isConnected) {
      console.log('Fetching emails');
      fetchEmails();
    }
  }, [isConnected]);

  const fetchEmails = async (pageToken?: string) => {
    console.log('fetchEmails called, isConnected:', isConnected, 'pageToken:', pageToken);
    
    // Set appropriate loading state
    if (pageToken) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setError(null);
    }
    
    try {
      const url = new URL('http://localhost:3001/api/email/messages');
      url.searchParams.append('maxResults', '20');
      if (pageToken) {
        url.searchParams.append('pageToken', pageToken);
      }
      
      const response = await fetch(url.toString(), {
        headers: {
          'x-user-id': 'test_user_123'
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched emails:', data);
        
        if (pageToken) {
          // Append to existing emails
          setEmails(prev => [...prev, ...(data.messages || [])]);
        } else {
          // Replace emails (initial load or refresh)
          setEmails(data.messages || []);
        }
        
        setNextPageToken(data.nextPageToken || null);
      } else if (response.status === 401) {
        // Gmail not connected - this is expected if user hasn't connected Gmail yet
        const errorData = await response.json();
        console.log('Gmail not connected (expected):', errorData.message);
        // Don't clear emails if we already have some
        if (!pageToken) {
          setEmails([]);
        }
        setIsConnected(false); // Reset connection status
        setError('Gmail session expired. Please reconnect.');
      } else {
        setError(`Failed to fetch emails: ${response.status}`);
        if (!pageToken) {
          setEmails([]);
        }
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
      setError('Unable to connect to email service');
      if (!pageToken) {
        setEmails([]);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Check Gmail connection status on mount
  useEffect(() => {
    checkGmailStatus();
  }, []);
  
  const checkGmailStatus = async () => {
    setIsCheckingConnection(true);
    try {
      const response = await fetch('http://localhost:3001/api/email/status', {
        headers: { 'x-user-id': 'test_user_123' },
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Gmail status:', data);
        if (data.connected) {
          console.log('Gmail already connected:', data.email);
          setIsConnected(true);
          setError(null);
          // Don't fetch emails here, let the useEffect handle it
        } else {
          console.log('Gmail not connected');
          setIsConnected(false);
        }
      }
    } catch (error) {
      console.error('Error checking Gmail status:', error);
      setIsConnected(false);
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const fetchFullEmail = async (emailId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/email/message/${emailId}`, {
        headers: {
          'x-user-id': 'test_user_123'
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const fullEmail = await response.json();
        // Update the email in our list with the full body
        setEmails(prev => prev.map(email => 
          email.id === emailId ? { ...email, body: fullEmail.body } : email
        ));
        return fullEmail;
      }
    } catch (error) {
      console.error('Error fetching full email:', error);
    }
  };

  const handleSendToTala = async (email: EmailMessage) => {
    console.log('handleSendToTala called with email:', email);
    setIsProcessing(true);
    // Don't reset selectedEmail here since it's already selected
    
    try {
      // Send email to AI for task extraction
      console.log('Sending request to extract tasks...');
      const response = await fetch('http://localhost:3001/api/email-tasks/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'test_user_123'
        },
        credentials: 'include',
        body: JSON.stringify({
          emailId: email.id,
          subject: email.subject,
          from: email.from,
          body: email.body || email.snippet,
          useAI: true
        })
      });
      
      console.log('Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Extracted data:', data);
        
        // If we got extracted tasks, display them
        if (data.tasks && data.tasks.length > 0) {
          console.log('Setting extracted tasks:', data.tasks);
          setExtractedTasks(data.tasks);
          console.log('State should be updated now');
          // Scroll to show the tasks
          setTimeout(() => {
            const tasksElement = document.querySelector('.extracted-tasks');
            if (tasksElement) {
              tasksElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 100);
        } else {
          // Fallback: create a single task from the email
          const fallbackTask = {
            id: 'temp-1',
            title: `Follow up: ${email.subject}`,
            priority: 'medium' as const,
            dueDate: 'Tomorrow',
            tags: ['email', 'follow-up'],
            description: `Follow up on email from ${email.from}\n\nSnippet: ${email.snippet}`
          };
          setExtractedTasks([fallbackTask]);
        }
      } else {
        console.error('Failed to extract tasks from email');
        // Create a simple task as fallback
        const fallbackTask = {
          id: 'temp-1',
          title: `Review email: ${email.subject}`,
          priority: 'medium' as const,
          dueDate: 'Today',
          tags: ['email'],
          description: email.snippet
        };
        setExtractedTasks([fallbackTask]);
      }
    } catch (error) {
      console.error('Error processing email:', error);
    } finally {
      setIsProcessing(false);
    }
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
      {isCheckingConnection ? (
        // Show loading state while checking connection
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 className="animate-spin text-primary mx-auto mb-4" size={48} />
            <p className="text-white/60">Checking Gmail connection...</p>
          </div>
        </div>
      ) : !isConnected ? (
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
          <div className="glass-light border-b border-white/10 p-6 flex-shrink-0">
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
              onClick={() => fetchEmails()}
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

      <div className="flex flex-1 overflow-hidden">
        {/* Email List */}
        <div className="w-1/3 border-r border-white/10 flex flex-col">
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

          {/* Email Count */}
          {emails.length > 0 && (
            <div className="px-4 py-2 text-xs text-white/50 bg-white/5 border-b border-white/10">
              Showing {filteredEmails.length} of {emails.length} emails
              {nextPageToken && ' • More available'}
            </div>
          )}

          {/* Email Items */}
          <div className="divide-y divide-white/10 overflow-y-auto flex-1">
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
                onClick={async (e) => {
                  e.preventDefault();
                  setSelectedEmail(email);
                  // Fetch full email content if we don't have it
                  if (!email.body) {
                    const fullEmail = await fetchFullEmail(email.id);
                    if (fullEmail) {
                      setSelectedEmail({ ...email, body: fullEmail.body });
                    }
                  }
                }}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {email.isUnread && (
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    )}
                    <span className="font-medium text-white">{email.from}</span>
                  </div>
                  <span className="text-xs text-white/40">{formatEmailDate(email.date)}</span>
                </div>
                <h3 className="font-medium text-white/90 mb-1">{email.subject}</h3>
                <p className="text-sm text-white/60 line-clamp-1">{decodeHTMLEntities(email.snippet)}</p>
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
            
            {/* Load More Button */}
            {nextPageToken && !isLoading && !isLoadingMore && (
              <div className="p-4 border-t border-white/10">
                <Button
                  variant="secondary"
                  className="w-full gap-2"
                  onClick={() => fetchEmails(nextPageToken)}
                >
                  <RefreshCw size={16} />
                  Load More Emails
                </Button>
              </div>
            )}
            
            {isLoadingMore && (
              <div className="p-4 text-center text-white/60">
                <Loader2 className="animate-spin mx-auto mb-2" size={20} />
                Loading more emails...
              </div>
            )}
          </div>
        </div>

        {/* Email Content and Task Extraction */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {selectedEmail ? (
            <div className="flex-1 overflow-y-auto p-6">
              {/* Email Header */}
              <div className="glass rounded-xl p-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">
                      {selectedEmail.subject}
                    </h2>
                    <p className="text-white/60">From: {selectedEmail.from}</p>
                    <p className="text-white/60">Date: {formatEmailDate(selectedEmail.date)}</p>
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => {
                      console.log('Button clicked!');
                      handleSendToTala(selectedEmail);
                    }}
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
                  {/* Show actual email body if available, otherwise show snippet */}
                  {selectedEmail.body ? (
                    <div className="font-sans text-base leading-relaxed">
                      {parseEmailThread(selectedEmail.body).map((section, index) => (
                        <div
                          key={index}
                          className={`${
                            section.isQuoted
                              ? 'mt-6 pl-4 border-l-2 border-white/20 text-white/60 text-sm'
                              : 'text-white/90'
                          } ${
                            index > 0 ? 'mt-6' : ''
                          }`}
                        >
                          <pre className="whitespace-pre-wrap break-words font-sans">
                            {section.content}
                          </pre>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <p className="text-white/60 italic">Email preview:</p>
                      <p className="mt-2">{decodeHTMLEntities(selectedEmail.snippet)}</p>
                      <p className="mt-4 text-sm text-white/40">Full email content will be loaded when you select this email.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Extracted Tasks */}
              {console.log('Rendering extracted tasks section, count:', extractedTasks.length)}
              {extractedTasks.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 extracted-tasks"
                >
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <CheckCircle2 className="text-green-400" />
                    Suggested Task
                  </h3>
                  <p className="text-sm text-white/60 mb-4">
                    Tala found this action item. You can also copy this email to chat for more specific task creation.
                  </p>
                  
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
                    <Button 
                      variant="primary" 
                      className="flex-1"
                      onClick={async () => {
                        try {
                          // Create all tasks
                          const tasksToCreate = extractedTasks.map(task => ({
                            title: task.title,
                            description: task.description,
                            priority: task.priority,
                            dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : undefined,
                            assignee: task.assignee,
                            tags: task.tags,
                            source: 'email' as const,
                            sourceId: selectedEmail?.id
                          }));
                          
                          const createdTasks = await taskService.createTasksFromEmail(
                            selectedEmail?.id || '',
                            tasksToCreate
                          );
                          
                          if (createdTasks.length > 0) {
                            alert(`Successfully created ${createdTasks.length} tasks!`);
                            setExtractedTasks([]); // Clear the extracted tasks
                          } else {
                            alert('Failed to create tasks. Please try again.');
                          }
                        } catch (error) {
                          console.error('Error creating tasks:', error);
                          alert('Error creating tasks. Please try again.');
                        }
                      }}
                    >
                      Create Task
                    </Button>
                    <Button 
                      variant="secondary" 
                      className="flex-1"
                      onClick={() => {
                        // TODO: Implement task editing modal
                        alert('Task editing coming soon!');
                      }}
                    >
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