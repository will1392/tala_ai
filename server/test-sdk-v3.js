import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testSDKv3() {
  console.log('🔍 Testing with AWS SDK v3\n');
  
  const bucket = process.env.AWS_S3_BUCKET;
  const key = 'documents/e22db3d6-f3ed-4650-8f67-6128dbee3c80-1751571003280-Kensington_France_Guide.pdf';
  
  // Create S3 client
  const client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });
  
  console.log('Configuration:');
  console.log('- SDK Version: v3');
  console.log('- Region:', process.env.AWS_REGION || 'us-east-1');
  console.log('- Bucket:', bucket);
  console.log('');
  
  try {
    // Create GetObject command
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    });
    
    // Generate presigned URL
    const signedUrl = await getSignedUrl(client, command, { 
      expiresIn: 3600 // 1 hour
    });
    
    console.log('✅ Signed URL generated with SDK v3');
    console.log(`URL: ${signedUrl.substring(0, 150)}...`);
    
    // Test the URL
    console.log('\nTesting signed URL...');
    const response = await fetch(signedUrl, { 
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TalaAI/1.0)'
      }
    });
    
    if (response.ok) {
      console.log(`✅ SUCCESS! URL works with SDK v3`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Content-Type: ${response.headers.get('content-type')}`);
      console.log(`   Content-Length: ${response.headers.get('content-length')} bytes`);
      
      console.log('\n🎉 Solution: Use AWS SDK v3 for signed URLs!');
    } else {
      console.log(`❌ URL failed: ${response.status} ${response.statusText}`);
      
      // Get error details
      const errorText = await response.text();
      console.log('\nError response:');
      console.log(errorText.substring(0, 500));
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Check if SDK v3 is installed
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

try {
  require.resolve('@aws-sdk/client-s3');
  require.resolve('@aws-sdk/s3-request-presigner');
  testSDKv3();
} catch (error) {
  console.log('❌ AWS SDK v3 is not installed.');
  console.log('\nTo install, run:');
  console.log('cd server');
  console.log('npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner');
}