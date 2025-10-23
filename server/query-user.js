import { getSupabaseService } from './db/supabaseClient.js';

async function checkUser() {
  const supabase = await getSupabaseService();
  const userId = '8fbaef69-75e9-4e26-a52c-bd6d12f4296f';
  
  console.log('🔍 Checking userId:', userId);
  
  const { data: credits, error } = await supabase
    .from('user_credits')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error) {
    console.log('❌ Error:', error);
  } else {
    console.log('\n💳 Credits Record:');
    console.log('  Role:', credits.role);
    console.log('  Plan Type:', credits.plan_type);
    console.log('  Total Credits:', credits.total_credits);
    console.log('  Used Credits:', credits.used_credits);
    console.log('  Bonus Credits:', credits.bonus_credits);
    console.log('  Available:', credits.total_credits + credits.bonus_credits - credits.used_credits);
  }
  
  // Check transactions
  const { data: txns } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (txns && txns.length > 0) {
    console.log('\n📝 Recent Transactions:');
    txns.forEach(t => {
      const bypass = t.metadata?.bypass_reason ? ` [BYPASS: ${t.metadata.bypass_reason}]` : '';
      console.log(`  ${t.operation_type}: ${t.credit_amount} credits${bypass}`);
    });
  }
  
  process.exit(0);
}

checkUser();
