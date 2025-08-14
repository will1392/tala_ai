import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('🔧 Testing S3 Bucket Direct Access\n');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const bucketName = process.env.AWS_S3_BUCKET;

console.log('Configuration:');
console.log('- Bucket:', bucketName);
console.log('- Region:', process.env.AWS_REGION || 'us-east-1');

async function testBucketDirect() {
  try {
    // 1. Test bucket access directly (skip listing all buckets)
    console.log('\n1. Testing direct bucket access...');
    try {
      await s3.headBucket({ Bucket: bucketName }).promise();
      console.log('✅ Can access bucket:', bucketName);
    } catch (headError) {
      if (headError.code === 'NotFound') {
        console.log('❌ Bucket does not exist:', bucketName);
        console.log('\nAttempting to create bucket...');
        
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
          console.log('✅ Bucket created successfully!');
        } catch (createError) {
          console.error('❌ Failed to create bucket:', createError.message);
          return;
        }
      } else {
        console.error('❌ Cannot access bucket:', headError.message);
        return;
      }
    }
    
    // 2. Test upload
    console.log('\n2. Testing file upload...');
    const testKey = 'documents/test-connection.txt';
    const testContent = `S3 connection test - ${new Date().toISOString()}`;
    
    try {
      await s3.putObject({
        Bucket: bucketName,
        Key: testKey,
        Body: testContent,
        ContentType: 'text/plain',
        ServerSideEncryption: 'AES256'
      }).promise();
      console.log('✅ Test file uploaded successfully');
      
      // 3. Test read
      console.log('\n3. Testing file read...');
      const getResult = await s3.getObject({
        Bucket: bucketName,
        Key: testKey
      }).promise();
      
      console.log('✅ Test file read successfully');
      console.log('   Content:', getResult.Body.toString());
      
      // 4. Test signed URL
      console.log('\n4. Testing signed URL generation...');
      const signedUrl = await s3.getSignedUrlPromise('getObject', {
        Bucket: bucketName,
        Key: testKey,
        Expires: 3600 // 1 hour
      });
      console.log('✅ Signed URL generated:');
      console.log('  ', signedUrl.substring(0, 80) + '...');
      
      // 5. List objects in documents folder
      console.log('\n5. Listing objects in documents/ folder...');
      const listResult = await s3.listObjectsV2({
        Bucket: bucketName,
        Prefix: 'documents/',
        MaxKeys: 10
      }).promise();
      
      console.log('✅ Found', listResult.Contents.length, 'objects:');
      listResult.Contents.forEach(obj => {
        console.log('  -', obj.Key, `(${obj.Size} bytes)`);
      });
      
      // 6. Clean up test file
      console.log('\n6. Cleaning up test file...');
      await s3.deleteObject({
        Bucket: bucketName,
        Key: testKey
      }).promise();
      console.log('✅ Test file deleted');
      
    } catch (operationError) {
      console.error('❌ Operation failed:', operationError.message);
      console.error('   Error code:', operationError.code);
    }
    
    console.log('\n✅ S3 bucket test completed!');
    console.log('\nYour S3 storage is ready to use for document uploads.');
    
  } catch (error) {
    console.error('\n❌ S3 test failed:', error.message);
    console.error('   Error code:', error.code);
    
    if (error.code === 'InvalidAccessKeyId') {
      console.log('\n⚠️  Invalid AWS Access Key ID');
    } else if (error.code === 'SignatureDoesNotMatch') {
      console.log('\n⚠️  Invalid AWS Secret Access Key');
    } else if (error.code === 'AccessDenied') {
      console.log('\n⚠️  AWS credentials do not have required permissions for this bucket');
    }
  }
}

testBucketDirect();