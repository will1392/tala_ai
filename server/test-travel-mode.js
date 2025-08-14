/**
 * Test Travel Mode functionality
 * 
 * This script tests that Travel Mode is properly:
 * 1. Searching the knowledge base
 * 2. Using travel-specific prompts
 * 3. Returning relevant travel information
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';
const USER_ID = 'admin-1';

async function testTravelMode() {
  console.log('🧪 Testing Travel Mode Functionality...\n');
  
  const testQueries = [
    { query: 'Tell me about Spain', expectedContext: 'travel information about Spain' },
    { query: 'What hotels do you recommend in Greece?', expectedContext: 'hotel recommendations for Greece' },
    { query: 'I need visa information for Iceland', expectedContext: 'visa requirements for Iceland' }
  ];
  
  for (const test of testQueries) {
    console.log(`\n📍 Test: "${test.query}"`);
    console.log('─'.repeat(50));
    
    try {
      const response = await fetch(`${API_URL}/api/chat/v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': USER_ID
        },
        body: JSON.stringify({
          message: test.query,
          userId: USER_ID,
          mode: 'travel',
          searchKnowledge: true,
          maxResults: 5
        })
      });
      
      if (!response.ok) {
        console.error('❌ Request failed:', response.status, response.statusText);
        const error = await response.text();
        console.error('Error:', error);
        continue;
      }
      
      const data = await response.json();
      
      console.log('✅ Response received');
      console.log('📊 Response structure:', {
        hasResponse: !!data.response,
        responseLength: data.response?.length || 0,
        hasSources: !!data.sources,
        sourcesCount: data.sources?.length || 0,
        hasMetadata: !!data.metadata
      });
      
      if (data.sources && data.sources.length > 0) {
        console.log('\n📚 Knowledge Base Sources:');
        data.sources.forEach((source, i) => {
          console.log(`  ${i + 1}. ${source.title} (Score: ${source.score?.toFixed(2) || 'N/A'})`);
        });
      } else {
        console.log('\n⚠️  No knowledge base sources found');
      }
      
      console.log('\n💬 Response preview:');
      console.log(data.response?.substring(0, 200) + '...');
      
      // Check if response is travel-focused
      const isTravelFocused = data.response?.toLowerCase().includes('travel') ||
                             data.response?.toLowerCase().includes('visit') ||
                             data.response?.toLowerCase().includes('tourist') ||
                             data.response?.toLowerCase().includes('destination');
      
      console.log(`\n🎯 Travel-focused response: ${isTravelFocused ? '✅ Yes' : '❌ No'}`);
      
      // Check for generic responses that indicate travel mode isn't working
      const genericPhrases = [
        'could you provide more specific',
        'what aspect would you like',
        'please clarify',
        'can you be more specific'
      ];
      
      const hasGenericResponse = genericPhrases.some(phrase => 
        data.response?.toLowerCase().includes(phrase)
      );
      
      if (hasGenericResponse) {
        console.log('⚠️  WARNING: Response contains generic phrases indicating travel mode may not be active');
      }
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    }
  }
  
  console.log('\n\n📋 Test Summary:');
  console.log('─'.repeat(50));
  console.log('Travel Mode should:');
  console.log('1. ✓ Search knowledge base for location keywords');
  console.log('2. ✓ Use travel-specific system prompts');
  console.log('3. ✓ Provide travel-focused responses');
  console.log('4. ✓ Never ask for clarification when knowledge exists');
  console.log('5. ✓ Include sources from knowledge base when available');
}

// Run the test
testTravelMode().catch(console.error);