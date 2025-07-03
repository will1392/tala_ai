import AWS from 'aws-sdk';
import dotenv from 'dotenv';

dotenv.config();

console.log('🧪 Testing Tala AI Bucket Access\n');

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const s3 = new AWS.S3();

async function testTalaBucket() {
  try {
    // Test 1: Upload a test file
    console.log('📤 Testing upload to tala-ai bucket...');
    const testKey = `test-upload-${Date.now()}.txt`;
    
    const uploadParams = {
      Bucket: 'tala-ai',
      Key: testKey,
      Body: 'This is a test file from Tala AI application',
      ContentType: 'text/plain'
    };
    
    const uploadResult = await s3.upload(uploadParams).promise();
    console.log('✅ Upload successful!');
    console.log(`   Location: ${uploadResult.Location}`);
    console.log(`   Key: ${uploadResult.Key}`);
    
    // Test 2: Check if file exists
    console.log('\n🔍 Verifying file exists...');
    try {
      const headResult = await s3.headObject({
        Bucket: 'tala-ai',
        Key: testKey
      }).promise();
      console.log('✅ File verified!');
      console.log(`   Size: ${headResult.ContentLength} bytes`);
      console.log(`   Type: ${headResult.ContentType}`);
    } catch (err) {
      console.log('❌ Could not verify file:', err.message);
    }
    
    // Test 3: Generate a signed URL
    console.log('\n🔗 Generating signed URL...');
    const signedUrl = s3.getSignedUrl('getObject', {
      Bucket: 'tala-ai',
      Key: testKey,
      Expires: 3600 // 1 hour
    });
    console.log('✅ Signed URL generated:');
    console.log(`   ${signedUrl.substring(0, 80)}...`);
    
    // Test 4: Delete test file
    console.log('\n🗑️  Cleaning up test file...');
    await s3.deleteObject({
      Bucket: 'tala-ai',
      Key: testKey
    }).promise();
    console.log('✅ Test file deleted');
    
    console.log('\n🎉 All tests passed! Your S3 bucket is ready for PDF storage.');
    console.log('\n📝 Next steps:');
    console.log('   1. Start the server: npm run dev');
    console.log('   2. Upload a PDF through the UI');
    console.log('   3. The PDF will be stored in S3 instead of locally');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.code === 'NoSuchBucket') {
      console.log('\n💡 The bucket "tala-ai" does not exist or is in a different region');
    } else if (error.code === 'AccessDenied') {
      console.log('\n💡 Access denied - check bucket permissions');
    } else {
      console.log('\n💡 Error details:', error);
    }
  }
}

testTalaBucket();