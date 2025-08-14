/**
 * Run this after server restart to verify Greece/Iceland fix
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';

async function verifyAfterRestart() {
  console.log('🧪 Verifying Greece/Iceland Fix After Restart\n');
  console.log('=' . repeat(60));
  
  const tests = [
    { query: 'Greece', expected: 'Greece Guide' },
    { query: 'Iceland', expected: 'Northern Lights' },
    { query: 'Spain', expected: 'Spain Guide' },
    { query: 'France', expected: 'France Guide' }
  ];
  
  let allPassed = true;
  
  for (const test of tests) {
    console.log(`\n📝 Testing: "${test.query}"`);
    console.log('-'.repeat(40));
    
    try {
      const response = await fetch(`${API_URL}/api/chat/v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'admin-1'
        },
        body: JSON.stringify({
          message: test.query,
          mode: 'travel',
          searchKnowledge: true
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Check if simple flow was used
        const simpleFlowUsed = data.metadata?.simpleFlow === true;
        console.log(`Simple flow used: ${simpleFlowUsed ? '✅ YES' : '❌ NO'}`);
        
        // Check sources
        if (data.sources && data.sources.length > 0) {
          const topSource = data.sources[0];
          const correctDoc = topSource.title.includes(test.query);
          console.log(`Top source: ${topSource.title} ${correctDoc ? '✅' : '❌'}`);
          
          if (!correctDoc) {
            console.log('❌ FAIL: Wrong document returned');
            allPassed = false;
          }
        } else {
          console.log('❌ FAIL: No sources returned');
          allPassed = false;
        }
        
        // Check response content
        const mentionsQuery = data.response.toLowerCase().includes(test.query.toLowerCase());
        const isGeneric = data.response.includes("don't have specific information");
        
        console.log(`Response mentions ${test.query}: ${mentionsQuery ? '✅' : '❌'}`);
        console.log(`Response is generic: ${isGeneric ? '❌' : '✅'}`);
        
        if (!mentionsQuery || isGeneric) {
          allPassed = false;
        }
      } else {
        console.log('❌ FAIL: Request failed');
        console.log('Error:', data.error);
        allPassed = false;
      }
    } catch (error) {
      console.log('❌ FAIL: Exception occurred');
      console.log('Error:', error.message);
      allPassed = false;
    }
  }
  
  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  
  if (allPassed) {
    console.log('\n✅ ALL TESTS PASSED!');
    console.log('Greece and Iceland documents are now accessible.');
    console.log('The knowledge base is working correctly.');
  } else {
    console.log('\n❌ SOME TESTS FAILED');
    console.log('\nPossible issues:');
    console.log('1. Server not restarted yet');
    console.log('2. Code changes not saved');
    console.log('3. Check server logs for errors');
  }
}

verifyAfterRestart().catch(console.error);