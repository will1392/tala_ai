/**
 * Check User Role
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const TEST_USER_ID = '59b70373-ba68-4d89-8420-5c3723aef01f';

async function checkUserRole() {
  console.log('👤 User Role Check');
  console.log('==================\n');
  
  const { data, error } = await supabase
    .from('user_credits')
    .select('user_id, role, plan_type, total_credits, used_credits')
    .eq('user_id', TEST_USER_ID)
    .single();
  
  if (error) {
    console.error('❌ Error:', error.message);
  } else {
    console.log('User Info:');
    console.log(`  User ID: ${data.user_id}`);
    console.log(`  Role: ${data.role || 'agent'}`);
    console.log(`  Plan Type: ${data.plan_type}`);
    console.log(`  Total Credits: ${data.total_credits}`);
    console.log(`  Used Credits: ${data.used_credits}`);
    console.log(`  Available: ${data.total_credits - data.used_credits}`);
    
    if (data.role === 'super_admin') {
      console.log('\n🎯 CONFIRMED: User is super_admin');
      console.log('   • Has unlimited credits (operations cost 0)');
      console.log('   • Credits are NOT deducted from balance');
      console.log('   • Transactions logged with bypass_reason');
      console.log('\n💡 If you want to test credit deduction:');
      console.log('   1. Change role from super_admin to agent');
      console.log('   2. Or test with a different user ID');
    }
  }
}

checkUserRole().catch(console.error);
