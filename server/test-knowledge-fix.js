#!/usr/bin/env node

/**
 * Test script to verify knowledge base responses are working correctly
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';


const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function testKnowledgeResponse() {
  console.log('🧪 Testing knowledge base response fix...\n');
  
  // Test message that should trigger knowledge base search
  const testMessage = "How do I see the northern lights in Norway?";
  
  try {
    // First, get auth token (you might need to adjust this based on your auth)
    // For testing, we'll use a mock token
    const authToken = process.env.TEST_AUTH_TOKEN || 'test-token';
    
    console.log(`📤 Sending test message: "${testMessage}"`);
    
    const response = await fetch(`${API_URL}/api/chat/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        message: testMessage,
        mode: 'travel',
        searchKnowledge: true
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ API Error:', data);
      return;
    }
    
    console.log('\n📥 Response received:');
    console.log('Success:', data.success);
    console.log('\n📝 Response content:');
    console.log(data.response);
    
    // Check if response contains problematic phrases
    const problematicPhrases = [
      "could you provide more details",
      "what specific",
      "could you clarify",
      "i understand you're asking"
    ];
    
    const responseText = data.response?.toLowerCase() || '';
    const foundProblems = problematicPhrases.filter(phrase => 
      responseText.includes(phrase)
    );
    
    if (foundProblems.length > 0) {
      console.log('\n⚠️  WARNING: Response still contains clarification requests:');
      foundProblems.forEach(phrase => console.log(`  - "${phrase}"`));
    } else {
      console.log('\n✅ SUCCESS: Response provides direct information without asking for clarification!');
    }
    
    // Check metadata
    if (data.metadata) {
      console.log('\n📊 Metadata:');
      console.log('Request ID:', data.metadata.requestId);
      console.log('Execution time:', data.metadata.executionTime + 'ms');
      console.log('Had knowledge context:', data.metadata.hadKnowledgeContext);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testKnowledgeResponse();