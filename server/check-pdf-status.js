/**
 * Simple check of PDF storage status
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🔍 PDF Storage Status Check\n');
console.log('=====================================\n');

// 1. Check configuration
console.log('📋 Current Configuration:');
console.log('  Storage Type:', process.env.STORAGE_TYPE || 'NOT SET');
console.log('  AWS Bucket:', process.env.AWS_S3_BUCKET || 'NOT SET');
console.log('  AWS Region:', process.env.AWS_REGION || 'NOT SET');
console.log('');

// 2. Check local PDFs
console.log('📁 Local PDF Files:');
const uploadsDir = path.join(__dirname, 'uploads');
if (fs.existsSync(uploadsDir)) {
  const files = fs.readdirSync(uploadsDir);
  const pdfFiles = files.filter(f => f.endsWith('.pdf'));
  
  console.log(`  Found ${pdfFiles.length} PDFs in /server/uploads/:`);
  pdfFiles.forEach(file => {
    const stats = fs.statSync(path.join(uploadsDir, file));
    const sizeKB = (stats.size / 1024).toFixed(1);
    
    // Extract the document name (remove UUID prefix)
    const docName = file.substring(37); // UUID + dash = 37 chars
    console.log(`    ✓ ${docName} (${sizeKB} KB)`);
  });
  
  console.log('\n  📌 These PDFs are stored locally on your computer');
  console.log('  📌 They can be accessed at: http://localhost:3001/api/files/{filename}');
} else {
  console.log('  ❌ No uploads directory found');
}

console.log('\n=====================================\n');

console.log('📊 What this means:\n');
console.log('  1. Your PDFs are stored LOCALLY, not in AWS S3');
console.log('  2. The guides you see without formatting are likely:');
console.log('     - Showing extracted text from database (not the PDF)');
console.log('     - Unable to load the actual PDF file');
console.log('     - Missing the PDF viewer component');
console.log('\n💡 To see original PDFs with formatting:');
console.log('  1. Make sure server is running (npm run dev:server)');
console.log('  2. PDFs should be viewable at /knowledge page');
console.log('  3. If not working, the PDF viewer component may need fixing');

console.log('\n🔧 Current Storage Setup:');
if (process.env.STORAGE_TYPE === 's3') {
  console.log('  ⚠️ Configured for S3 but likely falling back to local');
  console.log('  → S3 credentials may be invalid or bucket inaccessible');
} else {
  console.log('  ✅ Using local storage (PDFs saved in /server/uploads/)');
}

process.exit(0);