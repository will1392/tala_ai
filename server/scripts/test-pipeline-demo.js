#!/usr/bin/env node

/**
 * Demo Script for Smart Document Pipeline
 * 
 * Demonstrates the smart pipeline concept without requiring all services
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes
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

// Mock Smart Pipeline for demonstration
class MockSmartPipeline {
  constructor() {
    this.stages = [
      'type_detection',
      'visual_analysis',
      'ocr_processing',
      'language_detection',
      'translation',
      'entity_extraction',
      'relationship_mapping',
      'storage_indexing'
    ];
    this.currentStage = 0;
  }

  async processDocument(document) {
    const results = {
      documentType: null,
      visualAnalysis: null,
      ocrText: null,
      detectedLanguage: null,
      translation: null,
      extractedEntities: null,
      relationships: null
    };

    for (const stage of this.stages) {
      await this.simulateStage(stage, document, results);
    }

    return results;
  }

  async simulateStage(stage, document, results) {
    log(`\n📍 Processing stage: ${stage}`, 'magenta');
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate processing

    switch (stage) {
      case 'type_detection':
        results.documentType = this.detectType(document);
        log(`  ✅ Detected type: ${results.documentType.primaryType}`, 'green');
        break;

      case 'visual_analysis':
        if (document.mime_type?.startsWith('image/')) {
          results.visualAnalysis = {
            description: 'A passport document with personal identification information',
            objects: ['text', 'photo', 'official_seal'],
            quality: { overall: 8.5 }
          };
          log(`  ✅ Visual analysis complete`, 'green');
        } else {
          log(`  ⏭️  Skipped (not an image)`, 'yellow');
        }
        break;

      case 'ocr_processing':
        if (document.mime_type?.startsWith('image/') || !document.content) {
          results.ocrText = await this.performOCR(document);
          log(`  ✅ OCR extracted ${results.ocrText.text.length} characters`, 'green');
        } else {
          results.ocrText = { text: document.content, confidence: 1.0 };
          log(`  ⏭️  Using existing text content`, 'yellow');
        }
        break;

      case 'language_detection':
        results.detectedLanguage = {
          language: 'en',
          confidence: 0.98
        };
        log(`  ✅ Detected language: ${results.detectedLanguage.language}`, 'green');
        break;

      case 'translation':
        if (results.detectedLanguage.language !== 'en') {
          results.translation = {
            translatedText: results.ocrText.text,
            targetLanguage: 'en'
          };
          log(`  ✅ Translated to English`, 'green');
        } else {
          log(`  ⏭️  No translation needed`, 'yellow');
        }
        break;

      case 'entity_extraction':
        results.extractedEntities = this.extractEntities(results.ocrText.text);
        const entityCount = Object.values(results.extractedEntities)
          .reduce((sum, arr) => sum + arr.length, 0);
        log(`  ✅ Extracted ${entityCount} entities`, 'green');
        break;

      case 'relationship_mapping':
        results.relationships = {
          count: 0,
          relatedDocuments: []
        };
        log(`  ✅ Relationship mapping complete`, 'green');
        break;

      case 'storage_indexing':
        log(`  ✅ Document indexed for search`, 'green');
        break;
    }
  }

  detectType(document) {
    const content = document.content || '';
    const lowerContent = content.toLowerCase();

    if (lowerContent.includes('passport')) {
      return { primaryType: 'passport', confidence: 0.95 };
    } else if (lowerContent.includes('flight') || lowerContent.includes('boarding')) {
      return { primaryType: 'flight', confidence: 0.90 };
    } else if (lowerContent.includes('hotel') || lowerContent.includes('accommodation')) {
      return { primaryType: 'hotel', confidence: 0.85 };
    }

    return { primaryType: 'document', confidence: 0.5 };
  }

  async performOCR(document) {
    // Read content if it's a text file
    if (document.file_path && document.file_path.endsWith('.txt')) {
      const content = await fs.readFile(document.file_path, 'utf8');
      return { text: content, confidence: 0.95 };
    }
    
    // Simulate OCR for images
    return {
      text: `PASSPORT
United States of America
Passport No: 123456789
Surname: DOE
Given Names: JOHN MICHAEL
Date of Birth: 01 JAN 1990
Date of Expiry: 15 MAR 2030`,
      confidence: 0.85
    };
  }

  extractEntities(text) {
    const entities = {
      names: [],
      dates: [],
      passport: [],
      bookingReferences: [],
      flightNumbers: [],
      destinations: []
    };

    // Extract names
    const nameMatch = text.match(/(?:Surname|Name):\s*([A-Z]+)/gi);
    if (nameMatch) {
      entities.names.push(nameMatch[0].split(':')[1].trim());
    }

    // Extract passport numbers
    const passportMatch = text.match(/(?:Passport No|Passport Number):\s*(\w+)/gi);
    if (passportMatch) {
      entities.passport.push(passportMatch[0].split(':')[1].trim());
    }

    // Extract dates
    const datePattern = /\d{1,2}\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{4}/gi;
    const dates = text.match(datePattern);
    if (dates) {
      entities.dates = dates;
    }

    // Extract booking references
    const bookingMatch = text.match(/(?:Booking Reference|PNR):\s*([A-Z0-9]{6})/gi);
    if (bookingMatch) {
      entities.bookingReferences.push(bookingMatch[0].split(':')[1].trim());
    }

    // Extract flight numbers
    const flightMatch = text.match(/(?:Flight):\s*([A-Z]{2}\d{3,4})/gi);
    if (flightMatch) {
      entities.flightNumbers.push(flightMatch[0].split(':')[1].trim());
    }

    return entities;
  }
}

async function demonstratePipeline(filePath) {
  try {
    logSection('🚀 Smart Document Pipeline Demo');

    // Check file
    const fullPath = path.resolve(filePath || 'server/sample-passport.txt');
    
    try {
      await fs.access(fullPath);
      log(`✅ Found file: ${fullPath}`, 'green');
    } catch {
      log(`❌ File not found: ${fullPath}`, 'red');
      log(`\n💡 Creating sample files...`, 'yellow');
      
      // Create sample passport
      const passportContent = `PASSPORT
United States of America

Type: P
Code: USA
Passport No: 123456789
Surname: DOE
Given Names: JOHN MICHAEL
Nationality: UNITED STATES OF AMERICA
Date of Birth: 01 JAN 1990
Place of Birth: NEW YORK, USA
Date of Issue: 15 MAR 2020
Date of Expiry: 15 MAR 2030
Authority: DEPT OF STATE`;

      const passportPath = path.join(path.dirname(fullPath), 'sample-passport.txt');
      await fs.writeFile(passportPath, passportContent);
      log(`✅ Created sample passport: ${passportPath}`, 'green');
      
      // Create sample flight
      const flightContent = `ELECTRONIC TICKET RECEIPT

Booking Reference: ABC123
Date of Issue: 10 JAN 2025

PASSENGER INFORMATION
Name: DOE/JOHN MR

FLIGHT DETAILS
Flight: AA1234
Date: 15 MAR 2025
From: New York (JFK)
To: Los Angeles (LAX)`;

      const flightPath = path.join(path.dirname(fullPath), 'sample-flight.txt');
      await fs.writeFile(flightPath, flightContent);
      log(`✅ Created sample flight: ${flightPath}`, 'green');
      
      // Use the passport for demo
      fullPath = passportPath;
    }

    // Read file
    const stats = await fs.stat(fullPath);
    const content = await fs.readFile(fullPath, 'utf8');
    const fileName = path.basename(fullPath);
    
    log(`\n📄 Processing: ${fileName}`, 'cyan');
    log(`📏 Size: ${(stats.size / 1024).toFixed(2)} KB`, 'cyan');

    // Create document object
    const document = {
      id: 'demo-doc-' + Date.now(),
      title: fileName,
      file_name: fileName,
      file_path: fullPath,
      file_size: stats.size,
      file_type: 'text/plain',
      mime_type: 'text/plain',
      content: content
    };

    // Process through pipeline
    logSection('🔄 Pipeline Processing');
    
    const pipeline = new MockSmartPipeline();
    const results = await pipeline.processDocument(document);

    // Show results
    logSection('📊 Processing Results');
    
    log('\n📋 Document Analysis:', 'bright');
    log(`  Type: ${results.documentType.primaryType} (${(results.documentType.confidence * 100).toFixed(0)}% confidence)`, 'blue');
    log(`  Language: ${results.detectedLanguage.language} (${(results.detectedLanguage.confidence * 100).toFixed(0)}% confidence)`, 'blue');
    
    if (results.visualAnalysis) {
      log('\n🖼️  Visual Analysis:', 'bright');
      log(`  Description: ${results.visualAnalysis.description}`, 'blue');
      log(`  Objects: ${results.visualAnalysis.objects.join(', ')}`, 'blue');
      log(`  Quality: ${results.visualAnalysis.quality.overall}/10`, 'blue');
    }
    
    log('\n🏷️  Extracted Entities:', 'bright');
    Object.entries(results.extractedEntities).forEach(([type, values]) => {
      if (values && values.length > 0) {
        log(`  ${type}: ${values.join(', ')}`, 'cyan');
      }
    });

    // Demonstrate relationship detection
    if (results.documentType.primaryType === 'passport') {
      logSection('🔗 Relationship Suggestions');
      log('This passport could be related to:', 'bright');
      log('  • Flight bookings for JOHN DOE', 'cyan');
      log('  • Hotel reservations with matching dates', 'cyan');
      log('  • Visa applications requiring this passport', 'cyan');
    } else if (results.documentType.primaryType === 'flight') {
      logSection('🔗 Relationship Suggestions');
      log('This flight booking could be related to:', 'bright');
      log('  • Passport for DOE/JOHN', 'cyan');
      log('  • Hotel bookings in Los Angeles around MAR 15', 'cyan');
      log('  • Return flight from LAX to JFK', 'cyan');
    }

    // Show how documents would be organized into trips
    logSection('✈️  Trip Organization');
    log('Smart Pipeline can automatically organize related documents into trips:', 'bright');
    log('\n📁 Trip: New York to Los Angeles - March 2025', 'yellow');
    log('  📄 Passport - DOE, JOHN (Valid until 2030)', 'cyan');
    log('  ✈️  Flight AA1234 - JFK to LAX (15 MAR 2025)', 'cyan');
    log('  🏨 [Missing] Hotel booking for Los Angeles', 'red');
    log('  ✈️  [Missing] Return flight', 'red');
    
    log('\n💡 The system would suggest:', 'bright');
    log('  • Add hotel reservation for your LA trip', 'green');
    log('  • Add return flight booking', 'green');
    log('  • Check if visa is required', 'green');

    // Demonstrate real-time updates
    logSection('📡 Real-time Updates');
    log('With WebSocket support, you would see:', 'bright');
    log('  • ⚡ Live processing status for each stage', 'cyan');
    log('  • 📊 Progress indicators during OCR/translation', 'cyan');
    log('  • ✅ Instant notifications when processing completes', 'cyan');
    log('  • 🔔 Alerts for newly discovered relationships', 'cyan');

  } catch (error) {
    log(`\n❌ Demo failed: ${error.message}`, 'red');
    console.error(error);
  }
}

// Run the demo
const args = process.argv.slice(2);
demonstratePipeline(args[0]).then(() => {
  log('\n✅ Demo completed!', 'green');
  log('\n💡 In production, this pipeline would:', 'yellow');
  log('  • Use Google Gemini for visual analysis of images', 'cyan');
  log('  • Perform real OCR with Tesseract.js', 'cyan');
  log('  • Detect and translate multiple languages', 'cyan');
  log('  • Find relationships with existing documents', 'cyan');
  log('  • Automatically organize documents into trips', 'cyan');
  log('  • Provide real-time updates via WebSocket', 'cyan');
  process.exit(0);
}).catch(error => {
  log(`\n❌ Demo error: ${error.message}`, 'red');
  process.exit(1);
});