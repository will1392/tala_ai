import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('🔧 Finding Accessible S3 Buckets\n');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

// Common bucket names to try
const bucketNamesToTry = [
  'tala-ai-documents',
  'tala-documents',
  'tala-ai',
  'tala',
  'sdk-tala',
  'sdk-tala-documents',
  'tala-ai-storage',
  'tala-storage'
];

async function findAccessibleBucket() {
  console.log('Testing common bucket names for access...\n');
  
  for (const bucketName of bucketNamesToTry) {
    process.stdout.write(`Checking "${bucketName}"... `);
    
    try {
      // Try to access the bucket
      await s3.headBucket({ Bucket: bucketName }).promise();
      console.log('✅ ACCESSIBLE!');
      
      // Try to list objects
      try {
        const listResult = await s3.listObjectsV2({
          Bucket: bucketName,
          MaxKeys: 1
        }).promise();
        console.log(`   Can list objects: ✅ (${listResult.Contents.length} found)`);
        
        // Try to upload
        const testKey = 'test-permissions.txt';
        try {
          await s3.putObject({
            Bucket: bucketName,
            Key: testKey,
            Body: 'Test',
            ContentType: 'text/plain'
          }).promise();
          console.log('   Can upload: ✅');
          
          // Clean up
          await s3.deleteObject({
            Bucket: bucketName,
            Key: testKey
          }).promise();
          
          console.log(`\n🎉 Found working bucket: "${bucketName}"`);
          console.log('\nUpdate your .env file:');
          console.log(`AWS_S3_BUCKET=${bucketName}`);
          return bucketName;
          
        } catch (uploadError) {
          console.log('   Can upload: ❌', uploadError.code);
        }
        
      } catch (listError) {
        console.log('   Can list objects: ❌', listError.code);
      }
      
    } catch (error) {
      if (error.code === 'NotFound') {
        console.log('❌ Not found');
      } else if (error.code === 'Forbidden' || error.code === 'AccessDenied') {
        console.log('❌ Access denied');
      } else {
        console.log('❌', error.code || error.message);
      }
    }
  }
  
  console.log('\n❌ No accessible buckets found with the common names.');
  console.log('\nPlease check with your AWS administrator for:');
  console.log('1. The correct bucket name');
  console.log('2. Proper permissions for the user: sdk-tala');
  console.log('\nRequired permissions:');
  console.log('- s3:GetObject');
  console.log('- s3:PutObject');
  console.log('- s3:DeleteObject');
  console.log('- s3:ListBucket');
}

findAccessibleBucket();