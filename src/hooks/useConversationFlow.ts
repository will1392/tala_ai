import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useMode } from './useMode';

export interface Breadcrumb {
  label: string;
  topic: string;
  timestamp: Date;
}

export interface FollowUpSuggestion {
  text: string;
  intent: string;
  reason?: string;
  topic?: string;
}

export interface ConversationMemory {
  businessInfo: {
    name?: string;
    industry?: string;
  };
  previousMetrics: Array<{
    value: string;
    context: string;
    age: number;
  }>;
  relatedTopics: string[];
  preferences: Record<string, string>;
}

export interface ConversationState {
  sessionId?: string;
  stage?: string;
  breadcrumbs: Breadcrumb[];
  followUpSuggestions: FollowUpSuggestion[];
  memory: ConversationMemory;
  previousTopics: Array<{
    topic: string;
    lastMentioned: Date;
    frequency: number;
  }>;
}

export const useConversationFlow = () => {
  const { user } = useAuthStore();
  const { mode } = useMode();
  const [conversationState, setConversationState] = useState<ConversationState>({
    breadcrumbs: [],
    followUpSuggestions: [],
    memory: {
      businessInfo: {},
      previousMetrics: [],
      relatedTopics: [],
      preferences: {}
    },
    previousTopics: []
  });

  // Update conversation state from response
  const updateFromResponse = useCallback((response: any) => {
    if (response?.conversation) {
      setConversationState(prev => ({
        ...prev,
        sessionId: response.conversation.session?.id,
        stage: response.conversation.stage,
        breadcrumbs: response.conversation.breadcrumbs || [],
        followUpSuggestions: response.conversation.followUpSuggestions || [],
        memory: response.conversation.memory || prev.memory,
        previousTopics: response.conversation.previousTopics || []
      }));
    }
  }, []);

  // Navigate to breadcrumb
  const navigateToBreadcrumb = useCallback(async (index: number) => {
    if (mode !== 'cmo' || !user?.id) return;

    const stepsBack = conversationState.breadcrumbs.length - index;
    if (stepsBack <= 0) return;

    try {
      const response = await fetch('/api/cmo/conversation/navigate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          userId: user.id,
          stepsBack
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update breadcrumbs to reflect navigation
          setConversationState(prev => ({
            ...prev,
            breadcrumbs: prev.breadcrumbs.slice(0, index)
          }));
        }
      }
    } catch (error) {
      console.error('Failed to navigate conversation:', error);
    }
  }, [mode, user, conversationState.breadcrumbs]);

  // Go back one step
  const goBack = useCallback(() => {
    const currentIndex = conversationState.breadcrumbs.length - 1;
    if (currentIndex > 0) {
      navigateToBreadcrumb(currentIndex - 1);
    }
  }, [conversationState.breadcrumbs, navigateToBreadcrumb]);

  // Process follow-up suggestion
  const processFollowUp = useCallback(async (suggestion: FollowUpSuggestion) => {
    if (mode !== 'cmo' || !user?.id) return null;

    try {
      const response = await fetch('/api/cmo/conversation/followup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          userId: user.id,
          suggestion
        })
      });

      if (response.ok) {
        const data = await response.json();
        updateFromResponse(data);
        return data;
      }
    } catch (error) {
      console.error('Failed to process follow-up:', error);
    }
    return null;
  }, [mode, user, updateFromResponse]);

  // Clear conversation
  const clearConversation = useCallback(async () => {
    if (mode !== 'cmo' || !user?.id) return;

    try {
      await fetch('/api/cmo/conversation/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          userId: user.id
        })
      });

      // Reset local state
      setConversationState({
        breadcrumbs: [],
        followUpSuggestions: [],
        memory: {
          businessInfo: {},
          previousMetrics: [],
          relatedTopics: [],
          preferences: {}
        },
        previousTopics: []
      });
    } catch (error) {
      console.error('Failed to clear conversation:', error);
    }
  }, [mode, user]);

  // Get conversation summary
  const getConversationSummary = useCallback(async () => {
    if (mode !== 'cmo' || !user?.id) return null;

    try {
      const response = await fetch(`/api/cmo/conversation/summary?userId=${user.id}`, {
        headers: {
          'x-user-id': user.id
        }
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Failed to get conversation summary:', error);
    }
    return null;
  }, [mode, user]);

  // Clear conversation when switching away from CMO mode
  useEffect(() => {
    if (mode !== 'cmo' && conversationState.sessionId) {
      clearConversation();
    }
  }, [mode, conversationState.sessionId, clearConversation]);

  return {
    conversationState,
    updateFromResponse,
    navigateToBreadcrumb,
    goBack,
    processFollowUp,
    clearConversation,
    getConversationSummary
  };
};