#!/usr/bin/env node

/**
 * Trace field assistance response flow
 * Adds detailed logging to track where responses get modified
 */

import fs from 'fs';
import path from 'path';

const files = [
  './server/services/cmo/CMOChatHandler.js',
  './server/routes/intelligentChat.js',
  './server/services/intelligence/TalaIntelligence.js'
];

function addTracing(filePath) {
  console.log(`\n📍 Adding tracing to ${filePath}...`);
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  if (filePath.includes('CMOChatHandler.js')) {
    // Add trace after skipEnhancement check
    const tracePoint = `
        // TRACE: Field assistance response
        if (assistantResponse.skipEnhancement) {
          console.log('🔍 TRACE CMOChatHandler: Field assistance response:', {
            responseLength: (assistantResponse.response || assistantResponse.content).length,
            responsePreview: (assistantResponse.response || assistantResponse.content).substring(0, 200),
            skipEnhancement: true
          });
        }`;
    
    // Already has the skip logic, just add more logging
    console.log('  ✅ CMOChatHandler already has skip logic');
  }
  
  if (filePath.includes('intelligentChat.js')) {
    console.log('  📝 Key points to check in intelligentChat:');
    console.log('    - How CMO responses are processed');
    console.log('    - Whether response enhancement happens');
    console.log('    - If field_assistance subMode is preserved');
  }
  
  if (filePath.includes('TalaIntelligence.js')) {
    console.log('  📝 Key points to check in TalaIntelligence:');
    console.log('    - enhanceResponse method');
    console.log('    - Whether skipEnhancement flag is respected');
    console.log('    - CMO mode processing');
  }
}

console.log('🔍 Field Assistance Response Tracing Guide');
console.log('========================================');

files.forEach(addTracing);

console.log('\n📋 Manual Checks Needed:');
console.log('1. In intelligentChat.js, look for where CMO responses are processed');
console.log('2. Check if the response goes through any formatters or enhancers');
console.log('3. Verify field_assistance subMode is preserved throughout');
console.log('4. Look for any response wrapping or template application');

console.log('\n🎯 Expected Flow:');
console.log('1. CMOChatHandler receives field_assistance request');
console.log('2. Forces V1 CMOAssistant.handleFieldAssistance()');
console.log('3. Returns response with skipEnhancement: true');
console.log('4. Response should pass through unchanged to UI');

console.log('\n⚠️  Potential Issues:');
console.log('- Response might be wrapped with "I\'ll help you with your marketing challenge!"');
console.log('- Generic marketing content being added somewhere');
console.log('- Field assistance response being replaced entirely');