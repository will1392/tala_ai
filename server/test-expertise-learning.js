/**
 * Test script for expertise learning system
 */

import ExpertiseLearning from './services/expertise/ExpertiseLearning.js';

async function testExpertiseLearning() {
  console.log('🧠 Testing Expertise Learning System...\n');
  
  const learning = new ExpertiseLearning();
  const testUserId = 'test-user-123';
  
  // Test 1: Track interactions showing confusion
  console.log('1. Testing confusion detection...');
  
  const confusionInteractions = [
    {
      message: "I don't understand what CTR means",
      response: "CTR stands for Click-Through Rate...",
      topic: 'ppc',
      duration: 15000
    },
    {
      message: "Can you explain this more simply?",
      response: "Sure, let me break it down...",
      topic: 'seo',
      duration: 8000
    },
    {
      message: "This is too complicated for me",
      response: "Let me simplify that...",
      topic: 'analytics',
      duration: 12000
    }
  ];
  
  for (const interaction of confusionInteractions) {
    try {
      const result = await learning.trackInteraction(testUserId, interaction);
      console.log(`   ✅ Tracked interaction: ${result.analysis.comprehensionLevel}`);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  // Test 2: Check for adjustment
  console.log('\n2. Checking for adjustment...');
  try {
    const adjustment = await learning.checkForAdjustment(testUserId);
    console.log(`   Adjustment needed: ${adjustment.needed}`);
    if (adjustment.needed) {
      console.log(`   Suggestion: ${adjustment.suggestion}`);
      console.log(`   Reason: ${adjustment.reason}`);
      console.log(`   Confidence: ${adjustment.confidence}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  // Test 3: Track mastery signals
  console.log('\n3. Testing mastery detection...');
  
  const masteryInteractions = [
    {
      message: "I already know about keyword research",
      response: "Great! Let's move to advanced strategies...",
      topic: 'seo',
      duration: 3000
    },
    {
      message: "Can we skip the basics and go to advanced PPC?",
      response: "Absolutely, let's dive into advanced bidding...",
      topic: 'ppc',
      duration: 2000
    },
    {
      message: "I'm familiar with attribution modeling",
      response: "Perfect, let's explore multi-touch attribution...",
      topic: 'analytics',
      duration: 4000
    }
  ];
  
  for (const interaction of masteryInteractions) {
    try {
      const result = await learning.trackInteraction(testUserId + '-advanced', interaction);
      console.log(`   ✅ Tracked interaction: ${result.analysis.comprehensionLevel}`);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  // Test 4: Get learning insights
  console.log('\n4. Testing learning insights...');
  try {
    const insights = await learning.getLearningInsights(testUserId);
    console.log(`   Has data: ${insights.hasData}`);
    if (insights.hasData) {
      console.log(`   Current level: ${insights.currentLevel}`);
      console.log(`   Strengths: ${insights.strengths.length}`);
      console.log(`   Weaknesses: ${insights.weaknesses.length}`);
      console.log(`   Recommendations: ${insights.recommendations.length}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  // Test 5: Text analysis
  console.log('\n5. Testing text analysis...');
  
  const testTexts = [
    "I don't understand what you mean by conversion funnel",
    "Can we dive deeper into advanced attribution modeling?",
    "That makes perfect sense, thanks for explaining!"
  ];
  
  for (const text of testTexts) {
    const confusionScore = learning.calculateIndicatorScore(text, learning.indicators.confusion);
    const masteryScore = learning.calculateIndicatorScore(text, learning.indicators.mastery);
    const successScore = learning.calculateIndicatorScore(text, learning.indicators.success);
    
    console.log(`   Text: "${text}"`);
    console.log(`   Confusion: ${confusionScore.toFixed(2)}, Mastery: ${masteryScore.toFixed(2)}, Success: ${successScore.toFixed(2)}`);
  }
  
  console.log('\n✨ Expertise Learning System test completed!');
}

// Run the test
testExpertiseLearning().catch(console.error);