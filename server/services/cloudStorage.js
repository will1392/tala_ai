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
    this.localUploadsDir = path.join(dirname(__dirname), 'uploads');
    
    // Ensure local uploads directory exists
    if (!fs.existsSync(this.localUploadsDir)) {
      fs.mkdirSync(this.localUploadsDir, { recursive: true });
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
   * Upload a file to the configured storage provider
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} originalName - Original filename
   * @param {string} mimeType - File MIME type
   * @param {string} documentId - Unique document ID
   * @returns {Promise<{url: string, key: string}>} Storage result
   */
  async uploadFile(fileBuffer, originalName, mimeType, documentId) {
    const filename = this.generateFilename(documentId, originalName);
    
    switch (this.storageType) {
      case 's3':
        return await this.uploadToS3(fileBuffer, filename, mimeType);
      case 'cloudinary':
        return await this.uploadToCloudinary(fileBuffer, filename, mimeType);
      case 'local':
      default:
        return await this.uploadToLocal(fileBuffer, filename);
    }
  }

  /**
   * Delete a file from storage
   * @param {string} fileKey - File key/path to delete
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(fileKey) {
    switch (this.storageType) {
      case 's3':
        return await this.deleteFromS3(fileKey);
      case 'cloudinary':
        return await this.deleteFromCloudinary(fileKey);
      case 'local':
      default:
        return await this.deleteFromLocal(fileKey);
    }
  }

  /**
   * Get a signed URL for accessing a file (useful for private S3 buckets)
   * @param {string} fileKey - File key
   * @param {number} expiresIn - URL expiration time in seconds (default: 1 hour)
   * @returns {Promise<string>} Signed URL
   */
  async getSignedUrl(fileKey, expiresIn = 3600) {
    switch (this.storageType) {
      case 's3':
        return await this.getS3SignedUrl(fileKey, expiresIn);
      case 'local':
      default:
        // For local storage, return the direct URL
        return `/api/files/${path.basename(fileKey)}`;
    }
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

  // === Local Storage Implementation ===
  async uploadToLocal(fileBuffer, filename) {
    try {
      const filepath = path.join(this.localUploadsDir, filename);
      
      fs.writeFileSync(filepath, fileBuffer);
      console.log(`✅ File saved locally: ${filename}`);
      
      // Verify file was saved
      if (!fs.existsSync(filepath)) {
        throw new Error('File verification failed after save');
      }

      return {
        url: `/api/files/${filename}`,
        key: filename,
        provider: 'local',
        path: filepath
      };
    } catch (error) {
      console.error('❌ Local upload failed:', error);
      throw new Error(`Local storage failed: ${error.message}`);
    }
  }

  async deleteFromLocal(fileKey) {
    try {
      const filepath = path.join(this.localUploadsDir, path.basename(fileKey));
      
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        console.log(`🗑️ File deleted locally: ${fileKey}`);
        return true;
      } else {
        console.warn(`⚠️ File not found for deletion: ${fileKey}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Local deletion failed:', error);
      return false;
    }
  }

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
   */
  async testConnection() {
    try {
      switch (this.storageType) {
        case 's3':
          // Test S3 connection by listing buckets
          await this.s3.headBucket({ Bucket: this.s3Bucket }).promise();
          console.log('✅ S3 connection test successful');
          return true;
          
        case 'local':
        default:
          // Test local storage by checking directory access
          fs.accessSync(this.localUploadsDir, fs.constants.W_OK);
          console.log('✅ Local storage test successful');
          return true;
      }
    } catch (error) {
      console.error(`❌ Storage connection test failed:`, error.message);
      return false;
    }
  }
}

export default CloudStorageService;