/**
 * Intelligent Chat Route
 * 
 * Integrates TalaIntelligence for context-aware, learning-enabled chat responses
 */

import express from 'express';
import TalaIntelligence from '../services/intelligence/TalaIntelligence.js';
import { requireAuth, authenticate } from '../middleware/auth.js';
import UserProfileService from '../services/user/UserProfileService.js';


// STARTUP VERIFICATION - Added 2025-08-06T02:41:31.289Z
console.log('🚀 intelligentChat.js loaded - VERSION: Simple flow for ALL travel queries');
console.log('   - Code updated to use: const isTravelInfoQuery = mode === "travel"');
console.log('   - This should fix Greece/Iceland document access');

const router = express.Router();
const userProfileService = new UserProfileService();

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
      conversationId,
      location,
      device,
      attachments,
      preferredStyle,
      costOptimization,
      fastResponse,
      mode,
      subMode,
      searchKnowledge
    } = req.body;
    
    // DEBUG: Log mode extraction
    console.log('🔍 DEBUG - Mode extraction:');
    console.log('   - mode from body:', mode);
    console.log('   - mode type:', typeof mode);
    console.log('   - mode === "travel":', mode === 'travel');
    console.log('   - message:', message);
    console.log('   - message includes "tell me about":', message?.toLowerCase().includes('tell me about'));
    
    // CRITICAL FIX: Use simple flow for ALL travel queries
    // The original simple KB access is the foundation of Tala
    // ANY query in travel mode should use the simple, proven flow
    const isTravelInfoQuery = mode === 'travel';
    
    console.log('🔍 DEBUG - Simple flow check:');
    console.log('   - isTravelInfoQuery:', isTravelInfoQuery);
    
    if (isTravelInfoQuery) {
      console.log('🌍 USING SIMPLE TRAVEL FLOW - Bypassing intelligence system');
      
      try {
        console.log('🔍 Simple flow: Starting imports...');
        // Simple, direct knowledge base search like the original
        const { QdrantClient } = await import('@qdrant/qdrant-js');
        const OpenAI = await import('openai');
        const { EnhancedResponseGenerator } = await import('../services/EnhancedResponseGenerator.js');
        console.log('✅ Simple flow: Imports successful');
        
        console.log('🔍 Simple flow: Initializing Qdrant client...');
        const qdrant = new QdrantClient({
          url: process.env.QDRANT_URL,
          apiKey: process.env.QDRANT_API_KEY,
        });
        console.log('✅ Simple flow: Qdrant client initialized');
        
        console.log('🔍 Simple flow: Initializing OpenAI client...');
        const openai = new OpenAI.default({
          apiKey: process.env.OPENAI_API_KEY,
        });
        console.log('✅ Simple flow: OpenAI client initialized');
        
        // Simple embedding
        console.log('🔍 Simple flow: Generating embedding for:', message);
        const embedding = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: message,
        });
        console.log('✅ Simple flow: Embedding generated');
        
        // Simple search - get more results for better synthesis
        console.log('🔍 Simple flow: Searching Qdrant...');
        const searchResults = await qdrant.search('tala_admin_knowledge', {
          vector: embedding.data[0].embedding,
          limit: 5, // Increased from 3 to get more options
          with_payload: true
        });
        console.log('✅ Simple flow: Search complete, found', searchResults.length, 'results');
        
        if (searchResults.length > 0) {
          // Get conversation history if available
          let conversationHistory = [];
          if (conversationId) {
            try {
              // Try to get recent messages from the conversation
              const historyResult = await intelligence.threadingService.getThreadMessages(
                conversationId,
                { limit: 5 }
              );
              conversationHistory = historyResult || [];
              console.log('📚 Retrieved', conversationHistory.length, 'messages from history');
            } catch (error) {
              console.log('⚠️ Could not retrieve conversation history:', error.message);
              // Continue without history
            }
          }
          
          // Use enhanced response generator
          console.log('🎯 Using Enhanced Response Generator');
          const responseGenerator = new EnhancedResponseGenerator();
          
          const { response, sourcesUsed, selectionMetadata } = await responseGenerator.generateResponse({
            query: message,
            searchResults,
            conversationHistory,
            openaiClient: openai
          });
          
          // Save the conversation messages to ThreadingService
          let finalConversationId = conversationId;
          
          try {
            // Create thread if needed
            if (!conversationId) {
              const newThread = await intelligence.threadingService.createThread({
                userId: req.userId,
                organizationId: req.organizationId,
                title: `Travel Query: ${message.substring(0, 50)}...`,
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
              } catch (err) {
                // Thread doesn't exist, create it
                const newThread = await intelligence.threadingService.createThread({
                  id: conversationId,
                  userId: req.userId,
                  organizationId: req.organizationId,
                  title: `Travel Query: ${message.substring(0, 50)}...`,
                  metadata: {
                    mode: 'travel',
                    source: 'chat'
                  }
                });
                finalConversationId = newThread.id;
                console.log('📝 Created thread for existing ID:', finalConversationId);
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
            
            // Save assistant response
            await intelligence.threadingService.addMessage(finalConversationId, {
              role: 'assistant',
              content: response,
              timestamp: new Date(),
              model_used: 'gpt-4o-mini',
              provider: 'openai',
              metadata: {
                sourcesUsed: sourcesUsed?.length || 0,
                mode: 'travel'
              }
            });
            
            console.log('💾 Saved conversation messages to ThreadingService');
          } catch (saveError) {
            console.error('⚠️ Failed to save messages to ThreadingService:', saveError.message);
            // Continue - don't fail the response just because saving failed
          }
          
          // Return in the expected format
          return res.json({
            success: true,
            response: response,
            sources: sourcesUsed.map(source => ({
              title: source.title,
              type: 'document',
              score: source.score,
              sectionsUsed: source.sectionsUsed
            })),
            conversationId: finalConversationId,
            metadata: {
              model: 'gpt-4o-mini',
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
          
          // Save messages even when no results found
          try {
            // Create thread if needed
            if (!conversationId) {
              const newThread = await intelligence.threadingService.createThread({
                userId: req.userId,
                organizationId: req.organizationId,
                title: `Travel Query: ${message.substring(0, 50)}...`,
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
                  title: `Travel Query: ${message.substring(0, 50)}...`,
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
              content: noResultsResponse,
              timestamp: new Date(),
              model_used: 'gpt-4o-mini',
              provider: 'openai',
              metadata: { mode: 'travel' }
            });
            
            console.log('💾 Saved no-results conversation to ThreadingService');
          } catch (saveError) {
            console.error('⚠️ Failed to save no-results messages:', saveError.message);
          }
          
          return res.json({
            success: true,
            response: noResultsResponse,
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
    
    // Get conversation history for context-aware search
    let conversationHistory = [];
    if (conversationId) {
      try {
        const historyResult = await intelligence.threadingService.getThreadMessages(
          conversationId,
          { limit: 10 }
        );
        conversationHistory = historyResult || [];
        console.log(`📚 Retrieved ${conversationHistory.length} messages from conversation history`);
      } catch (error) {
        console.warn('Failed to retrieve conversation history:', error);
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
        // Import necessary modules
        const { QdrantClient } = await import('@qdrant/qdrant-js');
        const OpenAI = await import('openai');
        const { ContextAwareSearch } = await import('../services/search/ContextAwareSearch.js');
        
        // Initialize services
        const qdrant = new QdrantClient({
          url: process.env.QDRANT_URL || 'https://2769f27d-a9f0-4361-8f88-3ac61f081dd1.europe-west3-0.gcp.cloud.qdrant.io:6333',
          apiKey: process.env.QDRANT_API_KEY,
        });
        
        const openai = new OpenAI.default({
          apiKey: process.env.OPENAI_API_KEY,
        });
        
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
        
        // Perform context-aware search with conversation history
        const searchResults = await contextAwareSearch.performContextAwareSearch({
          qdrantClient: qdrant,
          openaiClient: openai,
          collectionName,
          currentMessage: message,
          conversationHistory: conversationHistory,
          searchOptions: {
            limit: 5,
            scoreThreshold: 0.0  // More permissive threshold to get relevant results
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
    
    console.log('🚀 Sending to intelligence layer:');
    console.log('  - Original message:', message);
    console.log('  - Has conversation context:', conversationHistory.length > 0);
    console.log('  - Has knowledge context:', !!knowledgeContext);
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
        originalMessage: message
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
    res.json({
      success: true,
      response: intelligentResponse.response.content,
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