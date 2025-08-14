import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Paperclip,
  Plus,
  ChevronDown,
  Menu,
  X,
  ArrowUp,
  Sparkles,
  Mic,
  MicOff,
  Plane,
  WifiOff,
  Wifi,
  Clock,
  RefreshCw,
  Upload
} from 'lucide-react';
import { cn } from '../utils/cn';
import toast from 'react-hot-toast';
import useConversation from '../hooks/useConversation';
import useRetryableRequest from '../hooks/useRetryableRequest';
import { renderMarkdownSimple } from '../utils/markdownRenderer';
import StageBar from '../components/chat/StageBar';
import type { Stage } from '../components/chat/StageBar';
import ChatBubble from '../components/chat/ChatBubble';
import { useStatusUpdates } from '../hooks/useStatusUpdates';
import Topbar from '../components/layout/Topbar';

type MarketingMode = 
  | 'general' 
  | 'seo' 
  | 'email' 
  | 'social' 
  | 'ads' 
  | 'content' 
  | 'analytics';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  mode?: 'travel' | 'marketing';
  marketingMode?: MarketingMode;
  sources?: Array<{
    title: string;
    type: string;
    score: number;
  }>;
  failed?: boolean;
  retrying?: boolean;
}

const marketingModes = [
  { id: 'general' as MarketingMode, label: 'Marketing Assistant' },
  { id: 'seo' as MarketingMode, label: 'SEO Specialist' },
  { id: 'email' as MarketingMode, label: 'Email Marketing' },
  { id: 'social' as MarketingMode, label: 'Social Media' },
  { id: 'ads' as MarketingMode, label: 'Paid Advertising' },
  { id: 'content' as MarketingMode, label: 'Content Strategy' },
  { id: 'analytics' as MarketingMode, label: 'Analytics' }
];

export const TalaFinalChatRedesigned: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMarketingMode, setIsMarketingMode] = useState(false);
  const [currentMarketingMode, setCurrentMarketingMode] = useState<MarketingMode>('general');
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [userName, setUserName] = useState('Will');
  const [currentRequestId, setCurrentRequestId] = useState<string | undefined>();
  const [stage, setStage] = useState<Stage>('complete');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Use status updates hook
  const { currentStage, statusMessage, details } = useStatusUpdates(currentRequestId, isLoading);
  
  // Use conversation hook for persistence
  const {
    conversationId,
    setConversationId,
    createNewConversation,
    updateConversation,
    clearConversation,
    conversations,
    switchConversation,
    loadConversationList
  } = useConversation({ 
    userId: 'admin-1',
    autoLoad: false
  });
  
  // Use retryable request hook
  const {
    executeWithRetry,
    isOnline,
    requestQueue,
    clearQueue,
    isRetrying
  } = useRetryableRequest({
    maxRetries: 3,
    initialDelay: 1000,
    onRetry: (attempt) => {
      console.log(`Retry attempt ${attempt}`);
    }
  });

  // Map backend stages to frontend stages
  useEffect(() => {
    if (currentStage) {
      const stageMapping: Record<string, Stage> = {
        'initializing': 'received',
        'context': 'uploading',
        'searching': 'processing',
        'analyzing': 'processing',
        'generating': 'answering',
        'complete': 'complete'
      };
      const mappedStage = stageMapping[currentStage] || 'processing';
      setStage(mappedStage);
    }
  }, [currentStage]);

  // Load conversation messages when conversation changes
  const loadConversationMessages = async (convId: string) => {
    if (!convId) {
      setMessages([]);
      return;
    }
    
    try {
      setIsLoading(true);
      console.log('🔄 Loading messages for conversation:', convId);
      
      // Always try backend first - this is our source of truth
      const response = await fetch(`http://localhost:3001/api/conversations/${convId}/messages`, {
        headers: {
          'x-user-id': 'admin-1'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Backend messages response:', data);
        
        if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
          // Convert backend messages to our Message format
          const formattedMessages = data.messages.map((msg: any) => ({
            id: msg.id || msg.index?.toString() || Date.now().toString(),
            content: msg.content || msg.message || '',
            sender: msg.sender || (msg.role === 'assistant' ? 'assistant' : 'user'),
            timestamp: new Date(msg.timestamp || msg.created_at || msg.createdAt),
            mode: msg.metadata?.mode || msg.mode || 'travel',
            marketingMode: msg.metadata?.marketingMode || msg.marketingMode,
            sources: msg.metadata?.sources || msg.sources || []
          }));
          setMessages(formattedMessages);
          console.log(`✅ Loaded ${formattedMessages.length} messages from backend`);
          
          // Cache in localStorage for offline access
          const storageKey = `tala_messages_${convId}`;
          localStorage.setItem(storageKey, JSON.stringify(formattedMessages));
        } else {
          console.log('⚠️ No messages found in backend for:', convId);
          
          // Fallback to localStorage cache if backend has no messages
          const storageKey = `tala_messages_${convId}`;
          const cached = localStorage.getItem(storageKey);
          if (cached) {
            const cachedMessages = JSON.parse(cached);
            setMessages(cachedMessages);
            console.log('📦 Loaded from cache:', cachedMessages.length, 'messages');
          } else {
            setMessages([]);
          }
        }
      } else {
        console.log('❌ Backend request failed:', response.status);
        
        // Fallback to localStorage cache
        const storageKey = `tala_messages_${convId}`;
        const cached = localStorage.getItem(storageKey);
        if (cached) {
          const cachedMessages = JSON.parse(cached);
          setMessages(cachedMessages);
          console.log('📦 Using cached messages (backend unavailable)');
        } else {
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('❌ Error loading messages:', error);
      
      // Last resort: try localStorage
      const storageKey = `tala_messages_${convId}`;
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        const cachedMessages = JSON.parse(cached);
        setMessages(cachedMessages);
        console.log('📦 Using cached messages (error fallback)');
      } else {
        setMessages([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load conversation list on mount
  useEffect(() => {
    loadConversationList();
  }, []);

  // Handle conversation switching
  useEffect(() => {
    if (conversationId) {
      loadConversationMessages(conversationId);
    }
  }, [conversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].sender === 'user') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date(),
      mode: isMarketingMode ? 'marketing' : 'travel',
      marketingMode: isMarketingMode ? currentMarketingMode : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = input;
    setInput('');
    setIsLoading(true);
    setStage('received');
    
    // Generate unique request ID for status tracking
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setCurrentRequestId(requestId);

    try {
      const data = await executeWithRetry(async () => {
        const response = await fetch(`http://localhost:3001/api/chat/v2`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': 'admin-1'
          },
          body: JSON.stringify({
            message: messageText,
            mode: isMarketingMode ? 'cmo' : 'travel',
            subMode: isMarketingMode ? currentMarketingMode : undefined,
            conversationId: conversationId,
            searchKnowledge: true, // Always search knowledge base for better responses
            requestId: requestId
          })
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(error || 'Failed to get response');
        }

        return response.json();
      });
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        sender: 'assistant',
        timestamp: new Date(),
        sources: data.sources || [],
        mode: userMessage.mode
      };

      setMessages(prev => [...prev, assistantMessage]);
      setStage('complete');
      
      // Update conversation if needed
      const backendConversationId = data.conversationId;
      if (backendConversationId && backendConversationId !== conversationId) {
        setConversationId(backendConversationId);
        loadConversationList();
      }

    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(`Failed to send message: ${error.message}`);
      setStage('complete');
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    // Save current messages before clearing (only if not a frontend ID)
    if (conversationId && messages.length > 0 && !conversationId.startsWith('conv-')) {
      const storageKey = `tala_messages_${conversationId}`;
      localStorage.setItem(storageKey, JSON.stringify(messages));
      console.log('💾 Saved current conversation before starting new');
    }
    
    // Clear messages and conversation
    setMessages([]);
    clearConversation(); // This returns null, backend will create new ID
    setStage('complete');
    
    console.log('🆕 Started new chat (backend will create ID on first message)');
  };

  return (
    <div className="h-screen flex flex-col bg-[var(--bg)] overflow-hidden">
      <Topbar title="Tala Chat" onNew={startNewChat} />
      
      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="w-64 border-r border-[var(--border)] bg-[var(--panel)] flex flex-col"
            >
              <div className="p-4 border-b border-[var(--border)]">
                <button
                  onClick={startNewChat}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 text-[var(--primary)] transition-colors"
                  aria-label="Start new chat conversation"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  New Chat
                </button>
              </div>
              
              <nav className="flex-1 overflow-y-auto p-2" aria-label="Conversation history">
                <h2 className="text-xs text-[var(--muted)] px-3 py-2 uppercase tracking-wider">
                  Recent Conversations
                </h2>
                <ul role="list">
                  {conversations.slice(0, 10).map((conv) => (
                    <li key={conv.id}>
                      <button
                        onClick={async () => {
                          await switchConversation(conv.id);
                          loadConversationMessages(conv.id);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--bg)] transition-colors",
                          conv.id === conversationId && "bg-[var(--bg)]"
                        )}
                        aria-label={`Conversation: ${conv.title || 'Untitled'}, last updated ${new Date(conv.updatedAt).toLocaleString()}`}
                        aria-current={conv.id === conversationId ? "true" : undefined}
                      >
                        <div className="text-sm text-[var(--fg)] truncate">
                          {conv.title || 'Untitled Conversation'}
                        </div>
                        <time className="text-xs text-[var(--muted)] mt-0.5" dateTime={conv.updatedAt}>
                          {new Date(conv.updatedAt).toLocaleString()}
                        </time>
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Stage Bar */}
          {isLoading && (
            <div className="flex-shrink-0 px-4 py-2 border-b border-[var(--border)]">
              <StageBar stage={stage} />
            </div>
          )}

          {/* Messages */}
          <main className="flex-1 overflow-y-auto px-4 py-6 min-h-0" role="main" aria-label="Chat messages">
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-12"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--primary)]/10 mb-4">
                    {isMarketingMode ? (
                      <Sparkles className="w-8 h-8 text-[var(--primary)]" aria-hidden="true" />
                    ) : (
                      <Plane className="w-8 h-8 text-[var(--primary)]" aria-hidden="true" />
                    )}
                  </div>
                  
                  <h1 className="text-2xl font-light mb-2 text-[var(--fg)]">
                    {isMarketingMode 
                      ? `How can I help with marketing today, ${userName}?`
                      : `Hey, ${userName}!`
                    }
                  </h1>
                  
                  <p className="text-[var(--muted)]">
                    {isMarketingMode 
                      ? 'I can help with SEO, email campaigns, social media, and more'
                      : "I'm TALA, your travel assistant. Ask me anything about travel!"
                    }
                  </p>
                </motion.div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 24 }}
                    >
                      <ChatBubble
                        from={message.sender}
                        text={message.content}
                      />
                      
                      {/* Sources */}
                      {message.sources && message.sources.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mt-2 ml-12 flex flex-wrap gap-2"
                        >
                          <div className="text-xs text-[var(--muted)]">Sources:</div>
                          {message.sources.map((source, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--bg)] text-xs text-[var(--muted)]"
                            >
                              {source.title}
                              <span className="text-[var(--muted)]/60">
                                ({Math.round(source.score * 100)}%)
                              </span>
                            </span>
                          ))}
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
              <div ref={messagesEndRef} />
            </div>
          </main>

          {/* Input Area */}
          <div className="flex-shrink-0 border-t border-[var(--border)] bg-[var(--panel)] p-4">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-end gap-3">
                <div className="flex-1 flex items-center rounded-2xl border border-[var(--border)] bg-[var(--bg)] pr-2 focus-within:ring-2 focus-within:ring-[var(--ring)]">
                  <button 
                    className="p-3 text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
                    aria-label="Attach file"
                  >
                    <Upload size={20} aria-hidden="true" />
                  </button>
                  
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={isMarketingMode ? "Ask about marketing..." : "Ask about travel..."}
                    className="flex-1 bg-transparent px-2 py-3 outline-none resize-none text-[var(--fg)] placeholder:text-[var(--muted)]"
                    rows={1}
                    style={{ minHeight: '48px', maxHeight: '120px' }}
                    aria-label={isMarketingMode ? "Marketing question input" : "Travel question input"}
                  />
                  
                  <button
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] text-black px-4 py-2 font-medium disabled:opacity-50 transition-all hover:bg-[var(--primary)]/90"
                    aria-label="Send message"
                  >
                    <Send size={16} aria-hidden="true" />
                    Send
                  </button>
                </div>
                
                <button
                  onClick={() => setIsRecording(!isRecording)}
                  className={cn(
                    "p-3 rounded-xl border transition-all",
                    isRecording 
                      ? "bg-red-500 text-white border-red-500" 
                      : "border-[var(--border)] hover:border-[var(--primary)]/60 text-[var(--muted)]"
                  )}
                  aria-label={isRecording ? "Stop voice recording" : "Start voice recording"}
                  aria-pressed={isRecording}
                >
                  {isRecording ? <MicOff size={20} aria-hidden="true" /> : <Mic size={20} aria-hidden="true" />}
                </button>
              </div>
              
              {/* Mode Toggle */}
              <div className="mt-3 flex items-center justify-between">
                <button
                  onClick={() => setIsMarketingMode(!isMarketingMode)}
                  className="text-xs text-[var(--muted)] hover:text-[var(--primary)] transition-colors"
                  aria-label={`Current mode: ${isMarketingMode ? 'Marketing' : 'Travel'}. Click to switch.`}
                  aria-pressed={isMarketingMode}
                >
                  Mode: {isMarketingMode ? 'Marketing' : 'Travel'}
                </button>
                
                {!isOnline && (
                  <div className="flex items-center gap-1 text-xs text-orange-500" role="status" aria-live="polite">
                    <WifiOff size={14} aria-hidden="true" />
                    <span>Offline - Messages queued</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TalaFinalChatRedesigned;