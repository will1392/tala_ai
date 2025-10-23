import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkUser() {
  console.log('Checking will@chimatravel.net user...\n');
  
  // First find the user by email
  const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('❌ Error listing users:', authError.message);
    return;
  }
  
  const willUser = authUser.users.find(u => u.email === 'will@chimatravel.net');
  
  if (!willUser) {
    console.log('❌ User will@chimatravel.net not found in auth.users');
    return;
  }
  
  console.log('✅ Found user in auth.users:');
  console.log('   Email:', willUser.email);
  console.log('   User ID:', willUser.id);
  console.log();
  
  // Now check their credits and role
  const { data: creditsData, error: creditsError } = await supabase
    .from('user_credits')
    .select('user_id, role, plan_type, total_credits, used_credits')
    .eq('user_id', willUser.id)
    .single();
  
  if (creditsError) {
    console.log('❌ No credits record found for this user');
    return;
  }
  
  console.log('💳 Credits Record:');
  console.log('   Role:', creditsData.role);
  console.log('   Plan Type:', creditsData.plan_type);
  console.log('   Total Credits:', creditsData.total_credits);
  console.log('   Used Credits:', creditsData.used_credits);
  console.log('   Available:', creditsData.total_credits - creditsData.used_credits);
  console.log();
  
  if (creditsData.role === 'super_admin') {
    console.log('⚠️  YES - This user WAS a super_admin');
    console.log('   Super admins have unlimited credits (0 deduction per operation)');
  } else {
    console.log('ℹ️  No - This user is not a super_admin');
    console.log('   Current role:', creditsData.role);
  }
}

checkUser().catch(console.error);
