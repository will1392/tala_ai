/**
 * Email Composer Component
 * 
 * Modal for composing and sending emails
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Paperclip,
  Bold,
  Italic,
  Underline,
  Link,
  Image,
  Smile,
  MoreVertical,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { cn } from '../../utils/cn';

const EmailComposer = ({
  onClose,
  replyTo = null,
  account = null
}) => {
  const [to, setTo] = useState(replyTo?.from || '');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState(
    replyTo ? `Re: ${replyTo.subject}` : ''
  );
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [attachments, setAttachments] = useState([]);
  
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);

  // Focus on editor when opened
  useEffect(() => {
    if (!isMinimized && editorRef.current) {
      editorRef.current.focus();
    }
  }, [isMinimized]);

  // Handle send
  const handleSend = async () => {
    if (!to || !subject || !body) {
      alert('Please fill in all required fields');
      return;
    }

    setSending(true);
    try {
      // TODO: Implement actual email sending
      console.log('Sending email:', { to, cc, bcc, subject, body });
      
      // Simulate sending
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onClose();
    } catch (error) {
      console.error('Failed to send email:', error);
      alert('Failed to send email');
    } finally {
      setSending(false);
    }
  };

  // Handle file attachment
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setAttachments(prev => [...prev, ...files]);
  };

  // Remove attachment
  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Format toolbar actions
  const formatText = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current.focus();
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-0 right-4 w-80 bg-white border border-gray-300 rounded-t-lg shadow-lg">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-100 rounded-t-lg cursor-pointer"
             onClick={() => setIsMinimized(false)}>
          <span className="font-medium text-sm">{subject || 'New Message'}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(false);
              }}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <Maximize2 size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-3xl h-[80vh] rounded-lg shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold">New Message</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Minimize2 size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Recipients */}
        <div className="px-4 py-3 border-b border-gray-200 space-y-2">
          <div className="flex items-center gap-2">
            <label className="w-12 text-sm text-gray-600">To:</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="flex-1 px-2 py-1 focus:outline-none"
              placeholder="Recipients"
              required
            />
            <button
              onClick={() => setShowCc(!showCc)}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              {showCc ? 'Hide' : 'Cc/Bcc'}
            </button>
          </div>
          
          {showCc && (
            <>
              <div className="flex items-center gap-2">
                <label className="w-12 text-sm text-gray-600">Cc:</label>
                <input
                  type="email"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  className="flex-1 px-2 py-1 focus:outline-none"
                  placeholder="Cc"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="w-12 text-sm text-gray-600">Bcc:</label>
                <input
                  type="email"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  className="flex-1 px-2 py-1 focus:outline-none"
                  placeholder="Bcc"
                />
              </div>
            </>
          )}
          
          <div className="flex items-center gap-2">
            <label className="w-12 text-sm text-gray-600">Subject:</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="flex-1 px-2 py-1 focus:outline-none"
              placeholder="Subject"
              required
            />
          </div>
        </div>

        {/* Formatting Toolbar */}
        <div className="px-4 py-2 border-b border-gray-200 flex items-center gap-1">
          <button
            onClick={() => formatText('bold')}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Bold"
          >
            <Bold size={16} />
          </button>
          <button
            onClick={() => formatText('italic')}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Italic"
          >
            <Italic size={16} />
          </button>
          <button
            onClick={() => formatText('underline')}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Underline"
          >
            <Underline size={16} />
          </button>
          <div className="w-px h-6 bg-gray-300 mx-1" />
          <button
            onClick={() => {
              const url = prompt('Enter URL:');
              if (url) formatText('createLink', url);
            }}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Insert Link"
          >
            <Link size={16} />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Attach File"
          >
            <Paperclip size={16} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Email Body */}
        <div className="flex-1 px-4 py-3 overflow-y-auto">
          <div
            ref={editorRef}
            contentEditable
            className="min-h-full focus:outline-none"
            placeholder="Write your message..."
            onInput={(e) => setBody(e.currentTarget.textContent)}
            dangerouslySetInnerHTML={{ __html: body }}
          />
        </div>

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-200">
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg"
                >
                  <Paperclip size={14} />
                  <span className="text-sm">{file.name}</span>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="p-0.5 hover:bg-gray-200 rounded"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {account && `Sending from: ${account.email}`}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !to || !subject || !body}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
                "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <Send size={16} />
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailComposer;