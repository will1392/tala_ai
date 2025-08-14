/**
 * Check all documents in the knowledge base across all collections
 * Lists every document with details to help identify missing ones
 */

import { QdrantClient } from '@qdrant/qdrant-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkAllDocuments() {
  console.log('📚 Complete Knowledge Base Document Inventory\n');
  console.log('=' . repeat(60));
  
  const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
  });
  
  try {
    // Get all collections
    const collections = await qdrant.getCollections();
    console.log(`\n🗂️ Found ${collections.collections.length} collections\n`);
    
    let totalDocuments = 0;
    const allDocuments = [];
    
    // Check each collection
    for (const collection of collections.collections) {
      console.log(`\n📁 Collection: ${collection.name}`);
      console.log('-' . repeat(60));
      
      try {
        // Get collection info
        const info = await qdrant.getCollection(collection.name);
        console.log(`📊 Total points: ${info.points_count}`);
        
        if (info.points_count === 0) {
          console.log('   (Empty collection)');
          continue;
        }
        
        // Scroll through ALL documents in the collection
        let nextPageOffset = null;
        let pageCount = 0;
        const collectionDocs = [];
        
        do {
          const scrollResult = await qdrant.scroll(collection.name, {
            limit: 100,
            offset: nextPageOffset,
            with_payload: true,
            with_vector: false
          });
          
          pageCount++;
          
          for (const point of scrollResult.points) {
            const doc = {
              id: point.id,
              collection: collection.name,
              title: point.payload?.metadata?.title || point.payload?.title || 'Untitled',
              filename: point.payload?.metadata?.filename || point.payload?.filename || '',
              type: point.payload?.metadata?.type || point.payload?.type || 'unknown',
              uploadDate: point.payload?.metadata?.uploadDate || point.payload?.uploadDate || '',
              contentPreview: (point.payload?.content || point.payload?.text || '').substring(0, 200),
              contentLength: (point.payload?.content || point.payload?.text || '').length,
              metadata: point.payload?.metadata || {}
            };
            
            collectionDocs.push(doc);
            allDocuments.push(doc);
          }
          
          nextPageOffset = scrollResult.next_page_offset;
        } while (nextPageOffset !== null && nextPageOffset !== undefined);
        
        // Display documents in this collection
        console.log(`\n📄 Documents (${collectionDocs.length} total):\n`);
        
        collectionDocs.forEach((doc, i) => {
          console.log(`${i + 1}. ${doc.title}`);
          console.log(`   📎 File: ${doc.filename || 'N/A'}`);
          console.log(`   📋 Type: ${doc.type}`);
          console.log(`   📅 Uploaded: ${doc.uploadDate || 'Unknown'}`);
          console.log(`   📏 Content length: ${doc.contentLength} chars`);
          console.log(`   📝 Preview: ${doc.contentPreview.replace(/\n/g, ' ').substring(0, 100)}...`);
          console.log('');
        });
        
        totalDocuments += collectionDocs.length;
        
      } catch (error) {
        console.error(`❌ Error reading collection ${collection.name}:`, error.message);
      }
    }
    
    // Summary of all unique documents
    console.log('\n\n📊 DOCUMENT SUMMARY');
    console.log('=' . repeat(60));
    console.log(`Total documents across all collections: ${totalDocuments}`);
    
    // Group by filename to identify duplicates
    const documentsByName = {};
    allDocuments.forEach(doc => {
      const key = doc.filename || doc.title;
      if (!documentsByName[key]) {
        documentsByName[key] = [];
      }
      documentsByName[key].push(doc);
    });
    
    console.log('\n📑 Unique Documents:');
    Object.entries(documentsByName).forEach(([name, docs]) => {
      console.log(`\n• ${name}`);
      if (docs.length > 1) {
        console.log(`  ⚠️ Found in ${docs.length} collections:`);
        docs.forEach(doc => {
          console.log(`    - ${doc.collection}`);
        });
      } else {
        console.log(`  📍 Collection: ${docs[0].collection}`);
      }
    });
    
    // Look for common travel documents
    console.log('\n\n🔍 Checking for Common Travel Documents:');
    const expectedDocs = [
      'Greece', 'Spain', 'Italy', 'France', 'Portugal', 'Iceland', 
      'Turkey', 'Egypt', 'Morocco', 'Thailand', 'Japan', 'Mexico', 
      'Peru', 'India', 'Croatia', 'Norway', 'visa', 'passport',
      'flight', 'hotel', 'itinerary', 'guide'
    ];
    
    expectedDocs.forEach(keyword => {
      const found = allDocuments.filter(doc => 
        doc.title.toLowerCase().includes(keyword.toLowerCase()) ||
        doc.contentPreview.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (found.length > 0) {
        console.log(`✅ ${keyword}: Found ${found.length} document(s)`);
        found.forEach(doc => {
          console.log(`   - ${doc.title} (in ${doc.collection})`);
        });
      } else {
        console.log(`❌ ${keyword}: No documents found`);
      }
    });
    
    console.log('\n\n💡 What documents do you remember uploading that are missing?');
    console.log('   Please let me know and I can help search for them or re-upload them.');
    
  } catch (error) {
    console.error('❌ Error checking documents:', error);
  }
}

checkAllDocuments().catch(console.error);