/**
 * Test script for CMOAssistant expertise integration
 */

import { cmoAssistant } from './services/cmo/CMOAssistant.js';

async function testCMOExpertiseIntegration() {
  console.log('🎯 Testing CMOAssistant Expertise Integration...\n');
  
  const testUserId = 'test-user-cmo-123';
  
  // Test 1: Initialize CMO Assistant
  console.log('1. Initializing CMO Assistant...');
  try {
    await cmoAssistant.initialize();
    console.log('   ✅ CMO Assistant initialized successfully');
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return;
  }
  
  // Test 2: Check if user needs expertise assessment
  console.log('\n2. Checking expertise assessment need...');
  try {
    const needsAssessment = await cmoAssistant.needsExpertiseAssessment(testUserId);
    console.log(`   📋 User needs assessment: ${needsAssessment}`);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  // Test 3: Create user expertise profile
  console.log('\n3. Creating user expertise profile...');
  const mockAssessment = {
    level: 'intermediate',
    confidence: 0.8,
    areas: {
      seo: { score: 0.9, confidence: 0.85 },
      email: { score: 0.6, confidence: 0.7 },
      social: { score: 0.8, confidence: 0.75 },
      ppc: { score: 0.4, confidence: 0.6 }
    },
    industries: ['ecommerce'],
    tools: ['google-analytics', 'mailchimp'],
    goals: ['increase-traffic', 'improve-conversions'],
    learningStyle: 'visual'
  };
  
  try {
    const result = await cmoAssistant.updateUserExpertise(testUserId, mockAssessment);
    console.log(`   ✅ Profile created: ${result.success}`);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  // Test 4: Process messages with different expertise levels
  console.log('\n4. Testing expertise-aware message processing...');
  
  const testMessages = [
    {
      message: "How do I improve my SEO?",
      expectedTopic: 'seo',
      description: 'Basic SEO question'
    },
    {
      message: "I don't understand what meta descriptions are",
      expectedTopic: 'seo',
      description: 'Beginner confusion signal'
    },
    {
      message: "Can you explain advanced email segmentation strategies?",
      expectedTopic: 'email',
      description: 'Advanced request'
    },
    {
      message: "What's the best way to optimize my PPC campaigns?",
      expectedTopic: 'ppc',
      description: 'PPC optimization'
    }
  ];
  
  for (const test of testMessages) {
    try {
      console.log(`\n   Testing: "${test.message}"`);
      const response = await cmoAssistant.processMessage(test.message, testUserId);
      
      console.log(`   📝 Topic detected: ${response.context || 'unknown'}`);
      console.log(`   🎯 Intent: ${response.intent || 'unknown'}`);
      console.log(`   📚 Adaptation source: ${response.adaptationSource || 'none'}`);
      console.log(`   🔧 Quick actions: ${response.quickActions?.length || 0}`);
      console.log(`   💡 Learning recs: ${response.learningRecommendations?.length || 0}`);
      
      if (response.content) {
        const preview = response.content.substring(0, 100) + '...';
        console.log(`   📄 Response preview: ${preview}`);
      }
      
      console.log('   ✅ Message processed successfully');
    } catch (error) {
      console.log(`   ❌ Error processing "${test.message}": ${error.message}`);
    }
  }
  
  // Test 5: Get expertise summary
  console.log('\n5. Testing expertise summary...');
  try {
    const summary = await cmoAssistant.getUserExpertiseSummary(testUserId);
    if (summary) {
      console.log('   ✅ Expertise summary retrieved');
      console.log(`   📊 Overall level: ${summary.overall_level}`);
      console.log(`   💪 Strongest: ${summary.strongest_channels?.map(c => c.channel).join(', ') || 'none'}`);
      console.log(`   📈 Weakest: ${summary.weakest_channels?.map(c => c.channel).join(', ') || 'none'}`);
      console.log(`   🎨 Learning style: ${summary.learning_style}`);
    } else {
      console.log('   ⚠️ No expertise summary available');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  // Test 6: Get personalized recommendations
  console.log('\n6. Testing personalized recommendations...');
  try {
    const recommendations = await cmoAssistant.getPersonalizedRecommendations(testUserId);
    console.log(`   ✅ Found ${recommendations.length} recommendations`);
    
    recommendations.slice(0, 3).forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec.channel} (${rec.type}) - ${rec.priority} priority`);
      console.log(`      "${rec.recommendation}"`);
    });
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  // Test 7: Get learning insights
  console.log('\n7. Testing learning insights...');
  try {
    const insights = await cmoAssistant.getLearningInsights(testUserId);
    console.log(`   📊 Has learning data: ${insights.hasData}`);
    
    if (insights.hasData) {
      console.log(`   📈 Current level: ${insights.currentLevel}`);
      console.log(`   💪 Strengths: ${insights.strengths?.length || 0}`);
      console.log(`   📚 Weaknesses: ${insights.weaknesses?.length || 0}`);
      console.log(`   💡 Recommendations: ${insights.recommendations?.length || 0}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  // Test 8: Test different expertise levels
  console.log('\n8. Testing different expertise level responses...');
  
  const expertiseLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
  const testQuery = "How do I optimize my title tags?";
  
  for (const level of expertiseLevels) {
    try {
      console.log(`\n   Testing ${level} level response...`);
      
      // Mock expertise for testing
      const mockExpertise = {
        level,
        confidence: 0.8,
        channel_expertise: { seo: { level: level === 'beginner' ? 1 : level === 'expert' ? 4 : 2.5 } },
        learning_style: 'visual',
        technical_comfort: level === 'expert' ? 0.9 : level === 'beginner' ? 0.3 : 0.6
      };
      
      // Test template retrieval
      const template = cmoAssistant.getAdaptiveTemplate('seo', 'title_tags', level);
      if (template) {
        console.log(`   📝 Found ${level} template for SEO title tags`);
        console.log(`   💡 Intro: ${template.intro?.substring(0, 60)}...`);
      } else {
        console.log(`   ⚠️ No template found for ${level} level`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error testing ${level}: ${error.message}`);
    }
  }
  
  // Test 9: Test confusion and mastery signal detection
  console.log('\n9. Testing signal detection...');
  
  const signalTests = [
    { message: "I don't understand what CTR means", expected: 'confusion' },
    { message: "Can you explain this more simply?", expected: 'confusion' },
    { message: "I already know about keyword research", expected: 'mastery' },
    { message: "Can we skip the basics?", expected: 'mastery' },
    { message: "That makes perfect sense!", expected: 'neutral' },
    { message: "How do I set up tracking?", expected: 'neutral' }
  ];
  
  signalTests.forEach(test => {
    const hasConfusion = cmoAssistant.hasConfusionSignals(test.message);
    const difficulty = cmoAssistant.assessMessageDifficulty(test.message);
    
    console.log(`   "${test.message}"`);
    console.log(`   🤔 Confusion detected: ${hasConfusion}`);
    console.log(`   📊 Difficulty assessed: ${difficulty}`);
    console.log('');
  });
  
  console.log('✨ CMOAssistant Expertise Integration test completed!');
}

// Run the test
testCMOExpertiseIntegration().catch(console.error);