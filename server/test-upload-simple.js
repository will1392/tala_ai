import { createRequire } from 'module';
import fs from 'fs';
import fetch from 'node-fetch';
import FormData from 'form-data';

const require = createRequire(import.meta.url);

console.log('🧪 Testing PDF Upload to Server\n');

async function testUpload() {
  try {
    // Create a simple text file for testing
    const testContent = 'This is a test document for upload testing.';
    const testBuffer = Buffer.from(testContent, 'utf-8');
    
    console.log('📤 Testing upload with text content...');
    
    const formData = new FormData();
    formData.append('document', testBuffer, {
      filename: 'test-document.txt',
      contentType: 'text/plain'
    });
    formData.append('userId', 'admin-1');
    formData.append('isAdmin', 'true');
    formData.append('primaryFolderId', 'cae768d2-92b0-4e1e-a05e-0cb23425b352'); // miscellaneous folder

    const response = await fetch('http://localhost:3001/api/documents/upload', {
      method: 'POST',
      body: formData
    });

    console.log(`Response status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Upload successful!');
      console.log('Response:', JSON.stringify(result, null, 2));
    } else {
      const errorText = await response.text();
      console.error('❌ Upload failed');
      console.error('Status:', response.status);
      console.error('Error:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testUpload();