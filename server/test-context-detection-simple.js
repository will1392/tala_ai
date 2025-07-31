/**
 * Simple Context Detection Test
 * Tests the core context detection without full CMO Assistant
 */

import { ContextDetector } from './services/cmo/ContextDetector.js';
import { contextDebugger } from './services/cmo/ContextDebugger.js';
import { contextOptimizer } from './services/cmo/ContextOptimizer.js';
import { contextFeedback } from './services/cmo/ContextFeedback.js';

// Enable debug mode
process.env.CMO_DEBUG = 'true';

async function runSimpleTest() {
  console.log('🧪 Simple Context Detection Test\n');
  
  const detector = new ContextDetector();
  
  // Test 1: Basic detection
  console.log('📝 Test 1: Basic Context Detection');
  console.log('=================================\n');
  
  const testQueries = [
    'How do I improve my SEO?',
    'Best email marketing practices',
    'Facebook advertising tips',
    'Design a postcard for direct mail',
    'Increase website traffic' // Ambiguous
  ];
  
  for (const query of testQueries) {
    const result = await detector.detectMarketingContext(query);
    console.log(`Query: "${query}"`);
    console.log(`Context: ${result.primaryContext} (${(result.confidence * 100).toFixed(0)}%)`);
    if (result.isAmbiguous) {
      console.log(`⚠️  Ambiguous - Suggestion: ${result.suggestedClarification}`);
    }
    console.log('');
  }
  
  // Test 2: Cache performance
  console.log('\n📝 Test 2: Cache Performance');
  console.log('============================\n');
  
  const cacheQuery = 'SEO optimization tips';
  
  console.log('First query (no cache):');
  let start = Date.now();
  await detector.detectMarketingContext(cacheQuery);
  let time1 = Date.now() - start;
  console.log(`Time: ${time1}ms\n`);
  
  console.log('Second query (cached):');
  start = Date.now();
  await detector.detectMarketingContext(cacheQuery);
  let time2 = Date.now() - start;
  console.log(`Time: ${time2}ms`);
  console.log(`Speed improvement: ${time1 > 0 ? ((time1 - time2) / time1 * 100).toFixed(0) : 0}%\n`);
  
  // Test 3: User feedback
  console.log('\n📝 Test 3: User Feedback');
  console.log('========================\n');
  
  const ambiguousQuery = 'I need better performance';
  const detected = await detector.detectMarketingContext(ambiguousQuery);
  
  console.log(`Query: "${ambiguousQuery}"`);
  console.log(`Detected: ${detected.primaryContext} (${(detected.confidence * 100).toFixed(0)}%)`);
  console.log('User says: "I meant email performance"');
  
  // Record feedback
  contextFeedback.recordFeedback(ambiguousQuery, detected.primaryContext, 'email', 'test-user');
  
  // Generate clarification
  const clarification = contextFeedback.generateClarificationPrompt(
    detected.primaryContext,
    detected.confidence,
    detected.possibleContexts
  );
  console.log(`\nClarification: ${clarification.message}`);
  
  // Test 4: Performance stats
  console.log('\n📝 Test 4: Performance Statistics');
  console.log('=================================\n');
  
  const perfStats = contextDebugger.getPerformanceStats();
  console.log(`Total detections: ${perfStats.totalDetections}`);
  console.log(`Average time: ${perfStats.avgTime}ms`);
  console.log(`Cache hit rate: ${perfStats.cacheHitRate}%`);
  console.log(`Ambiguity rate: ${perfStats.ambiguityRate}%`);
  
  const cacheStats = contextOptimizer.getCacheStats();
  console.log(`\nCache size: ${cacheStats.size}`);
  console.log(`Optimized queries: ${cacheStats.optimizedQueries}`);
  
  const feedbackStats = contextFeedback.getStatistics();
  console.log(`\nFeedback recorded: ${feedbackStats.totalFeedback}`);
  console.log(`Accuracy: ${feedbackStats.accuracy}`);
  
  console.log('\n✅ Test Complete!');
}

// Run the test
runSimpleTest().catch(console.error);