/**
 * Toggle Super Admin Role
 * 
 * This script allows you to:
 * 1. Check current role
 * 2. Enable super_admin (unlimited credits)
 * 3. Disable super_admin (normal credit deduction)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const TEST_USER_ID = '59b70373-ba68-4d89-8420-5c3723aef01f';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function getCurrentRole() {
  const { data, error } = await supabase
    .from('user_credits')
    .select('role, available_credits, total_credits, used_credits')
    .eq('user_id', TEST_USER_ID)
    .single();
  
  if (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
  
  return data;
}

async function setRole(role) {
  const { data, error } = await supabase
    .from('user_credits')
    .update({ role })
    .eq('user_id', TEST_USER_ID)
    .select()
    .single();
  
  if (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
  
  return true;
}

async function main() {
  console.log('🔐 Super Admin Role Manager');
  console.log('===========================\n');
  
  // Get current status
  const current = await getCurrentRole();
  
  if (!current) {
    console.error('Failed to get current role');
    rl.close();
    return;
  }
  
  console.log('Current Status:');
  console.log(`  User ID: ${TEST_USER_ID.substring(0, 13)}...`);
  console.log(`  Role: ${current.role || 'agent'}`);
  console.log(`  Available Credits: ${current.total_credits - current.used_credits}`);
  console.log(`  Used Credits: ${current.used_credits}`);
  console.log(`  Total Credits: ${current.total_credits}\n`);
  
  if (current.role === 'super_admin') {
    console.log('⚠️  User currently has UNLIMITED credits');
    console.log('   Operations cost 0 credits (bypassed)\n');
  } else {
    console.log('✅ User has NORMAL credit deduction');
    console.log('   Operations will deduct credits\n');
  }
  
  console.log('Options:');
  console.log('  1. Enable super_admin (unlimited credits)');
  console.log('  2. Disable super_admin (normal deduction)');
  console.log('  3. Exit\n');
  
  const choice = await question('Enter your choice (1-3): ');
  
  if (choice === '1') {
    console.log('\n🔓 Enabling super_admin role...');
    const success = await setRole('super_admin');
    if (success) {
      console.log('✅ Super admin enabled!');
      console.log('   • Chat operations will cost 0 credits');
      console.log('   • Transactions logged with bypass_reason');
      console.log('   • Credits will NOT decrease');
    }
  } else if (choice === '2') {
    console.log('\n🔒 Disabling super_admin role...');
    const success = await setRole('agent');
    if (success) {
      console.log('✅ Super admin disabled!');
      console.log('   • Chat operations will cost 10 credits');
      console.log('   • Credits will decrease normally');
      console.log('   • Current balance: ' + (current.total_credits - current.used_credits));
    }
  } else {
    console.log('\nExiting...');
  }
  
  rl.close();
}

main().catch(console.error);
