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

async function debugFullPayload() {
  try {
    console.log('🔍 Getting full payload structure from Qdrant...');
    
    // Get a single point with full payload
    const scroll = await qdrant.scroll('tala_admin_knowledge', {
      limit: 1,
      with_payload: true,
      with_vector: false
    });
    
    if (scroll.points.length > 0) {
      const point = scroll.points[0];
      console.log('\n📋 Full payload structure:');
      console.log(JSON.stringify(point.payload, null, 2));
      
      // Check if fileUrl is present and what it contains
      if (point.payload.document?.fileUrl) {
        console.log('\n🔗 File URL found:', point.payload.document.fileUrl);
      } else {
        console.log('\n❌ No fileUrl found in document payload');
      }
      
      // Look for any base64 or binary data
      const payloadStr = JSON.stringify(point.payload);
      if (payloadStr.includes('base64') || payloadStr.includes('data:')) {
        console.log('\n📄 Base64 data detected in payload');
      } else {
        console.log('\n❌ No base64 data found in payload');
      }
      
      // Check for external URLs
      if (payloadStr.includes('http') || payloadStr.includes('s3') || payloadStr.includes('cloudinary')) {
        console.log('\n☁️ External URL detected in payload');
      } else {
        console.log('\n❌ No external URLs found in payload');
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugFullPayload();