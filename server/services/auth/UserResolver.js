/**
 * UserResolver - Handles user ID resolution and ensures proper UUID usage
 * 
 * This service ensures that the application uses proper UUIDs for users
 * while maintaining backward compatibility with string IDs
 */

import { v4 as uuidv4 } from 'uuid';
import { getSupabaseService } from '../../db/supabaseClient.js';

class UserResolver {
  constructor() {
    this.userCache = new Map();
    this.initialized = false;
    // Default UUIDs for system users - FIXED mappings to ensure consistency
    this.systemUsers = {
      'default': '00000000-0000-0000-0000-000000000001',
      'test_user': '00000000-0000-0000-0000-000000000002',
      'demo_user': '00000000-0000-0000-0000-000000000003',
      'admin-1': '11111111-1111-1111-1111-111111111111', // Fixed UUID for admin-1
      'admin': '11111111-1111-1111-1111-111111111111'    // Same UUID for admin
    };
    this.defaultOrgId = '00000000-0000-0000-0000-000000000001';
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      const supabase = getSupabaseService();
      
      // Ensure default organization exists with all required fields
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', this.defaultOrgId)
        .single();
      
      if (!orgData || orgError) {
        // Organization doesn't exist, create it
        await supabase.from('organizations').insert({
          id: this.defaultOrgId,
          name: 'Default Organization',
          slug: `default-${Date.now()}`, // Unique slug to avoid conflicts
          settings: {},
          metadata: {}
        });
      }
      
      // Ensure system users exist
      const users = [
        {
          id: this.systemUsers.test_user,
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          display_name: 'Test User',
          organization_id: this.defaultOrgId,
          role: 'member',
          status: 'active'
        },
        {
          id: this.systemUsers.demo_user,
          email: 'demo@example.com',
          first_name: 'Demo',
          last_name: 'User',
          display_name: 'Demo User',
          organization_id: this.defaultOrgId,
          role: 'member',
          status: 'active'
        },
        {
          id: this.systemUsers['admin-1'],
          email: 'admin@tala.ai',
          first_name: 'Admin',
          last_name: 'User',
          display_name: 'Will',
          organization_id: this.defaultOrgId,
          role: 'admin',
          status: 'active',
          metadata: {
            originalId: 'admin-1',
            isAdmin: true
          }
        }
      ];
      
      for (const user of users) {
        await supabase.from('users').upsert(user);
      }
      
      this.initialized = true;
      console.log('✅ UserResolver initialized with proper UUIDs');
    } catch (error) {
      console.error('Failed to initialize UserResolver:', error);
    }
  }

  /**
   * Resolve a user ID to a proper UUID
   * Creates user if needed
   */
  async resolveUserId(userId) {
    if (!userId) {
      return this.systemUsers.test_user; // Default user
    }

    // Check if already a valid UUID
    if (this.isValidUUID(userId)) {
      return userId;
    }

    // Check cache
    if (this.userCache.has(userId)) {
      return this.userCache.get(userId);
    }

    // Check system users
    if (this.systemUsers[userId]) {
      return this.systemUsers[userId];
    }

    // Create or get user from database
    const userUUID = await this.ensureUserExists(userId);
    this.userCache.set(userId, userUUID);
    
    return userUUID;
  }

  /**
   * Ensure a user exists in the database
   */
  async ensureUserExists(userId) {
    const supabase = getSupabaseService();
    
    // First, try to find existing user by email or metadata
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .or(`email.eq.${userId}@example.com,metadata->userId.eq.${userId}`)
      .single();
    
    if (existingUser) {
      return existingUser.id;
    }
    
    // Create new user with proper UUID
    const newUserId = uuidv4();
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        id: newUserId,
        email: `${userId}@example.com`,
        first_name: userId,
        last_name: 'User',
        display_name: userId,
        organization_id: this.defaultOrgId,
        role: 'member',
        status: 'active',
        metadata: { 
          originalId: userId,
          source: 'auto-created' 
        }
      })
      .select()
      .single();
    
    if (error) {
      // If user already exists, try to fetch it
      if (error.code === '23505') { // Duplicate key error
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', `${userId}@example.com`)
          .single();
        
        if (existingUser) {
          console.log(`Found existing user for ${userId}: ${existingUser.id}`);
          return existingUser.id;
        }
      }
      
      console.error('Failed to create user:', error);
      // Return test user as fallback
      return this.systemUsers.test_user;
    }
    
    return newUser.id;
  }

  /**
   * Resolve organization ID
   */
  async resolveOrgId(orgId) {
    if (!orgId || orgId === 'default') {
      return this.defaultOrgId;
    }
    
    if (this.isValidUUID(orgId)) {
      return orgId;
    }
    
    // For now, always use default org
    // In production, you'd create/lookup orgs properly
    return this.defaultOrgId;
  }

  /**
   * Check if string is a valid UUID
   */
  isValidUUID(str) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }
}

// Export singleton instance
export const userResolver = new UserResolver();

// Initialize on import
userResolver.initialize().catch(console.error);

export default userResolver;