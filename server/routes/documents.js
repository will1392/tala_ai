/**
 * Secure Document Routes for Tala AI
 * 
 * Demonstrates integration of all security components:
 * - Authentication middleware
 * - RBAC permissions
 * - Input validation
 * - Rate limiting
 * - Audit logging
 * - Security headers
 */

import express from 'express';
import multer from 'multer';
import { DocumentService } from '../services/db/documentService.js';
import { EncryptedDocumentService } from '../services/db/encryptedDocumentService.js';

// Security imports
import { 
  authenticate, 
  requireRole, 
  requirePermission, 
  requireResourceAccess 
} from '../middleware/authentication.js';
import securityManager from '../security/SecurityManager.js';
import { createAPISecurityMiddleware } from '../middleware/security-headers.js';
import { auditLog } from '../utils/audit.js';
import { 
  sanitizeString, 
  validateFileUpload, 
  validateRequestStructure 
} from '../utils/security.js';

const router = express.Router();

// Initialize services
const documentService = new DocumentService();
const encryptedDocumentService = new EncryptedDocumentService();

// Apply security middleware to all routes
router.use(createAPISecurityMiddleware());
router.use(securityManager.createSecurityMiddleware({
  rateLimitType: 'api',
  validateInput: true,
  blockSuspicious: true
}));

// Configure multer for secure file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 1
  },
  fileFilter: async (req, file, cb) => {
    try {
      const validation = await validateFileUpload(file, {
        allowedMimeTypes: [
          'application/pdf',
          'text/plain',
          'text/markdown',
          'application/json',
          'image/jpeg',
          'image/png'
        ],
        maxSize: 50 * 1024 * 1024
      });
      
      if (validation.isValid) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type or size'));
      }
    } catch (error) {
      cb(error);
    }
  }
});

/**
 * GET /api/documents
 * List documents with pagination and filtering
 */
router.get('/', 
  authenticate,
  requirePermission('documents:read'),
  securityManager.getRateLimiter('api'),
  async (req, res) => {
    try {
      // Validate query parameters
      const schema = {
        page: { type: 'string', validate: (v) => !isNaN(parseInt(v)) && parseInt(v) > 0 },
        limit: { type: 'string', validate: (v) => !isNaN(parseInt(v)) && parseInt(v) <= 100 },
        search: { type: 'string', maxLength: 100 },
        folder_id: { type: 'string', maxLength: 36 },
        is_encrypted: { type: 'string', validate: (v) => ['true', 'false'].includes(v) }
      };

      // Sanitize query parameters
      const sanitizedQuery = {};
      for (const [key, value] of Object.entries(req.query)) {
        if (value !== undefined) {
          sanitizedQuery[key] = sanitizeString(value.toString(), { maxLength: 100 });
        }
      }

      try {
        validateRequestStructure(sanitizedQuery, schema);
      } catch (validationError) {
        await auditLog('validation_failed', 'document', req.userId, req.ip, {
          error: validationError.message,
          query: sanitizedQuery
        });
        
        return res.status(400).json({
          success: false,
          error: 'INVALID_QUERY_PARAMETERS',
          message: validationError.message
        });
      }

      // Apply organization isolation
      const filters = {
        organization_id: req.organizationId,
        ...(sanitizedQuery.search && { search: sanitizedQuery.search }),
        ...(sanitizedQuery.folder_id && { folder_id: sanitizedQuery.folder_id }),
        ...(sanitizedQuery.is_encrypted && { is_encrypted: sanitizedQuery.is_encrypted === 'true' })
      };

      const pagination = {
        page: parseInt(sanitizedQuery.page) || 1,
        pageSize: Math.min(parseInt(sanitizedQuery.limit) || 20, 100)
      };

      const result = await documentService.getMany(filters, { pagination });

      if (!result.success) {
        throw new Error(result.message);
      }

      // Log successful access
      await auditLog('documents_listed', 'document', req.userId, req.ip, {
        count: result.data.length,
        filters,
        pagination
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });

    } catch (error) {
      await auditLog('documents_list_error', 'document', req.userId, req.ip, {
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'DOCUMENT_LIST_ERROR',
        message: 'Failed to retrieve documents'
      });
    }
  }
);

/**
 * GET /api/documents/:id
 * Get a specific document with access control
 */
router.get('/:id',
  authenticate,
  requireResourceAccess('document'),
  async (req, res) => {
    try {
      const documentId = sanitizeString(req.params.id, { maxLength: 36 });
      
      // Check if document is encrypted
      const encryptionMetadata = await encryptedDocumentService.getDocumentEncryptionMetadata(documentId);
      
      let result;
      if (encryptionMetadata) {
        // Use encrypted document service
        const userPassword = req.headers['x-user-password'];
        
        if (!userPassword) {
          return res.status(400).json({
            success: false,
            error: 'USER_PASSWORD_REQUIRED',
            message: 'Password required to access encrypted document'
          });
        }

        result = await encryptedDocumentService.getDecryptedDocument(documentId, {
          userId: req.userId,
          userPassword,
          organizationId: req.organizationId,
          includeContent: true,
          auditAccess: true
        });
      } else {
        // Use regular document service
        result = await documentService.getDocument(documentId, {
          organizationId: req.organizationId,
          includeContent: true
        });
      }

      if (!result.success) {
        if (result.error?.code === 'ACCESS_DENIED') {
          await auditLog('document_access_denied', 'document', req.userId, req.ip, {
            documentId,
            reason: 'insufficient_permissions'
          });
          
          return res.status(403).json({
            success: false,
            error: 'ACCESS_DENIED',
            message: 'You do not have permission to access this document'
          });
        }
        
        throw new Error(result.message);
      }

      // Log successful access
      await auditLog('document_accessed', 'document', req.userId, req.ip, {
        documentId,
        isEncrypted: !!encryptionMetadata,
        organizationId: req.organizationId
      });

      res.json({
        success: true,
        data: result.data
      });

    } catch (error) {
      await auditLog('document_access_error', 'document', req.userId, req.ip, {
        documentId: req.params.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'DOCUMENT_ACCESS_ERROR',
        message: 'Failed to access document'
      });
    }
  }
);

/**
 * POST /api/documents
 * Create a new document with optional encryption
 */
router.post('/',
  authenticate,
  requirePermission('documents:write'),
  securityManager.getRateLimiter('api'),
  async (req, res) => {
    try {
      // Validate request body
      const schema = {
        title: { required: true, type: 'string', maxLength: 200 },
        content: { required: true, type: 'string', maxLength: 1000000 },
        description: { type: 'string', maxLength: 1000 },
        folder_id: { type: 'string', maxLength: 36 },
        tags: { type: 'array', maxItems: 10 },
        is_public: { type: 'boolean' },
        encrypt: { type: 'boolean' },
        shareWith: { type: 'array', maxItems: 50 }
      };

      validateRequestStructure(req.body, schema);

      // Sanitize input data
      const documentData = {
        title: sanitizeString(req.body.title, { maxLength: 200 }),
        content: sanitizeString(req.body.content, { maxLength: 1000000, allowHtml: false }),
        description: req.body.description ? sanitizeString(req.body.description, { maxLength: 1000 }) : null,
        folder_id: req.body.folder_id ? sanitizeString(req.body.folder_id, { maxLength: 36 }) : null,
        tags: Array.isArray(req.body.tags) ? 
          req.body.tags.map(tag => sanitizeString(tag, { maxLength: 50 })).slice(0, 10) : [],
        is_public: Boolean(req.body.is_public),
        user_id: req.userId,
        organization_id: req.organizationId
      };

      let result;
      
      // Check if encryption is requested
      if (req.body.encrypt) {
        const userPassword = req.headers['x-user-password'] || req.body.userPassword;
        
        if (!userPassword) {
          return res.status(400).json({
            success: false,
            error: 'USER_PASSWORD_REQUIRED',
            message: 'Password required for document encryption'
          });
        }

        // Use encrypted document service
        result = await encryptedDocumentService.createEncryptedDocument(documentData, {
          recipientUserIds: req.body.shareWith || [],
          encryptContent: true,
          userPassword,
          encryptionMetadata: {
            createdVia: 'api',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
          }
        });
      } else {
        // Use regular document service
        result = await documentService.createDocument(documentData);
      }

      if (!result.success) {
        throw new Error(result.message);
      }

      // Log document creation
      await auditLog('document_created', 'document', req.userId, req.ip, {
        documentId: result.data.id,
        title: documentData.title,
        isEncrypted: Boolean(req.body.encrypt),
        shareWithCount: req.body.shareWith?.length || 0,
        organizationId: req.organizationId
      });

      res.status(201).json({
        success: true,
        data: result.data
      });

    } catch (error) {
      await auditLog('document_creation_error', 'document', req.userId, req.ip, {
        error: error.message,
        title: req.body.title
      });

      if (error.message.includes('validation')) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'DOCUMENT_CREATION_ERROR',
        message: 'Failed to create document'
      });
    }
  }
);

/**
 * PUT /api/documents/:id
 * Update a document with access control
 */
router.put('/:id',
  authenticate,
  requireResourceAccess('document'),
  requirePermission('documents:write'),
  async (req, res) => {
    try {
      const documentId = sanitizeString(req.params.id, { maxLength: 36 });

      // Validate request body
      const schema = {
        title: { type: 'string', maxLength: 200 },
        content: { type: 'string', maxLength: 1000000 },
        description: { type: 'string', maxLength: 1000 },
        tags: { type: 'array', maxItems: 10 },
        is_public: { type: 'boolean' }
      };

      validateRequestStructure(req.body, schema);

      // Sanitize update data
      const updateData = {};
      if (req.body.title) {
        updateData.title = sanitizeString(req.body.title, { maxLength: 200 });
      }
      if (req.body.content) {
        updateData.content = sanitizeString(req.body.content, { maxLength: 1000000, allowHtml: false });
      }
      if (req.body.description !== undefined) {
        updateData.description = req.body.description ? 
          sanitizeString(req.body.description, { maxLength: 1000 }) : null;
      }
      if (req.body.tags) {
        updateData.tags = Array.isArray(req.body.tags) ? 
          req.body.tags.map(tag => sanitizeString(tag, { maxLength: 50 })).slice(0, 10) : [];
      }
      if (req.body.is_public !== undefined) {
        updateData.is_public = Boolean(req.body.is_public);
      }

      // Check if document is encrypted
      const encryptionMetadata = await encryptedDocumentService.getDocumentEncryptionMetadata(documentId);
      
      let result;
      if (encryptionMetadata && updateData.content) {
        const userPassword = req.headers['x-user-password'] || req.body.userPassword;
        
        if (!userPassword) {
          return res.status(400).json({
            success: false,
            error: 'USER_PASSWORD_REQUIRED',
            message: 'Password required to update encrypted document'
          });
        }

        // For encrypted documents, we need to re-encrypt with new content
        // This is a simplified approach - in production, you might want more sophisticated handling
        result = await documentService.updateDocument(documentId, updateData, {
          organizationId: req.organizationId
        });
      } else {
        result = await documentService.updateDocument(documentId, updateData, {
          organizationId: req.organizationId
        });
      }

      if (!result.success) {
        throw new Error(result.message);
      }

      // Log document update
      await auditLog('document_updated', 'document', req.userId, req.ip, {
        documentId,
        updatedFields: Object.keys(updateData),
        isEncrypted: !!encryptionMetadata,
        organizationId: req.organizationId
      });

      res.json({
        success: true,
        data: result.data
      });

    } catch (error) {
      await auditLog('document_update_error', 'document', req.userId, req.ip, {
        documentId: req.params.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'DOCUMENT_UPDATE_ERROR',
        message: 'Failed to update document'
      });
    }
  }
);

/**
 * DELETE /api/documents/:id
 * Delete a document with admin permission check
 */
router.delete('/:id',
  authenticate,
  requireResourceAccess('document'),
  requireRole('admin'),
  async (req, res) => {
    try {
      const documentId = sanitizeString(req.params.id, { maxLength: 36 });

      // Get document info for audit log
      const docResult = await documentService.getDocument(documentId, {
        organizationId: req.organizationId,
        includeContent: false
      });

      if (!docResult.success) {
        return res.status(404).json({
          success: false,
          error: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found'
        });
      }

      const result = await documentService.deleteDocument(documentId, {
        organizationId: req.organizationId
      });

      if (!result.success) {
        throw new Error(result.message);
      }

      // Log document deletion (high-risk event)
      await auditLog('document_deleted', 'document', req.userId, req.ip, {
        documentId,
        title: docResult.data.title,
        organizationId: req.organizationId,
        deletedBy: req.userId
      }, 'medium');

      res.json({
        success: true,
        message: 'Document deleted successfully'
      });

    } catch (error) {
      await auditLog('document_deletion_error', 'document', req.userId, req.ip, {
        documentId: req.params.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'DOCUMENT_DELETION_ERROR',
        message: 'Failed to delete document'
      });
    }
  }
);

/**
 * POST /api/documents/:id/share
 * Share a document with other users
 */
router.post('/:id/share',
  authenticate,
  requireResourceAccess('document'),
  requirePermission('documents:share'),
  async (req, res) => {
    try {
      const documentId = sanitizeString(req.params.id, { maxLength: 36 });

      // Validate request body
      const schema = {
        shareWith: { required: true, type: 'array', minItems: 1, maxItems: 50 },
        permissions: { type: 'array', maxItems: 10 },
        message: { type: 'string', maxLength: 500 }
      };

      validateRequestStructure(req.body, schema);

      // Sanitize share data
      const shareWith = req.body.shareWith.map(userId => 
        sanitizeString(userId, { maxLength: 36 })
      );
      
      const permissions = req.body.permissions || ['read'];
      const message = req.body.message ? 
        sanitizeString(req.body.message, { maxLength: 500 }) : null;

      // Check if document is encrypted
      const encryptionMetadata = await encryptedDocumentService.getDocumentEncryptionMetadata(documentId);
      
      let result;
      if (encryptionMetadata) {
        const userPassword = req.headers['x-user-password'] || req.body.userPassword;
        
        if (!userPassword) {
          return res.status(400).json({
            success: false,
            error: 'USER_PASSWORD_REQUIRED',
            message: 'Password required to share encrypted document'
          });
        }

        result = await encryptedDocumentService.shareEncryptedDocument(documentId, shareWith, {
          userId: req.userId,
          userPassword,
          permissions,
          notifyRecipients: true
        });
      } else {
        // For non-encrypted documents, use regular sharing (would need to implement)
        result = await documentService.shareDocument(documentId, shareWith, {
          permissions,
          sharedBy: req.userId,
          message,
          organizationId: req.organizationId
        });
      }

      if (!result.success) {
        throw new Error(result.message);
      }

      // Log document sharing
      await auditLog('document_shared', 'document', req.userId, req.ip, {
        documentId,
        shareWith,
        permissions,
        isEncrypted: !!encryptionMetadata,
        recipientCount: shareWith.length,
        organizationId: req.organizationId
      });

      res.json({
        success: true,
        data: result.data
      });

    } catch (error) {
      await auditLog('document_sharing_error', 'document', req.userId, req.ip, {
        documentId: req.params.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'DOCUMENT_SHARING_ERROR',
        message: 'Failed to share document'
      });
    }
  }
);

/**
 * POST /api/documents/upload
 * Upload document files with security validation
 */
router.post('/upload',
  authenticate,
  requirePermission('documents:write'),
  securityManager.getRateLimiter('upload'),
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'NO_FILE_PROVIDED',
          message: 'No file was uploaded'
        });
      }

      // Additional file validation
      const fileValidation = await validateFileUpload(req.file, {
        checkMagicBytes: true,
        allowExecutables: false
      });

      if (!fileValidation.isValid) {
        await auditLog('file_upload_rejected', 'document', req.userId, req.ip, {
          filename: req.file.originalname,
          reason: 'validation_failed',
          size: req.file.size
        });

        return res.status(400).json({
          success: false,
          error: 'INVALID_FILE',
          message: 'File validation failed'
        });
      }

      // Process file content based on type
      let content = '';
      try {
        if (req.file.mimetype === 'text/plain') {
          content = req.file.buffer.toString('utf8');
        } else if (req.file.mimetype === 'application/json') {
          content = req.file.buffer.toString('utf8');
          JSON.parse(content); // Validate JSON
        } else {
          content = `[Binary file: ${req.file.originalname}]`;
        }
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          error: 'FILE_PARSE_ERROR',
          message: 'Failed to parse file content'
        });
      }

      // Create document
      const documentData = {
        title: fileValidation.sanitizedFilename,
        content: sanitizeString(content, { maxLength: 1000000, allowHtml: false }),
        description: `Uploaded file: ${req.file.originalname}`,
        user_id: req.userId,
        organization_id: req.organizationId,
        file_metadata: {
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          uploadedAt: new Date().toISOString()
        }
      };

      const result = await documentService.createDocument(documentData);

      if (!result.success) {
        throw new Error(result.message);
      }

      // Log file upload
      await auditLog('file_uploaded', 'document', req.userId, req.ip, {
        documentId: result.data.id,
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        organizationId: req.organizationId
      });

      res.status(201).json({
        success: true,
        data: result.data
      });

    } catch (error) {
      await auditLog('file_upload_error', 'document', req.userId, req.ip, {
        filename: req.file?.originalname,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'FILE_UPLOAD_ERROR',
        message: 'Failed to upload file'
      });
    }
  }
);

// Error handling middleware specific to this router
router.use((error, req, res, next) => {
  // Log the error
  auditLog('document_route_error', 'document', req.userId, req.ip, {
    error: error.message,
    stack: error.stack,
    route: req.originalUrl
  });

  // Return generic error response
  res.status(500).json({
    success: false,
    error: 'INTERNAL_ERROR',
    message: 'An internal error occurred'
  });
});

export default router;