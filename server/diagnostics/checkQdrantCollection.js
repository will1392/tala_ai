/**
 * Check Qdrant Collection Status
 * Verifies if the knowledge base collection exists and has documents
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import 'dotenv/config';

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY
});

async function checkQdrantCollection() {
  try {
    console.log('🔍 Checking Qdrant collection: tala_admin_knowledge\n');
    
    // 1. Check if collection exists
    const collections = await qdrant.getCollections();
    console.log('📚 Available collections:', collections.collections.map(c => c.name));
    
    const targetCollection = collections.collections.find(c => c.name === 'tala_admin_knowledge');
    
    if (!targetCollection) {
      console.log('\n❌ Collection "tala_admin_knowledge" does not exist!');
      console.log('   This is why search returns 0 results.');
      console.log('\n💡 You need to upload documents to create the collection.');
      return;
    }
    
    console.log('\n✅ Collection exists!');
    
    // 2. Get collection info
    const info = await qdrant.getCollection('tala_admin_knowledge');
    console.log('\n📊 Collection Info:');
    console.log('   - Points count:', info.points_count);
    console.log('   - Vectors count:', info.vectors_count);
    console.log('   - Indexed:', info.indexed_vectors_count);
    
    if (info.points_count === 0) {
      console.log('\n⚠️  Collection has 0 documents!');
      console.log('   Documents need to be indexed into Qdrant.');
      console.log('\n💡 Check if document upload/indexing is working.');
    } else {
      console.log('\n✅ Collection has documents!');
      
      // 3. Try a test search
      console.log('\n🔍 Testing search with query: "Iceland"');
      
      // Create a simple embedding (you'd normally use OpenAI for this)
      // For test purposes, let's just list some points
      const scrollResult = await qdrant.scroll('tala_admin_knowledge', {
        limit: 5,
        with_payload: true
      });
      
      console.log(`\n📄 Sample documents (${scrollResult.points.length}):`);
      scrollResult.points.forEach((point, idx) => {
        console.log(`\n${idx + 1}. ID: ${point.id}`);
        console.log(`   Title: ${point.payload?.metadata?.title || 'N/A'}`);
        console.log(`   Content preview: ${(point.payload?.content || '').substring(0, 100)}...`);
      });
    }
    
  } catch (error) {
    console.error('\n❌ Error checking Qdrant collection:', error.message);
    console.error('   Stack:', error.stack);
  }
}

checkQdrantCollection();
