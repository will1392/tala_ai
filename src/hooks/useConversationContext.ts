/**
 * useConversationContext Hook
 * 
 * Manages conversation context state, entity tracking, and
 * provides methods for context management.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  ConversationContext,
  ConversationEntity,
  ConversationIntent,
  MessageWithContext,
  ContextSummary
} from '../types/conversationContext';
import { conversationContextService } from '../services/conversationContextService';

interface UseConversationContextProps {
  /** Session ID for context storage */
  sessionId: string;
  /** User ID */
  userId: string;
  /** Conversation ID */
  conversationId: string;
  /** Whether to auto-initialize context */
  autoInitialize?: boolean;
}

interface UseConversationContextReturn {
  /** Current conversation context */
  context: ConversationContext | null;
  /** Whether context is loading */
  isLoading: boolean;
  /** Current entities */
  entities: ConversationEntity[];
  /** Current intents */
  intents: ConversationIntent[];
  /** Primary context for quick reference */
  primaryContext?: {
    country?: string;
    city?: string;
    purpose?: string;
    timeframe?: string;
  };
  /** Context summary for display */
  contextSummary: ContextSummary | null;
  /** Whether context is visible in UI */
  isContextVisible: boolean;
  /** Process a user message and extract context */
  processMessage: (message: string) => Promise<MessageWithContext>;
  /** Get context formatted for AI prompt */
  getContextForAI: () => string;
  /** Reset conversation context */
  resetContext: () => void;
  /** Toggle context visibility */
  toggleContextVisibility: () => void;
  /** Force refresh context */
  refreshContext: () => Promise<void>;
  /** Check if context has entities */
  hasContext: boolean;
  /** Get conversation history */
  getConversationHistory: (limit?: number) => string;
}

export const useConversationContext = ({
  sessionId,
  userId,
  conversationId,
  autoInitialize = true
}: UseConversationContextProps): UseConversationContextReturn => {
  const [context, setContext] = useState<ConversationContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isContextVisible, setIsContextVisible] = useState(false);
  const [contextSummary, setContextSummary] = useState<ContextSummary | null>(null);
  
  const initializationRef = useRef(false);
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize context on mount
  useEffect(() => {
    if (autoInitialize && !initializationRef.current && sessionId && userId && conversationId) {
      initializationRef.current = true;
      initializeContext();
    }
  }, [sessionId, userId, conversationId, autoInitialize]);

  // Setup cleanup interval
  useEffect(() => {
    // Clean up expired contexts every 5 minutes
    cleanupIntervalRef.current = setInterval(() => {
      conversationContextService.cleanupExpiredContexts();
    }, 5 * 60 * 1000);

    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, []);

  const initializeContext = useCallback(async () => {
    if (!sessionId || !userId || !conversationId) return;
    
    setIsLoading(true);
    try {
      const newContext = await conversationContextService.getOrCreateContext(
        sessionId,
        userId,
        conversationId
      );
      setContext(newContext);
      updateContextSummary(newContext);
    } catch (error) {
      console.error('Failed to initialize conversation context:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, userId, conversationId]);

  const updateContextSummary = useCallback((contextData: ConversationContext) => {
    if (!contextData) return;
    
    const summary = conversationContextService.getContextSummary(contextData.sessionId);
    setContextSummary(summary);
  }, []);

  const processMessage = useCallback(async (message: string): Promise<MessageWithContext> => {
    if (!context) {
      throw new Error('Context not initialized');
    }

    setIsLoading(true);
    try {
      const result = await conversationContextService.processMessage(
        sessionId,
        message,
        context
      );
      
      // Update local state with new context
      setContext(result.updatedContext);
      updateContextSummary(result.updatedContext);
      
      return result;
    } catch (error) {
      console.error('Failed to process message context:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [context, sessionId, updateContextSummary]);

  const getContextForAI = useCallback((): string => {
    if (!context) return '';
    return conversationContextService.getContextForAI(sessionId);
  }, [context, sessionId]);

  const resetContext = useCallback(() => {
    conversationContextService.resetContext(sessionId);
    setContext(null);
    setContextSummary(null);
    initializeContext();
  }, [sessionId, initializeContext]);

  const toggleContextVisibility = useCallback(() => {
    setIsContextVisible(prev => !prev);
  }, []);

  const refreshContext = useCallback(async () => {
    await initializeContext();
  }, [initializeContext]);

  const getConversationHistory = useCallback((limit: number = 10): string => {
    if (!context) return '';
    return conversationContextService.getConversationHistory(sessionId, limit);
  }, [context, sessionId]);

  // Derived values
  const entities = context ? Array.from(context.entities.values()) : [];
  const intents = context?.intents || [];
  const primaryContext = context?.primaryContext;
  const hasContext = entities.length > 0 || intents.some(i => i.isActive);

  return {
    context,
    isLoading,
    entities,
    intents,
    primaryContext,
    contextSummary,
    isContextVisible,
    processMessage,
    getContextForAI,
    resetContext,
    toggleContextVisibility,
    refreshContext,
    hasContext,
    getConversationHistory
  };
};

export default useConversationContext;