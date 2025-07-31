import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatService, type ChatMessage, type Conversation } from '../services/chatService';

interface UseChatOptions {
  userId?: string;
  isAdmin?: boolean;
  initialConversationId?: string;
}

export const useChat = (options: UseChatOptions = {}) => {
  const {
    userId = 'test_user_123', // Standardized user ID across the app
    isAdmin = true,
    initialConversationId
  } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(
    initialConversationId || null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const chatServiceRef = useRef(new ChatService(userId, isAdmin));

  // Initialize chat
  useEffect(() => {
    const initializeChat = async () => {
      try {
        setIsLoading(true);
        
        // Load conversations list
        const conversationsList = await chatServiceRef.current.getConversations();
        setConversations(conversationsList);
        
        // If there's an initial conversation, load its history
        if (initialConversationId) {
          const history = await chatServiceRef.current.getChatHistory(initialConversationId);
          setMessages(history);
          setCurrentConversationId(initialConversationId);
        } else {
          // Start with welcome message
          setMessages([{
            id: 'welcome',
            content: "Hello! I'm Tala, your AI travel assistant. I can help you with visa requirements, travel documents, airline policies, and destination information. How can I assist you today?",
            sender: 'tala',
            timestamp: new Date(),
          }]);
        }
        
        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize chat:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize chat');
      } finally {
        setIsLoading(false);
      }
    };

    initializeChat();
  }, [initialConversationId]);

  const sendMessage = useCallback(async (content: string, _attachments?: File[]) => {
    if (!content.trim()) return;

    try {
      setError(null);
      
      // Create user message
      const userMessage = chatServiceRef.current.createUserMessage(content);
      
      // Add user message to chat
      setMessages(prev => [...prev, userMessage]);

      // Create and add typing indicator
      const typingMessage = chatServiceRef.current.createTypingMessage();
      setMessages(prev => [...prev, typingMessage]);

      // Generate conversation ID if this is a new conversation
      let conversationId = currentConversationId;
      if (!conversationId) {
        conversationId = chatServiceRef.current.generateConversationId();
        setCurrentConversationId(conversationId);
      }

      // Send message to API
      const response = await chatServiceRef.current.sendMessage(content, conversationId);
      
      // Remove typing indicator and add actual response
      setMessages(prev => {
        const withoutTyping = prev.filter(msg => !msg.isLoading);
        const talaMessage = chatServiceRef.current.createTalaMessage(response);
        return [...withoutTyping, talaMessage];
      });

      // Update conversations list if this was a new conversation
      if (!currentConversationId) {
        const newConversation: Conversation = {
          id: conversationId,
          title: chatServiceRef.current.generateConversationTitle(content),
          lastMessage: response.response.substring(0, 100) + (response.response.length > 100 ? '...' : ''),
          lastActivity: new Date().toISOString(),
          messageCount: 2
        };
        setConversations(prev => [newConversation, ...prev]);
      }

    } catch (err) {
      console.error('Failed to send message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      
      // Remove typing indicator on error
      setMessages(prev => prev.filter(msg => !msg.isLoading));
    }
  }, [currentConversationId]);

  const startNewConversation = useCallback(() => {
    setCurrentConversationId(null);
    setMessages([{
      id: 'welcome_new',
      content: "Hello! I'm Tala, your AI travel assistant. How can I help you today?",
      sender: 'tala',
      timestamp: new Date(),
    }]);
    setError(null);
  }, []);

  const loadConversation = useCallback(async (conversationId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const history = await chatServiceRef.current.getChatHistory(conversationId);
      setMessages(history);
      setCurrentConversationId(conversationId);
      
    } catch (err) {
      console.error('Failed to load conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshConversations = useCallback(async () => {
    try {
      const conversationsList = await chatServiceRef.current.getConversations();
      setConversations(conversationsList);
    } catch (err) {
      console.error('Failed to refresh conversations:', err);
    }
  }, []);

  return {
    // State
    messages,
    conversations,
    currentConversationId,
    isLoading,
    error,
    isInitialized,
    
    // Actions
    sendMessage,
    startNewConversation,
    loadConversation,
    clearError,
    refreshConversations,
    
    // Utils
    chatService: chatServiceRef.current
  };
};

export default useChat;