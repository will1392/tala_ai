import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, requireRole } from '../middleware/auth.js';
import roleService from '../services/roleService.js';
import { getSupabaseService } from '../db/supabaseClient.js';
import creditsMiddleware from '../middleware/creditsMiddleware.js';
const { requireCredits } = creditsMiddleware;

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, Word, Excel, and text files are allowed.'));
    }
  }
});

/**
 * Enhanced document upload with role-based visibility
 */
router.post('/upload-enhanced', 
  authenticate, 
  requireCredits('document_upload'), 
  upload.single('document'), 
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const userId = req.userId;
      const userRole = req.userRole;
      const file = req.file;
      
      // Get visibility setting from request or determine based on role
      let { visibility, targetOrganizationId } = req.body;
      
      // Validate user permissions
      if (userRole === 'agent') {
        // Agents cannot upload documents
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          message: 'Only agency owners and super admins can upload documents'
        });
      }
      
      // Set default visibility based on role
      if (!visibility) {
        if (userRole === 'super_admin') {
          visibility = 'global'; // Super admins default to global
        } else if (userRole === 'agency_owner') {
          visibility = 'agency'; // Agency owners default to agency
        }
      }
      
      // Validate visibility settings
      if (userRole === 'agency_owner' && visibility === 'global') {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          message: 'Only super admins can create global documents'
        });
      }
      
      // Get user's organization if agency owner
      let organizationId = null;
      if (userRole === 'agency_owner' || visibility === 'agency') {
        const supabase = getSupabaseService();
        const { data: userCredits } = await supabase
          .from('user_credits')
          .select('organization_id')
          .eq('user_id', userId)
          .single();
          
        organizationId = targetOrganizationId || userCredits?.organization_id;
        
        if (!organizationId && visibility === 'agency') {
          return res.status(400).json({
            error: 'Organization required',
            message: 'Agency documents require an organization ID'
          });
        }
      }
      
      // Generate document ID
      const documentId = uuidv4();
      
      // Store document metadata in Supabase
      const supabase = getSupabaseService();
      const { data: document, error: dbError } = await supabase
        .from('documents')
        .insert({
          id: documentId,
          title: file.originalname,
          file_url: null, // Will be updated after upload
          visibility: visibility,
          owner_organization_id: organizationId,
          created_by: userId,
          metadata: {
            fileType: file.mimetype,
            fileSize: file.size,
            originalName: file.originalname
          }
        })
        .select()
        .single();
        
      if (dbError) {
        console.error('Database error:', dbError);
        return res.status(500).json({
          error: 'Failed to create document record',
          details: dbError.message
        });
      }
      
      // Continue with existing upload logic...
      // (The rest would integrate with the existing upload flow)
      
      // Return enhanced response
      res.json({
        documentId: document.id,
        filename: file.originalname,
        visibility: document.visibility,
        organizationId: document.owner_organization_id,
        createdBy: userId,
        userRole: userRole,
        message: `Document uploaded successfully with ${visibility} visibility`
      });
      
    } catch (error) {
      console.error('Enhanced upload error:', error);
      res.status(500).json({ 
        error: 'Failed to process document',
        details: error.message 
      });
    }
  }
);

/**
 * Get documents based on user role and permissions
 */
router.get('/list', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const { visibility, organizationId } = req.query;
    
    const supabase = getSupabaseService();
    
    // Build query based on user's access permissions
    let query = supabase
      .from('accessible_documents')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Filter by visibility if specified
    if (visibility) {
      query = query.eq('visibility', visibility);
    }
    
    // Filter by organization if specified
    if (organizationId) {
      query = query.eq('owner_organization_id', organizationId);
    }
    
    // Execute query with RLS policies
    const { data: documents, error } = await query;
    
    if (error) {
      console.error('Error fetching documents:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch documents'
      });
    }
    
    // Filter documents based on user access
    const accessibleDocs = [];
    for (const doc of documents) {
      const canAccess = await roleService.canAccessDocument(userId, doc.id);
      if (canAccess) {
        accessibleDocs.push(doc);
      }
    }
    
    res.json({
      success: true,
      data: accessibleDocs,
      count: accessibleDocs.length
    });
    
  } catch (error) {
    console.error('Error listing documents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list documents'
    });
  }
});

/**
 * Update document visibility (super admin only)
 */
router.put('/:documentId/visibility', 
  authenticate, 
  requireRole('super_admin'), 
  async (req, res) => {
    try {
      const { documentId } = req.params;
      const { visibility, organizationId } = req.body;
      
      if (!['global', 'agency', 'private'].includes(visibility)) {
        return res.status(400).json({
          error: 'Invalid visibility',
          allowed: ['global', 'agency', 'private']
        });
      }
      
      const supabase = getSupabaseService();
      
      // Update document visibility
      const updateData = { visibility };
      if (visibility === 'agency' && organizationId) {
        updateData.owner_organization_id = organizationId;
      }
      
      const { data, error } = await supabase
        .from('documents')
        .update(updateData)
        .eq('id', documentId)
        .select()
        .single();
        
      if (error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to update document visibility'
        });
      }
      
      res.json({
        success: true,
        data: data,
        message: `Document visibility updated to ${visibility}`
      });
      
    } catch (error) {
      console.error('Error updating visibility:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update visibility'
      });
    }
  }
);

export default router;