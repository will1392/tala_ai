/**
 * Test authentication and Greece query
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';

async function testAuthAndGreece() {
  console.log('🧪 Testing Authentication and Greece Query\n');
  console.log('=' . repeat(60));
  
  // Test 1: Without authentication headers
  console.log('\n1️⃣ Test WITHOUT authentication headers');
  console.log('-'.repeat(40));
  
  try {
    const response1 = await fetch(`${API_URL}/api/chat/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Greece',
        mode: 'travel',
        searchKnowledge: true
      })
    });
    
    console.log('Response status:', response1.status);
    const data1 = await response1.json();
    console.log('Response:', data1);
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  // Test 2: With mock user header
  console.log('\n\n2️⃣ Test WITH x-user-id header');
  console.log('-'.repeat(40));
  
  try {
    const response2 = await fetch(`${API_URL}/api/chat/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'admin-1'
      },
      body: JSON.stringify({
        message: 'Greece',
        mode: 'travel',
        searchKnowledge: true
      })
    });
    
    console.log('Response status:', response2.status);
    const data2 = await response2.json();
    console.log('Success:', data2.success);
    
    if (data2.metadata) {
      console.log('\nMetadata:');
      console.log('- Simple flow:', data2.metadata.simpleFlow);
      console.log('- Attempted simple flow:', data2.metadata.attemptedSimpleFlow);
      console.log('- Error type:', data2.metadata.errorType);
    }
    
    if (data2.error) {
      console.log('\n❌ Error:', data2.error);
      console.log('Details:', data2.details);
    }
    
    if (data2.sources) {
      console.log('\nSources:');
      data2.sources.forEach((s, i) => {
        console.log(`${i+1}. ${s.title}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  // Test 3: Check environment variables
  console.log('\n\n3️⃣ Environment Variables Check');
  console.log('-'.repeat(40));
  
  console.log('QDRANT_URL:', process.env.QDRANT_URL ? '✅ Set' : '❌ Missing');
  console.log('QDRANT_API_KEY:', process.env.QDRANT_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing');
}

testAuthAndGreece().catch(console.error);