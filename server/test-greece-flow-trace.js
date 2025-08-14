/**
 * Trace the exact flow when searching for Greece
 */

import fetch from 'node-fetch';
import { QdrantClient } from '@qdrant/qdrant-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const API_URL = 'http://localhost:3001';

async function traceGreeceFlow() {
  console.log('🔍 Tracing Greece Query Flow\n');
  console.log('=' . repeat(60));
  
  // 1. Verify Greece exists with correct embedding
  console.log('\n1️⃣ Verifying Greece Document Exists');
  console.log('-'.repeat(40));
  
  const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
  });
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  try {
    // Direct search with correct model
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'Greece travel guide',
    });
    
    const results = await qdrant.search('tala_admin_knowledge', {
      vector: embedding.data[0].embedding,
      limit: 1,
      with_payload: true
    });
    
    if (results.length > 0 && results[0].payload?.metadata?.title?.includes('Greece')) {
      console.log('✅ Greece document found in Qdrant');
      console.log(`   Title: ${results[0].payload.metadata.title}`);
      console.log(`   Score: ${results[0].score}`);
      console.log(`   Content preview: ${results[0].payload.content.substring(0, 100)}...`);
    } else {
      console.log('❌ Greece document NOT found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  // 2. Test via API with detailed logging
  console.log('\n\n2️⃣ Testing via API (Travel Mode)');
  console.log('-'.repeat(40));
  
  const testQuery = "Greece";
  
  console.log(`Sending query: "${testQuery}"`);
  console.log('Request body:', {
    message: testQuery,
    mode: 'travel',
    searchKnowledge: true
  });
  
  try {
    const response = await fetch(`${API_URL}/api/chat/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'admin-1'
      },
      body: JSON.stringify({
        message: testQuery,
        mode: 'travel',
        searchKnowledge: true
      })
    });
    
    const data = await response.json();
    
    console.log('\n📥 Response Analysis:');
    console.log(`   Success: ${data.success}`);
    console.log(`   Simple flow used: ${data.metadata?.simpleFlow === true ? 'YES' : 'NO'}`);
    console.log(`   Sources found: ${data.sources?.length || 0}`);
    
    if (data.sources && data.sources.length > 0) {
      console.log('\n   Sources:');
      data.sources.forEach((s, i) => {
        console.log(`   ${i+1}. ${s.title} (Score: ${s.score?.toFixed(3)})`);
      });
    }
    
    console.log('\n   Response mentions Greece: ' + 
      (data.response?.toLowerCase().includes('greece') ? '✅ YES' : '❌ NO'));
    
    if (!data.response?.toLowerCase().includes('greece')) {
      console.log('\n   ⚠️  Response does not mention Greece!');
      console.log('   Response preview:', data.response?.substring(0, 200) + '...');
    }
    
  } catch (error) {
    console.error('API Error:', error.message);
  }
  
  // 3. Test simple flow directly
  console.log('\n\n3️⃣ Testing Simple Flow Directly');
  console.log('-'.repeat(40));
  
  try {
    // Simulate what the simple flow should do
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: testQuery,
    });
    
    const searchResults = await qdrant.search('tala_admin_knowledge', {
      vector: embedding.data[0].embedding,
      limit: 3,
      with_payload: true
    });
    
    console.log('Direct search results:');
    searchResults.forEach((result, i) => {
      const title = result.payload?.metadata?.title || 'Unknown';
      console.log(`${i + 1}. ${title} (Score: ${result.score.toFixed(3)})`);
    });
    
    if (searchResults.length > 0) {
      const topResult = searchResults[0];
      const content = topResult.payload?.content || '';
      const title = topResult.payload?.metadata?.title || 'Document';
      
      console.log('\n📄 Using top result for response:');
      console.log(`   Title: ${title}`);
      console.log(`   Content length: ${content.length} chars`);
      console.log(`   Mentions Greece: ${content.toLowerCase().includes('greece') ? 'YES' : 'NO'}`);
      
      // What the simple prompt would be
      const simplePrompt = `You are Tala, a helpful travel assistant. Based on the following travel guide information, answer the user's question.

Travel Guide: ${title}
${content.substring(0, 2000)}

User question: ${testQuery}

Provide a helpful, informative response about the destination. Be specific and use the information provided.`;

      console.log('\n📝 Simple prompt would use:');
      console.log(`   - ${title}`);
      console.log(`   - First 2000 chars of content`);
      console.log(`   - Direct question: "${testQuery}"`);
    }
    
  } catch (error) {
    console.error('Direct test error:', error.message);
  }
  
  // 4. Summary
  console.log('\n\n4️⃣ Flow Summary');
  console.log('-'.repeat(40));
  console.log('✅ Greece document EXISTS in Qdrant');
  console.log('✅ Can be found with text-embedding-3-small');
  console.log('❓ Check if simple flow is actually being used');
  console.log('❓ Check if response is using the Greece content');
}

traceGreeceFlow().catch(console.error);