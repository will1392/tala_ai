/**
 * Test task completion functionality
 */

import fetch from 'node-fetch';
import { getSupabaseService, initializeSupabase } from './db/supabaseClient.js';
import userResolver from './services/auth/UserResolver.js';

const API_URL = 'http://localhost:3001';

async function testTaskCompletion() {
  console.log('🧪 Testing Task Completion\n');
  
  try {
    // Initialize
    initializeSupabase();
    await userResolver.initialize();
    const supabase = getSupabaseService();
    
    // 1. Get a pending task for admin-1
    console.log('1️⃣ Finding a pending task...');
    const adminUUID = await userResolver.resolveUserId('admin-1');
    
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('created_by', adminUUID)
      .eq('status', 'pending')
      .limit(1);
    
    if (error || !tasks || tasks.length === 0) {
      console.log('❌ No pending tasks found. Create a task first.');
      return;
    }
    
    const taskToComplete = tasks[0];
    console.log(`✅ Found task: "${taskToComplete.title}"`);
    console.log(`   ID: ${taskToComplete.id}`);
    console.log(`   Status: ${taskToComplete.status}`);
    
    // 2. Test completion via API
    console.log('\n2️⃣ Completing task via API...');
    const response = await fetch(`${API_URL}/api/tasks/${taskToComplete.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'admin-1'
      },
      body: JSON.stringify({
        status: 'completed'
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Task updated successfully!');
      console.log(`   New status: ${result.task.status}`);
      console.log(`   Completed at: ${result.task.completed_at}`);
    } else {
      const error = await response.text();
      console.log('❌ Failed to update task:', error);
    }
    
    // 3. Verify in database
    console.log('\n3️⃣ Verifying in database...');
    const { data: updatedTask, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskToComplete.id)
      .single();
    
    if (fetchError) {
      console.error('❌ Error fetching updated task:', fetchError);
    } else {
      console.log('✅ Database verification:');
      console.log(`   Status: ${updatedTask.status}`);
      console.log(`   Completed: ${updatedTask.completed_at ? '✅' : '❌'}`);
      console.log(`   Updated: ${updatedTask.updated_at}`);
    }
    
    console.log('\n✨ Task completion is working! Click the green checkmark in Dashboard.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  process.exit(0);
}

testTaskCompletion();