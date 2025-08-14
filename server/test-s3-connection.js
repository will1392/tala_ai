import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('🔧 Testing S3 Connection\n');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const bucketName = process.env.AWS_S3_BUCKET;

console.log('Configuration:');
console.log('- Bucket:', bucketName);
console.log('- Region:', process.env.AWS_REGION || 'us-east-1');
console.log('- Access Key ID:', process.env.AWS_ACCESS_KEY_ID?.substring(0, 10) + '...');

async function testS3() {
  try {
    // 1. List all buckets
    console.log('\n1. Listing all buckets...');
    const bucketsResult = await s3.listBuckets().promise();
    console.log('✅ Found', bucketsResult.Buckets.length, 'buckets:');
    bucketsResult.Buckets.forEach(b => console.log('  -', b.Name));
    
    // 2. Check if our bucket exists
    const bucketExists = bucketsResult.Buckets.some(b => b.Name === bucketName);
    
    if (!bucketExists) {
      console.log(`\n❌ Bucket "${bucketName}" not found!`);
      console.log('\n2. Attempting to create bucket...');
      
      try {
        const createParams = {
          Bucket: bucketName,
          // Only add LocationConstraint for non us-east-1 regions
          ...(process.env.AWS_REGION && process.env.AWS_REGION !== 'us-east-1' ? {
            CreateBucketConfiguration: {
              LocationConstraint: process.env.AWS_REGION
            }
          } : {})
        };
        
        await s3.createBucket(createParams).promise();
        console.log(`✅ Bucket "${bucketName}" created successfully!`);
      } catch (createError) {
        console.error('❌ Failed to create bucket:', createError.message);
        if (createError.code === 'BucketAlreadyExists' || createError.code === 'BucketAlreadyOwnedByYou') {
          console.log('ℹ️  Bucket already exists (possibly in another account or region)');
        }
        return;
      }
    } else {
      console.log(`\n✅ Bucket "${bucketName}" exists!`);
    }
    
    // 3. Test bucket access
    console.log('\n3. Testing bucket access...');
    try {
      await s3.headBucket({ Bucket: bucketName }).promise();
      console.log('✅ Can access bucket');
    } catch (accessError) {
      console.error('❌ Cannot access bucket:', accessError.message);
      return;
    }
    
    // 4. Test upload
    console.log('\n4. Testing file upload...');
    const testKey = 'test/connection-test.txt';
    const testContent = `S3 connection test - ${new Date().toISOString()}`;
    
    try {
      await s3.putObject({
        Bucket: bucketName,
        Key: testKey,
        Body: testContent,
        ContentType: 'text/plain'
      }).promise();
      console.log('✅ Test file uploaded successfully');
      
      // 5. Test read
      console.log('\n5. Testing file read...');
      const getResult = await s3.getObject({
        Bucket: bucketName,
        Key: testKey
      }).promise();
      
      console.log('✅ Test file read successfully:', getResult.Body.toString());
      
      // 6. Clean up test file
      console.log('\n6. Cleaning up test file...');
      await s3.deleteObject({
        Bucket: bucketName,
        Key: testKey
      }).promise();
      console.log('✅ Test file deleted');
      
    } catch (uploadError) {
      console.error('❌ Upload/read test failed:', uploadError.message);
    }
    
    console.log('\n✅ S3 connection test completed successfully!');
    console.log('\nYour S3 storage is ready to use for document uploads.');
    
  } catch (error) {
    console.error('\n❌ S3 connection test failed:', error.message);
    
    if (error.code === 'InvalidAccessKeyId') {
      console.log('\n⚠️  Invalid AWS Access Key ID');
    } else if (error.code === 'SignatureDoesNotMatch') {
      console.log('\n⚠️  Invalid AWS Secret Access Key');
    } else if (error.code === 'UnauthorizedAccess') {
      console.log('\n⚠️  AWS credentials do not have required permissions');
    }
  }
}

testS3();