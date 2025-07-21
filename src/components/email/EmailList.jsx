/**
 * Email List Component
 * 
 * Displays list of emails with infinite scroll
 */

import React, { useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  CheckSquare,
  Square,
  Star,
  StarOff,
  Paperclip,
  Circle
} from 'lucide-react';
import { cn } from '../../utils/cn';

const EmailList = ({
  emails,
  selectedEmail,
  selectedEmails,
  onEmailSelect,
  onEmailsSelect,
  onLoadMore,
  hasMore,
  loading
}) => {
  const bottomRef = useRef(null);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (bottomRef.current) {
      observer.observe(bottomRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  // Handle checkbox toggle
  const handleCheckboxToggle = (emailId, event) => {
    event.stopPropagation();
    const newSelected = new Set(selectedEmails);
    
    if (newSelected.has(emailId)) {
      newSelected.delete(emailId);
    } else {
      newSelected.add(emailId);
    }
    
    onEmailsSelect(newSelected);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedEmails.size === emails.length) {
      onEmailsSelect(new Set());
    } else {
      onEmailsSelect(new Set(emails.map(e => e.id)));
    }
  };

  // Format email preview
  const formatPreview = (snippet) => {
    if (!snippet) return '';
    return snippet.length > 100 ? snippet.substring(0, 100) + '...' : snippet;
  };

  // Get email type icon
  const getEmailTypeIcon = (email) => {
    if (email.hasAttachments) {
      return <Paperclip size={14} className="text-gray-400" />;
    }
    return null;
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Select All */}
      {emails.length > 0 && (
        <div className="sticky top-0 bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center gap-2">
          <button
            onClick={handleSelectAll}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
          >
            {selectedEmails.size === emails.length ? (
              <CheckSquare size={16} className="text-blue-600" />
            ) : (
              <Square size={16} className="text-gray-400" />
            )}
          </button>
          <span className="text-sm text-gray-600">
            {selectedEmails.size > 0 && `${selectedEmails.size} selected`}
          </span>
        </div>
      )}

      {/* Email Items */}
      <div className="divide-y divide-gray-200">
        {emails.map((email) => (
          <div
            key={email.id}
            onClick={() => onEmailSelect(email)}
            className={cn(
              "px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors",
              selectedEmail?.id === email.id && "bg-blue-50 hover:bg-blue-50",
              email.isUnread && "bg-white font-medium"
            )}
          >
            <div className="flex items-start gap-3">
              {/* Checkbox */}
              <button
                onClick={(e) => handleCheckboxToggle(email.id, e)}
                className="mt-1 p-1 hover:bg-gray-200 rounded transition-colors"
              >
                {selectedEmails.has(email.id) ? (
                  <CheckSquare size={16} className="text-blue-600" />
                ) : (
                  <Square size={16} className="text-gray-400" />
                )}
              </button>

              {/* Email Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {email.isUnread && (
                      <Circle size={8} className="text-blue-600 fill-current" />
                    )}
                    <span className={cn(
                      "text-sm truncate",
                      email.isUnread ? "text-gray-900 font-semibold" : "text-gray-700"
                    )}>
                      {email.from}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(email.date), { addSuffix: true })}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <h4 className={cn(
                    "flex-1 text-sm truncate",
                    email.isUnread ? "text-gray-900" : "text-gray-700"
                  )}>
                    {email.subject || '(no subject)'}
                  </h4>
                  {getEmailTypeIcon(email)}
                </div>
                
                <p className="text-sm text-gray-500 truncate mt-1">
                  {formatPreview(email.snippet)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-4 text-center">
          <div className="inline-flex items-center gap-2 text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500" />
            Loading...
          </div>
        </div>
      )}

      {/* No emails */}
      {!loading && emails.length === 0 && (
        <div className="py-12 text-center text-gray-500">
          <p>No emails found</p>
        </div>
      )}

      {/* Infinite scroll anchor */}
      <div ref={bottomRef} className="h-1" />
    </div>
  );
};

export default EmailList;