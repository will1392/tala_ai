import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Plus, 
  Send, 
  Loader2, 
  Settings, 
  Mic, 
  ChevronDown, 
  BarChart3,
  Sparkles,
  User,
  Bot,
  X,
  MoreHorizontal,
  Clock,
  Zap
} from 'lucide-react';
import { cn } from '../utils/cn';
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

const Input = ({ className = "", ...props }: { className?: string; [key: string]: any }) => (
  <input
    className={cn(
      "flex h-12 w-full rounded-2xl border border-input bg-background/50 backdrop-blur-sm px-4 py-3 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
)

// Message Component with Premium Styling
const PremiumChatMessage = ({ message }: { message: any }) => {
  const isUser = message.sender === 'user';
  const isSystem = message.sender === 'system';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "flex gap-4 max-w-4xl",
        isUser ? "ml-auto flex-row-reverse" : "mr-auto"
      )}
    >
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center text-white font-medium",
        isUser 
          ? "bg-gradient-to-br from-blue-500 to-purple-600" 
          : isSystem
          ? "bg-gradient-to-br from-amber-500 to-orange-600"
          : "bg-gradient-to-br from-violet-600 to-indigo-600"
      )}>
        {isUser ? <User size={18} /> : isSystem ? <Sparkles size={18} /> : <Bot size={18} />}
      </div>
      
      {/* Message Bubble */}
      <Card className={cn(
        "max-w-2xl p-4 backdrop-blur-md transition-all duration-300 hover:shadow-lg",
        isUser 
          ? "bg-gradient-to-r from-blue-500/10 to-purple-600/10 border-blue-200/20" 
          : isSystem
          ? "bg-gradient-to-r from-amber-500/10 to-orange-600/10 border-amber-200/20"
          : "bg-gradient-to-r from-violet-600/10 to-indigo-600/10 border-violet-200/20"
      )}>
        <div className="space-y-3">
          {/* Message Content */}
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
          
          {/* Message Metadata */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock size={12} />
              <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
            </div>
            
            {message.tokensUsed && (
              <div className="flex items-center gap-1">
                <Zap size={12} />
                <span>{message.tokensUsed} tokens</span>
              </div>
            )}
          </div>
          
          {/* Sources */}
          {message.sources && message.sources.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2">Sources:</p>
              <div className="flex flex-wrap gap-2">
                {message.sources.map((source: any, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {source.title}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};

// Premium Chat Input Component
const PremiumChatInput = ({ 
  onSend, 
  disabled = false, 
  placeholder = "Type your message..."
}: {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6"
    >
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex-1 relative">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="pr-12"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
          >
            <Mic size={16} />
          </Button>
        </div>
        
        <Button
          type="submit"
          disabled={!message.trim() || disabled}
          className="px-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
        >
          {disabled ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </Button>
      </form>
    </motion.div>
  );
};

// Premium Conversation Sidebar
const PremiumConversationSidebar = ({ 
  conversations, 
  currentConversationId, 
  onLoadConversation, 
  onStartNew, 
  onDeleteConversation,
  loading = false
}: {
  conversations: any[];
  currentConversationId: string | null;
  onLoadConversation: (id: string) => void;
  onStartNew: () => void;
  onDeleteConversation: (id: string, e: React.MouseEvent) => void;
  loading?: boolean;
}) => {
  return (
    <Card className="h-full flex flex-col backdrop-blur-md bg-background/50">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Conversations</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onStartNew}
            className="rounded-2xl"
          >
            <Plus size={18} />
          </Button>
        </div>
      </div>
      
      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
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
                  onClick={() => onLoadConversation(conversation.id)}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm truncate pr-8">
                        {conversation.title}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {conversation.mode === 'cmo' ? '📊' : '✈️'}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-muted-foreground truncate">
                      {conversation.lastMessage}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{new Date(conversation.lastActivity).toLocaleDateString()}</span>
                      <span>{conversation.messageCount} messages</span>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => onDeleteConversation(conversation.id, e)}
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
  );
};

export const PremiumChat = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [mode, setMode] = useState<'travel' | 'cmo'>('travel');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with welcome message
  useEffect(() => {
    const welcomeMessage = {
      id: 'welcome',
      content: "Hello! I'm Tala, your AI assistant. I can help you with travel planning, visa requirements, marketing strategies, and much more. How can I assist you today?",
      sender: 'tala',
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
    
    // Load conversations
    loadConversations();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      // Simulate API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      setConversations([
        {
          id: '1',
          title: 'Travel to Japan',
          lastMessage: 'What documents do I need for Japan?',
          lastActivity: new Date().toISOString(),
          messageCount: 5,
          mode: 'travel'
        },
        {
          id: '2', 
          title: 'Marketing Campaign',
          lastMessage: 'Help me create an email campaign',
          lastActivity: new Date(Date.now() - 86400000).toISOString(),
          messageCount: 12,
          mode: 'cmo'
        }
      ]);
    } finally {
      setLoadingConversations(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage = {
      id: `user_${Date.now()}`,
      content,
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Simulate AI response - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const aiMessage = {
        id: `ai_${Date.now()}`,
        content: `Thanks for your question: "${content}". This is a demo response from your AI assistant. In the real implementation, this would connect to your backend API and provide intelligent responses based on your knowledge base.`,
        sender: 'tala',
        timestamp: new Date(),
        tokensUsed: Math.floor(Math.random() * 100) + 50,
        sources: [
          { title: 'Travel Guide', type: 'document' },
          { title: 'Policy Manual', type: 'reference' }
        ]
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    // In real implementation, load conversation messages
    console.log('Loading conversation:', conversationId);
  };

  const handleStartNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([{
      id: 'welcome_new',
      content: "Starting a new conversation! How can I help you today?",
      sender: 'tala',
      timestamp: new Date(),
    }]);
  };

  const handleDeleteConversation = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this conversation?')) {
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      if (currentConversationId === conversationId) {
        handleStartNewConversation();
      }
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
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Chat Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 p-6 text-white mb-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Chat with Tala</h1>
                <p className="text-white/80">Your AI-powered marketing and travel assistant</p>
              </div>
              
              <div className="flex items-center gap-3">
                <Badge 
                  variant="secondary" 
                  className="bg-white/20 text-white border-white/30"
                >
                  {mode === 'cmo' ? '📊 Marketing' : '✈️ Travel'}
                </Badge>
                
                <Button variant="secondary" size="icon" className="bg-white/20 hover:bg-white/30 border-white/30">
                  <Settings size={18} />
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Messages Area */}
          <Card className="flex-1 flex flex-col backdrop-blur-md bg-background/30 border-border/50 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <AnimatePresence>
                {messages.map((message) => (
                  <PremiumChatMessage key={message.id} message={message} />
                ))}
              </AnimatePresence>
              
              {/* Loading indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 text-muted-foreground"
                >
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                    <Bot size={18} className="text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm">Tala is thinking...</span>
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            {/* Chat Input */}
            <div className="border-t border-border">
              <PremiumChatInput
                onSend={handleSendMessage}
                disabled={isLoading}
                placeholder="Ask me about travel, marketing, or anything else..."
              />
            </div>
          </Card>
        </div>

        {/* Conversations Sidebar */}
        <div className="w-80">
          <PremiumConversationSidebar
            conversations={conversations}
            currentConversationId={currentConversationId}
            onLoadConversation={handleLoadConversation}
            onStartNew={handleStartNewConversation}
            onDeleteConversation={handleDeleteConversation}
            loading={loadingConversations}
          />
        </div>
      </div>
    </div>
  );
};