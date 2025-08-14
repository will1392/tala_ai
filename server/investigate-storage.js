import dotenv from 'dotenv';
import { QdrantClient } from '@qdrant/qdrant-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

async function investigateStorage() {
  try {
    console.log('🔍 Investigating PDF storage...');
    
    // Get all points to check for patterns
    const scroll = await qdrant.scroll('tala_admin_knowledge', {
      limit: 10,
      with_payload: true,
      with_vector: false
    });
    
    console.log(`\n📋 Found ${scroll.points.length} points. Checking for PDF files and their URLs:\n`);
    
    const pdfDocuments = new Map();
    
    scroll.points.forEach((point, index) => {
      const documentId = point.payload.documentId;
      const fileType = point.payload.document?.fileType;
      const fileUrl = point.payload.document?.fileUrl;
      const title = point.payload.metadata?.title || point.payload.document?.originalName;
      
      if (fileType === 'application/pdf') {
        if (!pdfDocuments.has(documentId)) {
          pdfDocuments.set(documentId, {
            documentId,
            title,
            fileType,
            fileUrl,
            chunkCount: 1
          });
        } else {
          pdfDocuments.get(documentId).chunkCount++;
        }
      }
    });
    
    console.log(`📄 Found ${pdfDocuments.size} PDF documents:\n`);
    
    pdfDocuments.forEach((doc, docId) => {
      console.log(`🔹 ${doc.title}`);
      console.log(`   Document ID: ${docId}`);
      console.log(`   File URL: ${doc.fileUrl || 'NO URL FOUND'}`);
      console.log(`   Chunks: ${doc.chunkCount}`);
      console.log('');
    });
    
    // Check if the URLs correspond to actual files
    console.log('🔍 Checking local files in uploads directory...\n');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const uploadsDir = path.join(__dirname, 'uploads');
    
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      console.log('📁 Files in uploads directory:');
      files.forEach(file => {
        if (file.endsWith('.pdf')) {
          const stats = fs.statSync(path.join(uploadsDir, file));
          console.log(`   📄 ${file} (${Math.round(stats.size / 1024)}KB)`);
          
          // Check if this file matches any document
          const matchingDoc = Array.from(pdfDocuments.values()).find(doc => 
            doc.fileUrl && doc.fileUrl.includes(file)
          );
          
          if (matchingDoc) {
            console.log(`      ✅ Matches document: ${matchingDoc.title}`);
          } else {
            console.log(`      ❌ No matching document found in database`);
          }
        }
      });
    } else {
      console.log('❌ Uploads directory does not exist');
    }
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`   📄 PDF documents in database: ${pdfDocuments.size}`);
    console.log(`   🔗 Documents with fileUrl: ${Array.from(pdfDocuments.values()).filter(doc => doc.fileUrl).length}`);
    console.log(`   ❌ Documents without fileUrl: ${Array.from(pdfDocuments.values()).filter(doc => !doc.fileUrl).length}`);
    
    // Check the URL pattern
    const urlPattern = Array.from(pdfDocuments.values())
      .filter(doc => doc.fileUrl)
      .map(doc => doc.fileUrl)[0];
    
    if (urlPattern) {
      console.log(`   🌐 URL pattern: ${urlPattern}`);
      console.log(`   🏠 This indicates files are served locally via: http://localhost:3001${urlPattern}`);
    }
    
  } catch (error) {
    console.error('❌ Investigation failed:', error);
  }
}

investigateStorage();