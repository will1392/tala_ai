/**
 * Quick test to verify Greece search is working
 */

import { QdrantClient } from '@qdrant/qdrant-js';
import OpenAI from 'openai';
import { KeywordExtractor } from './services/search/KeywordExtractor.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function testGreeceSearch() {
  console.log('🔍 Testing Greece Search Fix\n');
  
  const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
  });
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  const keywordExtractor = new KeywordExtractor();
  
  // Test direct embedding search first
  console.log('1️⃣ Testing direct embedding search for "Greece"...');
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: 'Greece travel guide',
  });
  
  const searchResponse = await qdrant.search('tala_admin_knowledge', {
    vector: embeddingResponse.data[0].embedding,
    limit: 5,
    score_threshold: 0.0,
    with_payload: true
  });
  
  console.log('\nDirect search results:');
  searchResponse.forEach((result, i) => {
    console.log(`${i + 1}. ${result.payload?.metadata?.title || 'Unknown'} (Score: ${result.score.toFixed(3)})`);
  });
  
  // Test KeywordExtractor
  console.log('\n\n2️⃣ Testing KeywordExtractor search...');
  const enhancedResults = await keywordExtractor.performEnhancedSearch(
    qdrant,
    openai,
    'tala_admin_knowledge',
    'Tell me about Greece',
    {
      limit: 5,
      scoreThreshold: 0.0
    }
  );
  
  console.log('\nEnhanced search results:');
  enhancedResults.results.forEach((result, i) => {
    const title = result.payload?.metadata?.title || 'Unknown';
    console.log(`${i + 1}. ${title} (Score: ${result.score.toFixed(3)})`);
    if (title.toLowerCase().includes('greece')) {
      console.log('   ✅ Found Greece document!');
    }
  });
  
  // Test what Tala would actually search for
  console.log('\n\n3️⃣ Testing chat-style query...');
  const chatResults = await keywordExtractor.performEnhancedSearch(
    qdrant,
    openai,
    'tala_admin_knowledge',
    'What can you tell me about Greece?',
    {
      limit: 5,
      scoreThreshold: 0.0
    }
  );
  
  console.log('\nChat query results:');
  let foundGreece = false;
  chatResults.results.forEach((result, i) => {
    const title = result.payload?.metadata?.title || 'Unknown';
    console.log(`${i + 1}. ${title} (Score: ${result.score.toFixed(3)})`);
    if (title.toLowerCase().includes('greece')) {
      console.log('   ✅ Found Greece document!');
      foundGreece = true;
    }
  });
  
  console.log('\n\n📊 SUMMARY:');
  console.log(foundGreece ? '✅ Greece search is WORKING!' : '❌ Greece search is still broken');
  
  if (!foundGreece) {
    console.log('\n💡 Debugging info:');
    console.log('- Check if embedding model matches (should be text-embedding-3-small)');
    console.log('- Check score threshold (should be 0.0 or lower)');
    console.log('- Check collection name (should be tala_admin_knowledge)');
  }
}

testGreeceSearch().catch(console.error);