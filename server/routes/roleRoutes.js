import express from 'express';
import roleService from '../services/roleService.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All role routes require authentication
router.use(authenticate);

/**
 * Get current user's role
 */
router.get('/my-role', async (req, res) => {
  try {
    const role = await roleService.getUserRole(req.userId);
    
    res.json({
      success: true,
      data: {
        userId: req.userId,
        role: role
      }
    });
  } catch (error) {
    console.error('Error getting user role:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user role'
    });
  }
});

/**
 * Get all super admins (requires super admin role)
 */
router.get('/super-admins', requireRole('super_admin'), async (req, res) => {
  try {
    const result = await roleService.getSuperAdmins();
    
    if (!result.success) {
      return res.status(500).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error getting super admins:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get super admins'
    });
  }
});

/**
 * Grant super admin privileges (requires super admin role)
 */
router.post('/grant-super-admin', requireRole('super_admin'), async (req, res) => {
  try {
    const { targetUserId } = req.body;
    
    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        error: 'Target user ID is required'
      });
    }
    
    const result = await roleService.grantSuperAdmin(targetUserId, req.userId);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json({
      success: true,
      message: 'Super admin privileges granted successfully'
    });
  } catch (error) {
    console.error('Error granting super admin:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to grant super admin privileges'
    });
  }
});

/**
 * Revoke super admin privileges (requires super admin role)
 */
router.post('/revoke-super-admin', requireRole('super_admin'), async (req, res) => {
  try {
    const { targetUserId } = req.body;
    
    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        error: 'Target user ID is required'
      });
    }
    
    const result = await roleService.revokeSuperAdmin(targetUserId, req.userId);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json({
      success: true,
      message: 'Super admin privileges revoked successfully'
    });
  } catch (error) {
    console.error('Error revoking super admin:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke super admin privileges'
    });
  }
});

/**
 * Update user role (requires super admin role)
 */
router.put('/user/:userId/role', requireRole('super_admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    if (!role) {
      return res.status(400).json({
        success: false,
        error: 'Role is required'
      });
    }
    
    const validRoles = ['agent', 'agency_owner'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be one of: ' + validRoles.join(', ')
      });
    }
    
    const result = await roleService.updateUserRole(userId, role);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json({
      success: true,
      message: 'User role updated successfully'
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user role'
    });
  }
});

/**
 * Check document access
 */
router.get('/document/:documentId/access', async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const canAccess = await roleService.canAccessDocument(req.userId, documentId);
    
    res.json({
      success: true,
      data: {
        documentId,
        canAccess,
        userId: req.userId,
        userRole: req.userRole
      }
    });
  } catch (error) {
    console.error('Error checking document access:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check document access'
    });
  }
});

export default router;