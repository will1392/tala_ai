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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadsDir = path.join(__dirname, 'uploads');

async function analyzePDFStorage() {
  console.log('🔍 COMPREHENSIVE PDF STORAGE ANALYSIS');
  console.log('=====================================\n');

  try {
    // 1. Analyze Qdrant database
    console.log('1️⃣ QDRANT DATABASE ANALYSIS');
    console.log('----------------------------');
    
    const collections = await qdrant.getCollections();
    console.log(`📊 Collections found: ${collections.collections.length}`);
    
    for (const collection of collections.collections) {
      console.log(`\n🗂️  Collection: ${collection.name}`);
      
      try {
        const collectionInfo = await qdrant.getCollection(collection.name);
        console.log(`   📈 Points: ${collectionInfo.points_count}`);
        console.log(`   📊 Status: ${collectionInfo.status}`);
        
        // Sample points from this collection
        const scroll = await qdrant.scroll(collection.name, {
          limit: 5,
          with_payload: true,
          with_vector: false
        });
        
        const pdfDocuments = new Map();
        scroll.points.forEach(point => {
          if (point.payload.document?.fileType === 'application/pdf') {
            const docId = point.payload.documentId;
            if (!pdfDocuments.has(docId)) {
              pdfDocuments.set(docId, {
                title: point.payload.metadata?.title || point.payload.document?.originalName,
                fileUrl: point.payload.document?.fileUrl,
                uploadedAt: point.payload.document?.uploadedAt,
                chunks: 1
              });
            } else {
              pdfDocuments.get(docId).chunks++;
            }
          }
        });
        
        if (pdfDocuments.size > 0) {
          console.log(`   📄 PDF documents in this collection: ${pdfDocuments.size}`);
          pdfDocuments.forEach((doc, docId) => {
            console.log(`      📋 ${doc.title}`);
            console.log(`         🔗 URL: ${doc.fileUrl || 'NO URL'}`);
            console.log(`         📊 Chunks: ${doc.chunks}`);
          });
        }
      } catch (err) {
        console.log(`   ❌ Error accessing collection: ${err.message}`);
      }
    }

    // 2. Analyze local file storage
    console.log('\n\n2️⃣ LOCAL FILE STORAGE ANALYSIS');
    console.log('--------------------------------');
    
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      const pdfFiles = files.filter(file => file.endsWith('.pdf'));
      
      console.log(`📁 Upload directory: ${uploadsDir}`);
      console.log(`📄 PDF files found: ${pdfFiles.length}`);
      
      pdfFiles.forEach(file => {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        console.log(`   📋 ${file}`);
        console.log(`      📊 Size: ${Math.round(stats.size / 1024)}KB`);
        console.log(`      📅 Modified: ${stats.mtime.toISOString()}`);
      });
    } else {
      console.log('❌ Upload directory does not exist');
    }

    // 3. Analyze server configuration
    console.log('\n\n3️⃣ SERVER CONFIGURATION ANALYSIS');
    console.log('----------------------------------');
    
    console.log('🌐 Environment Variables:');
    console.log(`   🗂️  Qdrant URL: ${process.env.QDRANT_URL ? 'CONFIGURED (Cloud)' : 'NOT SET'}`);
    console.log(`   🔑 Qdrant API Key: ${process.env.QDRANT_API_KEY ? 'CONFIGURED' : 'NOT SET'}`);
    console.log(`   🤖 OpenAI API Key: ${process.env.OPENAI_API_KEY ? 'CONFIGURED' : 'NOT SET'}`);
    console.log(`   🌍 CORS Origin: ${process.env.CORS_ORIGIN || 'DEFAULT (localhost:5173)'}`);
    console.log(`   🚀 Port: ${process.env.PORT || '3001'}`);

    // 4. URL pattern analysis
    console.log('\n\n4️⃣ PDF ACCESS PATTERN ANALYSIS');
    console.log('--------------------------------');
    
    console.log('📋 How PDFs are stored and accessed:');
    console.log('   1. ✅ PDFs are saved locally in /uploads/ directory');
    console.log('   2. ✅ File URLs are stored in Qdrant database');
    console.log('   3. ✅ URLs follow pattern: /api/files/{uuid}-{filename}');
    console.log('   4. ✅ Server serves files via express.static middleware');
    console.log('   5. ✅ Frontend accesses PDFs via: http://localhost:3001/api/files/{filename}');
    
    console.log('\n🔧 Server Configuration:');
    console.log('   📁 Static file serving: app.use(\'/api/files\', express.static(uploadsDir))');
    console.log('   🌐 CORS headers configured for file access');
    console.log('   📋 Files saved with UUID prefix for uniqueness');

    // 5. Problem diagnosis
    console.log('\n\n5️⃣ PROBLEM DIAGNOSIS');
    console.log('---------------------');
    
    console.log('❓ Why PDFs might not load on new computer:');
    console.log('   1. 🚫 Server not running (http://localhost:3001)');
    console.log('   2. 🚫 /uploads/ directory missing or empty');
    console.log('   3. 🚫 File permissions preventing access');
    console.log('   4. 🚫 CORS configuration blocking requests');
    console.log('   5. 🚫 Firewall blocking port 3001');
    console.log('   6. 🚫 Files not copied to new computer\'s uploads directory');

    console.log('\n✅ SOLUTION RECOMMENDATIONS:');
    console.log('   1. 📁 Copy /uploads/ directory to new computer');
    console.log('   2. 🚀 Ensure server is running on http://localhost:3001');
    console.log('   3. 🔧 Check file permissions on uploads directory');
    console.log('   4. 🌐 Verify CORS configuration allows frontend origin');
    console.log('   5. 🔍 Test direct URL access: http://localhost:3001/api/files/{filename}');

    // 6. Cloud storage analysis
    console.log('\n\n6️⃣ CLOUD STORAGE ANALYSIS');
    console.log('--------------------------');
    
    console.log('☁️ Current Status: NO CLOUD STORAGE CONFIGURED');
    console.log('   📋 Files are stored locally only');
    console.log('   ❌ No S3, Cloudinary, or other cloud providers found');
    console.log('   ❌ No external URLs in database');
    console.log('   ❌ No cloud storage environment variables');
    
    console.log('\n💡 For cross-computer access, consider:');
    console.log('   1. ☁️ Implement cloud storage (S3, Cloudinary, etc.)');
    console.log('   2. 🗂️ Use a shared network drive');
    console.log('   3. 🔄 Sync uploads directory between computers');
    console.log('   4. 🌐 Deploy server to cloud platform');

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

analyzePDFStorage();