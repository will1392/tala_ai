/**
 * Enhanced Simple Flow Implementation
 * 
 * This shows the modifications needed to the simple flow
 * to use the EnhancedResponseGenerator
 */

// In the simple flow section (starting around line 78):

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
      
      const { response, sourcesUsed } = await responseGenerator.generateResponse({
        query: message,
        searchResults,
        conversationHistory,
        openaiClient: openai
      });
      
      // Return in the expected format
      return res.json({
        success: true,
        response: response,
        sources: searchResults.slice(0, 3).map(r => ({
          title: r.payload?.metadata?.title || 'Travel Guide',
          type: 'document',
          score: r.score
        })),
        conversationId: conversationId || req.userId + '_' + Date.now(),
        metadata: {
          model: 'gpt-4o-mini',
          mode: 'travel',
          simpleFlow: true,
          enhanced: true,
          sourcesUsed: sourcesUsed
        }
      });
    } else {
      // No results found
      return res.json({
        success: true,
        response: "I couldn't find specific information about that destination in my travel guides. Could you please be more specific about what you'd like to know?",
        sources: [],
        conversationId: conversationId || req.userId + '_' + Date.now()
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

// Note: This is the enhanced version of the simple flow section
// It maintains the same structure but uses the EnhancedResponseGenerator
// for better quality responses