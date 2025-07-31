import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Bot, Copy, ThumbsUp, ThumbsDown, FileText, ExternalLink } from 'lucide-react';
import { GlassCard } from '../layout/GlassCard';
import { Button } from '../shared/Button';
import { cn } from '../../utils/cn';
import ReactMarkdown from 'react-markdown';
import { ReferenceDocumentModal } from './ReferenceDocumentModal';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'tala';
  timestamp: Date;
  mode?: {
    current: string;
    subMode?: string;
  };
  sources?: Array<{ 
    title: string; 
    type: 'document' | 'website';
    score?: number;
    documentId?: string;
  }>;
  attachments?: Array<{ name: string; size: string; type: string }>;
}

interface ModeTheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  hover: string;
  gradient: string;
}

interface ChatMessageProps {
  message: Message;
  theme?: ModeTheme;
}

export const ChatMessage = ({ message, theme }: ChatMessageProps) => {
  const isUser = message.sender === 'user';
  const [selectedReference, setSelectedReference] = useState<{ 
    title: string; 
    type: 'document' | 'website';
    score?: number;
    documentId?: string;
  } | null>(null);
  const [showReferenceModal, setShowReferenceModal] = useState(false);

  // Default theme fallback
  const currentTheme = theme || {
    primary: '#0fc6c6',
    secondary: '#0a9999',
    accent: '#06d6d6',
    background: '#f0fffe',
    surface: '#ffffff',
    text: '#1a202c',
    textSecondary: '#4a5568',
    border: '#e2e8f0',
    hover: '#e6fffa',
    gradient: 'linear-gradient(135deg, #0fc6c6 0%, #0a9999 100%)'
  };

  const handleReferenceClick = (source: typeof selectedReference) => {
    setSelectedReference(source);
    setShowReferenceModal(true);
  };

  const handleCloseModal = () => {
    setShowReferenceModal(false);
    setSelectedReference(null);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
    // You could add a toast notification here
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: isUser ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex gap-4',
        isUser && 'flex-row-reverse'
      )}
    >
      {/* Avatar */}
      <div 
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
          'shadow-lg'
        )}
        style={{
          background: isUser 
            ? currentTheme.primary 
            : currentTheme.gradient
        }}
      >
        {isUser ? (
          <User size={20} className="text-white" />
        ) : (
          <Bot size={20} className="text-white" />
        )}
      </div>

      {/* Message Content */}
      <div className={cn(
        'flex-1 space-y-2',
        isUser && 'flex flex-col items-end'
      )}>
        {/* Name and Time */}
        <div className={cn(
          'flex items-center gap-2 text-sm',
          isUser && 'flex-row-reverse'
        )}
        style={{ color: currentTheme.textSecondary }}
        >
          <span className="font-medium">{isUser ? 'You' : 'Tala'}</span>
          <span>•</span>
          <span>{message.timestamp.toLocaleTimeString()}</span>
          {message.mode && !isUser && (
            <>
              <span>•</span>
              <span className="text-xs px-2 py-0.5 rounded-full" 
                    style={{ 
                      backgroundColor: currentTheme.primary + '20',
                      color: currentTheme.primary 
                    }}>
                {message.mode.current === 'cmo' && message.mode.subMode 
                  ? message.mode.subMode.toUpperCase() 
                  : message.mode.current.toUpperCase()}
              </span>
            </>
          )}
        </div>

        {/* Message Bubble */}
        <div className={cn(
          'max-w-[80%]',
          isUser && 'ml-auto'
        )}>
          <div 
            className={cn(
              'p-4 rounded-lg shadow-sm',
              isUser 
                ? 'rounded-tr-sm' 
                : 'rounded-tl-sm'
            )}
            style={{
              backgroundColor: isUser 
                ? currentTheme.primary + '15' 
                : currentTheme.surface,
              border: `1px solid ${isUser ? currentTheme.primary + '30' : currentTheme.border}`
            }}
          >
            <div className="prose max-w-none" style={{ color: currentTheme.text }}>
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                  code: ({ children }) => (
                    <code className="px-1 py-0.5 rounded text-sm"
                          style={{ backgroundColor: currentTheme.primary + '10' }}>
                      {children}
                    </code>
                  ),
                  a: ({ children, href }) => (
                    <a href={href} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="underline hover:no-underline"
                       style={{ color: currentTheme.primary }}>
                      {children}
                    </a>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {message.attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="rounded-lg p-3 flex items-center gap-3 cursor-pointer transition-colors"
                    style={{
                      backgroundColor: currentTheme.hover,
                      border: `1px solid ${currentTheme.border}`
                    }}
                  >
                    <FileText size={20} style={{ color: currentTheme.primary }} />
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: currentTheme.text }}>
                        {attachment.name}
                      </p>
                      <p className="text-xs" style={{ color: currentTheme.textSecondary }}>
                        {attachment.size}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Sources */}
            {message.sources && message.sources.length > 0 && (
              <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${currentTheme.border}` }}>
                <p className="text-xs mb-2" style={{ color: currentTheme.textSecondary }}>
                  Sources:
                </p>
                <div className="space-y-1">
                  {message.sources.map((source, index) => (
                    <button
                      key={index}
                      onClick={() => handleReferenceClick(source)}
                      className="flex items-center gap-2 text-xs transition-colors rounded px-2 py-1 -mx-2 w-full hover:bg-gray-50"
                      style={{ color: currentTheme.primary }}
                    >
                      {source.type === 'document' ? (
                        <FileText size={14} />
                      ) : (
                        <ExternalLink size={14} />
                      )}
                      <span className="truncate flex-1 text-left">{source.title}</span>
                      {source.score && (
                        <span className="text-xs ml-auto" 
                              style={{ color: currentTheme.textSecondary }}
                              title="Relevance score">
                          {Math.round(source.score * 100)}%
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Message Actions */}
          {!isUser && (
            <div className="flex items-center gap-1 mt-2">
              <button
                onClick={handleCopyMessage}
                className="p-2 rounded-md transition-colors hover:bg-gray-100"
                title="Copy message"
              >
                <Copy size={16} style={{ color: currentTheme.textSecondary }} />
              </button>
              <button
                className="p-2 rounded-md transition-colors hover:bg-gray-100"
                title="Helpful"
              >
                <ThumbsUp size={16} style={{ color: currentTheme.textSecondary }} />
              </button>
              <button
                className="p-2 rounded-md transition-colors hover:bg-gray-100"
                title="Not helpful"
              >
                <ThumbsDown size={16} style={{ color: currentTheme.textSecondary }} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reference Document Modal */}
      <ReferenceDocumentModal
        isOpen={showReferenceModal}
        onClose={handleCloseModal}
        reference={selectedReference}
      />
    </motion.div>
  );
};