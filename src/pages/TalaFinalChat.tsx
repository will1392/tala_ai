import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Send, 
  Paperclip,
  Plus,
  ChevronDown,
  Menu,
  X,
  ArrowUp,
  Sparkles,
  Mic,
  MicOff,
  Plane,
  WifiOff,
  Wifi,
  Clock,
  RefreshCw,
  History,
  FileText,
  Search,
  ExternalLink,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { cn } from '../utils/cn';
import useConversation from '../hooks/useConversation';
import useRetryableRequest from '../hooks/useRetryableRequest';
import { marketingContext } from '../services/MarketingContextService';
import Markdown from '../components/shared/Markdown';
import { ProcessingStatus } from '../components/chat/ProcessingStatus';
import Skeleton from '../components/shared/Skeleton';
import TypingDots from '../components/shared/TypingDots';
import Drawer from '../components/shared/Drawer';
import { useToast } from '../components/toast/ToastProvider';
import { normalizeError } from '../lib/errors';
import { useIsMobile } from '../hooks/useBreakpoint';
import { useTour } from '../components/tour/TourProvider';
import { DEFAULT_TOUR_STEPS, MOBILE_TOUR_STEPS } from '../tour/steps';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Textarea';
import { Modal } from '../components/ui/Modal';
import { announceChatStatus } from '../utils/announceToScreenReader';
import { buildApiUrl } from '../utils/api';
import type { Doc } from '../types/knowledge';

type MarketingMode = 
  | 'general' 
  | 'seo' 
  | 'email' 
  | 'social' 
  | 'ads' 
  | 'content' 
  | 'analytics';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  mode?: 'travel' | 'marketing';
  marketingMode?: MarketingMode;
  sources?: Array<{
    title: string;
    type: string;
    score: number;
    documentId?: string;
    fileUrl?: string;
    mediaType?: string;
    audioDuration?: number;
    audioConfidence?: number;
  }>;
  failed?: boolean;
  retrying?: boolean;
}

const marketingModes = [
  { id: 'general' as MarketingMode, label: 'Marketing Assistant' },
  { id: 'seo' as MarketingMode, label: 'SEO Specialist' },
  { id: 'email' as MarketingMode, label: 'Email Marketing' },
  { id: 'social' as MarketingMode, label: 'Social Media' },
  { id: 'ads' as MarketingMode, label: 'Paid Advertising' },
  { id: 'content' as MarketingMode, label: 'Content Strategy' },
  { id: 'analytics' as MarketingMode, label: 'Analytics' }
];


export const TalaFinalChat: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false); // For showing typing indicator
  const [loadingHistory, setLoadingHistory] = useState(false); // For loading conversation history
  const [isMarketingMode, setIsMarketingMode] = useState(false); // Travel is default
  const [currentMarketingMode, setCurrentMarketingMode] = useState<MarketingMode>('general');
  const [directMailConsultation, setDirectMailConsultation] = useState(false);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [userName, setUserName] = useState('Will'); // This would come from user profile
  const userInitial = userName.charAt(0).toUpperCase();
  const [currentRequestId, setCurrentRequestId] = useState<string | undefined>();
  const [hasLoadedInitialConversation, setHasLoadedInitialConversation] = useState(false);
  const [growthPlanContext, setGrowthPlanContext] = useState<any>(null);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false); // Safe state name
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [knowledgeBaseResults, setKnowledgeBaseResults] = useState<Doc[]>([]);
  const [selectedKnowledgeDoc, setSelectedKnowledgeDoc] = useState<Doc | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLElement>(null);
  const loadedConversationsRef = useRef<Set<string>>(new Set());
  
  // Use toast hook
  const { push: pushToast } = useToast();
  
  // Check if mobile
  const isMobile = useIsMobile();

  const formatFileSize = (bytes: number | undefined) => {
    if (!bytes || Number.isNaN(bytes)) return 'Unknown size';
    const kb = bytes / 1024;
    if (kb < 1024) {
      return `${Math.round(kb)} KB`;
    }
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const handleKnowledgeResultClick = (doc: Doc) => {
    setSelectedKnowledgeDoc(doc);
  };

  const handleOpenKnowledgeDoc = (doc: Doc) => {
    setIsHistoryPanelOpen(false);
    const enrichedDoc = doc as Doc & { documentId?: string };
    const targetId = enrichedDoc.documentId || doc.id;
    
    console.log('🔍 TalaFinalChat navigating to document:', {
      docId: doc.id,
      documentId: enrichedDoc.documentId,
      targetId,
      title: doc.title,
      folderId: doc.folderId
    });
    
    // Navigate to Knowledge page with document parameters
    const params = new URLSearchParams({
      doc: targetId,
      highlight: historySearchQuery || '' // Include search query for highlighting
    });
    
    if (doc.folderId) {
      params.append('folder', doc.folderId);
    }
    
    const url = `/knowledge?${params.toString()}`;
    console.log('🔍 TalaFinalChat navigating to:', url);
    navigate(url);
  };

  // Use tour hook
  const { start: startTour } = useTour();
  
  // Use conversation hook for persistence
  const {
    conversationId,
    setConversationId,
    createNewConversation,
    updateConversation,
    clearConversation,
    conversations,
    switchConversation,
    loadConversationList
  } = useConversation({ 
    userId: localStorage.getItem('userId') || '59b70373-ba68-4d89-8420-5c3723aef01f',
    autoLoad: false  // Don't auto-load last conversation (but still load the list)
  });
  
  // Load conversation list on component mount and check URL params
  useEffect(() => {
    loadConversationList();

    // Check URL parameters for mode
    const searchParams = new URLSearchParams(location.search);
    const mode = searchParams.get('mode');
    
    if (mode === 'direct-mail-consultation') {
      console.log('🎯 Direct Mail Consultation mode detected from URL');
      setIsMarketingMode(true);
      setCurrentMarketingMode('general');
      setDirectMailConsultation(true);
      
      // Create initial welcome message
      const welcomeMessage: Message = {
        id: `welcome-${Date.now()}`,
        content: `Welcome! I'm your direct mail campaign expert, and I'm here to help you launch a successful postcard campaign that drives real bookings for your travel agency.

I'll guide you through a comprehensive consultation to ensure we create a campaign that resonates with your ideal clients and achieves your business goals.

Let's begin with understanding your business. What type of travel experiences does your agency specialize in? (e.g., luxury cruises, adventure travel, family vacations, etc.)`,
        sender: 'assistant',
        timestamp: new Date(),
        mode: 'marketing',
        marketingMode: 'general'
      };
      
      setMessages([welcomeMessage]);
      
      // Create new conversation for direct mail consultation
      const newConvId = createNewConversation('Direct Mail Campaign Consultation');
      setConversationId(newConvId);
    }
  }, [location.search]); // Re-run when URL changes

  // Restore previous conversation when page reloads
  useEffect(() => {
    if (hasLoadedInitialConversation) return;
    if (location.state) return; // Let navigation-based context load instead

    const storedConversation = localStorage.getItem('tala_current_conversation');

    if (!storedConversation) {
      setHasLoadedInitialConversation(true);
      return;
    }

    try {
      const parsed = JSON.parse(storedConversation);

      if (parsed?.id) {
        setConversationId(parsed.id);

        const isMarketing = parsed.mode === 'marketing' || parsed.mode === 'cmo';
        setIsMarketingMode(isMarketing);

        const cachedMessagesRaw = localStorage.getItem(`tala_messages_${parsed.id}`);

        if (cachedMessagesRaw) {
          const cachedMessages: Message[] = JSON.parse(cachedMessagesRaw);
          setMessages(cachedMessages);

          const hasMarketingMessages = cachedMessages.some((msg) =>
            msg.mode === 'marketing' || msg.mode === 'cmo' || msg.marketingMode
          );

          if (hasMarketingMessages) {
            setIsMarketingMode(true);
            const marketingMsg = cachedMessages.find((msg) => msg.marketingMode);
            if (marketingMsg?.marketingMode) {
              setCurrentMarketingMode(marketingMsg.marketingMode);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to restore conversation from localStorage:', error);
    } finally {
      setHasLoadedInitialConversation(true);
    }
  }, [
    hasLoadedInitialConversation,
    location.state,
    setConversationId,
    setHasLoadedInitialConversation
  ]);

  useEffect(() => {
    if (isHistoryOpen) {
      loadConversationList();
    }
  }, [isHistoryOpen, loadConversationList]);

  // Search knowledge base when the history search query changes
  useEffect(() => {
    if (!historySearchQuery.trim()) {
      setKnowledgeBaseResults([]);
      setSelectedKnowledgeDoc(null);
      setIsSearching(false);
      return;
    }

    let isCancelled = false;
    setIsSearching(true);

    const timeoutId = window.setTimeout(async () => {
      try {
        const userId = localStorage.getItem('userId') || 'test_user_123';
        const userRole = localStorage.getItem('userRole');
        const authToken = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');

        const response = await fetch(buildApiUrl('documents/search'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authToken ? `Bearer ${authToken}` : '',
            'x-user-id': userId,
            'x-organization-id': '00000000-0000-0000-0000-000000000001'
          },
          body: JSON.stringify({
            query: historySearchQuery.trim(),
            userId: userId,
            isAdmin: userRole === 'admin',
            limit: 8,
            scoreThreshold: 0.2
          })
        });

        if (isCancelled) {
          return;
        }

        if (!response.ok) {
          console.error('Search failed:', response.statusText);
          setKnowledgeBaseResults([]);
          return;
        }

        const data = await response.json();
        console.log('🔍 TalaFinalChat knowledge search response:', data);
        
        const results: Doc[] = (data.results || []).map((doc: any) => {
          // Ensure we use the correct document ID from the database
          const documentId = doc.documentId || doc.id;
          console.log('🔍 TalaFinalChat mapping document:', { 
            originalId: doc.id, 
            originalDocumentId: doc.documentId, 
            finalDocumentId: documentId,
            title: doc.documentTitle || doc.title 
          });
          
          return {
            id: documentId, // Use the same ID as documentId for consistency
            documentId: documentId, // This should be the UUID from the database
            title: doc.documentTitle || doc.title || 'Untitled',
            folderId: doc.folderId || 'uncategorized',
            type: doc.fileType || 'Document',
            updated: 'Recently updated',
            content: doc.contentPreview || doc.excerpt || '',
            metadata: {
              fileSize: doc.fileSize,
              excerpt: doc.contentPreview || doc.excerpt || '',
              fileUrl: doc.fileUrl
            }
          };
        });

        setKnowledgeBaseResults(results);
        setSelectedKnowledgeDoc((current) => {
          if (!current) {
            return null;
          }

          const stillPresent = results.find((doc) => doc.id === current.id);
          return stillPresent || null;
        });
      } catch (error) {
        console.error('Knowledge search error:', error);
        if (!isCancelled) {
          setKnowledgeBaseResults([]);
        }
      } finally {
        if (!isCancelled) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [historySearchQuery]);

  // Handle incoming conversation from growth plan help
  useEffect(() => {
    if (!hasLoadedInitialConversation && location.state) {
      setHasLoadedInitialConversation(true);
      
      const { continueConversation, initialContext } = location.state as any;
      
      if (continueConversation && initialContext) {
        console.log('📥 Loading conversation from growth plan:', continueConversation);
        
        // IMPORTANT: Mark this conversation as already loaded to prevent reload
        loadedConversationsRef.current.add(continueConversation);
        
        // Switch to marketing mode
        setIsMarketingMode(true);
        setCurrentMarketingMode('general');
        
        // Store the growth plan context for future messages
        if (initialContext.step) {
          setGrowthPlanContext(initialContext.step);
        }
        
        // Check if we have the conversation in marketing context
        const storedConversation = marketingContext.getConversation(continueConversation);
        
        if (storedConversation || initialContext.messages) {
          const messagesToLoad = storedConversation?.messages || initialContext.messages || [];
          
          // Convert the messages to the format expected by the chat
          const formattedMessages: Message[] = messagesToLoad.map((msg: any, index: number) => ({
            id: `imported-${index}-${Date.now()}`,
            content: msg.content,
            sender: msg.role === 'assistant' ? 'assistant' : 'user',
            timestamp: new Date(),
            mode: 'marketing',
            marketingMode: 'general'
          }));
          
          // Add a continuation message if we have context about the step
          if (initialContext.step) {
            const continuationMessage: Message = {
              id: `system-${Date.now()}`,
              content: `Continuing our conversation about: "${initialContext.step.label}". Feel free to ask me anything else about this marketing task or any other marketing questions!`,
              sender: 'assistant',
              timestamp: new Date(),
              mode: 'marketing',
              marketingMode: 'general'
            };
            
            formattedMessages.push(continuationMessage);
          }
          
          // Set messages first
          setMessages(formattedMessages);
          
          // Save to localStorage immediately so it persists
          const storageKey = `tala_messages_${continueConversation}`;
          localStorage.setItem(storageKey, JSON.stringify(formattedMessages));
          console.log('💾 Saved imported messages to localStorage');
          
          // Then set the conversation ID (this might trigger loadConversationMessages but it's already marked as loaded)
          if (continueConversation) {
            setConversationId(continueConversation);
          }
          
          // Clear the active conversation from marketing context after loading
          marketingContext.clearConversation(continueConversation);
        }
      }
    }
  }, [location.state, hasLoadedInitialConversation]);
  
  // Debug logging
  useEffect(() => {
    console.log('Current conversationId:', conversationId);
    console.log('Conversations list:', conversations);
  }, [conversationId, conversations]);
  
  // Load messages when conversation changes
  const loadConversationMessages = async (convId: string) => {
    if (!convId) {
      setMessages([]);
      return;
    }
    
    try {
      setLoadingHistory(true);
      console.log('🔄 Loading messages for conversation:', convId);
      
      // Always try backend first - this is our source of truth
      const response = await fetch(buildApiUrl(`conversations/${convId}/messages`), {
        headers: {
          'x-user-id': 'admin-1'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Backend messages response:', data);
        
        if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
          // Convert backend messages to our Message format
          // Handle both ThreadingService and ConversationService formats
          const formattedMessages = data.messages.map((msg: any) => ({
            id: msg.id || msg.index?.toString() || Date.now().toString(),
            content: msg.content || msg.message || '',
            sender: msg.sender || (msg.role === 'assistant' ? 'assistant' : 'user'),
            timestamp: new Date(msg.timestamp || msg.created_at || msg.createdAt),
            mode: msg.metadata?.mode || msg.mode || 'travel',
            marketingMode: msg.metadata?.marketingMode || msg.marketingMode,
            sources: msg.metadata?.sources || msg.sources || []
          }));
          setMessages(formattedMessages);
          console.log(`✅ Loaded ${formattedMessages.length} messages from backend`);
          
          // CRITICAL: Update mode based on loaded messages
          // Check if any messages indicate marketing mode
          const hasMarketingMessages = formattedMessages.some((msg: Message) => 
            msg.mode === 'marketing' || msg.mode === 'cmo' || msg.marketingMode
          );
          
          if (hasMarketingMessages) {
            console.log('🎯 Marketing mode detected in loaded conversation');
            setIsMarketingMode(true);
            // Set the marketing sub-mode if available
            const marketingMsg = formattedMessages.find((msg: Message) => msg.marketingMode);
            if (marketingMsg?.marketingMode) {
              setCurrentMarketingMode(marketingMsg.marketingMode);
            }
          }
          
          // Cache in localStorage for offline access
          const storageKey = `tala_messages_${convId}`;
          localStorage.setItem(storageKey, JSON.stringify(formattedMessages));
        } else {
          console.log('⚠️ No messages found in backend for:', convId);
          
          // Fallback to localStorage cache if backend has no messages
          const storageKey = `tala_messages_${convId}`;
          const cached = localStorage.getItem(storageKey);
          if (cached) {
            const cachedMessages = JSON.parse(cached);
            setMessages(cachedMessages);
            console.log('📦 Loaded from cache:', cachedMessages.length, 'messages');
            
            // Update mode based on cached messages
            const hasMarketingMessages = cachedMessages.some((msg: Message) => 
              msg.mode === 'marketing' || msg.mode === 'cmo' || msg.marketingMode
            );
            
            if (hasMarketingMessages) {
              console.log('🎯 Marketing mode detected in cached conversation');
              setIsMarketingMode(true);
              const marketingMsg = cachedMessages.find((msg: Message) => msg.marketingMode);
              if (marketingMsg?.marketingMode) {
                setCurrentMarketingMode(marketingMsg.marketingMode);
              }
            }
          } else {
            setMessages([]);
          }
        }
      } else {
        console.log('❌ Backend request failed:', response.status);
        
        // Fallback to localStorage cache
        const storageKey = `tala_messages_${convId}`;
        const cached = localStorage.getItem(storageKey);
        if (cached) {
          const cachedMessages = JSON.parse(cached);
          setMessages(cachedMessages);
          console.log('📦 Using cached messages (backend unavailable)');
          
          // Update mode based on cached messages
          const hasMarketingMessages = cachedMessages.some((msg: Message) => 
            msg.mode === 'marketing' || msg.mode === 'cmo' || msg.marketingMode
          );
          
          if (hasMarketingMessages) {
            console.log('🎯 Marketing mode detected in cached conversation');
            setIsMarketingMode(true);
            const marketingMsg = cachedMessages.find((msg: Message) => msg.marketingMode);
            if (marketingMsg?.marketingMode) {
              setCurrentMarketingMode(marketingMsg.marketingMode);
            }
          }
        } else {
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('❌ Error loading messages:', error);
      
      // Last resort: try localStorage
      const storageKey = `tala_messages_${convId}`;
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        const cachedMessages = JSON.parse(cached);
        setMessages(cachedMessages);
        console.log('📦 Using cached messages (error fallback)');
        
        // Update mode based on cached messages
        const hasMarketingMessages = cachedMessages.some((msg: Message) => 
          msg.mode === 'marketing' || msg.mode === 'cmo' || msg.marketingMode
        );
        
        if (hasMarketingMessages) {
          console.log('🎯 Marketing mode detected in cached conversation');
          setIsMarketingMode(true);
          const marketingMsg = cachedMessages.find((msg: Message) => msg.marketingMode);
          if (marketingMsg?.marketingMode) {
            setCurrentMarketingMode(marketingMsg.marketingMode);
          }
        }
      } else {
        setMessages([]);
      }
    } finally {
      setLoadingHistory(false);
    }
  };
  
  // Use retryable request hook for error recovery
  const {
    executeWithRetry,
    isOnline,
    connectionStatus,
    requestQueue,
    clearQueue,
    isRetrying
  } = useRetryableRequest({
    maxRetries: 3,
    initialDelay: 1000,
    onRetry: (attempt) => {
      console.log(`Retry attempt ${attempt}`);
    }
  });

  // Get current mode display
  const currentModeDisplay = marketingModes.find(m => m.id === currentMarketingMode);
  
  // Load messages when conversation changes or component mounts
  useEffect(() => {
    if (conversationId && !loadedConversationsRef.current.has(conversationId)) {
      loadedConversationsRef.current.add(conversationId);
      // Only load messages if we don't already have messages in the current conversation
      // This prevents clearing messages during an active conversation when backend assigns ID
      if (messages.length === 0) {
        loadConversationMessages(conversationId);
      }
    }
  }, [conversationId, messages.length]);
  
  // Save messages on unmount or window close
  useEffect(() => {
    const saveCurrentMessages = () => {
      if (conversationId && messages.length > 0 && !conversationId.startsWith('conv-')) {
        const storageKey = `tala_messages_${conversationId}`;
        localStorage.setItem(storageKey, JSON.stringify(messages));
        console.log(`Saved ${messages.length} messages for conversation ${conversationId}`);
      }
    };
    
    // Save on window close/refresh
    window.addEventListener('beforeunload', saveCurrentMessages);
    
    // Save on component unmount
    return () => {
      saveCurrentMessages();
      window.removeEventListener('beforeunload', saveCurrentMessages);
    };
  }, [conversationId, messages]);

  // Scroll to bottom for all new messages
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowModeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    // Announce message sending
    announceChatStatus('message-sent');

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date(),
      mode: isMarketingMode ? 'marketing' : 'travel',
      marketingMode: isMarketingMode ? currentMarketingMode : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = input; // Store input before clearing
    setInput('');
    setIsLoading(true);
    setIsTyping(true); // Show typing indicator
    
    // Generate a unique request ID for status tracking
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setCurrentRequestId(requestId);

    try {
      // Don't create our own ID - let backend handle it
      console.log('Sending message with conversationId:', conversationId || 'new');
      console.log('Request ID for status tracking:', requestId);
      
      // Use retryable request - backend will create/use conversation
      const data = await executeWithRetry(async () => {
        // Build request based on mode - match what works in GrowthPlanView
        let requestBody;
        
        // Build conversation history for context
        const conversationHistory = messages.map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content
        }));
        
        if (isMarketingMode) {
          // Marketing mode - use CMO mode in backend
          requestBody = {
            message: messageText, // Send the user's actual message
            conversationId: conversationId,
            conversationHistory: conversationHistory, // Include conversation history
            mode: 'cmo', // CRITICAL: Use CMO mode for marketing requests
            subMode: directMailConsultation ? 'directMail' : currentMarketingMode, // Force directMail for consultations
            searchKnowledge: true,
            preferredStyle: 'professional',
            costOptimization: false,
            fastResponse: false,
            device: 'web',
            attachments: [],
            requestId: requestId
          };
          
          // Add direct mail consultation context
          if (directMailConsultation) {
            requestBody.requestMetadata = {
              type: 'direct_mail_consultation',
              subType: 'campaign_questionnaire',
              consultationType: 'new_campaign',
              userId: localStorage.getItem('userId') || '59b70373-ba68-4d89-8420-5c3723aef01f',
              brandId: 'test-brand-1'
            };
          }
          // If we have growth plan context, include it in the request metadata
          else if (growthPlanContext) {
            requestBody.requestMetadata = {
              type: 'marketing_help',
              subType: 'growth_plan',
              growthPlanStep: {
                label: growthPlanContext.label,
                description: growthPlanContext.description,
                outputs: growthPlanContext.outputs
              }
            };
          }
        } else {
          // Travel mode - keep as is
          requestBody = {
            message: messageText,
            mode: 'travel', // Only specify mode for travel
            conversationId: conversationId,
            conversationHistory: conversationHistory, // Include conversation history
            searchKnowledge: true,
            requestId: requestId
          };
        }
        
        const response = await fetch(buildApiUrl('chat/v2'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': '59b70373-ba68-4d89-8420-5c3723aef01f' // Your Supabase user
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(error || 'Failed to get response');
        }

        return response.json();
      });
      
      // Dispatch credit update event after successful response
      window.dispatchEvent(new Event('creditUpdate'));
      
      // Store the raw response (we'll render markdown in the component)
      console.log('📚 Response data sources:', data.sources); // Debug log
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response, // Keep raw markdown
        sender: 'assistant',
        timestamp: new Date(),
        sources: data.sources || [],
        mode: userMessage.mode, // Preserve the mode from the user message
        marketingMode: userMessage.marketingMode // Also preserve marketing sub-mode
      };
      console.log('📌 Assistant message with sources:', assistantMessage.sources); // Debug log

      // CRITICAL: Always use backend's conversation ID
      const backendConversationId = data.conversationId;
      console.log('🔑 Backend conversation ID:', backendConversationId);
      
      // If backend returned a conversation ID, use it
      if (backendConversationId) {
        // This could be a new conversation or existing one
        if (!conversationId || conversationId !== backendConversationId) {
          console.log('📝 Setting conversation ID from backend:', backendConversationId);
          setConversationId(backendConversationId);
          
          // Update conversation metadata
          const conversationMeta = {
            id: backendConversationId,
            title: messageText.substring(0, 50) + (messageText.length > 50 ? '...' : ''),
            createdAt: new Date(),
            updatedAt: new Date(),
            messageCount: messages.length + 2,
            mode: isMarketingMode ? 'marketing' : 'travel'
          };
          
          // Update conversation in hook (this will sync with backend)
          updateConversation(conversationMeta);
          
          // Refresh the conversation list to show the new conversation in sidebar
          loadConversationList();
          
          // Also update localStorage for offline access
          const listKey = `tala_conversations_admin-1`;
          const existing = JSON.parse(localStorage.getItem(listKey) || '[]');
          const existingIndex = existing.findIndex((c: any) => c.id === backendConversationId);
          
          if (existingIndex >= 0) {
            // Update existing conversation
            existing[existingIndex] = { ...existing[existingIndex], ...conversationMeta };
          } else {
            // Add new conversation
            existing.unshift(conversationMeta);
          }
          
          localStorage.setItem(listKey, JSON.stringify(existing.slice(0, 50)));
          localStorage.setItem('tala_current_conversation', JSON.stringify(conversationMeta));
        }
      }
      
      setMessages(prev => {
        const newMessages = [...prev, assistantMessage];
        
        // Cache messages immediately after update
        if (backendConversationId) {
          const storageKey = `tala_messages_${backendConversationId}`;
          localStorage.setItem(storageKey, JSON.stringify(newMessages));
          console.log('💾 Cached', newMessages.length, 'messages for', backendConversationId);
        }
        
        // Announce message received
        announceChatStatus('message-received');
        
        return newMessages;
      });

    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Remove the user message if request failed completely
      const normalizedError = normalizeError(error);
      
      if (!isOnline) {
        pushToast({
          kind: 'error',
          title: 'Connection lost',
          message: 'You are offline. Message has been queued.'
        });
      } else if (error.message.includes('aborted')) {
        pushToast({
          kind: 'warning',
          message: 'Request was cancelled'
        });
        setMessages(prev => prev.filter(m => m.id !== userMessage.id));
      } else {
        pushToast({
          kind: 'error',
          title: normalizedError.title,
          message: normalizedError.message,
          action: normalizedError.docsHref ? {
            label: 'View troubleshooting',
            onClick: () => window.open(normalizedError.docsHref, '_blank')
          } : undefined
        });
        // Keep the message but mark it as failed
        setMessages(prev => prev.map(m => 
          m.id === userMessage.id 
            ? { ...m, failed: true } as Message 
            : m
        ));
      }
    } finally {
      setIsLoading(false);
      setIsTyping(false); // Hide typing indicator
      setCurrentRequestId(undefined); // Clear request ID when done
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleVoiceRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      pushToast({
        kind: 'info',
        message: 'Voice recording started'
      });
      // Implement actual voice recording here
    } else {
      pushToast({
        kind: 'info',
        message: 'Voice recording stopped'
      });
      // Process the recording
    }
  };

  const startNewChat = () => {
    // Save current messages before clearing (only if not a frontend ID)
    if (conversationId && messages.length > 0 && !conversationId.startsWith('conv-')) {
      const storageKey = `tala_messages_${conversationId}`;
      localStorage.setItem(storageKey, JSON.stringify(messages));
      console.log('💾 Saved current conversation before starting new');
    }
    
    // Clear messages and conversation
    setMessages([]);
    clearConversation(); // This returns null, backend will create new ID
    
    // Clear growth plan context when starting new chat
    setGrowthPlanContext(null);
    
    // Announce new chat
    announceChatStatus('new-chat');
    
    console.log('🆕 Started new chat (backend will create ID on first message)');
  };
  
  // Retry a failed message
  const retryMessage = async (message: Message) => {
    if (!message.failed || message.retrying) return;
    
    // Mark as retrying
    setMessages(prev => prev.map(m => 
      m.id === message.id 
        ? { ...m, retrying: true, failed: false } 
        : m
    ));
    
    // Recreate the request
    try {
      const data = await executeWithRetry(async () => {
        const response = await fetch(buildApiUrl('chat/v2'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': '59b70373-ba68-4d89-8420-5c3723aef01f' // Your Supabase user
          },
          body: JSON.stringify({
            message: message.content,
            mode: message.mode === 'marketing' ? 'cmo' : 'travel',
            subMode: message.marketingMode,
            conversationId: conversationId || createNewConversation(),
            searchKnowledge: message.mode !== 'marketing'
          })
        });

        if (!response.ok) throw new Error('Failed to get response');
        return response.json();
      });
      
      // Dispatch credit update event after successful response
      window.dispatchEvent(new Event('creditUpdate'));
      
      // Update message as successful
      setMessages(prev => prev.map(m => 
        m.id === message.id 
          ? { ...m, retrying: false, failed: false } 
          : m
      ));
      
      // Add assistant response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response, // Keep raw markdown, renderMarkdown will handle it
        sender: 'assistant',
        timestamp: new Date(),
        sources: data.sources || [],
        mode: message.mode // Preserve the mode from the original message
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      pushToast({
        kind: 'success',
        message: 'Message sent successfully'
      });
      
    } catch (error) {
      // Mark as failed again
      setMessages(prev => prev.map(m => 
        m.id === message.id 
          ? { ...m, retrying: false, failed: true } 
          : m
      ));
      const normalizedError = normalizeError(error);
      pushToast({
        kind: 'error',
        title: 'Retry failed',
        message: normalizedError.message
      });
    }
  };

  return (
    <div className={cn(
      "flex flex-col h-[calc(100vh-4rem)] relative",
      "bg-white dark:bg-secondary-800",
      "text-gray-900 dark:text-white",
      "transition-colors duration-200",
      isMarketingMode && "border-2 border-primary/50 dark:border-white",
      "overflow-hidden" // Prevent any overflow issues
    )}>
      {/* Skip to main content link for keyboard navigation */}
      <a 
        href="#main-chat-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-primary text-white px-4 py-2 rounded-lg"
      >
        Skip to main content
      </a>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-3 md:px-6 py-3 border-b border-white/10">
          <div className="flex items-center gap-2 md:gap-3">
            <Button
              onClick={startNewChat}
              variant={isMarketingMode ? "secondary" : "ghost"}
              size="md"
              className={cn(
                "text-sm",
                isMarketingMode 
                  ? "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20" 
                  : "text-primary hover:bg-primary/10"
              )}
              data-tour="new-chat"
              aria-label="Start new chat conversation"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">New chat</span>
            </Button>
          </div>
          
          {/* Connection Status Indicator and Theme Toggle */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Growth Plan Context Indicator */}
            {growthPlanContext && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-sm">
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Context: {growthPlanContext.label}</span>
                <span className="sm:hidden">Marketing</span>
                <button
                  onClick={() => {
                    setGrowthPlanContext(null);
                    pushToast({
                      kind: 'info',
                      message: 'Growth plan context cleared'
                    });
                  }}
                  className="ml-1 hover:text-purple-300"
                  aria-label="Clear growth plan context"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            
            {/* Help Button */}
            <Button
              onClick={() => startTour(isMobile ? MOBILE_TOUR_STEPS : DEFAULT_TOUR_STEPS)}
              variant="secondary"
              size="md"
              className="text-sm"
              aria-label="Show quick tour and help information"
            >
              <span className="hidden sm:inline">Help</span>
              <span className="sm:hidden" aria-hidden="true">?</span>
            </Button>
            
            {/* History & Search Button */}
            <Button
              onClick={() => {
                setIsHistoryPanelOpen(true);
                loadConversationList(); // Ensure conversations are loaded
              }}
              variant="ghost"
              size="icon"
              className="relative hover:bg-primary/10"
              aria-label="View chat history and search"
              data-tour="chat-history"
            >
              <div className="relative w-6 h-6">
                <Menu className="w-6 h-6 text-primary" aria-hidden="true" />
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-white dark:bg-secondary-800 rounded-full border border-primary/20 shadow-sm flex items-center justify-center">
                  <Search className="w-2.5 h-2.5 text-primary" aria-hidden="true" />
                </div>
              </div>
            </Button>
            
            {requestQueue.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm" role="status" aria-live="polite">
                <Clock className="w-4 h-4" aria-hidden="true" />
                <span>{requestQueue.length} messages queued</span>
                <Button
                  onClick={clearQueue}
                  variant="ghost"
                  size="sm"
                  className="ml-1 p-1 min-h-0 min-w-0 hover:text-yellow-300"
                  aria-label="Clear message queue"
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </Button>
              </div>
            )}
            
            {isRetrying && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-sm animate-pulse" role="status" aria-live="assertive">
                <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Retrying message...</span>
              </div>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <main 
          id="main-chat-content" 
          ref={mainContentRef}
          className="flex-1 overflow-y-auto min-h-0" 
          role="main" 
          aria-label="Chat messages" 
          tabIndex={-1}
        >
        <div className="max-w-[48rem] mx-auto">
          <div className="py-8 px-6">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center max-w-3xl">
                  {/* Tala Icon with Primary Teal Color */}
                  <div className="mb-8 flex justify-center">
                    <img 
                      src="/assets/tala-emblem.png"
                      alt="Tala AI"
                      className="h-16 w-16 object-contain"
                    />
                  </div>
                  
                  {/* Large Welcome Text */}
                  <h1 className="text-4xl font-semibold mb-3 text-gray-900 dark:text-white">
                    {isMarketingMode 
                      ? `How can I help with marketing today, ${userName}?`
                      : `Hey, ${userName}!`
                    }
                  </h1>
                  
                  {/* Subtitle */}
                  <p className="text-gray-600 dark:text-white/60 text-base">
                    {isMarketingMode 
                      ? 'I can help with SEO, email campaigns, social media, and more'
                      : "I'm TALA, the Travel Agent Learning Assistant. In Travel Mode, I can help you with all things travel. Ask me a question and I'll help."
                    }
                  </p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={cn(
                    "group",
                    message.sender === 'user' && "bg-white/5",
                    index > 0 && "border-t border-white/10"
                  )}
                >
                  <div className="max-w-[48rem] mx-auto py-6 px-4">
                    <div className="flex gap-6">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {message.sender === 'user' ? (
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium",
                            message.mode === 'marketing'
                              ? "bg-gray-200 dark:bg-white/20 text-gray-900 dark:text-white"
                              : "bg-primary/20 text-primary"
                          )}>
                            {userInitial}
                          </div>
                        ) : (
                          <img 
                            src="/assets/tala-emblem.svg"
                            alt="Tala AI"
                            className="h-8 w-8 object-contain"
                            onError={(e) => {
                              e.currentTarget.src = '/assets/tala-emblem.png';
                            }}
                          />
                        )}
                      </div>
                      
                      {/* Message Content */}
                      <div className="flex-1 overflow-hidden">
                        <div className="max-w-none">
                          {/* Failed/Retrying Status */}
                          {message.failed && (
                            <div className="flex items-center gap-2 mb-2 text-red-400 text-sm">
                              <WifiOff className="w-4 h-4" />
                              <span>Failed to send</span>
                              <Button
                                onClick={() => retryMessage(message)}
                                variant="ghost"
                                size="sm"
                                className="ml-2 px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-xs min-h-0"
                              >
                                <RefreshCw className="w-3 h-3" />
                                Retry
                              </Button>
                            </div>
                          )}
                          {message.retrying && (
                            <div className="flex items-center gap-2 mb-2 text-blue-400 text-sm animate-pulse">
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Retrying...</span>
                            </div>
                          )}
                          {message.sender === 'assistant' ? (
                            <div className={cn(
                              "text-gray-900 dark:text-white/90",
                              message.failed && "opacity-50"
                            )}>
                              <Markdown content={message.content} />
                            </div>
                          ) : (
                            <div className={cn(
                              "text-gray-900 dark:text-white/90 whitespace-pre-wrap leading-relaxed",
                              message.failed && "opacity-50"
                            )}>
                              {message.content}
                            </div>
                          )}
                          
                          {/* Sources */}
                          {console.log(`Message ${message.id} sources:`, message.sources)}
                          {message.sources && message.sources.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-white/10">
                              <div className="text-xs text-gray-600 dark:text-white/60 mb-2">Sources:</div>
                              <div className="flex flex-wrap gap-2">
                                {message.sources.map((source, idx) => (
                                  <div 
                                    key={idx}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 dark:bg-white/5 text-xs text-gray-800 dark:text-white/80"
                                  >
                                    <span className={cn(
                                      "w-1.5 h-1.5 rounded-full",
                                      message.mode === 'marketing' ? "bg-white" : "bg-primary"
                                    )} />
                                    <span>{source.title}</span>
                                    <span className="text-gray-500 dark:text-white/40">({Math.round(source.score * 100)}%)</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Processing Status Indicator */}
              <ProcessingStatus
                requestId={currentRequestId}
                isProcessing={isLoading}
              />
              
              {/* Show typing indicator when assistant is responding */}
              {isTyping && (
                <div className="border-t border-white/10">
                  <div className="max-w-[48rem] mx-auto py-6 px-4">
                    <div className="flex gap-6">
                      <div className="flex-shrink-0">
                        <img 
                          src="/assets/tala-emblem.png"
                          alt="Tala AI"
                          className="h-8 w-8 object-contain rounded-lg"
                        />
                      </div>
                      <div className="flex-1">
                        <TypingDots />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>
      </main>

      {/* Input Area - Fixed at bottom */}
      <div className={cn(
        "flex-shrink-0", // Prevent input from shrinking
        "backdrop-blur-sm",
        "border-t border-gray-200 dark:border-white/10",
        "bg-white/80 dark:bg-secondary-700",
        "pb-[var(--safe-bottom)]" // iOS safe area
      )}>
        <div className="px-3 sm:px-6 md:px-12 lg:px-20 py-4 md:py-6">
          <div className="relative">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={isMarketingMode 
                ? "Ask about marketing..."
                : "Where would you like to travel?"
              }
              aria-label={isMarketingMode ? "Marketing question input" : "Travel question input"}
              className={cn(
                "rounded-2xl md:rounded-[3rem]",
                "pl-4 md:pl-8 pr-16 md:pr-52 py-3 md:py-5",
                "bg-gray-100 dark:bg-white/5",
                "h-[100px] md:h-[140px]",
                "text-sm md:text-base leading-relaxed",
                "resize-none"
              )}
              rows={4}
              data-tour="chat-input"
            />
            
            {/* Controls positioned inside the input with more spacing */}
            <div className="absolute right-2 md:right-6 bottom-2 md:bottom-5 flex items-center gap-1 md:gap-3">
              {/* Attachment - Hidden on mobile */}
              <Button 
                variant="ghost" 
                size="sm"
                className="hidden md:flex p-2.5 min-w-[44px] min-h-[44px] text-gray-600 dark:text-white/60"
              >
                <Paperclip className="w-4 h-4" />
              </Button>

              {/* Voice Input - Hidden on mobile */}
              <Button
                onClick={toggleVoiceRecording}
                variant="ghost"
                size="sm"
                data-tour="voice-input"
                className={cn(
                  "hidden md:flex p-2.5 min-w-[44px] min-h-[44px]",
                  isRecording 
                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" 
                    : "text-gray-600 dark:text-white/60"
                )}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>

              {/* Mode Toggle - Fixed width to prevent movement */}
              <div className="ml-1 md:ml-2" data-tour="mode-selector">
                <Button
                  onClick={() => setIsMarketingMode(!isMarketingMode)}
                  variant={isMarketingMode ? "secondary" : "primary"}
                  size="sm"
                  className={cn(
                    "text-xs md:text-sm font-medium w-[80px] md:w-[110px]",
                    isMarketingMode && "bg-white text-gray-900 hover:bg-gray-100"
                  )}
                >
                  {isMarketingMode ? (
                    <>
                      <Sparkles className="w-3 md:w-4 h-3 md:h-4" />
                      <span className="hidden sm:inline">Marketing</span>
                      <span className="sm:hidden">Mkt</span>
                    </>
                  ) : (
                    <>
                      <Plane className="w-3 md:w-4 h-3 md:h-4" />
                      <span className="hidden sm:inline">Travel</span>
                      <span className="sm:hidden">Trvl</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Marketing Mode Selector - Hidden on mobile */}
              <div className="hidden md:block relative w-[140px]" ref={dropdownRef}>
                {isMarketingMode ? (
                  <>
                    <Button
                      onClick={() => setShowModeDropdown(!showModeDropdown)}
                      variant="ghost"
                      size="sm"
                      className="px-2.5 py-2 text-sm text-white/80 hover:bg-white/10"
                    >
                      <span className="text-xs">{currentModeDisplay?.label}</span>
                      <ChevronDown className={cn(
                        "w-3 h-3 transition-transform",
                        showModeDropdown && "rotate-180"
                      )} />
                    </Button>

                    {/* Dropdown */}
                    <AnimatePresence>
                      {showModeDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-full right-0 mb-2 w-48 bg-secondary-800 rounded-xl shadow-xl border border-white/10 py-1 overflow-hidden"
                        >
                          {marketingModes.map((mode) => (
                            <Button
                              key={mode.id}
                              onClick={() => {
                                setCurrentMarketingMode(mode.id);
                                setShowModeDropdown(false);
                              }}
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "w-full justify-start px-3 py-2 text-sm hover:bg-white/5",
                                currentMarketingMode === mode.id && "bg-white/10 text-primary"
                              )}
                            >
                              <span>{mode.label}</span>
                            </Button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  <div className="w-full" /> // Empty space holder
                )}
              </div>

              {/* Send Button with more spacing */}
              <div className="ml-1 md:ml-3">
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  variant="primary"
                  size="md"
                  className={cn(
                    "p-3 md:p-2.5 min-w-[44px] min-h-[44px]",
                    input.trim() && !isLoading
                      ? "shadow-glow-sm"
                      : "bg-white/5 text-white/30 opacity-50"
                  )}
                  aria-label="Send message"
                >
                  <ArrowUp className="w-5 h-5" aria-hidden="true" />
                  <span className="sr-only">Send</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Helper Text */}
          <div className="mt-2 text-center max-w-[48rem] mx-auto">
            <p className="text-xs text-white/40">
              {isMarketingMode 
                ? `${currentModeDisplay?.label} mode • Press Enter to send`
                : 'Travel mode • Press Enter to send'
              } • Tala can make mistakes
            </p>
          </div>
        </div>
        </div>
      </div>
      
      {/* History and Search Panel - Right Side */}
      <AnimatePresence>
        {isHistoryPanelOpen && (
          <motion.div
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            className={cn(
              "fixed right-0 top-0 h-screen w-80 z-40",
              "bg-white dark:bg-secondary-800 shadow-2xl",
              "border-l border-gray-200 dark:border-white/10",
              "flex flex-col"
            )}
          >
              {/* Panel Header */}
              <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-white/10">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  History & Search
                </h2>
                <Button
                  onClick={() => {
                    setIsHistoryPanelOpen(false);
                    setHistorySearchQuery(''); // Clear search when closing
                  }}
                  variant="ghost"
                  size="sm"
                  className="p-2"
                  aria-label="Close panel"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              {/* Search Input */}
              <div className="px-4 py-4">
                <div className="relative">
                  <input
                    type="text"
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    placeholder="Search conversations and knowledge base..."
                    className={cn(
                      "w-full px-4 py-2 pr-10 rounded-lg",
                      "bg-gray-100 dark:bg-white/5",
                      "border border-gray-200 dark:border-white/10",
                      "text-sm text-gray-900 dark:text-white",
                      "placeholder:text-gray-500 dark:placeholder:text-white/40",
                      "focus:outline-none focus:ring-2 focus:ring-primary/50"
                    )}
                    aria-label="Search input"
                  />
                  <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 dark:text-white/40" />
                </div>
              </div>
              
              {/* Content Area */}
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-white/80 mb-3">
                    Recent Conversations
                  </h3>
                  <div className="space-y-2">
                    {(() => {
                      const filteredConversations = conversations.filter(conv => {
                        if (!historySearchQuery) return true;
                        const searchLower = historySearchQuery.toLowerCase();
                        return (conv.title || 'Untitled').toLowerCase().includes(searchLower) ||
                               (conv.last_message || '').toLowerCase().includes(searchLower);
                      }).slice(0, 10);

                      if (conversations.length === 0) {
                        return (
                          <p className="text-sm text-gray-500 dark:text-white/40 text-center py-4">
                            No conversations yet
                          </p>
                        );
                      }

                      if (filteredConversations.length === 0 && historySearchQuery) {
                        return (
                          <p className="text-sm text-gray-500 dark:text-white/40 text-center py-4">
                            No conversations match "{historySearchQuery}"
                          </p>
                        );
                      }

                      return filteredConversations.map((conv) => (
                        <button
                          key={conv.id}
                          onClick={() => {
                            switchConversation(conv.id);
                            setIsHistoryPanelOpen(false);
                            setHistorySearchQuery(''); // Clear search after selection
                          }}
                          className={cn(
                            "w-full text-left p-3 rounded-lg transition-colors",
                            "bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10",
                            conversationId === conv.id && "bg-primary/10 dark:bg-primary/20"
                          )}
                        >
                          <div className="font-medium text-sm text-gray-900 dark:text-white">
                            {conv.title || 'Untitled Conversation'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-white/40 mt-1">
                            {new Date(conv.updatedAt).toLocaleString()}
                          </div>
                        </button>
                      ));
                    })()}
                  </div>
                </div>
                
                {/* Knowledge Base results */}
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-white/80 mb-3">
                    Knowledge Base
                  </h3>
                  {historySearchQuery ? (
                    isSearching ? (
                      <div className="flex flex-col items-center justify-center text-center py-12">
                        <Loader2 className="w-6 h-6 text-primary animate-spin mb-3" />
                        <p className="text-sm text-gray-600 dark:text-white/60">
                          Searching your knowledge for "{historySearchQuery}"…
                        </p>
                        <p className="text-xs text-gray-400 dark:text-white/30 mt-1">
                          Tala looks for uploaded documents, guides, and policies
                        </p>
                      </div>
                    ) : knowledgeBaseResults.length > 0 ? (
                      <div className="space-y-3">
                        {knowledgeBaseResults.map((doc) => {
                          const isSelected = selectedKnowledgeDoc?.id === doc.id;
                          return (
                            <div
                              key={doc.id}
                              className={cn(
                                'rounded-xl border transition-all duration-200',
                                isSelected
                                  ? 'border-primary/60 bg-primary/10 dark:bg-primary/20 shadow-lg shadow-primary/10'
                                  : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5'
                              )}
                            >
                              <button
                                type="button"
                                onClick={() => handleOpenKnowledgeDoc(doc)}
                                className={cn(
                                  'w-full px-4 py-3 flex items-start gap-3 text-left rounded-t-xl focus:outline-none',
                                  isSelected
                                    ? 'bg-primary/5 dark:bg-primary/10'
                                    : 'hover:bg-gray-100 dark:hover:bg-white/10'
                                )}
                                aria-pressed={isSelected}
                              >
                                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                  <FileText className="w-4 h-4" aria-hidden="true" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
                                      {doc.title}
                                    </h4>
                                    <span className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-white/40">
                                      {doc.type.toUpperCase()}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-xs text-gray-500 dark:text-white/50 leading-relaxed max-h-10 overflow-hidden">
                                    {doc.metadata?.excerpt || doc.content || 'No preview available'}
                                  </p>
                                </div>
                                <ChevronRight
                                  className={cn(
                                    'w-4 h-4 mt-1 text-gray-300 dark:text-white/30 transition-transform',
                                    isSelected && 'rotate-90 text-primary'
                                  )}
                                  aria-hidden="true"
                                />
                              </button>
                              {isSelected && (
                                <div className="px-4 pb-4 pt-3 border-t border-gray-200 dark:border-white/10 text-left space-y-3">
                                  <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-gray-500 dark:text-white/50">
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/15 text-primary">
                                      {doc.type}
                                    </span>
                                    <span>Updated {doc.updated}</span>
                                    {doc.metadata?.fileSize && (
                                      <span>{formatFileSize(doc.metadata.fileSize)}</span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-white/60 leading-relaxed whitespace-pre-wrap">
                                    {((doc.content || doc.metadata?.excerpt || '').split('\n').slice(0, 4).join('\n'))}
                                    {((doc.content || doc.metadata?.excerpt || '').split('\n').length > 4) && '…'}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenKnowledgeDoc(doc)}
                                    className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:text-primary/80"
                                  >
                                    <ExternalLink className="w-4 h-4" aria-hidden="true" />
                                    Open document
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-white/20" />
                        <p className="text-sm text-gray-500 dark:text-white/40">
                          No knowledge documents matched "{historySearchQuery}"
                        </p>
                        <p className="text-xs text-gray-400 dark:text-white/30 mt-1">
                          Try a different search or upload new resources in the knowledge workspace
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-white/20" />
                      <p className="text-sm text-gray-500 dark:text-white/40">
                        Search above to find documents and articles
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};