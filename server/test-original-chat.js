/**
 * Test to understand the original chat implementation
 * 
 * Let's trace through what should happen for a simple Greece query
 */

import { QdrantClient } from '@qdrant/qdrant-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function testOriginalFlow() {
  console.log('🔍 Testing Original Simple Knowledge Base Flow\n');
  console.log('=' . repeat(60));
  
  const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
  });
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  // Step 1: Simple embedding search (the original way)
  console.log('1️⃣ Original Simple Search for Greece\n');
  
  const query = "Tell me about Greece";
  
  // Generate embedding
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });
  
  // Search Qdrant
  const results = await qdrant.search('tala_admin_knowledge', {
    vector: embedding.data[0].embedding,
    limit: 5,
    with_payload: true
  });
  
  console.log('Search Results:');
  results.forEach((result, i) => {
    const title = result.payload?.metadata?.title || result.payload?.title || 'Unknown';
    console.log(`${i + 1}. ${title} (Score: ${result.score})`);
  });
  
  // Step 2: Original response format
  console.log('\n2️⃣ Original Response Format\n');
  
  if (results.length > 0) {
    const topResult = results[0];
    const content = topResult.payload?.content || '';
    
    // The ORIGINAL simple way was just to take the content and use it
    console.log('Top result content length:', content.length);
    console.log('Content preview:', content.substring(0, 500) + '...');
    
    // Original prompt was simple
    const originalPrompt = `Based on the following information, answer the user's question about Greece:

${content.substring(0, 2000)}

User question: ${query}

Please provide a helpful, informative response.`;
    
    console.log('\n3️⃣ Original Simple Prompt:\n');
    console.log(originalPrompt);
    
    // The original implementation would just send this to OpenAI
    console.log('\n4️⃣ What the Original System Did:');
    console.log('1. Search Qdrant ✅');
    console.log('2. Take top result ✅');
    console.log('3. Use first ~2000 chars ✅');
    console.log('4. Simple prompt to OpenAI ✅');
    console.log('5. Return response ✅');
    
    console.log('\n5️⃣ What Might Be Breaking It Now:');
    console.log('❌ TalaIntelligence complexity');
    console.log('❌ Task routing (treating as task instead of query)');
    console.log('❌ Context compression issues');
    console.log('❌ Multiple chat endpoints');
    console.log('❌ Mode detection problems');
    console.log('❌ Content size (217KB is too much)');
  }
  
  console.log('\n\n💡 SOLUTION:');
  console.log('The original implementation was SIMPLE and WORKED.');
  console.log('We need to ensure travel queries go through the simple flow,');
  console.log('not the complex intelligence system that might be misrouting them.');
}

testOriginalFlow().catch(console.error);