import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Plus, AlertCircle, Loader2 } from 'lucide-react';
import { GlassCard } from '../components/layout/GlassCard';
import { Button } from '../components/shared/Button';
import { ChatMessage } from '../components/chat/ChatMessage';
import { ChatInput } from '../components/chat/ChatInput';

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
      },
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

  // Load conversations on component mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoadingConversations(true);
      const response = await fetch('http://localhost:3001/api/chat/conversations?userId=admin-1');
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
      
      const response = await fetch(`http://localhost:3001/api/chat/history/${conversationId}?userId=admin-1`);
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
  };

  const deleteConversation = async (conversationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this conversation?')) {
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:3001/api/chat/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
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

  const handleSendMessage = async (content: string) => {
    try {
      setError(null);
      
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
        tokensUsed: response.tokensUsed
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
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

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <GlassCard className="flex-1 flex flex-col p-0 overflow-hidden">
          {/* Chat Header */}
          <div className="glass-dark p-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Chat with Tala</h2>
                <p className="text-sm text-white/60">
                  AI-powered travel assistance with knowledge base integration
                  {currentConversationId && (
                    <span className="ml-2 text-xs text-primary">• Active conversation</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
          </div>

          {/* Input */}
          <ChatInput 
            onSend={handleSendMessage}
            disabled={isLoading}
            placeholder="Ask me about travel, visas, documents, or destinations..."
          />
        </GlassCard>
      </div>

      {/* Sidebar */}
      <div className="w-80 space-y-6">
        {/* Error Banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-dark rounded-xl p-4 border border-red-500/20 bg-red-500/5"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={16} />
              <div className="flex-1">
                <p className="text-sm text-red-400 font-medium">Connection Error</p>
                <p className="text-xs text-white/70 mt-1">{error}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={clearError} className="p-1">
                ×
              </Button>
            </div>
          </motion.div>
        )}
        
        {/* New Conversation */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
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
          
          {/* Current Conversation Indicator */}
          {currentConversationId && (
            <div className="mb-3 p-2 glass-dark rounded-lg border border-primary/20">
              <div className="flex items-center gap-2">
                <MessageSquare size={14} className="text-primary" />
                <span className="text-xs text-white/70">Current chat</span>
              </div>
            </div>
          )}
        </GlassCard>

        {/* Recent Conversations */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recent Conversations</h3>
            <span className="text-xs text-white/50">Last 15</span>
          </div>
          {loadingConversations ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={16} className="animate-spin" />
            </div>
          ) : conversations.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
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
            <div className="text-center py-4 text-sm text-white/50">
              No conversations yet
              <br />
              <span className="text-xs">Start chatting to see your history here</span>
            </div>
          )}
        </GlassCard>

        {/* Quick Actions */}
        <GlassCard>
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {[
              'What visa do I need for Japan?',
              'Flight baggage policies',
              'Travel insurance requirements', 
              'Passport renewal process',
            ].map((action) => (
              <button
                key={action}
                onClick={() => handleSendMessage(action)}
                disabled={isLoading}
                className="w-full text-left glass-button rounded-lg px-3 py-2 text-sm hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {action}
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Tala AI Status */}
        <GlassCard>
          <h3 className="font-semibold mb-4">System Status</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Chat Interface: Online</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Knowledge Base: Ready</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${error ? 'bg-red-400' : 'bg-green-400'}`}></div>
              <span>Tala AI: {error ? 'Error' : 'Connected'}</span>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};