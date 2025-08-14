/**
 * Test Context-Aware Search for Greece
 */

import { QdrantClient } from '@qdrant/qdrant-js';
import OpenAI from 'openai';
import { ContextAwareSearch } from './services/search/ContextAwareSearch.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function testContextAwareGreece() {
  console.log('🔍 Testing Context-Aware Greece Search\n');
  
  const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
  });
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  const contextAwareSearch = new ContextAwareSearch();
  
  // Test 1: Direct query without conversation history
  console.log('1️⃣ Testing direct query "Tell me about Greece" without history...');
  const directResults = await contextAwareSearch.performContextAwareSearch({
    qdrantClient: qdrant,
    openaiClient: openai,
    collectionName: 'tala_admin_knowledge',
    currentMessage: 'Tell me about Greece',
    conversationHistory: [],
    searchOptions: {
      limit: 5,
      scoreThreshold: 0.0
    }
  });
  
  console.log('\nDirect search results:');
  console.log('Enhanced query:', directResults.query);
  console.log('Context:', directResults.context);
  directResults.results.forEach((result, i) => {
    const title = result.payload?.metadata?.title || 'Unknown';
    console.log(`${i + 1}. ${title} (Score: ${result.score.toFixed(3)})`);
    if (title.toLowerCase().includes('greece')) {
      console.log('   ✅ Found Greece document!');
    }
  });
  
  // Test 2: Query with conversation history
  console.log('\n\n2️⃣ Testing follow-up query with conversation history...');
  const conversationHistory = [
    { content: 'I want to plan a trip', role: 'user' },
    { content: 'I can help you plan your trip! Where would you like to go?', role: 'assistant' },
    { content: 'Tell me about Greece', role: 'user' }
  ];
  
  const contextResults = await contextAwareSearch.performContextAwareSearch({
    qdrantClient: qdrant,
    openaiClient: openai,
    collectionName: 'tala_admin_knowledge',
    currentMessage: 'What about hotels?',
    conversationHistory: conversationHistory,
    searchOptions: {
      limit: 5,
      scoreThreshold: 0.0
    }
  });
  
  console.log('\nContext-aware search results:');
  console.log('Enhanced query:', contextResults.query);
  console.log('Context:', contextResults.context);
  contextResults.results.forEach((result, i) => {
    const title = result.payload?.metadata?.title || 'Unknown';
    console.log(`${i + 1}. ${title} (Score: ${result.score.toFixed(3)})`);
    if (title.toLowerCase().includes('greece')) {
      console.log('   ✅ Found Greece document!');
    }
  });
  
  // Test 3: Check what happens with the exact query from the chat
  console.log('\n\n3️⃣ Testing exact chat query...');
  const chatResults = await contextAwareSearch.performContextAwareSearch({
    qdrantClient: qdrant,
    openaiClient: openai,
    collectionName: 'tala_admin_knowledge',
    currentMessage: 'greece',
    conversationHistory: [],
    searchOptions: {
      limit: 5,
      scoreThreshold: 0.0
    }
  });
  
  console.log('\nChat query results:');
  console.log('Enhanced query:', chatResults.query);
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
  console.log(foundGreece ? '✅ Context-aware Greece search is WORKING!' : '❌ Context-aware Greece search is broken');
}

testContextAwareGreece().catch(console.error);