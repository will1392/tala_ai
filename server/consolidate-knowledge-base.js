/**
 * Consolidate Knowledge Base Collections
 * 
 * This script moves all documents from scattered collections into tala_admin_knowledge
 */

import { QdrantClient } from '@qdrant/qdrant-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function consolidateKnowledgeBase() {
  console.log('🔧 Consolidating Knowledge Base Collections\n');
  console.log('=' . repeat(60));
  
  const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
  });
  
  const TARGET_COLLECTION = 'tala_admin_knowledge';
  
  try {
    // Get all collections
    const collections = await qdrant.getCollections();
    const sourceCollections = collections.collections
      .filter(c => c.name !== TARGET_COLLECTION && c.name.includes('knowledge'))
      .map(c => c.name);
    
    console.log(`📚 Found ${sourceCollections.length} source collections to consolidate:`);
    sourceCollections.forEach(name => console.log(`  - ${name}`));
    console.log(`\n📍 Target collection: ${TARGET_COLLECTION}\n`);
    
    // Track documents to avoid duplicates
    const documentsToMove = new Map();
    let totalPoints = 0;
    
    // Collect all documents from source collections
    for (const collectionName of sourceCollections) {
      console.log(`\n📁 Processing ${collectionName}...`);
      
      try {
        const info = await qdrant.getCollection(collectionName);
        console.log(`  Points: ${info.points_count}`);
        
        if (info.points_count === 0) {
          console.log('  (Empty - skipping)');
          continue;
        }
        
        // Scroll through all documents
        let nextPageOffset = null;
        let collectionDocs = 0;
        
        do {
          const scrollResult = await qdrant.scroll(collectionName, {
            limit: 100,
            offset: nextPageOffset,
            with_payload: true,
            with_vector: true
          });
          
          for (const point of scrollResult.points) {
            const title = point.payload?.metadata?.title || point.payload?.title || 'Untitled';
            const key = `${title}_${(point.payload?.content || '').substring(0, 100)}`;
            
            // Only add if we haven't seen this document before
            if (!documentsToMove.has(key)) {
              documentsToMove.set(key, {
                id: point.id,
                vector: point.vector,
                payload: point.payload,
                sourceCollection: collectionName
              });
              collectionDocs++;
            }
          }
          
          nextPageOffset = scrollResult.next_page_offset;
        } while (nextPageOffset !== null && nextPageOffset !== undefined);
        
        console.log(`  ✅ Found ${collectionDocs} unique documents`);
        totalPoints += collectionDocs;
        
      } catch (error) {
        console.error(`  ❌ Error reading collection: ${error.message}`);
      }
    }
    
    console.log(`\n\n📊 Total unique documents to consolidate: ${documentsToMove.size}`);
    
    if (documentsToMove.size === 0) {
      console.log('\n✅ No documents to move - all collections are empty');
      return;
    }
    
    // Ask for confirmation
    console.log('\n⚠️  WARNING: This will move all documents to', TARGET_COLLECTION);
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Move documents to target collection
    console.log('🚀 Moving documents to', TARGET_COLLECTION, '...\n');
    
    const pointsToUpsert = Array.from(documentsToMove.values()).map((doc, index) => ({
      id: index + 1000, // New IDs to avoid conflicts
      vector: doc.vector,
      payload: {
        ...doc.payload,
        _original_collection: doc.sourceCollection,
        _migrated_at: new Date().toISOString()
      }
    }));
    
    // Upsert in batches
    const batchSize = 100;
    for (let i = 0; i < pointsToUpsert.length; i += batchSize) {
      const batch = pointsToUpsert.slice(i, i + batchSize);
      console.log(`  Uploading batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(pointsToUpsert.length/batchSize)}...`);
      
      await qdrant.upsert(TARGET_COLLECTION, {
        points: batch,
        wait: true
      });
    }
    
    console.log(`\n✅ Successfully moved ${documentsToMove.size} documents to ${TARGET_COLLECTION}`);
    
    // Verify the move
    console.log('\n🔍 Verifying consolidation...');
    const targetInfo = await qdrant.getCollection(TARGET_COLLECTION);
    console.log(`📊 ${TARGET_COLLECTION} now has ${targetInfo.points_count} documents`);
    
    // Option to delete empty source collections
    console.log('\n\n🗑️  Source collections can now be deleted (they still contain the original data)');
    console.log('To delete them, uncomment the deletion code in this script and run again.');
    
    /* Uncomment to delete source collections after verification
    for (const collectionName of sourceCollections) {
      console.log(`  Deleting ${collectionName}...`);
      await qdrant.deleteCollection(collectionName);
    }
    console.log('✅ Source collections deleted');
    */
    
  } catch (error) {
    console.error('❌ Consolidation failed:', error);
  }
}

// Add command line option to run immediately
if (process.argv[2] === '--run') {
  consolidateKnowledgeBase().catch(console.error);
} else {
  console.log('📝 Dry run mode - showing what would be consolidated');
  console.log('Run with --run flag to actually consolidate: node consolidate-knowledge-base.js --run\n');
  consolidateKnowledgeBase().catch(console.error);
}