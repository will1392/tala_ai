/**
 * Verify S3 Configuration and Test Upload
 * Run this to ensure S3 is properly configured
 */

import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('🔍 S3 Configuration Verification\n');
console.log('=====================================\n');

// 1. Check environment variables
console.log('📋 Environment Configuration:');
console.log(`  STORAGE_TYPE: ${process.env.STORAGE_TYPE || '❌ NOT SET'}`);
console.log(`  AWS_S3_BUCKET: ${process.env.AWS_S3_BUCKET || '❌ NOT SET'}`);
console.log(`  AWS_REGION: ${process.env.AWS_REGION || '❌ NOT SET'}`);
console.log(`  AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? '✅ SET' : '❌ NOT SET'}`);
console.log(`  AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? '✅ SET' : '❌ NOT SET'}`);
console.log('');

// Check if configuration is valid
if (process.env.STORAGE_TYPE !== 's3') {
  console.error('❌ CRITICAL: STORAGE_TYPE must be set to "s3"');
  console.error('   Update your .env file with: STORAGE_TYPE=s3');
  process.exit(1);
}

if (!process.env.AWS_S3_BUCKET || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.error('❌ CRITICAL: Missing required AWS configuration');
  console.error('   Ensure all AWS_* variables are set in .env');
  process.exit(1);
}

// 2. Test S3 connection
console.log('🔗 Testing S3 Connection...\n');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const bucketName = process.env.AWS_S3_BUCKET;

async function verifyS3() {
  try {
    // Test 1: Check if bucket exists and is accessible
    console.log(`📦 Checking bucket '${bucketName}'...`);
    await s3.headBucket({ Bucket: bucketName }).promise();
    console.log('  ✅ Bucket exists and is accessible\n');
    
    // Test 2: List objects in the documents folder
    console.log('📁 Listing documents in bucket...');
    const listResult = await s3.listObjectsV2({
      Bucket: bucketName,
      Prefix: 'documents/',
      MaxKeys: 5
    }).promise();
    
    if (listResult.Contents && listResult.Contents.length > 0) {
      console.log(`  ✅ Found ${listResult.Contents.length} document(s):`);
      listResult.Contents.forEach(obj => {
        console.log(`     - ${obj.Key} (${(obj.Size / 1024).toFixed(1)} KB)`);
      });
    } else {
      console.log('  ℹ️ No documents found in bucket (this is normal for new setup)');
    }
    console.log('');
    
    // Test 3: Upload a test file
    console.log('📤 Testing file upload...');
    const testKey = `documents/test-${uuidv4()}.txt`;
    const testContent = `Test file uploaded at ${new Date().toISOString()}`;
    
    await s3.putObject({
      Bucket: bucketName,
      Key: testKey,
      Body: Buffer.from(testContent),
      ContentType: 'text/plain',
      ServerSideEncryption: 'AES256'
    }).promise();
    
    console.log(`  ✅ Successfully uploaded test file: ${testKey}\n`);
    
    // Test 4: Generate signed URL
    console.log('🔗 Testing signed URL generation...');
    const signedUrl = await s3.getSignedUrlPromise('getObject', {
      Bucket: bucketName,
      Key: testKey,
      Expires: 3600 // 1 hour
    });
    
    console.log('  ✅ Successfully generated signed URL');
    console.log(`     URL (first 100 chars): ${signedUrl.substring(0, 100)}...\n`);
    
    // Test 5: Delete test file
    console.log('🗑️ Cleaning up test file...');
    await s3.deleteObject({
      Bucket: bucketName,
      Key: testKey
    }).promise();
    
    console.log('  ✅ Test file deleted\n');
    
    // Summary
    console.log('=====================================\n');
    console.log('✅ S3 CONFIGURATION VERIFIED!\n');
    console.log('All tests passed. Your S3 setup is working correctly.');
    console.log('\nYou can now:');
    console.log('  1. Upload documents through the web interface');
    console.log('  2. Documents will be stored in S3');
    console.log('  3. PDFs will be viewable through signed URLs');
    
  } catch (error) {
    console.error('\n❌ S3 VERIFICATION FAILED!\n');
    console.error('Error:', error.message);
    console.error('');
    
    // Provide specific troubleshooting based on error
    if (error.code === 'NoSuchBucket') {
      console.error('📍 Issue: Bucket does not exist');
      console.error(`   Solution: Create bucket '${bucketName}' in AWS S3 console`);
    } else if (error.code === 'InvalidAccessKeyId') {
      console.error('📍 Issue: Invalid AWS Access Key ID');
      console.error('   Solution: Check AWS_ACCESS_KEY_ID in .env file');
    } else if (error.code === 'SignatureDoesNotMatch') {
      console.error('📍 Issue: Invalid AWS Secret Access Key');
      console.error('   Solution: Check AWS_SECRET_ACCESS_KEY in .env file');
    } else if (error.code === 'AccessDenied') {
      console.error('📍 Issue: Insufficient permissions');
      console.error('   Solution: Ensure IAM user has these permissions:');
      console.error('     - s3:ListBucket');
      console.error('     - s3:GetObject');
      console.error('     - s3:PutObject');
      console.error('     - s3:DeleteObject');
    } else if (error.code === 'NetworkingError') {
      console.error('📍 Issue: Network connection problem');
      console.error('   Solution: Check internet connection and AWS region');
    }
    
    console.error('\n💡 Next Steps:');
    console.error('  1. Fix the issue identified above');
    console.error('  2. Run this script again to verify');
    console.error('  3. Ensure .env file has correct AWS credentials');
    
    process.exit(1);
  }
}

verifyS3();