import { QdrantClient } from '@qdrant/qdrant-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

async function findFranceDocs() {
  console.log('🔍 Finding all France documents\n');
  
  try {
    const collections = await qdrant.getCollections();
    const relevantCollections = collections.collections.filter(c => 
      c.name === 'tala_admin_knowledge' || c.name.includes('_knowledge')
    );
    
    console.log('Searching in collections:', relevantCollections.map(c => c.name).join(', '));
    console.log('\n');
    
    for (const collection of relevantCollections) {
      try {
        let offset = null;
        let hasMore = true;
        let found = false;
        
        while (hasMore) {
          const scrollResult = await qdrant.scroll(collection.name, {
            limit: 100,
            offset: offset,
            with_payload: true,
            with_vector: false
          });
          
          scrollResult.points.forEach(point => {
            const title = (point.payload.metadata?.title || point.payload.document?.originalName || '').toLowerCase();
            if (title.includes('france')) {
              if (!found) {
                console.log(`\n📁 Collection: ${collection.name}`);
                found = true;
              }
              
              console.log('\n✅ Found France document:');
              console.log('- Title:', point.payload.metadata?.title || point.payload.document?.originalName);
              console.log('- Document ID:', point.payload.documentId);
              console.log('- File URL:', point.payload.document?.fileUrl || 'Not set');
              console.log('- Storage Provider:', point.payload.document?.storageProvider || 'Not set');
              console.log('- Storage Key:', point.payload.document?.storageKey || 'Not set');
              console.log('- File Type:', point.payload.document?.fileType || 'Not set');
            }
          });
          
          offset = scrollResult.next_page_offset;
          hasMore = offset !== null && offset !== undefined;
        }
      } catch (error) {
        console.log(`Error checking collection ${collection.name}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

findFranceDocs();