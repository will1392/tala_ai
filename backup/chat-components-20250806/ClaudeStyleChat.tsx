import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Paperclip, 
  Plus, 
  User, 
  Bot, 
  Copy, 
  ThumbsUp, 
  ThumbsDown,
  RotateCw,
  ChevronLeft,
  Settings,
  Moon,
  Sun,
  Search
} from 'lucide-react';
import { ClaudeStyleModeSelector, type MarketingMode, type ChatMode } from '../components/chat/ClaudeStyleModeSelector';
import { cn } from '../utils/cn';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  mode?: ChatMode;
  marketingMode?: MarketingMode;
}

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messages: Message[];
}

export const ClaudeStyleChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentMode, setCurrentMode] = useState<ChatMode>('marketing');
  const [currentMarketingMode, setCurrentMarketingMode] = useState<MarketingMode>('general');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [input]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Toggle dark mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date(),
      mode: currentMode,
      marketingMode: currentMarketingMode
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Determine the endpoint based on mode
      const endpoint = currentMode === 'marketing' ? '/api/chat/v2' : '/api/chat/v2';
      
      const response = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'admin-1'
        },
        body: JSON.stringify({
          message: input,
          mode: currentMode === 'marketing' ? 'cmo' : 'travel',
          subMode: currentMode === 'marketing' ? currentMarketingMode : undefined,
          conversationId: currentConversationId || `conv-${Date.now()}`,
          searchKnowledge: currentMode === 'research'
        })
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        sender: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startNewConversation = () => {
    if (messages.length > 0) {
      // Save current conversation
      const newConv: Conversation = {
        id: currentConversationId || `conv-${Date.now()}`,
        title: messages[0].content.slice(0, 50) + '...',
        lastMessage: messages[messages.length - 1].content.slice(0, 100) + '...',
        timestamp: new Date(),
        messages: messages
      };
      setConversations(prev => [newConv, ...prev]);
    }
    
    setMessages([]);
    setCurrentConversationId(null);
  };

  const loadConversation = (conv: Conversation) => {
    setMessages(conv.messages);
    setCurrentConversationId(conv.id);
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  };

  return (
    <div className={cn("flex h-screen bg-white dark:bg-gray-900 transition-colors duration-200")}>
      {/* Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-64 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col"
          >
            {/* New Chat Button */}
            <div className="p-4">
              <button
                onClick={startNewConversation}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg",
                  "bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600",
                  "hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors",
                  "text-sm font-medium text-gray-700 dark:text-gray-200"
                )}
              >
                <Plus className="w-4 h-4" />
                New Chat
              </button>
            </div>

            {/* Search */}
            <div className="px-4 pb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  className={cn(
                    "w-full pl-9 pr-3 py-2 text-sm rounded-lg",
                    "bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                    "text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  )}
                />
              </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto px-2">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg mb-1 transition-colors",
                    "hover:bg-gray-100 dark:hover:bg-gray-700",
                    currentConversationId === conv.id && "bg-gray-100 dark:bg-gray-700"
                  )}
                >
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {conv.title}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {conv.lastMessage}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {new Date(conv.timestamp).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>

            {/* Bottom Settings */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg w-full",
                  "hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
                  "text-sm text-gray-700 dark:text-gray-200"
                )}
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {isDarkMode ? 'Light Mode' : 'Dark Mode'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronLeft className={cn(
                  "w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform",
                  !showSidebar && "rotate-180"
                )} />
              </button>
              
              <ClaudeStyleModeSelector
                currentMode={currentMode}
                currentMarketingMode={currentMarketingMode}
                onModeChange={setCurrentMode}
                onMarketingModeChange={setCurrentMarketingMode}
              />
            </div>

            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto py-8 px-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">
                  {currentMode === 'marketing' ? '🎯' : '🔍'}
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                  {currentMode === 'marketing' ? 'Marketing Assistant' : 'Research Mode'}
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                  {currentMode === 'marketing' 
                    ? 'Get help with your marketing campaigns and strategy'
                    : 'Search and analyze your knowledge base'
                  }
                </p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className={cn(
                      "mb-6 flex gap-4",
                      message.sender === 'user' ? "flex-row-reverse" : ""
                    )}
                  >
                    {/* Avatar */}
                    <div className={cn(
                      "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                      message.sender === 'user' 
                        ? "bg-blue-500 text-white" 
                        : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    )}>
                      {message.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    {/* Message Content */}
                    <div className={cn(
                      "flex-1 max-w-2xl",
                      message.sender === 'user' ? "text-right" : ""
                    )}>
                      <div className={cn(
                        "inline-block px-4 py-2 rounded-2xl",
                        message.sender === 'user'
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                      )}>
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      </div>
                      
                      {/* Message Actions */}
                      {message.sender === 'assistant' && (
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => copyMessage(message.content)}
                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                          <button className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <ThumbsUp className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                          <button className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <ThumbsDown className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                          <button className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <RotateCw className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
            
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-4 mb-6"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </motion.div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={currentMode === 'marketing' 
                  ? "Ask about marketing strategies, campaigns, or analytics..."
                  : "Search your knowledge base..."
                }
                className={cn(
                  "w-full pl-4 pr-12 py-3 rounded-2xl resize-none",
                  "bg-gray-100 dark:bg-gray-700 border-0",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500",
                  "text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500",
                  "min-h-[52px] max-h-[200px]"
                )}
                rows={1}
              />
              
              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                <button className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  <Paperclip className="w-4 h-4 text-gray-400" />
                </button>
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    input.trim() && !isLoading
                      ? "bg-blue-500 text-white hover:bg-blue-600"
                      : "bg-gray-200 dark:bg-gray-600 text-gray-400 cursor-not-allowed"
                  )}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="mt-2 text-xs text-center text-gray-400 dark:text-gray-500">
              Press Enter to send, Shift+Enter for new line
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};