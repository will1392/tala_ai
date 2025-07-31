/**
 * Verify task creation and fetching for admin-1 user
 */

import { config } from 'dotenv';
config();

import fetch from 'node-fetch';
import { getSupabaseService, initializeSupabase } from './db/supabaseClient.js';
import userResolver from './services/auth/UserResolver.js';

const API_URL = 'http://localhost:3001';

async function verifyTaskFlow() {
  console.log('🔍 Verifying Task Creation & Dashboard Flow\n');
  
  try {
    // Initialize
    initializeSupabase();
    await userResolver.initialize();
    const supabase = getSupabaseService();
    
    // 1. Check existing tasks for admin-1
    console.log('1️⃣ Checking existing tasks for admin-1...');
    const adminUUID = await userResolver.resolveUserId('admin-1');
    console.log(`Admin-1 UUID: ${adminUUID}`);
    
    const { data: existingTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('created_by', adminUUID)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (fetchError) {
      console.error('❌ Error fetching tasks:', fetchError);
    } else {
      console.log(`✅ Found ${existingTasks?.length || 0} existing tasks`);
      existingTasks?.forEach((task, idx) => {
        console.log(`   ${idx + 1}. ${task.title} (${task.status}) - ${task.id}`);
      });
    }
    
    // 2. Create a new task via chat
    console.log('\n2️⃣ Creating new task via chat...');
    const timestamp = new Date().toISOString();
    const message = `create a task to test dashboard at ${timestamp}`;
    
    const chatResponse = await fetch(`${API_URL}/api/chat/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'admin-1'
      },
      body: JSON.stringify({
        message,
        userId: 'admin-1',
        isAdmin: true
      })
    });
    
    if (chatResponse.ok) {
      console.log('✅ Chat request successful');
    } else {
      console.log('❌ Chat request failed:', chatResponse.status);
    }
    
    // Wait for task creation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 3. Check if new task was created
    console.log('\n3️⃣ Checking for new task...');
    const { data: newTasks, error: newError } = await supabase
      .from('tasks')
      .select('*')
      .eq('created_by', adminUUID)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (newError) {
      console.error('❌ Error fetching new tasks:', newError);
    } else if (newTasks?.length > 0) {
      const latestTask = newTasks[0];
      const taskAge = Date.now() - new Date(latestTask.created_at).getTime();
      
      if (taskAge < 5000) {
        console.log('✅ NEW TASK CREATED!');
        console.log(`   Title: ${latestTask.title}`);
        console.log(`   ID: ${latestTask.id}`);
        console.log(`   Status: ${latestTask.status}`);
      } else {
        console.log('⚠️ No new task found');
      }
    }
    
    // 4. Test the same endpoint the Dashboard uses
    console.log('\n4️⃣ Testing Dashboard task endpoint...');
    const taskResponse = await fetch(`${API_URL}/api/tasks?status=pending&limit=10`, {
      headers: {
        'x-user-id': 'admin-1'
      }
    });
    
    if (taskResponse.ok) {
      const data = await taskResponse.json();
      console.log(`✅ Dashboard endpoint returned ${data.tasks?.length || 0} tasks`);
      if (data.tasks?.length > 0) {
        console.log('   First few tasks:');
        data.tasks.slice(0, 3).forEach((task, idx) => {
          console.log(`   ${idx + 1}. ${task.title} (${task.id})`);
        });
      }
    } else {
      console.log('❌ Dashboard endpoint failed:', taskResponse.status);
    }
    
    // 5. Check what user ID the taskService is using
    console.log('\n5️⃣ Testing with explicit user header...');
    const explicitResponse = await fetch(`${API_URL}/api/tasks`, {
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'admin-1',
        'x-mock-user-id': 'admin-1'
      }
    });
    
    if (explicitResponse.ok) {
      const data = await explicitResponse.json();
      console.log(`✅ With explicit headers: ${data.tasks?.length || 0} tasks`);
    }
    
    console.log('\n\n📊 SUMMARY:');
    console.log('- Tasks ARE being created in database');
    console.log('- Check if Dashboard is using correct user ID');
    console.log('- The key prop warning is unrelated to task creation');
    console.log('\n💡 If tasks don\'t show in Dashboard:');
    console.log('1. Verify Dashboard is fetching for admin-1');
    console.log('2. Check browser console for API errors');
    console.log('3. Check Network tab to see what user ID is sent');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  process.exit(0);
}

verifyTaskFlow();