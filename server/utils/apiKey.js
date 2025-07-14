/**
 * API Key Utilities
 * 
 * Provides cryptographic functions for generating, formatting, and validating API keys.
 * Uses industry-standard practices for secure key generation and storage.
 */

import crypto from 'crypto';

// API Key configuration
const API_KEY_CONFIG = {
  // Key generation
  keyLength: 32,                    // 32 bytes = 256 bits
  prefixLength: 6,                  // Length of the visible prefix
  
  // Key format
  prefixes: {
    live: 'tlai_live_',             // Production keys
    test: 'tlai_test_',             // Test/development keys
    sandbox: 'tlai_sandbox_'        // Sandbox environment keys
  },
  
  // Security
  hashAlgorithm: 'sha256',          // Hash algorithm for key storage
  encoding: 'hex',                  // Encoding for key display
  
  // Validation
  minKeyLength: 64,                 // Minimum total key length
  maxKeyLength: 128                 // Maximum total key length
};

/**
 * Generate a cryptographically secure API key
 * @param {string} environment - Environment type (live, test, sandbox)
 * @returns {Object} Generated key information
 */
export function generateSecureKey(environment = 'test') {
  try {
    // Validate environment
    if (!API_KEY_CONFIG.prefixes[environment]) {
      throw new Error(`Invalid environment: ${environment}`);
    }
    
    // Generate cryptographically secure random bytes
    const randomBytes = crypto.randomBytes(API_KEY_CONFIG.keyLength);
    const keyBody = randomBytes.toString(API_KEY_CONFIG.encoding);
    
    // Generate prefix identifier (first 6 chars of key for display)
    const prefixId = keyBody.substring(0, API_KEY_CONFIG.prefixLength);
    
    // Create full key with environment prefix
    const prefix = API_KEY_CONFIG.prefixes[environment];
    const fullKey = `${prefix}${keyBody}`;
    
    // Create display prefix for identification
    const displayPrefix = `${prefix}${prefixId}`;
    
    return {
      key: fullKey,                 // Full API key (show only once)
      prefix: displayPrefix,        // Safe prefix for display
      environment,                  // Environment type
      length: fullKey.length,       // Key length
      created: new Date().toISOString()
    };
    
  } catch (error) {
    throw new Error(`Failed to generate API key: ${error.message}`);
  }
}

/**
 * Hash an API key for secure storage
 * @param {string} apiKey - The API key to hash
 * @returns {string} SHA-256 hash of the key
 */
export function hashApiKey(apiKey) {
  try {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('API key must be a non-empty string');
    }
    
    // Create SHA-256 hash
    const hash = crypto
      .createHash(API_KEY_CONFIG.hashAlgorithm)
      .update(apiKey)
      .digest(API_KEY_CONFIG.encoding);
    
    return hash;
    
  } catch (error) {
    throw new Error(`Failed to hash API key: ${error.message}`);
  }
}

/**
 * Format an API key with proper prefix
 * @param {string} keyBody - The key body without prefix
 * @param {string} environment - Environment type
 * @returns {string} Formatted API key
 */
export function formatApiKey(keyBody, environment = 'test') {
  try {
    if (!keyBody || typeof keyBody !== 'string') {
      throw new Error('Key body must be a non-empty string');
    }
    
    if (!API_KEY_CONFIG.prefixes[environment]) {
      throw new Error(`Invalid environment: ${environment}`);
    }
    
    const prefix = API_KEY_CONFIG.prefixes[environment];
    return `${prefix}${keyBody}`;
    
  } catch (error) {
    throw new Error(`Failed to format API key: ${error.message}`);
  }
}

/**
 * Parse an API key to extract components
 * @param {string} apiKey - The full API key
 * @returns {Object} Parsed key components
 */
export function parseApiKey(apiKey) {
  try {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('API key must be a non-empty string');
    }
    
    // Find matching prefix
    let environment = null;
    let prefix = null;
    let keyBody = null;
    
    for (const [env, envPrefix] of Object.entries(API_KEY_CONFIG.prefixes)) {
      if (apiKey.startsWith(envPrefix)) {
        environment = env;
        prefix = envPrefix;
        keyBody = apiKey.substring(envPrefix.length);
        break;
      }
    }
    
    if (!environment) {
      throw new Error('Invalid API key format: unknown prefix');
    }
    
    // Extract display prefix
    const displayPrefix = `${prefix}${keyBody.substring(0, API_KEY_CONFIG.prefixLength)}`;
    
    return {
      full: apiKey,                 // Full key
      environment,                  // Environment type
      prefix,                       // Full prefix
      displayPrefix,                // Safe display prefix
      keyBody,                      // Key body without prefix
      length: apiKey.length,        // Total length
      isValid: isValidKeyFormat(apiKey)
    };
    
  } catch (error) {
    throw new Error(`Failed to parse API key: ${error.message}`);
  }
}

/**
 * Validate API key format
 * @param {string} apiKey - The API key to validate
 * @returns {boolean} True if format is valid
 */
export function isValidKeyFormat(apiKey) {
  try {
    if (!apiKey || typeof apiKey !== 'string') {
      return false;
    }
    
    // Check length constraints
    if (apiKey.length < API_KEY_CONFIG.minKeyLength || 
        apiKey.length > API_KEY_CONFIG.maxKeyLength) {
      return false;
    }
    
    // Check if it starts with a valid prefix
    const hasValidPrefix = Object.values(API_KEY_CONFIG.prefixes)
      .some(prefix => apiKey.startsWith(prefix));
    
    if (!hasValidPrefix) {
      return false;
    }
    
    // Check if key body is hexadecimal
    const parsed = parseApiKey(apiKey);
    const hexPattern = /^[a-fA-F0-9]+$/;
    
    return hexPattern.test(parsed.keyBody);
    
  } catch (error) {
    return false;
  }
}

/**
 * Extract API key from various sources
 * @param {Object} req - Express request object
 * @returns {string|null} Extracted API key or null
 */
export function extractApiKey(req) {
  try {
    // Check X-API-Key header (primary method)
    const headerKey = req.headers['x-api-key'];
    if (headerKey && isValidKeyFormat(headerKey)) {
      return headerKey;
    }
    
    // Check Authorization header with Bearer token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const bearerKey = authHeader.substring(7);
      if (isValidKeyFormat(bearerKey)) {
        return bearerKey;
      }
    }
    
    // Check Authorization header with API-Key scheme
    if (authHeader && authHeader.startsWith('API-Key ')) {
      const apiKey = authHeader.substring(8);
      if (isValidKeyFormat(apiKey)) {
        return apiKey;
      }
    }
    
    // Check query parameter (less secure, for backwards compatibility)
    const queryKey = req.query.api_key || req.query.apikey;
    if (queryKey && isValidKeyFormat(queryKey)) {
      return queryKey;
    }
    
    return null;
    
  } catch (error) {
    return null;
  }
}

/**
 * Mask an API key for safe display
 * @param {string} apiKey - The API key to mask
 * @param {number} visibleChars - Number of characters to show at end
 * @returns {string} Masked API key
 */
export function maskApiKey(apiKey, visibleChars = 6) {
  try {
    if (!apiKey || typeof apiKey !== 'string') {
      return '[INVALID KEY]';
    }
    
    const parsed = parseApiKey(apiKey);
    const maskedLength = Math.max(0, parsed.keyBody.length - visibleChars);
    const mask = '*'.repeat(maskedLength);
    const visiblePart = parsed.keyBody.substring(maskedLength);
    
    return `${parsed.prefix}${mask}${visiblePart}`;
    
  } catch (error) {
    return '[MASKED KEY]';
  }
}

/**
 * Generate key usage fingerprint for tracking
 * @param {string} apiKey - The API key
 * @param {string} userAgent - User agent string
 * @param {string} ipAddress - IP address
 * @returns {string} Fingerprint hash
 */
export function generateUsageFingerprint(apiKey, userAgent = '', ipAddress = '') {
  try {
    const data = `${apiKey}:${userAgent}:${ipAddress}`;
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex')
      .substring(0, 16); // Short fingerprint for tracking
      
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Validate API key strength
 * @param {string} apiKey - The API key to validate
 * @returns {Object} Validation result with strength score
 */
export function validateKeyStrength(apiKey) {
  try {
    const result = {
      isValid: false,
      score: 0,
      issues: [],
      recommendations: []
    };
    
    if (!apiKey || typeof apiKey !== 'string') {
      result.issues.push('Key is empty or invalid type');
      return result;
    }
    
    // Check format
    if (!isValidKeyFormat(apiKey)) {
      result.issues.push('Invalid key format');
      return result;
    }
    
    const parsed = parseApiKey(apiKey);
    
    // Length check
    if (parsed.keyBody.length >= 64) {
      result.score += 30;
    } else if (parsed.keyBody.length >= 32) {
      result.score += 20;
    } else {
      result.issues.push('Key body too short');
      result.recommendations.push('Use keys with at least 32 character body');
    }
    
    // Entropy check (basic)
    const uniqueChars = new Set(parsed.keyBody.toLowerCase()).size;
    if (uniqueChars >= 12) {
      result.score += 20;
    } else if (uniqueChars >= 8) {
      result.score += 10;
    } else {
      result.issues.push('Low character diversity');
      result.recommendations.push('Regenerate key for better entropy');
    }
    
    // Pattern check
    const hasRepeatingPattern = /(.{3,})\1/.test(parsed.keyBody);
    if (!hasRepeatingPattern) {
      result.score += 20;
    } else {
      result.issues.push('Contains repeating patterns');
      result.recommendations.push('Regenerate key to avoid patterns');
    }
    
    // Environment check
    if (parsed.environment === 'live') {
      result.score += 15;
    } else if (parsed.environment === 'test') {
      result.score += 10;
    }
    
    // Sequential character check
    const hasSequential = /0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef/.test(parsed.keyBody);
    if (!hasSequential) {
      result.score += 15;
    } else {
      result.issues.push('Contains sequential characters');
      result.recommendations.push('Regenerate key to avoid sequences');
    }
    
    result.isValid = result.score >= 60;
    
    return result;
    
  } catch (error) {
    return {
      isValid: false,
      score: 0,
      issues: [`Validation error: ${error.message}`],
      recommendations: ['Contact support for assistance']
    };
  }
}

/**
 * Get environment type from API key
 * @param {string} apiKey - The API key
 * @returns {string} Environment type
 */
export function getKeyEnvironment(apiKey) {
  try {
    const parsed = parseApiKey(apiKey);
    return parsed.environment;
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Check if API key is for production environment
 * @param {string} apiKey - The API key
 * @returns {boolean} True if production key
 */
export function isProductionKey(apiKey) {
  return getKeyEnvironment(apiKey) === 'live';
}

/**
 * Generate API key configuration summary
 * @returns {Object} Configuration information
 */
export function getApiKeyConfig() {
  return {
    supportedEnvironments: Object.keys(API_KEY_CONFIG.prefixes),
    keyLength: API_KEY_CONFIG.keyLength,
    prefixLength: API_KEY_CONFIG.prefixLength,
    hashAlgorithm: API_KEY_CONFIG.hashAlgorithm,
    minLength: API_KEY_CONFIG.minKeyLength,
    maxLength: API_KEY_CONFIG.maxKeyLength,
    formats: {
      headers: ['X-API-Key', 'Authorization: Bearer', 'Authorization: API-Key'],
      queryParams: ['api_key', 'apikey']
    }
  };
}

// Export configuration for external use
export { API_KEY_CONFIG };