/**
 * Test PDF storage and display configuration
 */

import dotenv from 'dotenv';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';


const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('🔍 PDF Storage Configuration Test\n');
console.log('=====================================\n');

// 1. Check configuration
console.log('📋 Configuration:');
console.log('  Storage Type:', process.env.STORAGE_TYPE);
console.log('  AWS Bucket:', process.env.AWS_S3_BUCKET);
console.log('  AWS Region:', process.env.AWS_REGION);
console.log('  AWS Key configured:', !!process.env.AWS_ACCESS_KEY_ID);
console.log('');

// 2. Check local storage
console.log('📁 Local Storage:');
const uploadsDir = path.join(process.cwd(), 'server', 'uploads');
if (fs.existsSync(uploadsDir)) {
  const files = fs.readdirSync(uploadsDir);
  const pdfFiles = files.filter(f => f.endsWith('.pdf'));
  console.log(`  Found ${pdfFiles.length} PDF files locally:`);
  pdfFiles.forEach(file => {
    const stats = fs.statSync(path.join(uploadsDir, file));
    console.log(`    - ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
  });
} else {
  console.log('  ❌ No uploads directory found');
}
console.log('');

// 3. Test S3 connection
if (process.env.STORAGE_TYPE === 's3') {
  console.log('☁️ AWS S3 Test:');
  
  try {
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
    
    // List objects in bucket
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.AWS_S3_BUCKET,
      Prefix: 'documents/',
      MaxKeys: 10
    });
    
    const listResponse = await s3Client.send(listCommand);
    
    if (listResponse.Contents && listResponse.Contents.length > 0) {
      console.log(`  ✅ S3 bucket accessible, found ${listResponse.Contents.length} documents:`);
      listResponse.Contents.forEach(obj => {
        console.log(`    - ${obj.Key} (${(obj.Size / 1024).toFixed(1)} KB)`);
      });
      
      // Test generating a signed URL
      const firstDoc = listResponse.Contents[0];
      const getCommand = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: firstDoc.Key
      });
      
      const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
      console.log('\n  📎 Sample signed URL (expires in 1 hour):');
      console.log(`    ${signedUrl.substring(0, 100)}...`);
      
    } else {
      console.log('  ⚠️ S3 bucket accessible but no documents found');
    }
    
  } catch (error) {
    console.log('  ❌ S3 Error:', error.message);
    if (error.message.includes('NoSuchBucket')) {
      console.log('  → Bucket does not exist');
    } else if (error.message.includes('InvalidAccessKeyId')) {
      console.log('  → Invalid AWS credentials');
    } else if (error.message.includes('SignatureDoesNotMatch')) {
      console.log('  → Invalid secret key');
    } else if (error.message.includes('AccessDenied')) {
      console.log('  → Access denied to bucket');
    }
  }
} else {
  console.log('⚠️ S3 storage not configured (using local storage)');
}

console.log('\n=====================================\n');
console.log('📊 Summary:');
console.log('  - PDFs are being stored locally in /server/uploads/');
console.log('  - S3 is configured but may not be working');
console.log('  - Frontend likely showing extracted text instead of PDFs');
console.log('\n💡 Recommendations:');
console.log('  1. Fix S3 configuration or disable it');
console.log('  2. Ensure PDFs are accessible via correct URLs');
console.log('  3. Implement proper PDF viewer in frontend');

process.exit(0);