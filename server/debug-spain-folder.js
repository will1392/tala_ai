import { QdrantClient } from '@qdrant/qdrant-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

async function debugSpainFolder() {
  try {
    // Load folders
    const foldersPath = path.join(__dirname, 'folders.json');
    const folders = JSON.parse(fs.readFileSync(foldersPath, 'utf-8'));
    
    const spainFolder = folders.find(f => f.name === 'Spain');
    console.log('📁 Spain folder:', spainFolder);
    
    // Get all collections
    const collections = await qdrant.getCollections();
    const relevantCollections = collections.collections.filter(c => 
      c.name === 'tala_admin_knowledge' || c.name.includes('_knowledge')
    );
    
    console.log('\n🔍 Searching for Spain documents...\n');
    
    const spainDocs = [];
    const seenDocs = new Set();
    
    for (const collection of relevantCollections) {
      console.log(`📄 Checking collection: ${collection.name}`);
      
      try {
        let offset = null;
        let hasMore = true;
        
        while (hasMore) {
          const scrollResult = await qdrant.scroll(collection.name, {
            limit: 100,
            offset: offset,
            with_payload: true,
            with_vector: false
          });
          
          scrollResult.points.forEach(point => {
            const docTitle = (point.payload.metadata?.title || point.payload.document?.originalName || '');
            const docTitleLower = docTitle.toLowerCase();
            const pointFolderId = point.payload.metadata?.folderId;
            
            // Check if this is a Spain document
            if (docTitleLower.includes('spain')) {
              const docInfo = {
                title: docTitle,
                folderId: pointFolderId,
                collection: collection.name,
                documentId: point.payload.documentId,
                matchesSpainFolderId: pointFolderId === spainFolder.id,
                matchesByTitle: docTitleLower.includes(spainFolder.name.toLowerCase())
              };
              
              // Check if we should count this document
              if (!seenDocs.has(docTitle)) {
                seenDocs.add(docTitle);
                spainDocs.push(docInfo);
                console.log(`  ✓ Found: ${docTitle}`);
                console.log(`    - Folder ID: ${pointFolderId || 'none'}`);
                console.log(`    - Matches Spain folder ID (${spainFolder.id}): ${docInfo.matchesSpainFolderId}`);
                console.log(`    - Matches by title: ${docInfo.matchesByTitle}`);
              }
            }
          });
          
          offset = scrollResult.next_page_offset;
          hasMore = offset !== null && offset !== undefined;
        }
      } catch (error) {
        console.error(`  ❌ Error processing collection ${collection.name}:`, error.message);
      }
    }
    
    console.log(`\n📊 Summary: Found ${spainDocs.length} unique Spain documents`);
    console.log('\nWhy might Spain show 0 documents?');
    
    spainDocs.forEach((doc, i) => {
      console.log(`\n${i + 1}. ${doc.title}:`);
      if (!doc.matchesSpainFolderId && !doc.matchesByTitle) {
        console.log('   ❌ This document would NOT be counted because:');
        console.log(`      - Folder ID (${doc.folderId}) doesn't match Spain folder ID (${spainFolder.id})`);
        console.log(`      - Title doesn't contain folder name`);
      } else {
        console.log('   ✅ This document SHOULD be counted');
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugSpainFolder();