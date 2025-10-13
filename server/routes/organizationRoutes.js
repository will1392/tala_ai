import express from 'express';
import { getSupabaseService } from '../db/supabaseClient.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// All organization management routes require super_admin
router.use(requireRole('super_admin'));

console.log('✅ Organization routes middleware configured');

/**
 * Create a new organization
 */
router.post('/create', async (req, res) => {
  console.log('🔵 POST /api/organizations/create called');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    const { name, slug, type = 'agency', ownerId, settings = {} } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Organization name is required'
      });
    }
    
    if (!slug) {
      return res.status(400).json({
        success: false,
        error: 'Organization slug is required'
      });
    }
    
    const supabase = getSupabaseService();
    
    // Create organization
    const { data, error } = await supabase
      .from('organizations')
      .insert({
        name,
        slug,
        type,
        owner_id: ownerId || null,
        is_active: true,
        settings,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating organization:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create organization',
        details: error.message
      });
    }
    
    res.json({
      success: true,
      data: data
    });
    
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create organization'
    });
  }
});

/**
 * List all organizations
 */
router.get('/', async (req, res) => {
  try {
    console.log('🔵 GET /api/organizations called');
    const { page = 1, limit = 50, type, isActive = true } = req.query;
    const offset = (page - 1) * limit;
    
    const supabase = getSupabaseService();
    
    let query = supabase
      .from('organizations')
      .select('*', { count: 'exact' });
    
    // Apply filters
    if (type) {
      query = query.eq('type', type);
    }
    if (isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true' || isActive === true);
    }
    
    // Apply pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      throw error;
    }
    
    res.json({
      success: true,
      data: data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
    
  } catch (error) {
    console.error('Error listing organizations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list organizations'
    });
  }
});

/**
 * Get organization by ID
 */
router.get('/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;
    
    const supabase = getSupabaseService();
    
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();
    
    if (error) {
      throw error;
    }
    
    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      });
    }
    
    res.json({
      success: true,
      data: data
    });
    
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch organization'
    });
  }
});

/**
 * Update organization
 */
router.put('/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { name, slug, type, ownerId, isActive, settings } = req.body;
    
    const supabase = getSupabaseService();
    
    const updates = {
      updated_at: new Date().toISOString()
    };
    
    if (name !== undefined) updates.name = name;
    if (slug !== undefined) updates.slug = slug;
    if (type !== undefined) updates.type = type;
    if (ownerId !== undefined) updates.owner_id = ownerId;
    if (isActive !== undefined) updates.is_active = isActive;
    if (settings !== undefined) updates.settings = settings;
    
    const { data, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', organizationId)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    res.json({
      success: true,
      data: data
    });
    
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update organization'
    });
  }
});

/**
 * Delete organization (soft delete by setting is_active to false)
 */
router.delete('/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;
    
    const supabase = getSupabaseService();
    
    // Soft delete
    const { data, error } = await supabase
      .from('organizations')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', organizationId)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    res.json({
      success: true,
      message: 'Organization deactivated successfully',
      data: data
    });
    
  } catch (error) {
    console.error('Error deleting organization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete organization'
    });
  }
});

export default router;
