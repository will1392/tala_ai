#!/usr/bin/env node

/**
 * Create a sample passport image for testing
 * 
 * This creates a simple text representation of a passport
 * that can be used to test OCR and document processing
 */

import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createSamplePassport() {
  // Create canvas
  const width = 800;
  const height = 1000;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, width, height);

  // Border
  ctx.strokeStyle = '#000080';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  // Header
  ctx.fillStyle = '#000080';
  ctx.fillRect(40, 40, width - 80, 120);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('PASSPORT', width / 2, 90);
  
  ctx.font = 'bold 28px Arial';
  ctx.fillText('United States of America', width / 2, 130);

  // Photo area (placeholder)
  ctx.fillStyle = '#cccccc';
  ctx.fillRect(60, 200, 200, 250);
  ctx.strokeStyle = '#666666';
  ctx.strokeRect(60, 200, 200, 250);
  
  ctx.fillStyle = '#666666';
  ctx.font = '20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('PHOTO', 160, 325);

  // Personal Information
  ctx.fillStyle = '#000000';
  ctx.font = '18px Arial';
  ctx.textAlign = 'left';
  
  const fields = [
    { label: 'Type', value: 'P', y: 200 },
    { label: 'Code', value: 'USA', y: 230 },
    { label: 'Passport No', value: '123456789', y: 260 },
    { label: 'Surname', value: 'DOE', y: 290 },
    { label: 'Given Names', value: 'JOHN MICHAEL', y: 320 },
    { label: 'Nationality', value: 'UNITED STATES OF AMERICA', y: 350 },
    { label: 'Date of Birth', value: '01 JAN 1990', y: 380 },
    { label: 'Place of Birth', value: 'NEW YORK, USA', y: 410 },
    { label: 'Date of Issue', value: '15 MAR 2020', y: 440 },
    { label: 'Date of Expiry', value: '15 MAR 2030', y: 470 },
    { label: 'Authority', value: 'DEPT OF STATE', y: 500 }
  ];

  fields.forEach(field => {
    // Label
    ctx.font = '16px Arial';
    ctx.fillStyle = '#666666';
    ctx.fillText(field.label, 300, field.y);
    
    // Value
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#000000';
    ctx.fillText(field.value, 300, field.y + 25);
  });

  // Machine Readable Zone (MRZ)
  ctx.fillStyle = '#f8f8f8';
  ctx.fillRect(40, 850, width - 80, 120);
  
  ctx.font = '24px monospace';
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.fillText('P<USADOE<<JOHN<MICHAEL<<<<<<<<<<<<<<<<<<<<', width / 2, 900);
  ctx.fillText('1234567894USA9001015M3003159<<<<<<<<<<<<<06', width / 2, 940);

  // Save the image
  const buffer = canvas.toBuffer('image/jpeg');
  const outputPath = path.join(__dirname, 'sample-passport.jpg');
  fs.writeFileSync(outputPath, buffer);
  
  console.log(`✅ Sample passport created: ${outputPath}`);
  console.log(`📏 Size: ${(buffer.length / 1024).toFixed(2)} KB`);
  console.log(`📐 Dimensions: ${width}x${height}`);
  
  return outputPath;
}

// Check if canvas is available
try {
  createSamplePassport();
} catch (error) {
  console.error('❌ Error creating sample passport:', error.message);
  console.log('\n💡 Canvas module not found. Installing it...');
  console.log('Run: npm install canvas');
  
  // Create a simple text file instead
  const textContent = `PASSPORT
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
Authority: DEPT OF STATE

P<USADOE<<JOHN<MICHAEL<<<<<<<<<<<<<<<<<<<<
1234567894USA9001015M3003159<<<<<<<<<<<<<06`;

  const outputPath = path.join(__dirname, 'sample-passport.txt');
  fs.writeFileSync(outputPath, textContent);
  console.log(`\n✅ Created text version instead: ${outputPath}`);
}