/**
 * Test the complete chat flow for Greece query
 * This simulates exactly what happens when a user asks about Greece
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

const API_URL = 'http://localhost:5008';

async function verifyGreeceInKnowledgeBase() {
  console.log('🔍 Step 1: Verify Greece Guide exists in knowledge base\n');
  
  const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
  });
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  // Direct search for Greece
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: 'Greece travel guide',
  });
  
  const searchResponse = await qdrant.search('tala_admin_knowledge', {
    vector: embeddingResponse.data[0].embedding,
    limit: 3,
    score_threshold: 0.0,
    with_payload: true
  });
  
  console.log('Knowledge base search results:');
  let greeceFound = false;
  searchResponse.forEach((result, i) => {
    const title = result.payload?.metadata?.title || result.payload?.title || 'Unknown';
    const isGreece = title.toLowerCase().includes('greece');
    console.log(`${i + 1}. ${title} (Score: ${result.score.toFixed(3)}) ${isGreece ? '✅ GREECE!' : ''}`);
    if (isGreece) {
      greeceFound = true;
      console.log(`   Content preview: ${result.payload?.content?.substring(0, 200)}...`);
    }
  });
  
  return greeceFound;
}

async function testChatEndpoint() {
  console.log('\n\n🌐 Step 2: Test Chat Endpoint with Greece Query\n');
  
  const queries = [
    'Tell me about Greece',
    'What can you tell me about Greece?',
    'I want to know about Greece'
  ];
  
  for (const query of queries) {
    console.log(`\n📤 Sending query: "${query}"`);
    console.log('Request details:');
    console.log('- Endpoint: /api/chat/v2');
    console.log('- Mode: travel');
    console.log('- Search Knowledge: true');
    
    try {
      const response = await fetch(`${API_URL}/api/chat/v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'admin-1'
        },
        body: JSON.stringify({
          message: query,
          mode: 'travel',
          searchKnowledge: true
        })
      });
      
      const data = await response.json();
      
      console.log('\n📥 Response received:');
      console.log('- Status:', response.status);
      console.log('- Success:', data.success);
      
      if (data.sources && data.sources.length > 0) {
        console.log('\n📚 Sources used:');
        data.sources.forEach(source => {
          console.log(`  - ${source.title} (${source.type})`);
        });
      } else {
        console.log('\n⚠️  NO SOURCES RETURNED!');
      }
      
      if (data.response) {
        const responseText = data.response.toLowerCase();
        const mentionsGreece = responseText.includes('greece') || responseText.includes('greek');
        const isGeneric = responseText.includes('i can help') || responseText.includes('what would you like') || responseText.includes('please provide');
        
        console.log('\n📝 Response analysis:');
        console.log(`- Mentions Greece: ${mentionsGreece ? '✅' : '❌'}`);
        console.log(`- Generic response: ${isGeneric ? '❌ YES (Bad!)' : '✅ NO (Good!)'}`);
        console.log(`- Response length: ${data.response.length} chars`);
        
        console.log('\nResponse preview:');
        console.log(data.response.substring(0, 300) + '...');
        
        if (!mentionsGreece || isGeneric) {
          console.log('\n❌ PROBLEM: Response does not use knowledge base content!');
        } else {
          console.log('\n✅ Response appears to use knowledge base content');
        }
      }
      
    } catch (error) {
      console.error('❌ Request failed:', error.message);
    }
  }
}

async function debugKnowledgeFlow() {
  console.log('\n\n🔬 Step 3: Debug Knowledge Base Flow\n');
  
  // Check server logs to understand the flow
  console.log('To debug further, check server logs for:');
  console.log('1. "🔍 Knowledge base search check" - Shows if search is triggered');
  console.log('2. "📊 Collection info" - Shows if collection exists and has documents');
  console.log('3. "🎯 Context-aware search performed" - Shows search query enhancement');
  console.log('4. "🔍 Qdrant search results" - Shows what was found');
  console.log('5. "📚 Knowledge context length" - Shows if context was built');
  console.log('6. "🚀 Sending to intelligence layer" - Shows what\'s sent to LLM');
  
  console.log('\n💡 Common issues to check:');
  console.log('- Is mode === "travel"? (should be true)');
  console.log('- Is searchKnowledge === true? (should be true)');
  console.log('- Are search results being found but not used?');
  console.log('- Is the knowledge context being built but ignored by LLM?');
}

async function suggestFixes() {
  console.log('\n\n🛠️ Step 4: Potential Fixes\n');
  
  console.log('If Greece guide exists but Tala doesn\'t use it:');
  console.log('\n1. Check if knowledge context is reaching the LLM:');
  console.log('   - Look for "Enhanced content length" in logs');
  console.log('   - Should show knowledge base content appended');
  
  console.log('\n2. Verify system prompt enforcement:');
  console.log('   - Travel mode should have strict prompt to use KB');
  console.log('   - Check if TRAVEL_MODE_SYSTEM_PROMPT is being used');
  
  console.log('\n3. Check routing decision:');
  console.log('   - Task type should be "general" not "create-task"');
  console.log('   - Should use "direct-response" strategy');
  
  console.log('\n4. Verify LLM is getting instructions:');
  console.log('   - System prompt should say "ALWAYS USE THE KNOWLEDGE BASE"');
  console.log('   - Should include the actual Greece content');
}

async function main() {
  console.log('🧪 Complete Greece Chat Flow Test\n');
  console.log('=' . repeat(60));
  
  // Step 1: Verify Greece exists
  const greeceExists = await verifyGreeceInKnowledgeBase();
  
  if (!greeceExists) {
    console.error('\n❌ CRITICAL: Greece guide not found in knowledge base!');
    console.log('   Need to re-upload or check collection name');
    return;
  }
  
  console.log('\n✅ Greece guide confirmed in knowledge base');
  
  // Step 2: Test chat endpoint
  await testChatEndpoint();
  
  // Step 3: Debug guidance
  await debugKnowledgeFlow();
  
  // Step 4: Suggest fixes
  await suggestFixes();
  
  console.log('\n\n📋 SUMMARY');
  console.log('=' . repeat(60));
  console.log('Run this test while the server is running to see exactly where');
  console.log('the Greece knowledge base content is being lost in the flow.');
}

main().catch(console.error);