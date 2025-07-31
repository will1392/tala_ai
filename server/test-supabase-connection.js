import { initializeSupabase, getSupabaseService } from './db/supabaseClient.js';

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n');
  
  // 1. Initialize and test connection
  const initResult = initializeSupabase();
  
  if (!initResult.success) {
    console.error('❌ Failed to initialize:', initResult.error);
    console.error('\nMissing:', initResult.missing?.join(', '));
    console.error('\nPlease check your .env file has:');
    console.error('- SUPABASE_URL');
    console.error('- SUPABASE_ANON_KEY');
    console.error('- SUPABASE_SERVICE_KEY');
    return;
  }
  
  console.log('✅ Connected to Supabase\n');
  
  // Use service client to bypass RLS
  let supabase;
  try {
    supabase = getSupabaseService();
    console.log('🔑 Using service role (bypasses RLS)\n');
  } catch (error) {
    console.log('⚠️  No service key, using anon client\n');
    supabase = getSupabaseAnon();
  }
  
  // 2. Test tasks table
  console.log('📊 Testing tasks table...');
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('count')
    .limit(1);
    
  if (tasksError) {
    console.error('❌ Error accessing tasks table:', tasksError.message);
  } else {
    console.log('✅ Tasks table is accessible\n');
  }
  
  // 3. Create a test task
  console.log('📝 Creating a test task...');
  const testTask = {
    title: 'Test Task from Supabase',
    description: 'This task is stored in PostgreSQL!',
    priority: 'medium',
    status: 'pending',
    created_by: 'test_user_123',
    source: 'manual'
  };
  
  const { data: newTask, error: createError } = await supabase
    .from('tasks')
    .insert([testTask])
    .select()
    .single();
    
  if (createError) {
    console.error('❌ Error creating task:', createError.message);
  } else {
    console.log('✅ Task created successfully!');
    console.log('   ID:', newTask.id);
    console.log('   Title:', newTask.title);
  }
  
  // 4. List all tasks
  console.log('\n📋 Listing all tasks...');
  const { data: allTasks, error: listError } = await supabase
    .from('tasks')
    .select('id, title, created_by, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (listError) {
    console.error('❌ Error listing tasks:', listError.message);
  } else {
    console.log(`✅ Found ${allTasks.length} tasks:`);
    allTasks.forEach((task, idx) => {
      console.log(`   ${idx + 1}. "${task.title}" (by ${task.created_by})`);
    });
  }
  
  console.log('\n🎉 Supabase connection test complete!');
}

testConnection().catch(console.error);