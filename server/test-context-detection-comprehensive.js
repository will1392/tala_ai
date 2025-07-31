/**
 * Comprehensive Context Detection Test Suite
 * Tests single-context, context switching, ambiguous queries, and multi-channel questions
 */

import { contextDetector } from './services/cmo/ContextDetector.js';
import { cmoAssistant } from './services/cmo/CMOAssistant.js';

// Test data
const testScenarios = {
  singleContext: [
    {
      query: "How do I improve my meta descriptions?",
      expectedContext: 'seo',
      expectedIntent: 'optimize',
      description: 'Clear SEO context'
    },
    {
      query: "What's a good email open rate?",
      expectedContext: 'email',
      expectedIntent: 'analyze',
      description: 'Clear email context'
    },
    {
      query: "Should I use hashtags on LinkedIn?",
      expectedContext: 'social',
      expectedIntent: 'learn',
      description: 'Clear social context'
    },
    {
      query: "Design a postcard for my summer sale",
      expectedContext: 'directMail',
      expectedIntent: 'create',
      description: 'Clear direct mail context'
    },
    {
      query: "Set up Google Ads conversion tracking",
      expectedContext: 'ads',
      expectedIntent: 'implement',
      description: 'Clear ads context'
    }
  ],
  
  contextSwitching: [
    {
      conversation: [
        "I need help with SEO",
        "My title tags are too long",
        "Now let's talk about email marketing",
        "What's the best time to send emails?"
      ],
      expectedContexts: ['seo', 'seo', 'email', 'email'],
      description: 'Explicit context switch'
    },
    {
      conversation: [
        "Help me improve my Google rankings",
        "Also, my email click rates are low",
        "And I'm not getting social media engagement"
      ],
      expectedContexts: ['seo', 'email', 'social'],
      description: 'Rapid context switching'
    }
  ],
  
  ambiguousQueries: [
    {
      query: "How do I increase traffic?",
      possibleContexts: ['seo', 'ads', 'social'],
      description: 'Traffic could be organic or paid'
    },
    {
      query: "Improve my conversion rate",
      possibleContexts: ['seo', 'email', 'ads'],
      description: 'Conversion applies to multiple channels'
    },
    {
      query: "I need more leads",
      possibleContexts: ['seo', 'email', 'ads', 'social'],
      description: 'Lead generation is cross-channel'
    },
    {
      query: "Help with my campaign",
      possibleContexts: ['email', 'ads', 'social', 'directMail'],
      description: 'Campaign type unclear'
    },
    {
      query: "Analyze my performance",
      possibleContexts: ['seo', 'email', 'social', 'ads'],
      description: 'Performance metric unspecified'
    }
  ],
  
  multiChannelQuestions: [
    {
      query: "Should I focus on SEO or paid ads?",
      expectedContexts: ['seo', 'ads'],
      expectedIntent: 'compare',
      description: 'Comparing two channels'
    },
    {
      query: "How do I coordinate email and social media campaigns?",
      expectedContexts: ['email', 'social'],
      expectedIntent: 'integrate',
      description: 'Integration question'
    },
    {
      query: "Use my blog content for email newsletters and social posts",
      expectedContexts: ['seo', 'email', 'social'],
      expectedIntent: 'repurpose',
      description: 'Content repurposing across channels'
    },
    {
      query: "Track ROI across SEO, email, and paid search",
      expectedContexts: ['seo', 'email', 'ads'],
      expectedIntent: 'analyze',
      description: 'Cross-channel analytics'
    }
  ],
  
  edgeCases: [
    {
      query: "marketing",
      description: 'Single word query'
    },
    {
      query: "help",
      description: 'Very vague query'
    },
    {
      query: "What about that thing we discussed earlier?",
      description: 'Reference to previous context'
    },
    {
      query: "!!!urgent!!! NEED HELP WITH WEBSITE!!!",
      description: 'Emotional/urgent query'
    },
    {
      query: "Мне нужна помощь с SEO",
      description: 'Non-English query (Russian)'
    }
  ]
};

// Performance tracking
class PerformanceTracker {
  constructor() {
    this.metrics = {
      detectionTimes: [],
      cacheHits: 0,
      cacheMisses: 0,
      totalQueries: 0
    };
  }
  
  startTimer() {
    return process.hrtime.bigint();
  }
  
  endTimer(start) {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    this.metrics.detectionTimes.push(duration);
    this.metrics.totalQueries++;
    return duration;
  }
  
  recordCacheHit() {
    this.metrics.cacheHits++;
  }
  
  recordCacheMiss() {
    this.metrics.cacheMisses++;
  }
  
  getStats() {
    const times = this.metrics.detectionTimes;
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const sorted = [...times].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    
    return {
      totalQueries: this.metrics.totalQueries,
      avgDetectionTime: avg.toFixed(2) + 'ms',
      medianDetectionTime: median.toFixed(2) + 'ms',
      p95DetectionTime: p95.toFixed(2) + 'ms',
      p99DetectionTime: p99.toFixed(2) + 'ms',
      minDetectionTime: Math.min(...times).toFixed(2) + 'ms',
      maxDetectionTime: Math.max(...times).toFixed(2) + 'ms',
      cacheHitRate: ((this.metrics.cacheHits / this.metrics.totalQueries) * 100).toFixed(1) + '%'
    };
  }
}

// Test runner
async function runTests() {
  console.log('🧪 Comprehensive Context Detection Test Suite\n');
  
  const performanceTracker = new PerformanceTracker();
  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    failures: []
  };
  
  // Initialize CMO Assistant
  await cmoAssistant.initialize();
  
  // Test 1: Single-context conversations
  console.log('📝 Test 1: Single-Context Conversations');
  console.log('=====================================');
  
  for (const scenario of testScenarios.singleContext) {
    const start = performanceTracker.startTimer();
    const result = await contextDetector.detectMarketingContext(scenario.query);
    const duration = performanceTracker.endTimer(start);
    
    const passed = result.primaryContext === scenario.expectedContext;
    if (passed) {
      console.log(`✅ ${scenario.description}`);
      console.log(`   Query: "${scenario.query}"`);
      console.log(`   Detected: ${result.primaryContext} (${result.confidence.toFixed(2)} confidence)`);
      console.log(`   Time: ${duration.toFixed(2)}ms`);
      results.passed++;
    } else {
      console.log(`❌ ${scenario.description}`);
      console.log(`   Query: "${scenario.query}"`);
      console.log(`   Expected: ${scenario.expectedContext}, Got: ${result.primaryContext}`);
      console.log(`   Confidence: ${result.confidence.toFixed(2)}`);
      results.failed++;
      results.failures.push(scenario);
    }
    
    if (result.intent !== scenario.expectedIntent) {
      console.log(`   ⚠️  Intent mismatch: Expected ${scenario.expectedIntent}, Got ${result.intent}`);
      results.warnings++;
    }
    console.log('');
  }
  
  // Test 2: Context switching
  console.log('\n📝 Test 2: Context Switching Mid-Conversation');
  console.log('=============================================');
  
  for (const scenario of testScenarios.contextSwitching) {
    console.log(`Scenario: ${scenario.description}`);
    
    for (let i = 0; i < scenario.conversation.length; i++) {
      const query = scenario.conversation[i];
      const expectedContext = scenario.expectedContexts[i];
      
      const start = performanceTracker.startTimer();
      const result = await contextDetector.detectMarketingContext(query);
      const duration = performanceTracker.endTimer(start);
      
      const passed = result.primaryContext === expectedContext;
      if (passed) {
        console.log(`  ✅ Step ${i + 1}: "${query}" → ${result.primaryContext}`);
        results.passed++;
      } else {
        console.log(`  ❌ Step ${i + 1}: "${query}"`);
        console.log(`     Expected: ${expectedContext}, Got: ${result.primaryContext}`);
        results.failed++;
      }
    }
    console.log('');
  }
  
  // Test 3: Ambiguous queries
  console.log('\n📝 Test 3: Ambiguous Queries');
  console.log('============================');
  
  for (const scenario of testScenarios.ambiguousQueries) {
    const start = performanceTracker.startTimer();
    const result = await contextDetector.detectMarketingContext(scenario.query);
    const duration = performanceTracker.endTimer(start);
    
    const isValidContext = scenario.possibleContexts.includes(result.primaryContext);
    console.log(`Query: "${scenario.query}"`);
    console.log(`Description: ${scenario.description}`);
    console.log(`Detected: ${result.primaryContext} (confidence: ${result.confidence.toFixed(2)})`);
    console.log(`Secondary contexts: ${result.secondaryContexts.map(c => `${c.context}(${c.confidence.toFixed(2)})`).join(', ')}`);
    
    if (isValidContext) {
      console.log(`✅ Valid context detected`);
      results.passed++;
    } else {
      console.log(`⚠️  Unexpected context (expected one of: ${scenario.possibleContexts.join(', ')})`);
      results.warnings++;
    }
    
    if (result.confidence < 0.5) {
      console.log(`👍 Low confidence for ambiguous query (good!)`);
    }
    console.log(`Time: ${duration.toFixed(2)}ms\n`);
  }
  
  // Test 4: Multi-channel questions
  console.log('\n📝 Test 4: Multi-Channel Questions');
  console.log('==================================');
  
  for (const scenario of testScenarios.multiChannelQuestions) {
    const start = performanceTracker.startTimer();
    const result = await contextDetector.detectMarketingContext(scenario.query);
    const duration = performanceTracker.endTimer(start);
    
    console.log(`Query: "${scenario.query}"`);
    console.log(`Description: ${scenario.description}`);
    console.log(`Primary: ${result.primaryContext}`);
    console.log(`All contexts: ${[result.primaryContext, ...result.secondaryContexts.map(c => c.context)]}`);
    
    // Check if all expected contexts are detected
    const detectedContexts = [result.primaryContext, ...result.secondaryContexts.map(c => c.context)];
    const allExpectedFound = scenario.expectedContexts.every(ctx => 
      detectedContexts.includes(ctx)
    );
    
    if (allExpectedFound) {
      console.log(`✅ All expected contexts detected`);
      results.passed++;
    } else {
      console.log(`❌ Missing contexts: ${scenario.expectedContexts.filter(ctx => !detectedContexts.includes(ctx))}`);
      results.failed++;
    }
    
    if (result.isMultiChannel) {
      console.log(`👍 Correctly identified as multi-channel`);
    } else {
      console.log(`⚠️  Not flagged as multi-channel`);
      results.warnings++;
    }
    console.log(`Time: ${duration.toFixed(2)}ms\n`);
  }
  
  // Test 5: Edge cases
  console.log('\n📝 Test 5: Edge Cases');
  console.log('====================');
  
  for (const scenario of testScenarios.edgeCases) {
    try {
      const start = performanceTracker.startTimer();
      const result = await contextDetector.detectMarketingContext(scenario.query);
      const duration = performanceTracker.endTimer(start);
      
      console.log(`Query: "${scenario.query}"`);
      console.log(`Description: ${scenario.description}`);
      console.log(`Result: ${result.primaryContext || 'null'} (confidence: ${result.confidence.toFixed(2)})`);
      console.log(`Time: ${duration.toFixed(2)}ms`);
      console.log(`✅ Handled without error\n`);
      results.passed++;
    } catch (error) {
      console.log(`❌ Error: ${error.message}\n`);
      results.failed++;
    }
  }
  
  // Test 6: Performance stress test
  console.log('\n📝 Test 6: Performance Stress Test');
  console.log('==================================');
  
  const stressQueries = [
    "SEO optimization tips",
    "email marketing best practices",
    "social media strategy",
    "Google Ads setup",
    "direct mail ROI"
  ];
  
  console.log('Running 100 queries to test caching and performance...');
  
  for (let i = 0; i < 100; i++) {
    const query = stressQueries[i % stressQueries.length];
    const start = performanceTracker.startTimer();
    await contextDetector.detectMarketingContext(query);
    performanceTracker.endTimer(start);
  }
  
  const perfStats = performanceTracker.getStats();
  console.log('\nPerformance Statistics:');
  console.log(`Total queries: ${perfStats.totalQueries}`);
  console.log(`Average detection time: ${perfStats.avgDetectionTime}`);
  console.log(`Median detection time: ${perfStats.medianDetectionTime}`);
  console.log(`95th percentile: ${perfStats.p95DetectionTime}`);
  console.log(`99th percentile: ${perfStats.p99DetectionTime}`);
  console.log(`Min/Max: ${perfStats.minDetectionTime} / ${perfStats.maxDetectionTime}`);
  console.log(`Cache hit rate: ${perfStats.cacheHitRate}`);
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('==============');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️  Warnings: ${results.warnings}`);
  console.log(`Total tests: ${results.passed + results.failed}`);
  console.log(`Success rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  if (results.failures.length > 0) {
    console.log('\nFailed tests:');
    results.failures.forEach(f => {
      console.log(`- ${f.description}: "${f.query}"`);
    });
  }
  
  // Recommendations
  console.log('\n💡 Recommendations');
  console.log('==================');
  if (perfStats.avgDetectionTime > 50) {
    console.log('- Consider optimizing regex patterns for better performance');
  }
  if (perfStats.cacheHitRate < 50) {
    console.log('- Cache hit rate is low - consider increasing cache size');
  }
  if (results.warnings > 5) {
    console.log('- Many ambiguous cases detected - consider adding clarification prompts');
  }
  console.log('- Add more training data for edge cases');
  console.log('- Implement user feedback loop for continuous improvement');
}

// Run the tests
runTests().catch(console.error);