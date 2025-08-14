/**
 * Expertise Learning Service
 * Tracks interactions and learns from user behavior
 */

import { apiClient } from './apiClient';

export interface InteractionData {
  message?: string;
  response?: string;
  duration?: number;
  topic?: string;
  type?: 'message' | 'action' | 'completion';
  success?: boolean;
  metadata?: Record<string, any>;
}

export interface ComprehensionLevel {
  level: 'struggling' | 'appropriate' | 'advanced' | 'unknown';
  confidence: number;
  metrics?: {
    confusionRate: number;
    masteryRate: number;
    successRate: number;
  };
}

export interface AdjustmentSuggestion {
  needed: boolean;
  suggestion?: 'increase' | 'decrease' | 'maintain';
  reason: string;
  confidence?: number;
  recommendedAction?: string;
  metrics?: any;
}

export interface LearningInsights {
  hasData: boolean;
  currentLevel: string;
  metrics?: any;
  adjustmentHistory: any[];
  strengths: Array<{
    topic: string;
    confidence: number;
    message: string;
  }>;
  weaknesses: Array<{
    topic: string;
    difficulty: number;
    message: string;
  }>;
  recommendations: Array<{
    type: 'learning' | 'advancement' | 'focus';
    message: string;
  }>;
}

class ExpertiseLearningService {
  private baseUrl = '/api/expertise';

  /**
   * Track user interaction for learning
   */
  async trackInteraction(interaction: InteractionData): Promise<any> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/track-interaction`, {
        interaction
      });
      return response.data;
    } catch (error) {
      console.error('Error tracking interaction:', error);
      throw error;
    }
  }

  /**
   * Detect comprehension from conversation
   */
  async detectComprehension(conversationId: string): Promise<ComprehensionLevel> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/detect-comprehension`, {
        conversationId
      });
      return response.data;
    } catch (error) {
      console.error('Error detecting comprehension:', error);
      return { level: 'unknown', confidence: 0 };
    }
  }

  /**
   * Check if adjustment is needed
   */
  async checkAdjustment(userId: string): Promise<AdjustmentSuggestion> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/check-adjustment/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error checking adjustment:', error);
      return { needed: false, reason: 'Error checking adjustment' };
    }
  }

  /**
   * Apply expertise adjustment
   */
  async applyAdjustment(adjustment: any): Promise<any> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/apply-adjustment`, {
        adjustment
      });
      return response.data;
    } catch (error) {
      console.error('Error applying adjustment:', error);
      throw error;
    }
  }

  /**
   * Get learning insights
   */
  async getLearningInsights(userId: string): Promise<LearningInsights> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/insights/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting insights:', error);
      return {
        hasData: false,
        currentLevel: 'beginner',
        adjustmentHistory: [],
        strengths: [],
        weaknesses: [],
        recommendations: []
      };
    }
  }

  /**
   * Track message interaction automatically
   */
  async trackMessage(
    userMessage: string, 
    botResponse: string, 
    context: {
      topic?: string;
      duration?: number;
      successful?: boolean;
    } = {}
  ) {
    return this.trackInteraction({
      message: userMessage,
      response: botResponse,
      duration: context.duration || 0,
      topic: context.topic || 'general',
      type: 'message',
      success: context.successful,
      metadata: {
        messageLength: userMessage.length,
        responseLength: botResponse.length,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track task completion
   */
  async trackTaskCompletion(
    task: string,
    success: boolean,
    timeToComplete: number,
    context: Record<string, any> = {}
  ) {
    return this.trackInteraction({
      message: `Task: ${task}`,
      duration: timeToComplete,
      topic: context.topic || 'task-completion',
      type: 'completion',
      success,
      metadata: {
        task,
        timeToComplete,
        ...context
      }
    });
  }

  /**
   * Track user asking for help or clarification
   */
  async trackClarificationRequest(
    question: string,
    topic: string,
    context: Record<string, any> = {}
  ) {
    return this.trackInteraction({
      message: question,
      topic,
      type: 'message',
      success: false, // Indicates need for clarification
      metadata: {
        type: 'clarification_request',
        ...context
      }
    });
  }

  /**
   * Analyze text for expertise signals (client-side helper)
   */
  analyzeMessageForSignals(message: string): {
    hasConfusionSignals: boolean;
    hasMasterySignals: boolean;
    confusionPhrases: string[];
    masteryPhrases: string[];
  } {
    const lowerMessage = message.toLowerCase();
    
    const confusionPhrases = [
      "i don't understand", "can you explain", "what does that mean",
      "i'm confused", "too complicated", "can you simplify",
      "break it down", "what is", "how does"
    ];
    
    const masteryPhrases = [
      "i already know", "can we skip", "too basic", "more advanced",
      "i understand that", "familiar with", "experienced in"
    ];
    
    const foundConfusion = confusionPhrases.filter(phrase => 
      lowerMessage.includes(phrase)
    );
    
    const foundMastery = masteryPhrases.filter(phrase => 
      lowerMessage.includes(phrase)
    );
    
    return {
      hasConfusionSignals: foundConfusion.length > 0,
      hasMasterySignals: foundMastery.length > 0,
      confusionPhrases: foundConfusion,
      masteryPhrases: foundMastery
    };
  }

  /**
   * Get personalized learning recommendations
   */
  async getRecommendations(userId: string): Promise<any[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/recommendations/${userId}`);
      return response.data.recommendations || [];
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return [];
    }
  }
}

export const expertiseLearningService = new ExpertiseLearningService();