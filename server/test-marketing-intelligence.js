/**
 * Test Marketing Intelligence Implementation
 */

import { marketingIntelligence } from './services/cmo/MarketingIntelligence.js';
import { conversationFlow } from './services/cmo/ConversationFlow.js';

async function testMarketingIntelligence() {
  console.log('🧪 Testing Marketing Intelligence Implementation...\n');
  
  const userId = 'test-user-123';
  
  try {
    // Simulate conversation with marketing data
    console.log('📝 Simulating marketing conversation...');
    
    // Business context
    await conversationFlow.processMessage(userId, "I run an e-commerce store selling organic skincare", {
      mode: 'cmo',
      expertise: 'intermediate'
    });
    
    // SEO metrics
    await conversationFlow.processMessage(userId, "My SEO traffic is up 25% this month", {
      mode: 'cmo',
      subMode: 'seo'
    });
    
    // Email metrics
    await conversationFlow.processMessage(userId, "Email open rates are at 18% but CTR is only 2%", {
      mode: 'cmo',
      subMode: 'email'
    });
    
    // Social media challenge
    await conversationFlow.processMessage(userId, "I'm struggling with social media engagement", {
      mode: 'cmo',
      subMode: 'social'
    });
    
    // Test health assessment
    console.log('\n🏥 Testing Marketing Health Assessment...');
    const health = await marketingIntelligence.analyzeMarketingHealth(userId);
    
    console.log('\n📊 Marketing Health Results:');
    console.log('Overall Score:', health.summary.overallHealth.score);
    console.log('Status:', health.summary.overallHealth.label);
    console.log('Active Channels:', health.summary.overallHealth.activeChannels);
    console.log('Coverage:', health.summary.overallHealth.coverage + '%');
    
    console.log('\n💔 Identified Gaps:');
    health.gaps.forEach(gap => {
      console.log(`- ${gap.description} (${gap.severity})`);
      console.log(`  → ${gap.recommendation}`);
    });
    
    console.log('\n✨ Top Opportunities:');
    health.opportunities.slice(0, 3).forEach(opp => {
      console.log(`- ${opp.title} (${opp.priority})`);
      if (opp.description) {
        console.log(`  ${opp.description}`);
      }
    });
    
    console.log('\n🔗 Cross-Channel Insights:');
    health.crossChannelInsights.forEach(insight => {
      console.log(`- ${insight.insight}`);
      insight.actions.forEach(action => {
        console.log(`  • ${action}`);
      });
    });
    
    // Test proactive suggestions
    console.log('\n💡 Proactive Suggestions:');
    const suggestions = await marketingIntelligence.generateProactiveSuggestions(userId);
    suggestions.forEach(sugg => {
      console.log(`- ${sugg.message}`);
      console.log(`  Action: ${sugg.action}`);
    });
    
    // Test API endpoints
    console.log('\n🌐 Testing API Endpoints...');
    
    // Test health endpoint
    const healthResponse = await fetch('http://localhost:3001/api/cmo/health?userId=' + userId);
    if (healthResponse.ok) {
      const data = await healthResponse.json();
      console.log('✅ Health endpoint working');
      console.log('   Channels analyzed:', data.health.summary.channelsAnalyzed.join(', '));
    } else {
      console.log('❌ Health endpoint failed:', healthResponse.status);
    }
    
    // Test suggestions endpoint
    const suggestionsResponse = await fetch('http://localhost:3001/api/cmo/suggestions?userId=' + userId);
    if (suggestionsResponse.ok) {
      const data = await suggestionsResponse.json();
      console.log('✅ Suggestions endpoint working');
      console.log('   Suggestions count:', data.suggestions.length);
    } else {
      console.log('❌ Suggestions endpoint failed:', suggestionsResponse.status);
    }
    
    // Test progress update
    const progressResponse = await fetch('http://localhost:3001/api/cmo/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        channel: 'email',
        metric: 'open_rate',
        value: '22%'
      })
    });
    
    if (progressResponse.ok) {
      console.log('✅ Progress update endpoint working');
    } else {
      console.log('❌ Progress update endpoint failed:', progressResponse.status);
    }
    
    // Test health query
    const queryResponse = await fetch('http://localhost:3001/api/cmo/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        query: 'Show my marketing health'
      })
    });
    
    if (queryResponse.ok) {
      const data = await queryResponse.json();
      console.log('✅ Health query endpoint working');
      console.log('   Response type:', data.response.context);
    } else {
      console.log('❌ Health query endpoint failed:', queryResponse.status);
    }
    
    // Cleanup
    conversationFlow.clearSession(userId);
    
    console.log('\n✅ Marketing Intelligence tests completed!');
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

// Run test
testMarketingIntelligence();