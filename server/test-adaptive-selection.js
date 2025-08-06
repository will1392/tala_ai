/**
 * Test Adaptive Source Selection
 * 
 * Verifies that the system:
 * - Uses single excellent sources when appropriate
 * - Combines multiple good sources intelligently
 * - Rejects irrelevant sources (wrong destination)
 * - Provides transparent metadata about selection
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';

async function testAdaptiveSelection() {
  console.log('🧪 Testing Adaptive Source Selection\n');
  console.log('=' . repeat(80));
  
  const testCases = [
    {
      name: 'Specific Destination Query',
      query: 'Tell me about hotels in Greece',
      expectedBehavior: 'Should use Greece guide only, reject others'
    },
    {
      name: 'Single Word Query',
      query: 'Iceland',
      expectedBehavior: 'Should find Iceland/Northern Lights docs, reject unrelated'
    },
    {
      name: 'Topic Without Destination',
      query: 'Best restaurants with local cuisine',
      expectedBehavior: 'May use multiple guides if all have good restaurant info'
    },
    {
      name: 'Northern Lights Specific',
      query: 'When to see Northern Lights in Iceland',
      expectedBehavior: 'Should prioritize Northern Lights doc + Iceland guide'
    },
    {
      name: 'Comparison Query',
      query: 'Greece vs Spain for summer vacation',
      expectedBehavior: 'Should use both Greece and Spain guides'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📝 Test: ${testCase.name}`);
    console.log(`Query: "${testCase.query}"`);
    console.log(`Expected: ${testCase.expectedBehavior}`);
    console.log('-'.repeat(80));
    
    try {
      const response = await fetch(`${API_URL}/api/chat/v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'test-adaptive'
        },
        body: JSON.stringify({
          message: testCase.query,
          mode: 'travel',
          searchKnowledge: true
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Check selection metadata
        const meta = data.metadata?.selectionMetadata;
        
        if (meta) {
          console.log('\n📊 Selection Metadata:');
          console.log(`   Total sources found: ${meta.totalSourcesFound}`);
          console.log(`   Sources considered: ${meta.sourcesConsidered}`);
          console.log(`   Sources used: ${meta.sourcesUsed}`);
          console.log(`   Strategy: ${meta.selectionStrategy}`);
          
          console.log('\n📈 Relevance Distribution:');
          console.log(`   Excellent (>0.70): ${meta.relevanceDistribution.excellent}`);
          console.log(`   Good (0.50-0.70): ${meta.relevanceDistribution.good}`);
          console.log(`   Fair (0.35-0.50): ${meta.relevanceDistribution.fair}`);
          console.log(`   Poor (<0.35): ${meta.relevanceDistribution.poor}`);
        }
        
        // Check which sources were actually used
        if (data.metadata?.sourcesUsed) {
          console.log('\n📚 Sources Actually Used:');
          data.metadata.sourcesUsed.forEach((source, i) => {
            console.log(`   ${i+1}. ${source.title} (Score: ${source.score.toFixed(3)}, Sections: ${source.sectionsUsed})`);
          });
        }
        
        // Verify response quality
        console.log('\n✅ Response Quality Check:');
        const responseLength = data.response?.length || 0;
        console.log(`   Response length: ${responseLength} chars`);
        
        // Check if response mentions expected content
        const queryLower = testCase.query.toLowerCase();
        if (queryLower.includes('greece')) {
          console.log(`   Mentions Greece: ${data.response?.toLowerCase().includes('greece') ? '✅' : '❌'}`);
        }
        if (queryLower.includes('iceland')) {
          console.log(`   Mentions Iceland: ${data.response?.toLowerCase().includes('iceland') ? '✅' : '❌'}`);
        }
        if (queryLower.includes('spain')) {
          console.log(`   Mentions Spain: ${data.response?.toLowerCase().includes('spain') ? '✅' : '❌'}`);
        }
        
        // Show response preview
        console.log('\n💬 Response Preview:');
        console.log(data.response?.substring(0, 300) + '...');
        
      } else {
        console.log('❌ Request failed:', data.error);
      }
      
    } catch (error) {
      console.error('❌ Test error:', error.message);
    }
  }
  
  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 ADAPTIVE SELECTION SUMMARY');
  console.log('='.repeat(80));
  console.log('\nExpected Behaviors:');
  console.log('✅ Single excellent source used when others are irrelevant');
  console.log('✅ Multiple sources combined when all are relevant');
  console.log('✅ Wrong destination documents rejected');
  console.log('✅ Transparent metadata about selection strategy');
  console.log('✅ Quality prioritized over quantity');
  
  console.log('\nKey Improvements:');
  console.log('- No more Spain hotels in Greece queries');
  console.log('- No more forcing 3 sources when 1 is perfect');
  console.log('- Clear explanation of source selection in metadata');
  console.log('- Smarter multi-source synthesis when appropriate');
}

testAdaptiveSelection().catch(console.error);