/**
 * Test Enhanced Response Generation
 * 
 * Verifies that responses are now:
 * - More comprehensive
 * - Using multiple sources
 * - Context-aware
 * - Well-structured
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';

async function testEnhancedResponses() {
  console.log('🧪 Testing Enhanced Response Generation\n');
  console.log('=' . repeat(80));
  
  // Test 1: Simple Greece query
  console.log('\n1️⃣ Test: Simple Greece Query');
  console.log('-'.repeat(40));
  
  let conversationId = null;
  
  try {
    const response1 = await fetch(`${API_URL}/api/chat/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'test-enhanced'
      },
      body: JSON.stringify({
        message: 'Tell me about Greece',
        mode: 'travel',
        searchKnowledge: true
      })
    });
    
    const data1 = await response1.json();
    conversationId = data1.conversationId;
    
    console.log('✅ Response received');
    console.log('📊 Metadata:', {
      enhanced: data1.metadata?.enhanced,
      simpleFlow: data1.metadata?.simpleFlow,
      sourcesUsed: data1.metadata?.sourcesUsed
    });
    
    console.log('\n📄 Sources found:', data1.sources?.length || 0);
    data1.sources?.forEach((s, i) => {
      console.log(`   ${i+1}. ${s.title} (Score: ${s.score.toFixed(3)})`);
    });
    
    console.log('\n💬 Response Quality Check:');
    const responseLength = data1.response?.length || 0;
    console.log(`   - Length: ${responseLength} characters`);
    console.log(`   - Mentions Greece: ${data1.response?.toLowerCase().includes('greece') ? '✅' : '❌'}`);
    console.log(`   - Has structure: ${data1.response?.includes('##') || data1.response?.includes('•') ? '✅' : '❌'}`);
    
    console.log('\n📝 Response Preview:');
    console.log(data1.response?.substring(0, 500) + '...\n');
    
  } catch (error) {
    console.error('❌ Test 1 failed:', error.message);
  }
  
  // Test 2: Follow-up question with context
  console.log('\n2️⃣ Test: Follow-up Question (Context Test)');
  console.log('-'.repeat(40));
  
  if (conversationId) {
    try {
      // Wait a bit to ensure conversation is saved
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response2 = await fetch(`${API_URL}/api/chat/v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'test-enhanced'
        },
        body: JSON.stringify({
          message: 'What about the best hotels?',
          mode: 'travel',
          searchKnowledge: true,
          conversationId: conversationId
        })
      });
      
      const data2 = await response2.json();
      
      console.log('✅ Follow-up response received');
      console.log('📊 Context awareness check:');
      console.log(`   - Mentions Greece: ${data2.response?.toLowerCase().includes('greece') ? '✅' : '❌'}`);
      console.log(`   - Mentions hotels: ${data2.response?.toLowerCase().includes('hotel') ? '✅' : '❌'}`);
      console.log(`   - Response length: ${data2.response?.length || 0} characters`);
      
      console.log('\n📝 Context Response Preview:');
      console.log(data2.response?.substring(0, 500) + '...\n');
      
    } catch (error) {
      console.error('❌ Test 2 failed:', error.message);
    }
  }
  
  // Test 3: Iceland Northern Lights (multi-source test)
  console.log('\n3️⃣ Test: Iceland Northern Lights Query');
  console.log('-'.repeat(40));
  
  try {
    const response3 = await fetch(`${API_URL}/api/chat/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'test-enhanced'
      },
      body: JSON.stringify({
        message: 'When can I see the Northern Lights in Iceland?',
        mode: 'travel',
        searchKnowledge: true
      })
    });
    
    const data3 = await response3.json();
    
    console.log('✅ Response received');
    console.log('📊 Multi-source check:');
    
    if (data3.metadata?.sourcesUsed) {
      console.log('   Sources used in response:');
      data3.metadata.sourcesUsed.forEach((s, i) => {
        console.log(`   ${i+1}. ${s.title} - ${s.sectionsUsed} sections`);
      });
    }
    
    console.log('\n💬 Content Quality:');
    console.log(`   - Mentions Northern Lights: ${data3.response?.toLowerCase().includes('northern lights') ? '✅' : '❌'}`);
    console.log(`   - Mentions Iceland: ${data3.response?.toLowerCase().includes('iceland') ? '✅' : '❌'}`);
    console.log(`   - Includes timing info: ${data3.response?.match(/september|october|november|december|january|february|march/i) ? '✅' : '❌'}`);
    console.log(`   - Response length: ${data3.response?.length || 0} characters`);
    
    console.log('\n📝 Northern Lights Response Preview:');
    console.log(data3.response?.substring(0, 500) + '...\n');
    
  } catch (error) {
    console.error('❌ Test 3 failed:', error.message);
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 ENHANCEMENT SUMMARY');
  console.log('='.repeat(80));
  console.log('\nExpected Improvements:');
  console.log('✅ Longer, more detailed responses (2000+ characters)');
  console.log('✅ Well-structured with sections and formatting');
  console.log('✅ Uses multiple relevant document sections');
  console.log('✅ Maintains conversation context');
  console.log('✅ Provides comprehensive travel information');
  
  console.log('\nNext Steps:');
  console.log('1. Restart server to load EnhancedResponseGenerator');
  console.log('2. Run this test to verify improvements');
  console.log('3. Fine-tune parameters if needed');
}

testEnhancedResponses().catch(console.error);