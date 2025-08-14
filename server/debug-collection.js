import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { QdrantClient } from '@qdrant/qdrant-js';


const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

async function debugCollection() {
  try {
    console.log('🔍 Checking collection status...');
    
    // Get collection info
    const collection = await qdrant.getCollection('tala_admin_knowledge');
    console.log('📊 Collection info:', {
      name: collection.collection_name,
      pointsCount: collection.points_count,
      vectorsCount: collection.vectors_count,
      indexedVectorsCount: collection.indexed_vectors_count,
      status: collection.status
    });
    
    // Scroll through points to see what's stored
    console.log('\n📋 Checking stored points...');
    const scroll = await qdrant.scroll('tala_admin_knowledge', {
      limit: 10,
      with_payload: true,
      with_vector: false
    });
    
    console.log(`Found ${scroll.points.length} points:`);
    scroll.points.forEach((point, index) => {
      console.log(`\n${index + 1}. Point ID: ${point.id}`);
      console.log(`   Content preview: "${point.payload?.content?.substring(0, 100)}..."`);
      console.log(`   Document ID: ${point.payload?.documentId}`);
      console.log(`   Title: ${point.payload?.metadata?.title}`);
    });
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugCollection();