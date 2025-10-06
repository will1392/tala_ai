#!/usr/bin/env node

/**
 * Production Knowledge Base Upload Script
 * 
 * Features:
 * - Pre-upload validation with duplicate detection
 * - Concurrent upload with progress tracking
 * - Batch tracking for monitoring and rollback
 * - Automatic retry on failures
 * - Beautiful terminal output with progress bars
 * 
 * Usage:
 *   node scripts/upload-knowledge.js --path ./knowledge/visa --category visa
 *   npm run upload:knowledge -- --path ./knowledge --batch-size 10
 */

const path = require('path');
const fs = require('fs').promises;
const FormData = require('form-data');
const fetch = require('node-fetch');
const chalk = require('chalk');
const { promisify } = require('util');
const glob = promisify(require('glob'));
const UploadValidator = require('../utils/upload-validator');
const BatchTracker = require('../utils/batch-tracker');
require('dotenv').config();

// Configuration
const API_URL = process.env.VITE_API_URL || 'http://localhost:3001';
const DEFAULT_USER_ID = 'admin-1';
const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_CONCURRENT = 3;
const DEFAULT_RETRY_ATTEMPTS = 3;

class KnowledgeUploader {
  constructor(options = {}) {
    this.options = {
      path: options.path || path.join(__dirname, '../knowledge'),
      category: options.category,
      batchSize: options.batchSize || DEFAULT_BATCH_SIZE,
      concurrent: options.concurrent || DEFAULT_CONCURRENT,
      skipDuplicates: options.skipDuplicates || false,
      dryRun: options.dryRun || false,
      verbose: options.verbose || false,
      retryAttempts: options.retryAttempts || DEFAULT_RETRY_ATTEMPTS,
      primaryFolderId: options.primaryFolderId,
      folderId: options.folderId,
    };

    this.validator = new UploadValidator({ verbose: this.options.verbose });
    this.batchTracker = new BatchTracker();
    this.stats = {
      total: 0,
      uploaded: 0,
      processed: 0,
      failed: 0,
      skipped: 0,
      startTime: null,
      endTime: null,
    };
    this.batchId = null;
    this.uploadQueue = [];
    this.failedFiles = [];
  }

  log(message, type = 'info') {
    if (!this.options.verbose && type === 'debug') return;

    const symbols = {
      info: chalk.blue('ℹ'),
      success: chalk.green('✓'),
      error: chalk.red('✗'),
      warning: chalk.yellow('⚠'),
      debug: chalk.gray('•'),
    };

    console.log(`${symbols[type] || '•'} ${message}`);
  }

  async getFiles() {
    this.log('Scanning for files...');
    
    const pattern = `${this.options.path}/**/*.*`;
    const files = await glob(pattern, { nodir: true });
    
    this.log(`Found ${chalk.bold(files.length)} files`, 'success');
    return files;
  }

  async validateFiles(files) {
    this.log('\n📋 Phase 1: Validation\n');
    
    const results = await this.validator.validateFiles(files);
    
    if (this.options.verbose) {
      this.validator.printReport(results);
    } else {
      // Condensed summary
      console.log(`   ${chalk.green('✓')} Valid: ${results.summary.validFiles}`);
      console.log(`   ${chalk.yellow('⚠')} Duplicates: ${results.summary.duplicates}`);
      console.log(`   ${chalk.red('✗')} Invalid: ${results.summary.invalidFiles}`);
    }

    if (results.summary.status === 'FAILED') {
      throw new Error('Validation failed - please fix errors before uploading');
    }

    return results;
  }

  async createBatch(totalFiles) {
    const metadata = {
      source: 'upload-script',
      path: this.options.path,
      category: this.options.category,
      totalFiles,
      options: this.options,
    };

    const batch = await this.batchTracker.createBatch(metadata);
    this.batchId = batch.id;
    
    this.log(`\n📦 Created batch: ${chalk.cyan(this.batchId)}`, 'success');
    return batch;
  }

  async uploadFile(filePath, retryCount = 0) {
    try {
      const formData = new FormData();
      const fileBuffer = await fs.readFile(filePath);
      const fileName = path.basename(filePath);

      formData.append('document', fileBuffer, {
        filename: fileName,
        contentType: this.getContentType(fileName),
      });

      formData.append('userId', DEFAULT_USER_ID);
      formData.append('isAdmin', 'true');
      
      if (this.options.category) {
        formData.append('category', this.options.category);
      }
      
      if (this.options.primaryFolderId) {
        formData.append('primaryFolderId', this.options.primaryFolderId);
      }
      
      if (this.options.folderId) {
        formData.append('folderId', this.options.folderId);
      }

      // Add batch ID to metadata
      formData.append('metadata', JSON.stringify({ 
        batch_id: this.batchId,
        original_path: filePath,
      }));

      const response = await fetch(`${API_URL}/api/documents/upload`, {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        filePath,
        documentId: result.documentId,
        chunksStored: result.chunksStored,
      };

    } catch (error) {
      // Retry logic
      if (retryCount < this.options.retryAttempts) {
        this.log(`Retry ${retryCount + 1}/${this.options.retryAttempts}: ${path.basename(filePath)}`, 'warning');
        await this.sleep(1000 * (retryCount + 1)); // Exponential backoff
        return this.uploadFile(filePath, retryCount + 1);
      }

      return {
        success: false,
        filePath,
        error: error.message,
      };
    }
  }

  async uploadBatch(files, startIdx) {
    const batch = files.slice(startIdx, startIdx + this.options.batchSize);
    const promises = [];

    for (const file of batch) {
      promises.push(this.uploadFile(file));
      
      // Respect concurrent limit
      if (promises.length >= this.options.concurrent) {
        const results = await Promise.all(promises);
        this.processResults(results);
        promises.length = 0;
      }
    }

    // Upload remaining
    if (promises.length > 0) {
      const results = await Promise.all(promises);
      this.processResults(results);
    }
  }

  processResults(results) {
    for (const result of results) {
      if (result.success) {
        this.stats.uploaded++;
        this.stats.processed++;
        this.updateProgress();
      } else {
        this.stats.failed++;
        this.failedFiles.push(result);
        this.log(`Failed: ${path.basename(result.filePath)} - ${result.error}`, 'error');
      }
    }
  }

  updateProgress() {
    const completed = this.stats.uploaded + this.stats.failed + this.stats.skipped;
    const percentage = ((completed / this.stats.total) * 100).toFixed(1);
    
    // Simple progress bar
    const barLength = 40;
    const filled = Math.round((completed / this.stats.total) * barLength);
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
    
    process.stdout.write(`\r   ${bar} ${percentage}% (${completed}/${this.stats.total})`);
    
    if (completed === this.stats.total) {
      process.stdout.write('\n');
    }
  }

  async upload() {
    this.stats.startTime = Date.now();

    // Get files
    const allFiles = await this.getFiles();
    
    if (allFiles.length === 0) {
      this.log('No files found to upload', 'warning');
      return;
    }

    // Validate files
    const validationResults = await this.validateFiles(allFiles);
    
    // Filter out invalid and duplicates if needed
    let filesToUpload = validationResults.files
      .filter(f => f.valid)
      .map(f => f.filePath);

    if (this.options.skipDuplicates) {
      const duplicates = validationResults.files.filter(f => f.warnings.some(w => w.includes('duplicate')));
      filesToUpload = filesToUpload.filter(f => !duplicates.find(d => d.filePath === f));
      this.stats.skipped = duplicates.length;
    }

    this.stats.total = filesToUpload.length;

    if (this.options.dryRun) {
      this.log('\n🔍 Dry run - no files will be uploaded', 'info');
      this.log(`\nWould upload ${this.stats.total} files`, 'info');
      return;
    }

    // Create batch
    await this.createBatch(this.stats.total);

    // Upload files
    this.log('\n⬆️  Phase 2: Upload\n');
    
    for (let i = 0; i < filesToUpload.length; i += this.options.batchSize) {
      await this.uploadBatch(filesToUpload, i);
      
      // Update batch progress
      await this.batchTracker.updateBatch(this.batchId, {
        uploaded_files: this.stats.uploaded,
        processed_files: this.stats.processed,
        failed_files: this.stats.failed,
      });
    }

    this.stats.endTime = Date.now();
    await this.printSummary();
  }

  async printSummary() {
    const duration = ((this.stats.endTime - this.stats.startTime) / 1000).toFixed(1);
    const batchStats = await this.batchTracker.getBatchStats(this.batchId);

    console.log('\n' + '='.repeat(60));
    console.log(chalk.bold('\n📊 Upload Summary\n'));
    
    console.log(`   ${chalk.green('✓')} Uploaded: ${this.stats.uploaded}`);
    console.log(`   ${chalk.red('✗')} Failed: ${this.stats.failed}`);
    console.log(`   ${chalk.yellow('⏭')} Skipped: ${this.stats.skipped}`);
    console.log(`   ${chalk.blue('⏱')} Duration: ${duration}s`);
    console.log(`   ${chalk.cyan('📦')} Batch ID: ${this.batchId}`);

    if (batchStats) {
      console.log(`\n   Status: ${batchStats.status}`);
      console.log(`   Progress: ${batchStats.processed_files}/${batchStats.total_files} processed`);
    }

    if (this.failedFiles.length > 0) {
      console.log(chalk.red('\n❌ Failed Files:'));
      this.failedFiles.forEach(f => {
        console.log(`   • ${path.basename(f.filePath)}: ${f.error}`);
      });
    }

    console.log('\n💡 Next steps:');
    console.log(`   • Monitor batch: npm run watch:upload -- ${this.batchId}`);
    console.log(`   • Check system: npm run check:knowledge-system`);
    if (this.stats.failed > 0) {
      console.log(`   • Retry failed: node scripts/upload-knowledge.js --retry-batch ${this.batchId}`);
    }
    console.log('');
  }

  getContentType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const types = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls': 'application/vnd.ms-excel',
    };
    return types[ext] || 'application/octet-stream';
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--path':
        options.path = args[++i];
        break;
      case '--category':
        options.category = args[++i];
        break;
      case '--batch-size':
        options.batchSize = parseInt(args[++i], 10);
        break;
      case '--concurrent':
        options.concurrent = parseInt(args[++i], 10);
        break;
      case '--skip-duplicates':
        options.skipDuplicates = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--primary-folder':
        options.primaryFolderId = args[++i];
        break;
      case '--folder':
        options.folderId = args[++i];
        break;
      case '--help':
      case '-h':
        console.log(`
${chalk.bold('Knowledge Base Upload Script')}

${chalk.cyan('Usage:')}
  node scripts/upload-knowledge.js [options]

${chalk.cyan('Options:')}
  --path <path>           Path to documents (default: ./knowledge)
  --category <category>   Category for all documents
  --batch-size <number>   Documents per batch (default: 10)
  --concurrent <number>   Concurrent uploads (default: 3)
  --skip-duplicates       Skip files with duplicate content
  --dry-run               Validate without uploading
  --verbose, -v           Show detailed logs
  --primary-folder <id>   Primary folder ID
  --folder <id>           Subfolder ID
  --help, -h              Show this help

${chalk.cyan('Examples:')}
  npm run upload:knowledge -- --path ./knowledge/visa --category visa
  node scripts/upload-knowledge.js --path ./docs --batch-size 20 --concurrent 5
  node scripts/upload-knowledge.js --dry-run --verbose
        `);
        process.exit(0);
    }
  }

  const uploader = new KnowledgeUploader(options);
  
  try {
    await uploader.upload();
  } catch (error) {
    console.error(chalk.red('\n❌ Upload failed:'), error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = KnowledgeUploader;
