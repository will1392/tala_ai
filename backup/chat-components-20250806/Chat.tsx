import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Plus, AlertCircle, Loader2, Mic, ChevronDown, BarChart3, Sparkles, X, Bot, User, Clock, Zap } from 'lucide-react';
import { ChatMessage } from '../components/chat/ChatMessage';
import { ChatInput } from '../components/chat/ChatInput';
import { ConversationContextIndicator } from '../components/chat/ConversationContextIndicator';
import { ConversationModeIndicator } from '../components/chat/ConversationModeIndicator';
import { ModeSelector } from '../components/chat/ModeSelector';
import { VoiceSettings } from '../components/chat/VoiceSettings';
import { ConversationBreadcrumbs } from '../components/chat/ConversationBreadcrumbs';
import { FollowUpSuggestions } from '../components/chat/FollowUpSuggestions';
import { MarketingHealthDashboard } from '../components/chat/MarketingHealthDashboard';
import { useConversationContext } from '../hooks/useConversationContext';
import { useMode } from '../hooks/useMode';
import { useModeAnnouncements } from '../hooks/useModeAnnouncements';
import { useContextAwareMode } from '../hooks/useContextAwareMode';
import { useConversationFlow } from '../hooks/useConversationFlow';
import { cn } from '../utils/cn';
import { speechService } from '../services/speechService';
import type { UserProfile } from '../components/onboarding/UserProfileOnboarding';

// Premium UI Components (matching PremiumDashboard)
const Button = ({ 
  children, 
  variant = "default",
  size = "default",
  className = "",
  ...props
}: { 
  children: React.ReactNode;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  [key: string]: any;
}) => {
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "text-primary underline-offset-4 hover:underline"
  }

  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-2xl px-3",
    lg: "h-11 rounded-2xl px-8",
    icon: "h-10 w-10"
  }

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-2xl text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("rounded-3xl border bg-card text-card-foreground shadow-sm backdrop-blur-sm", className)}>
    {children}
  </div>
)

const Badge = ({ 
  children, 
  variant = "default",
  className = "" 
}: { 
  children: React.ReactNode;
  variant?: "default" | "outline" | "secondary" | "destructive" | "success";
  className?: string;
}) => {
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/80",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80",
    success: "bg-green-500 text-white hover:bg-green-600"
  }

  return (
    <div className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
      variants[variant],
      className
    )}>
      {children}
    </div>
  )
}

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  lastActivity: string;
  messageCount: number;
  userId: string;
  createdAt: string;
  mode?: 'travel' | 'cmo';
  subMode?: string | null;
}


// Simple chat service with conversation support
const chatService = {
  async sendMessage(content: string, conversationId?: string | null, mode?: string, subMode?: string | null) {
    const response = await fetch('http://localhost:3001/api/chat/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'admin-1' // Consistent with body userId
      },
      credentials: 'include',
      body: JSON.stringify({
        message: content,
        userId: 'admin-1',
        isAdmin: true,
        maxResults: 5,
        conversationId: conversationId,
        mode: mode || 'travel',
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
  const { mode, subMode } = useMode();
  const { getAnnouncement, formatAnnouncementMessage } = useModeAnnouncements();
  const { processMessageContext } = useContextAwareMode();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
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
  const [marketingHealthData, setMarketingHealthData] = useState<any>(null);
  const [showMarketingHealth, setShowMarketingHealth] = useState(false);
  const [loadingHealth, setLoadingHealth] = useState(false);
  
  // Ref for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const previousModeRef = useRef<string>(mode);
  const previousSubModeRef = useRef<string | null>(subMode);
  
  // Initialize conversation context
  const { context, processMessage, resetContext } = useConversationContext({
    sessionId: currentConversationId || 'default',
    userId: 'admin-1',
    conversationId: currentConversationId || 'default'
  });
  
  // Initialize conversation flow for CMO mode
  const {
    conversationState,
    updateFromResponse,
    navigateToBreadcrumb,
    goBack,
    processFollowUp,
    clearConversation
  } = useConversationFlow();

  // Load conversations and user profile on component mount
  useEffect(() => {
    loadConversations();
    loadUserProfile();
  }, []);

  // Load user profile
  const loadUserProfile = async () => {
    try {
      // In development, check localStorage
      if (process.env.NODE_ENV === 'development') {
        const storedProfile = localStorage.getItem('tala_user_profile');
        if (storedProfile) {
          const profile = JSON.parse(storedProfile);
          setUserProfile(profile);
          
          // Set personalized welcome message if no messages yet
          if (messages.length === 0) {
            setMessages([{
              id: 'welcome',
              content: getPersonalizedWelcome(profile),
              sender: 'tala' as const,
              timestamp: new Date(),
            }]);
          }
        } else {
          // No profile, use default welcome
          setDefaultWelcomeMessage();
        }
        return;
      }

      // Production: load from API
      const userId = 'admin-1'; // This would come from auth context
      const response = await fetch(`/api/user-profile/${userId}`);
      if (response.ok) {
        const profile = await response.json();
        setUserProfile(profile);
        
        // Set personalized welcome message if no messages yet
        if (messages.length === 0) {
          setMessages([{
            id: 'welcome',
            content: getPersonalizedWelcome(profile),
            sender: 'tala' as const,
            timestamp: new Date(),
          }]);
        }
      } else {
        // No profile, use default welcome
        setDefaultWelcomeMessage();
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      setDefaultWelcomeMessage();
    }
  };

  // Get personalized welcome message based on profile
  const getPersonalizedWelcome = (profile: UserProfile) => {
    const name = profile.name || 'there';
    
    if (mode === 'cmo') {
      return `Hello ${name}! I'm Tala, your AI marketing assistant. I can help you with SEO, email marketing, social media, paid ads, and direct mail campaigns. How can I assist you today?`;
    } else {
      return `Hello ${name}! I'm Tala, your AI travel assistant. I can help you with visa requirements, travel documents, airline policies, and destination information from your knowledge base. How can I assist you today?`;
    }
  };

  // Set default welcome message
  const setDefaultWelcomeMessage = () => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        content: mode === 'cmo' 
          ? "Hello! I'm Tala, your AI marketing assistant. I can help you with SEO, email marketing, social media, paid ads, and direct mail campaigns. How can I assist you today?"
          : "Hello! I'm Tala, your AI travel assistant. I can help you with visa requirements, travel documents, airline policies, and destination information from your knowledge base. How can I assist you today?",
        sender: 'tala' as const,
        timestamp: new Date(),
      }]);
    }
  };

  // Function to load marketing health
  const loadMarketingHealth = async () => {
    setLoadingHealth(true);
    try {
      const response = await fetch(`http://localhost:3001/api/cmo/health?userId=admin-1`, {
        headers: {
          'x-user-id': 'admin-1'
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setMarketingHealthData(data.health);
      }
    } catch (err) {
      console.error('Failed to load marketing health:', err);
    } finally {
      setLoadingHealth(false);
    }
  };

  // Check for marketing health queries
  const checkForHealthQuery = (content: string) => {
    const healthKeywords = ['marketing health', 'health assessment', 'performance overview', 'marketing performance', 'channel performance', 'marketing status'];
    const lowerContent = content.toLowerCase();
    return healthKeywords.some(keyword => lowerContent.includes(keyword));
  };

  // Handle mode changes
  useEffect(() => {
    // Check if mode actually changed
    if (previousModeRef.current !== mode || previousSubModeRef.current !== subMode) {
      const announcement = getAnnouncement(mode, subMode);
      
      if (announcement) {
        // Add announcement message
        const announcementMessage = {
          id: `announcement_${Date.now()}`,
          content: formatAnnouncementMessage(announcement),
          sender: 'system' as const,
          timestamp: new Date(),
          isAnnouncement: true
        };
        
        setMessages(prev => [...prev, announcementMessage]);
      }
      
      // Update refs
      previousModeRef.current = mode;
      previousSubModeRef.current = subMode;
    }
  }, [mode, subMode, getAnnouncement, formatAnnouncementMessage]);
  
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
          'x-user-id': 'admin-1' // Consistent with userId
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
          'x-user-id': 'admin-1' // Consistent with userId
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
    const welcomeContent = userProfile 
      ? getPersonalizedWelcome(userProfile)
      : mode === 'cmo' 
        ? "Hello! I'm Tala, your AI marketing assistant. How can I help you with your marketing today?"
        : "Hello! I'm Tala, your AI travel assistant. How can I help you today?";
    
    setMessages([
      {
        id: 'welcome_new',
        content: welcomeContent,
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
          'x-user-id': 'admin-1' // Consistent with userId
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
      
      // Process message for CMO context detection
      if (mode === 'cmo') {
        const contextResult = await processMessageContext(content);
        if (contextResult?.enhancedResponse) {
          // We'll use this enhanced response data later if needed
          console.log('Context analysis:', contextResult);
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

      // Call the real Tala AI API with mode information
      console.log('📤 Sending to chat service:', { content, mode, subMode });
      const response = await chatService.sendMessage(content, currentConversationId, mode, subMode);
      console.log('📥 Response from chat service:', response);
      
      // Update current conversation ID if this was a new conversation
      if (!currentConversationId && response.conversationId) {
        setCurrentConversationId(response.conversationId);
      }
      
      // Add AI response with sources
      // Handle different response structures from v2 endpoint
      let responseContent = '';
      
      if (typeof response.response === 'string') {
        responseContent = response.response;
      } else if (response.response?.emailType) {
        // Handle email extraction response format
        const emailData = response.response;
        if (emailData.actionItems?.length > 0) {
          responseContent = `I found the following action items:\n${emailData.actionItems.join('\n')}`;
        } else if (emailData.bookingDetails?.confirmationNumbers?.length > 0) {
          responseContent = `I found booking information:\nConfirmation: ${emailData.bookingDetails.confirmationNumbers.join(', ')}`;
        } else {
          responseContent = "I'm processing your request. Please note that I'm currently in email processing mode. Try asking about travel documents, visa requirements, or flight bookings for better assistance.";
        }
      } else if (response.response?.message) {
        responseContent = response.response.message;
      } else {
        responseContent = "I apologize, but I'm having trouble processing your request. Please try rephrasing or ask about travel-related topics.";
      }
      
      // Update conversation flow if in CMO mode
      if (mode === 'cmo' && response.conversation) {
        updateFromResponse(response);
      }
      
      // Check for marketing health queries in CMO mode
      if (mode === 'cmo' && (checkForHealthQuery(content) || response.marketingHealth)) {
        setShowMarketingHealth(true);
        if (!marketingHealthData) {
          await loadMarketingHealth();
        }
      }
      
      console.log('📤 Creating AI message with sources:', {
        hasSources: !!response.sources,
        sourcesCount: response.sources?.length || 0,
        sources: response.sources
      });
      
      const aiMessage = {
        id: `ai_${Date.now()}`,
        content: responseContent,
        sender: 'tala' as const,
        timestamp: new Date(),
        sources: response.sources?.map((source: any) => ({
          title: source.title,
          type: source.type,
          score: source.score
        })) || [],
        tokensUsed: response.tokensUsed || 0,
        taskCreated: response.taskCreated
      };
      
      console.log('📝 Final AI message sources:', aiMessage.sources);
      
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
            'x-user-id': 'admin-1' // Consistent with userId
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
          'x-user-id': 'admin-1' // Consistent with userId
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
          'x-user-id': 'admin-1' // Consistent with userId
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
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0 -z-10 opacity-20"
        animate={{
          background: [
            "radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.5) 0%, rgba(59, 130, 246, 0.5) 50%, rgba(0, 0, 0, 0) 100%)",
            "radial-gradient(circle at 30% 70%, rgba(236, 72, 153, 0.5) 0%, rgba(139, 92, 246, 0.5) 50%, rgba(0, 0, 0, 0) 100%)",
            "radial-gradient(circle at 70% 30%, rgba(34, 197, 94, 0.5) 0%, rgba(59, 130, 246, 0.5) 50%, rgba(0, 0, 0, 0) 100%)",
            "radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.5) 0%, rgba(59, 130, 246, 0.5) 50%, rgba(0, 0, 0, 0) 100%)",
          ],
        }}
        transition={{ duration: 30, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
      />

      <div className="flex gap-6 h-screen p-6">
        {/* Main Chat Area - Full Screen */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Chat Header - Premium Style */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 p-6 text-white mb-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-3">
                    <Sparkles className="text-yellow-300" size={28} />
                    Chat with Tala
                  </h1>
                  <p className="text-white/80 mt-1">
                    {mode === 'cmo' ? 'AI Marketing Assistant' : 'AI Travel Assistant'}
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <ModeSelector />
                  {mode === 'cmo' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setShowMarketingHealth(!showMarketingHealth);
                        if (!marketingHealthData) {
                          loadMarketingHealth();
                        }
                      }}
                      className="gap-2 bg-white/20 hover:bg-white/30 border-white/30 text-white"
                    >
                      <BarChart3 size={16} />
                      Marketing Health
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {error && (
                  <div className="flex items-center gap-2 bg-red-500/20 border border-red-400/30 rounded-2xl px-3 py-2">
                    <AlertCircle size={16} />
                    <span className="text-sm">Connection Error</span>
                    <Button variant="ghost" size="icon" onClick={clearError} className="h-6 w-6 hover:bg-white/20">
                      <X size={12} />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Conversation Breadcrumbs for CMO mode */}
            {mode === 'cmo' && conversationState.breadcrumbs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 pt-4 border-t border-white/20"
              >
                <ConversationBreadcrumbs
                  breadcrumbs={conversationState.breadcrumbs}
                  onNavigate={navigateToBreadcrumb}
                  onGoBack={goBack}
                  className=""
                />
              </motion.div>
            )}
          </motion.div>

          {/* Messages Area - Premium Style */}
          <Card className="flex-1 flex flex-col backdrop-blur-md bg-background/30 border-border/50 overflow-hidden">
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 relative"
              onScroll={handleScroll}
            >
              <AnimatePresence>
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ duration: 0.3, ease: "easeOut", delay: index * 0.1 }}
                  >
                    <ChatMessage message={message} />
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {/* Premium Loading indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-4 p-4 rounded-3xl bg-gradient-to-r from-violet-600/10 to-indigo-600/10 border border-violet-200/20 backdrop-blur-sm"
                >
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                    <Bot size={18} className="text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-violet-600" />
                    <span className="text-sm font-medium">Tala is searching knowledge base...</span>
                  </div>
                </motion.div>
              )}
          
          {/* Marketing Health Dashboard for CMO mode */}
          {mode === 'cmo' && showMarketingHealth && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6"
            >
              <MarketingHealthDashboard
                healthData={marketingHealthData}
                isLoading={loadingHealth}
                onChannelClick={(channel) => {
                  handleSendMessage(`Tell me more about my ${channel} performance`);
                }}
                onRecommendationClick={(recommendation) => {
                  handleSendMessage(`Help me with: ${recommendation.title}`);
                }}
                className="max-w-4xl mx-auto"
              />
            </motion.div>
          )}
          
          {/* Follow-up suggestions for CMO mode */}
          {mode === 'cmo' && conversationState.followUpSuggestions.length > 0 && !isLoading && (
            <div className="mt-6 mb-4">
              <FollowUpSuggestions
                suggestions={conversationState.followUpSuggestions}
                onSelect={async (suggestion) => {
                  const response = await processFollowUp(suggestion);
                  if (response) {
                    handleSendMessage(suggestion.text);
                  }
                }}
                isLoading={isLoading}
              />
            </div>
          )}
              
              {/* Scroll to bottom button */}
              {showScrollButton && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={scrollToBottom}
                  className="absolute bottom-4 right-4 p-3 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl shadow-lg hover:shadow-xl transition-all z-10"
                  title="Scroll to bottom"
                >
                  <ChevronDown size={20} className="text-white" />
                </motion.button>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            {/* Premium Input Area */}
            <div className="border-t border-border">
              <ChatInput 
                onSend={handleSendMessage}
                disabled={isLoading}
                placeholder="Ask me about travel, visas, documents, or destinations..."
              />
            </div>
          </Card>
        </div>

        {/* Premium Conversations Sidebar */}
        <div className="w-80">
          <Card className="h-full flex flex-col backdrop-blur-md bg-background/50">
            {/* Header */}
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <MessageSquare size={20} className="text-primary" />
                  Conversations
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={startNewConversation}
                  className="rounded-2xl hover:bg-primary/10"
                  title="Start new conversation"
                >
                  <Plus size={18} />
                </Button>
              </div>
            </div>
            
            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingConversations ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-muted-foreground" />
                </div>
              ) : conversations.length > 0 ? (
                <div className="space-y-3">
                  <AnimatePresence>
                    {conversations.map((conversation) => (
                      <motion.div
                        key={conversation.id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          "group relative p-4 rounded-2xl border cursor-pointer transition-all duration-200",
                          "hover:bg-accent hover:shadow-md",
                          currentConversationId === conversation.id 
                            ? "bg-primary/10 border-primary/30 shadow-sm" 
                            : "bg-background/30 border-border hover:border-border/80"
                        )}
                        onClick={() => loadConversation(conversation.id)}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm truncate pr-8">
                              {conversation.title}
                            </h4>
                            {conversation.mode && (
                              <Badge variant="outline" className="text-xs">
                                {conversation.mode === 'cmo' ? '📊' : '✈️'}
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-xs text-muted-foreground truncate">
                            {conversation.lastMessage}
                          </p>
                          
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock size={10} />
                              <span>{new Date(conversation.lastActivity).toLocaleDateString()}</span>
                            </div>
                            <span>{conversation.messageCount} messages</span>
                          </div>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => deleteConversation(conversation.id, e)}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg hover:bg-destructive/20 hover:text-destructive"
                        >
                          <X size={12} />
                        </Button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageSquare size={48} className="mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-sm text-muted-foreground">No conversations yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Start chatting to see your history</p>
                </div>
              )}
            </div>
          </Card>
        </div>
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