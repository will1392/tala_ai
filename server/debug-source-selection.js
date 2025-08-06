/**
 * Debug why Spain guides are still being used for Greece queries
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';

async function debugSourceSelection() {
  console.log('🔍 Debugging Source Selection for Greece Query\n');
  console.log('=' . repeat(80));
  
  const query = "Greece";
  
  try {
    const response = await fetch(`${API_URL}/api/chat/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'debug-test'
      },
      body: JSON.stringify({
        message: query,
        mode: 'travel',
        searchKnowledge: true
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('📊 Response Metadata:');
      console.log(JSON.stringify(data.metadata, null, 2));
      
      console.log('\n📚 Sources Returned in Response:');
      data.sources?.forEach((source, i) => {
        console.log(`${i+1}. ${source.title} (Score: ${source.score})`);
      });
      
      console.log('\n🔍 Selection Metadata:');
      const selMeta = data.metadata?.selectionMetadata;
      if (selMeta) {
        console.log(`- Total sources found: ${selMeta.totalSourcesFound}`);
        console.log(`- Sources considered: ${selMeta.sourcesConsidered}`);
        console.log(`- Sources actually used: ${selMeta.sourcesUsed}`);
        console.log(`- Strategy: ${selMeta.selectionStrategy}`);
        console.log('\nRelevance Distribution:');
        console.log(JSON.stringify(selMeta.relevanceDistribution, null, 2));
      }
      
      console.log('\n📝 Sources Actually Used (from metadata):');
      data.metadata?.sourcesUsed?.forEach((source, i) => {
        console.log(`${i+1}. ${source.title} (Score: ${source.score}, Sections: ${source.sectionsUsed})`);
      });
      
      console.log('\n💭 Response Content Check:');
      const responseText = data.response?.toLowerCase() || '';
      console.log(`- Mentions Greece: ${responseText.includes('greece') ? '✅' : '❌'}`);
      console.log(`- Mentions Spain: ${responseText.includes('spain') ? '✅' : '❌'}`);
      
      console.log('\n⚠️  ISSUE IDENTIFIED:');
      const hasSpainInSources = data.sources?.some(s => s.title.includes('Spain'));
      const hasSpainInUsed = data.metadata?.sourcesUsed?.some(s => s.title.includes('Spain'));
      
      if (hasSpainInSources) {
        console.log('❌ Spain guides are in the sources list!');
      }
      if (hasSpainInUsed) {
        console.log('❌ Spain guides were actually used!');
      }
      if (!hasSpainInSources && !hasSpainInUsed) {
        console.log('✅ No Spain guides in sources - working correctly');
      }
      
    } else {
      console.error('Request failed:', data.error);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  console.log('\n\n🔍 Diagnosis:');
  console.log('The issue appears to be that the sources list in the response');
  console.log('is showing the TOP search results, not the SELECTED sources.');
  console.log('We need to update the response to show only the sources that');
  console.log('were actually selected and used by the adaptive system.');
}

debugSourceSelection().catch(console.error);