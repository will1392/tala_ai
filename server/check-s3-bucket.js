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

async function listS3Objects() {
  console.log('🔍 Checking S3 bucket contents\n');
  console.log('Bucket:', process.env.AWS_S3_BUCKET);
  
  try {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Prefix: 'documents/'
    };
    
    const data = await s3.listObjectsV2(params).promise();
    
    console.log(`\nFound ${data.Contents?.length || 0} objects:\n`);
    
    if (data.Contents) {
      data.Contents.forEach(obj => {
        console.log(`- ${obj.Key}`);
        console.log(`  Size: ${(obj.Size / 1024).toFixed(2)} KB`);
        console.log(`  Modified: ${obj.LastModified}`);
        console.log('');
      });
    }
    
    // Check specifically for the France guide
    const franceKey = 'documents/e22db3d6-f3ed-4650-8f67-6128dbee3c80-1751571003280-Kensington_France_Guide.pdf';
    const found = data.Contents?.some(obj => obj.Key === franceKey);
    
    console.log(`\n🔎 France guide (${franceKey}): ${found ? '✅ Found' : '❌ Not found'}`);
    
  } catch (error) {
    console.error('Error listing S3 objects:', error);
  }
}

listS3Objects();