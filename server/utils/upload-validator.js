/**
 * Upload Validator
 * Validates files before knowledge base upload
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Supported file types and size limits
const FILE_LIMITS = {
  '.pdf': 500 * 1024 * 1024,    // 500 MB
  '.doc': 500 * 1024 * 1024,     // 500 MB
  '.docx': 500 * 1024 * 1024,    // 500 MB
  '.txt': 100 * 1024 * 1024,     // 100 MB
  '.md': 100 * 1024 * 1024,      // 100 MB
  '.xls': 100 * 1024 * 1024,     // 100 MB
  '.xlsx': 100 * 1024 * 1024,    // 100 MB
  '.ppt': 200 * 1024 * 1024,     // 200 MB
  '.pptx': 200 * 1024 * 1024,    // 200 MB
  '.jpg': 50 * 1024 * 1024,      // 50 MB
  '.jpeg': 50 * 1024 * 1024,     // 50 MB
  '.png': 50 * 1024 * 1024       // 50 MB
};

class UploadValidator {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.fileHashes = new Map();
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Validate a single file
   */
  async validateFile(filePath) {
    const result = {
      filePath,
      valid: true,
      errors: [],
      warnings: [],
      metadata: {}
    };

    try {
      // Check file exists
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        result.valid = false;
        result.errors.push('Not a regular file');
        return result;
      }

      result.metadata.size = stats.size;
      result.metadata.modified = stats.mtime;

      // Check file extension
      const ext = path.extname(filePath).toLowerCase();
      if (!FILE_LIMITS[ext]) {
        result.valid = false;
        result.errors.push(`Unsupported file type: ${ext}`);
        return result;
      }

      // Check file size
      const maxSize = FILE_LIMITS[ext];
      if (stats.size > maxSize) {
        result.valid = false;
        result.errors.push(
          `File too large: ${this.formatSize(stats.size)} (max ${this.formatSize(maxSize)})`
        );
        return result;
      }

      // Check if file is empty
      if (stats.size === 0) {
        result.valid = false;
        result.errors.push('File is empty');
        return result;
      }

      // Check file is readable
      try {
        await fs.access(filePath, fs.constants.R_OK);
      } catch (error) {
        result.valid = false;
        result.errors.push('File is not readable');
        return result;
      }

      // Calculate file hash for duplicate detection
      result.metadata.hash = await this.calculateHash(filePath);

      // Check naming convention
      const filename = path.basename(filePath);
      if (!this.isValidFilename(filename)) {
        result.warnings.push(
          'Filename should use lowercase with hyphens (e.g., visa-requirements-2024.pdf)'
        );
      }

      // Verify file integrity for PDFs
      if (ext === '.pdf') {
        const isValid = await this.validatePDF(filePath);
        if (!isValid) {
          result.valid = false;
          result.errors.push('PDF file appears to be corrupted');
        }
      }

    } catch (error) {
      result.valid = false;
      result.errors.push(`Validation error: ${error.message}`);
    }

    return result;
  }

  /**
   * Validate multiple files
   */
  async validateFiles(filePaths) {
    const results = {
      total: filePaths.length,
      valid: 0,
      invalid: 0,
      duplicates: 0,
      totalSize: 0,
      files: [],
      duplicateSets: [],
      summary: {}
    };

    // Validate each file
    for (const filePath of filePaths) {
      const result = await this.validateFile(filePath);
      results.files.push(result);

      if (result.valid) {
        results.valid++;
        results.totalSize += result.metadata.size;

        // Track hash for duplicate detection
        const hash = result.metadata.hash;
        if (this.fileHashes.has(hash)) {
          this.fileHashes.get(hash).push(filePath);
        } else {
          this.fileHashes.set(hash, [filePath]);
        }
      } else {
        results.invalid++;
      }
    }

    // Find duplicates
    this.fileHashes.forEach((paths, hash) => {
      if (paths.length > 1) {
        results.duplicates += paths.length - 1;
        results.duplicateSets.push({
          hash,
          files: paths,
          count: paths.length
        });
      }
    });

    // Generate summary
    results.summary = this.generateSummary(results);

    return results;
  }

  /**
   * Calculate file hash for duplicate detection
   */
  async calculateHash(filePath) {
    const hash = crypto.createHash('sha256');
    const stream = require('fs').createReadStream(filePath);
    
    return new Promise((resolve, reject) => {
      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Validate filename convention
   */
  isValidFilename(filename) {
    // Check for lowercase with hyphens
    const nameWithoutExt = path.basename(filename, path.extname(filename));
    
    // Allow lowercase letters, numbers, hyphens, and underscores
    const validPattern = /^[a-z0-9_-]+$/;
    
    return validPattern.test(nameWithoutExt);
  }

  /**
   * Validate PDF file integrity
   */
  async validatePDF(filePath) {
    try {
      const buffer = await fs.readFile(filePath);
      
      // Check PDF header
      const header = buffer.slice(0, 5).toString();
      if (!header.startsWith('%PDF-')) {
        return false;
      }

      // Check for EOF marker
      const lastBytes = buffer.slice(-1024).toString();
      if (!lastBytes.includes('%%EOF')) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Format file size for display
   */
  formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Generate validation summary
   */
  generateSummary(results) {
    const summary = {
      status: 'PASSED',
      message: '',
      recommendations: []
    };

    if (results.invalid > 0) {
      summary.status = 'FAILED';
      summary.message = `${results.invalid} file(s) failed validation`;
      summary.recommendations.push('Fix or remove invalid files before uploading');
    } else if (results.duplicates > 0) {
      summary.status = 'WARNING';
      summary.message = `Found ${results.duplicates} duplicate file(s)`;
      summary.recommendations.push('Remove duplicates to save storage space');
    } else {
      summary.status = 'PASSED';
      summary.message = `All ${results.valid} file(s) are valid`;
    }

    // Add size recommendation
    if (results.totalSize > 5 * 1024 * 1024 * 1024) { // > 5GB
      summary.recommendations.push(
        'Large upload detected. Consider using --batch-size to avoid memory issues'
      );
    }

    return summary;
  }

  /**
   * Print validation report
   */
  printReport(results) {
    console.log('\n🔍 Validation Report\n');
    console.log('═'.repeat(60));
    
    // Summary
    console.log(`\n📊 Summary:`);
    console.log(`   Total files: ${results.total}`);
    console.log(`   ✅ Valid: ${results.valid}`);
    console.log(`   ❌ Invalid: ${results.invalid}`);
    console.log(`   🔁 Duplicates: ${results.duplicates}`);
    console.log(`   💾 Total size: ${this.formatSize(results.totalSize)}`);

    // Invalid files
    if (results.invalid > 0) {
      console.log(`\n❌ Invalid Files (${results.invalid}):`);
      results.files
        .filter(f => !f.valid)
        .forEach(file => {
          console.log(`\n   ${path.basename(file.filePath)}`);
          file.errors.forEach(err => console.log(`      ❌ ${err}`));
        });
    }

    // Duplicates
    if (results.duplicateSets.length > 0) {
      console.log(`\n🔁 Duplicate Sets (${results.duplicateSets.length}):`);
      results.duplicateSets.forEach((set, index) => {
        console.log(`\n   ${index + 1}. ${set.count} copies:`);
        set.files.forEach((file, i) => {
          const marker = i === 0 ? '✅' : '❌';
          console.log(`      ${marker} ${path.basename(file)}`);
        });
      });
    }

    // Warnings
    const filesWithWarnings = results.files.filter(f => f.warnings.length > 0);
    if (filesWithWarnings.length > 0) {
      console.log(`\n⚠️  Warnings:`);
      filesWithWarnings.forEach(file => {
        console.log(`\n   ${path.basename(file.filePath)}`);
        file.warnings.forEach(warn => console.log(`      ⚠️  ${warn}`));
      });
    }

    // Summary status
    console.log('\n' + '═'.repeat(60));
    const statusIcon = {
      'PASSED': '✅',
      'WARNING': '⚠️',
      'FAILED': '❌'
    }[results.summary.status];
    
    console.log(`\n${statusIcon} Status: ${results.summary.status}`);
    console.log(`   ${results.summary.message}`);

    if (results.summary.recommendations.length > 0) {
      console.log(`\n💡 Recommendations:`);
      results.summary.recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });
    }

    console.log('\n');
  }
}

module.exports = UploadValidator;
