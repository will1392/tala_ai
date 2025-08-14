#!/usr/bin/env node

/**
 * Fix UserResolver to ensure consistent user ID mapping
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function fixUserResolver() {
  console.log('🔧 Fixing UserResolver and User ID Mapping\n');
  console.log('=' .repeat(60) + '\n');
  
  const { getSupabaseService } = await import('./db/supabaseClient.js');
  const supabase = getSupabaseService();
  
  // 1. Check existing users and conversations
  console.log('1️⃣ Checking existing users in database:');
  
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, display_name, metadata')
      .or('email.eq.admin-1@example.com,metadata->originalId.eq.admin-1,email.eq.admin@example.com');
    
    if (error) {
      console.log('   ❌ Error fetching users:', error.message);
    } else {
      console.log(`   Found ${users?.length || 0} potential admin users:`);
      users?.forEach(user => {
        console.log(`   - ${user.id}`);
        console.log(`     Email: ${user.email}`);
        console.log(`     Display: ${user.display_name}`);
        console.log(`     Original ID: ${user.metadata?.originalId || 'N/A'}`);
      });
    }
    
    // 2. Check conversations for these users
    if (users && users.length > 0) {
      console.log('\n2️⃣ Checking conversations for these users:');
      
      for (const user of users) {
        const { data: convs, error: convError } = await supabase
          .from('conversations')
          .select('id, title, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3);
        
        if (!convError && convs) {
          console.log(`   User ${user.id}: ${convs.length} conversations`);
          convs.forEach(conv => {
            console.log(`     - ${conv.title} (${conv.id})`);
          });
        }
      }
    }
    
  } catch (error) {
    console.log('   ❌ Database check failed:', error.message);
  }
  
  console.log('\n' + '-' .repeat(60) + '\n');
  
  // 3. Fix UserResolver to use consistent UUID for admin-1
  console.log('3️⃣ Fixing UserResolver for consistent admin-1 mapping:');
  
  const ADMIN_USER_ID = '11111111-1111-1111-1111-111111111111'; // Fixed UUID for admin-1
  
  try {
    // Check if admin user exists with this UUID
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('*')
      .eq('id', ADMIN_USER_ID)
      .single();
    
    if (!adminUser || adminError) {
      console.log('   Creating admin user with fixed UUID...');
      
      // Create admin user with fixed UUID
      const { data: newAdmin, error: createError } = await supabase
        .from('users')
        .insert({
          id: ADMIN_USER_ID,
          email: 'admin@tala.ai',
          first_name: 'Admin',
          last_name: 'User',
          display_name: 'Will',
          organization_id: '00000000-0000-0000-0000-000000000001',
          role: 'admin',
          status: 'active',
          metadata: {
            originalId: 'admin-1',
            source: 'fixed-mapping',
            isAdmin: true
          }
        })
        .select()
        .single();
      
      if (createError) {
        console.log('   ❌ Failed to create admin user:', createError.message);
      } else {
        console.log('   ✅ Created admin user with fixed UUID:', ADMIN_USER_ID);
      }
    } else {
      console.log('   ✅ Admin user already exists with fixed UUID:', ADMIN_USER_ID);
    }
    
    // 4. Update existing conversations to use the fixed admin UUID
    console.log('\n4️⃣ Migrating existing conversations to fixed admin UUID:');
    
    // Find all users that might be admin-1
    const { data: adminVariants } = await supabase
      .from('users')
      .select('id')
      .or('email.eq.admin-1@example.com,metadata->originalId.eq.admin-1')
      .neq('id', ADMIN_USER_ID);
    
    if (adminVariants && adminVariants.length > 0) {
      console.log(`   Found ${adminVariants.length} variant admin users to migrate`);
      
      for (const variant of adminVariants) {
        // Update conversations
        const { data: updated, error: updateError } = await supabase
          .from('conversations')
          .update({ user_id: ADMIN_USER_ID })
          .eq('user_id', variant.id)
          .select();
        
        if (!updateError) {
          console.log(`   ✅ Migrated ${updated?.length || 0} conversations from ${variant.id}`);
        }
        
        // Update messages
        const { data: messagesUpdated, error: msgError } = await supabase
          .from('messages')
          .update({ user_id: ADMIN_USER_ID })
          .eq('user_id', variant.id)
          .select();
        
        if (!msgError) {
          console.log(`   ✅ Migrated ${messagesUpdated?.length || 0} messages from ${variant.id}`);
        }
      }
    }
    
  } catch (error) {
    console.log('   ❌ Fix failed:', error.message);
  }
  
  console.log('\n' + '-' .repeat(60) + '\n');
  
  // 5. Update UserResolver.js to use fixed mapping
  console.log('5️⃣ Creating updated UserResolver with fixed mapping:');
  
  const updatedResolverCode = `
// Add this to UserResolver constructor:
this.systemUsers = {
  'default': '00000000-0000-0000-0000-000000000001',
  'test_user': '00000000-0000-0000-0000-000000000002',
  'demo_user': '00000000-0000-0000-0000-000000000003',
  'admin-1': '11111111-1111-1111-1111-111111111111', // Fixed UUID for admin-1
  'admin': '11111111-1111-1111-1111-111111111111'    // Same UUID for admin
};
`;
  
  console.log('   Add this mapping to UserResolver.js:');
  console.log(updatedResolverCode);
  
  console.log('\n' + '=' .repeat(60));
  console.log('✨ Fix complete!\n');
  console.log('Next steps:');
  console.log('1. Update UserResolver.js with the fixed admin-1 mapping');
  console.log('2. Clear frontend localStorage to remove old conv- IDs');
  console.log('3. Test creating new conversations');
}

// Run the fix
fixUserResolver().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});