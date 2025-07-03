import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const PDFParse = require('pdf-parse');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testPDFExtraction() {
  console.log('🧪 Testing PDF Text Extraction\n');
  
  try {
    // Test with our sample PDF
    const samplePath = path.join(__dirname, 'test-files', 'sample.pdf');
    
    if (fs.existsSync(samplePath)) {
      console.log('📄 Testing sample PDF...');
      const buffer = fs.readFileSync(samplePath);
      
      try {
        const pdfData = await PDFParse(buffer);
        console.log('✅ Sample PDF extraction successful!');
        console.log(`   Text: "${pdfData.text}"`);
        console.log(`   Pages: ${pdfData.numpages}`);
        console.log(`   Info: ${JSON.stringify(pdfData.info)}`);
      } catch (error) {
        console.error('❌ Sample PDF extraction failed:', error.message);
      }
    } else {
      console.log('⚠️ Sample PDF not found, creating one...');
      // The sample PDF file should have been created above
    }
    
    // Test with a simple text buffer to verify PDFParse works
    console.log('\n📝 Testing PDFParse functionality...');
    
    // Try to create a minimal valid PDF
    const minimalPDF = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj  
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R>>endobj
4 0 obj<</Length 40>>stream
BT /F1 12 Tf 100 700 Td (Hello World) Tj ET
endstream endobj
xref 0 5
0000000000 65535 f 
0000000009 00000 n 
0000000052 00000 n 
0000000100 00000 n 
0000000180 00000 n 
trailer<</Size 5/Root 1 0 R>>
startxref
265
%%EOF`;
    
    const testBuffer = Buffer.from(minimalPDF);
    
    try {
      const testResult = await PDFParse(testBuffer);
      console.log('✅ Minimal PDF test successful!');
      console.log(`   Text: "${testResult.text.trim()}"`);
    } catch (error) {
      console.error('❌ Minimal PDF test failed:', error.message);
      console.error('   This suggests PDFParse library issue');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

console.log('='.repeat(50));
testPDFExtraction();
console.log('='.repeat(50));