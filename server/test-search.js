import dotenv from 'dotenv';
import { QdrantClient } from '@qdrant/qdrant-js';
import OpenAI from 'openai';

dotenv.config();

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateEmbedding(text) {
  const maxChars = 30000;
  const truncatedText = text.length > maxChars ? text.substring(0, maxChars) : text;
  
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: truncatedText,
    encoding_format: 'float'
  });
  return response.data[0].embedding;
}

async function testSearch() {
  try {
    console.log('🔍 Testing search functionality...');
    
    // Generate embedding for search query
    const query = 'travel agent training';
    console.log(`Searching for: "${query}"`);
    
    const queryVector = await generateEmbedding(query);
    console.log(`✅ Generated embedding with ${queryVector.length} dimensions`);
    
    // Search the collection
    const searchResult = await qdrant.search('tala_admin_knowledge', {
      vector: queryVector,
      limit: 5,
      with_payload: true,
      with_vector: false
    });
    
    console.log(`\n📊 Search results: ${searchResult.length} found`);
    
    searchResult.forEach((result, index) => {
      console.log(`\n${index + 1}. Score: ${result.score.toFixed(3)}`);
      console.log(`   Title: ${result.payload?.metadata?.title}`);
      console.log(`   Content: "${result.payload?.content?.substring(0, 100)}..."`);
    });
    
    if (searchResult.length === 0) {
      console.log('\n⚠️  No results found. This suggests an issue with:');
      console.log('   - Vector indexing');
      console.log('   - Embedding model mismatch');
      console.log('   - Search parameters');
    }
    
  } catch (error) {
    console.error('❌ Search test failed:', error);
  }
}

testSearch();