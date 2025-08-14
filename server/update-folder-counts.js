#!/usr/bin/env node

/**
 * Update folder and primary folder counts based on actual documents in Qdrant
 */

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

async function updateAllFolderCounts() {
  try {
    // Load data
    const primaryFoldersPath = path.join(__dirname, 'primaryFolders.json');
    const foldersPath = path.join(__dirname, 'folders.json');
    
    const primaryFolders = JSON.parse(fs.readFileSync(primaryFoldersPath, 'utf8'));
    const folders = JSON.parse(fs.readFileSync(foldersPath, 'utf8'));
    
    console.log('📁 Updating document counts for folders based on actual documents...\n');
    
    // Get all collections
    const collections = await qdrant.getCollections();
    const relevantCollections = collections.collections.filter(c => 
      c.name === 'tala_admin_knowledge' || c.name.includes('_knowledge')
    );
    
    // Initialize counts for regular folders
    const folderCounts = {};
    folders.forEach(folder => {
      folderCounts[folder.id] = {
        name: folder.name,
        count: 0,
        primaryFolderId: folder.primaryFolderId
      };
    });
    
    // Count unique documents across all collections
    const globalSeenDocuments = new Map(); // Map of docTitle -> folderId
    
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
          
          // Process each point
          scrollResult.points.forEach(point => {
            const docId = point.payload.documentId;
            const docTitle = (point.payload.metadata?.title || point.payload.document?.originalName || '');
            const docTitleLower = docTitle.toLowerCase();
            const folderId = point.payload.metadata?.folderId;
            
            // Check if we've seen this document title before
            if (!globalSeenDocuments.has(docTitle)) {
              // First time seeing this document
              let assignedFolderId = null;
              
              // Check if document has explicit folder ID
              if (folderId && folderCounts[folderId]) {
                assignedFolderId = folderId;
                folderCounts[folderId].count++;
                console.log(`  ✓ ${docTitle} → ${folderCounts[folderId].name} (by ID)`);
              } else {
                // Check if document title matches any folder name
                for (const folder of folders) {
                  if (docTitleLower.includes(folder.name.toLowerCase())) {
                    assignedFolderId = folder.id;
                    folderCounts[folder.id].count++;
                    console.log(`  ✓ ${docTitle} → ${folder.name} (by name match)`);
                    break;
                  }
                }
              }
              
              // Mark this document as seen
              if (assignedFolderId) {
                globalSeenDocuments.set(docTitle, assignedFolderId);
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
    
    // Update folder counts
    console.log('\n📊 Subfolder counts:');
    folders.forEach(folder => {
      const oldCount = folder.documentCount;
      const newCount = folderCounts[folder.id].count;
      folder.documentCount = newCount;
      
      if (oldCount !== newCount) {
        console.log(`  ${folder.name}: ${oldCount} → ${newCount} documents`);
      } else {
        console.log(`  ${folder.name}: ${newCount} documents (unchanged)`);
      }
    });
    
    // Update primary folder counts
    console.log('\n📊 Primary folder counts:');
    primaryFolders.forEach(pf => {
      const subFolders = folders.filter(f => f.primaryFolderId === pf.id);
      pf.subFolderCount = subFolders.length;
      pf.folderCount = subFolders.length;
      pf.documentCount = subFolders.reduce((sum, f) => sum + (f.documentCount || 0), 0);
      console.log(`  ${pf.name}: ${pf.subFolderCount} folders, ${pf.documentCount} documents`);
    });
    
    // Save updated data
    fs.writeFileSync(foldersPath, JSON.stringify(folders, null, 2));
    fs.writeFileSync(primaryFoldersPath, JSON.stringify(primaryFolders, null, 2));
    
    console.log('\n✅ All folder counts updated successfully!');
    
  } catch (error) {
    console.error('❌ Error updating folder counts:', error);
  }
}

// Run the update
updateAllFolderCounts();