/**
 * Test enhanced CMO response generation
 */

import { cmoAssistant } from './services/cmo/CMOAssistant.js';

console.log('🧪 Testing Enhanced CMO Response System\n');

const testQueries = [
  {
    query: "How can I improve my email open rates? They've dropped from 25% to 15% last month.",
    context: { expertise: 'intermediate' },
    description: 'Email optimization with metrics'
  },
  {
    query: "I need to create title tags for my e-commerce site selling yoga mats",
    context: { expertise: 'beginner' },
    description: 'SEO content creation'
  },
  {
    query: "What's the best time to post on Instagram for maximum engagement?",
    context: { expertise: 'intermediate' },
    description: 'Social media timing'
  },
  {
    query: "I want to optimize my Google Ads campaigns for better ROAS",
    context: { expertise: 'expert' },
    description: 'PPC optimization'
  },
  {
    query: "Planning a postcard campaign for local customers, what's the typical response rate?",
    context: { expertise: 'beginner' },
    description: 'Direct mail basics'
  }
];

async function runTests() {
  // Initialize CMO Assistant
  await cmoAssistant.initialize();
  
  for (const test of testQueries) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📝 Test: ${test.description}`);
    console.log(`Query: "${test.query}"`);
    console.log(`Expertise: ${test.context.expertise}`);
    console.log(`${'='.repeat(80)}\n`);
    
    try {
      const response = await cmoAssistant.processQuery(test.query, test.context);
      
      // Display context detection
      console.log('🎯 Context Detection:');
      console.log(`- Primary Context: ${response.context || 'none'}`);
      console.log(`- Intent: ${response.intent || 'general'}`);
      console.log(`- Confidence: ${(response.confidence * 100).toFixed(1)}%`);
      
      // Display metrics and benchmarks
      if (response.metrics) {
        console.log('\n📊 Relevant Metrics:');
        if (response.metrics.mentioned) {
          console.log(`- Mentioned: ${response.metrics.mentioned.join(', ')}`);
        }
        if (response.metrics.key) {
          console.log(`- Key Metrics: ${response.metrics.key.join(', ')}`);
        }
      }
      
      if (response.benchmarks) {
        console.log('\n📈 Industry Benchmarks:');
        Object.entries(response.benchmarks.metrics || {}).forEach(([metric, values]) => {
          console.log(`- ${metric}: Good ${values.good}, Excellent ${values.excellent}`);
        });
      }
      
      // Display recommendations
      if (response.recommendations && response.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        response.recommendations.slice(0, 3).forEach((rec, idx) => {
          console.log(`${idx + 1}. [${rec.priority}] ${rec.action}`);
          if (rec.reason) {
            console.log(`   → ${rec.reason}`);
          }
        });
      }
      
      // Display examples
      if (response.examples && response.examples.length > 0) {
        console.log('\n📝 Examples:');
        response.examples.slice(0, 2).forEach(example => {
          console.log(`- ${example.title}: ${example.description}`);
        });
      }
      
      // Display next steps
      if (response.nextSteps && response.nextSteps.length > 0) {
        console.log('\n👉 Next Steps:');
        response.nextSteps.slice(0, 3).forEach(step => {
          console.log(`${step.order}. ${step.action} (${step.timeframe})`);
        });
      }
      
      // Display suggested tools
      if (response.suggestedTools && response.suggestedTools.length > 0) {
        console.log('\n🛠️ Suggested Tools:');
        console.log(response.suggestedTools.join(', '));
      }
      
      // Display resources
      if (response.resources && response.resources.length > 0) {
        console.log('\n📚 Resources:');
        response.resources.slice(0, 3).forEach(resource => {
          console.log(`- [${resource.type}] ${resource.title}`);
        });
      }
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }
  
  // Test expertise variations
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('🎓 Testing Expertise Variations');
  console.log(`${'='.repeat(80)}\n`);
  
  const expertiseQuery = "How do I improve my SEO rankings?";
  const expertiseLevels = ['beginner', 'intermediate', 'expert'];
  
  for (const expertise of expertiseLevels) {
    console.log(`\n📚 ${expertise.toUpperCase()} Response:`);
    const response = await cmoAssistant.processQuery(expertiseQuery, { expertise });
    
    if (response.recommendations) {
      console.log('Recommendations:');
      response.recommendations.slice(0, 2).forEach(rec => {
        console.log(`- ${rec.action}`);
        if (rec.explanation) {
          console.log(`  (${rec.explanation})`);
        }
      });
    }
  }
}

// Run the tests
runTests().catch(console.error);