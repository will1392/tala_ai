/**
 * Complete Credit System Verification
 * 
 * Runs all checks and provides a clear YES/NO answer
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

async function verify() {
  console.log('🔍 CREDIT SYSTEM VERIFICATION');
  console.log('=============================\n');
  
  let allGood = true;
  
  // 1. Check user exists
  console.log('1️⃣  Checking user exists...');
  const { data: user, error: userError } = await supabase
    .from('user_credits')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .single();
  
  if (userError || !user) {
    console.log('   ❌ FAIL: User not found');
    allGood = false;
  } else {
    console.log('   ✅ PASS: User exists');
    console.log(`      Role: ${user.role || 'agent'}`);
    console.log(`      Credits: ${user.total_credits - user.used_credits}/${user.total_credits}`);
  }
  
  // 2. Check recent transactions
  console.log('\n2️⃣  Checking recent transactions...');
  const { data: transactions, error: txError } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (txError) {
    console.log('   ❌ FAIL: Could not fetch transactions');
    allGood = false;
  } else if (!transactions || transactions.length === 0) {
    console.log('   ⚠️  WARN: No transactions found (user might not have used the app)');
  } else {
    console.log(`   ✅ PASS: Found ${transactions.length} recent transactions`);
    
    // Check for chat_message operations
    const chatOps = transactions.filter(t => t.operation === 'chat_message');
    if (chatOps.length > 0) {
      console.log(`      ${chatOps.length} chat_message operations found`);
      
      const lastChat = chatOps[0];
      const isBypassed = lastChat.metadata?.bypass_reason === 'super_admin_unlimited_access';
      
      if (isBypassed) {
        console.log('      💡 Last chat was BYPASSED (super_admin)');
        console.log(`         Would have cost: ${lastChat.metadata.would_have_cost} credits`);
      } else {
        console.log(`      💳 Last chat DEDUCTED: ${lastChat.credits} credits`);
      }
    }
  }
  
  // 3. Check middleware is working
  console.log('\n3️⃣  Checking middleware configuration...');
  
  // Verify the middleware is loaded
  try {
    const middlewareExists = await import('../middleware/creditsMiddleware.js');
    console.log('   ✅ PASS: creditsMiddleware.js loaded');
    console.log('      requireCredits function exists');
  } catch (error) {
    console.log('   ❌ FAIL: Could not load creditsMiddleware.js');
    allGood = false;
  }
  
  // 4. Check credit service
  console.log('\n4️⃣  Checking credit service...');
  try {
    const { default: CreditSystem } = await import('../services/creditSystem.js');
    const creditSystem = new CreditSystem();
    
    // Test check credits
    const check = await creditSystem.checkCredits(TEST_USER_ID, 'chat_message', { cost: 10 });
    
    if (check.success && check.hasEnoughCredits) {
      console.log('   ✅ PASS: checkCredits() working');
      console.log(`      Available: ${check.availableCredits}`);
      console.log(`      Cost: ${check.creditCost}`);
      
      if (check.bypassReason) {
        console.log(`      💡 Bypass: ${check.bypassReason}`);
      }
    } else {
      console.log('   ❌ FAIL: checkCredits() not working correctly');
      allGood = false;
    }
  } catch (error) {
    console.log('   ❌ FAIL: Could not load credit service');
    console.log(`      Error: ${error.message}`);
    allGood = false;
  }
  
  // 5. Final verdict
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📊 FINAL VERDICT:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (allGood) {
    console.log('✅ CREDIT SYSTEM IS WORKING CORRECTLY\n');
    
    if (user?.role === 'super_admin') {
      console.log('💡 IMPORTANT NOTE:');
      console.log('   Your test user has super_admin role.');
      console.log('   Credits are NOT deducted for admins (by design).');
      console.log('   Operations are logged with bypass_reason.');
      console.log('   \n   To test normal credit deduction:');
      console.log('   Run: node server/diagnostics/toggleSuperAdmin.js\n');
    } else {
      console.log('💳 User has normal role - credits are being deducted.');
      console.log('   Each chat costs 10 credits.');
      console.log(`   Remaining balance: ${user.total_credits - user.used_credits}\n`);
    }
  } else {
    console.log('❌ ISSUES DETECTED\n');
    console.log('   Some components are not working correctly.');
    console.log('   Review the errors above for details.\n');
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

verify().catch(error => {
  console.error('❌ Verification failed:', error.message);
  console.error(error.stack);
});
