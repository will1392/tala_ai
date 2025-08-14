import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Paperclip,
  Plus,
  Search,
  ChevronDown,
  Sparkles,
  TrendingUp,
  Mail,
  Hash,
  Target,
  FileText,
  BarChart3,
  Brain,
  Globe,
  Megaphone,
  Settings,
  Menu,
  X,
  ArrowUp
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
  { id: 'general' as MarketingMode, label: 'General Assistant', icon: '✨' },
  { id: 'seo' as MarketingMode, label: 'SEO Expert', icon: '🔍' },
  { id: 'email' as MarketingMode, label: 'Email Specialist', icon: '📧' },
  { id: 'social' as MarketingMode, label: 'Social Media Pro', icon: '#️⃣' },
  { id: 'ads' as MarketingMode, label: 'Ads Manager', icon: '🎯' },
  { id: 'direct-mail' as MarketingMode, label: 'Direct Mail', icon: '📮' },
  { id: 'content' as MarketingMode, label: 'Content Strategy', icon: '📝' },
  { id: 'analytics' as MarketingMode, label: 'Analytics Expert', icon: '📊' },
  { id: 'strategy' as MarketingMode, label: 'Strategy Consultant', icon: '🧠' }
];

export const ClaudeActualStyleChat: React.FC = () => {
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
    <div className="flex h-screen bg-[#2b2b2b] text-gray-100">
      {/* Sidebar - Hidden by default like Claude */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="w-64 bg-[#202020] border-r border-gray-700 flex flex-col"
          >
            <div className="p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">History</h2>
              <button
                onClick={() => setShowSidebar(false)}
                className="p-1 hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2">
              {/* Conversation history would go here */}
              <div className="text-sm text-gray-400 px-3 py-2">
                No previous conversations
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Minimal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={startNewChat}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-700 rounded-lg transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              New chat
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full py-24">
                <div className="text-center">
                  <div className="text-[#ff6b6b] text-5xl mb-6">
                    {isResearchMode ? '🔍' : '🎯'}
                  </div>
                  <h1 className="text-3xl font-light mb-4">
                    {isResearchMode 
                      ? `How can I help you research today, ${userName}?`
                      : `How was your day, ${userName}?`
                    }
                  </h1>
                  <p className="text-gray-400">
                    {isResearchMode 
                      ? 'Search and analyze your knowledge base'
                      : 'Let me help you with your marketing needs'
                    }
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-8 px-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "mb-8",
                      message.sender === 'user' && "bg-[#303030] rounded-lg p-4"
                    )}
                  >
                    <div className="max-w-3xl mx-auto">
                      <div className="flex gap-3">
                        <div className={cn(
                          "flex-shrink-0 w-7 h-7 rounded-sm flex items-center justify-center text-sm",
                          message.sender === 'user' 
                            ? "bg-gray-600 text-white" 
                            : "bg-[#ff6b6b] text-white"
                        )}>
                          {message.sender === 'user' ? userName[0] : '🎯'}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-sm mb-1">
                            {message.sender === 'user' ? 'You' : 'Tala'}
                          </div>
                          <div className="text-gray-200 whitespace-pre-wrap">
                            {message.content}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="mb-8">
                    <div className="max-w-3xl mx-auto">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-7 h-7 rounded-sm bg-[#ff6b6b] flex items-center justify-center text-white text-sm">
                          🎯
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-sm mb-1">Tala</div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input Area - Claude Style */}
        <div className="border-t border-gray-700">
          <div className="max-w-3xl mx-auto p-4">
            <div className="relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="How can I help you today?"
                className={cn(
                  "w-full bg-[#404040] text-gray-100 rounded-2xl",
                  "pl-4 pr-32 py-3 resize-none",
                  "focus:outline-none focus:ring-2 focus:ring-gray-600",
                  "placeholder-gray-400",
                  "min-h-[52px] max-h-[200px]"
                )}
                rows={1}
              />
              
              {/* Right side controls */}
              <div className="absolute right-2 bottom-2 flex items-center gap-2">
                {/* Attachment button */}
                <button className="p-2 hover:bg-gray-600 rounded-lg transition-colors">
                  <Paperclip className="w-4 h-4 text-gray-400" />
                </button>

                {/* Research toggle */}
                <button
                  onClick={() => setIsResearchMode(!isResearchMode)}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors",
                    isResearchMode 
                      ? "bg-blue-600 text-white" 
                      : "hover:bg-gray-600 text-gray-400"
                  )}
                >
                  <Search className="w-3.5 h-3.5" />
                  Research
                </button>

                {/* Mode selector dropdown */}
                {!isResearchMode && (
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setShowModeDropdown(!showModeDropdown)}
                      className="flex items-center gap-1 px-3 py-1.5 hover:bg-gray-600 rounded-lg text-sm transition-colors text-gray-300"
                    >
                      <span>{currentModeDisplay?.icon}</span>
                      <span>{currentModeDisplay?.label}</span>
                      <ChevronDown className={cn(
                        "w-3.5 h-3.5 transition-transform",
                        showModeDropdown && "rotate-180"
                      )} />
                    </button>

                    {showModeDropdown && (
                      <div className="absolute bottom-full right-0 mb-2 w-56 bg-[#303030] rounded-lg shadow-xl border border-gray-700 py-1">
                        {marketingModes.map((mode) => (
                          <button
                            key={mode.id}
                            onClick={() => {
                              setCurrentMarketingMode(mode.id);
                              setShowModeDropdown(false);
                            }}
                            className={cn(
                              "w-full text-left px-3 py-2 text-sm hover:bg-gray-700 transition-colors flex items-center gap-2",
                              currentMarketingMode === mode.id && "bg-gray-700"
                            )}
                          >
                            <span>{mode.icon}</span>
                            <span>{mode.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Send button */}
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    input.trim() && !isLoading
                      ? "bg-gray-600 hover:bg-gray-500 text-white"
                      : "bg-gray-700 text-gray-500 cursor-not-allowed"
                  )}
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bottom helper text */}
            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <div>
                {!isResearchMode && (
                  <span>Connect your tools to Tala</span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span>Tala can make mistakes. Please double-check responses.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};