/**
 * Test CMO Conversation Flow
 */

import { cmoAssistant } from './services/cmo/CMOAssistant.js';

console.log('🧪 Testing CMO Conversation Flow System\n');

const userId = 'test-user-123';

async function simulateConversation() {
  // Initialize CMO Assistant
  await cmoAssistant.initialize();
  
  console.log('📝 Starting marketing conversation...\n');
  
  // Turn 1: Discovery
  console.log('👤 User: "I run an e-commerce store selling organic skincare products"');
  let response = await cmoAssistant.processQuery(
    "I run an e-commerce store selling organic skincare products",
    { userId, expertise: 'intermediate' }
  );
  displayConversationState(response);
  
  // Turn 2: Challenge
  console.log('\n👤 User: "My main challenge is low email open rates - around 12%"');
  response = await cmoAssistant.processQuery(
    "My main challenge is low email open rates - around 12%",
    { userId, expertise: 'intermediate' }
  );
  displayConversationState(response);
  
  // Turn 3: Deep dive
  console.log('\n👤 User: "Tell me more about subject line optimization"');
  response = await cmoAssistant.processQuery(
    "Tell me more about subject line optimization",
    { userId, expertise: 'intermediate' }
  );
  displayConversationState(response);
  
  // Turn 4: Related topic
  console.log('\n👤 User: "What about send times? When should I send emails?"');
  response = await cmoAssistant.processQuery(
    "What about send times? When should I send emails?",
    { userId, expertise: 'intermediate' }
  );
  displayConversationState(response);
  
  // Test navigation
  console.log('\n🔙 Testing navigation - going back 2 steps...');
  const navResult = await cmoAssistant.navigateBack(userId, 2);
  console.log('Navigation result:', navResult);
  
  // Process follow-up
  if (response.conversation?.followUpSuggestions?.[0]) {
    console.log('\n🔄 Processing follow-up suggestion...');
    const followUp = response.conversation.followUpSuggestions[0];
    console.log(`Selected: "${followUp.text}"`);
    
    response = await cmoAssistant.processFollowUp(userId, followUp);
    displayConversationState(response);
  }
  
  // Get conversation summary
  console.log('\n📊 Getting conversation summary...');
  const summary = await cmoAssistant.getConversationSummary(userId);
  console.log('Summary:', JSON.stringify(summary, null, 2));
}

function displayConversationState(response) {
  if (!response.conversation) {
    console.log('❌ No conversation data in response');
    return;
  }
  
  const { conversation } = response;
  
  console.log('\n--- Conversation State ---');
  console.log(`📍 Stage: ${conversation.stage}`);
  console.log(`🍞 Breadcrumbs: ${conversation.breadcrumbs.map(b => b.label).join(' > ')}`);
  
  if (conversation.memory?.businessInfo?.name) {
    console.log(`🏢 Business: ${conversation.memory.businessInfo.name}`);
  }
  
  if (conversation.memory?.previousMetrics?.length > 0) {
    console.log(`📊 Remembered metrics: ${conversation.memory.previousMetrics.map(m => m.value).join(', ')}`);
  }
  
  if (conversation.followUpSuggestions?.length > 0) {
    console.log('\n💡 Follow-up suggestions:');
    conversation.followUpSuggestions.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.text}`);
      if (s.reason) {
        console.log(`     → ${s.reason}`);
      }
    });
  }
  
  if (response.personalization) {
    console.log('\n🎯 Personalization:');
    console.log(`  Business: ${response.personalization.businessName}`);
    if (response.personalization.previousChallenges?.length > 0) {
      console.log(`  Challenges: ${response.personalization.previousChallenges.map(c => c.description).join(', ')}`);
    }
  }
}

// Run the test
simulateConversation().catch(console.error);