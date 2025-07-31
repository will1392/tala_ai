import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Plus, AlertCircle, Loader2, Settings, Mic, ChevronDown } from 'lucide-react';
import { GlassCard } from '../components/layout/GlassCard';
import { Button } from '../components/shared/Button';
import { ChatMessage } from '../components/chat/ChatMessage';
import { ChatInput } from '../components/chat/ChatInput';
import { ModeSelector } from '../components/chat/ModeSelector';
import { ConversationContextIndicator } from '../components/chat/ConversationContextIndicator';
import { VoiceSettings } from '../components/chat/VoiceSettings';
import { useConversationContext } from '../hooks/useConversationContext';
import { useMode } from '../hooks/useMode';
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
  mode?: string;
  subMode?: string;
}

// Enhanced chat service with mode support
const chatService = {
  async sendMessage(content: string, conversationId?: string | null, mode?: string, subMode?: string | null) {
    const response = await fetch('http://localhost:3001/api/chat/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'admin-1'
      },
      credentials: 'include',
      body: JSON.stringify({
        message: content,
        userId: 'admin-1',
        isAdmin: true,
        maxResults: 5,
        conversationId: conversationId,
        mode: mode,
        subMode: subMode
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    return await response.json();
  }
};

export const Chat = () => {
  const { mode, subMode, getModeTheme, getModeIcon } = useMode();
  const theme = getModeTheme();
  
  const [messages, setMessages] = useState<any[]>([]);
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

  // Set welcome message based on mode
  useEffect(() => {
    const welcomeMessages = {
      travel: "Hello! I'm Tala, your AI travel assistant. I can help you with visa requirements, travel documents, airline policies, and destination information. How can I assist you today?",
      cmo: "Welcome! I'm Tala in Marketing mode. I can help you with SEO, email campaigns, social media strategy, advertising, and more. What marketing challenge can I help you solve today?"
    };
    
    setMessages([{
      id: 'welcome',
      content: welcomeMessages[mode],
      sender: 'tala' as const,
      timestamp: new Date(),
    }]);
  }, [mode]);

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
          'x-user-id': 'admin-1'
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
          'x-user-id': 'admin-1'
        },
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        const messagesWithDates = (data.messages || []).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages([...messagesWithDates]);
        setCurrentConversationId(conversationId);
      }
    } catch (err) {
      setError('Failed to load conversation');
      console.error('Error loading conversation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadContextStatus = async (conversationId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/context/status?conversationId=${conversationId}`, {
        headers: {
          'x-user-id': 'admin-1'
        },
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setContextStatus(data);
      }
    } catch (err) {
      console.error('Failed to load context status:', err);
    }
  };

  const startNewConversation = async () => {
    setCurrentConversationId(null);
    const welcomeMessages = {
      travel: "Hello! I'm Tala, your AI travel assistant. How can I help you plan your next journey?",
      cmo: `Welcome to Marketing mode! I'm here to help with ${subMode === 'all' || !subMode ? 'all your marketing needs' : subMode}. What would you like to work on?`
    };
    
    setMessages([{
      id: 'welcome-new',
      content: welcomeMessages[mode],
      sender: 'tala' as const,
      timestamp: new Date(),
    }]);
    resetContext();
    setContextStatus(null);
    setError(null);
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      content,
      sender: 'user' as const,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      // Process message with context if enabled
      if (persistContext) {
        await processMessage(content);
      }
      
      // Send with mode information
      const response = await chatService.sendMessage(
        content, 
        currentConversationId,
        mode,
        subMode
      );
      
      if (response.conversationId && !currentConversationId) {
        setCurrentConversationId(response.conversationId);
        loadConversations();
      }
      
      const talaMessage = {
        id: response.messageId || `tala-${Date.now()}`,
        content: response.response,
        sender: 'tala' as const,
        timestamp: new Date(),
        mode: response.mode,
        contextUsed: response.contextUsed,
        retrievalResults: response.retrievalResults
      };

      setMessages(prev => [...prev, talaMessage]);
      
      // Update context status if available
      if (response.contextStatus) {
        setContextStatus(response.contextStatus);
      }
      
      // Speak the response if voice is enabled
      const voiceEnabled = localStorage.getItem('voiceEnabled') === 'true';
      if (voiceEnabled) {
        speechService.speak(response.response, voiceLanguage);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = (transcript: string) => {
    handleSendMessage(transcript);
  };

  const toggleVoice = () => {
    const currentEnabled = localStorage.getItem('voiceEnabled') === 'true';
    const newEnabled = !currentEnabled;
    localStorage.setItem('voiceEnabled', String(newEnabled));
    
    if (!newEnabled) {
      speechService.stop();
    }
  };

  const togglePersistContext = () => {
    setPersistContext(!persistContext);
    if (!persistContext) {
      resetContext();
      setContextStatus(null);
    }
  };

  // Filter conversations by mode
  const filteredConversations = conversations.filter(conv => 
    !conv.mode || conv.mode === mode
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-6">
      <div className="container mx-auto px-4 h-[calc(100vh-3rem)]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="h-full flex gap-6"
        >
          {/* Sidebar */}
          <GlassCard className="w-80 flex flex-col h-full">
            {/* Mode Selector */}
            <div className="p-4 border-b border-gray-200">
              <ModeSelector />
            </div>
            
            {/* Conversations Header */}
            <div className="p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <MessageSquare className="w-5 h-5" style={{ color: theme.primary }} />
                {mode === 'travel' ? 'Travel Chats' : 'Marketing Chats'}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={startNewConversation}
                className="hover:bg-gray-100"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {loadingConversations ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No {mode} conversations yet
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredConversations.map((conv) => (
                    <motion.button
                      key={conv.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => loadConversation(conv.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg transition-all",
                        currentConversationId === conv.id
                          ? "shadow-md"
                          : "hover:bg-gray-50"
                      )}
                      style={{
                        backgroundColor: currentConversationId === conv.id ? theme.hover : undefined,
                        borderLeft: currentConversationId === conv.id ? `3px solid ${theme.primary}` : undefined
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{conv.title}</p>
                          <p className="text-xs text-gray-500 truncate mt-1">{conv.lastMessage}</p>
                        </div>
                        <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                          {new Date(conv.lastActivity).toLocaleDateString()}
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </GlassCard>

          {/* Main Chat Area */}
          <GlassCard className="flex-1 flex flex-col h-full">
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold flex items-center gap-2">
                  <span>{getModeIcon()}</span>
                  {mode === 'travel' ? 'Travel Assistant' : 'Marketing Assistant'}
                </h1>
                {contextStatus && (
                  <ConversationContextIndicator
                    status={contextStatus}
                    onToggle={togglePersistContext}
                    enabled={persistContext}
                  />
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleVoice}
                  className={cn(
                    "transition-colors",
                    localStorage.getItem('voiceEnabled') === 'true' 
                      ? "text-white" 
                      : "text-gray-600"
                  )}
                  style={{
                    backgroundColor: localStorage.getItem('voiceEnabled') === 'true' 
                      ? theme.primary 
                      : undefined
                  }}
                >
                  <Mic className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Voice Settings */}
            {showVoiceSettings && (
              <VoiceSettings
                language={voiceLanguage}
                onLanguageChange={setVoiceLanguage}
                onClose={() => setShowVoiceSettings(false)}
              />
            )}

            {/* Messages Area */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-6 space-y-4"
              onScroll={handleScroll}
            >
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} theme={theme} />
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Tala is thinking...</span>
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Scroll to Bottom Button */}
            {showScrollButton && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                onClick={scrollToBottom}
                className="absolute bottom-24 right-8 p-2 rounded-full shadow-lg"
                style={{ backgroundColor: theme.primary }}
              >
                <ChevronDown className="w-5 h-5 text-white" />
              </motion.button>
            )}

            {/* Input Area */}
            <div className="p-4 border-t border-gray-200">
              <ChatInput
                onSendMessage={handleSendMessage}
                onVoiceInput={handleVoiceInput}
                disabled={isLoading}
                placeholder={`Ask me about ${mode === 'travel' ? 'travel' : 'marketing'}...`}
                theme={theme}
              />
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
};