/**
 * Test Credit Deduction for will@chimatravel.net
 * 
 * This script simulates the credit check and consumption flow
 * to verify credits are being properly deducted.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testCreditFlow() {
  console.log('=== CREDIT DEDUCTION TEST ===');
  console.log('Testing for: will@chimatravel.net');
  console.log('');
  
  // Get user
  const { data: authData } = await supabase.auth.admin.listUsers();
  const willUser = authData.users.find(u => u.email === 'will@chimatravel.net');
  
  if (!willUser) {
    console.log('❌ User not found');
    return;
  }
  
  const userId = willUser.id;
  console.log('✅ User ID:', userId);
  console.log('');
  
  // Get current credits
  const { data: beforeCredits } = await supabase
    .from('user_credits')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  console.log('📊 BEFORE State:');
  console.log('  Role:', beforeCredits.role);
  console.log('  Total Credits:', beforeCredits.total_credits);
  console.log('  Used Credits:', beforeCredits.used_credits);
  console.log('  Available:', beforeCredits.total_credits - beforeCredits.used_credits);
  console.log('  Is Super Admin?', beforeCredits.role === 'super_admin');
  console.log('');
  
  // Test the logic
  const isSuperAdmin = beforeCredits.role === 'super_admin';
  console.log('🔍 LOGIC TEST:');
  console.log('  isSuperAdmin =', isSuperAdmin);
  
  if (isSuperAdmin) {
    console.log('  ⚠️  BYPASS ACTIVE - Credits will NOT be deducted');
    console.log('  • creditCost = 0');
    console.log('  • availableCredits = Number.MAX_SAFE_INTEGER');
    console.log('  • Credits will remain at:', beforeCredits.total_credits - beforeCredits.used_credits);
  } else {
    console.log('  ✅ NORMAL DEDUCTION - Credits WILL be deducted');
    console.log('  • creditCost = 10 (for chat_message)');
    console.log('  • availableCredits =', beforeCredits.total_credits - beforeCredits.used_credits);
    console.log('  • After 1 message, credits will be:', beforeCredits.total_credits - beforeCredits.used_credits - 10);
  }
  console.log('');
  
  // Get recent transactions
  const { data: recentTransactions } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(3);
  
  console.log('📜 RECENT TRANSACTIONS (Last 3):');
  if (recentTransactions && recentTransactions.length > 0) {
    recentTransactions.forEach((t, i) => {
      console.log(`  ${i + 1}. ${new Date(t.created_at).toLocaleString()}`);
      console.log('     Operation:', t.operation);
      console.log('     Credits:', t.credits);
      if (t.metadata?.super_admin_bypass) {
        console.log('     ⚠️  BYPASS: Yes (was super admin)');
        console.log('     Original Cost:', t.metadata.original_cost);
      } else {
        console.log('     ✅ Normal deduction');
      }
      console.log('');
    });
  } else {
    console.log('  No transactions found');
    console.log('');
  }
  
  console.log('=== CONCLUSION ===');
  if (isSuperAdmin) {
    console.log('❌ CREDITS WILL NOT BE DEDUCTED');
    console.log('   Reason: User has super_admin role');
    console.log('   Fix: Change role to "admin" or "agent"');
  } else {
    console.log('✅ CREDITS WILL BE DEDUCTED');
    console.log('   Status: Credit system working normally');
    console.log('   Cost per chat: 10 credits');
  }
}

testCreditFlow().catch(console.error);
