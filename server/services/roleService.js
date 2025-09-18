import { getSupabaseService } from '../db/supabaseClient.js';

class RoleService {
  constructor() {
    this.roleCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get user role with caching
   */
  async getUserRole(userId) {
    // Check cache first
    const cached = this.roleCache.get(userId);
    if (cached && cached.expiry > Date.now()) {
      return cached.role;
    }

    try {
      // Call the database function to get user role
      const supabase = getSupabaseService();
      const { data, error } = await supabase
        .rpc('get_user_role', { user_id: userId });

      if (error) {
        console.error('Error fetching user role:', error);
        return 'agent'; // Default role
      }

      const role = data || 'agent';
      
      // Cache the result
      this.roleCache.set(userId, {
        role,
        expiry: Date.now() + this.cacheTimeout
      });

      return role;
    } catch (error) {
      console.error('Error in getUserRole:', error);
      return 'agent';
    }
  }

  /**
   * Check if user is super admin
   */
  async isSuperAdmin(userId) {
    const role = await this.getUserRole(userId);
    return role === 'super_admin';
  }

  /**
   * Check if user is agency owner
   */
  async isAgencyOwner(userId) {
    const role = await this.getUserRole(userId);
    return role === 'agency_owner' || role === 'super_admin';
  }

  /**
   * Grant super admin privileges
   */
  async grantSuperAdmin(targetUserId, grantedByUserId) {
    try {
      const supabase = getSupabaseService();
      const { data, error } = await supabase
        .rpc('grant_super_admin', {
          target_user_id: targetUserId,
          granted_by_id: grantedByUserId
        });

      if (error) {
        throw error;
      }

      // Clear cache for the target user
      this.roleCache.delete(targetUserId);

      return { success: true };
    } catch (error) {
      console.error('Error granting super admin:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to grant super admin privileges' 
      };
    }
  }

  /**
   * Revoke super admin privileges
   */
  async revokeSuperAdmin(targetUserId, revokedByUserId) {
    try {
      const supabase = getSupabaseService();
      const { data, error } = await supabase
        .rpc('revoke_super_admin', {
          target_user_id: targetUserId,
          revoked_by_id: revokedByUserId
        });

      if (error) {
        throw error;
      }

      // Clear cache for the target user
      this.roleCache.delete(targetUserId);

      return { success: true };
    } catch (error) {
      console.error('Error revoking super admin:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to revoke super admin privileges' 
      };
    }
  }

  /**
   * Update user role
   */
  async updateUserRole(userId, newRole) {
    try {
      const validRoles = ['agent', 'agency_owner', 'super_admin'];
      if (!validRoles.includes(newRole)) {
        throw new Error('Invalid role');
      }

      const supabase = getSupabaseService();
      const { error } = await supabase
        .from('user_credits')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      // Clear cache
      this.roleCache.delete(userId);

      return { success: true };
    } catch (error) {
      console.error('Error updating user role:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to update user role' 
      };
    }
  }

  /**
   * Get all super admins
   */
  async getSuperAdmins() {
    try {
      const supabase = getSupabaseService();
      const { data, error } = await supabase
        .from('super_admins')
        .select(`
          *,
          user:auth.users!user_id(email),
          granter:auth.users!granted_by(email)
        `)
        .eq('is_active', true);

      if (error) {
        throw error;
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error fetching super admins:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to fetch super admins' 
      };
    }
  }

  /**
   * Check document access
   */
  async canAccessDocument(userId, documentId) {
    try {
      const supabase = getSupabaseService();
      const { data, error } = await supabase
        .rpc('can_access_document', {
          user_id: userId,
          document_id: documentId
        });

      if (error) {
        console.error('Error checking document access:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error('Error in canAccessDocument:', error);
      return false;
    }
  }

  /**
   * Clear role cache for a user
   */
  clearUserCache(userId) {
    this.roleCache.delete(userId);
  }

  /**
   * Clear entire role cache
   */
  clearAllCache() {
    this.roleCache.clear();
  }
}

export default new RoleService();