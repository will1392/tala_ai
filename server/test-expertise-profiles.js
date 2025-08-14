/**
 * Test script for expertise profiles system
 */

import ExpertiseProfiles from './services/expertise/ExpertiseProfiles.js';

async function testExpertiseProfiles() {
  console.log('🎯 Testing Expertise Profiles System...\n');
  
  const profiles = new ExpertiseProfiles();
  const testUserId = 'test-user-profiles-123';
  
  // Test 1: Create detailed profile
  console.log('1. Testing profile creation...');
  
  const mockAssessment = {
    level: 'intermediate',
    confidence: 0.7,
    areas: {
      seo: { score: 0.8, confidence: 0.9 },
      email: { score: 0.4, confidence: 0.6 },
      social: { score: 0.7, confidence: 0.8 },
      ppc: { score: 0.3, confidence: 0.5 }
    },
    industries: ['ecommerce', 'saas'],
    tools: ['google-analytics', 'mailchimp', 'hootsuite'],
    goals: ['increase-traffic', 'improve-conversions'],
    learningStyle: 'visual'
  };
  
  try {
    const profile = await profiles.createDetailedProfile(testUserId, mockAssessment);
    console.log('   ✅ Profile created successfully');
    console.log(`   📊 Overall level: ${profile.overall_level}`);
    console.log(`   🎨 Learning style: ${profile.preferred_learning_style}`);
    console.log(`   🛠️ Technical comfort: ${profile.technical_comfort}`);
    console.log(`   🎯 Priority channels: ${profile.priority_channels.join(', ')}`);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  // Test 2: Topic expertise lookup
  console.log('\n2. Testing topic expertise...');
  
  const testTopics = ['seo', 'keyword-research', 'email-campaigns', 'google-ads', 'social-media'];
  
  for (const topic of testTopics) {
    try {
      const expertise = await profiles.getTopicExpertise(testUserId, topic);
      console.log(`   📈 ${topic}: Level ${expertise.level}, Confidence ${expertise.confidence.toFixed(2)} (${expertise.source})`);
    } catch (error) {
      console.log(`   ❌ Error for ${topic}: ${error.message}`);
    }
  }
  
  // Test 3: Channel mapping
  console.log('\n3. Testing channel mapping...');
  
  const mappingTests = [
    'seo',
    'keyword-research', 
    'on-page-seo',
    'email-campaigns',
    'subject-lines',
    'social-media',
    'content-strategy',
    'google-ads',
    'conversion-tracking',
    'ab-testing'
  ];
  
  mappingTests.forEach(topic => {
    const channel = profiles.mapTopicToChannel(topic);
    console.log(`   🔗 ${topic} → ${channel}`);
  });
  
  // Test 4: Communication preferences
  console.log('\n4. Testing communication preferences...');
  
  try {
    const prefs = await profiles.getCommunicationPreferences(testUserId);
    console.log('   ✅ Communication preferences retrieved');
    console.log(`   🎨 Learning style: ${prefs.learning_style}`);
    console.log(`   🔧 Technical level: ${prefs.technical_level}`);
    console.log(`   📚 Detail preference: ${prefs.detail_preference}`);
    console.log(`   ⚡ Pace: ${prefs.pace}`);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  // Test 5: Channel recommendations
  console.log('\n5. Testing channel recommendations...');
  
  try {
    const recommendations = await profiles.getChannelRecommendations(testUserId);
    console.log(`   ✅ Found ${recommendations.length} recommendations`);
    
    recommendations.forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec.channel} (${rec.type}) - ${rec.priority} priority`);
      console.log(`      "${rec.recommendation}"`);
    });
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  // Test 6: Update channel expertise
  console.log('\n6. Testing channel expertise updates...');
  
  const interactionTests = [
    { topic: 'seo', data: { success: true, timeToComplete: 5000 } },
    { topic: 'email-campaigns', data: { confusion: true, timeToComplete: 15000 } },
    { topic: 'social-media', data: { success: true, timeToComplete: 3000 } }
  ];
  
  for (const test of interactionTests) {
    try {
      const success = await profiles.updateChannelExpertise(testUserId, test.topic, test.data);
      console.log(`   ✅ Updated ${test.topic}: ${success ? 'Success' : 'Failed'}`);
    } catch (error) {
      console.log(`   ❌ Error updating ${test.topic}: ${error.message}`);
    }
  }
  
  // Test 7: Expertise summary
  console.log('\n7. Testing expertise summary...');
  
  try {
    const summary = await profiles.getExpertiseSummary(testUserId);
    console.log('   ✅ Summary generated');
    console.log(`   📊 Overall level: ${summary.overall_level}`);
    console.log(`   💪 Strongest channels: ${summary.strongest_channels.map(c => c.channel).join(', ')}`);
    console.log(`   📈 Weakest channels: ${summary.weakest_channels.map(c => c.channel).join(', ')}`);
    console.log(`   🎨 Learning style: ${summary.learning_style}`);
    console.log(`   🔧 Technical comfort: ${summary.technical_comfort}`);
    console.log(`   📋 Recommendations: ${summary.recommendations_count}`);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  // Test 8: Learning style recommendations
  console.log('\n8. Testing learning style detection...');
  
  const learningStyles = ['visual', 'auditory', 'kinesthetic', 'reading'];
  
  learningStyles.forEach(style => {
    const info = profiles.getLearningStyleRecommendations(style);
    console.log(`   🎨 ${style.toUpperCase()}:`);
    console.log(`      Approach: ${info.approach}`);
    console.log(`      Content types: ${info.contentTypes.join(', ')}`);
    console.log(`      Tips: ${info.tips.length} recommendations`);
  });
  
  // Test 9: Industry and tool analysis
  console.log('\n9. Testing industry/tool analysis...');
  
  console.log('   🏢 Industries supported:');
  Object.keys(profiles.industries).forEach(industry => {
    const areas = profiles.industries[industry];
    console.log(`      ${industry}: ${areas.join(', ')}`);
  });
  
  console.log('\n   🛠️ Marketing tools by category:');
  Object.entries(profiles.marketingTools).forEach(([category, tools]) => {
    console.log(`      ${category}: ${tools.length} tools`);
  });
  
  console.log('\n✨ Expertise Profiles System test completed!');
}

// Run the test
testExpertiseProfiles().catch(console.error);