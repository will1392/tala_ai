/**
 * Email Inbox Component
 * 
 * Main interface for viewing and managing emails
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Mail,
  RefreshCw,
  Search,
  Filter,
  MoreVertical,
  CheckSquare,
  Square,
  Star,
  StarOff,
  Archive,
  Trash2,
  Tag,
  Send,
  Calendar,
  Paperclip
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import EmailList from './EmailList';
import EmailViewer from './EmailViewer';
import EmailSidebar from './EmailSidebar';
import EmailComposer from './EmailComposer';
import { emailAPI } from '../../services/emailAPI';
import { showToast } from '../../utils/toast';

const EmailInbox = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  
  // State
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [selectedEmails, setSelectedEmails] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pageToken, setPageToken] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    provider: searchParams.get('provider') || 'all',
    label: 'inbox',
    unread: false
  });
  const [accounts, setAccounts] = useState([]);
  const [activeAccount, setActiveAccount] = useState(null);
  const [showComposer, setShowComposer] = useState(false);

  // Fetch email accounts
  const fetchAccounts = useCallback(async () => {
    try {
      const accountList = await emailAPI.getUserAccounts();
      setAccounts(accountList);
      
      // Set active account
      if (accountList.length > 0 && !activeAccount) {
        const emailParam = searchParams.get('email');
        const account = emailParam 
          ? accountList.find(acc => acc.email === emailParam)
          : accountList[0];
        setActiveAccount(account);
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    }
  }, [activeAccount, searchParams]);

  // Fetch emails
  const fetchEmails = useCallback(async (reset = false) => {
    if (!activeAccount) return;
    
    setLoading(true);
    try {
      const params = {
        email: activeAccount.email,
        provider: activeAccount.provider,
        maxResults: 20,
        pageToken: reset ? null : pageToken
      };

      // Add search query if present
      if (searchQuery) {
        params.query = searchQuery;
      }

      // Add filters
      if (filters.unread) {
        params.query = (params.query ? params.query + ' ' : '') + 'is:unread';
      }

      const response = await emailAPI.fetchInbox(params);
      
      if (reset) {
        setEmails(response.messages || []);
      } else {
        setEmails(prev => [...prev, ...(response.messages || [])]);
      }
      
      setPageToken(response.nextPageToken);
      setHasMore(!!response.nextPageToken);
    } catch (error) {
      showToast.error('Failed to fetch emails');
      console.error('Failed to fetch emails:', error);
    } finally {
      setLoading(false);
    }
  }, [activeAccount, pageToken, searchQuery, filters]);

  // Initial load
  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Fetch emails when account changes
  useEffect(() => {
    if (activeAccount) {
      fetchEmails(true);
    }
  }, [activeAccount]);

  // Handle email selection
  const handleEmailSelect = async (email) => {
    setSelectedEmail(email);
    
    // Mark as read if unread
    if (email.isUnread) {
      try {
        await emailAPI.modifyMessage(email.id, {
          email: activeAccount.email,
          removeLabelIds: ['UNREAD']
        });
        
        // Update local state
        setEmails(prev => prev.map(e => 
          e.id === email.id ? { ...e, isUnread: false } : e
        ));
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    }
  };

  // Handle sync
  const handleSync = async () => {
    if (!activeAccount) return;
    
    setSyncing(true);
    try {
      await emailAPI.triggerSync({
        email: activeAccount.email,
        provider: activeAccount.provider
      });
      showToast.success('Sync started');
      
      // Refresh emails after a short delay
      setTimeout(() => fetchEmails(true), 2000);
    } catch (error) {
      showToast.error('Failed to start sync');
    } finally {
      setSyncing(false);
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (action) => {
    if (selectedEmails.size === 0) return;
    
    const emailIds = Array.from(selectedEmails);
    
    try {
      switch (action) {
        case 'markRead':
          await Promise.all(emailIds.map(id => 
            emailAPI.modifyMessage(id, {
              email: activeAccount.email,
              removeLabelIds: ['UNREAD']
            })
          ));
          break;
          
        case 'markUnread':
          await Promise.all(emailIds.map(id => 
            emailAPI.modifyMessage(id, {
              email: activeAccount.email,
              addLabelIds: ['UNREAD']
            })
          ));
          break;
          
        case 'archive':
          await Promise.all(emailIds.map(id => 
            emailAPI.modifyMessage(id, {
              email: activeAccount.email,
              removeLabelIds: ['INBOX'],
              addLabelIds: ['ARCHIVE']
            })
          ));
          break;
          
        case 'delete':
          await Promise.all(emailIds.map(id => 
            emailAPI.modifyMessage(id, {
              email: activeAccount.email,
              addLabelIds: ['TRASH']
            })
          ));
          break;
      }
      
      // Clear selection and refresh
      setSelectedEmails(new Set());
      fetchEmails(true);
      showToast.success(`Emails ${action} successfully`);
    } catch (error) {
      showToast.error(`Failed to ${action} emails`);
    }
  };

  // Handle send to Tala
  const handleSendToTala = async (emailId) => {
    try {
      const result = await emailAPI.analyzeEmail(emailId, {
        email: activeAccount.email,
        provider: activeAccount.provider
      });
      
      showToast.success('Email analyzed and tasks extracted');
      
      // Optionally refresh or update UI
      if (result.tasks && result.tasks.length > 0) {
        showToast.info(`${result.tasks.length} tasks extracted`);
      }
    } catch (error) {
      showToast.error('Failed to analyze email');
    }
  };

  return (
    <div className="flex h-full bg-gray-50">
      {/* Sidebar */}
      <EmailSidebar 
        accounts={accounts}
        activeAccount={activeAccount}
        onAccountSelect={setActiveAccount}
        filters={filters}
        onFilterChange={setFilters}
        onComposeClick={() => setShowComposer(true)}
      />
      
      {/* Email List */}
      <div className="flex-1 flex">
        <div className="w-96 border-r border-gray-200 bg-white flex flex-col">
          {/* Search and Actions Bar */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search emails..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      fetchEmails(true);
                    }
                  }}
                />
              </div>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
              </button>
            </div>
            
            {/* Bulk Actions */}
            {selectedEmails.size > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBulkAction('markRead')}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Mark read
                </button>
                <button
                  onClick={() => handleBulkAction('archive')}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Archive
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
          
          {/* Email List */}
          <EmailList
            emails={emails}
            selectedEmail={selectedEmail}
            selectedEmails={selectedEmails}
            onEmailSelect={handleEmailSelect}
            onEmailsSelect={setSelectedEmails}
            onLoadMore={() => fetchEmails()}
            hasMore={hasMore}
            loading={loading}
          />
        </div>
        
        {/* Email Viewer */}
        <div className="flex-1 bg-white">
          {selectedEmail ? (
            <EmailViewer
              email={selectedEmail}
              onSendToTala={() => handleSendToTala(selectedEmail.id)}
              onReply={() => setShowComposer(true)}
              onArchive={() => handleBulkAction('archive')}
              onDelete={() => handleBulkAction('delete')}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Mail size={48} className="mx-auto mb-4 opacity-50" />
                <p>Select an email to view</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Email Composer Modal */}
      {showComposer && (
        <EmailComposer
          onClose={() => setShowComposer(false)}
          replyTo={selectedEmail}
          account={activeAccount}
        />
      )}
    </div>
  );
};

export default EmailInbox;