/**
 * Update Super Admin Role Script
 * Updates the user_credits table to set role='super_admin' for the default super admin user
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_USER_ID = '59b70373-ba68-4d89-8420-5c3723aef01f';

async function updateSuperAdminRole() {
  console.log('🚀 Updating super admin role...');
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    // Check current user_credits
    console.log(`🔍 Checking current user_credits for ${DEFAULT_USER_ID}...`);
    const { data: currentCredits, error: fetchError } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', DEFAULT_USER_ID)
      .single();

    if (fetchError) {
      console.error('❌ Failed to fetch user credits:', fetchError);
      throw fetchError;
    }

    console.log('📊 Current credits data:');
    console.log(`   Role: ${currentCredits.role || 'not set'}`);
    console.log(`   Total: ${currentCredits.total_credits}`);
    console.log(`   Used: ${currentCredits.used_credits}`);
    console.log(`   Available: ${currentCredits.total_credits - currentCredits.used_credits}`);

    // Update role to super_admin
    console.log('\n💾 Updating role to super_admin...');
    const { data: updatedCredits, error: updateError } = await supabase
      .from('user_credits')
      .update({ role: 'super_admin' })
      .eq('user_id', DEFAULT_USER_ID)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Failed to update role:', updateError);
      throw updateError;
    }

    console.log('\n✅ Role updated successfully!');
    console.log('📊 Updated credits data:');
    console.log(`   Role: ${updatedCredits.role}`);
    console.log(`   Total: ${updatedCredits.total_credits}`);
    console.log(`   Used: ${updatedCredits.used_credits}`);
    console.log(`   Available: ${updatedCredits.total_credits - updatedCredits.used_credits}`);

    // Verify auth user metadata
    console.log('\n🔍 Verifying auth user metadata...');
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(DEFAULT_USER_ID);
    
    if (authUser && authUser.user) {
      console.log('✅ Auth user verified:');
      console.log(`   Email: ${authUser.user.email}`);
      console.log(`   Metadata role: ${authUser.user.user_metadata?.role || 'not set'}`);
      
      if (authUser.user.user_metadata?.role !== 'super_admin') {
        console.log('\n💾 Updating auth user metadata...');
        const { data: updatedAuth, error: authUpdateError } = await supabase.auth.admin.updateUserById(
          DEFAULT_USER_ID,
          {
            user_metadata: {
              ...authUser.user.user_metadata,
              role: 'super_admin'
            }
          }
        );

        if (authUpdateError) {
          console.error('❌ Failed to update auth metadata:', authUpdateError);
        } else {
          console.log('✅ Auth metadata updated successfully!');
        }
      }
    }

    console.log('\n✨ Super admin role update complete!');
    console.log(`   User ID: ${DEFAULT_USER_ID}`);
    console.log('   The super admin now has unlimited credits');
    console.log('   They will see "∞ (unlimited)" in the UI');
    
  } catch (error) {
    console.error('❌ Error updating super admin role:', error);
    process.exit(1);
  }
}

// Run the script
updateSuperAdminRole();
