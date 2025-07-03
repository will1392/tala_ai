import dotenv from 'dotenv';
import { QdrantClient } from '@qdrant/qdrant-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import CloudStorageService from './services/cloudStorage.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadsDir = path.join(__dirname, 'uploads');

// Initialize services
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const cloudStorage = new CloudStorageService();

async function migrateToCloudStorage() {
  console.log('🚀 Starting migration to cloud storage...');
  console.log(`📁 Storage type: ${process.env.STORAGE_TYPE || 'local'}`);
  
  if (!process.env.STORAGE_TYPE || process.env.STORAGE_TYPE === 'local') {
    console.error('❌ STORAGE_TYPE must be set to s3 or cloudinary for migration');
    process.exit(1);
  }

  try {
    // Test cloud storage connection
    await cloudStorage.testConnection();
    console.log('✅ Cloud storage connection verified');

    // Get all collections
    const collections = await qdrant.getCollections();
    const knowledgeCollections = collections.collections.filter(c => 
      c.name.includes('knowledge')
    );

    console.log(`📊 Found ${knowledgeCollections.length} knowledge collections`);

    let totalDocuments = 0;
    let migratedDocuments = 0;
    let failedDocuments = 0;

    // Process each collection
    for (const collection of knowledgeCollections) {
      console.log(`\n📂 Processing collection: ${collection.name}`);

      // Get all unique documents in this collection
      const documents = new Map();
      let nextPageOffset = null;

      do {
        const scrollResult = await qdrant.scroll(collection.name, {
          limit: 100,
          offset: nextPageOffset,
          with_payload: true,
          with_vector: false,
        });

        for (const point of scrollResult.points) {
          const docId = point.payload?.documentId;
          const fileUrl = point.payload?.document?.fileUrl;
          const storageProvider = point.payload?.document?.storageProvider || 'local';

          if (docId && fileUrl && storageProvider === 'local' && fileUrl.startsWith('/api/files/')) {
            documents.set(docId, {
              documentId: docId,
              fileUrl: fileUrl,
              originalName: point.payload?.document?.originalName,
              points: [...(documents.get(docId)?.points || []), point.id],
            });
          }
        }

        nextPageOffset = scrollResult.next_page_offset;
      } while (nextPageOffset !== null);

      console.log(`📄 Found ${documents.size} documents to migrate`);
      totalDocuments += documents.size;

      // Migrate each document
      for (const [docId, docInfo] of documents) {
        try {
          const filename = docInfo.fileUrl.replace('/api/files/', '');
          const filepath = path.join(uploadsDir, filename);

          if (!fs.existsSync(filepath)) {
            console.warn(`⚠️  File not found: ${filename}`);
            failedDocuments++;
            continue;
          }

          // Read file
          const fileBuffer = fs.readFileSync(filepath);
          
          // Upload to cloud storage
          const uploadResult = await cloudStorage.uploadFile(
            fileBuffer,
            filename,
            'application/pdf'
          );

          console.log(`✅ Uploaded ${filename} to ${process.env.STORAGE_TYPE}`);

          // Update all points for this document
          for (const pointId of docInfo.points) {
            const point = await qdrant.retrieve(collection.name, {
              ids: [pointId],
              with_payload: true,
              with_vector: true,
            });

            if (point.length > 0) {
              const updatedPayload = {
                ...point[0].payload,
                document: {
                  ...point[0].payload.document,
                  fileUrl: uploadResult.url,
                  storageProvider: process.env.STORAGE_TYPE,
                  storageKey: filename,
                },
              };

              await qdrant.setPayload(collection.name, {
                points: [pointId],
                payload: updatedPayload,
              });
            }
          }

          migratedDocuments++;
          console.log(`📝 Updated ${docInfo.points.length} chunks for document ${docId}`);

          // Optionally delete local file after successful migration
          // fs.unlinkSync(filepath);
          // console.log(`🗑️  Deleted local file: ${filename}`);

        } catch (error) {
          console.error(`❌ Failed to migrate document ${docId}:`, error.message);
          failedDocuments++;
        }
      }
    }

    console.log('\n✅ Migration completed!');
    console.log(`📊 Total documents: ${totalDocuments}`);
    console.log(`✅ Successfully migrated: ${migratedDocuments}`);
    console.log(`❌ Failed: ${failedDocuments}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateToCloudStorage();