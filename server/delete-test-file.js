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

async function deleteTestFile() {
  console.log('🗑️  Deleting test file from S3\n');
  
  const key = 'documents/e22db3d6-f3ed-4650-8f67-6128dbee3c80-1751571003280-Kensington_France_Guide.pdf';
  
  try {
    // First check if it exists
    await s3.headObject({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key
    }).promise();
    
    console.log('✅ File exists, deleting...');
    
    // Delete the file
    await s3.deleteObject({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key
    }).promise();
    
    console.log('✅ Test file deleted successfully');
    console.log('\nNow the S3 bucket is empty again.');
    console.log('The "NoSuchKey" error you saw earlier is expected - the original files don\'t exist in S3.');
    
  } catch (error) {
    if (error.code === 'NotFound') {
      console.log('ℹ️  File already deleted or doesn\'t exist');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

deleteTestFile();