import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Cloud Storage Service
 * Supports multiple storage providers: Local, AWS S3, Cloudinary
 */
class CloudStorageService {
  constructor() {
    this.storageType = process.env.STORAGE_TYPE || 'local';
    if (this.storageType === 's3') {
      console.log(`📦 CloudStorageService initialized with S3`);
      console.log(`  - Bucket: ${process.env.AWS_S3_BUCKET}`);
      console.log(`  - Region: ${process.env.AWS_REGION || 'us-east-1'}`);
    } else {
      console.error(`❌ CloudStorageService: Invalid storage type '${this.storageType}'`);
      console.error(`   Only 'S3' storage is supported`);
    }
    
    // Initialize storage providers
    this.initializeProviders();
  }

  initializeProviders() {
    // AWS S3 Configuration
    if (this.storageType === 's3') {
      this.s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1'
      });
      this.s3Bucket = process.env.AWS_S3_BUCKET;
      
      console.log('🔧 Initialized AWS S3 storage provider');
    }
    
    // Add other providers here (Cloudinary, Google Cloud Storage, etc.)
  }

  /**
   * Upload a file to S3 storage (only supported method)
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} originalName - Original filename
   * @param {string} mimeType - File MIME type
   * @param {string} documentId - Unique document ID
   * @returns {Promise<{url: string, key: string}>} Storage result
   * @throws {Error} If upload fails or S3 not configured
   */
  async uploadFile(fileBuffer, originalName, mimeType, documentId) {
    const filename = this.generateFilename(documentId, originalName);
    
    if (this.storageType !== 's3') {
      throw new Error(`Storage type '${this.storageType}' is not supported. Only S3 storage is allowed.`);
    }
    
    if (!this.isConfigured()) {
      throw new Error('S3 storage is not properly configured. Check AWS credentials and bucket settings.');
    }
    
    return await this.uploadToS3(fileBuffer, filename, mimeType);
  }

  /**
   * Delete a file from S3 storage
   * @param {string} fileKey - File key/path to delete
   * @returns {Promise<boolean>} Success status
   * @throws {Error} If S3 not configured
   */
  async deleteFile(fileKey) {
    if (this.storageType !== 's3') {
      throw new Error(`Storage type '${this.storageType}' is not supported. Only S3 storage is allowed.`);
    }
    
    return await this.deleteFromS3(fileKey);
  }

  /**
   * Get a signed URL for accessing a file from S3
   * @param {string} fileKey - File key
   * @param {number} expiresIn - URL expiration time in seconds (default: 1 hour)
   * @returns {Promise<string>} Signed URL
   * @throws {Error} If S3 not configured
   */
  async getSignedUrl(fileKey, expiresIn = 3600) {
    if (this.storageType !== 's3') {
      throw new Error(`Storage type '${this.storageType}' is not supported. Only S3 storage is allowed.`);
    }
    
    return await this.getS3SignedUrl(fileKey, expiresIn);
  }

  // === AWS S3 Implementation ===
  async uploadToS3(fileBuffer, filename, mimeType) {
    try {
      const params = {
        Bucket: this.s3Bucket,
        Key: `documents/${filename}`,
        Body: fileBuffer,
        ContentType: mimeType,
        ServerSideEncryption: 'AES256',
        Metadata: {
          'uploaded-at': new Date().toISOString(),
          'original-size': fileBuffer.length.toString()
        }
      };

      const result = await this.s3.upload(params).promise();
      
      console.log(`✅ File uploaded to S3: ${result.Location}`);
      
      return {
        url: result.Location,
        key: params.Key,
        provider: 's3',
        bucket: this.s3Bucket
      };
    } catch (error) {
      console.error('❌ S3 upload failed:', error);
      throw new Error(`S3 upload failed: ${error.message}`);
    }
  }

  async deleteFromS3(fileKey) {
    try {
      const params = {
        Bucket: this.s3Bucket,
        Key: fileKey
      };

      await this.s3.deleteObject(params).promise();
      console.log(`🗑️ File deleted from S3: ${fileKey}`);
      return true;
    } catch (error) {
      console.error('❌ S3 deletion failed:', error);
      return false;
    }
  }

  async getS3SignedUrl(fileKey, expiresIn = 3600) {
    try {
      const params = {
        Bucket: this.s3Bucket,
        Key: fileKey,
        Expires: expiresIn
      };

      const url = await this.s3.getSignedUrlPromise('getObject', params);
      return url;
    } catch (error) {
      console.error('❌ S3 signed URL generation failed:', error);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  // === Local Storage Implementation - REMOVED ===
  // Local storage is not supported. All files must be stored in S3.
  // This ensures consistency, scalability, and proper access control.

  // === Cloudinary Implementation (Placeholder) ===
  async uploadToCloudinary(fileBuffer, filename, mimeType) {
    // TODO: Implement Cloudinary upload
    throw new Error('Cloudinary storage not yet implemented');
  }

  async deleteFromCloudinary(fileKey) {
    // TODO: Implement Cloudinary deletion
    throw new Error('Cloudinary storage not yet implemented');
  }

  // === Utility Methods ===
  generateFilename(documentId, originalName) {
    const timestamp = Date.now();
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension)
      .replace(/[^a-zA-Z0-9\-_]/g, '_') // Sanitize filename
      .substring(0, 50); // Limit length
    
    return `${documentId}-${timestamp}-${baseName}${extension}`;
  }

  /**
   * Get storage provider status and configuration
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      provider: this.storageType,
      configured: this.isConfigured(),
      localUploadsDir: this.localUploadsDir,
      s3Config: this.storageType === 's3' ? {
        bucket: this.s3Bucket,
        region: process.env.AWS_REGION,
        hasCredentials: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
      } : null
    };
  }

  isConfigured() {
    switch (this.storageType) {
      case 's3':
        return !!(
          process.env.AWS_ACCESS_KEY_ID &&
          process.env.AWS_SECRET_ACCESS_KEY &&
          process.env.AWS_S3_BUCKET
        );
      case 'cloudinary':
        return !!(
          process.env.CLOUDINARY_CLOUD_NAME &&
          process.env.CLOUDINARY_API_KEY &&
          process.env.CLOUDINARY_API_SECRET
        );
      case 'local':
      default:
        return true; // Local storage is always available
    }
  }

  /**
   * Test the storage connection
   * @returns {Promise<boolean>} Connection test result
   * @throws {Error} If connection test fails
   */
  async testConnection() {
    switch (this.storageType) {
      case 's3':
        // Test S3 connection by checking bucket access
        try {
          await this.s3.headBucket({ Bucket: this.s3Bucket }).promise();
          
          // Also test if we can list objects (more comprehensive test)
          const listResult = await this.s3.listObjectsV2({
            Bucket: this.s3Bucket,
            MaxKeys: 1,
            Prefix: 'documents/'
          }).promise();
          
          console.log('✅ S3 connection test successful');
          return true;
        } catch (error) {
          // Re-throw with error details for better debugging
          error.code = error.code || error.Code;
          error.statusCode = error.statusCode || error.$metadata?.httpStatusCode;
          throw error;
        }
        
      case 'local':
        // Should not be used
        throw new Error('Local storage is not supported. Configure S3 storage.');
        
      default:
        throw new Error(`Unknown storage type: ${this.storageType}. Configure S3 storage.`);
    }
  }
}

export default CloudStorageService;