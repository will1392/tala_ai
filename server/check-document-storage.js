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

async function checkDocumentStorage() {
  console.log('🔍 Checking document storage info\n');
  
  const documentId = 'e22db3d6-f3ed-4650-8f67-6128dbee3c80';
  
  try {
    // Search in admin collection
    const collections = ['tala_admin_knowledge', 'tala_user_admin-1_knowledge'];
    
    for (const collectionName of collections) {
      console.log(`Checking collection: ${collectionName}`);
      
      try {
        const scrollResult = await qdrant.scroll(collectionName, {
          filter: {
            must: [{
              key: 'documentId',
              match: { value: documentId }
            }]
          },
          limit: 1,
          with_payload: true,
          with_vector: false
        });
        
        if (scrollResult.points.length > 0) {
          const point = scrollResult.points[0];
          console.log('\n✅ Found document!\n');
          console.log('Document metadata:');
          console.log('- Title:', point.payload.metadata?.title || point.payload.document?.originalName);
          console.log('- Document ID:', point.payload.documentId);
          console.log('- File URL:', point.payload.document?.fileUrl);
          console.log('- Storage Provider:', point.payload.document?.storageProvider || 'Not set');
          console.log('- Storage Key:', point.payload.document?.storageKey || 'Not set');
          console.log('- File Type:', point.payload.document?.fileType);
          console.log('- Upload Date:', point.payload.document?.uploadedAt);
          
          if (!point.payload.document?.storageProvider || point.payload.document?.storageProvider === 'local') {
            console.log('\n⚠️  This document is stored locally, not in S3.');
            console.log('It was uploaded before S3 was configured.');
            console.log('\nTo fix: Re-upload the document or migrate existing documents to S3.');
          }
          
          return;
        }
      } catch (error) {
        console.log(`  Error checking collection: ${error.message}`);
      }
    }
    
    console.log('❌ Document not found in any collection');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkDocumentStorage();