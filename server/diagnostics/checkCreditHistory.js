import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkAllTransactions() {
  const userId = '8fbaef69-c1be-4c09-af68-e7091693b2ea';
  
  console.log('=== CREDIT HISTORY ANALYSIS ===');
  console.log('User: will@chimatravel.net');
  console.log('User ID:', userId);
  console.log('');
  
  // Get current credits status
  const { data: creditsData } = await supabase
    .from('user_credits')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  console.log('Current Status:');
  console.log('  Role:', creditsData.role);
  console.log('  Total Credits:', creditsData.total_credits);
  console.log('  Used Credits:', creditsData.used_credits);
  console.log('  Available:', creditsData.total_credits - creditsData.used_credits);
  console.log('');
  
  // Get all transactions
  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.log('Error:', error.message);
    return;
  }
  
  console.log('Transaction History:');
  console.log('  Total transactions:', data.length);
  console.log('');
  
  // Check for super_admin bypass transactions
  const bypassTransactions = data.filter(t => t.metadata && t.metadata.super_admin_bypass);
  console.log('Super Admin Bypass Transactions:', bypassTransactions.length);
  
  if (bypassTransactions.length > 0) {
    console.log('');
    console.log('Recent bypass transactions (user was super_admin):');
    bypassTransactions.slice(0, 5).forEach(t => {
      console.log('  - Date:', new Date(t.created_at).toLocaleString());
      console.log('    Operation:', t.operation);
      console.log('    Credits charged:', t.credits);
      console.log('    Original cost:', t.metadata.original_cost);
      console.log('');
    });
  }
  
  // Check for normal credit deductions
  const normalTransactions = data.filter(t => t.credits > 0 && (!t.metadata || !t.metadata.super_admin_bypass));
  console.log('Normal Credit Deductions:', normalTransactions.length);
  console.log('Total credits spent:', normalTransactions.reduce((sum, t) => sum + t.credits, 0));
  console.log('');
  
  console.log('Recent normal transactions:');
  normalTransactions.slice(0, 10).forEach(t => {
    console.log('  - Date:', new Date(t.created_at).toLocaleString());
    console.log('    Operation:', t.operation);
    console.log('    Credits:', t.credits);
    console.log('');
  });
}

checkAllTransactions().catch(console.error);
