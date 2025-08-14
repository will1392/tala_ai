import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testFrontendCall() {
  console.log('🧪 Testing Frontend-style API Call\n');

  const baseUrl = 'http://localhost:3001';
  const userId = 'mock-user-id'; // This is what the frontend uses based on logs
  
  const body = {
    message: "what can you tell me about the northern lights?",
    userId: userId,
    isAdmin: true,
    conversationId: undefined,
    mode: "travel",
    subMode: undefined,
    maxResults: 5,
    searchKnowledge: true
  };
  
  console.log('📤 Request details:');
  console.log('   URL:', `${baseUrl}/api/chat/v2`);
  console.log('   Headers:', { 'x-user-id': userId });
  console.log('   Body:', JSON.stringify(body, null, 2));

  try {
    const response = await fetch(`${baseUrl}/api/chat/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId
      },
      body: JSON.stringify(body)
    });

    console.log('\n📥 Response:');
    console.log('   Status:', response.status, response.statusText);
    console.log('   Headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('   Success:', data.success);
    
    if (data.response) {
      console.log('\n📝 Response content:');
      console.log(data.response);
      
      // Check for problematic phrases
      const problemPhrases = ['provide more details', 'what specific', 'I understand you\'re asking'];
      console.log('\n🔍 Checking for issues:');
      for (const phrase of problemPhrases) {
        if (data.response.toLowerCase().includes(phrase.toLowerCase())) {
          console.log(`   ❌ Found problematic phrase: "${phrase}"`);
        }
      }
    } else {
      console.log('\n❌ No response content');
      console.log('Full response:', JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFrontendCall();