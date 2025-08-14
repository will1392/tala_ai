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
  RefreshCw
} from 'lucide-react';
import { cn } from '../utils/cn';
import toast from 'react-hot-toast';
import useConversation from '../hooks/useConversation';
import useRetryableRequest from '../hooks/useRetryableRequest';

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

export const TalaFinalChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMarketingMode, setIsMarketingMode] = useState(false); // Travel is default
  const [currentMarketingMode, setCurrentMarketingMode] = useState<MarketingMode>('general');
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [userName, setUserName] = useState('Will'); // This would come from user profile
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Use conversation hook for persistence
  const {
    conversationId,
    createNewConversation,
    updateConversation,
    clearConversation,
    conversations,
    switchConversation
  } = useConversation({ userId: 'admin-1' });
  
  // Use retryable request hook for error recovery
  const {
    executeWithRetry,
    isOnline,
    connectionStatus,
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

  // Get current mode display
  const currentModeDisplay = marketingModes.find(m => m.id === currentMarketingMode);

  // Only scroll to bottom for user messages, not assistant responses
  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].sender === 'user') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
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
      mode: isMarketingMode ? 'marketing' : 'travel',
      marketingMode: isMarketingMode ? currentMarketingMode : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = input; // Store input before clearing
    setInput('');
    setIsLoading(true);

    try {
      // Use retryable request with the persistent conversationId
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
            conversationId: conversationId || createNewConversation(),
            searchKnowledge: !isMarketingMode // Search KB in travel mode
          })
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(error || 'Failed to get response');
        }

        return response.json();
      });
      
      // Process the response to handle markdown
      let processedResponse = data.response;
      
      // Convert markdown bold to plain text
      processedResponse = processedResponse.replace(/\*\*([^*]+)\*\*/g, '$1');
      
      // Convert markdown headers to plain text with line breaks
      processedResponse = processedResponse.replace(/^### (.+)$/gm, '\n$1\n');
      processedResponse = processedResponse.replace(/^## (.+)$/gm, '\n$1\n');
      processedResponse = processedResponse.replace(/^# (.+)$/gm, '\n$1\n');
      
      // Convert bullet points to cleaner format
      processedResponse = processedResponse.replace(/^- /gm, '• ');
      
      // Remove excessive line breaks
      processedResponse = processedResponse.replace(/\n{3,}/g, '\n\n');
      
      // Trim whitespace
      processedResponse = processedResponse.trim();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: processedResponse,
        sender: 'assistant',
        timestamp: new Date(),
        sources: data.sources || []
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Update conversation metadata
      updateConversation({
        messageCount: messages.length + 2, // user + assistant messages
        updatedAt: new Date()
      });

    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Remove the user message if request failed completely
      if (!isOnline) {
        toast.error('You are offline. Message has been queued.');
      } else if (error.message.includes('aborted')) {
        toast.error('Request was cancelled');
        setMessages(prev => prev.filter(m => m.id !== userMessage.id));
      } else {
        toast.error(`Failed to send message: ${error.message}`);
        // Keep the message but mark it as failed
        setMessages(prev => prev.map(m => 
          m.id === userMessage.id 
            ? { ...m, failed: true } as Message 
            : m
        ));
      }
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

  const toggleVoiceRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      toast.success('Voice recording started');
      // Implement actual voice recording here
    } else {
      toast.success('Voice recording stopped');
      // Process the recording
    }
  };

  const startNewChat = () => {
    setMessages([]);
    clearConversation();
  };
  
  // Retry a failed message
  const retryMessage = async (message: Message) => {
    if (!message.failed || message.retrying) return;
    
    // Mark as retrying
    setMessages(prev => prev.map(m => 
      m.id === message.id 
        ? { ...m, retrying: true, failed: false } 
        : m
    ));
    
    // Recreate the request
    try {
      const data = await executeWithRetry(async () => {
        const response = await fetch(`http://localhost:3001/api/chat/v2`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': 'admin-1'
          },
          body: JSON.stringify({
            message: message.content,
            mode: message.mode === 'marketing' ? 'cmo' : 'travel',
            subMode: message.marketingMode,
            conversationId: conversationId || createNewConversation(),
            searchKnowledge: message.mode !== 'marketing'
          })
        });

        if (!response.ok) throw new Error('Failed to get response');
        return response.json();
      });
      
      // Process response
      let processedResponse = data.response;
      processedResponse = processedResponse.replace(/\*\*([^*]+)\*\*/g, '$1');
      processedResponse = processedResponse.replace(/^### (.+)$/gm, '\n$1\n');
      processedResponse = processedResponse.replace(/^## (.+)$/gm, '\n$1\n');
      processedResponse = processedResponse.replace(/^# (.+)$/gm, '\n$1\n');
      processedResponse = processedResponse.replace(/^- /gm, '• ');
      processedResponse = processedResponse.replace(/\n{3,}/g, '\n\n');
      processedResponse = processedResponse.trim();
      
      // Update message as successful
      setMessages(prev => prev.map(m => 
        m.id === message.id 
          ? { ...m, retrying: false, failed: false } 
          : m
      ));
      
      // Add assistant response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: processedResponse,
        sender: 'assistant',
        timestamp: new Date(),
        sources: data.sources || []
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      toast.success('Message sent successfully');
      
    } catch (error) {
      // Mark as failed again
      setMessages(prev => prev.map(m => 
        m.id === message.id 
          ? { ...m, retrying: false, failed: true } 
          : m
      ));
      toast.error('Retry failed. Please try again.');
    }
  };

  return (
    <div className={cn(
      "flex h-[calc(100vh-4rem)] bg-secondary-800 text-white relative",
      isMarketingMode && "ring-2 ring-white ring-inset"
    )}>
      {/* Sidebar for conversation history */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            exit={{ x: -260 }}
            className="w-[260px] bg-secondary-700 flex flex-col border-r border-white/10 shadow-2xl"
          >
            <div className="p-3 flex items-center justify-between border-b border-white/10">
              <button
                onClick={startNewChat}
                className={cn(
                  "flex-1 flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm",
                  isMarketingMode
                    ? "hover:bg-white/10 text-white"
                    : "hover:bg-white/5"
                )}
              >
                <Plus className="w-4 h-4" />
                New chat
              </button>
              <button
                onClick={() => setShowSidebar(false)}
                className="p-2 hover:bg-white/5 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <div className="text-sm text-white/60 px-3 py-2">
                Recent Conversations
              </div>
              <div className="space-y-1">
                {conversations.slice(0, 10).map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => {
                      switchConversation(conv.id);
                      setMessages([]); // Clear messages, will load from backend
                      toast.success(`Switched to: ${conv.title}`);
                    }}
                    className={cn(
                      "px-3 py-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors",
                      conv.id === conversationId && "bg-white/10"
                    )}
                  >
                    <div className="text-sm text-white/80 truncate">
                      {conv.title || 'Untitled Conversation'}
                    </div>
                    <div className="text-xs text-white/40 mt-0.5">
                      {new Date(conv.updatedAt).toLocaleString()}
                    </div>
                  </div>
                ))}
                <div className="px-3 py-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                  <div className="text-sm text-white/80">Marketing Campaign Ideas</div>
                  <div className="text-xs text-white/40 mt-0.5">Yesterday</div>
                </div>
                <div className="px-3 py-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                  <div className="text-sm text-white/80">Iceland Northern Lights</div>
                  <div className="text-xs text-white/40 mt-0.5">2 days ago</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/15 rounded-lg transition-colors text-sm"
            >
              <Menu className="w-4 h-4" />
              <span>History</span>
            </button>
            <button
              onClick={startNewChat}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm",
                isMarketingMode 
                  ? "text-white bg-white/10 hover:bg-white/20" 
                  : "text-primary hover:bg-primary/10"
              )}
            >
              <Plus className="w-4 h-4" />
              <span>New chat</span>
            </button>
          </div>
          
          {/* Connection Status Indicator */}
          <div className="flex items-center gap-3">
            {requestQueue.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm">
                <Clock className="w-4 h-4" />
                <span>{requestQueue.length} queued</span>
                <button
                  onClick={clearQueue}
                  className="ml-1 hover:text-yellow-300"
                  title="Clear queue"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            
            {isRetrying && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-sm animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Retrying...</span>
              </div>
            )}
            
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm",
              connectionStatus === 'online' 
                ? "bg-green-500/20 text-green-400"
                : connectionStatus === 'offline'
                ? "bg-red-500/20 text-red-400"
                : "bg-yellow-500/20 text-yellow-400"
            )}>
              {connectionStatus === 'online' ? (
                <>
                  <Wifi className="w-4 h-4" />
                  <span>Online</span>
                </>
              ) : connectionStatus === 'offline' ? (
                <>
                  <WifiOff className="w-4 h-4" />
                  <span>Offline</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Connecting...</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
        <div className="max-w-[48rem] mx-auto">
          <div className="py-8 px-6">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center max-w-3xl">
                  {/* Tala Icon with Primary Teal Color */}
                  <div className="mb-8">
                    <div className={cn(
                      "inline-flex items-center justify-center w-16 h-16 rounded-2xl",
                      isMarketingMode 
                        ? "bg-white" 
                        : "bg-gradient-to-br from-primary to-primary-dark"
                    )}>
                      {isMarketingMode ? (
                        <Sparkles className="w-8 h-8 text-gray-900" />
                      ) : (
                        <Plane className="w-8 h-8 text-white" />
                      )}
                    </div>
                  </div>
                  
                  {/* Large Welcome Text */}
                  <h1 className="text-4xl font-light mb-3 text-white">
                    {isMarketingMode 
                      ? `How can I help with marketing today, ${userName}?`
                      : `Hey, ${userName}!`
                    }
                  </h1>
                  
                  {/* Subtitle */}
                  <p className="text-white/60 text-base">
                    {isMarketingMode 
                      ? 'I can help with SEO, email campaigns, social media, and more'
                      : "I'm TALA, the Travel Agent Learning Assistant. In Travel Mode, I can help you with all things travel. Ask me a question and I'll help."
                    }
                  </p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={cn(
                    "group",
                    message.sender === 'user' && "bg-white/5",
                    index > 0 && "border-t border-white/10"
                  )}
                >
                  <div className="max-w-[48rem] mx-auto py-6 px-4">
                    <div className="flex gap-6">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {message.sender === 'user' ? (
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium",
                            message.mode === 'marketing'
                              ? "bg-white/20 text-white"
                              : "bg-primary/20 text-primary"
                          )}>
                            {userName[0]}
                          </div>
                        ) : (
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            message.mode === 'marketing'
                              ? "bg-white"
                              : "bg-gradient-to-br from-primary to-primary-dark"
                          )}>
                            {message.mode === 'marketing' ? (
                              <Sparkles className="w-4 h-4 text-gray-900" />
                            ) : (
                              <Plane className="w-4 h-4 text-white" />
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Message Content */}
                      <div className="flex-1 overflow-hidden">
                        <div className="max-w-none">
                          {/* Failed/Retrying Status */}
                          {message.failed && (
                            <div className="flex items-center gap-2 mb-2 text-red-400 text-sm">
                              <WifiOff className="w-4 h-4" />
                              <span>Failed to send</span>
                              <button
                                onClick={() => retryMessage(message)}
                                className="ml-2 px-2 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-xs flex items-center gap-1"
                              >
                                <RefreshCw className="w-3 h-3" />
                                Retry
                              </button>
                            </div>
                          )}
                          {message.retrying && (
                            <div className="flex items-center gap-2 mb-2 text-blue-400 text-sm animate-pulse">
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Retrying...</span>
                            </div>
                          )}
                          <div className={cn(
                            "text-white/90 whitespace-pre-wrap leading-relaxed",
                            message.failed && "opacity-50"
                          )}>
                            {message.content.split('\n').map((paragraph, idx) => {
                              // Skip empty lines
                              if (!paragraph.trim()) return null;
                              
                              // Check if it's a bullet point
                              if (paragraph.startsWith('• ')) {
                                return (
                                  <div key={idx} className="flex gap-2 my-1">
                                    <span className={message.mode === 'marketing' ? "text-white" : "text-primary"}>•</span>
                                    <span>{paragraph.substring(2)}</span>
                                  </div>
                                );
                              }
                              
                              // Regular paragraph
                              return (
                                <p key={idx} className="my-2">
                                  {paragraph}
                                </p>
                              );
                            })}
                          </div>
                          
                          {/* Sources */}
                          {message.sources && message.sources.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-white/10">
                              <div className="text-xs text-white/60 mb-2">Sources:</div>
                              <div className="flex flex-wrap gap-2">
                                {message.sources.map((source, idx) => (
                                  <div 
                                    key={idx}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 text-xs text-white/80"
                                  >
                                    <span className={cn(
                                      "w-1.5 h-1.5 rounded-full",
                                      message.mode === 'marketing' ? "bg-white" : "bg-primary"
                                    )} />
                                    <span>{source.title}</span>
                                    <span className="text-white/40">({Math.round(source.score * 100)}%)</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="border-t border-white/10">
                  <div className="max-w-[48rem] mx-auto py-6 px-4">
                    <div className="flex gap-6">
                      <div className="flex-shrink-0">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          isMarketingMode
                            ? "bg-white"
                            : "bg-gradient-to-br from-primary to-primary-dark"
                        )}>
                          {isMarketingMode ? (
                            <Sparkles className="w-4 h-4 text-gray-900 animate-pulse" />
                          ) : (
                            <Plane className="w-4 h-4 text-white animate-pulse" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1">
                          <div className={cn(
                            "w-2 h-2 rounded-full animate-bounce",
                            isMarketingMode ? "bg-white/60" : "bg-primary/60"
                          )} style={{ animationDelay: '0ms' }} />
                          <div className={cn(
                            "w-2 h-2 rounded-full animate-bounce",
                            isMarketingMode ? "bg-white/60" : "bg-primary/60"
                          )} style={{ animationDelay: '150ms' }} />
                          <div className={cn(
                            "w-2 h-2 rounded-full animate-bounce",
                            isMarketingMode ? "bg-white/60" : "bg-primary/60"
                          )} style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="border-t border-white/10 bg-secondary-700 backdrop-blur-sm">
        <div className="px-6 md:px-12 lg:px-20 py-6">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={isMarketingMode 
                ? "Ask me about marketing strategies, campaigns, or analytics..."
                : "Where would you like to travel? Ask me about destinations, flights, or activities..."
              }
              className={cn(
                "w-full bg-white/5 text-white rounded-[3rem]",
                "pl-8 pr-52 py-5 resize-none",
                "border border-white/10 focus:border-primary/50",
                "focus:outline-none focus:ring-1 focus:ring-primary/50",
                "placeholder-white/40",
                "h-[140px] overflow-y-auto",
                "text-base leading-relaxed"
              )}
              rows={6}
            />
            
            {/* Controls positioned inside the input with more spacing */}
            <div className="absolute right-6 bottom-5 flex items-center gap-3">
              {/* Attachment */}
              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <Paperclip className="w-4 h-4 text-white/60" />
              </button>

              {/* Voice Input */}
              <button 
                onClick={toggleVoiceRecording}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  isRecording 
                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" 
                    : "hover:bg-white/10 text-white/60"
                )}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Mode Toggle - Fixed width to prevent movement */}
              <div className="ml-2">
                <button
                  onClick={() => setIsMarketingMode(!isMarketingMode)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all w-[110px] justify-center",
                    isMarketingMode 
                      ? "bg-white text-gray-900 hover:bg-gray-100" 
                      : "bg-primary text-white hover:bg-primary-dark"
                  )}
                >
                  {isMarketingMode ? (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Marketing
                    </>
                  ) : (
                    <>
                      <Plane className="w-4 h-4" />
                      Travel
                    </>
                  )}
                </button>
              </div>

              {/* Marketing Mode Selector - Always reserve space */}
              <div className="relative w-[140px]" ref={dropdownRef}>
                {isMarketingMode ? (
                  <>
                    <button
                      onClick={() => setShowModeDropdown(!showModeDropdown)}
                      className="flex items-center gap-1 px-2.5 py-1.5 hover:bg-white/10 rounded-lg text-sm transition-colors text-white/80"
                    >
                      <span className="text-xs">{currentModeDisplay?.label}</span>
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
                          className="absolute bottom-full right-0 mb-2 w-48 bg-secondary-800 rounded-xl shadow-xl border border-white/10 py-1 overflow-hidden"
                        >
                          {marketingModes.map((mode) => (
                            <button
                              key={mode.id}
                              onClick={() => {
                                setCurrentMarketingMode(mode.id);
                                setShowModeDropdown(false);
                              }}
                              className={cn(
                                "w-full text-left px-3 py-2 text-sm hover:bg-white/5 transition-colors flex items-center gap-2",
                                currentMarketingMode === mode.id && "bg-white/10 text-primary"
                              )}
                            >
                              <span>{mode.label}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  <div className="w-full" /> // Empty space holder
                )}
              </div>

              {/* Send Button with more spacing */}
              <div className="ml-3">
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    "p-2.5 rounded-xl transition-all",
                    input.trim() && !isLoading
                      ? "bg-primary hover:bg-primary-dark text-white shadow-glow-sm"
                      : "bg-white/5 text-white/30 cursor-not-allowed"
                  )}
                >
                  <ArrowUp className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Helper Text */}
          <div className="mt-2 text-center max-w-[48rem] mx-auto">
            <p className="text-xs text-white/40">
              {isMarketingMode 
                ? `${currentModeDisplay?.label} mode • Press Enter to send`
                : 'Travel mode • Press Enter to send'
              } • Tala can make mistakes
            </p>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};