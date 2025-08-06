/**
 * Test Conversation History Persistence
 * 
 * This script tests whether Tala maintains conversation context
 * between messages in travel mode.
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';
const USER_ID = 'test-conversation-' + Date.now();

async function testConversationHistory() {
  console.log('🧪 Testing Conversation History Persistence\n');
  console.log('=' . repeat(80));
  
  // Generate a unique conversation ID for this test
  const conversationId = 'conv_' + Date.now();
  console.log(`📝 Using Conversation ID: ${conversationId}`);
  console.log(`👤 Using User ID: ${USER_ID}\n`);
  
  // Test Case 1: Initial query about Greece
  console.log('📌 Test 1: Initial Query about Greece');
  console.log('-'.repeat(80));
  
  const firstQuery = "Tell me about Greece, including some cultural aspects and movies";
  console.log(`Query: "${firstQuery}"`);
  
  try {
    const response1 = await fetch(`${API_URL}/api/chat/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': USER_ID
      },
      body: JSON.stringify({
        message: firstQuery,
        conversationId: conversationId,
        mode: 'travel',
        searchKnowledge: true
      })
    });
    
    const data1 = await response1.json();
    
    if (data1.success) {
      console.log('\n✅ First response received');
      console.log('Response length:', data1.response?.length || 0, 'chars');
      
      // Check if response mentions movies
      const mentionsMovies = data1.response?.toLowerCase().includes('movie') || 
                            data1.response?.toLowerCase().includes('film');
      console.log('Mentions movies/films:', mentionsMovies ? '✅' : '❌');
      
      // Extract first 300 chars to show context
      console.log('\nResponse preview:');
      console.log(data1.response?.substring(0, 300) + '...');
      
      // Check conversation ID in response
      console.log('\nReturned conversation ID:', data1.conversationId);
      const returnedConvId = data1.conversationId || conversationId;
      
      // Wait a moment before second query
      console.log('\n⏳ Waiting 2 seconds before follow-up query...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test Case 2: Follow-up query about movies
      console.log('📌 Test 2: Follow-up Query about Movies');
      console.log('-'.repeat(80));
      
      const secondQuery = "Tell me more about those movies you mentioned";
      console.log(`Query: "${secondQuery}"`);
      console.log(`Using conversation ID: ${returnedConvId}`);
      
      const response2 = await fetch(`${API_URL}/api/chat/v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': USER_ID
        },
        body: JSON.stringify({
          message: secondQuery,
          conversationId: returnedConvId,
          mode: 'travel',
          searchKnowledge: true
        })
      });
      
      const data2 = await response2.json();
      
      if (data2.success) {
        console.log('\n✅ Second response received');
        console.log('Response length:', data2.response?.length || 0, 'chars');
        
        // Check if response shows context awareness
        const hasContext = !data2.response?.toLowerCase().includes("don't have information") &&
                          !data2.response?.toLowerCase().includes("no information") &&
                          !data2.response?.toLowerCase().includes("couldn't find");
        
        const mentionsMoviesInFollowup = data2.response?.toLowerCase().includes('movie') || 
                                        data2.response?.toLowerCase().includes('film');
        
        console.log('\n📊 Context Analysis:');
        console.log('Response acknowledges previous context:', hasContext ? '✅' : '❌');
        console.log('Response mentions movies/films:', mentionsMoviesInFollowup ? '✅' : '❌');
        
        console.log('\nResponse preview:');
        console.log(data2.response?.substring(0, 500));
        
        // Test Case 3: Third query to further test context
        console.log('\n⏳ Waiting 2 seconds before third query...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('📌 Test 3: Another Follow-up about Greece');
        console.log('-'.repeat(80));
        
        const thirdQuery = "What about the best time to visit the places we discussed?";
        console.log(`Query: "${thirdQuery}"`);
        
        const response3 = await fetch(`${API_URL}/api/chat/v2`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': USER_ID
          },
          body: JSON.stringify({
            message: thirdQuery,
            conversationId: returnedConvId,
            mode: 'travel',
            searchKnowledge: true
          })
        });
        
        const data3 = await response3.json();
        
        let hasGreekContext = false;
        if (data3.success) {
          console.log('\n✅ Third response received');
          
          hasGreekContext = data3.response?.toLowerCase().includes('greece') ||
                           data3.response?.toLowerCase().includes('greek');
          
          console.log('\n📊 Context Analysis:');
          console.log('Response maintains Greece context:', hasGreekContext ? '✅' : '❌');
          
          console.log('\nResponse preview:');
          console.log(data3.response?.substring(0, 300) + '...');
        }
        
        // Final Analysis
        console.log('\n\n' + '='.repeat(80));
        console.log('📊 CONVERSATION HISTORY TEST SUMMARY');
        console.log('='.repeat(80));
        
        if (hasContext && mentionsMoviesInFollowup && hasGreekContext) {
          console.log('\n✅ SUCCESS: Conversation history is working!');
          console.log('Tala successfully maintained context across all queries.');
        } else {
          console.log('\n❌ ISSUE DETECTED: Conversation history not maintained');
          console.log('\nProblems found:');
          if (!hasContext) {
            console.log('- Second query didn\'t acknowledge previous context');
          }
          if (!mentionsMoviesInFollowup) {
            console.log('- Follow-up about movies didn\'t reference them');
          }
          if (!hasGreekContext) {
            console.log('- Third query lost Greece context');
          }
          
          console.log('\nDebugging hints:');
          console.log('1. Check if conversation ID is consistent:', returnedConvId);
          console.log('2. Verify ThreadingService is saving messages');
          console.log('3. Check EnhancedResponseGenerator conversation context usage');
          console.log('4. Ensure simple flow includes conversation history in prompt');
        }
        
      } else {
        console.log('❌ Second request failed:', data2.error);
      }
      
    } else {
      console.log('❌ First request failed:', data1.error);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Also test if messages are being stored
async function checkStoredMessages(conversationId) {
  console.log('\n\n📚 Checking Stored Messages');
  console.log('='.repeat(80));
  
  try {
    const response = await fetch(`${API_URL}/api/chat/history?conversationId=${conversationId}`, {
      method: 'GET',
      headers: {
        'x-user-id': USER_ID
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`Found ${data.messages?.length || 0} stored messages`);
      if (data.messages?.length > 0) {
        data.messages.forEach((msg, i) => {
          console.log(`\n${i + 1}. ${msg.sender}: ${msg.content?.substring(0, 100)}...`);
        });
      }
    } else {
      console.log('Could not retrieve message history:', data.error);
    }
  } catch (error) {
    console.log('Error checking stored messages:', error.message);
  }
}

// Run the test
testConversationHistory()
  .then(() => {
    console.log('\n✅ Test completed');
  })
  .catch(console.error);