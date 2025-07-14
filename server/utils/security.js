/**
 * Security Utilities for Tala AI
 * 
 * Provides essential security functions for:
 * - Input sanitization and validation
 * - File upload security
 * - Path traversal prevention
 * - Safe JSON parsing
 * - Request validation helpers
 */

import path from 'path';
import crypto from 'crypto';
import { fileTypeFromBuffer } from 'file-type';
import { constantTimeCompare, generateSecureToken } from './crypto.js';

/**
 * Input sanitization configuration
 */
const SANITIZATION_CONFIG = {
  // Maximum lengths for different input types
  maxLengths: {
    string: 10000,
    email: 254,
    url: 2048,
    filename: 255,
    username: 50,
    displayName: 100,
    description: 1000,
    title: 200,
    tag: 50
  },
  
  // Allowed HTML tags for rich text (if HTML is permitted)
  allowedHtmlTags: [
    'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'code', 'pre'
  ],
  
  // Dangerous patterns to detect
  dangerousPatterns: {
    sqlInjection: [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
      /(\'|\";?\s*(OR|AND)\s*\d+\s*=\s*\d+)/gi,
      /(\bOR\b\s+\d+=\d+|\bAND\b\s+\d+=\d+)/gi,
      /(\bunion\b.*\bselect\b)/gi,
      /(\bdrop\b.*\btable\b)/gi
    ],
    xss: [
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
      /<object[\s\S]*?>[\s\S]*?<\/object>/gi,
      /<embed[\s\S]*?>[\s\S]*?<\/embed>/gi,
      /expression\s*\(/gi,
      /vbscript:/gi
    ],
    pathTraversal: [
      /\.\.[\/\\]/g,
      /\.\.[\\\/]/g,
      /%2e%2e[\/\\]/gi,
      /\x2e\x2e[\/\\]/g,
      /%252e%252e/gi,
      /\.\.%2f/gi,
      /\.\.%5c/gi
    ],
    commandInjection: [
      /[;&|`$(){}[\]]/g,
      /\b(exec|eval|system|shell_exec|passthru|proc_open|popen)\b/gi
    ]
  },
  
  // File upload restrictions
  fileUpload: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: [
      // Images
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      // Documents
      'application/pdf', 'text/plain', 'text/csv', 'text/markdown',
      'application/json', 'application/xml',
      // Office documents
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ],
    dangerousExtensions: [
      'exe', 'bat', 'cmd', 'com', 'scr', 'pif', 'vbs', 'js', 'jar',
      'app', 'deb', 'pkg', 'dmg', 'rpm', 'run', 'msi', 'msp',
      'ps1', 'psm1', 'psd1', 'ps1xml', 'psc1', 'ps2', 'ps2xml',
      'sh', 'bash', 'zsh', 'fish', 'csh', 'tcsh', 'ksh'
    ]
  }
};

/**
 * Sanitize string input
 */
export function sanitizeString(input, options = {}) {
  const {
    maxLength = SANITIZATION_CONFIG.maxLengths.string,
    allowHtml = false,
    stripWhitespace = true,
    toLowerCase = false,
    allowEmpty = true
  } = options;

  if (input === null || input === undefined) {
    return allowEmpty ? '' : null;
  }

  let sanitized = String(input);

  // Convert to lowercase if requested
  if (toLowerCase) {
    sanitized = sanitized.toLowerCase();
  }

  // Strip whitespace
  if (stripWhitespace) {
    sanitized = sanitized.trim();
  }

  // Check length
  if (sanitized.length > maxLength) {
    throw new Error(`Input too long (max ${maxLength} characters)`);
  }

  // Check if empty and not allowed
  if (!allowEmpty && sanitized.length === 0) {
    throw new Error('Input cannot be empty');
  }

  // Remove HTML if not allowed
  if (!allowHtml) {
    sanitized = sanitized
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&[^;]+;/g, ''); // Remove HTML entities
  } else {
    // If HTML is allowed, sanitize it
    sanitized = sanitizeHtml(sanitized);
  }

  // Check for dangerous patterns
  const threatCheck = checkForThreats(sanitized);
  if (!threatCheck.isSafe) {
    throw new Error(`Potentially dangerous input detected: ${threatCheck.threat}`);
  }

  return sanitized;
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') {
    throw new Error('Email must be a non-empty string');
  }

  const sanitized = email.toLowerCase().trim();
  
  // Check length
  if (sanitized.length > SANITIZATION_CONFIG.maxLengths.email) {
    throw new Error(`Email too long (max ${SANITIZATION_CONFIG.maxLengths.email} characters)`);
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    throw new Error('Invalid email format');
  }

  // Check for dangerous patterns
  const threatCheck = checkForThreats(sanitized);
  if (!threatCheck.isSafe) {
    throw new Error('Email contains potentially dangerous content');
  }

  return sanitized;
}

/**
 * Sanitize URL
 */
export function sanitizeUrl(url, options = {}) {
  const {
    allowedProtocols = ['http:', 'https:'],
    allowDataUrls = false,
    maxLength = SANITIZATION_CONFIG.maxLengths.url
  } = options;

  if (!url || typeof url !== 'string') {
    throw new Error('URL must be a non-empty string');
  }

  const sanitized = url.trim();

  // Check length
  if (sanitized.length > maxLength) {
    throw new Error(`URL too long (max ${maxLength} characters)`);
  }

  try {
    const urlObj = new URL(sanitized);

    // Check protocol
    if (!allowedProtocols.includes(urlObj.protocol)) {
      if (urlObj.protocol === 'data:' && !allowDataUrls) {
        throw new Error('Data URLs are not allowed');
      }
      if (!allowedProtocols.includes(urlObj.protocol)) {
        throw new Error(`Protocol ${urlObj.protocol} is not allowed`);
      }
    }

    // Check for dangerous patterns in URL
    const threatCheck = checkForThreats(sanitized);
    if (!threatCheck.isSafe) {
      throw new Error('URL contains potentially dangerous content');
    }

    return urlObj.toString();

  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Invalid URL format');
    }
    throw error;
  }
}

/**
 * Sanitize filename for safe file operations
 */
export function sanitizeFilename(filename, options = {}) {
  const {
    maxLength = SANITIZATION_CONFIG.maxLengths.filename,
    preserveExtension = true,
    allowUnicode = false
  } = options;

  if (!filename || typeof filename !== 'string') {
    throw new Error('Filename must be a non-empty string');
  }

  let sanitized = filename.trim();

  // Check length
  if (sanitized.length > maxLength) {
    throw new Error(`Filename too long (max ${maxLength} characters)`);
  }

  // Get extension if preserving
  let extension = '';
  if (preserveExtension) {
    const lastDot = sanitized.lastIndexOf('.');
    if (lastDot !== -1) {
      extension = sanitized.substring(lastDot);
      sanitized = sanitized.substring(0, lastDot);
    }
  }

  // Remove dangerous characters
  if (allowUnicode) {
    // Allow Unicode but remove dangerous characters
    sanitized = sanitized.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
  } else {
    // Only allow ASCII alphanumeric, spaces, hyphens, and underscores
    sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-_]/g, '_');
  }

  // Remove multiple consecutive spaces/underscores
  sanitized = sanitized.replace(/[\s_]+/g, '_');

  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^[.\s]+|[.\s]+$/g, '');

  // Ensure filename is not empty
  if (sanitized.length === 0) {
    sanitized = 'file';
  }

  // Check for reserved filenames (Windows)
  const reservedNames = [
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
  ];

  if (reservedNames.includes(sanitized.toUpperCase())) {
    sanitized = `_${sanitized}`;
  }

  return sanitized + extension;
}

/**
 * Sanitize HTML content
 */
export function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // Remove script tags and their content
  html = html.replace(/<script[\s\S]*?<\/script>/gi, '');

  // Remove dangerous attributes
  html = html.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  html = html.replace(/javascript:/gi, '');
  html = html.replace(/vbscript:/gi, '');
  html = html.replace(/expression\s*\(/gi, '');

  // Remove dangerous tags
  const dangerousTags = ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'];
  for (const tag of dangerousTags) {
    const regex = new RegExp(`<${tag}[^>]*>.*?<\/${tag}>`, 'gi');
    html = html.replace(regex, '');
  }

  return html;
}

/**
 * Check for malicious patterns in input
 */
export function checkForThreats(input) {
  if (typeof input !== 'string') {
    return { isSafe: true };
  }

  const patterns = SANITIZATION_CONFIG.dangerousPatterns;

  // Check for SQL injection
  for (const pattern of patterns.sqlInjection) {
    if (pattern.test(input)) {
      return {
        isSafe: false,
        threat: 'sql_injection',
        pattern: pattern.toString()
      };
    }
  }

  // Check for XSS
  for (const pattern of patterns.xss) {
    if (pattern.test(input)) {
      return {
        isSafe: false,
        threat: 'xss',
        pattern: pattern.toString()
      };
    }
  }

  // Check for path traversal
  for (const pattern of patterns.pathTraversal) {
    if (pattern.test(input)) {
      return {
        isSafe: false,
        threat: 'path_traversal',
        pattern: pattern.toString()
      };
    }
  }

  // Check for command injection
  for (const pattern of patterns.commandInjection) {
    if (pattern.test(input)) {
      return {
        isSafe: false,
        threat: 'command_injection',
        pattern: pattern.toString()
      };
    }
  }

  return { isSafe: true };
}

/**
 * Validate file upload
 */
export async function validateFileUpload(file, options = {}) {
  const {
    maxSize = SANITIZATION_CONFIG.fileUpload.maxSize,
    allowedMimeTypes = SANITIZATION_CONFIG.fileUpload.allowedMimeTypes,
    checkMagicBytes = true,
    allowExecutables = false
  } = options;

  if (!file) {
    throw new Error('No file provided');
  }

  // Check file size
  if (file.size > maxSize) {
    throw new Error(`File too large (max ${Math.round(maxSize / 1024 / 1024)}MB)`);
  }

  // Check MIME type
  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new Error(`File type ${file.mimetype} is not allowed`);
  }

  // Get file extension
  const filename = file.originalname || file.name || '';
  const extension = path.extname(filename).toLowerCase().substring(1);

  // Check for dangerous extensions
  if (!allowExecutables && SANITIZATION_CONFIG.fileUpload.dangerousExtensions.includes(extension)) {
    throw new Error(`File extension .${extension} is not allowed`);
  }

  // Validate magic bytes if file buffer is available
  if (checkMagicBytes && file.buffer) {
    try {
      const fileType = await fileTypeFromBuffer(file.buffer);
      
      if (fileType && !allowedMimeTypes.includes(fileType.mime)) {
        throw new Error(`File content type ${fileType.mime} does not match allowed types`);
      }
      
      // Check if declared MIME type matches actual content
      if (fileType && fileType.mime !== file.mimetype) {
        throw new Error('File MIME type does not match file content');
      }
    } catch (error) {
      // If we can't determine file type, log warning but don't fail
      console.warn('Could not determine file type from magic bytes:', error.message);
    }
  }

  // Sanitize filename
  const sanitizedFilename = sanitizeFilename(filename);

  return {
    isValid: true,
    sanitizedFilename,
    detectedType: file.mimetype,
    size: file.size
  };
}

/**
 * Prevent path traversal attacks
 */
export function sanitizePath(inputPath, baseDirectory = '') {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('Path must be a non-empty string');
  }

  // Normalize the path
  const normalized = path.normalize(inputPath);

  // Check for path traversal attempts
  if (normalized.includes('..')) {
    throw new Error('Path traversal detected');
  }

  // If base directory is provided, ensure path stays within it
  if (baseDirectory) {
    const resolvedBase = path.resolve(baseDirectory);
    const resolvedPath = path.resolve(baseDirectory, normalized);
    
    if (!resolvedPath.startsWith(resolvedBase)) {
      throw new Error('Path traversal detected - path outside base directory');
    }
  }

  return normalized;
}

/**
 * Safe JSON parsing with size limits
 */
export function safeJsonParse(jsonString, options = {}) {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB
    maxDepth = 10,
    reviver = null
  } = options;

  if (typeof jsonString !== 'string') {
    throw new Error('Input must be a string');
  }

  // Check size
  if (jsonString.length > maxSize) {
    throw new Error(`JSON string too large (max ${maxSize} characters)`);
  }

  try {
    const parsed = JSON.parse(jsonString, reviver);
    
    // Check depth
    const depth = calculateObjectDepth(parsed);
    if (depth > maxDepth) {
      throw new Error(`Object nesting too deep (max ${maxDepth} levels)`);
    }

    return parsed;

  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON format');
    }
    throw error;
  }
}

/**
 * Calculate object nesting depth
 */
function calculateObjectDepth(obj, currentDepth = 0) {
  if (obj === null || typeof obj !== 'object') {
    return currentDepth;
  }

  if (currentDepth > 50) { // Prevent stack overflow
    return currentDepth;
  }

  let maxDepth = currentDepth;

  for (const value of Object.values(obj)) {
    if (typeof value === 'object' && value !== null) {
      const depth = calculateObjectDepth(value, currentDepth + 1);
      maxDepth = Math.max(maxDepth, depth);
    }
  }

  return maxDepth;
}

/**
 * Validate request data structure
 */
export function validateRequestStructure(data, schema) {
  if (!data || typeof data !== 'object') {
    throw new Error('Request data must be an object');
  }

  const errors = [];

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    // Check required fields
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`Field '${field}' is required`);
      continue;
    }

    // Skip validation if field is not provided and not required
    if (value === undefined || value === null) {
      continue;
    }

    // Type validation
    if (rules.type) {
      const expectedType = rules.type;
      const actualType = Array.isArray(value) ? 'array' : typeof value;

      if (actualType !== expectedType) {
        errors.push(`Field '${field}' must be of type ${expectedType}, got ${actualType}`);
        continue;
      }
    }

    // Length validation for strings
    if (typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`Field '${field}' must be at least ${rules.minLength} characters`);
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`Field '${field}' must be at most ${rules.maxLength} characters`);
      }
    }

    // Array length validation
    if (Array.isArray(value)) {
      if (rules.minItems && value.length < rules.minItems) {
        errors.push(`Field '${field}' must have at least ${rules.minItems} items`);
      }
      if (rules.maxItems && value.length > rules.maxItems) {
        errors.push(`Field '${field}' must have at most ${rules.maxItems} items`);
      }
    }

    // Custom validation function
    if (rules.validate && typeof rules.validate === 'function') {
      try {
        const isValid = rules.validate(value);
        if (!isValid) {
          errors.push(`Field '${field}' failed custom validation`);
        }
      } catch (error) {
        errors.push(`Field '${field}' validation error: ${error.message}`);
      }
    }

    // Allowed values
    if (rules.enum && !rules.enum.includes(value)) {
      errors.push(`Field '${field}' must be one of: ${rules.enum.join(', ')}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join('; ')}`);
  }

  return true;
}

/**
 * Generate secure random password
 */
export function generateSecurePassword(options = {}) {
  const {
    length = 16,
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSymbols = true,
    excludeSimilar = true
  } = options;

  let chars = '';
  
  if (includeLowercase) {
    chars += excludeSimilar ? 'abcdefghjkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
  }
  
  if (includeUppercase) {
    chars += excludeSimilar ? 'ABCDEFGHJKMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  }
  
  if (includeNumbers) {
    chars += excludeSimilar ? '23456789' : '0123456789';
  }
  
  if (includeSymbols) {
    chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
  }

  if (chars.length === 0) {
    throw new Error('At least one character type must be included');
  }

  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(crypto.randomInt(0, chars.length));
  }

  return password;
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password, requirements = {}) {
  const {
    minLength = 8,
    maxLength = 128,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSymbols = false,
    forbidCommonPasswords = true
  } = requirements;

  if (typeof password !== 'string') {
    throw new Error('Password must be a string');
  }

  const issues = [];

  // Length checks
  if (password.length < minLength) {
    issues.push(`Password must be at least ${minLength} characters long`);
  }
  
  if (password.length > maxLength) {
    issues.push(`Password must be at most ${maxLength} characters long`);
  }

  // Character requirements
  if (requireUppercase && !/[A-Z]/.test(password)) {
    issues.push('Password must contain at least one uppercase letter');
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    issues.push('Password must contain at least one lowercase letter');
  }

  if (requireNumbers && !/\d/.test(password)) {
    issues.push('Password must contain at least one number');
  }

  if (requireSymbols && !/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    issues.push('Password must contain at least one symbol');
  }

  // Common password check
  if (forbidCommonPasswords) {
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome', 'monkey'
    ];
    
    if (commonPasswords.includes(password.toLowerCase())) {
      issues.push('Password is too common');
    }
  }

  const score = calculatePasswordScore(password);

  return {
    isValid: issues.length === 0,
    issues,
    score,
    strength: getPasswordStrengthLabel(score)
  };
}

/**
 * Calculate password strength score (0-100)
 */
function calculatePasswordScore(password) {
  let score = 0;

  // Length score (up to 30 points)
  score += Math.min(password.length * 2, 30);

  // Character variety (up to 40 points)
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/\d/.test(password)) score += 10;
  if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) score += 10;

  // Patterns and repetition (up to 30 points)
  if (!/(.)\1{2,}/.test(password)) score += 10; // No repeated characters
  if (!/012|123|234|345|456|567|678|789|890/.test(password)) score += 10; // No sequences
  if (!/abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/.test(password.toLowerCase())) score += 10; // No letter sequences

  return Math.min(score, 100);
}

/**
 * Get password strength label
 */
function getPasswordStrengthLabel(score) {
  if (score < 30) return 'Very Weak';
  if (score < 50) return 'Weak';
  if (score < 70) return 'Fair';
  if (score < 90) return 'Strong';
  return 'Very Strong';
}

// Export all security utilities
export default {
  sanitizeString,
  sanitizeEmail,
  sanitizeUrl,
  sanitizeFilename,
  sanitizeHtml,
  checkForThreats,
  validateFileUpload,
  sanitizePath,
  safeJsonParse,
  validateRequestStructure,
  generateSecurePassword,
  validatePasswordStrength,
  SANITIZATION_CONFIG
};