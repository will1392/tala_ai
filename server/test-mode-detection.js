/**
 * Test script for mode detection functionality
 */

import { modeManager } from './services/modes/ModeManager.js';

const testMessages = [
  // Travel mode tests
  { message: "I need to book a flight to Tokyo", expected: 'travel' },
  { message: "Find me hotels in Paris for next week", expected: 'travel' },
  { message: "What's the best time to visit Bali?", expected: 'travel' },
  { message: "Help me plan a 2-week European trip", expected: 'travel' },
  
  // CMO mode tests - General
  { message: "How can I improve my marketing strategy?", expected: 'cmo' },
  { message: "I need help with my marketing campaign", expected: 'cmo' },
  { message: "What's the best way to increase brand awareness?", expected: 'cmo' },
  
  // CMO mode tests - SEO
  { message: "How do I improve my website's SEO?", expected: 'cmo', subMode: 'seo' },
  { message: "Help me with keyword research for my blog", expected: 'cmo', subMode: 'seo' },
  { message: "My site's ranking dropped, what should I do?", expected: 'cmo', subMode: 'seo' },
  
  // CMO mode tests - Email
  { message: "Write an email campaign for my product launch", expected: 'cmo', subMode: 'email' },
  { message: "How can I improve my email open rates?", expected: 'cmo', subMode: 'email' },
  { message: "Create a subject line for my newsletter", expected: 'cmo', subMode: 'email' },
  
  // CMO mode tests - Social Media
  { message: "Help me create Instagram posts for my brand", expected: 'cmo', subMode: 'social' },
  { message: "What hashtags should I use on Twitter?", expected: 'cmo', subMode: 'social' },
  { message: "Plan a social media content calendar", expected: 'cmo', subMode: 'social' },
  
  // CMO mode tests - Ads
  { message: "Optimize my Google Ads campaign", expected: 'cmo', subMode: 'ads' },
  { message: "Help me write Facebook ad copy", expected: 'cmo', subMode: 'ads' },
  { message: "How can I improve my PPC performance?", expected: 'cmo', subMode: 'ads' },
  
  // Explicit mode switches
  { message: "Switch to marketing mode", expected: 'cmo', explicit: true },
  { message: "Switch to travel mode", expected: 'travel', explicit: true },
  { message: "Use CMO mode", expected: 'cmo', explicit: true },
  
  // Ambiguous messages
  { message: "I need help with my project", expected: null },
  { message: "Can you assist me with planning?", expected: null },
  { message: "Show me some options", expected: null }
];

console.log('🧪 Testing Mode Detection\n');

let correct = 0;
let total = 0;

for (const test of testMessages) {
  const result = modeManager.detectMode(test.message);
  const passed = result.mode === test.expected && 
                 (!test.subMode || result.subMode === test.subMode) &&
                 (!test.explicit || result.explicit === test.explicit);
  
  total++;
  if (passed || test.expected === null) correct++;
  
  console.log(`Message: "${test.message}"`);
  console.log(`Expected: ${test.expected}${test.subMode ? ` (${test.subMode})` : ''}`);
  console.log(`Detected: ${result.mode}${result.subMode ? ` (${result.subMode})` : ''}`);
  console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
  console.log(`Result: ${passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log('---');
}

console.log(`\n📊 Results: ${correct}/${total} tests passed (${(correct/total * 100).toFixed(1)}%)`);

// Test mode switching context
console.log('\n🧪 Testing Mode Context\n');

const testContext = {
  mode: 'travel',
  subMode: null
};

// Test with existing context bias
const travelWithContext = modeManager.detectMode(
  "I need help with my website",
  testContext
);

console.log('With travel context:');
console.log(`Message: "I need help with my website"`);
console.log(`Current mode: travel`);
console.log(`Detected: ${travelWithContext.mode} (${(travelWithContext.confidence * 100).toFixed(1)}%)`);
console.log(`Note: Should show some bias towards current mode\n`);

// Test greetings
console.log('🧪 Testing Mode Greetings\n');

const modes = [
  { mode: 'travel' },
  { mode: 'cmo' },
  { mode: 'cmo', subMode: 'seo' },
  { mode: 'cmo', subMode: 'email' },
  { mode: 'cmo', subMode: 'social' },
  { mode: 'cmo', subMode: 'ads' }
];

for (const { mode, subMode } of modes) {
  const greeting = modeManager.getModeGreeting(mode, subMode);
  console.log(`${mode}${subMode ? ` (${subMode})` : ''}: "${greeting}"`);
}

console.log('\n✅ Mode detection tests completed!');