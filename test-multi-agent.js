#!/usr/bin/env node

/**
 * Test script for Direct Mail multi-agent system
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001/api/direct-mail-agent/process';

// Sample consultation data
const testConsultationData = {
  campaignName: "Summer Travel Deals Campaign",
  responses: {
    travel_specialty: "Luxury European River Cruises",
    business_goals: "Increase bookings for summer 2025 river cruise packages",
    primary_campaign_goal: "Generate 50 new bookings within 60 days",
    ideal_client: "Affluent couples aged 55-70 who enjoy cultural experiences",
    audience_type: "Past Clients",
    campaign_offer: "Save $500 per couple on select river cruises + free cabin upgrade",
    value_proposition: "Experience Europe's waterways with expert planning and exclusive perks you won't find online",
    campaign_budget: "$5,000",
    mail_volume: "2,500",
    format_preference: "Postcard",
    arrival_date: "30 days",
    customer_value: "$3,500"
  }
};

async function testMultiAgent() {
  console.log('🧪 Testing Direct Mail Multi-Agent System...\n');
  
  try {
    console.log('📨 Sending consultation data to multi-agent system...\n');
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-brand-id': 'test-brand-123'
      },
      body: JSON.stringify({
        consultationData: testConsultationData,
        brandId: 'test-brand-123',
        mode: 'marketing'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    console.log('✅ Response received!\n');
    console.log('📊 Analysis Complete:', result.success ? 'YES' : 'NO');
    console.log('🤖 Models Used:', JSON.stringify(result.metadata?.models, null, 2));
    
    if (result.talaMessage) {
      console.log('\n📝 Tala Message Preview:');
      console.log('----------------------------------------');
      console.log(result.talaMessage.substring(0, 500) + '...\n');
    }
    
    if (result.strategy) {
      console.log('📋 Strategy Overview:');
      console.log('- Campaign:', result.strategy.campaign?.name);
      console.log('- Format:', result.strategy.campaign?.format);
      console.log('- Headlines Generated:', result.strategy.creative?.headlines?.length || 0);
      console.log('- Implementation Steps:', result.strategy.implementation?.immediateActions?.length || 0);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testMultiAgent();