import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

async function checkBucketConfiguration() {
  const bucket = process.env.AWS_S3_BUCKET;
  console.log(`🔍 Checking S3 bucket configuration for: ${bucket}\n`);
  
  // Check bucket policy
  console.log('1️⃣ Checking Bucket Policy...');
  try {
    const policy = await s3.getBucketPolicy({ Bucket: bucket }).promise();
    console.log('✅ Bucket Policy exists:');
    console.log(JSON.stringify(JSON.parse(policy.Policy), null, 2));
  } catch (error) {
    if (error.code === 'NoSuchBucketPolicy') {
      console.log('ℹ️  No bucket policy set (this is OK)');
    } else {
      console.log('❌ Error getting bucket policy:', error.message);
    }
  }
  
  // Check bucket CORS
  console.log('\n2️⃣ Checking CORS Configuration...');
  try {
    const cors = await s3.getBucketCors({ Bucket: bucket }).promise();
    console.log('✅ CORS Configuration:');
    console.log(JSON.stringify(cors.CORSRules, null, 2));
  } catch (error) {
    if (error.code === 'NoSuchCORSConfiguration') {
      console.log('⚠️  No CORS configuration (this might cause issues)');
    } else {
      console.log('❌ Error getting CORS:', error.message);
    }
  }
  
  // Check bucket ACL
  console.log('\n3️⃣ Checking Bucket ACL...');
  try {
    const acl = await s3.getBucketAcl({ Bucket: bucket }).promise();
    console.log('✅ Bucket Owner:', acl.Owner.DisplayName || acl.Owner.ID);
    console.log('Grants:', acl.Grants.length);
  } catch (error) {
    console.log('❌ Error getting ACL:', error.message);
  }
  
  // Check if bucket has public access block
  console.log('\n4️⃣ Checking Public Access Block...');
  try {
    const publicBlock = await s3.getPublicAccessBlock({ Bucket: bucket }).promise();
    console.log('✅ Public Access Block Configuration:');
    console.log('- BlockPublicAcls:', publicBlock.PublicAccessBlockConfiguration.BlockPublicAcls);
    console.log('- BlockPublicPolicy:', publicBlock.PublicAccessBlockConfiguration.BlockPublicPolicy);
    console.log('- IgnorePublicAcls:', publicBlock.PublicAccessBlockConfiguration.IgnorePublicAcls);
    console.log('- RestrictPublicBuckets:', publicBlock.PublicAccessBlockConfiguration.RestrictPublicBuckets);
  } catch (error) {
    if (error.code === 'NoSuchPublicAccessBlockConfiguration') {
      console.log('ℹ️  No public access block configuration');
    } else {
      console.log('❌ Error:', error.message);
    }
  }
  
  // Test creating a public URL vs signed URL
  console.log('\n5️⃣ Testing URL generation methods...');
  const testKey = 'documents/e22db3d6-f3ed-4650-8f67-6128dbee3c80-1751571003280-Kensington_France_Guide.pdf';
  
  // Try different signing methods
  console.log('\nTesting different signature versions:');
  
  // V2 signature
  try {
    const s3v2 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
      signatureVersion: 'v2'
    });
    
    const urlV2 = await s3v2.getSignedUrlPromise('getObject', {
      Bucket: bucket,
      Key: testKey,
      Expires: 300
    });
    console.log('✅ V2 Signed URL generated');
  } catch (error) {
    console.log('❌ V2 Signature failed:', error.message);
  }
  
  // V4 signature (default)
  try {
    const urlV4 = await s3.getSignedUrlPromise('getObject', {
      Bucket: bucket,
      Key: testKey,
      Expires: 300
    });
    console.log('✅ V4 Signed URL generated');
  } catch (error) {
    console.log('❌ V4 Signature failed:', error.message);
  }
}

checkBucketConfiguration();