import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Paperclip,
  Plus,
  Search,
  ChevronDown,
  Menu,
  X,
  ArrowUp,
  Sparkles
} from 'lucide-react';
import { cn } from '../utils/cn';
import toast from 'react-hot-toast';

type MarketingMode = 
  | 'general' 
  | 'seo' 
  | 'email' 
  | 'social' 
  | 'ads' 
  | 'direct-mail' 
  | 'content' 
  | 'analytics'
  | 'strategy';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  mode?: 'marketing' | 'research';
  marketingMode?: MarketingMode;
}

const marketingModes = [
  { id: 'general' as MarketingMode, label: 'Marketing Pro', color: '#ff6b6b' },
  { id: 'seo' as MarketingMode, label: 'SEO Specialist', color: '#10b981' },
  { id: 'email' as MarketingMode, label: 'Email Expert', color: '#3b82f6' },
  { id: 'social' as MarketingMode, label: 'Social Media', color: '#ec4899' },
  { id: 'ads' as MarketingMode, label: 'Ads Manager', color: '#f97316' },
  { id: 'direct-mail' as MarketingMode, label: 'Direct Mail', color: '#8b5cf6' },
  { id: 'content' as MarketingMode, label: 'Content Strategy', color: '#14b8a6' },
  { id: 'analytics' as MarketingMode, label: 'Analytics', color: '#eab308' },
  { id: 'strategy' as MarketingMode, label: 'Strategy Expert', color: '#6366f1' }
];

export const TalaClaudeStyleChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResearchMode, setIsResearchMode] = useState(false);
  const [currentMarketingMode, setCurrentMarketingMode] = useState<MarketingMode>('general');
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [userName, setUserName] = useState('Will'); // This would come from user profile
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get current mode display
  const currentModeDisplay = marketingModes.find(m => m.id === currentMarketingMode);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      const newHeight = Math.min(inputRef.current.scrollHeight, 200);
      inputRef.current.style.height = `${newHeight}px`;
    }
  }, [input]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowModeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date(),
      mode: isResearchMode ? 'research' : 'marketing',
      marketingMode: !isResearchMode ? currentMarketingMode : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`http://localhost:3001/api/chat/v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'admin-1'
        },
        body: JSON.stringify({
          message: input,
          mode: isResearchMode ? 'travel' : 'cmo',
          subMode: !isResearchMode ? currentMarketingMode : undefined,
          conversationId: `conv-${Date.now()}`,
          searchKnowledge: isResearchMode
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

  const startNewChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex h-screen bg-[#343541] text-gray-100">
      {/* Sidebar - Hidden by default */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            exit={{ x: -260 }}
            className="w-[260px] bg-[#202123] flex flex-col"
          >
            <div className="p-3 flex items-center justify-between border-b border-gray-700">
              <button
                onClick={startNewChat}
                className="flex-1 flex items-center gap-2 px-3 py-2 hover:bg-gray-700 rounded-md transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                New chat
              </button>
              <button
                onClick={() => setShowSidebar(false)}
                className="p-2 hover:bg-gray-700 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <div className="text-sm text-gray-400 px-3 py-2">
                Today
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header - Minimal */}
        {!showSidebar && (
          <div className="absolute top-4 left-4 z-10">
            <button
              onClick={() => setShowSidebar(true)}
              className="p-2 hover:bg-gray-700 rounded-md transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center px-4">
              <div className="text-center max-w-3xl">
                {/* Tala Icon/Logo */}
                <div className="mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ff6b6b] to-[#ff8787]">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                </div>
                
                {/* Large Welcome Text - Much bigger like Claude */}
                <h1 className="text-4xl font-normal mb-2 text-gray-200">
                  {isResearchMode 
                    ? `What would you like to know, ${userName}?`
                    : `How was your day, ${userName}?`
                  }
                </h1>
                
                {/* Subtitle */}
                <p className="text-gray-400 text-base">
                  {isResearchMode 
                    ? 'I can search and analyze your knowledge base'
                    : 'How can I help with your marketing today?'
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-[48rem] mx-auto">
              <div className="py-12 px-4">
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={cn(
                      "group",
                      message.sender === 'user' && "bg-[#40414f]",
                      index > 0 && "border-t border-gray-700"
                    )}
                  >
                    <div className="max-w-[48rem] mx-auto py-6 px-4">
                      <div className="flex gap-6">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          {message.sender === 'user' ? (
                            <div className="w-8 h-8 rounded-sm bg-[#5436da] flex items-center justify-center text-white text-sm font-medium">
                              {userName[0]}
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-sm bg-gradient-to-br from-[#ff6b6b] to-[#ff8787] flex items-center justify-center">
                              <Sparkles className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                        
                        {/* Message Content */}
                        <div className="flex-1 overflow-hidden">
                          <div className="prose prose-invert max-w-none">
                            <div className="text-gray-100 whitespace-pre-wrap">
                              {message.content}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="border-t border-gray-700">
                    <div className="max-w-[48rem] mx-auto py-6 px-4">
                      <div className="flex gap-6">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-sm bg-gradient-to-br from-[#ff6b6b] to-[#ff8787] flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white animate-pulse" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}
        </div>

        {/* Input Area - Centered like Claude */}
        <div className="border-t border-gray-700">
          <div className="max-w-[48rem] mx-auto p-4">
            <div className="relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="How can I help you today?"
                className={cn(
                  "w-full bg-[#40414f] text-gray-100 rounded-lg",
                  "pl-4 pr-32 py-3 resize-none",
                  "border border-gray-600 focus:border-gray-500",
                  "focus:outline-none",
                  "placeholder-gray-400",
                  "min-h-[52px] max-h-[200px]"
                )}
                rows={1}
              />
              
              {/* Controls positioned inside the input */}
              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                {/* Attachment */}
                <button className="p-1.5 hover:bg-gray-600 rounded transition-colors">
                  <Paperclip className="w-4 h-4 text-gray-400" />
                </button>

                {/* Research Mode Toggle */}
                <button
                  onClick={() => setIsResearchMode(!isResearchMode)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors",
                    isResearchMode 
                      ? "bg-blue-600 text-white" 
                      : "hover:bg-gray-600 text-gray-400"
                  )}
                >
                  <Search className="w-3 h-3" />
                  Research
                </button>

                {/* Marketing Mode Selector */}
                {!isResearchMode && (
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setShowModeDropdown(!showModeDropdown)}
                      className="flex items-center gap-1 px-2 py-1 hover:bg-gray-600 rounded text-xs transition-colors text-gray-300"
                    >
                      <span 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: currentModeDisplay?.color }}
                      />
                      <span>{currentModeDisplay?.label}</span>
                      <ChevronDown className={cn(
                        "w-3 h-3 transition-transform",
                        showModeDropdown && "rotate-180"
                      )} />
                    </button>

                    {/* Dropdown */}
                    <AnimatePresence>
                      {showModeDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-full right-0 mb-2 w-48 bg-[#2c2d35] rounded-lg shadow-xl border border-gray-600 py-1"
                        >
                          {marketingModes.map((mode) => (
                            <button
                              key={mode.id}
                              onClick={() => {
                                setCurrentMarketingMode(mode.id);
                                setShowModeDropdown(false);
                              }}
                              className={cn(
                                "w-full text-left px-3 py-2 text-xs hover:bg-gray-700 transition-colors flex items-center gap-2",
                                currentMarketingMode === mode.id && "bg-gray-700"
                              )}
                            >
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: mode.color }}
                              />
                              <span>{mode.label}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Send Button */}
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    "p-1.5 rounded transition-colors",
                    input.trim() && !isLoading
                      ? "bg-[#ff6b6b] hover:bg-[#ff5252] text-white"
                      : "bg-gray-600 text-gray-400 cursor-not-allowed"
                  )}
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Helper Text */}
            <div className="mt-2 text-center">
              <p className="text-xs text-gray-500">
                {isResearchMode 
                  ? 'Searching your knowledge base'
                  : `${currentModeDisplay?.label} mode active`
                } • Tala can make mistakes
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};