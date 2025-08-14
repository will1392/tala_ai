import { QdrantClient } from '@qdrant/qdrant-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

async function findDocumentDetails() {
  console.log('🔍 Finding document details for France guide\n');
  
  const documentId = 'e22db3d6-f3ed-4650-8f67-6128dbee3c80';
  
  try {
    // Check all collections for this document
    const collections = await qdrant.getCollections();
    
    for (const collection of collections.collections) {
      if (collection.name.includes('knowledge')) {
        console.log(`\nChecking collection: ${collection.name}`);
        
        try {
          const scrollResult = await qdrant.scroll(collection.name, {
            filter: {
              must: [{
                key: 'documentId',
                match: { value: documentId }
              }]
            },
            limit: 10,
            with_payload: true,
            with_vector: false
          });
          
          if (scrollResult.points.length > 0) {
            console.log(`\n✅ Found document in ${collection.name}!`);
            
            const point = scrollResult.points[0];
            console.log('\nDocument payload:');
            console.log(JSON.stringify(point.payload, null, 2));
            
            // Look for original file info
            console.log('\n📄 File details:');
            console.log('- Original name:', point.payload.document?.originalName || point.payload.metadata?.title);
            console.log('- File URL:', point.payload.document?.fileUrl);
            console.log('- Storage provider:', point.payload.document?.storageProvider);
            console.log('- Storage key:', point.payload.document?.storageKey);
            console.log('- Uploaded at:', point.payload.document?.uploadedAt);
            
            // Check if there's a local file reference
            if (point.payload.document?.fileUrl && !point.payload.document?.fileUrl.startsWith('http')) {
              console.log('\n💡 This appears to be a local file reference!');
              console.log('Local path hint:', point.payload.document?.fileUrl);
            }
          }
        } catch (error) {
          console.log(`  Error checking collection: ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

findDocumentDetails();