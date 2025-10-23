/**
 * Initialize Default User Script
 * Creates the default user in Supabase Auth and initializes their credits
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_USER_ID = '59b70373-ba68-4d89-8420-5c3723aef01f';
const DEFAULT_EMAIL = 'admin@tala-ai.com';

async function initializeDefaultUser() {
  console.log('🚀 Initializing default user...');
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    // Check if user already exists
    console.log(`🔍 Checking if user ${DEFAULT_USER_ID} exists...`);
    const { data: existingUser, error: getUserError } = await supabase.auth.admin.getUserById(DEFAULT_USER_ID);
    
    if (existingUser && existingUser.user) {
      console.log(`✅ User already exists: ${existingUser.user.email}`);
    } else {
      console.log('📝 Creating new user in auth.users...');
      
      // Create user in Supabase Auth
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        id: DEFAULT_USER_ID,
        email: DEFAULT_EMAIL,
        email_confirm: true,
        user_metadata: {
          full_name: 'Tala AI Admin',
          role: 'super_admin',
          created_at: new Date().toISOString(),
          auto_created: true
        },
        app_metadata: {
          provider: 'local',
          plan_type: 'agent'
        }
      });

      if (createError) {
        throw createError;
      }

      console.log(`✅ User created successfully: ${newUser.user.email}`);
    }

    // Initialize user credits
    console.log('💳 Initializing user credits...');
    
    // Check if user_credits already exist
    const { data: existingCredits, error: creditsCheckError } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', DEFAULT_USER_ID)
      .single();

    if (existingCredits) {
      console.log(`✅ User credits already exist:`);
      console.log(`   Total: ${existingCredits.total_credits}`);
      console.log(`   Used: ${existingCredits.used_credits}`);
      console.log(`   Available: ${existingCredits.total_credits - existingCredits.used_credits}`);
    } else {
      console.log('📝 Creating user_credits record...');
      
      const { data: newCredits, error: creditsError } = await supabase
        .from('user_credits')
        .insert({
          user_id: DEFAULT_USER_ID,
          organization_id: null,
          total_credits: 5000,
          used_credits: 0,
          bonus_credits: 0,
          plan_type: 'agent',
          role: 'super_admin',
          last_reset_date: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (creditsError) {
        console.error('❌ Failed to create user_credits:', creditsError);
        
        // If foreign key error, the user_credits table might not have the right constraints
        if (creditsError.message?.includes('foreign key') || creditsError.code === '23503') {
          console.log('⚠️  Foreign key constraint error - this is expected if auth.users sync is not set up');
          console.log('   Attempting alternative credit initialization...');
          
          // Try without role field
          const { data: retryCredits, error: retryError } = await supabase
            .from('user_credits')
            .insert({
              user_id: DEFAULT_USER_ID,
              organization_id: null,
              total_credits: 5000,
              used_credits: 0,
              bonus_credits: 0,
              plan_type: 'agent',
              last_reset_date: new Date().toISOString(),
              created_at: new Date().toISOString()
            })
            .select()
            .single();
          
          if (retryError) {
            throw retryError;
          }
          
          console.log(`✅ User credits created (without role): ${retryCredits.total_credits} credits`);
        } else {
          throw creditsError;
        }
      } else {
        console.log(`✅ User credits created: ${newCredits.total_credits} credits`);
      }
    }

    console.log('\n✨ Default user initialization complete!');
    console.log(`   User ID: ${DEFAULT_USER_ID}`);
    console.log(`   Email: ${DEFAULT_EMAIL}`);
    console.log('   You can now use this user for testing the credit system');
    
  } catch (error) {
    console.error('❌ Error initializing default user:', error);
    process.exit(1);
  }
}

// Run the script
initializeDefaultUser();
