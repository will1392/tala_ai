/**
 * Test script for CMO Assistant functionality
 */

import { cmoChatHandler } from './services/cmo/CMOChatHandler.js';
import { cmoKnowledgeBase } from './services/cmo/CMOKnowledgeBase.js';

// Test queries for different marketing scenarios
const testQueries = [
  // SEO queries
  {
    message: "How do I write a good title tag for SEO?",
    subMode: 'seo',
    expected: 'title tag guidance'
  },
  {
    message: "What's the optimal meta description length?",
    subMode: 'seo',
    expected: 'meta description info'
  },
  {
    message: "Help me with keyword research for organic dog food",
    subMode: 'seo',
    expected: 'keyword research guidance'
  },
  
  // Email queries
  {
    message: "Write a subject line for a summer sale email",
    subMode: 'email',
    expected: 'subject line templates'
  },
  {
    message: "How can I improve my email open rates?",
    subMode: 'email',
    expected: 'email optimization tips'
  },
  {
    message: "Create a welcome email series",
    subMode: 'email',
    expected: 'email series template'
  },
  
  // Social media queries
  {
    message: "What are the best times to post on Instagram?",
    subMode: 'social',
    expected: 'social media timing'
  },
  {
    message: "Generate hashtags for a fitness brand",
    subMode: 'social',
    expected: 'hashtag suggestions'
  },
  {
    message: "How do I create a content calendar?",
    subMode: 'social',
    expected: 'content planning guidance'
  },
  
  // Ads queries
  {
    message: "Help me write Google Ads copy for running shoes",
    subMode: 'ads',
    expected: 'ad copy templates'
  },
  {
    message: "What's a good CTR for Facebook ads?",
    subMode: 'ads',
    expected: 'performance benchmarks'
  },
  {
    message: "How do I improve my Quality Score?",
    subMode: 'ads',
    expected: 'quality score guidance'
  },
  
  // General marketing queries
  {
    message: "What marketing channels should I focus on for a new SaaS product?",
    subMode: null,
    expected: 'channel recommendations'
  },
  {
    message: "How do I create a marketing strategy?",
    subMode: null,
    expected: 'strategy guidance'
  }
];

// Quick action tests
const quickActionTests = [
  {
    actionId: 'title-checker',
    params: { title: 'Best SEO Tools 2024 - Complete Guide to Search Engine Optimization | BrandName' },
    expected: 'title analysis'
  },
  {
    actionId: 'subject-tester',
    params: { subject: '🎉 Last Chance! 50% OFF Everything - Ends Tonight!' },
    expected: 'subject line analysis'
  },
  {
    actionId: 'hashtag-generator',
    params: { content: 'Just launched our new organic smoothie line! Packed with nutrients and delicious flavors.' },
    expected: 'hashtag suggestions'
  }
];

async function testCMOAssistant() {
  console.log('🧪 Testing CMO Assistant\n');
  
  try {
    // Initialize
    console.log('📚 Initializing CMO systems...');
    await cmoChatHandler.initialize();
    console.log('✅ CMO Assistant initialized\n');
    
    // Test knowledge base stats
    const stats = cmoKnowledgeBase.getStats();
    console.log('📊 Knowledge Base Stats:');
    console.log(`Total items: ${stats.totalItems}`);
    console.log(`Categories: ${Object.keys(stats.categories).join(', ')}\n`);
    
    // Test queries
    console.log('🔍 Testing Marketing Queries:\n');
    
    for (const test of testQueries) {
      console.log(`\n📝 Query: "${test.message}"`);
      console.log(`Mode: CMO${test.subMode ? ` / ${test.subMode}` : ' (general)'}`);
      
      const response = await cmoChatHandler.processMessage(test.message, {
        conversationId: 'test-123',
        userId: 'test-user',
        subMode: test.subMode
      });
      
      console.log(`\n✅ Response received:`);
      console.log(`Query Type: ${response.metadata.queryType}`);
      console.log(`Confidence: ${(response.metadata.confidence * 100).toFixed(1)}%`);
      
      if (response.knowledge && response.knowledge.length > 0) {
        console.log(`\n📚 Knowledge Used (${response.knowledge.length} items):`);
        response.knowledge.forEach((k, i) => {
          console.log(`  ${i + 1}. ${k.title} (${k.category}) - Score: ${k.score.toFixed(3)}`);
        });
      }
      
      if (response.suggestions && response.suggestions.length > 0) {
        console.log(`\n💡 Suggestions:`);
        response.suggestions.forEach(s => {
          console.log(`  • ${s.message}`);
        });
      }
      
      if (response.quickActions && response.quickActions.length > 0) {
        console.log(`\n⚡ Quick Actions:`);
        response.quickActions.forEach(a => {
          console.log(`  • ${a.icon} ${a.label} (${a.id})`);
        });
      }
      
      console.log(`\n📄 Response Preview:`);
      console.log(response.response.substring(0, 200) + '...\n');
      console.log('---');
    }
    
    // Test quick actions
    console.log('\n\n⚡ Testing Quick Actions:\n');
    
    for (const test of quickActionTests) {
      console.log(`\n🔧 Action: ${test.actionId}`);
      console.log(`Params:`, test.params);
      
      const result = await cmoChatHandler.assistant.executeQuickAction(
        test.actionId,
        test.params
      );
      
      console.log(`\n✅ Result:`);
      console.log(JSON.stringify(result, null, 2));
      console.log('---');
    }
    
    // Test knowledge search
    console.log('\n\n🔎 Testing Knowledge Search:\n');
    
    const searchTests = [
      { query: 'email subject line best practices', category: 'email' },
      { query: 'improve SEO rankings', category: 'seo' },
      { query: 'social media engagement', category: null }
    ];
    
    for (const search of searchTests) {
      console.log(`\nSearching: "${search.query}"${search.category ? ` in ${search.category}` : ' (all categories)'}`);
      
      const results = await cmoKnowledgeBase.search(search.query, {
        category: search.category,
        limit: 3
      });
      
      if (results.length > 0) {
        console.log(`Found ${results.length} results:`);
        results.forEach((r, i) => {
          console.log(`  ${i + 1}. ${r.title} (${r.category}) - Score: ${r.score.toFixed(3)}`);
        });
      } else {
        console.log('No results found');
      }
    }
    
    console.log('\n\n✅ All tests completed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
  }
}

// Run tests
testCMOAssistant();