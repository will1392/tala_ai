import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { getSupabaseService } from '../db/supabaseClient.js';
import roleService from '../services/roleService.js';
import creditSystem from '../services/creditSystem.js';

const router = express.Router();

console.log('✅ Admin routes module loaded');

/**
 * Health check endpoint (no auth required for testing)
 */
router.get('/health', (req, res) => {
  console.log('🔵 GET /api/admin/health called');
  res.json({ success: true, message: 'Admin routes are working', timestamp: new Date().toISOString() });
});

/**
 * Test POST endpoint (no auth for debugging)
 */
router.post('/test', (req, res) => {
  console.log('🔵 POST /api/admin/test called');
  console.log('Request body:', req.body);
  res.json({ 
    success: true, 
    method: 'POST',
    message: 'POST route test successful',
    body: req.body
  });
});

// All other admin routes require authentication and admin or super_admin role
router.use(authenticate);
router.use((req, res, next) => {
  if (req.userRole === 'super_admin' || req.userRole === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      error: 'Access denied. Admin or Super Admin role required.'
    });
  }
});

console.log('✅ Admin routes middleware configured');

/**
 * Create a new user account
 */
router.post('/users/create', async (req, res) => {
  console.log('🔵 POST /api/admin/users/create called');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('User ID:', req.userId);
  console.log('User Role:', req.userRole);
  
  try {
    const {
      email,
      password,
      fullName,
      role = 'agent',
      organizationId,
      organizationName,
      planType = 'agent',
      initialCredits,
      sendInvite = true,
      inviteRedirectUrl
    } = req.body;

    console.log('📋 Creating user with role:', role);
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
    
    const supabase = getSupabaseService();
    
    // Determine final organization ID
    // 1. For admin users (non-super_admin), enforce their organization
    // 2. If no organization specified, default to Tala AI parent organization
    const TALA_AI_ORG_ID = '00000000-0000-0000-0000-000000000001';
    let finalOrganizationId = organizationId;
    
    if (req.userRole === 'admin') {
      const { data: userData } = await supabase
        .from('user_credits')
        .select('organization_id')
        .eq('user_id', req.userId)
        .single();
      
      finalOrganizationId = userData?.organization_id || organizationId;
      console.log('📋 Admin user creating user in organization:', finalOrganizationId);
    }
    
    // Default to Tala AI organization if no organization specified
    if (!finalOrganizationId) {
      finalOrganizationId = TALA_AI_ORG_ID;
      console.log('📋 No organization specified, defaulting to Tala AI');
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    if (!sendInvite && !password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required when sendInvite is false'
      });
    }
    
    // Validate role
    const validRoles = ['agent', 'admin', 'agency_owner'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be agent, admin, or agency_owner'
      });
    }
    
    const supabase = getSupabaseService();
    
    const userMetadata = {
      role: role,
      full_name: fullName || email.split('@')[0],
      created_by: req.userId,
      plan_type: planType,
      organization_id: finalOrganizationId || null
    };

    const redirectUrl = inviteRedirectUrl || process.env.SUPABASE_INVITE_REDIRECT_URL;

    let authData;
    let authError;
    let invitationSent = false;

    if (sendInvite) {
      ({ data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo: redirectUrl,
        data: userMetadata
      }));

      if (!authError && authData?.user?.id) {
        // Ensure metadata is persisted on the invited account
        const { error: metadataError } = await supabase.auth.admin.updateUserById(authData.user.id, {
          user_metadata: userMetadata
        });

        if (metadataError) {
          console.warn('⚠️ Failed to persist metadata for invited user:', metadataError);
        }

        invitationSent = true;
      }
    } else {
      const createUserPayload = {
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: userMetadata
      };

      if (redirectUrl) {
        createUserPayload.emailRedirectTo = redirectUrl;
      }

      ({ data: authData, error: authError } = await supabase.auth.admin.createUser(createUserPayload));
    }
    
    if (authError) {
      console.error('Error creating auth user:', authError);
      return res.status(400).json({
        success: false,
        error: authError.message || 'Failed to create user'
      });
    }

    const newUserId = authData?.user?.id;

    if (!newUserId) {
      console.error('Supabase did not return a user ID after creation. Response:', authData);
      return res.status(500).json({
        success: false,
        error: 'Failed to create user in authentication service'
      });
    }
    
    // 2. Initialize user credits
    // First check if user_credits already exist (might be created by trigger)
    const { data: existingCredits } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', newUserId)
      .single();
    
    const creditsToAllocate = initialCredits || (planType === 'agency' ? 10000 : 5000);
    
    let creditsData, creditsError;
    
    if (existingCredits) {
      // Update existing credits
      const { data, error } = await supabase
        .from('user_credits')
        .update({
          total_credits: creditsToAllocate,
          plan_type: planType,
          role: role,
          full_name: fullName || email.split('@')[0],
          organization_id: finalOrganizationId || null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', newUserId)
        .select()
        .single();
      
      creditsData = data;
      creditsError = error;
    } else {
      // Create new credits
      const { data, error } = await supabase
        .from('user_credits')
        .insert({
          id: crypto.randomUUID(),
          user_id: newUserId,
          full_name: fullName || email.split('@')[0],
          organization_id: finalOrganizationId || null,
          total_credits: creditsToAllocate,
          used_credits: 0,
          bonus_credits: 0,
          plan_type: planType,
          role: role,
          billing_cycle: 'monthly',
          last_reset_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      creditsData = data;
      creditsError = error;
    }
      
    if (creditsError) {
      console.error('Error creating user credits:', creditsError);
      console.error('Credits error details:', {
        code: creditsError.code,
        message: creditsError.message,
        details: creditsError.details,
        hint: creditsError.hint
      });
      
      // Try to clean up the auth user
      await supabase.auth.admin.deleteUser(newUserId);
      
      return res.status(500).json({
        success: false,
        error: 'Failed to initialize user credits',
        details: creditsError.message,
        hint: creditsError.hint || 'Check if all required fields are present and foreign key constraints are satisfied'
      });
    }
    
    // 3. If creating an agency owner, create an organization if name provided
    let organization = null;
    let createdOrganizationId = finalOrganizationId;
    
    if (role === 'agency_owner' && !finalOrganizationId && organizationName) {
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: organizationName,
          owner_id: newUserId,
          description: `Organization for ${fullName || email}`,
          settings: {
            created_by_admin: req.userId
          }
        })
        .select()
        .single();
        
      if (orgData && !orgError) {
        organization = orgData;
        createdOrganizationId = orgData.id;
        
        // Update user_credits with the new organization ID
        await supabase
          .from('user_credits')
          .update({ organization_id: orgData.id })
          .eq('user_id', newUserId);
      }
    }
    
    res.json({
      success: true,
      data: {
        userId: newUserId,
        email: email,
        fullName: fullName || email.split('@')[0],
        role: role,
        planType: planType,
        credits: creditsToAllocate,
        organizationId: createdOrganizationId,
        organizationName: organization?.name || organizationName,
        message: 'User created successfully',
        invitationSent: invitationSent
      }
    });
    
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user'
    });
  }
});

/**
 * List all users with pagination
 */
/**
 * Delete a user
 */
router.delete('/users/:userId', async (req, res) => {
  console.log('🔵 DELETE /api/admin/users/:userId called');
  console.log('User ID to delete:', req.params.userId);
  console.log('Requesting user:', req.userId);
  
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const supabase = getSupabaseService();
    
    // Delete from user_credits first (has FK to auth.users)
    const { error: creditsError } = await supabase
      .from('user_credits')
      .delete()
      .eq('user_id', userId);
    
    if (creditsError) {
      console.error('Error deleting user credits:', creditsError);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete user credits',
        details: creditsError.message
      });
    }
    
    // Delete from auth.users
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    
    if (authError) {
      console.error('Error deleting auth user:', authError);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete user from authentication',
        details: authError.message
      });
    }
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
});

/**
 * List all users
 */
router.get('/users', async (req, res) => {
  try {
    console.log('Admin users endpoint called');
    console.log('User role:', req.userRole);
    console.log('User ID:', req.userId);
    
    const { page = 1, limit = 20, role, organizationId } = req.query;
    const offset = (page - 1) * limit;
    
    const supabase = getSupabaseService();
    
    // For non-super_admin, get their organization_id
    let userOrgId = null;
    if (req.userRole === 'admin') {
      const { data: userData } = await supabase
        .from('user_credits')
        .select('organization_id')
        .eq('user_id', req.userId)
        .single();
      
      userOrgId = userData?.organization_id;
      console.log('Admin user organization_id:', userOrgId);
    }
    
    // Build query - explicitly select all fields including full_name
    let query = supabase
      .from('user_credits')
      .select('id, user_id, role, plan_type, total_credits, used_credits, bonus_credits, organization_id, created_at, full_name, billing_cycle, last_reset_date, updated_at', { count: 'exact' });
    
    // Apply filters
    if (role) {
      query = query.eq('role', role);
    }
    
    // For admin users (non-super_admin), only show users in their organization
    if (req.userRole === 'admin' && userOrgId) {
      query = query.eq('organization_id', userOrgId);
    } else if (organizationId) {
      // For super_admin, allow filtering by organizationId from query params
      query = query.eq('organization_id', organizationId);
    }
    
    // Apply pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    
    console.log('User credits query result:', { 
      dataLength: data?.length, 
      count, 
      error: error?.message 
    });
    
    if (error) {
      throw error;
    }
    
    // Now fetch user emails for each user_credit record
    const enrichedData = [];
    if (data && data.length > 0) {
      console.log(`Enriching ${data.length} user records...`);
      console.log('First user credit record:', data[0]);
      for (const userCredit of data) {
        // Get user email from auth.users
        let userInfo = null;
        try {
          const { data: userData } = await supabase.auth.admin.getUserById(userCredit.user_id);
          if (userData?.user) {
            userInfo = {
              email: userData.user.email,
              full_name: userData.user.user_metadata?.full_name || userCredit.full_name || null,
              created_at: userData.user.created_at
            };
          }
        } catch (err) {
          console.error(`Failed to fetch user ${userCredit.user_id}:`, err.message);
        }
        
        // Get organization name if exists
        let organization = null;
        if (userCredit.organization_id) {
          try {
            const { data: orgData } = await supabase
              .from('organizations')
              .select('name')
              .eq('id', userCredit.organization_id)
              .single();
            organization = orgData;
          } catch (err) {
            console.error(`Failed to fetch org ${userCredit.organization_id}:`, err.message);
          }
        }
        
        enrichedData.push({
          ...userCredit,
          user: userInfo,
          organization
        });
      }
    }
    
    res.json({
      success: true,
      data: enrichedData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
    
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list users'
    });
  }
});

/**
 * Update user role or credits
 */
router.put('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, planType, totalCredits, bonusCredits, organizationId } = req.body;
    
    const supabase = getSupabaseService();
    
    // Build update object
    const updates = {};
    if (role) updates.role = role;
    if (planType) updates.plan_type = planType;
    if (totalCredits !== undefined) updates.total_credits = totalCredits;
    if (bonusCredits !== undefined) updates.bonus_credits = bonusCredits;
    if (organizationId !== undefined) updates.organization_id = organizationId;
    
    const { data, error } = await supabase
      .from('user_credits')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();
      
    if (error) {
      throw error;
    }
    
    res.json({
      success: true,
      data: data,
      message: 'User updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
});

/**
 * Delete user (soft delete - deactivates auth account)
 */
router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Don't allow deleting yourself
    if (userId === req.userId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account'
      });
    }
    
    const supabase = getSupabaseService();
    
    // Soft delete by banning the user
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      ban_duration: '876000h' // 100 years
    });
    
    if (error) {
      throw error;
    }
    
    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
    
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
});

/**
 * Get system statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const supabase = getSupabaseService();
    
    // Get user counts by role
    const { data: roleStats } = await supabase
      .from('user_credits')
      .select('role')
      .then(result => {
        const counts = {};
        result.data?.forEach(item => {
          counts[item.role] = (counts[item.role] || 0) + 1;
        });
        return { data: counts };
      });
    
    // Get total credits in system
    const { data: creditStats } = await supabase
      .from('user_credits')
      .select('total_credits, used_credits, bonus_credits');
    
    const totalCredits = creditStats?.reduce((sum, item) => 
      sum + item.total_credits + item.bonus_credits, 0) || 0;
    const usedCredits = creditStats?.reduce((sum, item) => 
      sum + item.used_credits, 0) || 0;
    
    // Get organization count
    const { count: orgCount } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true });
    
    res.json({
      success: true,
      data: {
        users: {
          total: creditStats?.length || 0,
          byRole: roleStats || {},
          active: creditStats?.length || 0 // Could be refined with last login data
        },
        credits: {
          total: totalCredits,
          used: usedCredits,
          available: totalCredits - usedCredits
        },
        organizations: {
          total: orgCount || 0
        }
      }
    });
    
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics'
    });
  }
});

export default router;