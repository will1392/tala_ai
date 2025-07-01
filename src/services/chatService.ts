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

  constructor(userId: string = 'admin-1', isAdmin: boolean = true) {
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
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
}

// Create default Tala AI service instance
export const chatService = new ChatService();

export default ChatService;