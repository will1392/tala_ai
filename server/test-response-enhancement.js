/**
 * Test response enhancement without requiring OpenAI
 */

import { cmoResponseEnhancer } from './services/cmo/CMOResponseEnhancer.js';
import { contextDetector } from './services/cmo/ContextDetector.js';

console.log('🧪 Testing CMO Response Enhancement System\n');

const testCases = [
  {
    message: "My email open rates dropped from 25% to 15% last month. How can I improve them?",
    baseResponse: {
      query: "email open rates improvement",
      results: [
        { title: "Subject Line Best Practices", relevance: 0.9 },
        { title: "Email Segmentation Guide", relevance: 0.8 }
      ]
    },
    context: {
      mode: 'cmo',
      subMode: 'email',
      expertise: 'intermediate'
    }
  },
  {
    message: "I need to optimize title tags for better SEO rankings",
    baseResponse: {
      query: "title tag optimization",
      results: [
        { title: "Title Tag Length Guide", relevance: 0.95 },
        { title: "SEO Best Practices", relevance: 0.85 }
      ]
    },
    context: {
      mode: 'cmo',
      subMode: 'seo',
      expertise: 'beginner'
    }
  },
  {
    message: "What's the best bidding strategy for Google Ads with a $5000 monthly budget?",
    baseResponse: {
      query: "google ads bidding strategy",
      results: [
        { title: "Bidding Strategy Guide", relevance: 0.9 }
      ]
    },
    context: {
      mode: 'cmo',
      subMode: 'ads',
      expertise: 'expert'
    }
  }
];

async function runTests() {
  for (const test of testCases) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📝 Query: "${test.message}"`);
    console.log(`Context: ${test.context.subMode} (${test.context.expertise})`);
    console.log(`${'='.repeat(80)}\n`);
    
    try {
      // First, analyze context
      const contextAnalysis = await contextDetector.detectMarketingContext(test.message);
      
      console.log('🎯 Context Analysis:');
      console.log(`- Detected: ${contextAnalysis.primaryContext || 'none'}`);
      console.log(`- Intent: ${contextAnalysis.intent}`);
      console.log(`- Confidence: ${(contextAnalysis.confidence * 100).toFixed(1)}%`);
      console.log(`- Entities: ${contextAnalysis.entities.map(e => `${e.value} (${e.type})`).join(', ') || 'none'}`);
      
      // Enhance the response
      test.context.analysis = contextAnalysis;
      const enhanced = await cmoResponseEnhancer.enhanceResponse(
        test.message,
        test.baseResponse,
        test.context
      );
      
      // Display metrics
      if (enhanced.metrics) {
        console.log('\n📊 Metrics Detected:');
        if (enhanced.metrics.mentioned) {
          console.log(`- From message: ${enhanced.metrics.mentioned.join(', ')}`);
        }
        if (enhanced.metrics.key) {
          console.log(`- Key metrics for ${test.context.subMode}: ${enhanced.metrics.key.slice(0, 3).join(', ')}`);
        }
      }
      
      // Display benchmarks
      if (enhanced.benchmarks) {
        console.log('\n📈 Industry Benchmarks:');
        const metrics = enhanced.benchmarks.metrics || {};
        Object.entries(metrics).slice(0, 3).forEach(([metric, values]) => {
          console.log(`- ${metric}:`);
          console.log(`  • Good: ${values.good}`);
          console.log(`  • Excellent: ${values.excellent}`);
        });
        
        if (enhanced.benchmarks.tips) {
          console.log('\n💡 Quick Tips:');
          enhanced.benchmarks.tips.slice(0, 2).forEach(tip => {
            console.log(`- ${tip}`);
          });
        }
      }
      
      // Display recommendations
      if (enhanced.recommendations && enhanced.recommendations.length > 0) {
        console.log('\n🎯 Actionable Recommendations:');
        enhanced.recommendations.forEach((rec, idx) => {
          console.log(`${idx + 1}. [${rec.priority.toUpperCase()}] ${rec.action}`);
          console.log(`   → ${rec.reason}`);
          if (rec.explanation) {
            console.log(`   💡 ${rec.explanation}`);
          }
        });
      }
      
      // Display next steps
      if (enhanced.nextSteps && enhanced.nextSteps.length > 0) {
        console.log('\n👉 Next Steps:');
        enhanced.nextSteps.forEach(step => {
          console.log(`${step.order}. ${step.action}`);
          console.log(`   ⏱️ ${step.timeframe} - ${step.complexity}`);
        });
      }
      
      // Display related topics
      if (enhanced.relatedTopics && enhanced.relatedTopics.length > 0) {
        console.log('\n🔗 Related Topics to Explore:');
        enhanced.relatedTopics.forEach(topic => {
          console.log(`- ${topic.topic} (${(topic.relevance * 100).toFixed(0)}% relevant)`);
          console.log(`  → ${topic.suggestion}`);
        });
      }
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }
  
  // Test expertise variations on same query
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('🎓 EXPERTISE VARIATIONS TEST');
  console.log(`${'='.repeat(80)}`);
  
  const query = "How do I improve my email click-through rates?";
  const baseResponse = {
    query: "improve email CTR",
    results: [{ title: "Email CTR Guide", relevance: 0.9 }]
  };
  
  for (const expertise of ['beginner', 'intermediate', 'expert']) {
    console.log(`\n\n📚 ${expertise.toUpperCase()} Level Response:`);
    console.log('-'.repeat(40));
    
    const enhanced = await cmoResponseEnhancer.enhanceResponse(
      query,
      baseResponse,
      { mode: 'cmo', subMode: 'email', expertise }
    );
    
    // Show how recommendations differ
    if (enhanced.recommendations) {
      console.log('Recommendations:');
      enhanced.recommendations.slice(0, 2).forEach(rec => {
        console.log(`- ${rec.action}`);
        if (rec.explanation && expertise === 'beginner') {
          console.log(`  (Explained: ${rec.explanation})`);
        }
      });
    }
    
    // Show metadata
    if (enhanced.metadata) {
      console.log(`\nComplexity: ${enhanced.metadata.expertise}`);
    }
  }
}

// Run the tests
runTests().catch(console.error);