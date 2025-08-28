/**
 * Intelligent Chat Route
 * 
 * Integrates TalaIntelligence for context-aware, learning-enabled chat responses
 */

import express from 'express';
import TalaIntelligence from '../services/intelligence/TalaIntelligence.js';
import { requireAuth, authenticate } from '../middleware/auth.js';
import UserProfileService from '../services/user/UserProfileService.js';
import clientManager from '../services/ClientManager.js';
import ConversationSummarizer from '../services/ConversationSummarizer.js';
import { markdownToText } from '../utils/markdownToText.js';
import ComprehensiveSearch from '../services/search/ComprehensiveSearch.js';
import { sendStatusUpdate, sendProgressUpdate, completeStatusStream } from './chatStatus.js';
import { requireCredits } from '../middleware/creditsMiddleware.js';


// STARTUP VERIFICATION - Added 2025-08-06T02:41:31.289Z
console.log('🚀 intelligentChat.js loaded - VERSION: Simple flow for ALL travel queries');
console.log('   - Code updated to use: const isTravelInfoQuery = mode === "travel"');
console.log('   - This should fix Greece/Iceland document access');

const router = express.Router();
const userProfileService = new UserProfileService();
const conversationSummarizer = new ConversationSummarizer();

// Initialize intelligence system
const intelligenceConfig = {
  maxContextSize: 8000,
  compressionThreshold: 0.8,
  memoryRetrievalLimit: 10,
  learningEnabled: true,
  mockMode: false // Use real database for persistence
};

const intelligence = new TalaIntelligence(intelligenceConfig);

// Initialize on startup
(async () => {
  try {
    await intelligence.initialize();
    console.log('✅ Intelligent chat system ready');
  } catch (error) {
    console.error('❌ Failed to initialize intelligent chat:', error);
  }
})();

/**
 * POST /api/chat/v2
 * Enhanced chat endpoint with full intelligence integration
 */
router.post('/v2', authenticate, async (req, res) => {
  console.log('🎯 IntelligentChat /v2 endpoint hit!');
  console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    const {
      message,
      conversationId: rawConversationId,
      location,
      device,
      attachments,
      preferredStyle,
      costOptimization,
      fastResponse,
      mode,
      subMode,
      searchKnowledge,
      requestId,
      conversationHistory = [],  // Add this to receive history from frontend
      context = {} // Add context for field assistance
    } = req.body;
    
    // CRITICAL: Reject frontend-generated IDs
    let conversationId = rawConversationId;
    if (conversationId && conversationId.startsWith('conv-')) {
      console.log('⚠️ Rejecting frontend conversation ID:', conversationId);
      conversationId = null; // Force backend to create new ID
    }
    
    // DEBUG: Log mode extraction
    console.log('🔍 DEBUG - Mode extraction:');
    console.log('   - mode from body:', mode);
    console.log('   - mode type:', typeof mode);
    console.log('   - mode === "travel":', mode === 'travel');
    console.log('   - mode === "cmo":', mode === 'cmo');
    console.log('   - message:', message);
    console.log('   - message includes "tell me about":', message?.toLowerCase().includes('tell me about'));
    
    // Handle CMO/Marketing mode FIRST - before travel mode
    if (mode === 'cmo' || mode === 'marketing') {
      console.log('📊 CMO/Marketing mode detected - Processing marketing request');
      console.log('📊 Full request data:', {
        message: message?.substring(0, 100),
        mode,
        subMode,
        hasMetadata: !!req.body.requestMetadata,
        metadata: req.body.requestMetadata
      });
      
      try {
        // Check if this is a field assistance request
        const isFieldAssistance = context.task === 'field_assistance';
        if (isFieldAssistance) {
          console.log('📝 Field assistance request detected:', {
            fieldId: context.fieldId,
            fieldLabel: context.fieldLabel,
            fieldType: context.fieldType
          });
        }
        
        // Get user learning context if available
        let userLearningContext = null;
        if (intelligence.userLearningHub) {
          try {
            userLearningContext = await intelligence.userLearningHub.getEnhancedContext(req.userId);
            if (userLearningContext) {
              console.log('🧠 User learning context loaded for CMO mode');
            }
          } catch (err) {
            console.warn('⚠️ Could not load user learning context:', err.message);
          }
        }
        
        // Detect marketing context for proper subMode
        let detectedSubMode = req.body.subMode || 'general';
        
        // Check conversation history for ongoing conversations
        let isOngoingConversation = false;
        let ongoingSubMode = null;
        
        if (conversationHistory && conversationHistory.length > 0) {
          // Check recent messages for marketing context
          for (const msg of conversationHistory.slice(-4)) {
            const msgContent = msg.content?.toLowerCase() || '';
            
            // Direct mail keywords
            if (msgContent.includes('postcard') || msgContent.includes('direct mail') || 
                msgContent.includes('mailer') || msgContent.includes('river cruise') ||
                msgContent.includes('affluent households') || msgContent.includes('pieces):')) {
              isOngoingConversation = true;
              ongoingSubMode = 'directMail';
              console.log('🔍 Detected ongoing direct mail conversation from history');
              break;
            }
            
            // Could add other marketing channel detection here
            // SEO keywords
            if (msgContent.includes('seo') || msgContent.includes('search engine') || 
                msgContent.includes('keywords') || msgContent.includes('meta description')) {
              isOngoingConversation = true;
              ongoingSubMode = 'seo';
              break;
            }
          }
        }
        
        if (isOngoingConversation && ongoingSubMode) {
          detectedSubMode = ongoingSubMode;
          console.log('🔍 Using ongoing conversation subMode:', detectedSubMode);
        }
        
        // Only detect new context if not in ongoing conversation
        if (!isOngoingConversation) {
          console.log('🔍 DEBUG: Starting context detection for message:', message.substring(0, 50));
          console.log('🔍 DEBUG: intelligence object exists?', !!intelligence);
          console.log('🔍 DEBUG: intelligence.cmoAssistant exists?', !!intelligence.cmoAssistant);
          
          try {
            const contextDetector = intelligence.cmoAssistant?.contextDetector;
            console.log('🔍 DEBUG: contextDetector exists?', !!contextDetector);
            
            if (contextDetector) {
              console.log('🔍 Using ContextDetector for marketing subMode detection');
              const contextAnalysis = await contextDetector.detectMarketingContext(message);
              const topic = contextAnalysis.primaryContext;
              console.log('🔍 Detected marketing context:', { topic, confidence: contextAnalysis.confidence });
              
              if (topic && contextAnalysis.confidence > 0.3) {
                // Map detected topic to subMode
                // Direct mapping since expertiseProfiles is not available in the wrapper
                const topicToChannelMap = {
                  'directMail': 'directMail',
                  'direct_mail': 'directMail',
                  'seo': 'seo',
                  'email': 'email',
                  'social': 'social',
                  'ads': 'ads'
                };
                
                detectedSubMode = topicToChannelMap[topic] || topic || 'general';
                console.log('🔍 Mapped topic to subMode:', { topic, channel: detectedSubMode });
              } else {
                console.log('🔍 Context confidence too low or no topic detected');
              }
            } else {
              console.log('❌ ContextDetector not available in intelligence.cmoAssistant');
            }
          } catch (contextError) {
            console.warn('⚠️ Context detection failed, using default subMode:', contextError.message);
            console.warn('⚠️ Context detection error stack:', contextError.stack);
          }
        }
        
        console.log('🔍 Final subMode for CMO processing:', detectedSubMode);
        
        // For CMO mode, use the intelligence system directly without travel validation
        const intelligentResponse = await intelligence.processRequest({
          userId: req.userId,
          organizationId: req.organizationId,
          content: message,
          conversationId,
          source: 'chat',
          timestamp: new Date(),
          location,
          device,
          data: {
            mode: 'cmo',
            subMode: isFieldAssistance ? 'field_assistance' : detectedSubMode,
            attachments,
            preferences: {
              responseStyle: preferredStyle || 'professional',
              costOptimization,
              fastResponse
            },
            // Include any marketing metadata
            requestMetadata: req.body.requestMetadata,
            // Include user learning context
            userLearningContext,
            // Include conversation history
            conversationHistory,
            // Skip travel validation
            skipTaskExtraction: true,
            skipTravelValidation: true,
            // Field assistance context
            fieldContext: isFieldAssistance ? context : null
          }
        });
        
        console.log('📊 CMO Intelligence Response:', {
          hasResponse: !!intelligentResponse.response,
          responseType: typeof intelligentResponse.response,
          responseKeys: intelligentResponse.response ? Object.keys(intelligentResponse.response) : [],
          responsePreview: typeof intelligentResponse.response === 'string' 
            ? intelligentResponse.response.substring(0, 200)
            : (intelligentResponse.response?.content || intelligentResponse.response || '').toString().substring(0, 200),
          success: intelligentResponse.success,
          error: intelligentResponse.error
        });
        
        // Extract the actual response text from the nested structure
        let responseText = '';
        
        // Debug logging to understand the response structure
        console.log('📊 CMO Response Structure Debug:', {
          hasResponse: !!intelligentResponse.response,
          responseKeys: intelligentResponse.response ? Object.keys(intelligentResponse.response) : [],
          hasResult: !!intelligentResponse.response?.result,
          resultKeys: intelligentResponse.response?.result ? Object.keys(intelligentResponse.response.result) : [],
          contentType: typeof intelligentResponse.response?.content,
          contentPreview: typeof intelligentResponse.response?.content === 'string' 
            ? intelligentResponse.response.content.substring(0, 100) 
            : JSON.stringify(intelligentResponse.response?.content).substring(0, 100) || 'no content',
          fullResponse: JSON.stringify(intelligentResponse, null, 2)
        });
        
        // The response from TalaIntelligence.enhanceResponse has this structure:
        // { content: <enhanced content>, metadata: {...}, suggestions: [...] }
        // For CMO mode, the enhanced content is the text from agentResponse.result.response
        
        if (intelligentResponse.response?.content) {
          // This is the enhanced content from TalaIntelligence
          const content = intelligentResponse.response.content;
          if (typeof content === 'string') {
            responseText = content;
          } else if (content && typeof content === 'object') {
            // This shouldn't happen for CMO responses after our fix
            console.error('⚠️ Unexpected object content in CMO response:', content);
            responseText = JSON.stringify(content);
          }
        } else if (intelligentResponse.response?.result?.response) {
          // Fallback: direct access to result
          responseText = intelligentResponse.response.result.response;
        } else if (typeof intelligentResponse.response === 'string') {
          responseText = intelligentResponse.response;
        } else if (intelligentResponse.content) {
          responseText = intelligentResponse.content;
        } else {
          console.error('⚠️ Could not extract response text from:', intelligentResponse);
          responseText = 'I apologize, but I encountered an error processing your request.';
        }
        
        // Check if response is empty or echoing the user's message
        if (!responseText || (typeof responseText === 'string' && responseText.trim() === message.trim())) {
          console.error('⚠️ WARNING: Response is empty or echoing user message!');
          console.error('⚠️ User message:', message);
          console.error('⚠️ Response text:', responseText);
          console.error('⚠️ Full response structure:', JSON.stringify(intelligentResponse, null, 2));
          
          // Try to extract from deeper structures
          if (intelligentResponse.response?.result?.content) {
            responseText = intelligentResponse.response.result.content;
            console.log('🔧 Found content in result.content:', responseText.substring(0, 100));
          }
        }
        
        // Extract metadata from the nested structure
        const responseMetadata = intelligentResponse.response?.metadata || intelligentResponse.metadata || {};
        
        return res.json({
          success: true,
          response: responseText,
          mode: 'cmo',
          subMode: intelligentResponse.response?.result?.subMode || detectedSubMode,
          metadata: responseMetadata,
          conversationId: responseMetadata.threadId || conversationId,
          sources: responseMetadata.sources || [],
          confidence: intelligentResponse.response?.result?.confidence || responseMetadata.confidence
        });
      } catch (cmoError) {
        console.error('❌ CMO processing failed:', cmoError.message);
        console.error('❌ Full error:', cmoError);
        console.error('❌ Stack trace:', cmoError.stack);
        
        // Fallback to a simple response
        return res.json({
          success: true,
          response: `I'll help you with your marketing question.\n\nFor marketing strategy and implementation, I recommend focusing on your target audience, clear messaging, and measurable goals. What specific aspect of marketing would you like to explore?`,
          mode: 'cmo',
          conversationId,
          sources: []
        });
      }
    }
    
    // CRITICAL FIX: Use simple flow for ALL travel queries
    // The original simple KB access is the foundation of Tala
    // ANY query in travel mode should use the simple, proven flow
    const isTravelInfoQuery = mode === 'travel';
    
    console.log('🔍 DEBUG - Simple flow check:');
    console.log('   - isTravelInfoQuery:', isTravelInfoQuery);
    
    if (isTravelInfoQuery) {
      console.log('🌍 USING SIMPLE TRAVEL FLOW - Bypassing intelligence system');
      
      try {
        // Send status update: Initializing
        if (requestId) {
          sendStatusUpdate(requestId, 'Initializing Tala AI systems...');
          sendProgressUpdate(requestId, 'initializing', {});
        }
        
        console.log('🔍 Simple flow: Getting clients from ClientManager...');
        // Use ClientManager for efficient client reuse
        const qdrant = await clientManager.getQdrantClient();
        const openai = await clientManager.getOpenAIClient();
        const EnhancedResponseGenerator = await clientManager.getEnhancedResponseGenerator();
        console.log('✅ Simple flow: All clients ready');
        
        // Send status update: Loading context
        if (requestId) {
          sendStatusUpdate(requestId, 'Loading conversation context...');
          sendProgressUpdate(requestId, 'context', {});
        }
        
        // Get conversation history first for comprehensive search
        let conversationHistory = [];
        if (conversationId) {
          try {
            const historyResult = await intelligence.threadingService.getThreadMessages(
              conversationId,
              { limit: 10 }
            );
            conversationHistory = historyResult || [];
            console.log('📚 Retrieved', conversationHistory.length, 'messages for comprehensive search');
          } catch (error) {
            console.log('⚠️ Could not retrieve conversation history:', error.message);
          }
        }
        
        // Try comprehensive search first, fallback to simple search
        let searchResults = [];
        let searchMethod = 'comprehensive';
        
        try {
          console.log('🔍 Attempting comprehensive search for maximum coverage...');
          
          // Send status update: Searching
          if (requestId) {
            sendStatusUpdate(requestId, 'Searching travel knowledge base...');
            sendProgressUpdate(requestId, 'searching', { 
              method: 'comprehensive',
              query: message.substring(0, 50) + '...'
            });
          }
          
          const comprehensiveSearch = new ComprehensiveSearch(qdrant, openai);
          
          // Perform comprehensive search
          searchResults = await comprehensiveSearch.search(
            message,
            conversationHistory,
            {
              mode: 'travel',
              exhaustive: true
            }
          );
          
          console.log('✅ Comprehensive search complete, found', searchResults.length, 'results');
          
          // Send status update: Found results, moving to analyzing
          if (requestId) {
            sendProgressUpdate(requestId, 'search_complete', { 
              resultsFound: searchResults.length,
              topResult: searchResults[0]?.payload?.metadata?.title || 'Unknown'
            });
            // Move to analyzing stage
            setTimeout(() => {
              sendStatusUpdate(requestId, 'Analyzing search results...');
              sendProgressUpdate(requestId, 'analyzing', {
                documentsToAnalyze: searchResults.length
              });
            }, 500);
          }
        } catch (comprehensiveError) {
          console.warn('⚠️ Comprehensive search failed, falling back to simple search:', comprehensiveError.message);
          searchMethod = 'simple';
          
          // Fallback to original simple search
          console.log('🔍 Simple flow: Generating embedding for:', message);
          const embedding = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: message,
          });
          console.log('✅ Simple flow: Embedding generated');
          
          console.log('🔍 Simple flow: Searching Qdrant with optimized parameters...');
          searchResults = await qdrant.search('tala_admin_knowledge', {
            vector: embedding.data[0].embedding,
            limit: 5,
            with_payload: true,
            score_threshold: 0.4,
            params: {
              hnsw_ef: 128,
              exact: false
            }
          });
          console.log('✅ Simple flow: Search complete, found', searchResults.length, 'results');
        }
        
        console.log(`📊 Search method used: ${searchMethod}, Results: ${searchResults.length}`);
        
        if (searchResults.length > 0) {
          // Reuse conversation history from above or get it if not available
          if (conversationId) {
            try {
              // Try to get recent messages from the conversation
              const historyResult = await intelligence.threadingService.getThreadMessages(
                conversationId,
                { limit: 30 }
              );
              conversationHistory = historyResult || [];
              console.log('📚 Retrieved', conversationHistory.length, 'messages from history');
              
              // Apply pruning if needed for simple flow too
              const metrics = conversationSummarizer.getConversationMetrics(conversationHistory);
              if (metrics.needsPruning || metrics.pruningRecommended) {
                console.log('🔄 Pruning conversation for simple flow...');
                conversationHistory = await conversationSummarizer.processConversationHistory(
                  conversationHistory,
                  openai
                );
              }
            } catch (error) {
              console.log('⚠️ Could not retrieve conversation history:', error.message);
              // Continue without history
            }
          }
          
          // Use enhanced response generator
          console.log('🎯 Using Enhanced Response Generator');
          
          // Send status update: Generating response
          if (requestId) {
            sendStatusUpdate(requestId, 'Generating your personalized response...');
            sendProgressUpdate(requestId, 'generating', { 
              sourcesCount: searchResults.length,
              model: 'GPT-5 Nano'
            });
          }
          
          const responseGenerator = new EnhancedResponseGenerator();
          
          const { response, sourcesUsed, selectionMetadata } = await responseGenerator.generateResponse({
            query: message,
            searchResults,
            conversationHistory,
            openaiClient: openai
          });
          
          // Send status update: Finalizing
          if (requestId) {
            sendStatusUpdate(requestId, 'Finalizing response...');
          }
          
          // Save the conversation messages to ThreadingService
          let finalConversationId = conversationId;
          let cleanResponse = response; // Initialize cleanResponse with original response
          
          try {
            // Create thread if needed
            if (!conversationId) {
              const newThread = await intelligence.threadingService.createThread({
                userId: req.userId,
                organizationId: req.organizationId,
                title: `${message.substring(0, 50)}...`,
                metadata: {
                  mode: 'travel',
                  source: 'chat'
                }
              });
              finalConversationId = newThread.id;
              console.log('📝 Created new thread:', finalConversationId);
            } else {
              // Ensure thread exists
              try {
                await intelligence.threadingService.getThread(conversationId);
                finalConversationId = conversationId;
              } catch (err) {
                // Thread doesn't exist, create new one (don't reuse the ID)
                console.log('⚠️ Thread not found for ID:', conversationId, '- creating new thread');
                const newThread = await intelligence.threadingService.createThread({
                  // Don't pass the ID - let backend generate it
                  userId: req.userId,
                  organizationId: req.organizationId,
                  title: `${message.substring(0, 50)}...`,
                  metadata: {
                    mode: 'travel',
                    source: 'chat',
                    originalRequestId: conversationId // Store for reference but don't use as ID
                  }
                });
                finalConversationId = newThread.id;
                console.log('📝 Created new thread with backend ID:', finalConversationId);
              }
            }
            
            // Save user message
            await intelligence.threadingService.addMessage(finalConversationId, {
              role: 'user',
              content: message,
              timestamp: new Date(),
              metadata: {
                userId: req.userId,
                mode: 'travel'
              }
            });
            
            // Convert markdown to plain text before saving and sending
            cleanResponse = markdownToText(response);
            console.log('🧹 Converted markdown to plain text for storage and response');
            
            // Save assistant response (clean version)
            await intelligence.threadingService.addMessage(finalConversationId, {
              role: 'assistant',
              content: cleanResponse,
              timestamp: new Date(),
              model_used: 'gpt-5-nano-2025-08-07',
              provider: 'openai',
              metadata: {
                sourcesUsed: sourcesUsed?.length || 0,
                sources: sourcesUsed.map(source => ({
                  title: source.title,
                  type: 'document',
                  score: source.score,
                  sectionsUsed: source.sectionsUsed
                })) || [],
                mode: 'travel',
                originalFormat: 'markdown' // Track that we converted it
              }
            });
            
            console.log('💾 Saved conversation messages to ThreadingService');
          } catch (saveError) {
            console.error('⚠️ Failed to save messages to ThreadingService:', saveError.message);
            // Continue - don't fail the response just because saving failed
          }
          
          // Return in the expected format
          
          // Complete status stream
          if (requestId) {
            completeStatusStream(requestId);
          }
          
          return res.json({
            success: true,
            response: cleanResponse,
            sources: sourcesUsed.map(source => ({
              title: source.title,
              type: 'document',
              score: source.score,
              sectionsUsed: source.sectionsUsed
            })),
            conversationId: finalConversationId,
            metadata: {
              model: 'gpt-5-nano-2025-08-07',
              mode: 'travel',
              simpleFlow: true,
              enhanced: true,
              sourcesUsed: sourcesUsed,
              selectionMetadata: selectionMetadata
            }
          });
        } else {
          // No results found
          let finalConversationId = conversationId;
          const noResultsResponse = "I couldn't find specific information about that destination in my travel guides. Could you please be more specific about what you'd like to know?";
          // Clean the response before saving
          const cleanNoResultsResponse = markdownToText(noResultsResponse);
          
          // Save messages even when no results found
          try {
            // Create thread if needed
            if (!conversationId) {
              const newThread = await intelligence.threadingService.createThread({
                userId: req.userId,
                organizationId: req.organizationId,
                title: `${message.substring(0, 50)}...`,
                metadata: {
                  mode: 'travel',
                  source: 'chat'
                }
              });
              finalConversationId = newThread.id;
            } else {
              // Ensure thread exists
              try {
                await intelligence.threadingService.getThread(conversationId);
              } catch (err) {
                const newThread = await intelligence.threadingService.createThread({
                  id: conversationId,
                  userId: req.userId,
                  organizationId: req.organizationId,
                  title: `${message.substring(0, 50)}...`,
                  metadata: {
                    mode: 'travel',
                    source: 'chat'
                  }
                });
                finalConversationId = newThread.id;
              }
            }
            
            await intelligence.threadingService.addMessage(finalConversationId, {
              role: 'user',
              content: message,
              timestamp: new Date(),
              metadata: { userId: req.userId, mode: 'travel' }
            });
            
            await intelligence.threadingService.addMessage(finalConversationId, {
              role: 'assistant',
              content: cleanNoResultsResponse,
              timestamp: new Date(),
              model_used: 'gpt-5-nano-2025-08-07',
              provider: 'openai',
              metadata: { mode: 'travel', originalFormat: 'markdown' }
            });
            
            console.log('💾 Saved no-results conversation to ThreadingService');
          } catch (saveError) {
            console.error('⚠️ Failed to save no-results messages:', saveError.message);
          }
          
          return res.json({
            success: true,
            response: cleanNoResultsResponse,
            sources: [],
            conversationId: finalConversationId
          });
        }
      } catch (simpleError) {
        console.error('❌ SIMPLE FLOW FAILED:', simpleError.message);
        console.error('Full error:', simpleError);
        console.error('Stack trace:', simpleError.stack);
        
        // Return error instead of silently falling through
        return res.status(500).json({
          success: false,
          error: 'Knowledge base search failed',
          details: simpleError.message,
          metadata: {
            attemptedSimpleFlow: true,
            mode: 'travel',
            errorType: simpleError.name
          }
        });
      }
    }
    
    if (!message?.trim()) {
      return res.status(400).json({ 
        error: 'Message is required',
        code: 'MISSING_MESSAGE' 
      });
    }
    
    console.log(`🧠 Intelligent chat request from user ${req.userId}`);
    
    // Fetch user profile for personalization
    let userProfile = null;
    let userContext = '';
    try {
      userProfile = await userProfileService.getUserProfile(req.userId);
      if (userProfile) {
        // Build user context string
        const contextParts = [];
        
        // Add user name and agency
        if (userProfile.name) {
          contextParts.push(`User's name: ${userProfile.name}`);
        }
        if (userProfile.company_name) {
          contextParts.push(`Agency name: ${userProfile.company_name}`);
        }
        if (userProfile.role) {
          contextParts.push(`Role: ${userProfile.role === 'agency_owner' ? 'Agency Owner' : 'Travel Agent'}`);
        }
        
        // Add business context
        if (userProfile.monthly_marketing_budget) {
          contextParts.push(`Marketing budget: ${userProfile.monthly_marketing_budget}`);
        }
        if (userProfile.business_goals?.length > 0) {
          contextParts.push(`Business goals: ${userProfile.business_goals.join(', ')}`);
        }
        
        userContext = contextParts.length > 0 
          ? `\n\nUser Context:\n${contextParts.join('\n')}\n\nIMPORTANT: Address the user by their first name only (${userProfile.name}) when appropriate. Use a natural, conversational tone.`
          : '';
      }
    } catch (error) {
      console.warn('Failed to fetch user profile:', error);
      // Continue without user profile
    }
    
    // Get conversation history for context-aware search with intelligent pruning
    conversationHistory = []; // Reset conversation history
    if (conversationId) {
      try {
        // Fetch more messages initially to allow for summarization
        const historyResult = await intelligence.threadingService.getThreadMessages(
          conversationId,
          { limit: 30 } // Increased to allow summarization of older messages
        );
        conversationHistory = historyResult || [];
        console.log(`📚 Retrieved ${conversationHistory.length} messages from conversation history`);
        
        // Check if conversation needs pruning
        const metrics = conversationSummarizer.getConversationMetrics(conversationHistory);
        console.log('📊 Conversation metrics:', metrics);
        
        if (metrics.needsPruning || metrics.pruningRecommended) {
          console.log('🔄 Pruning conversation history to prevent token overflow...');
          const openai = await clientManager.getOpenAIClient();
          conversationHistory = await conversationSummarizer.processConversationHistory(
            conversationHistory, 
            openai
          );
          console.log(`✅ Conversation pruned to ${conversationHistory.length} messages`);
        }
      } catch (error) {
        console.warn('Failed to retrieve or prune conversation history:', error);
      }
    }
    
    // For Travel Mode, immediately search knowledge base
    let knowledgeContext = '';
    let knowledgeResults = [];
    
    console.log('🔍 Knowledge base search check:');
    console.log('   - mode:', mode, '(type:', typeof mode, ')');
    console.log('   - searchKnowledge:', searchKnowledge, '(type:', typeof searchKnowledge, ')');
    console.log('   - mode === "travel":', mode === 'travel');
    console.log('   - searchKnowledge === true:', searchKnowledge === true);
    console.log('   - condition result:', (mode === 'travel' || searchKnowledge));
    console.log('   - conversation history length:', conversationHistory.length);
    
    if (mode === 'travel' || searchKnowledge === true) {
      console.log('🔍 Travel Mode detected - searching knowledge base for:', message);
      console.log('📊 Mode:', mode, 'SearchKnowledge:', searchKnowledge);
      
      try {
        // Use ClientManager for efficient client reuse
        const qdrant = await clientManager.getQdrantClient();
        const openai = await clientManager.getOpenAIClient();
        const { ContextAwareSearch } = await clientManager.getContextAwareSearch();
        
        const contextAwareSearch = new ContextAwareSearch();
        
        // Search in both user and admin collections
        const collectionName = 'tala_admin_knowledge';
        
        // Check collection info first
        try {
          const collectionInfo = await qdrant.getCollection(collectionName);
          console.log('📊 Collection info:', {
            name: collectionName,
            exists: true,
            pointsCount: collectionInfo.points_count,
            status: collectionInfo.status
          });
        } catch (collError) {
          console.error('❌ Collection check failed:', collError.message);
        }
        
        // Perform context-aware search with optimized parameters
        const searchResults = await contextAwareSearch.performContextAwareSearch({
          qdrantClient: qdrant,
          openaiClient: openai,
          collectionName,
          currentMessage: message,
          conversationHistory: conversationHistory,
          searchOptions: {
            limit: 5,
            scoreThreshold: 0.4,  // Increased threshold for better quality results
            params: {
              hnsw_ef: 128,  // Better search accuracy
              exact: false   // Use approximate search for speed
            }
          }
        });
        
        const searchResponse = searchResults.results;
        
        // Log context used for search
        console.log('🎯 Context-aware search performed:', {
          originalQuery: message,
          enhancedQuery: searchResults.query,
          locationContext: searchResults.context?.currentFocus,
          topicsFound: searchResults.context?.topics
        });
        
        console.log('🔍 Qdrant search results:', {
          collectionName,
          resultsCount: searchResponse.length,
          results: searchResponse.map(r => ({
            score: r.score,
            title: r.payload?.metadata?.title || 'Unknown',
            hasContent: !!r.payload?.content
          }))
        });
        
        if (searchResponse.length > 0) {
          console.log(`✅ Found ${searchResponse.length} relevant documents in knowledge base`);
          
          // Format the context from search results with size limits
          const contextChunks = searchResponse.map(result => {
            // Limit content size to prevent token overflow
            const MAX_CONTENT_LENGTH = 3000; // Characters per document
            let content = result.payload.content || '';
            
            // If content is too long, take the most relevant part
            if (content.length > MAX_CONTENT_LENGTH) {
              // Try to find the most relevant section based on the query
              const queryWords = message.toLowerCase().split(' ');
              let bestStart = 0;
              let bestScore = 0;
              
              // Sliding window to find the most relevant section
              for (let i = 0; i < content.length - MAX_CONTENT_LENGTH; i += 500) {
                const section = content.substring(i, i + MAX_CONTENT_LENGTH).toLowerCase();
                let score = 0;
                queryWords.forEach(word => {
                  if (word.length > 3 && section.includes(word)) {
                    score += (section.match(new RegExp(word, 'g')) || []).length;
                  }
                });
                if (score > bestScore) {
                  bestScore = score;
                  bestStart = i;
                }
              }
              
              // Take the best section or the beginning if no matches
              content = content.substring(bestStart, bestStart + MAX_CONTENT_LENGTH);
              if (bestStart > 0) {
                content = '...' + content;
              }
              if (bestStart + MAX_CONTENT_LENGTH < result.payload.content.length) {
                content = content + '...';
              }
            }
            
            return {
              content: content,
              title: result.payload.metadata?.title || 'Unknown Document',
              score: result.score
            };
          });
          
          knowledgeResults = contextChunks;
          
          // Limit total context size and number of documents
          const MAX_DOCS = 3;
          const limitedChunks = contextChunks.slice(0, MAX_DOCS);
          
          knowledgeContext = '\n\nRelevant information from knowledge base:\n' + 
            limitedChunks.map(chunk => 
              `[${chunk.title} - Score: ${chunk.score.toFixed(2)}]\n${chunk.content}\n`
            ).join('\n---\n');
            
          console.log('📄 Knowledge context length:', knowledgeContext.length);
          console.log('📄 First 500 chars of knowledge context:', knowledgeContext.substring(0, 500));
        } else {
          console.log('⚠️ No relevant documents found in knowledge base');
        }
      } catch (searchError) {
        console.error('❌ Knowledge base search failed:', searchError);
        // Continue without knowledge base context
      }
    }
    
    // Build conversation context summary for the LLM
    let conversationContextSummary = '';
    if (conversationHistory.length > 0) {
      const contextMessages = conversationHistory.slice(-5).map(msg => {
        const role = msg.sender === 'user' ? 'User' : 'Assistant';
        return `${role}: ${msg.content}`;
      }).join('\n');
      
      conversationContextSummary = `\n\nPrevious conversation context:\n${contextMessages}\n\nCurrent message: ${message}`;
    }
    
    // Build the full content with knowledge context and conversation history
    const fullContent = conversationContextSummary || message;
    const enhancedContent = fullContent + knowledgeContext + userContext;
    
    // Get user learning context for travel mode
    let userLearningContext = null;
    if (intelligence.userLearningHub) {
      try {
        userLearningContext = await intelligence.userLearningHub.getEnhancedContext(req.userId);
        if (userLearningContext) {
          console.log('🧠 User learning context loaded for travel mode');
        }
      } catch (err) {
        console.warn('⚠️ Could not load user learning context:', err.message);
      }
    }
    
    console.log('🚀 Sending to intelligence layer:');
    console.log('  - Original message:', message);
    console.log('  - Has conversation context:', conversationHistory.length > 0);
    console.log('  - Has knowledge context:', !!knowledgeContext);
    console.log('  - Has user learning context:', !!userLearningContext);
    console.log('  - Knowledge context length:', knowledgeContext.length);
    console.log('  - Mode:', mode);
    console.log('  - Enhanced content length:', enhancedContent.length);
    console.log('  - First 1000 chars of enhanced content:', enhancedContent.substring(0, 1000));
    
    // Process request through intelligence layer with enhanced context
    const intelligentResponse = await intelligence.processRequest({
      userId: req.userId,
      organizationId: req.organizationId,
      content: enhancedContent,
      conversationId,
      source: 'chat',
      timestamp: new Date(),
      location,
      device,
      data: {
        attachments,
        preferences: {
          responseStyle: preferredStyle,
          costOptimization,
          fastResponse
        },
        userProfile: userProfile ? {
          name: userProfile.name,
          agencyName: userProfile.company_name,
          role: userProfile.role
        } : null,
        mode,
        subMode,
        hasKnowledgeContext: !!knowledgeContext,
        hasConversationContext: conversationHistory.length > 0,
        knowledgeResults,
        originalMessage: message,
        // Include user learning context
        userLearningContext
      }
    });
    
    console.log('📤 Intelligence response received:');
    console.log('  - Success:', intelligentResponse.success);
    console.log('  - Response length:', intelligentResponse.response?.content?.length);
    console.log('  - First 500 chars:', intelligentResponse.response?.content?.substring(0, 500));
    
    if (!intelligentResponse.success) {
      return res.status(500).json({
        error: intelligentResponse.error || 'Failed to process request',
        fallback: intelligentResponse.response,
        metadata: intelligentResponse.metadata
      });
    }
    
    // Prepare sources
    const sources = knowledgeResults.length > 0 ? knowledgeResults.map(result => ({
      title: result.title,
      type: 'document',
      score: result.score
    })) : [];
    
    console.log('📤 Sending response with sources:', {
      knowledgeResultsCount: knowledgeResults.length,
      sourcesCount: sources.length,
      sources: sources
    });
    
    // Send successful response with sources
    // Convert markdown to plain text
    const cleanResponse = markdownToText(intelligentResponse.response.content);
    
    res.json({
      success: true,
      response: cleanResponse,
      metadata: {
        ...intelligentResponse.metadata,
        suggestions: intelligentResponse.response.suggestions,
        responseStyle: intelligentResponse.response.metadata.style
      },
      conversationId: intelligentResponse.metadata.threadId || conversationId,
      // Include knowledge base sources if any were found
      sources: sources
    });
    
  } catch (error) {
    console.error('❌ Intelligent chat error:', error);
    res.status(500).json({
      error: 'An error occurred processing your request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/chat/feedback
 * Submit feedback for a chat interaction
 */
router.post('/feedback', authenticate, async (req, res) => {
  try {
    const {
      requestId,
      conversationId,
      rating,
      comment,
      helpful,
      accurate,
      issues
    } = req.body;
    
    if (!requestId || rating === undefined) {
      return res.status(400).json({
        error: 'Request ID and rating are required',
        code: 'MISSING_FEEDBACK_DATA'
      });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        error: 'Rating must be between 1 and 5',
        code: 'INVALID_RATING'
      });
    }
    
    console.log(`📝 Processing feedback from user ${req.userId} for request ${requestId}`);
    
    // Process feedback through intelligence system
    const feedbackResult = await intelligence.processFeedback({
      requestId,
      conversationId,
      userId: req.userId,
      rating,
      comment,
      metadata: {
        helpful,
        accurate,
        issues
      },
      timestamp: new Date()
    });
    
    res.json({
      success: true,
      message: 'Thank you for your feedback',
      result: feedbackResult
    });
    
  } catch (error) {
    console.error('❌ Feedback processing error:', error);
    res.status(500).json({
      error: 'Failed to process feedback',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/chat/suggestions
 * Get conversation suggestions based on context
 */
router.get('/suggestions', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.query;
    
    if (!conversationId) {
      return res.status(400).json({
        error: 'Conversation ID is required',
        code: 'MISSING_CONVERSATION_ID'
      });
    }
    
    // Get suggestions from the current conversation context
    const context = await intelligence.contextManager.getContext(conversationId);
    const userProfile = await intelligence.profileManager.getProfile(req.userId);
    
    // Generate contextual suggestions
    const suggestions = [];
    
    // Based on recent topics
    if (context.topics?.includes('travel')) {
      suggestions.push('Would you like me to check visa requirements?');
      suggestions.push('Should I help you create an itinerary?');
    }
    
    if (context.topics?.includes('documents')) {
      suggestions.push('Do you need help with document preparation?');
      suggestions.push('Would you like a checklist for your trip?');
    }
    
    // Based on user preferences
    if (userProfile.preferences.detailedResponses) {
      suggestions.push('Would you like more detailed information?');
    }
    
    res.json({
      success: true,
      suggestions: suggestions.slice(0, 5),
      context: {
        topics: context.topics,
        recentEntities: context.entities?.slice(0, 3)
      }
    });
    
  } catch (error) {
    console.error('❌ Suggestions error:', error);
    res.status(500).json({
      error: 'Failed to generate suggestions',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/chat/metrics
 * Get chat system metrics (admin only)
 */
router.get('/metrics', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required',
        code: 'FORBIDDEN'
      });
    }
    
    const metrics = intelligence.getMetrics();
    
    res.json({
      success: true,
      metrics: {
        performance: metrics.performanceMetrics,
        agents: metrics.agentOrchestrator,
        memory: metrics.memoryManager,
        context: metrics.contextManager,
        learning: metrics.learningEngine
      },
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('❌ Metrics error:', error);
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/chat/context/status/:conversationId
 * Get context status for a conversation
 */
router.get('/context/status/:conversationId', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    if (!conversationId) {
      return res.status(400).json({
        error: 'Conversation ID is required',
        code: 'MISSING_CONVERSATION_ID'
      });
    }
    
    // Get context status from intelligence system
    const context = await intelligence.contextManager.getContext(conversationId);
    const compressed = context?.compressionState || false;
    const size = context?.currentSize || 0;
    const maxSize = intelligenceConfig.maxContextSize || 8000;
    
    res.json({
      success: true,
      conversationId,
      status: {
        exists: !!context,
        compressed,
        size,
        maxSize,
        utilizationPercent: Math.round((size / maxSize) * 100),
        topics: context?.topics || [],
        entities: context?.entities || [],
        lastUpdated: context?.lastUpdated || null
      }
    });
    
  } catch (error) {
    console.error('❌ Context status error:', error);
    res.status(500).json({
      error: 'Failed to retrieve context status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/chat/context/reset
 * Reset conversation context
 */
router.post('/context/reset', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.body;
    
    if (!conversationId) {
      return res.status(400).json({
        error: 'Conversation ID is required',
        code: 'MISSING_CONVERSATION_ID'
      });
    }
    
    // Reset context through intelligence system
    await intelligence.contextManager.resetContext(conversationId);
    
    res.json({
      success: true,
      message: 'Conversation context has been reset',
      conversationId
    });
    
  } catch (error) {
    console.error('❌ Context reset error:', error);
    res.status(500).json({
      error: 'Failed to reset context',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/chat/test-version
 * Test endpoint to verify code version
 */
router.get('/test-version', (req, res) => {
  res.json({
    version: 'Simple flow for ALL travel queries',
    codeStatus: 'Updated - mode === travel triggers simple flow',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/chat/history
 * Get conversation history with intelligence metadata
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const { conversationId, limit = 20 } = req.query;
    
    if (!conversationId) {
      return res.status(400).json({
        error: 'Conversation ID is required',
        code: 'MISSING_CONVERSATION_ID'
      });
    }
    
    // Get thread messages
    const messages = await intelligence.threadingService.getThreadMessages(
      conversationId,
      { limit: parseInt(limit) }
    );
    
    // Get related memories
    const memories = await intelligence.memoryManager.retrieveMemories({
      userId: req.userId,
      filters: {
        metadata: { threadId: conversationId }
      },
      limit: 5
    });
    
    res.json({
      success: true,
      messages,
      memories: memories.map(m => ({
        id: m.id,
        content: m.content,
        importance: m.importance,
        timestamp: m.timestamp
      })),
      conversationId
    });
    
  } catch (error) {
    console.error('❌ History retrieval error:', error);
    res.status(500).json({
      error: 'Failed to retrieve history',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down intelligent chat system...');
  await intelligence.shutdown();
});

export default router;