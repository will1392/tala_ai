#!/usr/bin/env node

/**
 * Test User Credit Management Script
 * 
 * This script helps manage credits for test/development users.
 * It can:
 * 1. Check existing user credits
 * 2. Add credits to specific users
 * 3. Create test users with high credit allocations
 * 4. Grant super_admin status to users for unlimited credits
 */

import { getSupabaseService } from '../db/supabaseClient.js';
import CreditSystem from '../services/creditSystem.js';
import roleService from '../services/roleService.js';

const supabase = getSupabaseService();
const creditSystem = new CreditSystem();

class TestUserCreditManager {
  async checkUserCredits(userId) {
    console.log(`\n🔍 Checking credits for user: ${userId}`);
    
    try {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        console.log('❌ Invalid UUID format. User IDs must be valid UUIDs.');
        return null;
      }

      const credits = await creditSystem.getUserCredits(userId);
      if (credits.success) {
        const data = credits.data;
        console.log('✅ User found:');
        console.log(`   Available Credits: ${data.available_credits}`);
        console.log(`   Total Credits: ${data.total_credits}`);
        console.log(`   Used Credits: ${data.used_credits}`);
        console.log(`   Bonus Credits: ${data.bonus_credits}`);
        console.log(`   Role: ${data.role}`);
        console.log(`   Plan Type: ${data.plan_type}`);
        
        const isSuperAdmin = await roleService.isSuperAdmin(userId);
        console.log(`   Super Admin: ${isSuperAdmin ? '✅' : '❌'}`);
        
        return data;
      } else {
        console.log('❌ User not found in credit system');
        return null;
      }
    } catch (error) {
      console.error('❌ Error checking user credits:', error.message);
      return null;
    }
  }

  async addCreditsToUser(userId, amount, reason = 'Development testing') {
    console.log(`\n💰 Adding ${amount} credits to user: ${userId}`);
    
    const result = await creditSystem.addBonusCredits(userId, amount, reason);
    if (result.success) {
      console.log(`✅ Added ${result.creditsAdded} bonus credits`);
      console.log(`   New bonus total: ${result.newBonusTotal}`);
      return true;
    } else {
      console.error('❌ Failed to add credits:', result.error);
      return false;
    }
  }

  async grantSuperAdminStatus(userId, grantedByUserId) {
    console.log(`\n👑 Granting super_admin status to user: ${userId}`);
    
    const result = await roleService.grantSuperAdmin(userId, grantedByUserId);
    if (result.success) {
      console.log('✅ Super admin status granted');
      
      // Also update the user_credits table
      try {
        await supabase
          .from('user_credits')
          .update({ role: 'super_admin' })
          .eq('user_id', userId);
        console.log('✅ Updated role in user_credits table');
      } catch (error) {
        console.log('⚠️  Note: Could not update user_credits table role');
      }
      
      return true;
    } else {
      console.error('❌ Failed to grant super admin:', result.error);
      return false;
    }
  }

  async createTestUser(email, fullName = null, role = 'agent', initialCredits = 100000) {
    console.log(`\n🆕 Creating test user: ${email}`);
    console.log(`   Role: ${role}`);
    console.log(`   Initial Credits: ${initialCredits}`);
    
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: 'test-password-123',
        email_confirm: true,
        user_metadata: {
          role: role,
          full_name: fullName || email.split('@')[0],
          created_for: 'development_testing'
        }
      });
      
      if (authError) {
        console.error('❌ Failed to create auth user:', authError.message);
        return null;
      }
      
      const newUserId = authData.user.id;
      console.log(`✅ Created auth user with ID: ${newUserId}`);
      
      // Initialize credits
      const creditsResult = await creditSystem.initializeUserCredits(newUserId, null, 'agent');
      if (!creditsResult.success) {
        console.error('❌ Failed to initialize credits:', creditsResult.error);
        return null;
      }
      
      // Add bonus credits for testing
      await this.addCreditsToUser(newUserId, initialCredits, 'Development test user setup');
      
      // Grant super admin if requested
      if (role === 'super_admin') {
        // Find an existing super admin to grant from
        const { data: existingSuperAdmin } = await supabase
          .from('user_credits')
          .select('user_id')
          .eq('role', 'super_admin')
          .limit(1)
          .single();
        
        if (existingSuperAdmin) {
          await this.grantSuperAdminStatus(newUserId, existingSuperAdmin.user_id);
        }
      }
      
      console.log(`✅ Test user created successfully!`);
      console.log(`   User ID: ${newUserId}`);
      console.log(`   Email: ${email}`);
      console.log(`   Password: test-password-123`);
      
      return newUserId;
    } catch (error) {
      console.error('❌ Error creating test user:', error.message);
      return null;
    }
  }

  async showHelp() {
    console.log(`
🛠️  Test User Credit Management Tool

Available commands:
  node scripts/manage-test-user-credits.js check <user-id>
  node scripts/manage-test-user-credits.js add-credits <user-id> <amount>
  node scripts/manage-test-user-credits.js grant-super-admin <user-id>
  node scripts/manage-test-user-credits.js create-test-user <email> [role] [credits]

Examples:
  # Check credits for a user
  node scripts/manage-test-user-credits.js check 59b70373-ba68-4d89-8420-5c3723aef01f

  # Add 500,000 credits to a user
  node scripts/manage-test-user-credits.js add-credits 59b70373-ba68-4d89-8420-5c3723aef01f 500000

  # Grant super admin status (unlimited credits)
  node scripts/manage-test-user-credits.js grant-super-admin 59b70373-ba68-4d89-8420-5c3723aef01f

  # Create a new test user with super admin status
  node scripts/manage-test-user-credits.js create-test-user test@example.com super_admin 1000000

Notes:
- Super admin users have unlimited credits and bypass all credit checks
- User IDs must be valid UUIDs
- For development, consider using super_admin role for unlimited access
- test_user_123 is not a valid UUID - use the created user ID instead
`);
  }
}

async function main() {
  const manager = new TestUserCreditManager();
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help') {
    await manager.showHelp();
    return;
  }

  switch (command) {
    case 'check':
      if (!args[1]) {
        console.log('❌ Please provide a user ID');
        return;
      }
      await manager.checkUserCredits(args[1]);
      break;

    case 'add-credits':
      if (!args[1] || !args[2]) {
        console.log('❌ Please provide user ID and credit amount');
        return;
      }
      await manager.addCreditsToUser(args[1], parseInt(args[2]));
      break;

    case 'grant-super-admin':
      if (!args[1]) {
        console.log('❌ Please provide a user ID');
        return;
      }
      // Use the existing super admin as granter
      const existingSuperAdmin = '59b70373-ba68-4d89-8420-5c3723aef01f';
      await manager.grantSuperAdminStatus(args[1], existingSuperAdmin);
      break;

    case 'create-test-user':
      if (!args[1]) {
        console.log('❌ Please provide an email address');
        return;
      }
      const email = args[1];
      const role = args[2] || 'agent';
      const credits = parseInt(args[3]) || 100000;
      await manager.createTestUser(email, null, role, credits);
      break;

    default:
      console.log(`❌ Unknown command: ${command}`);
      await manager.showHelp();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default TestUserCreditManager;