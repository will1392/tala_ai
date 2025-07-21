/**
 * Encryption Utilities
 * 
 * Provides secure encryption/decryption for sensitive data
 */

import crypto from 'crypto';

class EncryptionUtils {
  constructor() {
    // Use environment variable or generate a key
    this.key = process.env.ENCRYPTION_KEY 
      ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex')
      : crypto.randomBytes(32);
    
    this.algorithm = 'aes-256-gcm';
    
    // Warn if using generated key
    if (!process.env.ENCRYPTION_KEY) {
      console.warn('⚠️  Using generated encryption key. Set ENCRYPTION_KEY in .env for production');
    }
  }

  /**
   * Encrypt text
   * @param {string} text - Plain text to encrypt
   * @returns {string} Encrypted text with IV and auth tag
   */
  encrypt(text) {
    if (!text) return null;
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Combine IV, auth tag, and encrypted data
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt text
   * @param {string} encryptedText - Encrypted text with IV and auth tag
   * @returns {string} Decrypted plain text
   */
  decrypt(encryptedText) {
    if (!encryptedText) return null;
    
    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted text format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error.message);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Hash text (one-way)
   * @param {string} text - Text to hash
   * @returns {string} Hashed text
   */
  hash(text) {
    return crypto
      .createHash('sha256')
      .update(text)
      .digest('hex');
  }

  /**
   * Generate random token
   * @param {number} length - Token length in bytes
   * @returns {string} Random token
   */
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Compare hashed values securely
   * @param {string} text - Plain text
   * @param {string} hash - Hashed text
   * @returns {boolean} Match result
   */
  compareHash(text, hash) {
    const textHash = this.hash(text);
    return crypto.timingSafeEqual(
      Buffer.from(textHash),
      Buffer.from(hash)
    );
  }

  /**
   * Encrypt object
   * @param {Object} obj - Object to encrypt
   * @returns {string} Encrypted object
   */
  encryptObject(obj) {
    const jsonString = JSON.stringify(obj);
    return this.encrypt(jsonString);
  }

  /**
   * Decrypt object
   * @param {string} encryptedText - Encrypted object
   * @returns {Object} Decrypted object
   */
  decryptObject(encryptedText) {
    const jsonString = this.decrypt(encryptedText);
    return JSON.parse(jsonString);
  }

  /**
   * Generate encryption key
   * @returns {string} Hex encoded key
   */
  static generateKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Derive key from password
   * @param {string} password - Password
   * @param {string} salt - Salt (hex)
   * @returns {Buffer} Derived key
   */
  static deriveKey(password, salt) {
    const saltBuffer = Buffer.from(salt, 'hex');
    return crypto.pbkdf2Sync(password, saltBuffer, 100000, 32, 'sha256');
  }
}

// Export singleton instance
const encryptionUtils = new EncryptionUtils();
export default encryptionUtils;

// Also export the class for testing
export { EncryptionUtils };