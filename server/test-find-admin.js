/**
 * Find admin user
 */

import { getSupabaseService } from './db/supabaseClient.js';

async function findAdmin() {
  const supabase = getSupabaseService();
  
  // Find user with admin-1 in metadata or email
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .or('email.ilike.%admin%,metadata->>originalUserId.eq.admin-1');
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Admin users found:', users?.length || 0);
    users?.forEach(user => {
      console.log('\nUser:');
      console.log('  ID:', user.id);
      console.log('  Email:', user.email);
      console.log('  Org:', user.organization_id);
      console.log('  Metadata:', user.metadata);
    });
  }
}

findAdmin().catch(console.error);