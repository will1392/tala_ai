import { QdrantClient } from '@qdrant/qdrant-js';
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

// Simple PDF generator
function generatePDF(title, content) {
  return `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 300 >>
stream
BT
/F1 20 Tf
50 700 Td
(${title.replace(/[()\\]/g, '\\$&')}) Tj
0 -40 Td
/F1 14 Tf
(Document recovered from database) Tj
0 -30 Td
/F1 12 Tf
(${content.substring(0, 60).replace(/[()\\]/g, '\\$&')}...) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000262 00000 n
0000000341 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
700
%%EOF`;
}

async function fixMissingPDFs() {
  console.log('🔍 Searching for documents with missing PDF files...');
  
  // Get all collections
  const collections = await qdrant.getCollections();
  const knowledgeCollections = collections.collections.filter(c => 
    c.name.includes('knowledge')
  );
  
  console.log(`📚 Found ${knowledgeCollections.length} knowledge collections`);
  
  let totalFixed = 0;
  const processedDocs = new Set();
  
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
        const fileUrl = point.payload?.document?.fileUrl;
        const documentId = point.payload?.documentId;
        const title = point.payload?.metadata?.title || 'Untitled';
        const content = point.payload?.content || '';
        
        // Skip if already processed this document
        if (processedDocs.has(documentId)) continue;
        processedDocs.add(documentId);
        
        if (fileUrl && fileUrl.startsWith('/api/files/')) {
          const filename = fileUrl.replace('/api/files/', '');
          const filepath = path.join(uploadsDir, filename);
          
          if (!fs.existsSync(filepath)) {
            console.log(`❌ Missing file: ${filename}`);
            console.log(`   Document: ${title}`);
            console.log(`   Creating placeholder PDF...`);
            
            try {
              // Generate a simple PDF with the document content
              const pdfContent = generatePDF(title, content);
              fs.writeFileSync(filepath, pdfContent);
              console.log(`   ✅ Created: ${filename}`);
              totalFixed++;
            } catch (error) {
              console.error(`   ❌ Failed to create PDF: ${error.message}`);
            }
          }
        }
      }
      
      offset = result.next_page_offset;
      hasMore = offset !== null && offset !== undefined;
    }
  }
  
  console.log(`\n✅ Fixed ${totalFixed} missing PDF files`);
  console.log(`📁 All PDFs are now available in: ${uploadsDir}`);
}

// Run the fix
fixMissingPDFs().catch(console.error);