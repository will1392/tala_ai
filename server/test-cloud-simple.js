import dotenv from 'dotenv';
dotenv.config();

console.log('🧪 Cloud Storage Configuration Test\n');

// Check environment variables
console.log('📋 Current Configuration:');
console.log(`   STORAGE_TYPE: ${process.env.STORAGE_TYPE || 'local (default)'}`);

if (!process.env.STORAGE_TYPE || process.env.STORAGE_TYPE === 'local') {
  console.log('\n✅ Using LOCAL storage');
  console.log('   PDFs will be saved to: server/uploads/');
  console.log('   This is the default configuration and works without any setup');
} else if (process.env.STORAGE_TYPE === 's3') {
  console.log('\n☁️  Using AWS S3 storage');
  console.log(`   Bucket: ${process.env.AWS_S3_BUCKET || '❌ Not configured'}`);
  console.log(`   Region: ${process.env.AWS_REGION || '❌ Not configured'}`);
  console.log(`   Access Key: ${process.env.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Not set'}`);
  console.log(`   Secret Key: ${process.env.AWS_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Not set'}`);
  
  if (!process.env.AWS_S3_BUCKET || !process.env.AWS_ACCESS_KEY_ID) {
    console.log('\n❌ S3 is not properly configured!');
    console.log('   The server will fall back to local storage');
  }
} else if (process.env.STORAGE_TYPE === 'cloudinary') {
  console.log('\n☁️  Using Cloudinary storage');
  console.log(`   Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME || '❌ Not configured'}`);
  console.log(`   API Key: ${process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log(`   API Secret: ${process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Not set'}`);
}

console.log('\n📝 To test the full upload flow:');
console.log('   1. Start the server: npm run dev');
console.log('   2. Start the frontend: npm run dev (in parent directory)');
console.log('   3. Upload a PDF through the UI');
console.log('   4. Check the server logs for storage location');
console.log('   5. Verify the PDF loads in the document viewer');