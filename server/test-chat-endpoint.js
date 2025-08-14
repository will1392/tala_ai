/**
 * Test the chat endpoint with knowledge base context
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000/api/chat/v2';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'test-token'; // Replace with actual token

async function testChatEndpoint() {
  try {
    console.log('🧪 Testing chat endpoint with knowledge base query...\n');
    
    const requestBody = {
      message: "When can I see the northern lights in Norway?",
      mode: "travel",
      searchKnowledge: true,
      conversationId: "test-conv-" + Date.now()
    };
    
    console.log('📤 Sending request:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    
    console.log('\n📥 Response received:');
    console.log('Status:', response.status);
    console.log('Success:', data.success);
    console.log('\nResponse content:');
    console.log(data.response);
    
    if (data.metadata) {
      console.log('\nMetadata:', data.metadata);
    }
    
    // Check response quality
    if (data.response) {
      const responseText = data.response.toLowerCase();
      const hasProblematicPhrases = 
        responseText.includes('could you please provide more details') ||
        responseText.includes('i understand you\'re asking') ||
        responseText.includes('need more information') ||
        responseText.includes('please clarify');
      
      console.log('\n✅ Response Analysis:');
      console.log('- Response is direct:', !hasProblematicPhrases);
      console.log('- Mentions northern lights:', responseText.includes('northern lights') || responseText.includes('aurora'));
      console.log('- Mentions timing:', responseText.includes('september') || responseText.includes('december') || responseText.includes('march'));
      console.log('- Mentions locations:', responseText.includes('tromsø') || responseText.includes('lofoten') || responseText.includes('norway'));
      
      if (hasProblematicPhrases) {
        console.log('\n❌ ISSUE: Response is asking for clarification instead of using knowledge base!');
      } else {
        console.log('\n✅ SUCCESS: Response appears to use knowledge base information!');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
  }
}

// Check if server is running
console.log('Note: Make sure the server is running on http://localhost:3000');
console.log('Note: You may need to set AUTH_TOKEN environment variable\n');

// Run the test
testChatEndpoint();