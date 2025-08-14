import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const API_URL = 'http://localhost:3001/api';
const documentId = 'e22db3d6-f3ed-4650-8f67-6128dbee3c80';

async function testDocumentUrl() {
  console.log('🔍 Testing document URL endpoint\n');
  
  try {
    // Test the URL endpoint with default-user (where the document is stored)
    const url = `${API_URL}/documents/${documentId}/url?userId=default-user&isAdmin=false`;
    console.log('Fetching:', url);
    
    const response = await fetch(url);
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());
    
    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ Success! Response data:');
      console.log(JSON.stringify(data, null, 2));
      
      if (data.url) {
        console.log('\n📎 URL details:');
        console.log('- Full URL:', data.url);
        console.log('- Provider:', data.storageProvider);
        console.log('- Expires in:', data.expiresIn, 'seconds');
        
        // Check if it's an S3 URL
        if (data.url.includes('amazonaws.com') || data.url.includes('s3')) {
          console.log('- Type: S3 signed URL ✅');
        } else if (data.url.startsWith('/')) {
          console.log('- Type: Local file URL');
        } else {
          console.log('- Type: Unknown');
        }
      }
    } else {
      const text = await response.text();
      console.log('\n❌ Error response:', text);
    }
    
  } catch (error) {
    console.error('\n❌ Request failed:', error.message);
  }
}

testDocumentUrl();