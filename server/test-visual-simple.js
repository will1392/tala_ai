/**
 * Simple test for visual document processing with mock responses
 */

import dotenv from 'dotenv';
dotenv.config();

// Set mock environment variable if not present
if (!process.env.GOOGLE_AI_API_KEY) {
  process.env.GOOGLE_AI_API_KEY = 'mock-api-key-for-testing';
}

import GeminiVisionService from './services/llm/providers/GeminiVisionService.js';

async function testMockVisionService() {
  console.log('🧪 Testing Gemini Vision Service with Mock Responses\n');
  
  const visionService = new GeminiVisionService();
  
  // Test mock responses for different document types
  const testCases = [
    { path: 'passport-sample.jpg', prompt: 'Extract passport information' },
    { path: 'boarding-pass.png', prompt: 'Extract boarding pass details' },
    { path: 'travel-brochure.jpg', prompt: 'Extract brochure information' }
  ];
  
  for (const test of testCases) {
    console.log(`\n📄 Testing: ${test.path}`);
    console.log(`📝 Prompt: ${test.prompt}`);
    
    try {
      const result = await visionService.analyzeImage(test.path, test.prompt);
      const parsed = JSON.parse(result);
      
      console.log('\n✅ Results:');
      console.log(`  Document Type: ${parsed.entities?.documentType || 'unknown'}`);
      console.log(`  Summary: ${parsed.summary}`);
      console.log(`  Entities found: ${Object.keys(parsed.entities).length}`);
      
      // Show key entities
      if (parsed.entities) {
        console.log('\n  Key Information:');
        Object.entries(parsed.entities).slice(0, 5).forEach(([key, value]) => {
          console.log(`    ${key}: ${JSON.stringify(value)}`);
        });
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n✅ Test completed!');
}

// Run the test
testMockVisionService().catch(console.error);