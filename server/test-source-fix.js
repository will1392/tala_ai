/**
 * Test that sources array now shows only selected sources
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';

async function testSourceFix() {
  console.log('🧪 Testing Source Selection Fix\n');
  console.log('=' . repeat(80));
  
  const testCases = [
    {
      name: 'Greece Query (Single Source Expected)',
      query: 'Tell me about hotels in Greece'
    },
    {
      name: 'Iceland Query',
      query: 'When to see Northern Lights in Iceland'
    },
    {
      name: 'Comparison Query (Multiple Sources Expected)',
      query: 'Greece vs Spain for summer vacation'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log(`Query: "${testCase.query}"`);
    console.log('-'.repeat(80));
    
    try {
      const response = await fetch(`${API_URL}/api/chat/v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'test-source-fix'
        },
        body: JSON.stringify({
          message: testCase.query,
          mode: 'travel',
          searchKnowledge: true
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('\n✅ Response received successfully');
        
        // Check sources array
        console.log('\n📚 Sources in Response:');
        data.sources?.forEach((source, i) => {
          console.log(`   ${i+1}. ${source.title}`);
          console.log(`      Score: ${source.score.toFixed(3)}`);
          console.log(`      Sections Used: ${source.sectionsUsed || 'N/A'}`);
        });
        
        // Check metadata
        const meta = data.metadata?.selectionMetadata;
        if (meta) {
          console.log('\n📊 Selection Metadata:');
          console.log(`   Sources Found: ${meta.totalSourcesFound}`);
          console.log(`   Sources Used: ${meta.sourcesUsed}`);
          console.log(`   Strategy: ${meta.selectionStrategy}`);
          
          // Verify consistency
          const sourcesMatch = data.sources.length === meta.sourcesUsed;
          console.log(`\n✓ Sources array matches metadata: ${sourcesMatch ? '✅' : '❌'}`);
          
          if (!sourcesMatch) {
            console.log(`   Expected: ${meta.sourcesUsed} sources`);
            console.log(`   Got: ${data.sources.length} sources`);
          }
        }
        
        // Check for wrong destinations
        const queryLower = testCase.query.toLowerCase();
        const hasWrongDestination = data.sources?.some(source => {
          const titleLower = source.title.toLowerCase();
          if (queryLower.includes('greece') && !queryLower.includes('spain')) {
            return titleLower.includes('spain');
          }
          if (queryLower.includes('iceland')) {
            return titleLower.includes('spain') || titleLower.includes('greece');
          }
          return false;
        });
        
        console.log(`\n✓ No wrong destinations in sources: ${!hasWrongDestination ? '✅' : '❌'}`);
        
        if (hasWrongDestination) {
          console.log('   ⚠️  Found wrong destination documents in sources!');
        }
        
      } else {
        console.log('❌ Request failed:', data.error);
      }
      
    } catch (error) {
      console.error('❌ Test error:', error.message);
    }
  }
  
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 FIX VERIFICATION SUMMARY');
  console.log('='.repeat(80));
  console.log('\nExpected Behavior After Fix:');
  console.log('✅ Sources array shows only selected documents');
  console.log('✅ Number of sources matches selectionMetadata.sourcesUsed');
  console.log('✅ Wrong destination documents not included');
  console.log('✅ Sources include sectionsUsed count');
  console.log('\nThe sources array should now reflect the adaptive selection,');
  console.log('not just the top 3 search results.');
}

testSourceFix().catch(console.error);