/**
 * useConversation Hook
 * 
 * Manages conversation state, persistence, and history
 * Provides conversation continuity across messages and sessions
 */

import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface ConversationMetadata {
  id: string;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  mode?: string;
}

interface UseConversationOptions {
  storageKey?: string;
  autoLoad?: boolean;
  userId?: string;
}

export function useConversation(options: UseConversationOptions = {}) {
  const {
    storageKey = 'tala_current_conversation',
    autoLoad = true,
    userId = 'default-user'
  } = options;

  // Conversation state
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationMetadata[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Initialize or load conversation on mount
  useEffect(() => {
    if (autoLoad) {
      loadOrCreateConversation();
      loadConversationList();
    }
  }, [autoLoad]);

  /**
   * Load existing conversation or prepare for new one
   */
  const loadOrCreateConversation = useCallback(() => {
    try {
      // Check localStorage for existing conversation
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate that conversation is recent (within 24 hours)
        const age = Date.now() - new Date(parsed.updatedAt).getTime();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (age < maxAge && parsed.id) {
          // Check if this looks like a backend ID (not conv-xxx)
          if (!parsed.id.startsWith('conv-')) {
            setConversationId(parsed.id);
            console.log('🔄 Resumed backend conversation:', parsed.id);
            return parsed.id;
          } else {
            console.log('⚠️ Found old frontend ID, will get new backend ID');
          }
        }
      }
      
      // Don't create ID, backend will handle it
      console.log('🆕 Ready for new conversation (backend will create ID)');
      setConversationId(null);
      return null;
    } catch (error) {
      console.error('Error loading conversation:', error);
      setConversationId(null);
      return null;
    }
  }, [storageKey]);

  /**
   * Create a new conversation (clears current, backend will create ID)
   */
  const createNewConversation = useCallback((title?: string): string | null => {
    // Clear current conversation - backend will create the actual ID
    setConversationId(null);
    localStorage.removeItem(storageKey);
    
    console.log('🆕 Ready for new conversation (backend will create ID)');
    return null;
  }, [storageKey]);

  /**
   * Load conversation list from backend and localStorage
   */
  const loadConversationList = useCallback(async () => {
    try {
      setIsLoadingHistory(true);
      const listKey = `tala_conversations_${userId}`;
      
      // Try backend first (source of truth)
      try {
        const response = await fetch('http://localhost:3001/api/conversations', {
          headers: {
            'x-user-id': userId
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('🌐 Backend conversations:', data);
          
          if (data.conversations && data.conversations.length > 0) {
            // Backend has conversations - this is our primary source
            const backendConvs = data.conversations.map((conv: any) => ({
              id: conv.id,
              title: conv.title || 'Untitled',
              createdAt: new Date(conv.createdAt || conv.created_at),
              updatedAt: new Date(conv.updatedAt || conv.updated_at),
              messageCount: conv.messageCount || 0,
              mode: conv.mode || 'travel'
            }));
            
            // Load local storage for offline/unsaved conversations
            const stored = localStorage.getItem(listKey);
            const localConvs = stored ? JSON.parse(stored) : [];
            
            // Merge, preferring backend but keeping local-only conversations
            const merged = mergeConversations(localConvs, backendConvs);
            setConversations(merged);
            
            // Update localStorage with merged data
            localStorage.setItem(listKey, JSON.stringify(merged));
            console.log('✅ Loaded', backendConvs.length, 'from backend,', merged.length, 'total');
          } else {
            // Backend has no conversations, check localStorage
            console.log('⚠️ Backend has no conversations');
            const stored = localStorage.getItem(listKey);
            if (stored) {
              const list = JSON.parse(stored);
              setConversations(list);
              console.log('📦 Using', list.length, 'cached conversations');
            }
          }
        } else {
          // Backend error, fall back to localStorage
          console.log('❌ Backend error:', response.status);
          const stored = localStorage.getItem(listKey);
          if (stored) {
            const list = JSON.parse(stored);
            setConversations(list);
            console.log('📦 Using cached conversations (backend error)');
          }
        }
      } catch (error) {
        // Network error, use localStorage
        console.log('🌐 Network error, using cached conversations:', error);
        const stored = localStorage.getItem(listKey);
        if (stored) {
          const list = JSON.parse(stored);
          setConversations(list);
        }
      }
    } finally {
      setIsLoadingHistory(false);
    }
  }, [userId]);

  /**
   * Switch to a different conversation
   */
  const switchConversation = useCallback((id: string) => {
    const conversation = conversations.find(c => c.id === id);
    if (conversation) {
      setConversationId(id);
      localStorage.setItem(storageKey, JSON.stringify(conversation));
      console.log('🔄 Switched to conversation:', id);
      return true;
    }
    return false;
  }, [conversations, storageKey]);

  /**
   * Update conversation metadata
   */
  const updateConversation = useCallback((updates: Partial<ConversationMetadata>) => {
    // Allow updating even without conversationId (for new conversations)
    const targetId = updates.id || conversationId;
    if (!targetId) return;
    
    const listKey = `tala_conversations_${userId}`;
    const list = JSON.parse(localStorage.getItem(listKey) || '[]');
    const index = list.findIndex((c: ConversationMetadata) => c.id === targetId);
    
    if (index !== -1) {
      // Update existing
      list[index] = {
        ...list[index],
        ...updates,
        updatedAt: new Date()
      };
    } else {
      // Add new conversation
      const newConv = {
        id: targetId,
        title: 'New Conversation',
        createdAt: new Date(),
        updatedAt: new Date(),
        messageCount: 0,
        ...updates
      };
      list.unshift(newConv);
    }
    
    // Update state and storage
    const sortedList = list.sort((a: ConversationMetadata, b: ConversationMetadata) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    
    localStorage.setItem(listKey, JSON.stringify(sortedList.slice(0, 50)));
    
    // Update current conversation if it's the one being updated
    if (targetId === conversationId) {
      const updated = sortedList.find((c: ConversationMetadata) => c.id === targetId);
      if (updated) {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      }
    }
    
    setConversations(sortedList);
  }, [conversationId, userId, storageKey]);

  /**
   * Clear current conversation (start fresh)
   */
  const clearConversation = useCallback(() => {
    localStorage.removeItem(storageKey);
    setConversationId(null);
    return null;
  }, [storageKey]);

  /**
   * Delete a conversation
   */
  const deleteConversation = useCallback((id: string) => {
    const listKey = `tala_conversations_${userId}`;
    const list = JSON.parse(localStorage.getItem(listKey) || '[]');
    const filtered = list.filter((c: ConversationMetadata) => c.id !== id);
    
    localStorage.setItem(listKey, JSON.stringify(filtered));
    setConversations(filtered);
    
    // If deleting current conversation, create new one
    if (id === conversationId) {
      clearConversation();
    }
    
    console.log('🗑️ Deleted conversation:', id);
  }, [userId, conversationId, clearConversation]);

  /**
   * Merge local and remote conversations
   */
  const mergeConversations = (
    local: ConversationMetadata[], 
    remote: ConversationMetadata[]
  ): ConversationMetadata[] => {
    const map = new Map<string, ConversationMetadata>();
    
    // Add remote first (preferred)
    remote.forEach(conv => map.set(conv.id, conv));
    
    // Add local if not present
    local.forEach(conv => {
      if (!map.has(conv.id)) {
        map.set(conv.id, conv);
      }
    });
    
    // Sort by updated date
    return Array.from(map.values()).sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  };

  /**
   * Get conversation by ID
   */
  const getConversation = useCallback((id: string): ConversationMetadata | undefined => {
    return conversations.find(c => c.id === id);
  }, [conversations]);

  return {
    // Current conversation
    conversationId,
    setConversationId,
    
    // Conversation list
    conversations,
    isLoadingHistory,
    
    // Actions
    createNewConversation,
    switchConversation,
    updateConversation,
    clearConversation,
    deleteConversation,
    getConversation,
    loadConversationList,
    
    // Utilities
    hasConversation: !!conversationId,
    conversationCount: conversations.length
  };
}

export default useConversation;