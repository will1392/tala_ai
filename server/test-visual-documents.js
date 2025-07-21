/**
 * Test Visual Document Processing Pipeline
 * 
 * Tests the visual document analysis functionality with mock responses
 */

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import documentProcessor from './services/documents/documentProcessor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

// Test documents configuration
const testDocuments = [
  {
    name: 'passport-sample.jpg',
    mimetype: 'image/jpeg',
    documentType: 'passport',
    description: 'Sample passport image'
  },
  {
    name: 'boarding-pass.png',
    mimetype: 'image/png',
    documentType: 'boarding_pass',
    description: 'Sample boarding pass'
  },
  {
    name: 'travel-brochure.jpg',
    mimetype: 'image/jpeg',
    documentType: 'brochure',
    description: 'Travel brochure with destinations and prices'
  },
  {
    name: 'hotel-confirmation.png',
    mimetype: 'image/png',
    documentType: 'hotel_confirmation',
    description: 'Hotel booking confirmation'
  },
  {
    name: 'travel-guide.pdf',
    mimetype: 'application/pdf',
    documentType: 'general',
    description: 'PDF travel guide (text + images)'
  }
];

async function createMockImageBuffer(filename) {
  // Create a simple mock image buffer
  // In real tests, you would load actual test images
  const mockContent = Buffer.from(`Mock image content for ${filename}`, 'utf-8');
  return mockContent;
}

async function testVisualDocument(testDoc) {
  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}Testing: ${testDoc.name}${colors.reset}`);
  console.log(`Type: ${testDoc.documentType} | Format: ${testDoc.mimetype}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════${colors.reset}\n`);

  try {
    // Create mock file buffer
    const buffer = await createMockImageBuffer(testDoc.name);
    
    // Process document
    console.log(`${colors.yellow}⏳ Processing document...${colors.reset}`);
    const startTime = Date.now();
    
    const result = await documentProcessor.processDocument({
      buffer,
      mimetype: testDoc.mimetype,
      originalname: testDoc.name
    }, {
      chunkSize: 500,
      extractImages: true,
      documentType: testDoc.documentType
    });
    
    const processingTime = Date.now() - startTime;
    
    // Display results
    console.log(`\n${colors.green}✅ Document processed successfully!${colors.reset}`);
    console.log(`Processing time: ${processingTime}ms`);
    console.log(`Document type: ${result.type}`);
    
    if (result.content) {
      console.log(`\n${colors.bright}Extracted Text:${colors.reset}`);
      console.log(result.content.substring(0, 200) + '...');
    }
    
    if (result.visualContent) {
      console.log(`\n${colors.bright}Visual Analysis:${colors.reset}`);
      console.log(`Visual elements: ${result.visualContent.elements?.length || 0}`);
      if (result.visualContent.analysis) {
        console.log(`Summary: ${result.visualContent.analysis}`);
      }
    }
    
    if (result.entities && Object.keys(result.entities).length > 0) {
      console.log(`\n${colors.bright}Extracted Entities:${colors.reset}`);
      Object.entries(result.entities).forEach(([key, value]) => {
        console.log(`  ${key}: ${JSON.stringify(value)}`);
      });
    }
    
    if (result.chunks && result.chunks.length > 0) {
      console.log(`\n${colors.bright}Document Chunks:${colors.reset}`);
      console.log(`Total chunks: ${result.chunks.length}`);
      console.log(`First chunk: ${result.chunks[0].content.substring(0, 100)}...`);
    }
    
    console.log(`\n${colors.bright}Metadata:${colors.reset}`);
    console.log(JSON.stringify(result.metadata, null, 2));
    
    return { success: true, result };
    
  } catch (error) {
    console.error(`\n${colors.red}❌ Error processing ${testDoc.name}:${colors.reset}`, error.message);
    console.error(`Stack trace: ${error.stack}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log(`${colors.bright}${colors.blue}🧪 Visual Document Processing Test Suite${colors.reset}`);
  console.log(`${colors.blue}════════════════════════════════════════${colors.reset}\n`);
  
  // Initialize document processor
  console.log(`${colors.yellow}📄 Initializing document processor...${colors.reset}`);
  try {
    await documentProcessor.initialize();
    console.log(`${colors.green}✅ Document processor initialized${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}❌ Failed to initialize document processor:${colors.reset}`, error.message);
    return;
  }
  
  // Run tests
  const results = [];
  for (const testDoc of testDocuments) {
    const result = await testVisualDocument(testDoc);
    results.push({
      document: testDoc.name,
      ...result
    });
  }
  
  // Summary
  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}📊 Test Summary${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════${colors.reset}\n`);
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`Total tests: ${results.length}`);
  console.log(`${colors.green}✅ Successful: ${successful}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${failed}${colors.reset}`);
  
  if (failed > 0) {
    console.log(`\n${colors.bright}Failed tests:${colors.reset}`);
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.document}: ${r.error}`);
    });
  }
  
  // Test specific document types
  console.log(`\n${colors.bright}Document Type Coverage:${colors.reset}`);
  const typeResults = {};
  results.forEach(r => {
    if (r.success && r.result) {
      const docType = r.result.metadata?.documentType || 'unknown';
      typeResults[docType] = (typeResults[docType] || 0) + 1;
    }
  });
  
  Object.entries(typeResults).forEach(([type, count]) => {
    console.log(`  ${type}: ${count} documents`);
  });
  
  // Visual content detection
  console.log(`\n${colors.bright}Visual Content Detection:${colors.reset}`);
  const visualDocs = results.filter(r => 
    r.success && (r.result?.type === 'visual' || r.result?.type === 'hybrid')
  );
  console.log(`  Documents with visual content: ${visualDocs.length}`);
  
  console.log(`\n${colors.green}✅ Test suite completed!${colors.reset}\n`);
}

// Run the tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});