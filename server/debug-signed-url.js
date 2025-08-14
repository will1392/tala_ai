import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

async function debugSignedUrl() {
  console.log('🔍 Debugging S3 Signed URL Issue\n');
  
  const bucket = process.env.AWS_S3_BUCKET;
  const key = 'documents/e22db3d6-f3ed-4650-8f67-6128dbee3c80-1751571003280-Kensington_France_Guide.pdf';
  
  console.log('Configuration:');
  console.log('- Bucket:', bucket);
  console.log('- Region:', process.env.AWS_REGION || 'us-east-1');
  console.log('- Access Key:', process.env.AWS_ACCESS_KEY_ID);
  console.log('');
  
  // First, let's check the bucket location
  console.log('1️⃣ Checking bucket location...');
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1'
  });
  
  try {
    const location = await s3.getBucketLocation({ Bucket: bucket }).promise();
    const actualRegion = location.LocationConstraint || 'us-east-1';
    console.log('✅ Bucket region:', actualRegion);
    
    if (actualRegion !== (process.env.AWS_REGION || 'us-east-1')) {
      console.log('⚠️  WARNING: Bucket region mismatch!');
      console.log('   Configured region:', process.env.AWS_REGION || 'us-east-1');
      console.log('   Actual bucket region:', actualRegion);
    }
  } catch (error) {
    console.log('❌ Error getting bucket location:', error.message);
  }
  
  // Test different S3 configurations
  console.log('\n2️⃣ Testing different S3 configurations...\n');
  
  const configs = [
    {
      name: 'Default (v4 signature)',
      options: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1'
      }
    },
    {
      name: 'With s3ForcePathStyle',
      options: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1',
        s3ForcePathStyle: true
      }
    },
    {
      name: 'With signatureVersion v4',
      options: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1',
        signatureVersion: 'v4'
      }
    },
    {
      name: 'With specific endpoint',
      options: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1',
        endpoint: `https://s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`
      }
    }
  ];
  
  for (const config of configs) {
    console.log(`Testing: ${config.name}`);
    
    try {
      const s3Instance = new AWS.S3(config.options);
      
      // Generate signed URL
      const signedUrl = await s3Instance.getSignedUrlPromise('getObject', {
        Bucket: bucket,
        Key: key,
        Expires: 3600 // 1 hour
      });
      
      console.log('✅ Signed URL generated');
      console.log(`   URL: ${signedUrl.substring(0, 150)}...`);
      
      // Test the URL
      const response = await fetch(signedUrl, { 
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TalaAI/1.0)'
        }
      });
      
      if (response.ok) {
        console.log(`✅ URL works! Status: ${response.status}`);
        console.log(`   Content-Type: ${response.headers.get('content-type')}`);
        console.log(`   Content-Length: ${response.headers.get('content-length')}`);
        
        // Found working configuration!
        console.log('\n🎉 WORKING CONFIGURATION FOUND!');
        console.log('Use this S3 configuration:');
        console.log(JSON.stringify(config.options, null, 2));
        break;
      } else {
        console.log(`❌ URL failed: ${response.status} ${response.statusText}`);
        
        // Try to get error details
        if (response.status === 403) {
          const text = await response.text();
          if (text.includes('SignatureDoesNotMatch')) {
            console.log('   Issue: Signature mismatch');
          } else if (text.includes('RequestTimeTooSkewed')) {
            console.log('   Issue: Clock skew (check system time)');
          } else if (text.includes('AccessDenied')) {
            console.log('   Issue: Access denied (check IAM permissions)');
          }
        }
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log('');
  }
  
  // Check system time
  console.log('\n3️⃣ Checking system time...');
  const systemTime = new Date();
  console.log('System time:', systemTime.toISOString());
  console.log('Unix timestamp:', Math.floor(systemTime.getTime() / 1000));
  
  // Get AWS time for comparison
  try {
    const awsResponse = await fetch('https://s3.amazonaws.com/');
    const awsDate = awsResponse.headers.get('date');
    if (awsDate) {
      const awsTime = new Date(awsDate);
      const timeDiff = Math.abs(systemTime - awsTime) / 1000;
      console.log('AWS time:', awsTime.toISOString());
      console.log('Time difference:', timeDiff, 'seconds');
      
      if (timeDiff > 300) { // 5 minutes
        console.log('⚠️  WARNING: Significant time difference detected!');
        console.log('   This can cause signature errors.');
      }
    }
  } catch (error) {
    console.log('Could not check AWS time');
  }
}

debugSignedUrl();