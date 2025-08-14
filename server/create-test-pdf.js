import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import CloudStorageService from './services/cloudStorage.js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const cloudStorage = new CloudStorageService();

async function createAndUploadTestPDF() {
  console.log('📄 Creating test PDF for France Guide...\n');
  
  // Create a new PDF document
  const doc = new PDFDocument();
  const buffers = [];
  
  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', async () => {
    const pdfBuffer = Buffer.concat(buffers);
    
    console.log(`✅ PDF created (${(pdfBuffer.length / 1024).toFixed(2)} KB)`);
    
    try {
      // Upload to S3 with the specific key
      const s3Key = 'documents/e22db3d6-f3ed-4650-8f67-6128dbee3c80-1751571003280-Kensington_France_Guide.pdf';
      
      console.log(`\n📤 Uploading to S3...`);
      console.log(`   Bucket: ${process.env.AWS_S3_BUCKET}`);
      console.log(`   Key: ${s3Key}`);
      
      const params = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: s3Key,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
        ServerSideEncryption: 'AES256'
      };
      
      const result = await cloudStorage.s3.upload(params).promise();
      
      console.log(`\n✅ Upload successful!`);
      console.log(`   Location: ${result.Location}`);
      console.log(`   ETag: ${result.ETag}`);
      console.log(`\n🎉 The France Guide PDF should now display correctly in the Knowledge Base!`);
      
    } catch (error) {
      console.error('\n❌ Upload failed:', error);
    }
  });
  
  // Add content to the PDF
  doc.fontSize(24)
     .text('Kensington France Guide', 100, 100);
     
  doc.fontSize(16)
     .text('Test Document', 100, 150);
     
  doc.fontSize(12)
     .text('\nThis is a temporary test PDF to verify S3 document display functionality.', 100, 200);
     
  doc.text('\nThe original France Guide content would include:', 100, 250);
  doc.list([
    'A land of indulgence',
    'Essential travel information',
    'Travel like a local',
    'Upon your arrival',
    'Insider tips',
    'Packing tips and travel checklist',
    'Useful apps for your trip',
    'Destination expert recommended'
  ], 120, 300);
  
  doc.text('\n\nNote: This is a test document. Please re-upload the original Kensington France Guide PDF for the full content.', 100, 450);
  
  // Finalize the PDF
  doc.end();
}

// Check if pdfkit is installed
try {
  createAndUploadTestPDF();
} catch (error) {
  if (error.code === 'MODULE_NOT_FOUND') {
    console.log('❌ pdfkit is not installed. Please run:');
    console.log('   cd server && npm install pdfkit');
  } else {
    console.error('Error:', error);
  }
}