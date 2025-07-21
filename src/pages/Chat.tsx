import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Plus, AlertCircle, Loader2, Settings, Mic, ChevronDown } from 'lucide-react';
import { GlassCard } from '../components/layout/GlassCard';
import { Button } from '../components/shared/Button';
import { ChatMessage } from '../components/chat/ChatMessage';
import { ChatInput } from '../components/chat/ChatInput';
import { ConversationContextIndicator } from '../components/chat/ConversationContextIndicator';
import { VoiceSettings } from '../components/chat/VoiceSettings';
import { useConversationContext } from '../hooks/useConversationContext';
import { cn } from '../utils/cn';
import { speechService } from '../services/speechService';

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  lastActivity: string;
  messageCount: number;
  userId: string;
  createdAt: string;
}


// Simple chat service with conversation support
const chatService = {
  async sendMessage(content: string, conversationId?: string | null) {
    const response = await fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'test_user_123' // TODO: Get from auth context
      },
      credentials: 'include',
      body: JSON.stringify({
        message: content,
        userId: 'admin-1',
        isAdmin: true,
        maxResults: 5,
        conversationId: conversationId
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    return await response.json();
  }
};

export const Chat = () => {
  const [messages, setMessages] = useState<any[]>([
    {
      id: 'welcome',
      content: "Hello! I'm Tala, your AI travel assistant. I can help you with visa requirements, travel documents, airline policies, and destination information from your knowledge base. How can I assist you today?",
      sender: 'tala' as const,
      timestamp: new Date(),
    }
  ]);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [persistContext, setPersistContext] = useState(true);
  const [contextStatus, setContextStatus] = useState<any>(null);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState('en-US');
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  // Ref for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Initialize conversation context
  const { context, processMessage, resetContext } = useConversationContext({
    sessionId: currentConversationId || 'default',
    userId: 'admin-1',
    conversationId: currentConversationId || 'default'
  });

  // Load conversations on component mount
  useEffect(() => {
    loadConversations();
  }, []);
  
  // Load context status when conversation changes
  useEffect(() => {
    if (currentConversationId) {
      loadContextStatus(currentConversationId);
    }
  }, [currentConversationId]);
  
  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    }
  };

  const loadConversations = async () => {
    try {
      setLoadingConversations(true);
      const response = await fetch('http://localhost:3001/api/chat/conversations?userId=admin-1', {
        headers: {
          'x-user-id': 'test_user_123' // TODO: Get from auth context
        },
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadConversation = async (conversationId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`http://localhost:3001/api/chat/history/${conversationId}?userId=admin-1`, {
        headers: {
          'x-user-id': 'test_user_123' // TODO: Get from auth context
        },
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        // Convert timestamp strings back to Date objects for ChatMessage component
        const messagesWithDates = (data.messages || []).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(messagesWithDates);
        setCurrentConversationId(conversationId);
      } else {
        throw new Error('Failed to load conversation');
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
      setError('Failed to load conversation');
    } finally {
      setIsLoading(false);
    }
  };

  const startNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([
      {
        id: 'welcome_new',
        content: "Hello! I'm Tala, your AI travel assistant. How can I help you today?",
        sender: 'tala' as const,
        timestamp: new Date(),
      }
    ]);
    setError(null);
    resetContext(); // Clear conversation context for new conversation
  };

  const deleteConversation = async (conversationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this conversation?')) {
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:3001/api/chat/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': 'test_user_123' // TODO: Get from auth context
        },
        credentials: 'include',
        body: JSON.stringify({ userId: 'admin-1' })
      });
      
      if (response.ok) {
        // If we're viewing the deleted conversation, start a new one
        if (currentConversationId === conversationId) {
          startNewConversation();
        }
        // Reload conversations list
        loadConversations();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      setError('Failed to delete conversation');
    }
  };

  const handleSendMessage = async (content: string, attachments?: File[], wasVoiceInput?: boolean) => {
    try {
      setError(null);
      
      // Process message through conversation context (only if context is ready)
      if (context) {
        try {
          await processMessage(content);
        } catch (contextError) {
          console.warn('Context processing failed:', contextError);
          // Continue without context processing
        }
      }
      
      // Add user message immediately
      const userMessage = {
        id: `user_${Date.now()}`,
        content,
        sender: 'user' as const,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, userMessage]);
      setIsLoading(true);

      // Call the real Tala AI API
      const response = await chatService.sendMessage(content, currentConversationId);
      
      // Update current conversation ID if this was a new conversation
      if (!currentConversationId && response.conversationId) {
        setCurrentConversationId(response.conversationId);
      }
      
      // Add AI response with sources
      const aiMessage = {
        id: `ai_${Date.now()}`,
        content: response.response,
        sender: 'tala' as const,
        timestamp: new Date(response.timestamp),
        sources: response.sources.map((source: any) => ({
          title: source.title,
          type: source.type,
          score: source.score
        })),
        tokensUsed: response.tokensUsed,
        taskCreated: response.taskCreated
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Show toast notification if task was created
      if (response.taskCreated) {
        const toast = (await import('react-hot-toast')).default;
        toast.success(`Task created: ${response.taskCreated.title}`, {
          duration: 5000,
          icon: '✅'
        });
      }
      
      // Reload conversations to show the updated list
      setTimeout(() => loadConversations(), 500);
      
    } catch (err) {
      console.error('Chat error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      
      // Add error message to chat
      const errorMessage = {
        id: `error_${Date.now()}`,
        content: "I'm sorry, I'm having trouble connecting to my knowledge base right now. Please try again in a moment.",
        sender: 'tala' as const,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);
  
  const loadContextStatus = async (conversationId: string) => {
    try {
      const response = await fetch(
        `http://localhost:3001/api/chat/context/status/${conversationId}?userId=admin-1`,
        {
          headers: {
            'x-user-id': 'test_user_123' // TODO: Get from auth context
          },
          credentials: 'include'
        }
      );
      if (response.ok) {
        const status = await response.json();
        setContextStatus(status);
        setPersistContext(status.persistContext);
      }
    } catch (err) {
      console.error('Failed to load context status:', err);
    }
  };
  
  const handleResetContext = async () => {
    if (!currentConversationId) return;
    
    try {
      const response = await fetch('http://localhost:3001/api/chat/context/reset', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': 'test_user_123' // TODO: Get from auth context
        },
        credentials: 'include',
        body: JSON.stringify({
          conversationId: currentConversationId,
          userId: 'admin-1'
        })
      });
      
      if (response.ok) {
        resetContext();
        // Reload context status
        loadContextStatus(currentConversationId);
      }
    } catch (err) {
      console.error('Failed to reset context:', err);
    }
  };
  
  const handleTogglePersistence = async () => {
    if (!currentConversationId) return;
    
    const newPersistState = !persistContext;
    
    try {
      const response = await fetch('http://localhost:3001/api/chat/context/toggle', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': 'test_user_123' // TODO: Get from auth context
        },
        credentials: 'include',
        body: JSON.stringify({
          conversationId: currentConversationId,
          userId: 'admin-1',
          persistContext: newPersistState
        })
      });
      
      if (response.ok) {
        setPersistContext(newPersistState);
        // Reload context status
        loadContextStatus(currentConversationId);
      }
    } catch (err) {
      console.error('Failed to toggle context persistence:', err);
    }
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-6rem)]">
      {/* Main Chat Area - Full Screen */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Chat Header - Minimal */}
        <div className="glass-dark p-4 border-b border-white/10 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Chat with Tala</h2>
              <p className="text-sm text-white/60">AI Travel Assistant</p>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle size={16} />
                <span>Connection Error</span>
                <Button variant="ghost" size="sm" onClick={clearError} className="p-1">
                  ×
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Messages Area - Full Height */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-6 space-y-4 relative glass min-h-0"
          onScroll={handleScroll}
        >
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <ChatMessage message={message} />
            </motion.div>
          ))}
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-center gap-2 text-white/50 text-sm">
              <Loader2 size={16} className="animate-spin" />
              <span>Tala is searching knowledge base...</span>
            </div>
          )}
          
          {/* Invisible element to scroll to */}
          <div ref={messagesEndRef} />
          
          {/* Scroll to bottom button */}
          {showScrollButton && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={scrollToBottom}
              className="absolute bottom-4 right-4 p-3 bg-primary rounded-full shadow-lg hover:bg-primary/80 transition-colors z-10"
              title="Scroll to bottom"
            >
              <ChevronDown size={20} className="text-white" />
            </motion.button>
          )}
        </div>

        {/* Input Area - Fixed at bottom */}
        <div className="border-t border-white/10 rounded-b-xl glass-dark">
          <ChatInput 
            onSend={handleSendMessage}
            disabled={isLoading}
            placeholder="Ask me about travel, visas, documents, or destinations..."
          />
        </div>
      </div>

      {/* Minimal Sidebar - Conversation History Only */}
      <div className="w-72">
        <GlassCard className="h-full flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h3 className="font-semibold">Conversations</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={startNewConversation}
              className="p-2"
              title="Start new conversation"
            >
              <Plus size={16} />
            </Button>
          </div>
          
          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto p-4">
            {loadingConversations ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin" />
              </div>
            ) : conversations.length > 0 ? (
              <div className="space-y-3">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`group relative glass-button rounded-lg p-3 text-sm hover:bg-white/20 transition-all cursor-pointer ${
                      currentConversationId === conversation.id ? 'bg-primary/20 border border-primary/30' : ''
                    }`}
                    onClick={() => loadConversation(conversation.id)}
                  >
                    <div className="font-medium truncate pr-6">{conversation.title}</div>
                    <div className="text-xs text-white/50 mt-1 truncate">
                      {conversation.lastMessage}
                    </div>
                    <div className="text-xs text-white/40 mt-1">
                      {new Date(conversation.lastActivity).toLocaleDateString()} • {conversation.messageCount} messages
                    </div>
                    
                    {/* Delete button */}
                    <button
                      onClick={(e) => deleteConversation(conversation.id, e)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all"
                      title="Delete conversation"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-white/50">
                <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
                <p>No conversations yet</p>
                <p className="text-xs mt-1">Start chatting to see your history</p>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
      
      {/* Voice Settings Modal */}
      <VoiceSettings
        isOpen={showVoiceSettings}
        onClose={() => setShowVoiceSettings(false)}
        currentLanguage={voiceLanguage}
        onLanguageChange={setVoiceLanguage}
      />
    </div>
  );
};