import { useState, useRef, type KeyboardEvent } from 'react';
import { Send, Paperclip, Mic, MicOff, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../shared/Button';
import { cn } from '../../utils/cn';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';

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

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onVoiceInput?: (transcript: string) => void;
  disabled?: boolean;
  placeholder?: string;
  theme?: ModeTheme;
}

export const ChatInput = ({ 
  onSendMessage, 
  onVoiceInput,
  disabled = false, 
  placeholder = "Type your message...",
  theme
}: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  
  // Speech recognition integration
  const {
    isListening,
    isSupported: isSpeechSupported,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechRecognition({
    onTranscript: (text, isFinal) => {
      if (isFinal) {
        setMessage(text);
        if (onVoiceInput) {
          onVoiceInput(text);
        }
        // Auto-focus textarea after speech recognition
        setTimeout(() => textareaRef.current?.focus(), 100);
      }
    }
  });

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
      resetTranscript();
      textareaRef.current?.focus();
    }
  };

  const handleVoiceToggle = async () => {
    if (isListening) {
      stopListening();
    } else {
      await startListening();
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

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 120);
      textarea.style.height = `${newHeight}px`;
    }
  };

  return (
    <div className="space-y-3">
      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
              style={{
                backgroundColor: currentTheme.hover,
                border: `1px solid ${currentTheme.border}`
              }}
            >
              <Paperclip size={14} style={{ color: currentTheme.primary }} />
              <span style={{ color: currentTheme.text }}>{file.name}</span>
              <button
                onClick={() => removeAttachment(index)}
                className="ml-1 hover:opacity-70"
                style={{ color: currentTheme.textSecondary }}
              >
                ×
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-3">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={isListening ? `${message}${interimTranscript}` : message}
            onChange={(e) => {
              setMessage(e.target.value);
              adjustTextareaHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening... Speak now" : placeholder}
            disabled={disabled || isListening}
            rows={1}
            className={cn(
              'w-full resize-none rounded-xl px-4 py-3 pr-12',
              'min-h-[48px] max-h-[120px] transition-all',
              'focus:outline-none focus:ring-2',
              isListening && 'animate-pulse'
            )}
            style={{
              backgroundColor: isListening 
                ? currentTheme.primary + '10' 
                : currentTheme.surface,
              border: `1px solid ${isListening 
                ? currentTheme.primary + '50' 
                : currentTheme.border}`,
              color: currentTheme.text,
              boxShadow: `0 0 0 2px ${currentTheme.primary}00`,
              ...(textareaRef.current?.matches(':focus') && {
                borderColor: currentTheme.primary,
                boxShadow: `0 0 0 2px ${currentTheme.primary}20`
              })
            }}
          />
          
          {/* AI Enhance Button */}
          <button 
            className="absolute right-2 bottom-2 p-2 rounded-lg transition-all hover:scale-110"
            style={{
              color: currentTheme.primary,
              backgroundColor: 'transparent',
              ...(textareaRef.current?.matches(':hover') && {
                backgroundColor: currentTheme.hover
              })
            }}
            title="AI suggestions"
          >
            <Sparkles size={18} />
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
            accept=".pdf,.doc,.docx,.txt,.md"
          />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 transition-all"
            disabled={disabled}
            style={{
              color: currentTheme.textSecondary,
              ':hover': {
                backgroundColor: currentTheme.hover,
                color: currentTheme.text
              }
            }}
          >
            <Paperclip size={20} />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleVoiceToggle}
            className={cn(
              'p-3 relative transition-all',
              !isSpeechSupported && 'opacity-50 cursor-not-allowed'
            )}
            disabled={disabled || !isSpeechSupported}
            title={!isSpeechSupported ? 'Speech recognition not supported' : isListening ? 'Stop listening' : 'Start voice input'}
            style={{
              color: isListening ? '#ef4444' : currentTheme.textSecondary,
              backgroundColor: isListening ? '#ef444420' : 'transparent',
              ':hover': {
                backgroundColor: isListening ? '#ef444430' : currentTheme.hover
              }
            }}
          >
            {isListening ? (
              <>
                <MicOff size={20} />
                <motion.div
                  className="absolute inset-0 rounded-lg border-2"
                  style={{ borderColor: '#ef4444' }}
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              </>
            ) : (
              <Mic size={20} />
            )}
          </Button>
          
          <Button
            variant="primary"
            size="sm"
            onClick={handleSend}
            disabled={disabled || !message.trim()}
            className="p-3 transition-all"
            style={{
              backgroundColor: currentTheme.primary,
              color: 'white',
              opacity: disabled || !message.trim() ? 0.5 : 1,
              transform: disabled || !message.trim() ? 'scale(0.95)' : 'scale(1)',
              ':hover': {
                backgroundColor: currentTheme.secondary,
                transform: 'scale(1.05)'
              }
            }}
          >
            <Send size={20} />
          </Button>
        </div>
      </div>

      {/* Voice Listening Indicator */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
            style={{
              backgroundColor: currentTheme.primary + '10',
              border: `1px solid ${currentTheme.primary}30`,
              color: currentTheme.primary
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Mic size={16} />
            </motion.div>
            <span>Listening... Speak clearly</span>
            <button
              onClick={stopListening}
              className="ml-auto text-xs hover:underline"
              style={{ color: currentTheme.primary + 'cc' }}
            >
              Stop
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Typing Indicators */}
      <div className="flex items-center justify-between text-xs" 
           style={{ color: currentTheme.textSecondary }}>
        <span>
          {isListening 
            ? "Voice input active - click microphone to stop"
            : "Press Enter to send, Shift + Enter for new line"
          }
        </span>
        {message.length > 0 && (
          <span>{message.length} characters</span>
        )}
      </div>
    </div>
  );
};