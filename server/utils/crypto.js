/**
 * Cryptographic Utilities
 * 
 * Provides secure cryptographic operations for document encryption,
 * key derivation, and other security operations.
 */

import crypto from 'crypto';
// Temporarily disabled argon2 due to build issues
// import argon2 from 'argon2';
import bcrypt from 'bcryptjs';

// Cryptographic constants
const CRYPTO_CONFIG = {
  // AES encryption
  aes: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,        // 256 bits
    ivLength: 16,         // 128 bits
    tagLength: 16         // 128 bits
  },
  
  // Argon2 key derivation (temporarily using bcrypt)
  argon2: {
    // type: argon2.argon2id,
    // memoryCost: 2 ** 16,  // 64 MB
    // timeCost: 3,          // 3 iterations
    // parallelism: 1,       // Single thread
    // hashLength: 32        // 256 bits
    saltRounds: 10  // For bcrypt
  },
  
  // RSA key generation
  rsa: {
    modulusLength: 4096,  // 4096 bits
    publicExponent: 0x10001,
    hashAlgorithm: 'sha256',
    mgf: 'mgf1',
    saltLength: 32
  },
  
  // Random generation
  random: {
    saltLength: 32,       // 256 bits
    tokenLength: 32       // 256 bits
  }
};

/**
 * Generate cryptographically secure random bytes
 * @param {number} length - Number of bytes to generate
 * @returns {Buffer} Random bytes
 */
export function secureRandom(length = CRYPTO_CONFIG.random.tokenLength) {
  try {
    return crypto.randomBytes(length);
  } catch (error) {
    throw new Error(`Failed to generate secure random bytes: ${error.message}`);
  }
}

/**
 * Generate a cryptographically secure salt
 * @param {number} length - Salt length in bytes
 * @returns {Buffer} Generated salt
 */
export function generateSalt(length = CRYPTO_CONFIG.random.saltLength) {
  return secureRandom(length);
}

/**
 * Derive a key from password using Argon2
 * @param {string} password - User password
 * @param {Buffer} salt - Salt for key derivation
 * @param {Object} options - Argon2 options
 * @returns {Promise<Buffer>} Derived key
 */
export async function deriveKey(password, salt, options = {}) {
  try {
    // Temporarily using bcrypt instead of argon2
    const saltStr = salt.toString('base64').substring(0, 16);
    const hash = await bcrypt.hash(password, CRYPTO_CONFIG.argon2.saltRounds);
    
    // Return a 32-byte key derived from the hash
    return crypto.createHash('sha256').update(hash).digest();
    
  } catch (error) {
    throw new Error(`Key derivation failed: ${error.message}`);
  }
}

/**
 * Verify a password against an Argon2 hash
 * @param {string} password - Password to verify
 * @param {string} hash - Argon2 hash to verify against
 * @returns {Promise<boolean>} Verification result
 */
export async function verifyPassword(password, hash) {
  try {
    // Temporarily using bcrypt instead of argon2
    return await bcrypt.compare(password, hash);
  } catch (error) {
    return false;
  }
}

/**
 * Hash a password using Argon2
 * @param {string} password - Password to hash
 * @param {Object} options - Argon2 options
 * @returns {Promise<string>} Argon2 hash
 */
export async function hashPassword(password, options = {}) {
  try {
    // Temporarily using bcrypt instead of argon2
    return await bcrypt.hash(password, CRYPTO_CONFIG.argon2.saltRounds);
  } catch (error) {
    throw new Error(`Password hashing failed: ${error.message}`);
  }
}

/**
 * Encrypt data using AES-256-GCM
 * @param {Buffer|string} data - Data to encrypt
 * @param {Buffer} key - Encryption key (32 bytes)
 * @param {Buffer} iv - Initialization vector (16 bytes, optional)
 * @returns {Object} Encryption result with encrypted data, IV, and auth tag
 */
export function encryptAES(data, key, iv = null) {
  try {
    if (!Buffer.isBuffer(data)) {
      data = Buffer.from(data, 'utf8');
    }
    
    if (key.length !== CRYPTO_CONFIG.aes.keyLength) {
      throw new Error(`Key must be ${CRYPTO_CONFIG.aes.keyLength} bytes`);
    }
    
    // Generate IV if not provided
    if (!iv) {
      iv = secureRandom(CRYPTO_CONFIG.aes.ivLength);
    }
    
    if (iv.length !== CRYPTO_CONFIG.aes.ivLength) {
      throw new Error(`IV must be ${CRYPTO_CONFIG.aes.ivLength} bytes`);
    }
    
    const cipher = crypto.createCipher(CRYPTO_CONFIG.aes.algorithm, key);
    cipher.setIV(iv);
    
    let encrypted = cipher.update(data);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv,
      authTag,
      algorithm: CRYPTO_CONFIG.aes.algorithm
    };
    
  } catch (error) {
    throw new Error(`AES encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt data using AES-256-GCM
 * @param {Buffer} encryptedData - Encrypted data
 * @param {Buffer} key - Decryption key (32 bytes)
 * @param {Buffer} iv - Initialization vector (16 bytes)
 * @param {Buffer} authTag - Authentication tag (16 bytes)
 * @returns {Buffer} Decrypted data
 */
export function decryptAES(encryptedData, key, iv, authTag) {
  try {
    if (key.length !== CRYPTO_CONFIG.aes.keyLength) {
      throw new Error(`Key must be ${CRYPTO_CONFIG.aes.keyLength} bytes`);
    }
    
    if (iv.length !== CRYPTO_CONFIG.aes.ivLength) {
      throw new Error(`IV must be ${CRYPTO_CONFIG.aes.ivLength} bytes`);
    }
    
    if (authTag.length !== CRYPTO_CONFIG.aes.tagLength) {
      throw new Error(`Auth tag must be ${CRYPTO_CONFIG.aes.tagLength} bytes`);
    }
    
    const decipher = crypto.createDecipher(CRYPTO_CONFIG.aes.algorithm, key);
    decipher.setIV(iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted;
    
  } catch (error) {
    throw new Error(`AES decryption failed: ${error.message}`);
  }
}

/**
 * Generate an AES key
 * @returns {Buffer} Generated AES key (32 bytes)
 */
export function generateAESKey() {
  return secureRandom(CRYPTO_CONFIG.aes.keyLength);
}

/**
 * Encrypt data to Base64 format for storage
 * @param {Buffer|string} data - Data to encrypt
 * @param {Buffer} key - Encryption key
 * @param {Buffer} iv - Optional IV
 * @returns {string} Base64 encoded encrypted data package
 */
export function encryptToBase64(data, key, iv = null) {
  try {
    const result = encryptAES(data, key, iv);
    
    // Package everything into a single structure
    const package_ = {
      algorithm: result.algorithm,
      iv: result.iv.toString('base64'),
      authTag: result.authTag.toString('base64'),
      encrypted: result.encrypted.toString('base64')
    };
    
    return Buffer.from(JSON.stringify(package_)).toString('base64');
    
  } catch (error) {
    throw new Error(`Encryption to Base64 failed: ${error.message}`);
  }
}

/**
 * Decrypt data from Base64 format
 * @param {string} encryptedBase64 - Base64 encoded encrypted package
 * @param {Buffer} key - Decryption key
 * @returns {Buffer} Decrypted data
 */
export function decryptFromBase64(encryptedBase64, key) {
  try {
    const packageData = JSON.parse(Buffer.from(encryptedBase64, 'base64').toString('utf8'));
    
    const iv = Buffer.from(packageData.iv, 'base64');
    const authTag = Buffer.from(packageData.authTag, 'base64');
    const encrypted = Buffer.from(packageData.encrypted, 'base64');
    
    return decryptAES(encrypted, key, iv, authTag);
    
  } catch (error) {
    throw new Error(`Decryption from Base64 failed: ${error.message}`);
  }
}

/**
 * Constant-time comparison to prevent timing attacks
 * @param {Buffer|string} a - First value
 * @param {Buffer|string} b - Second value
 * @returns {boolean} Whether values are equal
 */
export function constantTimeCompare(a, b) {
  try {
    if (typeof a === 'string') a = Buffer.from(a);
    if (typeof b === 'string') b = Buffer.from(b);
    
    if (a.length !== b.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(a, b);
    
  } catch (error) {
    return false;
  }
}

/**
 * Securely clear a buffer by overwriting with zeros
 * @param {Buffer} buffer - Buffer to clear
 */
export function zeroBuffer(buffer) {
  if (Buffer.isBuffer(buffer)) {
    buffer.fill(0);
  }
}

/**
 * Generate a secure random token
 * @param {number} length - Token length in bytes
 * @param {string} encoding - Output encoding (hex, base64, base64url)
 * @returns {string} Generated token
 */
export function generateSecureToken(length = CRYPTO_CONFIG.random.tokenLength, encoding = 'hex') {
  try {
    const randomBytes = secureRandom(length);
    
    switch (encoding) {
      case 'base64':
        return randomBytes.toString('base64');
      case 'base64url':
        return randomBytes.toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, '');
      case 'hex':
      default:
        return randomBytes.toString('hex');
    }
    
  } catch (error) {
    throw new Error(`Token generation failed: ${error.message}`);
  }
}

/**
 * Create HMAC for data integrity
 * @param {Buffer|string} data - Data to authenticate
 * @param {Buffer|string} key - HMAC key
 * @param {string} algorithm - Hash algorithm (default: sha256)
 * @returns {Buffer} HMAC digest
 */
export function createHMAC(data, key, algorithm = 'sha256') {
  try {
    const hmac = crypto.createHmac(algorithm, key);
    hmac.update(data);
    return hmac.digest();
    
  } catch (error) {
    throw new Error(`HMAC creation failed: ${error.message}`);
  }
}

/**
 * Verify HMAC for data integrity
 * @param {Buffer|string} data - Original data
 * @param {Buffer|string} key - HMAC key
 * @param {Buffer} expectedHmac - Expected HMAC
 * @param {string} algorithm - Hash algorithm (default: sha256)
 * @returns {boolean} Whether HMAC is valid
 */
export function verifyHMAC(data, key, expectedHmac, algorithm = 'sha256') {
  try {
    const actualHmac = createHMAC(data, key, algorithm);
    return constantTimeCompare(actualHmac, expectedHmac);
    
  } catch (error) {
    return false;
  }
}

/**
 * Hash data using specified algorithm
 * @param {Buffer|string} data - Data to hash
 * @param {string} algorithm - Hash algorithm (default: sha256)
 * @returns {Buffer} Hash digest
 */
export function hashData(data, algorithm = 'sha256') {
  try {
    const hash = crypto.createHash(algorithm);
    hash.update(data);
    return hash.digest();
    
  } catch (error) {
    throw new Error(`Data hashing failed: ${error.message}`);
  }
}

/**
 * Generate fingerprint for data
 * @param {Buffer|string} data - Data to fingerprint
 * @param {number} length - Fingerprint length in bytes (default: 8)
 * @returns {string} Hex fingerprint
 */
export function generateFingerprint(data, length = 8) {
  try {
    const hash = hashData(data, 'sha256');
    return hash.slice(0, length).toString('hex');
    
  } catch (error) {
    throw new Error(`Fingerprint generation failed: ${error.message}`);
  }
}

/**
 * Encrypt data for multiple recipients (hybrid encryption)
 * @param {Buffer|string} data - Data to encrypt
 * @param {Array<Buffer>} recipientKeys - Array of recipient public keys
 * @returns {Object} Encryption result with data key and encrypted data
 */
export function hybridEncrypt(data, recipientKeys) {
  try {
    // Generate a random data encryption key
    const dataKey = generateAESKey();
    
    // Encrypt the data with the data key
    const encryptedData = encryptAES(data, dataKey);
    
    // Encrypt the data key for each recipient
    const encryptedKeys = recipientKeys.map(publicKey => {
      // For now, we'll use AES encryption of the key
      // In a full implementation, this would use RSA encryption
      const keyEncryptionKey = hashData(publicKey).slice(0, 32);
      return encryptAES(dataKey, keyEncryptionKey);
    });
    
    // Clear the data key from memory
    zeroBuffer(dataKey);
    
    return {
      encryptedData,
      encryptedKeys,
      algorithm: 'hybrid-aes-256-gcm'
    };
    
  } catch (error) {
    throw new Error(`Hybrid encryption failed: ${error.message}`);
  }
}

/**
 * Get cryptographic configuration
 * @returns {Object} Current crypto configuration
 */
export function getCryptoConfig() {
  return { ...CRYPTO_CONFIG };
}

/**
 * Validate key strength
 * @param {Buffer} key - Key to validate
 * @param {number} minLength - Minimum key length
 * @returns {Object} Validation result
 */
export function validateKeyStrength(key, minLength = 32) {
  try {
    const result = {
      isValid: false,
      length: key.length,
      minLength,
      entropy: 0,
      issues: []
    };
    
    if (key.length < minLength) {
      result.issues.push(`Key too short: ${key.length} < ${minLength} bytes`);
      return result;
    }
    
    // Calculate entropy (simplified)
    const uniqueBytes = new Set(key).size;
    result.entropy = uniqueBytes / 256; // Normalized to 0-1
    
    if (result.entropy < 0.5) {
      result.issues.push('Low entropy detected');
    }
    
    // Check for patterns
    let hasPatterns = false;
    for (let i = 0; i < key.length - 3; i++) {
      if (key[i] === key[i + 1] && key[i + 1] === key[i + 2] && key[i + 2] === key[i + 3]) {
        hasPatterns = true;
        break;
      }
    }
    
    if (hasPatterns) {
      result.issues.push('Repetitive patterns detected');
    }
    
    result.isValid = result.issues.length === 0;
    
    return result;
    
  } catch (error) {
    return {
      isValid: false,
      length: 0,
      minLength,
      entropy: 0,
      issues: [`Validation error: ${error.message}`]
    };
  }
}

/**
 * Secure memory utilities
 */
export const secureMemory = {
  /**
   * Allocate secure buffer
   * @param {number} size - Buffer size
   * @returns {Buffer} Allocated buffer
   */
  alloc(size) {
    const buffer = Buffer.allocUnsafe(size);
    buffer.fill(0);
    return buffer;
  },
  
  /**
   * Clear multiple buffers
   * @param {...Buffer} buffers - Buffers to clear
   */
  clear(...buffers) {
    buffers.forEach(buffer => {
      if (Buffer.isBuffer(buffer)) {
        zeroBuffer(buffer);
      }
    });
  },
  
  /**
   * Copy buffer securely
   * @param {Buffer} source - Source buffer
   * @returns {Buffer} Copied buffer
   */
  copy(source) {
    const copy = this.alloc(source.length);
    source.copy(copy);
    return copy;
  }
};

// Export configuration for external use
export { CRYPTO_CONFIG };