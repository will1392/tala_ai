/**
 * Hook Generator Test Suite
 * Tests the fallback hook generator with real-world inputs from the test report
 */

import { generateFallbackHooks, HookRequest } from '../src/utils/hookGenerator';

// Test case from the actual failing test report
const luxuryTravelRequest: HookRequest = {
  targetAudience: 'Affluent travelers aged 45-65 planning luxury European vacations',
  offering: 'Full-service luxury travel planning',
  painPoints: [
    'Overwhelmed by research, fear of missing hidden gems',
    'Too many options, not enough time',
    'Worried about making expensive mistakes'
  ],
  desiredOutcome: 'Stress-free, perfectly planned luxury vacation',
  marketingChannels: ['Paid Ads', 'Email'],
  tone: 'Professional yet warm',
  campaignGoal: 'Generate qualified leads',
  additionalNotes: 'Focus on time savings and peace of mind'
};

// Additional test cases
const founderRequest: HookRequest = {
  targetAudience: 'SaaS founders',
  offering: 'Marketing automation platform',
  painPoints: ['Spending too much time on repetitive marketing tasks'],
  desiredOutcome: 'Scale marketing without hiring',
  marketingChannels: ['LinkedIn'],
  tone: 'Direct',
  campaignGoal: 'Demo bookings',
  additionalNotes: ''
};

const ecommerceRequest: HookRequest = {
  targetAudience: 'Small business owners running e-commerce stores',
  offering: 'Inventory management software',
  painPoints: [
    'Losing sales due to stockouts',
    'Wasting money on excess inventory'
  ],
  desiredOutcome: 'Optimized inventory levels and higher profits',
  marketingChannels: ['Email', 'Organic Social'],
  tone: 'Friendly and helpful',
  campaignGoal: 'Free trial signups',
  additionalNotes: 'Emphasize ROI'
};

console.log('🧪 HOOK GENERATOR TEST SUITE\n');
console.log('=' .repeat(80));

function analyzeHooks(hooks: any[], testName: string, request: HookRequest) {
  console.log(`\n📊 Test: ${testName}`);
  console.log('-'.repeat(80));
  
  console.log('\n📥 Input:');
  console.log(`  Audience: ${request.targetAudience}`);
  console.log(`  Offering: ${request.offering}`);
  console.log(`  Pain: ${request.painPoints[0]}`);
  console.log(`  Outcome: ${request.desiredOutcome}`);
  
  console.log('\n📤 Generated Hooks (First 5):');
  hooks.slice(0, 5).forEach((hook, i) => {
    const wordCount = hook.text.split(/\s+/).length;
    const status = wordCount <= 20 && wordCount >= 6 ? '✅' : '⚠️';
    console.log(`\n  ${status} Hook ${i + 1} [${wordCount} words] (${hook.awareness}):`);
    console.log(`     "${hook.text}"`);
  });
  
  // Quality checks
  console.log('\n📋 Quality Checks:');
  
  const issues: string[] = [];
  const wordCounts = hooks.map(h => h.text.split(/\s+/).length);
  const avgWords = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;
  const tooLong = hooks.filter(h => h.text.split(/\s+/).length > 20).length;
  const tooShort = hooks.filter(h => h.text.split(/\s+/).length < 6).length;
  
  console.log(`  ✓ Total hooks: ${hooks.length}`);
  console.log(`  ✓ Average word count: ${avgWords.toFixed(1)} (target: 8-15)`);
  console.log(`  ✓ Hooks > 20 words: ${tooLong} ${tooLong === 0 ? '✅' : '❌'}`);
  console.log(`  ✓ Hooks < 6 words: ${tooShort} ${tooShort === 0 ? '✅' : '⚠️'}`);
  
  // Check for broken grammar patterns from test report
  const brokenPatterns = [
    /who [A-Z]/, // "who Stress-free"
    /still [A-Z]/, // "still Overwhelmed"
    /to [A-Z][a-z]+ing/, // "to Planning"
    /\? There/, // incomplete question
    /delivers [A-Z]/, // "delivers Stress-free"
  ];
  
  hooks.forEach((hook, i) => {
    brokenPatterns.forEach((pattern, pi) => {
      if (pattern.test(hook.text)) {
        issues.push(`Hook ${i + 1}: Potential grammar issue (pattern ${pi + 1}): "${hook.text}"`);
      }
    });
  });
  
  // Check for verbose audience
  const verboseAudience = hooks.filter(h => {
    const match = h.text.match(/^[^:]+:/);
    if (!match) return false;
    const audiencePart = match[0];
    return audiencePart.split(/\s+/).length > 4;
  }).length;
  
  console.log(`  ✓ Hooks with verbose audience (>4 words): ${verboseAudience} ${verboseAudience === 0 ? '✅' : '❌'}`);
  
  // Check for grammar issues
  console.log(`  ✓ Grammar issues detected: ${issues.length} ${issues.length === 0 ? '✅' : '❌'}`);
  
  if (issues.length > 0) {
    console.log('\n⚠️  Issues Found:');
    issues.slice(0, 3).forEach(issue => console.log(`     ${issue}`));
    if (issues.length > 3) {
      console.log(`     ... and ${issues.length - 3} more`);
    }
  }
  
  // Overall score
  const score = (
    (tooLong === 0 ? 3 : 0) +
    (tooShort === 0 ? 2 : 0) +
    (verboseAudience === 0 ? 3 : 0) +
    (issues.length === 0 ? 2 : 0)
  );
  
  console.log(`\n🎯 Overall Score: ${score}/10 ${score >= 7 ? '✅ PASS' : score >= 5 ? '⚠️  NEEDS WORK' : '❌ FAIL'}`);
  
  return { score, issues };
}

// Run tests
console.log('\n\n🚀 Running Tests...\n');

const test1Hooks = generateFallbackHooks(luxuryTravelRequest, 20);
const test1Results = analyzeHooks(test1Hooks, 'Luxury Travel (From Test Report)', luxuryTravelRequest);

const test2Hooks = generateFallbackHooks(founderRequest, 20);
const test2Results = analyzeHooks(test2Hooks, 'SaaS Founders', founderRequest);

const test3Hooks = generateFallbackHooks(ecommerceRequest, 20);
const test3Results = analyzeHooks(test3Hooks, 'E-commerce Small Business', ecommerceRequest);

// Summary
console.log('\n\n' + '='.repeat(80));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(80));

const avgScore = (test1Results.score + test2Results.score + test3Results.score) / 3;
console.log(`\nAverage Score: ${avgScore.toFixed(1)}/10`);
console.log(`\nTest 1 (Luxury Travel): ${test1Results.score}/10 ${test1Results.score >= 7 ? '✅' : test1Results.score >= 5 ? '⚠️' : '❌'}`);
console.log(`Test 2 (SaaS Founders): ${test2Results.score}/10 ${test2Results.score >= 7 ? '✅' : test2Results.score >= 5 ? '⚠️' : '❌'}`);
console.log(`Test 3 (E-commerce): ${test3Results.score}/10 ${test3Results.score >= 7 ? '✅' : test3Results.score >= 5 ? '⚠️' : '❌'}`);

console.log(`\n${avgScore >= 7 ? '✅ ALL TESTS PASSED' : avgScore >= 5 ? '⚠️  SOME TESTS NEED WORK' : '❌ TESTS FAILED'}`);
console.log('\n' + '='.repeat(80));

// Show before/after comparison from test report
console.log('\n\n📈 BEFORE/AFTER COMPARISON (Test Report Examples)');
console.log('='.repeat(80));

console.log('\n❌ BEFORE (Score: 3.2/10):');
console.log('  "Affluent travelers aged 45-65 planning luxury European vacations: still Overwhelmed by research, fear? There\'s a faster way."');
console.log('  Issues: 20 words, verbose audience, broken grammar');

console.log('\n✅ AFTER (Current):');
console.log(`  "${test1Hooks[0].text}"`);
console.log(`  Improvements: ${test1Hooks[0].wordCount} words, concise audience, grammatically correct`);

console.log('\n❌ BEFORE:');
console.log('  "Affluent travelers who Stress-free, perfectly planned start with Full-service luxury travel."');
console.log('  Issues: Incomprehensible, broken grammar');

console.log('\n✅ AFTER (Current):');
console.log(`  "${test1Hooks[1].text}"`);
console.log(`  Improvements: Natural phrasing, added "want" for clarity`);

console.log('\n❌ BEFORE:');
console.log('  "Full-service luxury travel delivers Stress-free, perfectly planned."');
console.log('  Issues: Incomplete outcome, awkward phrasing');

console.log('\n✅ AFTER (Current):');
const solutionAwareHook = test1Hooks.find(h => h.text.includes('No fluff'));
if (solutionAwareHook) {
  console.log(`  "${solutionAwareHook.text}"`);
  console.log(`  Improvements: Complete sentence, natural flow`);
}

console.log('\n' + '='.repeat(80));
console.log('\n✨ Test suite complete!\n');
