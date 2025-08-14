/**
 * Compare direct Qdrant search vs Chat API results
 * to identify where Greece/Iceland documents are being filtered out
 */

import { QdrantClient } from '@qdrant/qdrant-js';
import OpenAI from 'openai';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const API_URL = 'http://localhost:3001';

async function compareSearchVsChat() {
  console.log('🔍 Comparing Direct Search vs Chat API Results\n');
  console.log('=' . repeat(80));
  
  const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
  });
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  // Test queries
  const testCases = [
    { query: 'Greece', expectedDoc: 'Greece Guide' },
    { query: 'Iceland', expectedDoc: 'Iceland/Northern Lights' },
    { query: 'Spain', expectedDoc: 'Spain Guide' },
    { query: 'France', expectedDoc: 'France Guide' }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Testing: "${testCase.query}"`);
    console.log(`${'='.repeat(80)}`);
    
    // 1. Direct Qdrant Search
    console.log('\n1️⃣ DIRECT QDRANT SEARCH');
    console.log('-'.repeat(40));
    
    try {
      const embedding = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: testCase.query,
      });
      
      const directResults = await qdrant.search('tala_admin_knowledge', {
        vector: embedding.data[0].embedding,
        limit: 5,
        with_payload: true
      });
      
      console.log('Results:');
      directResults.forEach((result, i) => {
        const title = result.payload?.metadata?.title || result.payload?.title || 'Unknown';
        const hasExpectedContent = title.toLowerCase().includes(testCase.query.toLowerCase());
        console.log(`${i + 1}. ${title} (Score: ${result.score.toFixed(3)}) ${hasExpectedContent ? '✅' : ''}`);
      });
      
      // Check top result content
      if (directResults.length > 0) {
        const topResult = directResults[0];
        console.log('\nTop Result Analysis:');
        console.log(`- Title: ${topResult.payload?.metadata?.title}`);
        console.log(`- Has content: ${!!topResult.payload?.content}`);
        console.log(`- Content length: ${topResult.payload?.content?.length || 0} chars`);
        console.log(`- Mentions ${testCase.query}: ${(topResult.payload?.content || '').toLowerCase().includes(testCase.query.toLowerCase()) ? 'YES' : 'NO'}`);
      }
      
    } catch (error) {
      console.error('Direct search error:', error.message);
    }
    
    // 2. Chat API Search
    console.log('\n\n2️⃣ CHAT API SEARCH');
    console.log('-'.repeat(40));
    
    try {
      const response = await fetch(`${API_URL}/api/chat/v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'admin-1'
        },
        body: JSON.stringify({
          message: testCase.query,
          mode: 'travel',
          searchKnowledge: true
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('Sources returned:');
        if (data.sources && data.sources.length > 0) {
          data.sources.forEach((source, i) => {
            const hasExpectedContent = source.title.toLowerCase().includes(testCase.query.toLowerCase());
            console.log(`${i + 1}. ${source.title} (Score: ${source.score?.toFixed(3)}) ${hasExpectedContent ? '✅' : ''}`);
          });
        } else {
          console.log('❌ No sources returned!');
        }
        
        console.log('\nResponse Analysis:');
        console.log(`- Mentions ${testCase.query}: ${data.response.toLowerCase().includes(testCase.query.toLowerCase()) ? 'YES' : 'NO'}`);
        console.log(`- Response type: ${data.response.includes('don\'t have specific information') ? 'GENERIC (no KB data)' : 'FROM KB'}`);
        console.log(`- Simple flow used: ${data.metadata?.simpleFlow === true ? 'YES' : 'NO'}`);
        
        // Check if sources match direct search
        if (data.sources && directResults) {
          const chatTopSource = data.sources[0]?.title;
          const directTopResult = directResults[0]?.payload?.metadata?.title || directResults[0]?.payload?.title;
          
          console.log('\n3️⃣ COMPARISON:');
          console.log(`- Direct search top result: ${directTopResult}`);
          console.log(`- Chat API top source: ${chatTopSource}`);
          console.log(`- Match: ${chatTopSource === directTopResult ? '✅ YES' : '❌ NO'}`);
        }
        
      } else {
        console.log('❌ Chat API error:', data.error);
      }
      
    } catch (error) {
      console.error('Chat API error:', error.message);
    }
  }
  
  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log('\nKey Findings:');
  console.log('1. Direct Qdrant search FINDS Greece and Iceland documents');
  console.log('2. Chat API may be returning different results');
  console.log('3. Check if embeddings are being generated with different models');
  console.log('4. Check if results are being filtered or reordered in the chat flow');
}

compareSearchVsChat().catch(console.error);