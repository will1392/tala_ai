/**
 * Test Knowledge Base Connection and Search
 * 
 * This script verifies that Qdrant is properly connected and documents are searchable
 */

import { QdrantClient } from '@qdrant/qdrant-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const QDRANT_URL = process.env.QDRANT_URL || 'https://2769f27d-a9f0-4361-8f88-3ac61f081dd1.europe-west3-0.gcp.cloud.qdrant.io:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

console.log('🔍 Testing Knowledge Base Connection\n');
console.log('=' . repeat(50));

async function testConnection() {
  console.log('\n📡 Testing Qdrant Connection...');
  console.log(`URL: ${QDRANT_URL}`);
  console.log(`API Key: ${QDRANT_API_KEY ? '✅ Present' : '❌ Missing'}`);
  
  try {
    const qdrant = new QdrantClient({
      url: QDRANT_URL,
      apiKey: QDRANT_API_KEY,
    });
    
    // Test connection by getting collections
    const collections = await qdrant.getCollections();
    console.log(`\n✅ Connected to Qdrant successfully!`);
    console.log(`📚 Found ${collections.collections.length} collections:`);
    
    collections.collections.forEach(col => {
      console.log(`  - ${col.name}`);
    });
    
    return { success: true, qdrant, collections: collections.collections };
  } catch (error) {
    console.error('❌ Failed to connect to Qdrant:', error.message);
    return { success: false, error };
  }
}

async function testCollectionContent(qdrant, collectionName) {
  console.log(`\n📊 Checking collection: ${collectionName}`);
  
  try {
    // Get collection info
    const info = await qdrant.getCollection(collectionName);
    console.log(`  Points count: ${info.points_count}`);
    console.log(`  Vectors count: ${info.vectors_count}`);
    console.log(`  Status: ${info.status}`);
    
    // Get sample points
    const points = await qdrant.scroll(collectionName, {
      limit: 5,
      with_payload: true,
      with_vector: false
    });
    
    console.log(`\n  Sample documents:`);
    points.points.forEach((point, i) => {
      const title = point.payload?.metadata?.title || point.payload?.title || 'Unknown';
      const content = point.payload?.content || point.payload?.text || '';
      console.log(`\n  ${i + 1}. ${title}`);
      console.log(`     Content preview: ${content.substring(0, 100)}...`);
    });
    
    return { success: true, pointsCount: info.points_count };
  } catch (error) {
    console.error(`❌ Error checking collection ${collectionName}:`, error.message);
    return { success: false, error };
  }
}

async function testSearch(qdrant, collectionName, query) {
  console.log(`\n🔍 Testing search in ${collectionName} for: "${query}"`);
  
  try {
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    
    // Generate embedding for the query
    console.log('  Generating embedding...');
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });
    
    const queryVector = embeddingResponse.data[0].embedding;
    console.log(`  ✅ Embedding generated (dimension: ${queryVector.length})`);
    
    // Search in Qdrant
    console.log('  Searching Qdrant...');
    const searchResults = await qdrant.search(collectionName, {
      vector: queryVector,
      limit: 5,
      with_payload: true,
      score_threshold: -1.0 // Very low threshold to see all results
    });
    
    console.log(`\n  Found ${searchResults.length} results:`);
    searchResults.forEach((result, i) => {
      const title = result.payload?.metadata?.title || result.payload?.title || 'Unknown';
      const content = result.payload?.content || result.payload?.text || '';
      console.log(`\n  ${i + 1}. Score: ${result.score.toFixed(3)}`);
      console.log(`     Title: ${title}`);
      console.log(`     Content: ${content.substring(0, 150)}...`);
    });
    
    return { success: true, results: searchResults };
  } catch (error) {
    console.error('❌ Search failed:', error.message);
    return { success: false, error };
  }
}

async function testKeywordExtractor() {
  console.log('\n🔑 Testing KeywordExtractor Integration...');
  
  try {
    const { KeywordExtractor } = await import('./services/search/KeywordExtractor.js');
    const keywordExtractor = new KeywordExtractor();
    
    const qdrant = new QdrantClient({
      url: QDRANT_URL,
      apiKey: QDRANT_API_KEY,
    });
    
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    
    // Test enhanced search
    const searchResults = await keywordExtractor.performEnhancedSearch(
      qdrant,
      openai,
      'tala_admin_knowledge',
      'Tell me about Greece',
      {
        limit: 5,
        scoreThreshold: -0.5
      }
    );
    
    console.log(`\n✅ KeywordExtractor search completed`);
    console.log(`  Keywords extracted: ${searchResults.metadata?.extractedKeywords?.keywords?.join(', ') || 'none'}`);
    console.log(`  Results found: ${searchResults.results.length}`);
    
    return { success: true, results: searchResults };
  } catch (error) {
    console.error('❌ KeywordExtractor test failed:', error.message);
    return { success: false, error };
  }
}

async function main() {
  // Test 1: Connection
  const connectionTest = await testConnection();
  if (!connectionTest.success) {
    console.error('\n❌ Cannot proceed without Qdrant connection');
    return;
  }
  
  const { qdrant, collections } = connectionTest;
  
  // Test 2: Check each collection
  const collectionTests = [];
  for (const col of collections) {
    const result = await testCollectionContent(qdrant, col.name);
    collectionTests.push({ name: col.name, ...result });
  }
  
  // Find collections with content
  const populatedCollections = collectionTests.filter(c => c.success && c.pointsCount > 0);
  
  if (populatedCollections.length === 0) {
    console.error('\n❌ No collections have any documents!');
    console.log('\n💡 This explains why Tala has no knowledge - the vector database is empty');
    return;
  }
  
  // Test 3: Search in populated collections
  console.log('\n\n🧪 Testing Search Functionality');
  console.log('=' . repeat(50));
  
  for (const col of populatedCollections) {
    await testSearch(qdrant, col.name, 'Greece travel guide');
    await testSearch(qdrant, col.name, 'Spain hotels');
  }
  
  // Test 4: KeywordExtractor
  await testKeywordExtractor();
  
  // Summary
  console.log('\n\n📊 SUMMARY');
  console.log('=' . repeat(50));
  console.log(`✅ Qdrant Connection: Working`);
  console.log(`📚 Total Collections: ${collections.length}`);
  console.log(`📄 Collections with Documents: ${populatedCollections.length}`);
  
  if (populatedCollections.length > 0) {
    console.log('\nCollections with content:');
    populatedCollections.forEach(col => {
      console.log(`  - ${col.name}: ${col.pointsCount} documents`);
    });
  } else {
    console.log('\n❌ PROBLEM: No documents found in any collection!');
    console.log('   This is why Tala says it has no knowledge about Greece.');
    console.log('\n💡 Solution: You need to upload/index travel documents into Qdrant');
  }
}

// Run the test
main().catch(console.error);