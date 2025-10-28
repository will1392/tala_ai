/**
 * Test Semantic Search
 * Tests if semantic search is working correctly
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';
import 'dotenv/config';

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function testSemanticSearch() {
  try {
    const query = "Tell me about Iceland";
    console.log(`🔍 Testing semantic search for: "${query}"\n`);
    
    // 1. Generate embedding
    console.log('📊 Generating embedding...');
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query
    });
    console.log('✅ Embedding generated:', embedding.data[0].embedding.length, 'dimensions\n');
    
    // 2. Search with different thresholds
    const thresholds = [0.7, 0.5, 0.4, 0.3, 0.2, 0.1];
    
    for (const threshold of thresholds) {
      console.log(`\n🔍 Searching with threshold ${threshold}...`);
      
      const results = await qdrant.search('tala_admin_knowledge', {
        vector: embedding.data[0].embedding,
        limit: 5,
        score_threshold: threshold,
        with_payload: true
      });
      
      console.log(`   Found ${results.length} results`);
      
      if (results.length > 0) {
        results.forEach((r, idx) => {
          console.log(`\n   ${idx + 1}. Score: ${r.score.toFixed(4)}`);
          console.log(`      Title: ${r.payload?.metadata?.title || 'N/A'}`);
          console.log(`      Preview: ${(r.payload?.content || '').substring(0, 80)}...`);
        });
        
        // Only show results for the first successful threshold
        break;
      }
    }
    
    // 3. Test without threshold
    console.log('\n\n🔍 Searching WITHOUT threshold (get top 10)...');
    const allResults = await qdrant.search('tala_admin_knowledge', {
      vector: embedding.data[0].embedding,
      limit: 10,
      with_payload: true
    });
    
    console.log(`   Found ${allResults.length} results\n`);
    allResults.forEach((r, idx) => {
      console.log(`${idx + 1}. Score: ${r.score.toFixed(4)} - ${r.payload?.metadata?.title || 'N/A'}`);
    });
    
  } catch (error) {
    console.error('\n❌ Error during semantic search:', error.message);
    console.error('   Stack:', error.stack);
  }
}

testSemanticSearch();
