/**
 * Email Sync Service
 * 
 * Handles email synchronization operations
 */

import { BaseService } from '../db/baseService.js';
import EmailManager from './EmailManager.js';
import { EventEmitter } from 'events';

class EmailSyncService extends BaseService {
  constructor() {
    super('email_sync_status', {
      enableLogging: true
    });

    this.emailManager = EmailManager;
    this.eventEmitter = new EventEmitter();
    this.activeSyncs = new Map();
    
    // Sync configuration
    this.config = {
      batchSize: 50,
      maxConcurrentSyncs: 3,
      syncInterval: 300000, // 5 minutes
      maxRetries: 3,
      retryDelay: 60000 // 1 minute
    };

    // Start sync queue processor
    this.startQueueProcessor();
  }

  /**
   * Start initial sync for new email account
   * @param {string} userId - User ID
   * @param {string} email - Email address
   * @param {string} provider - Provider ID
   */
  async startInitialSync(userId, email, provider) {
    try {
      this.log(`Starting initial sync for ${email}`, 'info', { userId, provider });

      // Get email account
      const account = await this.query(`
        SELECT id FROM user_email_accounts 
        WHERE user_id = $1 AND email_address = $2 AND provider = $3
      `, [userId, email, provider]);

      if (account.rows.length === 0) {
        throw new Error('Email account not found');
      }

      const accountId = account.rows[0].id;

      // Create sync status record
      const syncStatus = await this.create({
        user_id: userId,
        email_account_id: accountId,
        sync_status: 'syncing',
        last_sync_start: new Date()
      });

      // Add to sync queue
      await this.addToSyncQueue(userId, accountId, 'initial', 1);

      return { 
        success: true, 
        syncId: syncStatus.id,
        message: 'Initial sync started' 
      };
    } catch (error) {
      this.log('Failed to start initial sync', 'error', { userId, email, error: error.message });
      throw error;
    }
  }

  /**
   * Add sync job to queue
   * @param {string} userId - User ID
   * @param {string} accountId - Email account ID
   * @param {string} syncType - Sync type
   * @param {number} priority - Priority level
   */
  async addToSyncQueue(userId, accountId, syncType, priority = 5) {
    await this.query(`
      INSERT INTO email_sync_queue (
        user_id, email_account_id, sync_type, priority, status
      ) VALUES ($1, $2, $3, $4, 'pending')
      ON CONFLICT (email_account_id) WHERE status = 'pending'
      DO UPDATE SET priority = LEAST(email_sync_queue.priority, $4)
    `, [userId, accountId, syncType, priority]);
  }

  /**
   * Start queue processor
   */
  startQueueProcessor() {
    setInterval(() => {
      this.processQueue().catch(err => {
        this.log('Queue processing error', 'error', { error: err.message });
      });
    }, 10000); // Check every 10 seconds
  }

  /**
   * Process sync queue
   */
  async processQueue() {
    // Skip if at max concurrent syncs
    if (this.activeSyncs.size >= this.config.maxConcurrentSyncs) {
      return;
    }

    // Get next job from queue
    const job = await this.query(`
      UPDATE email_sync_queue
      SET status = 'processing', started_at = NOW()
      WHERE id = (
        SELECT id FROM email_sync_queue
        WHERE status = 'pending' AND attempts < max_attempts
        ORDER BY priority ASC, scheduled_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `);

    if (job.rows.length === 0) {
      return;
    }

    const syncJob = job.rows[0];
    
    // Process sync job
    this.processSyncJob(syncJob).catch(error => {
      this.log('Sync job failed', 'error', { 
        jobId: syncJob.id, 
        error: error.message 
      });
    });
  }

  /**
   * Process individual sync job
   * @param {Object} job - Sync job
   */
  async processSyncJob(job) {
    const syncKey = `${job.user_id}:${job.email_account_id}`;
    this.activeSyncs.set(syncKey, job);

    try {
      // Get account details
      const account = await this.query(`
        SELECT * FROM user_email_accounts WHERE id = $1
      `, [job.email_account_id]);

      if (account.rows.length === 0) {
        throw new Error('Email account not found');
      }

      const accountData = account.rows[0];

      // Update sync status
      await this.updateOne(
        { email_account_id: job.email_account_id },
        { sync_status: 'syncing', last_sync_start: new Date() }
      );

      // Perform sync based on type
      let result;
      switch (job.sync_type) {
        case 'initial':
          result = await this.performInitialSync(job.user_id, accountData);
          break;
        case 'incremental':
          result = await this.performIncrementalSync(job.user_id, accountData);
          break;
        case 'full':
          result = await this.performFullSync(job.user_id, accountData);
          break;
        default:
          throw new Error(`Unknown sync type: ${job.sync_type}`);
      }

      // Update sync status
      await this.updateOne(
        { email_account_id: job.email_account_id },
        {
          sync_status: 'completed',
          last_sync_end: new Date(),
          last_successful_sync: new Date(),
          message_count: result.totalMessages,
          unread_count: result.unreadCount,
          sync_token: result.syncToken,
          last_error: null
        }
      );

      // Mark job as completed
      await this.query(`
        UPDATE email_sync_queue 
        SET status = 'completed', completed_at = NOW()
        WHERE id = $1
      `, [job.id]);

      // Emit success event
      this.eventEmitter.emit('sync:completed', {
        userId: job.user_id,
        accountId: job.email_account_id,
        result
      });

      this.log('Sync completed successfully', 'info', {
        jobId: job.id,
        messagesProcessed: result.processedCount
      });

    } catch (error) {
      // Update error status
      await this.updateOne(
        { email_account_id: job.email_account_id },
        {
          sync_status: 'failed',
          last_sync_end: new Date(),
          last_error: error.message
        }
      );

      // Update job with error
      await this.query(`
        UPDATE email_sync_queue 
        SET status = 'failed', 
            attempts = attempts + 1,
            error_message = $2,
            scheduled_at = NOW() + INTERVAL '${this.config.retryDelay / 1000} seconds'
        WHERE id = $1
      `, [job.id, error.message]);

      // Emit error event
      this.eventEmitter.emit('sync:failed', {
        userId: job.user_id,
        accountId: job.email_account_id,
        error: error.message
      });

      throw error;
    } finally {
      this.activeSyncs.delete(syncKey);
    }
  }

  /**
   * Perform initial sync
   * @param {string} userId - User ID
   * @param {Object} account - Account data
   * @returns {Object} Sync result
   */
  async performInitialSync(userId, account) {
    const { email_address: email, provider } = account;
    let processedCount = 0;
    let totalMessages = 0;
    let unreadCount = 0;
    let pageToken = null;

    this.log(`Performing initial sync for ${email}`, 'info');

    do {
      // Fetch batch of messages
      const inbox = await this.emailManager.fetchInbox(userId, provider, email, {
        maxResults: this.config.batchSize,
        pageToken,
        query: 'in:inbox'
      });

      totalMessages = inbox.resultSizeEstimate || totalMessages;
      
      // Process messages
      for (const message of inbox.messages) {
        await this.processMessage(userId, account.id, provider, email, message);
        processedCount++;
        
        if (message.isUnread) {
          unreadCount++;
        }
      }

      pageToken = inbox.nextPageToken;

      // Emit progress
      this.eventEmitter.emit('sync:progress', {
        userId,
        accountId: account.id,
        processed: processedCount,
        total: totalMessages
      });

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } while (pageToken && processedCount < 500); // Limit initial sync

    return {
      processedCount,
      totalMessages,
      unreadCount,
      syncToken: pageToken
    };
  }

  /**
   * Perform incremental sync
   * @param {string} userId - User ID
   * @param {Object} account - Account data
   * @returns {Object} Sync result
   */
  async performIncrementalSync(userId, account) {
    const { email_address: email, provider } = account;
    
    // Get last sync token
    const syncStatus = await this.findOne({ email_account_id: account.id });
    const lastSyncTime = syncStatus?.last_successful_sync || new Date(0);
    
    // Build query for new messages
    const query = `in:inbox after:${Math.floor(lastSyncTime.getTime() / 1000)}`;
    
    const inbox = await this.emailManager.fetchInbox(userId, provider, email, {
      maxResults: this.config.batchSize,
      query
    });

    let processedCount = 0;
    let unreadCount = 0;

    for (const message of inbox.messages) {
      await this.processMessage(userId, account.id, provider, email, message);
      processedCount++;
      
      if (message.isUnread) {
        unreadCount++;
      }
    }

    // Get total counts
    const counts = await this.getMessageCounts(userId, provider, email);

    return {
      processedCount,
      totalMessages: counts.total,
      unreadCount: counts.unread,
      syncToken: inbox.nextPageToken
    };
  }

  /**
   * Perform full sync
   * @param {string} userId - User ID
   * @param {Object} account - Account data
   * @returns {Object} Sync result
   */
  async performFullSync(userId, account) {
    // Mark all existing as potentially deleted
    await this.query(`
      UPDATE analyzed_emails 
      SET metadata = jsonb_set(metadata, '{potentially_deleted}', 'true')
      WHERE user_id = $1 AND email_address = $2
    `, [userId, account.email_address]);

    // Perform initial sync logic
    const result = await this.performInitialSync(userId, account);

    // Remove emails that weren't found in sync
    await this.query(`
      DELETE FROM analyzed_emails 
      WHERE user_id = $1 
        AND email_address = $2 
        AND metadata->>'potentially_deleted' = 'true'
    `, [userId, account.email_address]);

    return result;
  }

  /**
   * Process individual message
   * @param {string} userId - User ID
   * @param {string} accountId - Account ID
   * @param {string} provider - Provider
   * @param {string} email - Email address
   * @param {Object} message - Message data
   */
  async processMessage(userId, accountId, provider, email, message) {
    try {
      // Check if already processed
      const existing = await this.query(`
        SELECT id FROM analyzed_emails 
        WHERE user_id = $1 AND email_id = $2 AND provider = $3
      `, [userId, message.id, provider]);

      if (existing.rows.length > 0) {
        // Update metadata
        await this.query(`
          UPDATE analyzed_emails 
          SET metadata = jsonb_set(metadata, '{potentially_deleted}', 'false')
          WHERE id = $1
        `, [existing.rows[0].id]);
        return;
      }

      // Store basic message info
      await this.query(`
        INSERT INTO analyzed_emails (
          user_id, email_account_id, email_id, provider, email_address,
          thread_id, subject, from_email, date_received,
          has_attachments, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (user_id, email_id, provider) DO UPDATE
        SET metadata = jsonb_set(analyzed_emails.metadata, '{potentially_deleted}', 'false')
      `, [
        userId, accountId, message.id, provider, email,
        message.threadId, message.subject, message.from, new Date(message.date),
        message.hasAttachments, { 
          snippet: message.snippet,
          labels: message.labelIds,
          isUnread: message.isUnread
        }
      ]);

    } catch (error) {
      this.log('Failed to process message', 'error', { 
        messageId: message.id, 
        error: error.message 
      });
    }
  }

  /**
   * Get message counts
   * @param {string} userId - User ID
   * @param {string} provider - Provider
   * @param {string} email - Email address
   * @returns {Object} Message counts
   */
  async getMessageCounts(userId, provider, email) {
    const client = await this.emailManager.getEmailClient(userId, provider, email);
    
    if (provider === 'gmail') {
      const { gmail } = client;
      
      const [totalResp, unreadResp] = await Promise.all([
        gmail.users.messages.list({ userId: 'me', q: 'in:inbox', maxResults: 1 }),
        gmail.users.messages.list({ userId: 'me', q: 'in:inbox is:unread', maxResults: 1 })
      ]);

      return {
        total: totalResp.data.resultSizeEstimate || 0,
        unread: unreadResp.data.resultSizeEstimate || 0
      };
    }

    return { total: 0, unread: 0 };
  }

  /**
   * Trigger manual sync
   * @param {string} userId - User ID
   * @param {string} email - Email address
   * @param {string} provider - Provider
   * @returns {Object} Sync result
   */
  async triggerSync(userId, email, provider) {
    const account = await this.query(`
      SELECT id FROM user_email_accounts 
      WHERE user_id = $1 AND email_address = $2 AND provider = $3
    `, [userId, email, provider]);

    if (account.rows.length === 0) {
      throw new Error('Email account not found');
    }

    const accountId = account.rows[0].id;

    // Check if sync already in progress
    const syncKey = `${userId}:${accountId}`;
    if (this.activeSyncs.has(syncKey)) {
      return { 
        success: false, 
        message: 'Sync already in progress' 
      };
    }

    // Add to queue with high priority
    await this.addToSyncQueue(userId, accountId, 'incremental', 1);

    return { 
      success: true, 
      message: 'Sync triggered successfully' 
    };
  }

  /**
   * Get sync status for user's accounts
   * @param {string} userId - User ID
   * @returns {Array} Sync status
   */
  async getSyncStatus(userId) {
    const result = await this.query(`
      SELECT 
        es.*,
        ea.email_address,
        ea.provider
      FROM email_sync_status es
      JOIN user_email_accounts ea ON es.email_account_id = ea.id
      WHERE es.user_id = $1
    `, [userId]);

    return result.rows.map(row => ({
      email: row.email_address,
      provider: row.provider,
      status: row.sync_status,
      lastSync: row.last_successful_sync,
      messageCount: row.message_count,
      unreadCount: row.unread_count,
      lastError: row.last_error,
      isActive: this.activeSyncs.has(`${userId}:${row.email_account_id}`)
    }));
  }

  /**
   * Handle sync conflicts
   * @param {string} userId - User ID
   * @param {string} accountId - Account ID
   * @param {Object} conflict - Conflict details
   */
  async handleSyncConflict(userId, accountId, conflict) {
    this.log('Sync conflict detected', 'warn', { userId, accountId, conflict });
    
    // For now, newer version wins
    // In future, could implement more sophisticated conflict resolution
    
    await this.query(`
      UPDATE email_sync_status 
      SET metadata = jsonb_set(metadata, '{last_conflict}', $3)
      WHERE user_id = $1 AND email_account_id = $2
    `, [userId, accountId, JSON.stringify({
      ...conflict,
      resolved_at: new Date(),
      resolution: 'newer_wins'
    })]);
  }

  /**
   * Clean up old sync data
   * @param {number} daysToKeep - Days to keep
   */
  async cleanupOldSyncData(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    // Clean up old queue items
    const deleted = await this.query(`
      DELETE FROM email_sync_queue 
      WHERE status IN ('completed', 'failed') 
        AND created_at < $1
    `, [cutoffDate]);

    this.log(`Cleaned up ${deleted.rowCount} old sync queue items`, 'info');
  }
}

// Export singleton instance
const emailSyncService = new EmailSyncService();
export default emailSyncService;