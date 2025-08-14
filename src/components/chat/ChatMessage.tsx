import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Bot, Copy, ThumbsUp, ThumbsDown, FileText, ExternalLink } from 'lucide-react';
import { GlassCard } from '../layout/GlassCard';
import { Button } from '../shared/Button';
import { cn } from '../../utils/cn';
import Markdown from '../shared/Markdown';
import { ReferenceDocumentModal } from './ReferenceDocumentModal';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'tala' | 'system';
  timestamp: Date;
  sources?: Array<{ 
    title: string; 
    type: 'document' | 'website';
    score?: number;
    documentId?: string;
  }>;
  attachments?: Array<{ name: string; size: string; type: string }>;
  isAnnouncement?: boolean;
}

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.sender === 'user';
  const isSystem = message.sender === 'system';
  const [selectedReference, setSelectedReference] = useState<{ 
    title: string; 
    type: 'document' | 'website';
    score?: number;
    documentId?: string;
  } | null>(null);
  const [showReferenceModal, setShowReferenceModal] = useState(false);

  const handleReferenceClick = (source: typeof selectedReference) => {
    setSelectedReference(source);
    setShowReferenceModal(true);
  };

  const handleCloseModal = () => {
    setShowReferenceModal(false);
    setSelectedReference(null);
  };

  // Render system announcement message
  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center my-4"
      >
        <div className="max-w-2xl w-full">
          <GlassCard 
            variant="light"
            className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20"
          >
            <div className="text-center">
              <Markdown content={message.content} />
            </div>
          </GlassCard>
        </div>
      </motion.div>
    );
  }

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
      <div className={cn(
        'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
        isUser 
          ? 'bg-primary' 
          : 'bg-gradient-to-br from-primary to-primary-dark'
      )}>
        {isUser ? (
          <User size={20} className="text-secondary-900" />
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
          'flex items-center gap-2 text-sm text-gray-600 dark:text-white/60',
          isUser && 'flex-row-reverse'
        )}>
          <span className="font-medium">{isUser ? 'You' : 'Tala'}</span>
          <span>•</span>
          <span>{message.timestamp.toLocaleTimeString()}</span>
        </div>

        {/* Message Bubble */}
        <div className={cn(
          'max-w-[80%]',
          isUser && 'ml-auto'
        )}>
          <GlassCard 
            variant={isUser ? 'dark' : 'light'}
            className={cn(
              'p-4',
              isUser ? 'bg-primary/20' : ''
            )}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap leading-relaxed text-gray-900 dark:text-gray-100">{message.content}</p>
            ) : (
              <Markdown content={message.content} />
            )}

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {message.attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="glass rounded-lg p-3 flex items-center gap-3 hover:bg-white/10 cursor-pointer"
                  >
                    <FileText size={20} className="text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{attachment.name}</p>
                      <p className="text-xs text-gray-600 dark:text-white/60">{attachment.size}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Sources */}
            {message.sources && message.sources.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-xs text-gray-600 dark:text-white/60 mb-2">Sources:</p>
                <div className="space-y-1">
                  {message.sources.map((source, index) => (
                    <button
                      key={index}
                      onClick={() => handleReferenceClick(source)}
                      className="flex items-center gap-2 text-xs text-primary hover:text-primary-light transition-colors hover:bg-white/5 rounded px-2 py-1 -mx-2"
                    >
                      {source.type === 'document' ? (
                        <FileText size={14} />
                      ) : (
                        <ExternalLink size={14} />
                      )}
                      <span className="truncate flex-1 text-left">{source.title}</span>
                      {source.score && (
                        <span className="text-xs text-gray-500 dark:text-white/40 ml-auto" title="Relevance score">
                          {Math.round(source.score * 100)}%
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>

          {/* Message Actions */}
          {!isUser && (
            <div className="flex items-center gap-2 mt-2">
              <Button variant="ghost" size="sm" className="p-2 h-8">
                <Copy size={16} />
              </Button>
              <Button variant="ghost" size="sm" className="p-2 h-8">
                <ThumbsUp size={16} />
              </Button>
              <Button variant="ghost" size="sm" className="p-2 h-8">
                <ThumbsDown size={16} />
              </Button>
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