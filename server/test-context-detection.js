/**
 * Test script for CMO Context Detection
 */

import { contextDetector } from './services/cmo/ContextDetector.js';
import { contextAwareChat } from './services/cmo/ContextAwareChat.js';

console.log('🧪 Testing CMO Context Detection System\n');

const testMessages = [
  // SEO focused messages
  {
    message: "How do I improve my title tags for better SEO rankings?",
    expectedContext: 'seo',
    description: 'SEO - Title tags'
  },
  {
    message: "I need to optimize meta descriptions and improve page speed",
    expectedContext: 'seo',
    description: 'SEO - Meta and speed'
  },
  {
    message: "What's the best way to build backlinks for my website?",
    expectedContext: 'seo',
    description: 'SEO - Backlinks'
  },
  
  // Email marketing messages
  {
    message: "My email open rates are dropping, how can I improve them?",
    expectedContext: 'email',
    description: 'Email - Open rates'
  },
  {
    message: "I want to create an abandoned cart email campaign",
    expectedContext: 'email',
    description: 'Email - Abandoned cart'
  },
  {
    message: "How do I segment my email list for better personalization?",
    expectedContext: 'email',
    description: 'Email - Segmentation'
  },
  
  // Social media messages
  {
    message: "When is the best time to post on Instagram for maximum engagement?",
    expectedContext: 'social',
    description: 'Social - Instagram timing'
  },
  {
    message: "I need help creating a social media content calendar",
    expectedContext: 'social',
    description: 'Social - Content calendar'
  },
  {
    message: "How do I increase followers on TikTok and improve engagement rate?",
    expectedContext: 'social',
    description: 'Social - TikTok growth'
  },
  
  // Direct mail messages
  {
    message: "I'm planning a postcard campaign for local customers",
    expectedContext: 'directMail',
    description: 'Direct Mail - Postcards'
  },
  {
    message: "What's the response rate for direct mail vs email marketing?",
    expectedContext: 'directMail',
    description: 'Direct Mail - Response rates'
  },
  
  // Advertising messages
  {
    message: "How do I optimize my Google Ads campaigns for better ROAS?",
    expectedContext: 'ads',
    description: 'Ads - Google Ads ROAS'
  },
  {
    message: "I need to reduce my cost per click on Facebook ads",
    expectedContext: 'ads',
    description: 'Ads - Facebook CPC'
  },
  {
    message: "What's a good quality score for PPC campaigns?",
    expectedContext: 'ads',
    description: 'Ads - Quality score'
  }
];

async function runTests() {
  let correctPredictions = 0;
  
  for (const test of testMessages) {
    const result = await contextDetector.detectMarketingContext(test.message);
    
    const isCorrect = result.primaryContext === test.expectedContext;
    correctPredictions += isCorrect ? 1 : 0;
    
    console.log(`\n📝 Test: ${test.description}`);
    console.log(`Message: "${test.message}"`);
    console.log(`Expected: ${test.expectedContext}`);
    console.log(`Detected: ${result.primaryContext || 'none'}`);
    console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`Status: ${isCorrect ? '✅ PASS' : '❌ FAIL'}`);
    
    if (result.entities.length > 0) {
      console.log(`Entities: ${result.entities.map(e => `${e.value} (${e.type})`).join(', ')}`);
    }
    
    if (result.intent) {
      console.log(`Intent: ${result.intent}`);
    }
    
    if (result.suggestedTools.length > 0) {
      console.log(`Tools: ${result.suggestedTools.slice(0, 3).join(', ')}`);
    }
  }
  
  const accuracy = (correctPredictions / testMessages.length * 100).toFixed(1);
  console.log(`\n📊 Overall Accuracy: ${accuracy}% (${correctPredictions}/${testMessages.length})`);
  
  // Test context switching recommendations
  console.log('\n\n🔄 Testing Context Switch Recommendations\n');
  
  const switchTests = [
    {
      currentMode: 'cmo',
      currentSubMode: 'email',
      message: "I need to improve my website's search engine rankings",
      expectedSwitch: true,
      expectedTarget: 'seo'
    },
    {
      currentMode: 'cmo',
      currentSubMode: 'seo',
      message: "Let me check my keyword rankings real quick",
      expectedSwitch: false,
      expectedTarget: 'seo'
    }
  ];
  
  for (const test of switchTests) {
    const result = await contextAwareChat.processMessage(
      test.message,
      test.currentMode,
      test.currentSubMode,
      'test-user'
    );
    
    const hasRecommendation = result.switchRecommendation !== null;
    const targetCorrect = result.switchRecommendation?.targetSubMode === test.expectedTarget;
    
    console.log(`\nCurrent: ${test.currentSubMode} → Expected: ${test.expectedTarget}`);
    console.log(`Message: "${test.message}"`);
    console.log(`Switch recommended: ${hasRecommendation ? 'Yes' : 'No'}`);
    
    if (hasRecommendation) {
      console.log(`Target: ${result.switchRecommendation.targetSubMode}`);
      console.log(`Type: ${result.switchRecommendation.type}`);
      console.log(`Reason: ${result.switchRecommendation.reason}`);
    }
    
    console.log(`Result: ${(hasRecommendation === test.expectedSwitch && (!test.expectedSwitch || targetCorrect)) ? '✅ PASS' : '❌ FAIL'}`);
  }
  
  // Show context insights
  console.log('\n\n📈 Context Insights\n');
  const insights = contextDetector.getContextInsights();
  console.log('Insights:', JSON.stringify(insights, null, 2));
}

// Run the tests
runTests().catch(console.error);