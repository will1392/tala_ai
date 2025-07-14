/**
 * Centralized Error Handler for Tala AI
 * 
 * Provides consistent error handling across all API endpoints:
 * - Different error types (validation, not found, auth, etc.)
 * - Proper HTTP status codes
 * - User-friendly error messages
 * - Development vs production error details
 * - Error logging and monitoring
 */

/**
 * Standard error types
 */
export const ErrorTypes = {
  VALIDATION: 'validation',
  NOT_FOUND: 'not_found',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  CONFLICT: 'conflict',
  RATE_LIMIT: 'rate_limit',
  DATABASE: 'database',
  EXTERNAL_API: 'external_api',
  FILE_UPLOAD: 'file_upload',
  INTERNAL: 'internal'
};

/**
 * HTTP status codes for error types
 */
const ErrorStatusCodes = {
  [ErrorTypes.VALIDATION]: 400,
  [ErrorTypes.NOT_FOUND]: 404,
  [ErrorTypes.UNAUTHORIZED]: 401,
  [ErrorTypes.FORBIDDEN]: 403,
  [ErrorTypes.CONFLICT]: 409,
  [ErrorTypes.RATE_LIMIT]: 429,
  [ErrorTypes.DATABASE]: 500,
  [ErrorTypes.EXTERNAL_API]: 502,
  [ErrorTypes.FILE_UPLOAD]: 400,
  [ErrorTypes.INTERNAL]: 500
};

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  constructor(type, message, details = null, statusCode = null) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.statusCode = statusCode || ErrorStatusCodes[type] || 500;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error helper
 */
export class ValidationError extends AppError {
  constructor(message, validationErrors = []) {
    super(ErrorTypes.VALIDATION, message, { validationErrors });
  }
}

/**
 * Not found error helper
 */
export class NotFoundError extends AppError {
  constructor(resource, identifier = null) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(ErrorTypes.NOT_FOUND, message, { resource, identifier });
  }
}

/**
 * Database error helper
 */
export class DatabaseError extends AppError {
  constructor(message, originalError = null) {
    super(ErrorTypes.DATABASE, message, { originalError: originalError?.message });
  }
}

/**
 * Rate limit error helper
 */
export class RateLimitError extends AppError {
  constructor(limit, window, retryAfter = null) {
    super(
      ErrorTypes.RATE_LIMIT, 
      `Rate limit exceeded: ${limit} requests per ${window} seconds`,
      { limit, window, retryAfter }
    );
  }
}

/**
 * Authorization error helper
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(ErrorTypes.UNAUTHORIZED, message);
  }
}

/**
 * Forbidden error helper
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions', requiredRole = null) {
    super(ErrorTypes.FORBIDDEN, message, { requiredRole });
  }
}

/**
 * Conflict error helper (duplicate resources, etc.)
 */
export class ConflictError extends AppError {
  constructor(message, conflictingField = null) {
    super(ErrorTypes.CONFLICT, message, { conflictingField });
  }
}

/**
 * File upload error helper
 */
export class FileUploadError extends AppError {
  constructor(message, fileInfo = null) {
    super(ErrorTypes.FILE_UPLOAD, message, { fileInfo });
  }
}

/**
 * External API error helper
 */
export class ExternalApiError extends AppError {
  constructor(service, message, statusCode = null) {
    super(
      ErrorTypes.EXTERNAL_API, 
      `External service error (${service}): ${message}`,
      { service, originalStatusCode: statusCode }
    );
  }
}

/**
 * Error logger utility
 */
function logError(error, req = null) {
  const logData = {
    timestamp: new Date().toISOString(),
    error: {
      name: error.name,
      message: error.message,
      type: error.type || 'unknown',
      statusCode: error.statusCode || 500,
      stack: error.stack
    }
  };

  if (req) {
    logData.request = {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.userId || null,
      organizationId: req.organizationId || null
    };
  }

  if (error.details) {
    logData.error.details = error.details;
  }

  // Log based on error severity
  if (error.statusCode >= 500) {
    console.error('🚨 Server Error:', JSON.stringify(logData, null, 2));
  } else if (error.statusCode >= 400) {
    console.warn('⚠️  Client Error:', JSON.stringify(logData, null, 2));
  } else {
    console.info('ℹ️  Info:', JSON.stringify(logData, null, 2));
  }

  // TODO: Integrate with external logging service (e.g., Sentry, LogRocket)
  // await externalLogger.logError(logData);
}

/**
 * Format error response for client
 */
function formatErrorResponse(error, includeDetails = false) {
  const response = {
    error: {
      type: error.type || ErrorTypes.INTERNAL,
      message: error.message,
      timestamp: error.timestamp || new Date().toISOString()
    }
  };

  // Include additional details in development or for specific error types
  if (includeDetails || process.env.NODE_ENV === 'development') {
    if (error.details) {
      response.error.details = error.details;
    }
    
    if (error.stack && process.env.NODE_ENV === 'development') {
      response.error.stack = error.stack;
    }
  }

  // Add rate limit headers for rate limit errors
  if (error.type === ErrorTypes.RATE_LIMIT && error.details) {
    response.error.retryAfter = error.details.retryAfter;
  }

  return response;
}

/**
 * Main error handling middleware
 */
export function errorHandler(error, req, res, next) {
  // Ensure error is an AppError instance
  if (!(error instanceof AppError)) {
    // Convert common error types
    if (error.name === 'ValidationError') {
      error = new ValidationError(error.message, error.errors);
    } else if (error.code === 'ENOENT') {
      error = new NotFoundError('File or resource');
    } else if (error.code === '23505') { // PostgreSQL unique violation
      error = new ConflictError('Resource already exists', error.constraint);
    } else {
      // Generic internal error
      error = new AppError(
        ErrorTypes.INTERNAL,
        process.env.NODE_ENV === 'production' 
          ? 'An internal error occurred' 
          : error.message,
        process.env.NODE_ENV === 'development' ? { originalError: error.message } : null
      );
    }
  }

  // Log the error
  logError(error, req);

  // Set response headers for rate limiting
  if (error.type === ErrorTypes.RATE_LIMIT && error.details?.retryAfter) {
    res.set('Retry-After', error.details.retryAfter);
  }

  // Send error response
  const includeDetails = process.env.NODE_ENV === 'development' || 
                        error.type === ErrorTypes.VALIDATION;
  
  res.status(error.statusCode).json(formatErrorResponse(error, includeDetails));
}

/**
 * 404 handler middleware
 */
export function notFoundHandler(req, res, next) {
  const error = new NotFoundError('Endpoint', `${req.method} ${req.path}`);
  next(error);
}

/**
 * Async wrapper to catch promise rejections
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validation helper
 */
export function validateRequired(data, requiredFields, fieldLabels = {}) {
  const errors = [];
  
  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      const label = fieldLabels[field] || field;
      errors.push(`${label} is required`);
    }
  }
  
  if (errors.length > 0) {
    throw new ValidationError('Validation failed', errors);
  }
}

/**
 * Database operation wrapper with error handling
 */
export async function handleDatabaseOperation(operation, errorMessage = 'Database operation failed') {
  try {
    const result = await operation();
    
    if (result && !result.success) {
      throw new DatabaseError(result.error || errorMessage);
    }
    
    return result;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    // Handle specific database errors
    if (error.code === '23505') { // Unique violation
      throw new ConflictError('Resource already exists');
    } else if (error.code === '23503') { // Foreign key violation
      throw new ValidationError('Referenced resource does not exist');
    } else if (error.code === '23514') { // Check violation
      throw new ValidationError('Data violates database constraints');
    }
    
    throw new DatabaseError(errorMessage, error);
  }
}

/**
 * File operation wrapper with error handling
 */
export async function handleFileOperation(operation, filename = null) {
  try {
    return await operation();
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new NotFoundError('File', filename);
    } else if (error.code === 'EACCES') {
      throw new ForbiddenError('File access denied');
    } else if (error.code === 'EMFILE' || error.code === 'ENFILE') {
      throw new AppError(ErrorTypes.INTERNAL, 'Too many open files');
    }
    
    throw new AppError(ErrorTypes.FILE_UPLOAD, `File operation failed: ${error.message}`);
  }
}

/**
 * External API wrapper with error handling
 */
export async function handleExternalApiCall(apiCall, serviceName) {
  try {
    return await apiCall();
  } catch (error) {
    // Handle HTTP errors
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.message;
      
      if (status === 401) {
        throw new ExternalApiError(serviceName, 'Authentication failed', status);
      } else if (status === 403) {
        throw new ExternalApiError(serviceName, 'Permission denied', status);
      } else if (status === 404) {
        throw new ExternalApiError(serviceName, 'Resource not found', status);
      } else if (status === 429) {
        throw new ExternalApiError(serviceName, 'Rate limit exceeded', status);
      } else if (status >= 500) {
        throw new ExternalApiError(serviceName, 'Service temporarily unavailable', status);
      }
      
      throw new ExternalApiError(serviceName, message, status);
    }
    
    // Handle network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      throw new ExternalApiError(serviceName, 'Service unavailable');
    }
    
    throw new ExternalApiError(serviceName, error.message);
  }
}

/**
 * Organization isolation validator
 */
export function validateOrganizationAccess(resourceOrgId, userOrgId, resourceType = 'resource') {
  if (!resourceOrgId || !userOrgId) {
    throw new ForbiddenError('Organization information missing');
  }
  
  if (resourceOrgId !== userOrgId) {
    throw new ForbiddenError(`Access denied: ${resourceType} belongs to different organization`);
  }
}

/**
 * Export all error utilities
 */
export default {
  ErrorTypes,
  AppError,
  ValidationError,
  NotFoundError,
  DatabaseError,
  RateLimitError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  FileUploadError,
  ExternalApiError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  validateRequired,
  handleDatabaseOperation,
  handleFileOperation,
  handleExternalApiCall,
  validateOrganizationAccess
};