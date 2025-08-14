/**
 * Get existing organization
 */

import { getSupabaseService } from './db/supabaseClient.js';

async function getOrg() {
  const supabase = getSupabaseService();
  
  // Get existing organizations
  const { data: orgs, error } = await supabase
    .from('organizations')
    .select('id, name')
    .limit(5);
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Organizations:', orgs);
  }
  
  // Get existing users
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, email, organization_id')
    .limit(5);
    
  if (userError) {
    console.error('User Error:', userError);
  } else {
    console.log('\nUsers:', users);
  }
}

getOrg().catch(console.error);