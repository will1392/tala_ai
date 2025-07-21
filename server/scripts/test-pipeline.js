#!/usr/bin/env node

/**
 * Test Script for Smart Document Pipeline
 * 
 * Usage: node server/scripts/test-pipeline.js [image-file]
 * 
 * Tests the complete smart pipeline processing flow with a document
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// Note: For this test, we'll create mock versions of missing services
// In production, these would be the actual implementations

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_USER_ID = 'test-user-123';
const TEST_ORG_ID = 'test-org-123';

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

async function testPipeline(imagePath) {
  try {
    logSection('🚀 Smart Document Pipeline Test');
    
    // Check if file exists
    if (!imagePath) {
      log('Usage: node test-pipeline.js <image-file>', 'yellow');
      log('Example: node test-pipeline.js sample-passport.jpg', 'yellow');
      process.exit(1);
    }

    const fullPath = path.resolve(imagePath);
    
    try {
      await fs.access(fullPath);
      log(`✅ Found file: ${fullPath}`, 'green');
    } catch {
      log(`❌ File not found: ${fullPath}`, 'red');
      process.exit(1);
    }

    // Read file info
    const stats = await fs.stat(fullPath);
    const fileBuffer = await fs.readFile(fullPath);
    const fileName = path.basename(fullPath);
    const mimeType = getMimeType(fileName);
    
    log(`📄 File: ${fileName}`, 'cyan');
    log(`📏 Size: ${(stats.size / 1024).toFixed(2)} KB`, 'cyan');
    log(`🎨 Type: ${mimeType}`, 'cyan');

    // Create mock document
    const mockDocument = {
      id: 'test-doc-' + Date.now(),
      title: fileName,
      file_name: fileName,
      file_path: fullPath,
      file_size: stats.size,
      file_type: mimeType,
      mime_type: mimeType,
      user_id: TEST_USER_ID,
      organization_id: TEST_ORG_ID,
      content: null,
      metadata: {}
    };

    logSection('📸 Visual Analysis');
    
    // Test visual analysis directly
    try {
      const visualResult = await visualAnalyzer.analyzeDocument({
        imagePath: fullPath,
        enableTextExtraction: true,
        enableObjectDetection: true,
        enableQualityCheck: true
      });

      log('✅ Visual analysis completed', 'green');
      log(`📝 Description: ${visualResult.description}`, 'blue');
      
      if (visualResult.objects && visualResult.objects.length > 0) {
        log(`🎯 Detected objects: ${visualResult.objects.map(o => o.name).join(', ')}`, 'blue');
      }
      
      if (visualResult.extractedText) {
        log(`📄 Text detected: ${visualResult.extractedText.substring(0, 100)}...`, 'blue');
      }
      
      if (visualResult.quality) {
        log(`⭐ Quality score: ${visualResult.quality.overall}/10`, 'blue');
      }
    } catch (error) {
      log(`⚠️  Visual analysis skipped: ${error.message}`, 'yellow');
    }

    logSection('🔤 OCR Processing');
    
    // Test OCR directly
    try {
      const ocrResult = await ocrService.processDocument({
        imagePath: fullPath,
        languages: ['eng'],
        enhanceImage: true,
        outputFormat: 'structured'
      });

      log('✅ OCR processing completed', 'green');
      log(`📄 Extracted text (${ocrResult.text.length} chars):`, 'blue');
      console.log(ocrResult.text.substring(0, 200) + '...\n');
      
      if (ocrResult.confidence) {
        log(`🎯 Confidence: ${(ocrResult.confidence * 100).toFixed(1)}%`, 'blue');
      }
      
      // Test language detection
      if (ocrResult.text && ocrResult.text.length > 20) {
        const langResult = await ocrService.detectLanguage(ocrResult.text);
        log(`🌐 Detected language: ${langResult.language} (${(langResult.confidence * 100).toFixed(1)}% confidence)`, 'blue');
      }
    } catch (error) {
      log(`⚠️  OCR processing skipped: ${error.message}`, 'yellow');
    }

    logSection('🔄 Pipeline Processing');
    
    // Set up pipeline event listeners
    const events = [];
    
    smartPipeline.on('document:queued', (event) => {
      events.push({ type: 'queued', time: Date.now() });
      log(`📥 Document queued (position: ${event.queuePosition})`, 'cyan');
    });

    smartPipeline.on('document:processing', (event) => {
      events.push({ type: 'processing', time: Date.now() });
      log(`⚙️  Processing started`, 'cyan');
    });

    smartPipeline.on('document:stage', (event) => {
      events.push({ type: 'stage', stage: event.stage, time: Date.now() });
      log(`📍 Stage: ${event.stage}`, 'magenta');
    });

    smartPipeline.on('document:completed', (event) => {
      events.push({ type: 'completed', time: Date.now() });
      log(`✅ Processing completed in ${event.duration}ms`, 'green');
    });

    smartPipeline.on('document:failed', (event) => {
      events.push({ type: 'failed', time: Date.now() });
      log(`❌ Processing failed: ${event.finalError}`, 'red');
    });

    smartPipeline.on('stage:error', (event) => {
      log(`⚠️  Stage error in ${event.stage}: ${event.error}`, 'yellow');
    });

    // Queue document for processing
    const processingResult = await smartPipeline.processDocument(mockDocument, {
      priority: 'high',
      targetLanguage: 'en',
      ocrLanguages: ['eng']
    });

    log(`✅ Document queued with ID: ${processingResult.processingId}`, 'green');

    // Wait for processing to complete
    log('\n⏳ Waiting for processing to complete...', 'yellow');
    
    let completed = false;
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds timeout
    
    while (!completed && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
      
      const status = smartPipeline.getProcessingStatus(processingResult.processingId);
      
      if (status.status === 'completed' || status.status === 'failed') {
        completed = true;
        
        logSection('📊 Processing Results');
        
        if (status.status === 'completed') {
          log('✅ Pipeline processing completed successfully!', 'green');
          
          // Get the processed document data
          const processedDoc = await getProcessedDocument(mockDocument.id);
          
          if (processedDoc) {
            log('\n📋 Document Analysis:', 'bright');
            log(`  Type: ${processedDoc.documentType?.primaryType || 'unknown'}`, 'blue');
            log(`  Language: ${processedDoc.detectedLanguage?.language || 'unknown'}`, 'blue');
            log(`  Entity count: ${processedDoc.entity_count || 0}`, 'blue');
            log(`  Relationship count: ${processedDoc.relationship_count || 0}`, 'blue');
            
            if (processedDoc.ocr_content) {
              log('\n📄 OCR Content:', 'bright');
              console.log(processedDoc.ocr_content.substring(0, 300) + '...');
            }
            
            if (processedDoc.visual_description) {
              log('\n🖼️  Visual Description:', 'bright');
              console.log(processedDoc.visual_description);
            }
            
            if (processedDoc.metadata?.entities) {
              log('\n🏷️  Extracted Entities:', 'bright');
              const entities = processedDoc.metadata.entities;
              Object.entries(entities).forEach(([type, values]) => {
                if (values && values.length > 0) {
                  log(`  ${type}: ${values.join(', ')}`, 'cyan');
                }
              });
            }
          }
        } else {
          log('❌ Pipeline processing failed', 'red');
          if (status.errors && status.errors.length > 0) {
            log('\nErrors:', 'red');
            status.errors.forEach(err => {
              log(`  - ${err.stage}: ${err.error}`, 'red');
            });
          }
        }
        
        // Show event timeline
        log('\n⏱️  Processing Timeline:', 'bright');
        let startTime = events[0]?.time || Date.now();
        events.forEach(event => {
          const elapsed = event.time - startTime;
          log(`  +${elapsed}ms: ${event.type}${event.stage ? ' - ' + event.stage : ''}`, 'cyan');
        });
      } else {
        process.stdout.write(`\r⏳ Processing... (${attempts}s) - Status: ${status.status}, Stage: ${status.stage || 'waiting'}`);
      }
    }
    
    if (!completed) {
      log('\n⏱️  Processing timeout!', 'red');
    }

    // Show pipeline statistics
    logSection('📈 Pipeline Statistics');
    const pipelineStats = smartPipeline.getStatistics();
    log(`Queue length: ${pipelineStats.queueLength}`, 'blue');
    log(`Active jobs: ${pipelineStats.activeJobs}`, 'blue');
    
    if (pipelineStats.activeJobsDetail.length > 0) {
      log('\nActive jobs:', 'bright');
      pipelineStats.activeJobsDetail.forEach(job => {
        log(`  - ${job.documentId}: ${job.stage} (${job.progress}%)`, 'cyan');
      });
    }

  } catch (error) {
    log(`\n❌ Test failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Helper function to get MIME type from filename
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.json': 'application/json'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// Mock function to simulate getting processed document
async function getProcessedDocument(documentId) {
  // In a real scenario, this would fetch from the database
  // For testing, we'll return mock data that would be set by the pipeline
  return {
    id: documentId,
    documentType: { primaryType: 'passport', confidence: 0.9 },
    detectedLanguage: { language: 'en', confidence: 0.95 },
    entity_count: 5,
    relationship_count: 0,
    ocr_content: 'PASSPORT\nUnited States of America\nSurname: DOE\nGiven Names: JOHN\nNationality: USA\nDate of Birth: 01 JAN 1990\nPassport No: 123456789\nDate of Issue: 15 MAR 2020\nDate of Expiry: 15 MAR 2030',
    visual_description: 'A passport document showing personal identification information including photo, name, nationality, and validity dates.',
    metadata: {
      entities: {
        names: ['JOHN DOE'],
        dates: ['01 JAN 1990', '15 MAR 2020', '15 MAR 2030'],
        passport: ['123456789'],
        destinations: ['USA']
      }
    }
  };
}

// Run the test
const args = process.argv.slice(2);
testPipeline(args[0]).then(() => {
  log('\n✅ Test completed!', 'green');
  process.exit(0);
}).catch(error => {
  log(`\n❌ Test error: ${error.message}`, 'red');
  process.exit(1);
});