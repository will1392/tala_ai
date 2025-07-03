import AWS from 'aws-sdk';
import dotenv from 'dotenv';

dotenv.config();

console.log('🧪 Testing S3 Connection\n');

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const s3 = new AWS.S3();

async function testS3() {
  try {
    // Test 1: List buckets
    console.log('📋 Listing buckets...');
    const buckets = await s3.listBuckets().promise();
    console.log('✅ Connected to AWS!');
    console.log(`   Found ${buckets.Buckets.length} buckets`);
    
    const talaBucket = buckets.Buckets.find(b => b.Name === 'tala-ai');
    if (talaBucket) {
      console.log(`✅ Found tala-ai bucket (created ${talaBucket.CreationDate})`);
    } else {
      console.log('❌ tala-ai bucket not found');
    }
    
    // Test 2: Check bucket location
    console.log('\n📍 Checking bucket configuration...');
    try {
      const location = await s3.getBucketLocation({ Bucket: 'tala-ai' }).promise();
      console.log(`✅ Bucket location: ${location.LocationConstraint || 'us-east-1'}`);
    } catch (err) {
      console.log('❌ Could not get bucket location:', err.message);
    }
    
    // Test 3: Try to upload a test file
    console.log('\n📤 Testing upload capability...');
    const testKey = `test-${Date.now()}.txt`;
    try {
      await s3.putObject({
        Bucket: 'tala-ai',
        Key: testKey,
        Body: 'Test upload from Tala AI',
        ContentType: 'text/plain'
      }).promise();
      console.log('✅ Successfully uploaded test file');
      
      // Clean up
      await s3.deleteObject({
        Bucket: 'tala-ai',
        Key: testKey
      }).promise();
      console.log('✅ Successfully deleted test file');
    } catch (err) {
      console.log('❌ Upload test failed:', err.message);
    }
    
    console.log('\n🎉 S3 is properly configured and ready to use!');
    
  } catch (error) {
    console.error('❌ S3 connection failed:', error.message);
    
    if (error.code === 'InvalidAccessKeyId') {
      console.log('\n💡 The access key ID is invalid');
    } else if (error.code === 'SignatureDoesNotMatch') {
      console.log('\n💡 The secret access key is invalid');
    } else if (error.code === 'NetworkingError') {
      console.log('\n💡 Network error - check your internet connection');
    }
  }
}

testS3();