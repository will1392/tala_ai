import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('🔧 Checking S3 Access\n');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

async function checkExistingAccess() {
  console.log('The AWSCompromisedKeyQuarantineV3 policy is blocking certain operations.');
  console.log('This happens when AWS detects potentially exposed credentials.\n');
  
  // Try to work with a specific bucket pattern
  const possibleBuckets = [
    'tala-ai-documents',
    'tala-documents', 
    'tala-ai',
    'tala',
    'sdk-tala',
    'talaai',
    'tala-storage',
    'tala-files'
  ];
  
  console.log('Testing access to existing buckets...\n');
  
  for (const bucket of possibleBuckets) {
    try {
      // Try to list objects (this might work even if CreateBucket is denied)
      const result = await s3.listObjectsV2({
        Bucket: bucket,
        MaxKeys: 1
      }).promise();
      
      console.log(`✅ Found accessible bucket: ${bucket}`);
      console.log(`   Objects in bucket: ${result.KeyCount}`);
      
      // Test if we can upload
      try {
        const testKey = 'test-access.txt';
        await s3.putObject({
          Bucket: bucket,
          Key: testKey,
          Body: 'Test',
          ContentType: 'text/plain'
        }).promise();
        
        // Clean up
        await s3.deleteObject({
          Bucket: bucket,
          Key: testKey
        }).promise();
        
        console.log('   Can upload: ✅');
        console.log(`\n🎉 Use this bucket: ${bucket}`);
        console.log('\nUpdate your .env file:');
        console.log(`AWS_S3_BUCKET=${bucket}`);
        console.log('\nThen restart the server.');
        return;
        
      } catch (uploadError) {
        console.log('   Can upload: ❌');
      }
      
    } catch (error) {
      // Bucket not accessible, continue
    }
  }
  
  console.log('\n❌ No accessible buckets found.\n');
  console.log('To resolve the quarantine issue:');
  console.log('1. Go to AWS IAM Console');
  console.log('2. Find user: sdk-tala');
  console.log('3. Remove the AWSCompromisedKeyQuarantineV3 policy');
  console.log('4. Rotate the access keys');
  console.log('5. Update the new keys in your .env file');
  console.log('\nAlternatively, ask your AWS administrator to:');
  console.log('- Create a new bucket for you');
  console.log('- Grant access to an existing bucket');
  console.log('- Create new IAM credentials without the quarantine policy');
}

checkExistingAccess();