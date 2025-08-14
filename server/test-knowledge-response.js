import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testKnowledgeResponse() {
  console.log('🧪 Testing Knowledge Base Response Generation\n');

  // Test the intelligent chat endpoint
  const testQuery = "tell me about the northern lights";
  
  console.log('📤 Sending test query:', testQuery);
  console.log('   Mode: travel');
  console.log('   SearchKnowledge: true\n');

  try {
    const response = await fetch('http://localhost:3001/api/chat/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'test-user'
      },
      body: JSON.stringify({
        message: testQuery,
        mode: 'travel',
        searchKnowledge: true,
        userId: 'test-user'
      })
    });

    const data = await response.json();
    
    console.log('📥 Response received:');
    console.log('   Success:', data.success);
    console.log('   Response length:', data.response?.length);
    console.log('\n📝 Full response:');
    console.log(data.response);
    
    // Check for problematic phrases
    const problemPhrases = [
      'provide more details',
      'could you clarify',
      'what specific',
      'I understand you\'re asking',
      'What aspect',
      'Would you like me to',
      'Could you please provide'
    ];
    
    console.log('\n🔍 Checking for problematic phrases:');
    let foundProblems = false;
    for (const phrase of problemPhrases) {
      if (data.response?.toLowerCase().includes(phrase.toLowerCase())) {
        console.log(`   ❌ Found: "${phrase}"`);
        foundProblems = true;
      }
    }
    
    if (!foundProblems) {
      console.log('   ✅ No problematic phrases found');
    }
    
    // Check if response contains actual information
    const infoKeywords = ['aurora', 'lights', 'northern', 'solar', 'magnetic', 'sky', 'phenomenon'];
    let hasInfo = false;
    console.log('\n🔍 Checking for information keywords:');
    for (const keyword of infoKeywords) {
      if (data.response?.toLowerCase().includes(keyword.toLowerCase())) {
        console.log(`   ✅ Found: "${keyword}"`);
        hasInfo = true;
      }
    }
    
    if (!hasInfo) {
      console.log('   ❌ No relevant information keywords found');
    }
    
    // Test direct intelligence endpoint
    console.log('\n\n📤 Testing direct intelligence endpoint...');
    const intelligenceResponse = await fetch('http://localhost:3001/api/chat/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'test-user'
      },
      body: JSON.stringify({
        message: testQuery,
        mode: 'travel',
        searchKnowledge: true
      })
    });
    
    const intelligenceData = await intelligenceResponse.json();
    console.log('📥 Intelligence response preview:', intelligenceData.response?.substring(0, 200) + '...');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testKnowledgeResponse();