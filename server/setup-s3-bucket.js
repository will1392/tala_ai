import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('🔧 S3 Bucket Setup\n');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const bucketName = process.env.AWS_S3_BUCKET || 'tala-ai-documents';

async function setupS3Bucket() {
  try {
    console.log('Configuration:');
    console.log('- Bucket:', bucketName);
    console.log('- Region:', process.env.AWS_REGION || 'us-east-1');
    console.log('- User ARN: arn:aws:iam::131209373452:user/sdk-tala');
    console.log('- Permissions: AmazonS3FullAccess (via sdk-group)\n');
    
    // 1. Check if bucket exists
    console.log('1. Checking if bucket exists...');
    let bucketExists = false;
    
    try {
      await s3.headBucket({ Bucket: bucketName }).promise();
      bucketExists = true;
      console.log('✅ Bucket already exists!');
    } catch (error) {
      if (error.code === 'NotFound') {
        console.log('❌ Bucket does not exist');
      } else if (error.code === 'Forbidden' || error.code === 'AccessDenied') {
        console.log('❌ Access denied to bucket');
        console.log('\n⚠️  The AWSCompromisedKeyQuarantineV3 policy might be blocking access.');
        console.log('This policy is applied when AWS detects potentially compromised credentials.');
        console.log('\nTo resolve:');
        console.log('1. Rotate your AWS credentials');
        console.log('2. Remove the quarantine policy from the IAM user');
        console.log('3. Update the new credentials in your .env file');
        return;
      } else {
        throw error;
      }
    }
    
    // 2. Create bucket if it doesn't exist
    if (!bucketExists) {
      console.log('\n2. Creating bucket...');
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
        
        // Wait a moment for bucket to be ready
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (createError) {
        if (createError.code === 'BucketAlreadyExists') {
          console.log('⚠️  Bucket name already taken globally. Try a different name.');
        } else if (createError.code === 'BucketAlreadyOwnedByYou') {
          console.log('✅ Bucket already owned by you');
          bucketExists = true;
        } else {
          console.error('❌ Failed to create bucket:', createError.message);
          throw createError;
        }
      }
    }
    
    // 3. Configure bucket for document storage
    console.log('\n3. Configuring bucket...');
    
    // Enable versioning
    try {
      await s3.putBucketVersioning({
        Bucket: bucketName,
        VersioningConfiguration: {
          Status: 'Enabled'
        }
      }).promise();
      console.log('✅ Versioning enabled');
    } catch (error) {
      console.log('⚠️  Could not enable versioning:', error.code);
    }
    
    // Set CORS configuration for web access
    try {
      const corsConfig = {
        Bucket: bucketName,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedHeaders: ['*'],
              AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
              AllowedOrigins: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'http://localhost:5174'],
              ExposeHeaders: ['ETag'],
              MaxAgeSeconds: 3000
            }
          ]
        }
      };
      await s3.putBucketCors(corsConfig).promise();
      console.log('✅ CORS configuration set');
    } catch (error) {
      console.log('⚠️  Could not set CORS:', error.code);
    }
    
    // 4. Test operations
    console.log('\n4. Testing bucket operations...');
    
    // Test upload
    const testKey = 'test/setup-test.txt';
    const testContent = `S3 bucket setup test - ${new Date().toISOString()}`;
    
    try {
      await s3.putObject({
        Bucket: bucketName,
        Key: testKey,
        Body: testContent,
        ContentType: 'text/plain',
        ServerSideEncryption: 'AES256'
      }).promise();
      console.log('✅ Upload test successful');
      
      // Test read
      const getResult = await s3.getObject({
        Bucket: bucketName,
        Key: testKey
      }).promise();
      console.log('✅ Read test successful');
      
      // Test signed URL
      const signedUrl = await s3.getSignedUrlPromise('getObject', {
        Bucket: bucketName,
        Key: testKey,
        Expires: 3600
      });
      console.log('✅ Signed URL generation successful');
      
      // Clean up
      await s3.deleteObject({
        Bucket: bucketName,
        Key: testKey
      }).promise();
      console.log('✅ Delete test successful');
      
    } catch (opError) {
      console.error('❌ Operation test failed:', opError.message);
      throw opError;
    }
    
    // 5. Update storage configuration
    console.log('\n✅ S3 bucket is ready!');
    console.log('\nTo use S3 storage:');
    console.log('1. Ensure STORAGE_TYPE=s3 in your .env file');
    console.log('2. Restart the server');
    console.log('\nAll new document uploads will be stored in S3.');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    
    if (error.code === 'UnauthorizedOperation') {
      console.log('\n⚠️  The operation was blocked by a policy.');
      console.log('Check the AWSCompromisedKeyQuarantineV3 policy in IAM.');
    }
  }
}

setupS3Bucket();