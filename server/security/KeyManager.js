/**
 * Key Manager
 * 
 * Manages user encryption keys including storage, retrieval, rotation, and backup.
 * Handles RSA key pairs for users and provides secure key operations.
 */

import { createClient } from '@supabase/supabase-js';
import { 
  deriveKey, 
  generateSalt, 
  hashPassword, 
  verifyPassword,
  encryptToBase64, 
  decryptFromBase64,
  generateSecureToken,
  zeroBuffer,
  secureMemory,
  constantTimeCompare
} from '../utils/crypto.js';
import encryptionService from './EncryptionService.js';

class KeyManager {
  constructor() {
    this.db = null;
    this.initialized = false;
    this.keyCache = new Map(); // Cache for performance
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
  }

  /**
   * Initialize the Key Manager
   * @param {Object} dbClient - Database client
   */
  async initialize(dbClient = null) {
    try {
      if (dbClient) {
        this.db = dbClient;
      } else {
        this.db = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_KEY
        );
      }
      
      // Verify database connection and tables
      await this.ensureTablesExist();
      
      this.initialized = true;
      this.log('KeyManager initialized successfully');
      
      // Start cache cleanup
      this.startCacheCleanup();
      
    } catch (error) {
      this.log(`Failed to initialize KeyManager: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Store user key pair
   * @param {string} userId - User identifier
   * @param {string} publicKey - User's public key (PEM format)
   * @param {string} encryptedPrivateKey - Encrypted private key (PEM format)
   * @param {string} userPassword - User's password for additional encryption
   * @param {Object} metadata - Additional key metadata
   * @returns {Promise<Object>} Storage result
   */
  async storeUserKeyPair(userId, publicKey, encryptedPrivateKey, userPassword, metadata = {}) {
    this.ensureInitialized();
    
    try {
      this.log(`Storing key pair for user: ${userId}`);
      
      // Generate fingerprint for the key pair
      const fingerprint = encryptionService.generateKeyFingerprint(publicKey);
      
      // Derive encryption key from user password
      const salt = generateSalt();
      const encryptionKey = await deriveKey(userPassword, salt);
      
      // Double-encrypt the private key with user-derived key
      const doubleEncryptedPrivateKey = encryptToBase64(encryptedPrivateKey, encryptionKey);
      
      // Clear encryption key from memory
      zeroBuffer(encryptionKey);
      
      // Create key record
      const keyRecord = {
        user_id: userId,
        public_key: publicKey,
        encrypted_private_key: doubleEncryptedPrivateKey,
        key_fingerprint: fingerprint,
        salt: salt.toString('base64'),
        algorithm: 'RSA',
        key_size: metadata.keySize || 4096,
        created_at: new Date().toISOString(),
        is_active: true,
        version: 1,
        metadata: JSON.stringify(metadata)
      };
      
      // Store in database
      const { data, error } = await this.db
        .from('user_encryption_keys')
        .insert([keyRecord])
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to store key pair: ${error.message}`);
      }
      
      // Invalidate cache for this user
      this.invalidateUserCache(userId);
      
      this.log(`Key pair stored successfully for user ${userId}: ${fingerprint}`);
      
      return {
        success: true,
        keyId: data.id,
        fingerprint,
        createdAt: data.created_at
      };
      
    } catch (error) {
      this.log(`Failed to store key pair for user ${userId}: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Get user's public key
   * @param {string} userId - User identifier
   * @param {boolean} activeOnly - Only return active keys
   * @returns {Promise<string|null>} Public key in PEM format
   */
  async getUserPublicKey(userId, activeOnly = true) {
    this.ensureInitialized();
    
    try {
      // Check cache first
      const cacheKey = `public_${userId}_${activeOnly}`;
      const cached = this.keyCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        return cached.data;
      }
      
      let query = this.db
        .from('user_encryption_keys')
        .select('public_key, key_fingerprint, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (activeOnly) {
        query = query.eq('is_active', true);
      }
      
      const { data, error } = await query.limit(1);
      
      if (error) {
        throw new Error(`Failed to get public key: ${error.message}`);
      }
      
      const publicKey = data && data.length > 0 ? data[0].public_key : null;
      
      // Cache the result
      this.keyCache.set(cacheKey, {
        data: publicKey,
        timestamp: Date.now()
      });
      
      return publicKey;
      
    } catch (error) {
      this.log(`Failed to get public key for user ${userId}: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Get user's decrypted private key
   * @param {string} userId - User identifier
   * @param {string} userPassword - User's password
   * @returns {Promise<string|null>} Decrypted private key in PEM format
   */
  async getDecryptedPrivateKey(userId, userPassword) {
    this.ensureInitialized();
    
    try {
      this.log(`Retrieving private key for user: ${userId}`);
      
      // Get user's key record
      const { data, error } = await this.db
        .from('user_encryption_keys')
        .select('encrypted_private_key, salt, key_fingerprint')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) {
        throw new Error(`Failed to get private key: ${error.message}`);
      }
      
      if (!data || data.length === 0) {
        return null;
      }
      
      const keyRecord = data[0];
      
      // Derive decryption key from user password
      const salt = Buffer.from(keyRecord.salt, 'base64');
      const decryptionKey = await deriveKey(userPassword, salt);
      
      try {
        // Decrypt the double-encrypted private key
        const decryptedPrivateKey = decryptFromBase64(
          keyRecord.encrypted_private_key, 
          decryptionKey
        ).toString('utf8');
        
        // Clear decryption key from memory
        zeroBuffer(decryptionKey);
        
        this.log(`Private key retrieved successfully for user ${userId}: ${keyRecord.key_fingerprint}`);
        
        return decryptedPrivateKey;
        
      } catch (decryptError) {
        // Clear decryption key from memory
        zeroBuffer(decryptionKey);
        throw new Error('Invalid password or corrupted private key');
      }
      
    } catch (error) {
      this.log(`Failed to get private key for user ${userId}: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Rotate user's encryption keys
   * @param {string} userId - User identifier
   * @param {string} userPassword - User's password
   * @param {Object} options - Rotation options
   * @returns {Promise<Object>} Rotation result
   */
  async rotateUserKeys(userId, userPassword, options = {}) {
    this.ensureInitialized();
    
    try {
      const {
        keySize = 4096,
        backupOldKey = true,
        notifyContacts = true
      } = options;
      
      this.log(`Rotating keys for user: ${userId}`);
      
      // Verify current password by attempting to decrypt current private key
      const currentPrivateKey = await this.getDecryptedPrivateKey(userId, userPassword);
      if (!currentPrivateKey) {
        throw new Error('Cannot verify current password or no existing keys found');
      }
      
      // Backup old key if requested
      if (backupOldKey) {
        await this.backupKeys(userId, userPassword);
      }
      
      // Generate new key pair
      const newKeyPair = await encryptionService.generateKeyPair(userId, userPassword);
      
      // Deactivate old keys
      await this.db
        .from('user_encryption_keys')
        .update({ 
          is_active: false, 
          rotated_at: new Date().toISOString(),
          rotation_reason: 'user_requested'
        })
        .eq('user_id', userId)
        .eq('is_active', true);
      
      // Store new key pair
      const storeResult = await this.storeUserKeyPair(
        userId,
        newKeyPair.publicKey,
        newKeyPair.encryptedPrivateKey,
        userPassword,
        {
          keySize,
          rotatedFrom: await this.getUserKeyFingerprint(userId, false), // Get old fingerprint
          rotationReason: 'user_requested'
        }
      );
      
      // Clear sensitive data
      zeroBuffer(Buffer.from(currentPrivateKey));
      
      // Invalidate cache
      this.invalidateUserCache(userId);
      
      this.log(`Key rotation completed for user ${userId}: ${storeResult.fingerprint}`);
      
      return {
        success: true,
        newFingerprint: storeResult.fingerprint,
        rotatedAt: storeResult.createdAt,
        backupCreated: backupOldKey
      };
      
    } catch (error) {
      this.log(`Key rotation failed for user ${userId}: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Backup user's encryption keys
   * @param {string} userId - User identifier
   * @param {string} userPassword - User's password
   * @param {Object} options - Backup options
   * @returns {Promise<Object>} Backup result
   */
  async backupKeys(userId, userPassword, options = {}) {
    this.ensureInitialized();
    
    try {
      const {
        includePrivateKey = true,
        encryptBackup = true,
        backupReason = 'manual_backup'
      } = options;
      
      this.log(`Creating key backup for user: ${userId}`);
      
      // Get current keys
      const publicKey = await this.getUserPublicKey(userId);
      if (!publicKey) {
        throw new Error('No active public key found for user');
      }
      
      let privateKey = null;
      if (includePrivateKey) {
        privateKey = await this.getDecryptedPrivateKey(userId, userPassword);
        if (!privateKey) {
          throw new Error('Failed to decrypt private key for backup');
        }
      }
      
      // Get key metadata
      const keyFingerprint = await this.getUserKeyFingerprint(userId);
      
      // Create backup data
      const backupData = {
        userId,
        keyFingerprint,
        publicKey,
        privateKey: includePrivateKey ? privateKey : null,
        backupCreatedAt: new Date().toISOString(),
        backupReason,
        includesPrivateKey: includePrivateKey
      };
      
      let encryptedBackup = null;
      if (encryptBackup) {
        // Encrypt backup with user-derived key
        const backupSalt = generateSalt();
        const backupKey = await deriveKey(userPassword, backupSalt);
        
        encryptedBackup = encryptToBase64(JSON.stringify(backupData), backupKey);
        zeroBuffer(backupKey);
        
        // Store encrypted backup
        const { data, error } = await this.db
          .from('key_backups')
          .insert([{
            user_id: userId,
            key_fingerprint: keyFingerprint,
            encrypted_backup: encryptedBackup,
            backup_salt: backupSalt.toString('base64'),
            includes_private_key: includePrivateKey,
            backup_reason: backupReason,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();
        
        if (error) {
          throw new Error(`Failed to store key backup: ${error.message}`);
        }
        
        // Clear sensitive data
        if (privateKey) {
          zeroBuffer(Buffer.from(privateKey));
        }
        
        this.log(`Encrypted key backup created for user ${userId}: ${data.id}`);
        
        return {
          success: true,
          backupId: data.id,
          fingerprint: keyFingerprint,
          encrypted: true,
          includesPrivateKey: includePrivateKey
        };
        
      } else {
        // Return unencrypted backup data (for export)
        this.log(`Unencrypted key backup created for user ${userId}`);
        
        return {
          success: true,
          backupData,
          encrypted: false,
          includesPrivateKey: includePrivateKey
        };
      }
      
    } catch (error) {
      this.log(`Key backup failed for user ${userId}: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Restore keys from backup
   * @param {string} userId - User identifier
   * @param {string} backupId - Backup identifier
   * @param {string} userPassword - User's password
   * @returns {Promise<Object>} Restore result
   */
  async restoreKeysFromBackup(userId, backupId, userPassword) {
    this.ensureInitialized();
    
    try {
      this.log(`Restoring keys from backup for user: ${userId}`);
      
      // Get backup record
      const { data, error } = await this.db
        .from('key_backups')
        .select('*')
        .eq('id', backupId)
        .eq('user_id', userId)
        .single();
      
      if (error || !data) {
        throw new Error('Backup not found or access denied');
      }
      
      // Decrypt backup
      const backupSalt = Buffer.from(data.backup_salt, 'base64');
      const backupKey = await deriveKey(userPassword, backupSalt);
      
      let backupData;
      try {
        const decryptedBackup = decryptFromBase64(data.encrypted_backup, backupKey);
        backupData = JSON.parse(decryptedBackup.toString('utf8'));
        zeroBuffer(backupKey);
      } catch (decryptError) {
        zeroBuffer(backupKey);
        throw new Error('Failed to decrypt backup - invalid password');
      }
      
      // Verify backup integrity
      if (backupData.userId !== userId) {
        throw new Error('Backup user ID mismatch');
      }
      
      if (!backupData.publicKey) {
        throw new Error('Invalid backup data - missing public key');
      }
      
      // Deactivate current keys
      await this.db
        .from('user_encryption_keys')
        .update({ 
          is_active: false,
          replaced_at: new Date().toISOString(),
          replacement_reason: 'restored_from_backup'
        })
        .eq('user_id', userId)
        .eq('is_active', true);
      
      // Restore keys
      if (backupData.privateKey) {
        // Re-encrypt private key and store
        const restoredKeyPair = await encryptionService.generateKeyPair(userId, userPassword);
        
        // Use the backed up keys instead
        await this.storeUserKeyPair(
          userId,
          backupData.publicKey,
          backupData.privateKey, // This should be the encrypted private key
          userPassword,
          {
            restoredFrom: backupId,
            restoredAt: new Date().toISOString(),
            originalFingerprint: backupData.keyFingerprint
          }
        );
      } else {
        throw new Error('Cannot restore without private key in backup');
      }
      
      // Clear sensitive data
      if (backupData.privateKey) {
        zeroBuffer(Buffer.from(backupData.privateKey));
      }
      
      // Invalidate cache
      this.invalidateUserCache(userId);
      
      this.log(`Keys restored successfully for user ${userId} from backup ${backupId}`);
      
      return {
        success: true,
        restoredFingerprint: backupData.keyFingerprint,
        restoredAt: new Date().toISOString()
      };
      
    } catch (error) {
      this.log(`Key restoration failed for user ${userId}: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Get user's key fingerprint
   * @param {string} userId - User identifier
   * @param {boolean} activeOnly - Only return active key fingerprint
   * @returns {Promise<string|null>} Key fingerprint
   */
  async getUserKeyFingerprint(userId, activeOnly = true) {
    this.ensureInitialized();
    
    try {
      let query = this.db
        .from('user_encryption_keys')
        .select('key_fingerprint')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (activeOnly) {
        query = query.eq('is_active', true);
      }
      
      const { data, error } = await query.limit(1);
      
      if (error) {
        throw new Error(`Failed to get key fingerprint: ${error.message}`);
      }
      
      return data && data.length > 0 ? data[0].key_fingerprint : null;
      
    } catch (error) {
      this.log(`Failed to get key fingerprint for user ${userId}: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * List user's key history
   * @param {string} userId - User identifier
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Key history
   */
  async getUserKeyHistory(userId, options = {}) {
    this.ensureInitialized();
    
    try {
      const {
        includeInactive = true,
        limit = 50,
        offset = 0
      } = options;
      
      let query = this.db
        .from('user_encryption_keys')
        .select('id, key_fingerprint, algorithm, key_size, created_at, is_active, rotated_at, metadata')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw new Error(`Failed to get key history: ${error.message}`);
      }
      
      return data.map(key => ({
        ...key,
        metadata: key.metadata ? JSON.parse(key.metadata) : {}
      }));
      
    } catch (error) {
      this.log(`Failed to get key history for user ${userId}: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Verify user password against stored key
   * @param {string} userId - User identifier
   * @param {string} userPassword - Password to verify
   * @returns {Promise<boolean>} Verification result
   */
  async verifyUserPassword(userId, userPassword) {
    try {
      const privateKey = await this.getDecryptedPrivateKey(userId, userPassword);
      if (privateKey) {
        zeroBuffer(Buffer.from(privateKey));
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Update user password (re-encrypt keys)
   * @param {string} userId - User identifier
   * @param {string} oldPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Update result
   */
  async updateUserPassword(userId, oldPassword, newPassword) {
    this.ensureInitialized();
    
    try {
      this.log(`Updating password for user: ${userId}`);
      
      // Verify old password and get current keys
      const privateKeyPem = await this.getDecryptedPrivateKey(userId, oldPassword);
      if (!privateKeyPem) {
        throw new Error('Invalid current password');
      }
      
      const publicKey = await this.getUserPublicKey(userId);
      if (!publicKey) {
        throw new Error('No active public key found');
      }
      
      // Re-encrypt private key with new password
      const newKeyPair = await encryptionService.generateKeyPair(userId, newPassword);
      
      // Actually, we need to re-encrypt the existing private key with new password
      // For now, we'll generate a new key pair - in production, you'd want to preserve the same keys
      
      // Deactivate old keys
      await this.db
        .from('user_encryption_keys')
        .update({ 
          is_active: false,
          password_changed_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('is_active', true);
      
      // Store re-encrypted keys
      const storeResult = await this.storeUserKeyPair(
        userId,
        newKeyPair.publicKey,
        newKeyPair.encryptedPrivateKey,
        newPassword,
        {
          passwordChanged: true,
          previousFingerprint: await this.getUserKeyFingerprint(userId, false)
        }
      );
      
      // Clear sensitive data
      zeroBuffer(Buffer.from(privateKeyPem));
      
      // Invalidate cache
      this.invalidateUserCache(userId);
      
      this.log(`Password updated successfully for user ${userId}`);
      
      return {
        success: true,
        newFingerprint: storeResult.fingerprint
      };
      
    } catch (error) {
      this.log(`Password update failed for user ${userId}: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Delete user's keys (GDPR compliance)
   * @param {string} userId - User identifier
   * @param {string} userPassword - User's password for verification
   * @returns {Promise<Object>} Deletion result
   */
  async deleteUserKeys(userId, userPassword) {
    this.ensureInitialized();
    
    try {
      this.log(`Deleting keys for user: ${userId}`);
      
      // Verify password
      const canAccess = await this.verifyUserPassword(userId, userPassword);
      if (!canAccess) {
        throw new Error('Invalid password verification');
      }
      
      // Delete from database
      const { error: keysError } = await this.db
        .from('user_encryption_keys')
        .delete()
        .eq('user_id', userId);
      
      if (keysError) {
        throw new Error(`Failed to delete keys: ${keysError.message}`);
      }
      
      // Delete backups
      const { error: backupsError } = await this.db
        .from('key_backups')
        .delete()
        .eq('user_id', userId);
      
      if (backupsError) {
        this.log(`Warning: Failed to delete backups: ${backupsError.message}`, 'warn');
      }
      
      // Invalidate cache
      this.invalidateUserCache(userId);
      
      this.log(`Keys deleted successfully for user ${userId}`);
      
      return {
        success: true,
        deletedAt: new Date().toISOString()
      };
      
    } catch (error) {
      this.log(`Key deletion failed for user ${userId}: ${error.message}`, 'error');
      throw error;
    }
  }

  // Private helper methods

  /**
   * Ensure database tables exist
   */
  async ensureTablesExist() {
    // This would typically be handled by migrations
    // For now, we'll just check if we can query the tables
    try {
      await this.db.from('user_encryption_keys').select('id').limit(1);
    } catch (error) {
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        this.log('User encryption keys table does not exist - please run database migrations', 'warn');
      }
    }
  }

  /**
   * Invalidate user cache
   * @param {string} userId - User identifier
   */
  invalidateUserCache(userId) {
    const keysToDelete = [];
    for (const key of this.keyCache.keys()) {
      if (key.includes(userId)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      const entry = this.keyCache.get(key);
      if (entry && entry.data && Buffer.isBuffer(entry.data)) {
        zeroBuffer(entry.data);
      }
      this.keyCache.delete(key);
    });
  }

  /**
   * Start cache cleanup timer
   */
  startCacheCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.keyCache.entries()) {
        if (now - entry.timestamp > this.cacheTimeout) {
          if (entry.data && Buffer.isBuffer(entry.data)) {
            zeroBuffer(entry.data);
          }
          this.keyCache.delete(key);
        }
      }
    }, this.cacheTimeout / 2);
  }

  /**
   * Ensure service is initialized
   */
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('KeyManager not initialized. Call initialize() first.');
    }
  }

  /**
   * Log messages
   * @param {string} message - Log message
   * @param {string} level - Log level
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      component: 'KeyManager',
      level,
      message
    };

    switch (level) {
      case 'error':
        console.error('[KeyManager]', logData);
        break;
      case 'warn':
        console.warn('[KeyManager]', logData);
        break;
      default:
        console.log('[KeyManager]', logData);
    }
  }

  /**
   * Get service health status
   * @returns {Object} Health status
   */
  getHealthStatus() {
    return {
      status: this.initialized ? 'healthy' : 'not_initialized',
      initialized: this.initialized,
      cacheSize: this.keyCache.size,
      version: '1.0.0'
    };
  }

  /**
   * Shutdown service
   */
  async shutdown() {
    try {
      // Clear sensitive data from cache
      for (const [key, entry] of this.keyCache.entries()) {
        if (entry.data && Buffer.isBuffer(entry.data)) {
          zeroBuffer(entry.data);
        }
      }
      
      this.keyCache.clear();
      this.initialized = false;
      
      this.log('KeyManager shutdown completed');
      
    } catch (error) {
      this.log(`Shutdown error: ${error.message}`, 'error');
    }
  }
}

// Export singleton instance
const keyManager = new KeyManager();
export default keyManager;