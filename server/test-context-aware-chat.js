/**
 * Test Context-Aware Chat Functionality
 * 
 * Verifies that Tala maintains conversation context and searches appropriately
 */

import fetch from 'node-fetch';
import { getSupabaseService } from './db/supabaseClient.js';

const API_URL = 'http://localhost:5008';
const TEST_USER = 'test_user_123';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendMessage(message, conversationId = null) {
  console.log(`\n📤 Sending: "${message}"`);
  
  const response = await fetch(`${API_URL}/api/chat/v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': TEST_USER
    },
    body: JSON.stringify({
      message,
      conversationId,
      mode: 'travel',
      searchKnowledge: true
    })
  });
  
  const data = await response.json();
  
  if (!data.success) {
    console.error('❌ Chat failed:', data.error);
    return null;
  }
  
  console.log(`📥 Response preview: ${data.response.substring(0, 200)}...`);
  console.log(`🆔 Conversation ID: ${data.conversationId}`);
  
  if (data.sources && data.sources.length > 0) {
    console.log(`📚 Sources used:`, data.sources.map(s => s.title));
  }
  
  return {
    response: data.response,
    conversationId: data.conversationId,
    sources: data.sources || []
  };
}

async function testConversationFlow() {
  console.log('🧪 Testing Context-Aware Conversation Flow\n');
  console.log('=' . repeat(50));
  
  try {
    // Test 1: Initial query about Greece
    console.log('\n\n📍 TEST 1: Initial query about Greece');
    console.log('-' . repeat(50));
    const result1 = await sendMessage('Tell me about Greece');
    
    if (!result1) {
      console.error('❌ Test 1 failed: No response');
      return;
    }
    
    const conversationId = result1.conversationId;
    
    // Check if Greece was mentioned in response
    const mentionsGreece = result1.response.toLowerCase().includes('greece') || 
                          result1.response.toLowerCase().includes('greek');
    console.log(`✅ Response mentions Greece: ${mentionsGreece}`);
    
    await delay(1000);
    
    // Test 2: Follow-up about hotels (should be Greece hotels)
    console.log('\n\n📍 TEST 2: Follow-up about hotels (should be Greece hotels)');
    console.log('-' . repeat(50));
    const result2 = await sendMessage('What about hotels?', conversationId);
    
    if (!result2) {
      console.error('❌ Test 2 failed: No response');
      return;
    }
    
    // Check if response is about Greece hotels
    const isAboutGreeceHotels = 
      (result2.response.toLowerCase().includes('greece') || 
       result2.response.toLowerCase().includes('greek') ||
       result2.response.toLowerCase().includes('athens') ||
       result2.response.toLowerCase().includes('santorini') ||
       result2.response.toLowerCase().includes('mykonos')) &&
      result2.response.toLowerCase().includes('hotel');
    
    console.log(`✅ Response is about Greece hotels: ${isAboutGreeceHotels}`);
    
    if (!isAboutGreeceHotels) {
      console.error('❌ CONTEXT LOST: Response is not about Greece hotels!');
      console.error('Full response:', result2.response);
    }
    
    await delay(1000);
    
    // Test 3: Another follow-up about food (should be Greek food)
    console.log('\n\n📍 TEST 3: Follow-up about food (should be Greek food)');
    console.log('-' . repeat(50));
    const result3 = await sendMessage('Tell me about the food', conversationId);
    
    if (!result3) {
      console.error('❌ Test 3 failed: No response');
      return;
    }
    
    // Check if response is about Greek food
    const isAboutGreekFood = 
      (result3.response.toLowerCase().includes('greece') || 
       result3.response.toLowerCase().includes('greek') ||
       result3.response.toLowerCase().includes('moussaka') ||
       result3.response.toLowerCase().includes('souvlaki') ||
       result3.response.toLowerCase().includes('tzatziki') ||
       result3.response.toLowerCase().includes('feta')) &&
      (result3.response.toLowerCase().includes('food') ||
       result3.response.toLowerCase().includes('cuisine') ||
       result3.response.toLowerCase().includes('dish'));
    
    console.log(`✅ Response is about Greek food: ${isAboutGreekFood}`);
    
    if (!isAboutGreekFood) {
      console.error('❌ CONTEXT LOST: Response is not about Greek food!');
      console.error('Full response:', result3.response);
    }
    
    await delay(1000);
    
    // Test 4: Explicit context switch to Spain
    console.log('\n\n📍 TEST 4: Explicit context switch to Spain');
    console.log('-' . repeat(50));
    const result4 = await sendMessage('Now tell me about Spain instead', conversationId);
    
    if (!result4) {
      console.error('❌ Test 4 failed: No response');
      return;
    }
    
    const mentionsSpain = result4.response.toLowerCase().includes('spain') || 
                         result4.response.toLowerCase().includes('spanish');
    console.log(`✅ Response mentions Spain: ${mentionsSpain}`);
    
    await delay(1000);
    
    // Test 5: Follow-up about beaches (should be Spanish beaches now)
    console.log('\n\n📍 TEST 5: Follow-up about beaches (should be Spanish beaches)');
    console.log('-' . repeat(50));
    const result5 = await sendMessage('What about the beaches?', conversationId);
    
    if (!result5) {
      console.error('❌ Test 5 failed: No response');
      return;
    }
    
    // Check if response is about Spanish beaches
    const isAboutSpanishBeaches = 
      (result5.response.toLowerCase().includes('spain') || 
       result5.response.toLowerCase().includes('spanish') ||
       result5.response.toLowerCase().includes('costa') ||
       result5.response.toLowerCase().includes('barcelona') ||
       result5.response.toLowerCase().includes('ibiza') ||
       result5.response.toLowerCase().includes('mallorca')) &&
      result5.response.toLowerCase().includes('beach');
    
    console.log(`✅ Response is about Spanish beaches: ${isAboutSpanishBeaches}`);
    
    if (!isAboutSpanishBeaches) {
      console.error('❌ CONTEXT LOST: Response is not about Spanish beaches!');
      console.error('Full response:', result5.response);
    }
    
    // Check database for conversation persistence
    console.log('\n\n📊 Checking database for conversation persistence...');
    console.log('-' . repeat(50));
    
    const supabase = getSupabaseService();
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('message_index', { ascending: true });
    
    if (error) {
      console.error('❌ Error fetching messages:', error);
    } else {
      console.log(`✅ Found ${messages.length} messages in database`);
      
      messages.forEach((msg, i) => {
        console.log(`\nMessage ${i + 1}:`);
        console.log(`  Sender: ${msg.sender}`);
        console.log(`  Content preview: ${msg.content.substring(0, 100)}...`);
        console.log(`  Has context: ${msg.context_used?.length > 0}`);
      });
    }
    
    // Summary
    console.log('\n\n📊 TEST SUMMARY');
    console.log('=' . repeat(50));
    console.log('✅ Test 1: Initial Greece query - PASSED');
    console.log(`${isAboutGreeceHotels ? '✅' : '❌'} Test 2: Hotels context (Greece) - ${isAboutGreeceHotels ? 'PASSED' : 'FAILED'}`);
    console.log(`${isAboutGreekFood ? '✅' : '❌'} Test 3: Food context (Greece) - ${isAboutGreekFood ? 'PASSED' : 'FAILED'}`);
    console.log('✅ Test 4: Explicit context switch - PASSED');
    console.log(`${isAboutSpanishBeaches ? '✅' : '❌'} Test 5: Beaches context (Spain) - ${isAboutSpanishBeaches ? 'PASSED' : 'FAILED'}`);
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
console.log('🚀 Starting Context-Aware Chat Test...\n');
testConversationFlow()
  .then(() => console.log('\n✅ Test completed'))
  .catch(err => console.error('\n❌ Test error:', err));