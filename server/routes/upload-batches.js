/**
 * Upload Batch Monitoring Routes
 * 
 * Read-only endpoints for monitoring mass upload batches.
 * Safe to add - does not modify any existing functionality.
 */

import express from 'express';
import pg from 'pg';
import { getSupabaseService } from '../db/supabaseClient.js';

const { Pool } = pg;
const router = express.Router();

// Database connection
const getPool = async () => {
  // Use Supabase service client
  const supabase = getSupabaseService();
  if (supabase) {
    return supabase;
  }

  // Fallback to direct PostgreSQL if configured
  if (process.env.DATABASE_URL) {
    return new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  throw new Error('No database connection configured');
};

/**
 * GET /api/upload-batches
 * List all upload batches with pagination
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status;

    const supabase = await getPool();
    
    // Build query
    let query = supabase
      .from('upload_batches')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      batches: data || [],
      total: count || 0,
      limit,
      offset,
    });

  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch batches',
      message: error.message,
    });
  }
});

/**
 * GET /api/upload-batches/:batchId
 * Get details of a specific batch
 */
router.get('/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    const supabase = await getPool();

    const { data, error } = await supabase
      .from('upload_batches')
      .select('*')
      .eq('id', batchId)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found',
      });
    }

    res.json({
      success: true,
      batch: data,
    });

  } catch (error) {
    console.error('Error fetching batch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch batch',
      message: error.message,
    });
  }
});

/**
 * GET /api/upload-batches/:batchId/documents
 * Get all documents in a batch
 */
router.get('/:batchId/documents', async (req, res) => {
  try {
    const { batchId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const supabase = await getPool();

    const { data, error, count } = await supabase
      .from('documents')
      .select('id, title, file_name, file_type, file_size, status, category, metadata, created_at, updated_at', { count: 'exact' })
      .contains('metadata', { batch_id: batchId })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      documents: data || [],
      total: count || 0,
      limit,
      offset,
    });

  } catch (error) {
    console.error('Error fetching batch documents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch batch documents',
      message: error.message,
    });
  }
});

/**
 * GET /api/upload-batches/:batchId/stats
 * Get detailed statistics for a batch
 */
router.get('/:batchId/stats', async (req, res) => {
  try {
    const { batchId } = req.params;
    const supabase = await getPool();

    // Get batch info
    const { data: batch, error: batchError } = await supabase
      .from('upload_batches')
      .select('*')
      .eq('id', batchId)
      .single();

    if (batchError || !batch) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found',
      });
    }

    // Get document count by status (Supabase doesn't support GROUP BY in same way, so we'll query all docs)
    const { data: documents } = await supabase
      .from('documents')
      .select('status')
      .contains('metadata', { batch_id: batchId });

    // Calculate status breakdown
    const statusBreakdown = {};
    if (documents) {
      documents.forEach(doc => {
        statusBreakdown[doc.status] = (statusBreakdown[doc.status] || 0) + 1;
      });
    }

    // Calculate progress
    const progress = {
      total: batch.total_files,
      uploaded: batch.uploaded_files,
      processed: batch.processed_files,
      failed: batch.failed_files,
      uploadProgress: batch.total_files > 0 
        ? ((batch.uploaded_files / batch.total_files) * 100).toFixed(1)
        : 0,
      processingProgress: batch.uploaded_files > 0
        ? ((batch.processed_files / batch.uploaded_files) * 100).toFixed(1)
        : 0,
    };

    // Calculate duration
    const createdAt = new Date(batch.created_at);
    const endTime = batch.completed_at ? new Date(batch.completed_at) : new Date();
    const durationMs = endTime - createdAt;
    const durationSeconds = (durationMs / 1000).toFixed(1);

    res.json({
      success: true,
      stats: {
        batch: {
          id: batch.id,
          status: batch.status,
          category: batch.category,
          folder_path: batch.folder_path,
          created_at: batch.created_at,
          updated_at: batch.updated_at,
          completed_at: batch.completed_at,
          duration_seconds: durationSeconds,
        },
        progress,
        statusBreakdown,
        totalSize: batch.total_size_bytes,
        metadata: batch.metadata,
      },
    });

  } catch (error) {
    console.error('Error fetching batch stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch batch stats',
      message: error.message,
    });
  }
});

/**
 * GET /api/upload-batches/stats/summary
 * Get overall upload statistics
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const supabase = await getPool();

    // Get all batches for statistics
    const { data: allBatches } = await supabase
      .from('upload_batches')
      .select('*');

    // Calculate summary statistics
    const summary = {
      total_batches: allBatches?.length || 0,
      completed_batches: allBatches?.filter(b => b.status === 'completed').length || 0,
      failed_batches: allBatches?.filter(b => b.status === 'failed').length || 0,
      partial_failures: allBatches?.filter(b => b.status === 'partial_failure').length || 0,
      total_files_all_batches: allBatches?.reduce((sum, b) => sum + (b.total_files || 0), 0) || 0,
      total_processed_files: allBatches?.reduce((sum, b) => sum + (b.processed_files || 0), 0) || 0,
      total_failed_files: allBatches?.reduce((sum, b) => sum + (b.failed_files || 0), 0) || 0,
      total_size_bytes: allBatches?.reduce((sum, b) => sum + (b.total_size_bytes || 0), 0) || 0,
    };

    // Get recent batches
    const { data: recentBatches } = await supabase
      .from('upload_batches')
      .select('id, status, total_files, processed_files, failed_files, created_at, completed_at')
      .order('created_at', { ascending: false })
      .limit(10);

    res.json({
      success: true,
      summary,
      recentBatches: recentBatches || [],
    });

  } catch (error) {
    console.error('Error fetching summary stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch summary statistics',
      message: error.message,
    });
  }
});

export default router;
