/**
 * Email Viewer Component
 * 
 * Displays full email content with actions
 */

import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Reply,
  ReplyAll,
  Forward,
  Archive,
  Trash2,
  MoreVertical,
  Download,
  ExternalLink,
  Brain,
  CheckCircle,
  AlertCircle,
  Paperclip,
  X
} from 'lucide-react';
import { emailAPI } from '../../services/emailAPI';
import { showToast } from '../../utils/toast';
import { cn } from '../../utils/cn';
import DOMPurify from 'dompurify';

const EmailViewer = ({
  email,
  onSendToTala,
  onReply,
  onArchive,
  onDelete
}) => {
  const [fullEmail, setFullEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [showActions, setShowActions] = useState(false);

  // Fetch full email details
  useEffect(() => {
    const fetchFullEmail = async () => {
      if (!email) return;
      
      setLoading(true);
      try {
        const response = await emailAPI.getMessage(email.id, {
          email: email.from // Assuming we have the email address
        });
        setFullEmail(response);
      } catch (error) {
        console.error('Failed to fetch email:', error);
        showToast.error('Failed to load email');
      } finally {
        setLoading(false);
      }
    };

    fetchFullEmail();
  }, [email]);

  // Handle send to Tala
  const handleSendToTala = async () => {
    setAnalyzing(true);
    try {
      const result = await onSendToTala();
      setAnalysis(result);
      showToast.success('Email analyzed successfully');
    } catch (error) {
      showToast.error('Failed to analyze email');
    } finally {
      setAnalyzing(false);
    }
  };

  // Sanitize HTML content
  const sanitizeHtml = (html) => {
    return {
      __html: DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
          'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'ul', 'ol', 'li',
          'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'tr',
          'td', 'th', 'thead', 'tbody', 'img', 'pre', 'code', 'div', 'span'
        ],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'width', 'height', 'style'],
        ALLOW_DATA_ATTR: false
      })
    };
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!fullEmail) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <p>Failed to load email</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold text-gray-900">
            {fullEmail.subject || '(no subject)'}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSendToTala}
              disabled={analyzing}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                "bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
              )}
            >
              <Brain size={16} />
              {analyzing ? 'Analyzing...' : 'Send to Tala'}
            </button>
            
            <button
              onClick={onReply}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Reply size={18} />
            </button>
            
            <button
              onClick={onArchive}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Archive size={18} />
            </button>
            
            <button
              onClick={onDelete}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Trash2 size={18} />
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <MoreVertical size={18} />
              </button>
              
              {showActions && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                  <button className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100">
                    <ReplyAll size={14} className="inline mr-2" />
                    Reply All
                  </button>
                  <button className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100">
                    <Forward size={14} className="inline mr-2" />
                    Forward
                  </button>
                  <hr className="my-1" />
                  <button className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100">
                    Mark as unread
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Email metadata */}
        <div className="text-sm text-gray-600">
          <div className="flex items-center gap-4 mb-1">
            <span>
              <strong>From:</strong> {fullEmail.from}
            </span>
            <span className="text-gray-400">
              {formatDistanceToNow(new Date(fullEmail.date), { addSuffix: true })}
            </span>
          </div>
          {fullEmail.to && (
            <div>
              <strong>To:</strong> {fullEmail.to}
            </div>
          )}
        </div>
      </div>

      {/* Analysis Results */}
      {analysis && (
        <div className="mx-6 mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={20} className="text-purple-600" />
            <h3 className="font-semibold text-purple-900">Tala Analysis</h3>
          </div>
          
          {analysis.summary && (
            <p className="text-sm text-purple-800 mb-2">{analysis.summary}</p>
          )}
          
          {analysis.tasks && analysis.tasks.length > 0 && (
            <div className="mt-3">
              <h4 className="text-sm font-medium text-purple-900 mb-1">
                Tasks Extracted ({analysis.tasks.length})
              </h4>
              <ul className="space-y-1">
                {analysis.tasks.map((task, index) => (
                  <li key={index} className="text-sm text-purple-700 flex items-start gap-2">
                    <span>•</span>
                    <span>{task.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <button
            onClick={() => setAnalysis(null)}
            className="absolute top-2 right-2 p-1 text-purple-600 hover:bg-purple-100 rounded"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Email Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {fullEmail.htmlBody ? (
          <div 
            className="email-content prose max-w-none"
            dangerouslySetInnerHTML={sanitizeHtml(fullEmail.htmlBody)}
          />
        ) : (
          <div className="whitespace-pre-wrap text-gray-800">
            {fullEmail.body || fullEmail.textBody}
          </div>
        )}
      </div>

      {/* Attachments */}
      {fullEmail.attachments && fullEmail.attachments.length > 0 && (
        <div className="border-t border-gray-200 px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <Paperclip size={16} />
            Attachments ({fullEmail.attachments.length})
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {fullEmail.attachments.map((attachment, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <Paperclip size={16} className="text-gray-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {attachment.filename}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(attachment.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button className="p-1 text-gray-600 hover:bg-gray-200 rounded">
                  <Download size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailViewer;