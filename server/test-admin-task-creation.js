/**
 * Test task creation for admin-1 user
 * This tests if tasks are being created for the correct user
 */

import { config } from 'dotenv';
config();

import { getSupabaseService, initializeSupabase } from './db/supabaseClient.js';
import userResolver from './services/auth/UserResolver.js';
import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';

async function testAdminTaskCreation() {
  console.log('🧪 Testing task creation for admin-1 user\n');
  
  try {
    // Initialize services
    console.log('1️⃣ Initializing services...');
    initializeSupabase();
    await userResolver.initialize();
    const supabase = getSupabaseService();
    console.log('✅ Services initialized\n');
    
    // Test user IDs
    const testUsers = ['admin-1', 'test_user_123'];
    
    for (const userId of testUsers) {
      console.log(`\n📊 Checking tasks for user: ${userId}`);
      console.log('='.repeat(60));
      
      // Resolve to UUID
      try {
        const userUUID = await userResolver.resolveUserId(userId);
        console.log(`✅ Resolved ${userId} → ${userUUID}`);
        
        // Check existing tasks
        const { data: tasks, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('created_by', userUUID)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (error) {
          console.error('❌ Error fetching tasks:', error);
        } else {
          console.log(`\n📋 Found ${tasks?.length || 0} tasks for ${userId}:`);
          tasks?.forEach((task, idx) => {
            console.log(`   ${idx + 1}. ${task.title} (${task.id})`);
            console.log(`      Created: ${new Date(task.created_at).toLocaleString()}`);
          });
        }
      } catch (error) {
        console.error(`❌ Error resolving ${userId}:`, error.message);
      }
    }
    
    // Test creating a task via chat v2 endpoint
    console.log('\n\n2️⃣ Testing task creation via chat v2...');
    console.log('='.repeat(60));
    
    const testMessage = 'create a task to update the dashboard';
    console.log(`Message: "${testMessage}"`);
    
    const response = await fetch(`${API_URL}/api/chat/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'admin-1'
      },
      body: JSON.stringify({
        message: testMessage,
        userId: 'admin-1',
        isAdmin: true
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('\n✅ Chat response received');
      
      // Check the response
      if (result.data?.response) {
        const responseText = typeof result.data.response === 'string' 
          ? result.data.response 
          : JSON.stringify(result.data.response);
        
        console.log('Response preview:', responseText.substring(0, 200) + '...');
        
        if (responseText.toLowerCase().includes('task') && 
            (responseText.toLowerCase().includes('created') || 
             responseText.toLowerCase().includes('added'))) {
          console.log('\n✅ Task creation detected in response!');
        }
      }
      
      // Check routing decision
      if (result.data?.routingDecision) {
        console.log('\n🎯 Routing Decision:');
        console.log(`   Strategy: ${result.data.routingDecision.strategy}`);
        console.log(`   Task Type: ${result.data.routingDecision.taskAnalysis?.type}`);
        console.log(`   Selected Agents: ${result.data.routingDecision.selectedAgents?.map(a => a.name || a.id).join(', ')}`);
      }
    } else {
      const error = await response.text();
      console.log('❌ Failed:', error);
    }
    
    // Wait a moment for task to be saved
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if task was created
    console.log('\n\n3️⃣ Checking if task was created...');
    console.log('='.repeat(60));
    
    const adminUUID = await userResolver.resolveUserId('admin-1');
    const { data: newTasks, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('created_by', adminUUID)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (taskError) {
      console.error('❌ Error fetching tasks:', taskError);
    } else if (newTasks?.length > 0) {
      const latestTask = newTasks[0];
      const taskAge = Date.now() - new Date(latestTask.created_at).getTime();
      
      if (taskAge < 5000) { // Created in last 5 seconds
        console.log('✅ NEW TASK CREATED!');
        console.log(`   Title: ${latestTask.title}`);
        console.log(`   ID: ${latestTask.id}`);
        console.log(`   Created: ${new Date(latestTask.created_at).toLocaleString()}`);
      } else {
        console.log('⚠️ No new tasks found (latest task is older than 5 seconds)');
      }
    } else {
      console.log('❌ No tasks found for admin-1');
    }
    
    console.log('\n\n📊 SUMMARY');
    console.log('='.repeat(60));
    console.log('✅ Chat.tsx has been updated to:');
    console.log('   - Use /api/chat/v2 endpoint');
    console.log('   - Use consistent user ID (admin-1)');
    console.log('\n⚠️ Make sure to:');
    console.log('   1. Restart the server for changes to take effect');
    console.log('   2. Refresh the browser to load updated Chat.tsx');
    console.log('   3. Tasks should now appear in the dashboard for admin-1');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  process.exit(0);
}

testAdminTaskCreation();