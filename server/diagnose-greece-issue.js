/**
 * Comprehensive diagnosis of why Greece documents can't be found
 */

import { QdrantClient } from '@qdrant/qdrant-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function diagnoseGreeceIssue() {
  console.log('🔍 Diagnosing Greece Knowledge Base Issue\n');
  console.log('=' . repeat(60));
  
  const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
  });
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  // 1. Check all collections for Greece content
  console.log('\n1️⃣ Checking All Collections for Greece Content');
  console.log('-'.repeat(40));
  
  try {
    const collections = await qdrant.getCollections();
    console.log(`Found ${collections.collections.length} collections:`);
    
    for (const collection of collections.collections) {
      console.log(`\n📂 Collection: ${collection.name}`);
      
      try {
        // Get collection info
        const info = await qdrant.getCollection(collection.name);
        console.log(`   Points: ${info.points_count}`);
        console.log(`   Vectors: ${info.config.params.vectors.size} dimensions`);
        
        // Scroll through points to find Greece content
        let hasGreece = false;
        let scrollId = null;
        let greecePoints = [];
        
        do {
          const result = await qdrant.scroll(collection.name, {
            scroll_id: scrollId,
            limit: 100,
            with_payload: true
          });
          
          scrollId = result.next_page_offset;
          
          for (const point of result.points || []) {
            const payload = point.payload;
            const title = payload?.metadata?.title || payload?.title || '';
            const content = payload?.content || '';
            
            if (title.toLowerCase().includes('greece') || 
                content.toLowerCase().includes('greece')) {
              hasGreece = true;
              greecePoints.push({
                id: point.id,
                title: title,
                contentPreview: content.substring(0, 100) + '...'
              });
            }
          }
        } while (scrollId);
        
        if (hasGreece) {
          console.log(`   ✅ FOUND ${greecePoints.length} Greece documents!`);
          greecePoints.slice(0, 3).forEach(doc => {
            console.log(`      - ${doc.title}`);
            console.log(`        ${doc.contentPreview}`);
          });
        } else {
          console.log('   ❌ No Greece content found');
        }
        
      } catch (error) {
        console.log(`   ⚠️  Error reading collection: ${error.message}`);
      }
    }
  } catch (error) {
    console.error('Error listing collections:', error);
  }
  
  // 2. Test search with both embedding models
  console.log('\n\n2️⃣ Testing Search with Different Embedding Models');
  console.log('-'.repeat(40));
  
  const testQueries = ['greece', 'Greece', 'Greece travel guide'];
  const models = ['text-embedding-3-small', 'text-embedding-ada-002'];
  
  for (const model of models) {
    console.log(`\n🔧 Testing with model: ${model}`);
    
    for (const query of testQueries) {
      try {
        // Generate embedding
        const embedding = await openai.embeddings.create({
          model: model,
          input: query,
        });
        
        // Search in admin collection
        const results = await qdrant.search('tala_admin_knowledge', {
          vector: embedding.data[0].embedding,
          limit: 5,
          with_payload: true
        });
        
        console.log(`\n   Query: "${query}"`);
        if (results.length > 0) {
          console.log('   Top results:');
          results.slice(0, 3).forEach((result, i) => {
            const title = result.payload?.metadata?.title || result.payload?.title || 'Unknown';
            console.log(`     ${i + 1}. ${title} (Score: ${result.score.toFixed(3)})`);
          });
          
          // Check if Greece is in results
          const hasGreece = results.some(r => 
            (r.payload?.metadata?.title || '').toLowerCase().includes('greece') ||
            (r.payload?.content || '').toLowerCase().includes('greece')
          );
          
          if (hasGreece) {
            console.log('     ✅ Greece found in results!');
          } else {
            console.log('     ❌ Greece NOT in top results');
          }
        } else {
          console.log('   ❌ No results returned');
        }
      } catch (error) {
        console.log(`   ❌ Error with ${model}: ${error.message}`);
      }
    }
  }
  
  // 3. Check document metadata
  console.log('\n\n3️⃣ Checking Document Metadata');
  console.log('-'.repeat(40));
  
  try {
    // Search for any document with "greece" in the title using filter
    const filterResults = await qdrant.search('tala_admin_knowledge', {
      vector: new Array(1536).fill(0), // Dummy vector
      limit: 100,
      with_payload: true,
      filter: {
        should: [
          {
            key: "metadata.title",
            match: {
              text: "greece"
            }
          }
        ]
      }
    });
    
    if (filterResults.length > 0) {
      console.log(`Found ${filterResults.length} documents with "greece" in title via filter`);
      filterResults.forEach(doc => {
        console.log(`- ${doc.payload?.metadata?.title || 'Unknown'}`);
        console.log(`  Upload date: ${doc.payload?.metadata?.uploadDate || 'Unknown'}`);
        console.log(`  File type: ${doc.payload?.metadata?.fileType || 'Unknown'}`);
      });
    } else {
      console.log('No documents found with "greece" in title via filter');
    }
  } catch (error) {
    console.log('Filter search not supported or failed:', error.message);
  }
  
  // 4. Summary and recommendations
  console.log('\n\n4️⃣ Diagnosis Summary');
  console.log('-'.repeat(40));
  console.log('\nPossible issues:');
  console.log('1. Greece documents were uploaded with old embedding model');
  console.log('2. Greece documents are in a different collection');
  console.log('3. Greece documents were never uploaded');
  console.log('4. Metadata structure is different for Greece docs');
  console.log('\nRecommended fix:');
  console.log('- Re-upload Greece travel guide with current system');
  console.log('- Or create a re-embedding script for existing documents');
}

diagnoseGreeceIssue().catch(console.error);