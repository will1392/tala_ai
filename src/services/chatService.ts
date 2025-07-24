export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'tala';
  timestamp: Date;
  sources?: Array<{ 
    title: string; 
    type: 'document' | 'website';
    score?: number;
    documentId?: string;
  }>;
  attachments?: Array<{ name: string; size: string; type: string }>;
  isLoading?: boolean;
  tokensUsed?: number;
}

export interface ChatResponse {
  response: string;
  sources: Array<{
    title: string;
    type: 'document';
    score: number;
    documentId: string;
  }>;
  contextUsed: boolean;
  conversationId: string;
  timestamp: string;
  tokensUsed: number;
}

export interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  lastActivity: string;
  messageCount: number;
}

export class ChatService {
  private baseUrl: string;
  private userId: string;
  private isAdmin: boolean;

  constructor(userId: string = 'test_user_123', isAdmin: boolean = true) {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    this.userId = userId;
    this.isAdmin = isAdmin;
  }

  /**
   * Send a message to the Tala AI chat system
   */
  async sendMessage(
    message: string, 
    conversationId?: string,
    maxResults: number = 5
  ): Promise<ChatResponse> {
    try {
      // Check if this is a task creation request
      const isTaskCreation = this.isTaskCreationRequest(message);
      
      if (isTaskCreation) {
        console.log('🎯 Detected task creation request:', message);
        // Use direct task creation endpoint
        const taskResponse = await fetch(`${this.baseUrl}/api/chat-tasks/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': this.userId // Use standard user header
          },
          body: JSON.stringify({
            message,
            userId: this.userId
          }),
        });
        
        if (taskResponse.ok) {
          const taskData = await taskResponse.json();
          console.log('✅ Task created successfully:', taskData.task);
          // Format as chat response
          return {
            response: taskData.message || `Task "${taskData.task.title}" has been created successfully.`,
            sources: [],
            contextUsed: false,
            conversationId: conversationId || this.generateConversationId(),
            timestamp: new Date().toISOString(),
            tokensUsed: 0
          };
        } else {
          console.error('❌ Task creation failed:', await taskResponse.text());
        }
      }
      
      // Regular chat request - use v2 endpoint
      const response = await fetch(`${this.baseUrl}/api/chat/v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': this.userId // Use standard user header
        },
        body: JSON.stringify({
          message,
          userId: this.userId,
          isAdmin: this.isAdmin,
          conversationId,
          maxResults
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const data = await response.json();
      
      // Handle v2 response format
      if (data.success && data.response) {
        return {
          response: data.response,
          sources: data.metadata?.sources || [],
          contextUsed: data.metadata?.contextUsed || false,
          conversationId: data.conversationId || conversationId || this.generateConversationId(),
          timestamp: new Date().toISOString(),
          tokensUsed: data.metadata?.tokensUsed || 0
        };
      }
      
      // Return as-is if it's already in the expected format
      return data;
    } catch (error) {
      console.error('Chat service error:', error);
      throw error;
    }
  }

  /**
   * Get chat history for a conversation
   */
  async getChatHistory(conversationId: string): Promise<ChatMessage[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/chat/history/${conversationId}?userId=${this.userId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get chat history');
      }

      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error('Chat history error:', error);
      throw error;
    }
  }

  /**
   * Get list of user conversations
   */
  async getConversations(): Promise<Conversation[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/chat/conversations?userId=${this.userId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get conversations');
      }

      const data = await response.json();
      return data.conversations || [];
    } catch (error) {
      console.error('Conversations error:', error);
      throw error;
    }
  }

  /**
   * Generate a new conversation ID
   */
  generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract title from message content
   */
  generateConversationTitle(firstMessage: string): string {
    // Take first 50 characters and clean up
    const title = firstMessage.substring(0, 50).trim();
    return title.length < firstMessage.length ? title + '...' : title;
  }

  /**
   * Format sources for display
   */
  formatSources(sources: ChatResponse['sources']) {
    return sources.map(source => ({
      title: source.title,
      type: source.type as 'document' | 'website',
      score: source.score,
      documentId: source.documentId
    }));
  }

  /**
   * Create a typing indicator message
   */
  createTypingMessage(): ChatMessage {
    return {
      id: `typing_${Date.now()}`,
      content: '...',
      sender: 'tala',
      timestamp: new Date(),
      isLoading: true
    };
  }

  /**
   * Create user message
   */
  createUserMessage(content: string): ChatMessage {
    return {
      id: `user_${Date.now()}`,
      content,
      sender: 'user',
      timestamp: new Date()
    };
  }

  /**
   * Create Tala message from API response
   */
  createTalaMessage(response: ChatResponse): ChatMessage {
    return {
      id: `tala_${Date.now()}`,
      content: response.response,
      sender: 'tala',
      timestamp: new Date(response.timestamp),
      sources: this.formatSources(response.sources),
      tokensUsed: response.tokensUsed
    };
  }
  
  /**
   * Check if message is a task creation request
   */
  private isTaskCreationRequest(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    
    // Check for task creation keywords
    const createKeywords = ['create', 'add', 'make', 'new'];
    const taskKeywords = ['task', 'todo', 'reminder'];
    
    // Check if message contains both create and task keywords
    const hasCreateKeyword = createKeywords.some(keyword => lowerMessage.includes(keyword));
    const hasTaskKeyword = taskKeywords.some(keyword => lowerMessage.includes(keyword));
    
    // Also check for common task creation phrases
    const taskPhrases = [
      'need to', 'have to', 'must', 'should',
      'remind me', 'don\'t forget'
    ];
    const hasTaskPhrase = taskPhrases.some(phrase => lowerMessage.includes(phrase));
    
    return (hasCreateKeyword && hasTaskKeyword) || 
           (hasTaskPhrase && lowerMessage.length < 200); // Likely a task if short and has task phrase
  }
}

// Create default Tala AI service instance
export const chatService = new ChatService();

export default ChatService;