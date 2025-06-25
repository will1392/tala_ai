import { useState } from 'react';
import { MessageCircle, X, Send, Paperclip } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../layout/GlassCard';
import { Button } from '../shared/Button';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

export const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: '1',
      content: 'Hello! I\'m Tala, your AI travel assistant. How can I help you today?',
      sender: 'tala' as const,
      timestamp: new Date(),
    }
  ]);

  return (
    <>
      {/* Chat Bubble */}
      <motion.button
        className="fixed bottom-6 right-6 w-16 h-16 bg-primary rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform glow"
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        animate={!isOpen ? { scale: [1, 1.1, 1] } : {}}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <MessageCircle size={28} className="text-secondary-900" />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 w-96 h-[600px] z-50"
          >
            <GlassCard className="h-full flex flex-col p-0 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-primary to-primary-dark p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <MessageCircle size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Tala Assistant</h3>
                    <p className="text-xs text-white/80">Always here to help</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="p-2"
                >
                  <X size={20} />
                </Button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
              </div>

              {/* Input */}
              <ChatInput onSend={(content) => {
                setMessages([...messages, {
                  id: Date.now().toString(),
                  content,
                  sender: 'user',
                  timestamp: new Date(),
                }]);
              }} />
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatWidget;