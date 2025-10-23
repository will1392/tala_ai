/**
 * Diagnostic Script: Check Credit Deduction for Chat Operations
 * 
 * This script checks:
 * 1. Current credit balance
 * 2. Recent credit transactions
 * 3. Whether chat_message operations are being logged
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const TEST_USER_ID = '59b70373-ba68-4d89-8420-5c3723aef01f';

async function checkCreditDeduction() {
  console.log('🔍 Credit Deduction Diagnostic');
  console.log('================================\n');
  
  console.log(`👤 Checking user: ${TEST_USER_ID}\n`);
  
  // 1. Get current credit balance
  console.log('1️⃣  Current Credit Balance:');
  const { data: credits, error: creditsError } = await supabase
    .from('user_credits')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .single();
  
  if (creditsError) {
    console.error('   ❌ Error fetching credits:', creditsError.message);
  } else if (credits) {
    console.log(`   💰 Total Credits: ${credits.total_credits}`);
    console.log(`   💸 Used Credits: ${credits.used_credits}`);
    console.log(`   ✅ Available: ${credits.total_credits - credits.used_credits}`);
    console.log(`   🎁 Bonus: ${credits.bonus_credits}`);
    console.log(`   📊 Plan: ${credits.plan_type}`);
    console.log(`   🔄 Last Reset: ${credits.last_reset_date}`);
  }
  
  console.log('\n2️⃣  Recent Credit Transactions (Last 10):');
  const { data: transactions, error: txError } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (txError) {
    console.error('   ❌ Error fetching transactions:', txError.message);
  } else if (transactions && transactions.length > 0) {
    transactions.forEach((tx, index) => {
      console.log(`\n   Transaction ${index + 1}:`);
      console.log(`   • Operation: ${tx.operation}`);
      console.log(`   • Credits: ${tx.credits}`);
      console.log(`   • Date: ${new Date(tx.created_at).toLocaleString()}`);
      console.log(`   • Metadata:`, JSON.stringify(tx.metadata, null, 2));
    });
  } else {
    console.log('   📭 No transactions found');
  }
  
  // 3. Check for chat_message operations specifically
  console.log('\n3️⃣  Chat Message Operations (Last 5):');
  const { data: chatTx, error: chatError } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .eq('operation', 'chat_message')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (chatError) {
    console.error('   ❌ Error fetching chat transactions:', chatError.message);
  } else if (chatTx && chatTx.length > 0) {
    console.log(`   ✅ Found ${chatTx.length} chat_message operations:`);
    chatTx.forEach((tx, index) => {
      console.log(`   ${index + 1}. ${tx.credits} credits on ${new Date(tx.created_at).toLocaleString()}`);
      if (tx.metadata) {
        console.log(`      Endpoint: ${tx.metadata.endpoint}, Status: ${tx.metadata.statusCode}`);
      }
    });
  } else {
    console.log('   ❌ NO chat_message operations found - THIS IS THE PROBLEM!');
  }
  
  // 4. Summary
  console.log('\n4️⃣  Diagnostic Summary:');
  console.log('   ────────────────────────────────');
  if (!chatTx || chatTx.length === 0) {
    console.log('   🚨 ISSUE CONFIRMED: Credits are NOT being deducted for chat');
    console.log('   📌 No chat_message transactions found in database');
    console.log('   🔧 Fix needed: The middleware finish event is not deducting credits');
  } else {
    console.log('   ✅ Chat transactions are being logged');
    console.log(`   📊 Last chat operation: ${new Date(chatTx[0].created_at).toLocaleString()}`);
  }
  
  console.log('\n✅ Diagnostic complete\n');
}

checkCreditDeduction().catch(console.error);
