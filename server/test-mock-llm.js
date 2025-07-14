/**
 * Test Mock LLM Service directly
 */

import MockLLMService from './services/llm/providers/MockLLMService.js';

async function testMockLLM() {
  console.log('🧪 Testing Mock LLM Service\n');
  
  const mockService = new MockLLMService('test-model', {
    simulateDelay: 10
  });
  
  mockService.initialize();
  
  // Test 1: Email parsing request
  console.log('📧 Test 1: Email parsing request');
  const emailMessages = [
    { role: 'user', content: 'Please parse this email and extract booking details' }
  ];
  
  const emailResponse = await mockService.chat(emailMessages);
  console.log('Response:', emailResponse.content);
  console.log('---\n');
  
  // Test 2: Itinerary request
  console.log('✈️ Test 2: Itinerary request');
  const itineraryMessages = [
    { role: 'user', content: 'Create an itinerary for Paris, Rome, Barcelona' }
  ];
  
  const itineraryResponse = await mockService.chat(itineraryMessages);
  console.log('Response:', itineraryResponse.content);
}

testMockLLM();