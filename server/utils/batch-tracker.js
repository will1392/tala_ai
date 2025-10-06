/**
 * Batch Tracker
 * Tracks upload batches for monitoring, rollback, and analytics
 */

const { Pool } = require('pg');
const crypto = require('crypto');

class BatchTracker {
  constructor(dbPool) {
    this.pool = dbPool;
  }

  /**
   * Create a new upload batch
   */
  async createBatch(metadata = {}) {
    const batchId = this.generateBatchId();
    
    const query = `
      INSERT INTO upload_batches (
        id,
        status,
        total_files,
        uploaded_files,
        processed_files,
        failed_files,
        total_size_bytes,
        category,
        folder_path,
        metadata,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      batchId,
      'initializing',
      metadata.totalFiles || 0,
      0,
      0,
      0,
      metadata.totalSize || 0,
      metadata.category || null,
      metadata.folderPath || null,
      JSON.stringify(metadata)
    ];

    try {
      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating batch:', error);
      throw error;
    }
  }

  /**
   * Update batch progress
   */
  async updateBatch(batchId, updates) {
    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    // Build dynamic SET clause
    const allowedFields = [
      'status',
      'uploaded_files',
      'processed_files',
      'failed_files',
      'error_details',
      'completed_at'
    ];

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = $${paramIndex}`);
        values.push(updates[key]);
        paramIndex++;
      }
    });

    if (setClauses.length === 0) {
      return null;
    }

    // Always update updated_at
    setClauses.push(`updated_at = NOW()`);

    const query = `
      UPDATE upload_batches
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    values.push(batchId);

    try {
      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating batch:', error);
      throw error;
    }
  }

  /**
   * Get batch status
   */
  async getBatch(batchId) {
    const query = `
      SELECT * FROM upload_batches
      WHERE id = $1
    `;

    try {
      const result = await this.pool.query(query, [batchId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting batch:', error);
      throw error;
    }
  }

  /**
   * List recent batches
   */
  async listBatches(options = {}) {
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    const status = options.status;

    let query = `
      SELECT
        id,
        status,
        total_files,
        uploaded_files,
        processed_files,
        failed_files,
        total_size_bytes,
        category,
        folder_path,
        created_at,
        updated_at,
        completed_at
      FROM upload_batches
    `;

    const values = [];
    const conditions = [];

    if (status) {
      conditions.push(`status = $${values.length + 1}`);
      values.push(status);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);

    try {
      const result = await this.pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Error listing batches:', error);
      throw error;
    }
  }

  /**
   * Get batch statistics
   */
  async getBatchStats(batchId) {
    const batch = await this.getBatch(batchId);
    if (!batch) {
      return null;
    }

    const stats = {
      batchId: batch.id,
      status: batch.status,
      progress: {
        total: batch.total_files,
        uploaded: batch.uploaded_files,
        processed: batch.processed_files,
        failed: batch.failed_files,
        uploadPercentage: this.calculatePercentage(batch.uploaded_files, batch.total_files),
        processPercentage: this.calculatePercentage(batch.processed_files, batch.total_files)
      },
      size: {
        total: batch.total_size_bytes,
        formatted: this.formatSize(batch.total_size_bytes)
      },
      timing: {
        started: batch.created_at,
        updated: batch.updated_at,
        completed: batch.completed_at,
        duration: batch.completed_at
          ? this.calculateDuration(batch.created_at, batch.completed_at)
          : this.calculateDuration(batch.created_at, new Date())
      },
      category: batch.category,
      folderPath: batch.folder_path
    };

    return stats;
  }

  /**
   * Mark batch as complete
   */
  async completeBatch(batchId, status = 'completed') {
    return this.updateBatch(batchId, {
      status,
      completed_at: new Date()
    });
  }

  /**
   * Mark batch as failed
   */
  async failBatch(batchId, errorDetails) {
    return this.updateBatch(batchId, {
      status: 'failed',
      error_details: JSON.stringify(errorDetails),
      completed_at: new Date()
    });
  }

  /**
   * Get documents in batch
   */
  async getBatchDocuments(batchId) {
    const query = `
      SELECT
        id,
        title,
        file_name,
        file_type,
        file_size,
        status,
        created_at
      FROM documents
      WHERE metadata->>'batch_id' = $1
      ORDER BY created_at ASC
    `;

    try {
      const result = await this.pool.query(query, [batchId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting batch documents:', error);
      throw error;
    }
  }

  /**
   * Delete batch and associated documents
   */
  async deleteBatch(batchId, options = {}) {
    const deleteDocuments = options.deleteDocuments !== false;

    try {
      // Start transaction
      await this.pool.query('BEGIN');

      if (deleteDocuments) {
        // Get document IDs
        const docs = await this.getBatchDocuments(batchId);
        const documentIds = docs.map(d => d.id);

        if (documentIds.length > 0) {
          // Soft delete documents
          const deleteDocsQuery = `
            UPDATE documents
            SET deleted_at = NOW()
            WHERE id = ANY($1)
          `;
          await this.pool.query(deleteDocsQuery, [documentIds]);
        }
      }

      // Delete batch record
      const deleteBatchQuery = `
        DELETE FROM upload_batches
        WHERE id = $1
      `;
      await this.pool.query(deleteBatchQuery, [batchId]);

      await this.pool.query('COMMIT');

      return {
        success: true,
        batchId,
        documentsDeleted: deleteDocuments
      };
    } catch (error) {
      await this.pool.query('ROLLBACK');
      console.error('Error deleting batch:', error);
      throw error;
    }
  }

  /**
   * Generate unique batch ID
   */
  generateBatchId() {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '_');
    const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '');
    const random = crypto.randomBytes(4).toString('hex');
    
    return `batch_${dateStr}_${timeStr}_${random}`;
  }

  /**
   * Calculate percentage
   */
  calculatePercentage(value, total) {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  }

  /**
   * Format size
   */
  formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Calculate duration
   */
  calculateDuration(start, end) {
    const duration = new Date(end) - new Date(start);
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Print batch status
   */
  async printBatchStatus(batchId) {
    const stats = await this.getBatchStats(batchId);
    if (!stats) {
      console.log(`❌ Batch not found: ${batchId}`);
      return;
    }

    console.log('\n📦 Batch Status\n');
    console.log('═'.repeat(60));
    console.log(`\nBatch ID: ${stats.batchId}`);
    console.log(`Status: ${this.getStatusIcon(stats.status)} ${stats.status.toUpperCase()}`);
    console.log(`Category: ${stats.category || 'N/A'}`);
    console.log(`Folder: ${stats.folderPath || 'N/A'}`);
    
    console.log(`\n📊 Progress:`);
    console.log(`   Total files: ${stats.progress.total}`);
    console.log(`   Uploaded: ${stats.progress.uploaded} (${stats.progress.uploadPercentage}%)`);
    console.log(`   Processed: ${stats.progress.processed} (${stats.progress.processPercentage}%)`);
    console.log(`   Failed: ${stats.progress.failed}`);
    
    console.log(`\n💾 Size:`);
    console.log(`   Total: ${stats.size.formatted}`);
    
    console.log(`\n⏱️  Timing:`);
    console.log(`   Started: ${stats.timing.started}`);
    console.log(`   Duration: ${stats.timing.duration}`);
    if (stats.timing.completed) {
      console.log(`   Completed: ${stats.timing.completed}`);
    }
    
    console.log('\n');
  }

  /**
   * Get status icon
   */
  getStatusIcon(status) {
    const icons = {
      'initializing': '🔄',
      'uploading': '⬆️',
      'processing': '⚙️',
      'completed': '✅',
      'failed': '❌',
      'partial_failure': '⚠️'
    };
    return icons[status] || '❓';
  }
}

module.exports = BatchTracker;
