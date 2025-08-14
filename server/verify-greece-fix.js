/**
 * Final verification that Greece queries work after fixes
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

async function verifyGreeceFix() {
  console.log('🔍 Verifying Greece Knowledge Base Fix\n');
  console.log('=' . repeat(60));
  
  // 1. Direct Qdrant test
  console.log('\n1️⃣ Direct Qdrant Search Test');
  console.log('-'.repeat(40));
  
  try {
    const qdrant = new QdrantClient({
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
    });
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Generate embedding for "greece" using correct model
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'greece',
    });
    
    const results = await qdrant.search('tala_admin_knowledge', {
      vector: embedding.data[0].embedding,
      limit: 5,
      with_payload: true
    });
    
    console.log('✅ Direct search results:');
    results.forEach((result, i) => {
      const title = result.payload?.metadata?.title || result.payload?.title || 'Unknown';
      console.log(`   ${i + 1}. ${title} (Score: ${result.score.toFixed(3)})`);
    });
    
    const hasGreece = results.some(r => 
      r.payload?.metadata?.title?.toLowerCase().includes('greece') ||
      r.payload?.content?.toLowerCase().includes('greece')
    );
    
    if (hasGreece) {
      console.log('✅ Greece content found in Qdrant!');
    } else {
      console.log('⚠️  No Greece content found in top results');
    }
  } catch (error) {
    console.error('❌ Direct search failed:', error.message);
  }
  
  // 2. API endpoint test
  console.log('\n\n2️⃣ API Endpoint Test');
  console.log('-'.repeat(40));
  
  const testQueries = [
    { query: "greece", expected: "Greece content" },
    { query: "tell me about greece", expected: "Greece guide" },
    { query: "Greece travel guide", expected: "Greece information" }
  ];
  
  for (const test of testQueries) {
    console.log(`\n📝 Testing: "${test.query}"`);
    
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
        console.log('✅ API call successful');
        
        // Check if simple flow was used
        if (data.metadata?.simpleFlow === true) {
          console.log('✅ Simple flow used (as expected)');
        } else {
          console.log('⚠️  Complex flow used (unexpected)');
        }
        
        // Check sources
        if (data.sources?.length > 0) {
          console.log('✅ Sources found:', data.sources.map(s => s.title).join(', '));
        } else {
          console.log('⚠️  No sources returned');
        }
        
        // Check if response mentions Greece
        if (data.response.toLowerCase().includes('greece')) {
          console.log('✅ Response mentions Greece');
          console.log('   Preview:', data.response.substring(0, 150) + '...');
        } else {
          console.log('❌ Response does NOT mention Greece');
          console.log('   Preview:', data.response.substring(0, 150) + '...');
        }
      } else {
        console.log('❌ API call failed:', data.error);
      }
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    }
  }
  
  // 3. Summary
  console.log('\n\n3️⃣ Fix Summary');
  console.log('-'.repeat(40));
  console.log('✅ Embedding model unified to text-embedding-3-small');
  console.log('✅ Keyword restriction removed for travel mode');
  console.log('✅ Simple flow restored for all travel queries');
  console.log('\n📌 If Greece queries still fail after server restart:');
  console.log('   1. Check if Greece documents need re-embedding');
  console.log('   2. Verify Qdrant collection has the documents');
  console.log('   3. Check server logs for any errors');
}

verifyGreeceFix().catch(console.error);