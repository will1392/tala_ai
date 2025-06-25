import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Paperclip, Mic, Smile, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../shared/Button';
import { cn } from '../../utils/cn';

interface ChatInputProps {
  onSend: (message: string, attachments?: File[]) => void;
}

export const ChatInput = ({ onSend }: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (message.trim() || attachments.length > 0) {
      onSend(message.trim(), attachments);
      setMessage('');
      setAttachments([]);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="glass-dark border-t border-white/10 p-4 space-y-3">
      {/* Attachments Preview */}
      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2"
          >
            {attachments.map((file, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="glass rounded-lg px-3 py-2 flex items-center gap-2 text-sm"
              >
                <Paperclip size={14} />
                <span>{file.name}</span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="text-white/50 hover:text-white"
                >
                  ×
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="flex items-end gap-3">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            rows={1}
            className={cn(
              'w-full resize-none rounded-xl px-4 py-3 pr-12',
              'glass-input min-h-[48px] max-h-[120px]',
              'focus:outline-none focus:ring-2 focus:ring-primary'
            )}
            style={{
              height: 'auto',
              overflowY: message.split('\n').length > 3 ? 'auto' : 'hidden'
            }}
          />
          
          {/* AI Enhance Button */}
          <button className="absolute right-2 bottom-2 p-2 rounded-lg hover:bg-white/10 transition-colors">
            <Sparkles size={18} className="text-primary" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="p-3"
          >
            <Paperclip size={20} />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsRecording(!isRecording)}
            className={cn(
              'p-3',
              isRecording && 'text-red-500 animate-pulse'
            )}
          >
            <Mic size={20} />
          </Button>
          
          <Button
            variant="primary"
            size="sm"
            onClick={handleSend}
            disabled={!message.trim() && attachments.length === 0}
            className="p-3"
          >
            <Send size={20} />
          </Button>
        </div>
      </div>

      {/* Typing Indicators */}
      <div className="flex items-center justify-between text-xs text-white/50">
        <span>Press Enter to send, Shift + Enter for new line</span>
        {message.length > 0 && (
          <span>{message.length} characters</span>
        )}
      </div>
    </div>
  );
};