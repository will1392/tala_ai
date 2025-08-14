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

async function listAllFiles() {
  console.log('🔍 Listing ALL files in S3 bucket\n');
  console.log('Bucket:', process.env.AWS_S3_BUCKET);
  console.log('Current IAM User:', process.env.AWS_ACCESS_KEY_ID);
  console.log('');
  
  try {
    let continuationToken;
    let fileCount = 0;
    
    do {
      const params = {
        Bucket: process.env.AWS_S3_BUCKET,
        ContinuationToken: continuationToken
      };
      
      const data = await s3.listObjectsV2(params).promise();
      
      if (data.Contents) {
        for (const obj of data.Contents) {
          fileCount++;
          console.log(`\n📄 File #${fileCount}:`);
          console.log(`   Key: ${obj.Key}`);
          console.log(`   Size: ${(obj.Size / 1024).toFixed(2)} KB`);
          console.log(`   Modified: ${obj.LastModified}`);
          console.log(`   StorageClass: ${obj.StorageClass}`);
          
          // Try to get object metadata to check permissions
          try {
            const metadata = await s3.headObject({
              Bucket: process.env.AWS_S3_BUCKET,
              Key: obj.Key
            }).promise();
            console.log(`   ✅ Can access metadata`);
            
            // Try to generate signed URL
            const signedUrl = await s3.getSignedUrlPromise('getObject', {
              Bucket: process.env.AWS_S3_BUCKET,
              Key: obj.Key,
              Expires: 300
            });
            console.log(`   ✅ Signed URL generated`);
            
            // Test the signed URL
            const fetch = (await import('node-fetch')).default;
            const response = await fetch(signedUrl, { method: 'HEAD' });
            
            if (response.ok) {
              console.log(`   ✅ Signed URL works (${response.status})`);
            } else {
              console.log(`   ❌ Signed URL failed (${response.status} ${response.statusText})`);
            }
          } catch (error) {
            console.log(`   ❌ Cannot access: ${error.message}`);
          }
        }
      }
      
      continuationToken = data.NextContinuationToken;
    } while (continuationToken);
    
    console.log(`\n\n📊 Total files found: ${fileCount}`);
    
  } catch (error) {
    console.error('❌ Error listing objects:', error);
    console.error('Details:', error.message);
  }
}

listAllFiles();