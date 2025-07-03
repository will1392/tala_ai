import dotenv from 'dotenv';
import CloudStorageService from './services/cloudStorage.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testCloudStorage() {
  console.log('🧪 Testing Cloud Storage Configuration\n');
  
  // Check environment variables
  console.log('📋 Environment Check:');
  console.log(`   STORAGE_TYPE: ${process.env.STORAGE_TYPE || 'local (default)'}`);
  
  if (process.env.STORAGE_TYPE === 's3') {
    console.log(`   AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Not set'}`);
    console.log(`   AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Not set'}`);
    console.log(`   AWS_REGION: ${process.env.AWS_REGION || '❌ Not set'}`);
    console.log(`   AWS_S3_BUCKET: ${process.env.AWS_S3_BUCKET || '❌ Not set'}`);
  } else if (process.env.STORAGE_TYPE === 'cloudinary') {
    console.log(`   CLOUDINARY_CLOUD_NAME: ${process.env.CLOUDINARY_CLOUD_NAME || '❌ Not set'}`);
    console.log(`   CLOUDINARY_API_KEY: ${process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Not set'}`);
    console.log(`   CLOUDINARY_API_SECRET: ${process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Not set'}`);
  }
  
  console.log('\n📡 Testing Connection:');
  
  try {
    const cloudStorage = new CloudStorageService();
    
    // Test connection
    await cloudStorage.testConnection();
    console.log('✅ Cloud storage connection successful!\n');
    
    // Test upload
    console.log('📤 Testing Upload:');
    const testContent = Buffer.from('This is a test PDF content');
    const testFilename = `test-${Date.now()}.pdf`;
    
    const uploadResult = await cloudStorage.uploadFile(
      testContent,
      testFilename,
      'application/pdf'
    );
    
    console.log('✅ Upload successful!');
    console.log(`   URL: ${uploadResult.url}`);
    console.log(`   Key: ${uploadResult.key}`);
    
    // Test URL accessibility
    console.log('\n🔗 Testing URL Accessibility:');
    if (uploadResult.url.startsWith('http')) {
      try {
        const response = await fetch(uploadResult.url, { method: 'HEAD' });
        console.log(`   Status: ${response.status} ${response.statusText}`);
        console.log(`   Content-Type: ${response.headers.get('content-type')}`);
        console.log('✅ URL is accessible!');
      } catch (error) {
        console.log('❌ URL is not accessible:', error.message);
        console.log('   This might be due to CORS or bucket permissions');
      }
    }
    
    // Test deletion
    console.log('\n🗑️  Testing Deletion:');
    await cloudStorage.deleteFile(uploadResult.key);
    console.log('✅ File deleted successfully!');
    
    console.log('\n🎉 All tests passed! Cloud storage is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nDebug info:', error);
    
    if (error.message.includes('credentials')) {
      console.log('\n💡 Make sure your AWS credentials are correct in the .env file');
    } else if (error.message.includes('bucket')) {
      console.log('\n💡 Make sure your S3 bucket name is correct and exists');
    }
  }
}

// Create a test PDF file for manual testing
async function createTestPDF() {
  const testDir = path.join(__dirname, 'test-files');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  // Create a simple PDF-like file (not a real PDF, but good enough for testing)
  const testFile = path.join(testDir, 'test-document.pdf');
  const content = `%PDF-1.4
Test PDF Document
This is a test PDF for cloud storage testing.
%%EOF`;
  
  fs.writeFileSync(testFile, content);
  console.log(`\n📄 Created test file: ${testFile}`);
  console.log('   You can upload this file through the UI to test the full flow');
}

// Run tests
console.log('='.repeat(50));
testCloudStorage();
createTestPDF();
console.log('='.repeat(50));