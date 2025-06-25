import { motion } from 'framer-motion';
import { User, Bot, Copy, ThumbsUp, ThumbsDown, FileText, ExternalLink } from 'lucide-react';
import { GlassCard } from '../layout/GlassCard';
import { Button } from '../shared/Button';
import { cn } from '../../utils/cn';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'tala';
  timestamp: Date;
  sources?: Array<{ title: string; type: 'document' | 'website' }>;
  attachments?: Array<{ name: string; size: string; type: string }>;
}

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.sender === 'user';

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
          'flex items-center gap-2 text-sm text-white/60',
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
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                  code: ({ children }) => (
                    <code className="bg-white/10 px-1 py-0.5 rounded text-sm">{children}</code>
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
                    className="glass rounded-lg p-3 flex items-center gap-3 hover:bg-white/10 cursor-pointer"
                  >
                    <FileText size={20} className="text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{attachment.name}</p>
                      <p className="text-xs text-white/60">{attachment.size}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Sources */}
            {message.sources && message.sources.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-xs text-white/60 mb-2">Sources:</p>
                <div className="space-y-1">
                  {message.sources.map((source, index) => (
                    <button
                      key={index}
                      className="flex items-center gap-2 text-xs text-primary hover:text-primary-light transition-colors"
                    >
                      {source.type === 'document' ? (
                        <FileText size={14} />
                      ) : (
                        <ExternalLink size={14} />
                      )}
                      {source.title}
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
    </motion.div>
  );
};