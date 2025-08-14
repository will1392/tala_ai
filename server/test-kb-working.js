import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('🧪 Testing Knowledge Base functionality...\n');

// Test 1: Direct API call with travel mode
console.log('📋 Test 1: Direct API call with travel mode');
try {
  const response = await fetch('http://localhost:3001/api/chat/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'admin-1'
    },
    body: JSON.stringify({
      message: 'What visa requirements are there for France?',
      userId: 'admin-1',
      isAdmin: true,
      mode: 'travel',
      searchKnowledge: true
    })
  });

  const data = await response.json();
  
  console.log('✅ Response received:');
  console.log('   - Success:', data.success);
  console.log('   - Has response:', !!data.response);
  console.log('   - Response length:', data.response?.length || 0);
  console.log('   - Has sources:', !!data.sources);
  console.log('   - Sources count:', data.sources?.length || 0);
  
  if (data.sources?.length > 0) {
    console.log('\n📚 Sources found:');
    data.sources.forEach((source, i) => {
      console.log(`   ${i + 1}. ${source.title} (Score: ${source.score?.toFixed(3) || 'N/A'})`);
    });
  }
  
  console.log('\n📝 Response excerpt:', data.response?.substring(0, 200) + '...');
  
} catch (error) {
  console.error('❌ Test 1 failed:', error.message);
}

console.log('\n' + '='.repeat(80) + '\n');

// Test 2: Test with CMO mode (should not search KB)
console.log('📋 Test 2: CMO mode (should not search KB)');
try {
  const response = await fetch('http://localhost:3001/api/chat/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'admin-1'
    },
    body: JSON.stringify({
      message: 'How can I improve my marketing strategy?',
      userId: 'admin-1',
      isAdmin: true,
      mode: 'cmo',
      searchKnowledge: false
    })
  });

  const data = await response.json();
  
  console.log('✅ Response received:');
  console.log('   - Success:', data.success);
  console.log('   - Has sources:', !!data.sources);
  console.log('   - Sources count:', data.sources?.length || 0);
  console.log('   - Should have no sources (CMO mode)');
  
} catch (error) {
  console.error('❌ Test 2 failed:', error.message);
}

console.log('\n' + '='.repeat(80) + '\n');

// Test 3: Check Qdrant directly
console.log('📋 Test 3: Direct Qdrant check');
try {
  const { QdrantClient } = await import('@qdrant/qdrant-js');
  const OpenAI = await import('openai');
  
  const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
  });
  
  const openai = new OpenAI.default({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  // Get embedding for query
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: 'visa requirements France'
  });
  
  const queryVector = embedding.data[0].embedding;
  
  // Search Qdrant
  const searchResults = await qdrant.search('tala_admin_knowledge', {
    vector: queryVector,
    limit: 5,
    score_threshold: 0.0
  });
  
  console.log('✅ Direct Qdrant search results:');
  console.log('   - Results count:', searchResults.length);
  searchResults.forEach((result, i) => {
    console.log(`   ${i + 1}. ${result.payload?.metadata?.title || 'Unknown'} (Score: ${result.score.toFixed(3)})`);
  });
  
} catch (error) {
  console.error('❌ Test 3 failed:', error.message);
}

console.log('\n✨ Knowledge Base test complete!');