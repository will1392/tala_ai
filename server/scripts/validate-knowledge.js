#!/usr/bin/env node

/**
 * Validate Knowledge Files
 * Validates files before upload to knowledge base
 * 
 * Usage:
 *   node scripts/validate-knowledge.js [path]
 *   npm run validate:knowledge
 */

const path = require('path');
const fs = require('fs').promises;
const glob = require('glob');
const UploadValidator = require('../utils/upload-validator');

async function getAllFiles(directory) {
  return new Promise((resolve, reject) => {
    glob(`${directory}/**/*`, { nodir: true }, (err, files) => {
      if (err) reject(err);
      else resolve(files);
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const targetPath = args[0] || path.join(__dirname, '../knowledge');
  
  console.log(`\n🔍 Validating knowledge base files...`);
  console.log(`📁 Path: ${targetPath}\n`);

  try {
    // Check if path exists
    await fs.access(targetPath);
  } catch (error) {
    console.error(`❌ Error: Path does not exist: ${targetPath}`);
    process.exit(1);
  }

  // Get all files
  const files = await getAllFiles(targetPath);
  console.log(`📊 Found ${files.length} files\n`);

  if (files.length === 0) {
    console.log('⚠️  No files found to validate');
    process.exit(0);
  }

  // Create validator
  const validator = new UploadValidator({ verbose: true });

  // Validate all files
  const results = await validator.validateFiles(files);

  // Print report
  validator.printReport(results);

  // Exit with appropriate code
  if (results.summary.status === 'FAILED') {
    process.exit(1);
  } else if (results.summary.status === 'WARNING') {
    process.exit(0); // Warnings don't block upload
  } else {
    process.exit(0);
  }
}

main().catch(error => {
  console.error('\n❌ Validation failed:', error.message);
  process.exit(1);
});
