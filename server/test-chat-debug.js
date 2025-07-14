#!/usr/bin/env node

/**
 * Debug chat endpoint issues
 */

import fetch from 'node-fetch';

const SERVER_URL = 'http://localhost:3001';

console.log('🔍 Testing chat endpoint step by step...');

async function testChatEndpoint() {
  try {
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${SERVER_URL}/api/health`);
    console.log(`Health status: ${healthResponse.status}`);
    
    console.log('2. Testing basic chat request...');
    const chatResponse = await fetch(`${SERVER_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-token'
      },
      body: JSON.stringify({
        message: 'Hello'
      })
    });
    
    console.log(`Chat status: ${chatResponse.status}`);
    const chatResponseText = await chatResponse.text();
    console.log('Chat response:', chatResponseText);
    
    if (!chatResponse.ok) {
      console.error('❌ Chat request failed');
      return;
    }
    
    console.log('✅ Chat endpoint working');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testChatEndpoint();