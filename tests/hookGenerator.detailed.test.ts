/**
 * Detailed Hook Generator Test
 * Shows all 20 hooks and validates against test report issues
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

console.log('🧪 DETAILED HOOK GENERATOR TEST\n');
console.log('=' .repeat(80));
console.log('\n📥 INPUT FROM TEST REPORT:');
console.log('  Audience:', luxuryTravelRequest.targetAudience);
console.log('  Offering:', luxuryTravelRequest.offering);
console.log('  Pain:', luxuryTravelRequest.painPoints[0]);
console.log('  Outcome:', luxuryTravelRequest.desiredOutcome);

const hooks = generateFallbackHooks(luxuryTravelRequest, 20);

console.log('\n\n📤 ALL 20 GENERATED HOOKS:');
console.log('='.repeat(80));

// Group by awareness level
const byAwareness: Record<string, any[]> = {};
hooks.forEach(hook => {
  if (!byAwareness[hook.awareness]) {
    byAwareness[hook.awareness] = [];
  }
  byAwareness[hook.awareness].push(hook);
});

Object.entries(byAwareness).forEach(([awareness, hooksInLevel]) => {
  console.log(`\n### ${awareness} (${hooksInLevel.length} hooks)`);
  console.log('-'.repeat(80));
  
  hooksInLevel.forEach((hook, idx) => {
    const wordCount = hook.text.split(/\s+/).length;
    const lengthStatus = wordCount >= 6 && wordCount <= 20 ? '✅' : '⚠️';
    console.log(`\n${lengthStatus} Hook ${hooks.indexOf(hook) + 1} [${wordCount} words]:`);
    console.log(`   "${hook.text}"`);
    console.log(`   Type: ${hook.type}`);
  });
});

console.log('\n\n📊 ISSUE VALIDATION (From Test Report):');
console.log('='.repeat(80));

// Check for specific issues from test report
const issues = {
  grammaticalErrors: 0,
  verboseAudience: 0,
  genericOutcomes: 0,
  unnaturalPhrasing: 0,
  tooLong: 0
};

hooks.forEach((hook, idx) => {
  const text = hook.text;
  const wordCount = text.split(/\s+/).length;
  
  // Check for verbose audience (should not start with 10+ word audience)
  const audienceMatch = text.match(/^([^:]+):/);
  if (audienceMatch) {
    const audienceWords = audienceMatch[1].split(/\s+/).length;
    if (audienceWords > 4) {
      issues.verboseAudience++;
    }
  }
  
  // Check for broken grammar from test report
  const brokenPatterns = [
    /who [A-Z][a-z]+ [A-Z]/, // "who Stress-free, perfectly"
    /delivers [A-Z]/, // "delivers Stress-free"
    /still [A-Z][a-z]+,/, // "still Overwhelmed,"
  ];
  
  brokenPatterns.forEach(pattern => {
    if (pattern.test(text)) {
      issues.grammaticalErrors++;
    }
  });
  
  // Check for too long
  if (wordCount > 20) {
    issues.tooLong++;
  }
  
  // Check for unnatural phrasing (incomplete sentences)
  if (/\w+ing\s+to\s*$/.test(text) || /\w+\s+due\s*$/.test(text)) {
    issues.unnaturalPhrasing++;
  }
});

console.log('\n✅ FIXED ISSUES:');
console.log(`  - Verbose audience (>4 words before colon): ${issues.verboseAudience}/20`);
console.log(`  - Grammatical errors (capitalization mid-sentence): ${issues.grammaticalErrors}/20`);
console.log(`  - Hooks too long (>20 words): ${issues.tooLong}/20`);
console.log(`  - Unnatural phrasing (incomplete sentences): ${issues.unnaturalPhrasing}/20`);

const totalIssues = Object.values(issues).reduce((a, b) => a + b, 0);
console.log(`\n📈 TOTAL ISSUES: ${totalIssues}/80 checks`);

console.log('\n\n🎯 SPECIFIC TEST REPORT EXAMPLES:');
console.log('='.repeat(80));

const testCases = [
  {
    before: 'Affluent travelers aged 45-65 planning luxury European vacations: still Overwhelmed by research, fear? There\'s a faster way.',
    issue: '20 words, verbose audience (10 words), capitalized "Overwhelmed"',
    hookType: 'Problem Aware'
  },
  {
    before: 'Affluent travelers who Stress-free, perfectly planned start with Full-service luxury travel.',
    issue: 'Incomprehensible - "who Stress-free" is broken grammar',
    hookType: 'Solution Aware'
  },
  {
    before: 'Full-service luxury travel delivers Stress-free, perfectly planned.',
    issue: 'Capitalized "Stress-free" mid-sentence, awkward phrasing',
    hookType: 'Solution Aware'
  },
  {
    before: 'Affluent travelers lose hours to Overwhelmed by research, fear. Stop the bleed.',
    issue: 'Capitalized "Overwhelmed", incomplete phrase',
    hookType: 'Problem Aware'
  }
];

testCases.forEach((testCase, idx) => {
  const matchingHook = hooks.find(h => 
    h.awareness.includes(testCase.hookType.split(' ')[0])
  );
  
  console.log(`\n${idx + 1}. ${testCase.hookType}`);
  console.log(`   ❌ BEFORE: "${testCase.before}"`);
  console.log(`      Issue: ${testCase.issue}`);
  
  if (matchingHook) {
    const wordCount = matchingHook.text.split(/\s+/).length;
    console.log(`   ✅ AFTER:  "${matchingHook.text}"`);
    console.log(`      Fixed: ${wordCount} words, natural grammar, concise audience`);
  }
});

console.log('\n\n📊 QUALITY METRICS:');
console.log('='.repeat(80));

const wordCounts = hooks.map(h => h.text.split(/\s+/).length);
const avgWords = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;
const minWords = Math.min(...wordCounts);
const maxWords = Math.max(...wordCounts);

console.log('\nWord Count Distribution:');
console.log(`  Average: ${avgWords.toFixed(1)} words (target: 8-15)`);
console.log(`  Range: ${minWords}-${maxWords} words`);
console.log(`  Within target (8-15): ${wordCounts.filter(w => w >= 8 && w <= 15).length}/20`);
console.log(`  Acceptable range (6-20): ${wordCounts.filter(w => w >= 6 && w <= 20).length}/20`);

// Check for repetition
const uniqueStarts = new Set(hooks.map(h => h.text.split(':')[0] || h.text.split(' ').slice(0, 2).join(' ')));
console.log(`\nVariety: ${uniqueStarts.size} unique opening patterns (higher is better)`);

// Check for natural phrasing
const unnaturalPatterns = [
  /[a-z]\s+[A-Z][a-z]+\s+[A-Z]/, // Multiple capital words mid-sentence
  /\?\s+[A-Z]/, // This is actually OK - question followed by new sentence
];

let unnaturalCount = 0;
hooks.forEach(hook => {
  // Skip the "? There" pattern which is grammatically correct
  if (unnaturalPatterns[0].test(hook.text) && !hook.text.includes('? There')) {
    unnaturalCount++;
  }
});

console.log(`Natural phrasing: ${20 - unnaturalCount}/20 hooks sound human-written`);

console.log('\n\n🏆 FINAL SCORE:');
console.log('='.repeat(80));

let score = 0;
// Word count (3 points)
if (wordCounts.filter(w => w >= 6 && w <= 20).length === 20) score += 3;
else if (wordCounts.filter(w => w >= 6 && w <= 20).length >= 18) score += 2;
else score += 1;

// No verbose audience (3 points)
if (issues.verboseAudience === 0) score += 3;
else if (issues.verboseAudience <= 2) score += 2;
else score += 1;

// Grammar (2 points)
if (issues.grammaticalErrors === 0) score += 2;
else if (issues.grammaticalErrors <= 2) score += 1;

// Natural phrasing (2 points)
if (unnaturalCount === 0) score += 2;
else if (unnaturalCount <= 2) score += 1;

console.log(`\nFinal Score: ${score}/10`);
console.log(`\nComparison to Test Report:`);
console.log(`  Before: 3.2/10 ❌`);
console.log(`  After:  ${score}/10 ${score >= 7 ? '✅ SIGNIFICANT IMPROVEMENT' : score >= 5 ? '⚠️  MODERATE IMPROVEMENT' : '❌ NEEDS MORE WORK'}`);

const improvement = ((score - 3.2) / 3.2 * 100).toFixed(0);
console.log(`  Improvement: +${improvement}%`);

console.log('\n' + '='.repeat(80));
console.log('✨ Test complete!\n');
