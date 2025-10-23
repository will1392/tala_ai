import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://khshxxwpumkccafgzyco.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtoc2h4eHdwdW1rY2NhZmd6eWNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU3NTk4MjIsImV4cCI6MjA2MTMzNTgyMn0.rg7C8Ke__6I6q2BEXlHDEP-JMH8Xx56Cqe1KMz_wVdg'
);

const { data: user, error: userError } = await supabase
  .from('user_credits')
  .select('*')
  .like('id', '59b70373%')
  .single();

console.log('User 59b70373:', user);

const { data: transactions, error: txError } = await supabase
  .from('credit_transactions')
  .select('*')
  .eq('user_id', user?.id)
  .order('created_at', { ascending: false })
  .limit(10);

console.log('\nRecent transactions:', transactions);
