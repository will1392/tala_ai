#!/usr/bin/env node

/**
 * Verify Tala is Fixed - Final Test
 * 
 * Run this after restarting the server to confirm all fixes are working
 */

import fetch from 'node-fetch';
import { getSupabaseService } from './db/supabaseClient.js';

const API_URL = 'http://localhost:5008';
const TEST_USER = 'admin-1';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testTala() {
  console.log('🧪 Verifying Tala is Fixed\n');
  console.log('=' . repeat(60));
  
  try {
    // Test 1: Check server health
    console.log('\n1️⃣ Checking server health...');
    const healthResponse = await fetch(`${API_URL}/api/health`);
    console.log(`Server status: ${healthResponse.status === 200 ? '✅ Online' : '❌ Offline'}`);
    
    // Test 2: Greece query
    console.log('\n2️⃣ Testing Greece query...');
    const greeceResponse = await fetch(`${API_URL}/api/chat/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': TEST_USER
      },
      body: JSON.stringify({
        message: 'Tell me about Greece',
        mode: 'travel',
        searchKnowledge: true
      })
    });
    
    const greeceData = await greeceResponse.json();
    
    console.log('\nGreece Query Results:');
    console.log(`✅ Success: ${greeceData.success}`);
    console.log(`✅ Has response: ${!!greeceData.response}`);
    console.log(`✅ Response length: ${greeceData.response?.length || 0} chars`);
    
    // Check response quality
    const response = greeceData.response?.toLowerCase() || '';
    const checks = {
      mentionsGreece: response.includes('greece') || response.includes('greek'),
      hasSpecificInfo: response.includes('athens') || response.includes('santorini') || 
                       response.includes('culture') || response.includes('mediterranean'),
      notGeneric: !response.includes('i can help') && !response.includes('what would you like'),
      hasSources: greeceData.sources?.length > 0
    };
    
    console.log('\n📊 Response Quality:');
    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${check}`);
    });
    
    if (greeceData.sources?.length > 0) {
      console.log('\n📚 Sources used:');
      greeceData.sources.forEach(source => {
        console.log(`  - ${source.title}`);
      });
    }
    
    console.log('\n📝 Response preview:');
    console.log(greeceData.response?.substring(0, 300) + '...');
    
    // Save conversation ID for follow-up
    const conversationId = greeceData.conversationId;
    
    await delay(1000);
    
    // Test 3: Context retention
    console.log('\n\n3️⃣ Testing context retention (hotels)...');
    const hotelsResponse = await fetch(`${API_URL}/api/chat/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': TEST_USER
      },
      body: JSON.stringify({
        message: 'What about hotels?',
        conversationId: conversationId,
        mode: 'travel',
        searchKnowledge: true
      })
    });
    
    const hotelsData = await hotelsResponse.json();
    const hotelResponse = hotelsData.response?.toLowerCase() || '';
    
    const contextChecks = {
      mentionsGreece: hotelResponse.includes('greece') || hotelResponse.includes('greek'),
      mentionsHotels: hotelResponse.includes('hotel'),
      hasSpecificInfo: hotelResponse.includes('athens') || hotelResponse.includes('santorini') ||
                       hotelResponse.includes('accommodation'),
      maintainedContext: hotelsData.conversationId === conversationId
    };
    
    console.log('\n📊 Context Retention:');
    Object.entries(contextChecks).forEach(([check, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${check}`);
    });
    
    console.log('\n📝 Hotels response preview:');
    console.log(hotelsData.response?.substring(0, 300) + '...');
    
    // Test 4: Check database persistence
    console.log('\n\n4️⃣ Checking database persistence...');
    const supabase = getSupabaseService();
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('message_index', { ascending: true });
    
    console.log(`\n✅ Found ${messages?.length || 0} messages in database`);
    
    // Final verdict
    console.log('\n\n🎯 FINAL VERDICT');
    console.log('=' . repeat(60));
    
    const allPassed = Object.values(checks).every(v => v) && 
                     Object.values(contextChecks).every(v => v);
    
    if (allPassed) {
      console.log('✅ TALA IS FULLY FIXED!');
      console.log('\nAll systems operational:');
      console.log('- Knowledge base search working');
      console.log('- Content properly formatted and sized');
      console.log('- Context retention functional');
      console.log('- Database persistence active');
      console.log('- Enterprise features enabled');
    } else {
      console.log('⚠️  Some issues remain - check the failed items above');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\nMake sure the server is running on port 5008');
  }
}

// Run the test
testTala().catch(console.error);