import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://khshxxwpumkccafgzyco.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtoc2h4eHdwdW1rY2NhZmd6eWNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU3NTk4MjIsImV4cCI6MjA2MTMzNTgyMn0.rg7C8Ke__6I6q2BEXlHDEP-JMH8Xx56Cqe1KMz_wVdg'
);

const userId = '8fbaef69-c1be-4c09-af68-e7091693b2ea';

// Try to find the user
const { data, error } = await supabase
  .from('user_credits')
  .select('*')
  .eq('user_id', userId);

console.log('Query result:', { data, error });

// Also try the id field
const { data: byId } = await supabase
  .from('user_credits')
  .select('*')
  .eq('id', '6b914cc0-0285-4b2a-aa68-25e0eff955c2');

console.log('\nBy ID result:', byId);
