/**
 * Diagnose why some documents can be found (Spain, France) 
 * while others cannot (Greece, Iceland Northern Lights)
 */

import { QdrantClient } from '@qdrant/qdrant-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function diagnoseDocumentDiscrepancy() {
  console.log('🔍 Diagnosing Document Search Discrepancy\n');
  console.log('=' . repeat(80));
  
  const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
  });
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  // 1. Get ALL documents from the knowledge base
  console.log('\n1️⃣ Listing ALL Documents in Knowledge Base');
  console.log('-'.repeat(80));
  
  const allDocuments = [];
  let scrollId = null;
  
  try {
    do {
      const result = await qdrant.scroll('tala_admin_knowledge', {
        scroll_id: scrollId,
        limit: 100,
        with_payload: true,
        with_vector: true
      });
      
      scrollId = result.next_page_offset;
      
      for (const point of result.points || []) {
        const doc = {
          id: point.id,
          title: point.payload?.metadata?.title || point.payload?.title || 'Unknown',
          uploadDate: point.payload?.metadata?.uploadDate || 'Unknown',
          fileType: point.payload?.metadata?.fileType || 'Unknown',
          vectorSize: point.vector?.length || (Array.isArray(point.vector) ? point.vector.length : 'Unknown'),
          contentLength: point.payload?.content?.length || 0,
          contentPreview: (point.payload?.content || '').substring(0, 100),
          metadata: point.payload?.metadata || {},
          hasContent: !!point.payload?.content,
          payloadKeys: Object.keys(point.payload || {})
        };
        allDocuments.push(doc);
      }
    } while (scrollId);
    
    console.log(`Found ${allDocuments.length} documents total\n`);
    
    // Group documents
    const workingDocs = ['Spain', 'France'];
    const notWorkingDocs = ['Greece', 'Iceland', 'Northern Lights'];
    
    console.log('📋 Document Analysis:');
    console.log('=' . repeat(80));
    
    allDocuments.forEach(doc => {
      const category = workingDocs.some(w => doc.title.includes(w)) ? '✅ WORKING' :
                      notWorkingDocs.some(w => doc.title.includes(w)) ? '❌ NOT WORKING' : 
                      '❓ OTHER';
      
      console.log(`\n${category}: ${doc.title}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Upload Date: ${doc.uploadDate}`);
      console.log(`   File Type: ${doc.fileType}`);
      console.log(`   Vector Size: ${doc.vectorSize}`);
      console.log(`   Content Length: ${doc.contentLength} chars`);
      console.log(`   Has Content: ${doc.hasContent}`);
      console.log(`   Payload Keys: ${doc.payloadKeys.join(', ')}`);
      console.log(`   Content Preview: ${doc.contentPreview}`);
    });
    
  } catch (error) {
    console.error('Error listing documents:', error);
  }
  
  // 2. Test search for each category
  console.log('\n\n2️⃣ Testing Search for Each Document Category');
  console.log('-'.repeat(80));
  
  const testQueries = [
    { query: 'Spain', expected: 'Spain guide' },
    { query: 'France', expected: 'France guide' },
    { query: 'Greece', expected: 'Greece guide' },
    { query: 'Iceland', expected: 'Iceland or Northern Lights' },
    { query: 'Northern Lights', expected: 'Northern Lights' }
  ];
  
  for (const test of testQueries) {
    console.log(`\n🔍 Searching for: "${test.query}"`);
    
    try {
      // Generate embedding with current model
      const embedding = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: test.query,
      });
      
      // Search
      const results = await qdrant.search('tala_admin_knowledge', {
        vector: embedding.data[0].embedding,
        limit: 5,
        with_payload: true
      });
      
      console.log('   Results:');
      let foundExpected = false;
      
      results.forEach((result, i) => {
        const title = result.payload?.metadata?.title || result.payload?.title || 'Unknown';
        const score = result.score.toFixed(3);
        const isExpected = title.toLowerCase().includes(test.query.toLowerCase());
        
        if (isExpected) foundExpected = true;
        
        console.log(`   ${i + 1}. ${title} (Score: ${score}) ${isExpected ? '✅' : ''}`);
      });
      
      if (!foundExpected) {
        console.log(`   ❌ Expected "${test.expected}" NOT found in top results!`);
      }
      
    } catch (error) {
      console.error(`   Error searching: ${error.message}`);
    }
  }
  
  // 3. Check for embedding dimension mismatch
  console.log('\n\n3️⃣ Checking Embedding Dimensions');
  console.log('-'.repeat(80));
  
  const dimensionGroups = {};
  allDocuments.forEach(doc => {
    const dim = doc.vectorSize;
    if (!dimensionGroups[dim]) dimensionGroups[dim] = [];
    dimensionGroups[dim].push(doc.title);
  });
  
  const workingDocs = ['Spain', 'France'];
  const notWorkingDocs = ['Greece', 'Iceland', 'Northern Lights'];
  
  console.log('Documents grouped by vector dimensions:');
  Object.entries(dimensionGroups).forEach(([dim, docs]) => {
    console.log(`\n   ${dim} dimensions: ${docs.length} documents`);
    docs.forEach(title => {
      const category = workingDocs.some(w => title.includes(w)) ? '✅' :
                      notWorkingDocs.some(w => title.includes(w)) ? '❌' : '❓';
      console.log(`      ${category} ${title}`);
    });
  });
  
  // 4. Check metadata structure differences
  console.log('\n\n4️⃣ Checking Metadata Structure Differences');
  console.log('-'.repeat(80));
  
  const metadataPatterns = new Map();
  
  allDocuments.forEach(doc => {
    const pattern = JSON.stringify(Object.keys(doc.metadata).sort());
    if (!metadataPatterns.has(pattern)) {
      metadataPatterns.set(pattern, []);
    }
    metadataPatterns.get(pattern).push(doc.title);
  });
  
  console.log('Documents grouped by metadata structure:');
  let patternIndex = 1;
  metadataPatterns.forEach((docs, pattern) => {
    console.log(`\nPattern ${patternIndex}:`, pattern);
    docs.forEach(title => {
      const category = workingDocs.some(w => title.includes(w)) ? '✅' :
                      notWorkingDocs.some(w => title.includes(w)) ? '❌' : '❓';
      console.log(`   ${category} ${title}`);
    });
    patternIndex++;
  });
  
  // 5. Summary
  console.log('\n\n5️⃣ SUMMARY');
  console.log('-'.repeat(80));
  
  console.log('\nPossible reasons for discrepancy:');
  console.log('1. Different embedding dimensions (1536 vs other)');
  console.log('2. Different metadata structure');
  console.log('3. Different upload methods/times');
  console.log('4. Missing content field in payload');
  console.log('5. Different embedding models used during upload');
  
  console.log('\nRecommendations:');
  console.log('1. Check if all documents have 1536 dimensions (text-embedding-3-small)');
  console.log('2. Re-upload Greece and Iceland documents with current system');
  console.log('3. Ensure consistent metadata structure across all documents');
}

diagnoseDocumentDiscrepancy().catch(console.error);