import { QdrantClient } from '@qdrant/qdrant-js';
import PDFDocument from 'pdfkit';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const uploadsDir = path.join(__dirname, 'uploads');

async function recreatePDFsFromContent() {
  console.log('🔍 Recreating PDFs from database content...');
  
  // Get all collections
  const collections = await qdrant.getCollections();
  const knowledgeCollections = collections.collections.filter(c => 
    c.name.includes('knowledge')
  );
  
  console.log(`📚 Found ${knowledgeCollections.length} knowledge collections`);
  
  let totalRecreated = 0;
  const documentsMap = new Map(); // Group chunks by documentId
  
  // First, collect all chunks for each document
  for (const collection of knowledgeCollections) {
    console.log(`\n📁 Processing collection: ${collection.name}`);
    
    let offset = null;
    let hasMore = true;
    
    while (hasMore) {
      const result = await qdrant.scroll(collection.name, {
        limit: 100,
        offset: offset,
        with_payload: true,
        filter: {
          must: [{
            key: 'document.fileType',
            match: { value: 'application/pdf' }
          }]
        }
      });
      
      for (const point of result.points) {
        const documentId = point.payload?.documentId;
        const fileUrl = point.payload?.document?.fileUrl;
        const chunkIndex = point.payload?.metadata?.chunkIndex || 0;
        const content = point.payload?.content || '';
        const title = point.payload?.metadata?.title || 'Untitled';
        
        if (!documentsMap.has(documentId)) {
          documentsMap.set(documentId, {
            title: title,
            fileUrl: fileUrl,
            chunks: []
          });
        }
        
        documentsMap.get(documentId).chunks.push({
          index: chunkIndex,
          content: content
        });
      }
      
      offset = result.next_page_offset;
      hasMore = offset !== null && offset !== undefined;
    }
  }
  
  // Now create PDFs with full content
  console.log(`\n📄 Creating PDFs for ${documentsMap.size} documents...`);
  
  for (const [documentId, docData] of documentsMap) {
    if (docData.fileUrl && docData.fileUrl.startsWith('/api/files/')) {
      const filename = docData.fileUrl.replace('/api/files/', '');
      const filepath = path.join(uploadsDir, filename);
      
      console.log(`\n📄 Processing: ${docData.title}`);
      console.log(`   Chunks: ${docData.chunks.length}`);
      
      // Sort chunks by index
      docData.chunks.sort((a, b) => a.index - b.index);
      
      // Combine all chunks
      const fullContent = docData.chunks.map(chunk => chunk.content).join('\n\n');
      
      try {
        // Create a new PDF document
        const doc = new PDFDocument({
          size: 'A4',
          margins: {
            top: 72,
            bottom: 72,
            left: 72,
            right: 72
          }
        });
        
        // Pipe to file
        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);
        
        // Add title
        doc.fontSize(20)
           .font('Helvetica-Bold')
           .text(docData.title, {
             align: 'center'
           });
        
        doc.moveDown(2);
        
        // Add content
        doc.fontSize(12)
           .font('Helvetica')
           .text(fullContent, {
             align: 'justify',
             lineGap: 5
           });
        
        // Finalize PDF
        doc.end();
        
        // Wait for stream to finish
        await new Promise((resolve, reject) => {
          stream.on('finish', resolve);
          stream.on('error', reject);
        });
        
        console.log(`   ✅ Created PDF with ${fullContent.length} characters`);
        totalRecreated++;
      } catch (error) {
        console.error(`   ❌ Failed to create PDF: ${error.message}`);
      }
    }
  }
  
  console.log(`\n✅ Recreated ${totalRecreated} PDF files with full content`);
  console.log(`📁 All PDFs are now available in: ${uploadsDir}`);
}

// Run the recreation
recreatePDFsFromContent().catch(console.error);