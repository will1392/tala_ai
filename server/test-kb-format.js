/**
 * Test Knowledge Base Content Format
 * 
 * This checks if the knowledge base content is properly formatted
 * and would be correctly extracted by TalaIntelligence
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

async function testKnowledgeBaseFormat() {
  console.log('🔍 Testing Knowledge Base Content Format\n');
  console.log('=' . repeat(60));
  
  const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
  });
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  const contextAwareSearch = new ContextAwareSearch();
  
  // Simulate what intelligentChat.js does
  console.log('1️⃣ Simulating chat endpoint search for "Tell me about Greece"\n');
  
  const searchResults = await contextAwareSearch.performContextAwareSearch({
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
  
  console.log('Search results found:', searchResults.results.length);
  
  if (searchResults.results.length > 0) {
    // Format exactly as intelligentChat.js does
    const contextChunks = searchResults.results.map(result => ({
      content: result.payload.content,
      title: result.payload.metadata?.title || 'Unknown Document',
      score: result.score
    }));
    
    const knowledgeContext = '\n\nRelevant information from knowledge base:\n' + 
      contextChunks.map(chunk => 
        `[${chunk.title} - Score: ${chunk.score.toFixed(2)}]\n${chunk.content}\n`
      ).join('\n---\n');
    
    console.log('\n2️⃣ Knowledge Context Built:');
    console.log('Length:', knowledgeContext.length, 'characters');
    console.log('\nFirst 1000 characters:');
    console.log('-' . repeat(60));
    console.log(knowledgeContext.substring(0, 1000));
    console.log('-' . repeat(60));
    
    // Test how TalaIntelligence would extract it
    console.log('\n3️⃣ Testing TalaIntelligence extraction:');
    
    const fullContent = 'Tell me about Greece' + knowledgeContext;
    
    if (fullContent.includes('Relevant information from knowledge base:')) {
      const parts = fullContent.split('Relevant information from knowledge base:');
      const extractedKB = parts[1] ? parts[1].trim() : '';
      
      console.log('✅ Knowledge base marker found');
      console.log('Extracted KB content length:', extractedKB.length);
      console.log('\nExtracted content preview:');
      console.log(extractedKB.substring(0, 500) + '...');
      
      // Check if Greece content is actually there
      const hasGreece = extractedKB.toLowerCase().includes('greece');
      console.log('\n✅ Contains Greece content:', hasGreece);
    } else {
      console.log('❌ Knowledge base marker NOT found!');
    }
    
    // Show what the system prompt would look like
    console.log('\n4️⃣ System Prompt Preview:');
    const TRAVEL_MODE_SYSTEM_PROMPT = `You are Tala, a specialized TRAVEL ASSISTANT with access to a comprehensive travel knowledge base.

CRITICAL RULES - YOU MUST FOLLOW THESE IN ORDER OF IMPORTANCE:

1. **CONVERSATION CONTEXT IS PARAMOUNT**...

KNOWLEDGE BASE CONTENT:
{knowledgeBaseContent}

USER QUERY: {userQuery}`;
    
    const userQuery = 'Tell me about Greece';
    const finalPrompt = TRAVEL_MODE_SYSTEM_PROMPT
      .replace('{knowledgeBaseContent}', knowledgeContext.substring(0, 500) + '...[truncated]')
      .replace('{userQuery}', userQuery);
    
    console.log('\nFinal prompt preview:');
    console.log('-' . repeat(60));
    console.log(finalPrompt.substring(0, 800));
    console.log('-' . repeat(60));
    
  } else {
    console.log('❌ No search results found!');
  }
  
  console.log('\n\n📊 DIAGNOSIS:');
  console.log('If Greece content is found but Tala gives generic responses, check:');
  console.log('1. Is the LLM router receiving the full enhanced content?');
  console.log('2. Is the system prompt being applied correctly?');
  console.log('3. Is there a token limit truncating the knowledge base content?');
  console.log('4. Is the LLM model following the system prompt instructions?');
}

testKnowledgeBaseFormat().catch(console.error);