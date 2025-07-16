/**
 * Encryption Utilities
 * Handles encryption and decryption of sensitive data
 */

import crypto from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const SALT_LENGTH = 64; // Length of salt in bytes
const TAG_LENGTH = 16; // Length of tag in bytes
const IV_LENGTH = 16; // Length of initialization vector in bytes
const KEY_LENGTH = 32; // Length of key in bytes
const ITERATIONS = 100000; // Number of iterations for key derivation

class Encryption {
    constructor() {
        // Use environment variable or fallback to a default key (change in production!)
        this.masterKey = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production!';
    }

    /**
     * Derive key from password using PBKDF2
     */
    deriveKey(password, salt) {
        return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');
    }

    /**
     * Encrypt data
     */
    encrypt(text) {
        try {
            // Generate random salt and IV
            const salt = crypto.randomBytes(SALT_LENGTH);
            const iv = crypto.randomBytes(IV_LENGTH);
            
            // Derive key from master key and salt
            const key = this.deriveKey(this.masterKey, salt);
            
            // Create cipher
            const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
            
            // Encrypt data
            const encrypted = Buffer.concat([
                cipher.update(text, 'utf8'),
                cipher.final()
            ]);
            
            // Get auth tag
            const tag = cipher.getAuthTag();
            
            // Combine salt, iv, tag, and encrypted data
            const combined = Buffer.concat([salt, iv, tag, encrypted]);
            
            // Return base64 encoded string
            return combined.toString('base64');
        } catch (error) {
            throw new Error(`Encryption failed: ${error.message}`);
        }
    }

    /**
     * Decrypt data
     */
    decrypt(encryptedData) {
        try {
            // Decode from base64
            const combined = Buffer.from(encryptedData, 'base64');
            
            // Extract components
            const salt = combined.slice(0, SALT_LENGTH);
            const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
            const tag = combined.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
            const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
            
            // Derive key from master key and salt
            const key = this.deriveKey(this.masterKey, salt);
            
            // Create decipher
            const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
            decipher.setAuthTag(tag);
            
            // Decrypt data
            const decrypted = Buffer.concat([
                decipher.update(encrypted),
                decipher.final()
            ]);
            
            return decrypted.toString('utf8');
        } catch (error) {
            throw new Error(`Decryption failed: ${error.message}`);
        }
    }

    /**
     * Encrypt object (JSON)
     */
    encryptObject(obj) {
        const jsonString = JSON.stringify(obj);
        return this.encrypt(jsonString);
    }

    /**
     * Decrypt object (JSON)
     */
    decryptObject(encryptedData) {
        const jsonString = this.decrypt(encryptedData);
        return JSON.parse(jsonString);
    }

    /**
     * Generate secure random token
     */
    generateToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    /**
     * Hash password using bcrypt-like approach
     */
    hashPassword(password) {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
        return salt + ':' + hash;
    }

    /**
     * Verify password against hash
     */
    verifyPassword(password, hashedPassword) {
        const [salt, hash] = hashedPassword.split(':');
        const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
        return hash === verifyHash;
    }

    /**
     * Create hash of data (for integrity checks)
     */
    createHash(data) {
        return crypto
            .createHash('sha256')
            .update(data)
            .digest('hex');
    }

    /**
     * Create HMAC signature
     */
    createHmac(data, secret = null) {
        const key = secret || this.masterKey;
        return crypto
            .createHmac('sha256', key)
            .update(data)
            .digest('hex');
    }

    /**
     * Verify HMAC signature
     */
    verifyHmac(data, signature, secret = null) {
        const key = secret || this.masterKey;
        const expectedSignature = this.createHmac(data, key);
        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    }

    /**
     * Encrypt sensitive fields in an object
     */
    encryptFields(obj, fields) {
        const encrypted = { ...obj };
        
        for (const field of fields) {
            if (encrypted[field] !== undefined && encrypted[field] !== null) {
                encrypted[field] = this.encrypt(String(encrypted[field]));
            }
        }
        
        return encrypted;
    }

    /**
     * Decrypt sensitive fields in an object
     */
    decryptFields(obj, fields) {
        const decrypted = { ...obj };
        
        for (const field of fields) {
            if (decrypted[field] !== undefined && decrypted[field] !== null) {
                try {
                    decrypted[field] = this.decrypt(decrypted[field]);
                } catch (error) {
                    // Field might not be encrypted, leave as is
                    console.warn(`Failed to decrypt field ${field}:`, error.message);
                }
            }
        }
        
        return decrypted;
    }
}

// Export singleton instance
const encryption = new Encryption();

export default encryption;

// Named exports for convenience - bind to preserve context
export const encrypt = encryption.encrypt.bind(encryption);
export const decrypt = encryption.decrypt.bind(encryption);
export const encryptObject = encryption.encryptObject.bind(encryption);
export const decryptObject = encryption.decryptObject.bind(encryption);
export const generateToken = encryption.generateToken.bind(encryption);
export const hashPassword = encryption.hashPassword.bind(encryption);
export const verifyPassword = encryption.verifyPassword.bind(encryption);
export const createHash = encryption.createHash.bind(encryption);
export const createHmac = encryption.createHmac.bind(encryption);
export const verifyHmac = encryption.verifyHmac.bind(encryption);
export const encryptFields = encryption.encryptFields.bind(encryption);
export const decryptFields = encryption.decryptFields.bind(encryption);