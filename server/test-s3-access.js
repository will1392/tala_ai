import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('🔍 Testing S3 access permissions\n');
console.log('AWS Configuration:');
console.log('- Access Key:', process.env.AWS_ACCESS_KEY_ID);
console.log('- Region:', process.env.AWS_REGION || 'us-east-1');
console.log('- Bucket:', process.env.AWS_S3_BUCKET);
console.log('');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

async function testS3Access() {
  const testKey = 'documents/e22db3d6-f3ed-4650-8f67-6128dbee3c80-1751571003280-Kensington_France_Guide.pdf';
  
  console.log('1️⃣ Testing ListBucket permission...');
  try {
    const listResult = await s3.listObjectsV2({
      Bucket: process.env.AWS_S3_BUCKET,
      MaxKeys: 5
    }).promise();
    console.log('✅ ListBucket: SUCCESS');
    console.log(`   Found ${listResult.Contents?.length || 0} objects`);
  } catch (error) {
    console.log('❌ ListBucket: FAILED');
    console.log(`   Error: ${error.message}`);
  }
  
  console.log('\n2️⃣ Testing GetObject permission...');
  try {
    const headResult = await s3.headObject({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: testKey
    }).promise();
    console.log('✅ GetObject (headObject): SUCCESS');
    console.log(`   File exists: ${testKey}`);
    console.log(`   Size: ${(headResult.ContentLength / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.log('❌ GetObject (headObject): FAILED');
    console.log(`   Error: ${error.message}`);
  }
  
  console.log('\n3️⃣ Testing GetObject with signed URL...');
  try {
    const url = await s3.getSignedUrlPromise('getObject', {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: testKey,
      Expires: 300 // 5 minutes
    });
    console.log('✅ GetSignedUrl: SUCCESS');
    console.log(`   Generated URL: ${url.substring(0, 100)}...`);
    
    // Try to fetch the signed URL
    console.log('\n4️⃣ Testing signed URL access...');
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url, { method: 'HEAD' });
    
    if (response.ok) {
      console.log('✅ Signed URL Access: SUCCESS');
      console.log(`   Status: ${response.status}`);
      console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    } else {
      console.log('❌ Signed URL Access: FAILED');
      console.log(`   Status: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.log('❌ GetSignedUrl: FAILED');
    console.log(`   Error: ${error.message}`);
  }
  
  console.log('\n5️⃣ Testing PutObject permission...');
  try {
    const testPutKey = 'test-permissions-check.txt';
    await s3.putObject({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: testPutKey,
      Body: 'Testing permissions',
      ContentType: 'text/plain'
    }).promise();
    console.log('✅ PutObject: SUCCESS');
    
    // Clean up
    await s3.deleteObject({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: testPutKey
    }).promise();
    console.log('✅ DeleteObject: SUCCESS (cleanup)');
  } catch (error) {
    console.log('❌ PutObject: FAILED');
    console.log(`   Error: ${error.message}`);
  }
  
  console.log('\n📊 Summary:');
  console.log('Check if the IAM user has the necessary S3 permissions.');
  console.log('Required permissions for reading PDFs:');
  console.log('- s3:GetObject');
  console.log('- s3:ListBucket (optional but recommended)');
}

testS3Access();