import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import CloudStorageService from './services/cloudStorage.js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const cloudStorage = new CloudStorageService();

async function uploadFileToS3(localFilePath, s3Key) {
  try {
    // Read the file
    const fileBuffer = fs.readFileSync(localFilePath);
    const filename = path.basename(localFilePath);
    
    console.log(`📤 Uploading ${filename} to S3...`);
    console.log(`   Key: ${s3Key}`);
    
    // Upload directly to S3 with specific key
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: 'application/pdf',
      ServerSideEncryption: 'AES256'
    };
    
    const result = await cloudStorage.s3.upload(params).promise();
    
    console.log(`✅ Upload successful!`);
    console.log(`   Location: ${result.Location}`);
    console.log(`   ETag: ${result.ETag}`);
    
    return result;
  } catch (error) {
    console.error('❌ Upload failed:', error);
    throw error;
  }
}

// Instructions for use
console.log(`
📚 Document Upload Fix Script
============================

This script helps upload missing documents to S3.

To fix the France Guide document:
1. Find the original "Kensington France Guide.pdf" file
2. Run: node fix-document-upload.js /path/to/Kensington_France_Guide.pdf

The script will upload it to S3 with the correct key that matches the database.
`);

// Check if file path was provided
const filePath = process.argv[2];
if (filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }
  
  // Upload with the specific key expected by the database
  const s3Key = 'documents/e22db3d6-f3ed-4650-8f67-6128dbee3c80-1751571003280-Kensington_France_Guide.pdf';
  uploadFileToS3(filePath, s3Key).then(() => {
    console.log('\n🎉 Document should now display correctly in the Knowledge Base!');
  }).catch(error => {
    console.error('Failed to upload:', error);
    process.exit(1);
  });
}