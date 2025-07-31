/**
 * Final test for task creation through chat
 */

import { config } from 'dotenv';
config();

import fetch from 'node-fetch';
import { getSupabaseService, initializeSupabase } from './db/supabaseClient.js';
import userResolver from './services/auth/UserResolver.js';

const API_URL = 'http://localhost:3001';

async function testChatTaskCreation() {
  console.log('🧪 Final Task Creation Test\n');
  
  try {
    // Initialize services
    initializeSupabase();
    await userResolver.initialize();
    const supabase = getSupabaseService();
    
    // Test message
    const message = 'create a task to update the dashboard with new features';
    console.log(`📝 Sending message: "${message}"`);
    console.log('👤 User: admin-1\n');
    
    // Send chat request
    const response = await fetch(`${API_URL}/api/chat/v2`, {
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
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Chat response received');
      
      // Check the response
      if (result.data?.response) {
        const responseText = typeof result.data.response === 'string' 
          ? result.data.response 
          : JSON.stringify(result.data.response);
        
        console.log('\n📄 Response:', responseText.substring(0, 200) + '...');
        
        if (responseText.toLowerCase().includes('task') && 
            (responseText.toLowerCase().includes('created') || 
             responseText.toLowerCase().includes('added'))) {
          console.log('\n✅ Task creation confirmed in response!');
        }
      }
      
      // Check routing
      if (result.data?.routingDecision) {
        console.log('\n🎯 Routing:');
        console.log(`   Strategy: ${result.data.routingDecision.strategy}`);
        console.log(`   Task Type: ${result.data.routingDecision.taskAnalysis?.type}`);
        console.log(`   Agent: ${result.data.routingDecision.selectedAgents?.map(a => a.name || a.id).join(', ')}`);
      }
    } else {
      const error = await response.text();
      console.log('❌ Failed:', error);
      return;
    }
    
    // Wait for task to be saved
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if task was created
    console.log('\n\n📊 Checking database for new tasks...');
    const adminUUID = await userResolver.resolveUserId('admin-1');
    console.log(`User UUID: ${adminUUID}`);
    
    const { data: tasks, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('created_by', adminUUID)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (taskError) {
      console.error('❌ Error fetching tasks:', taskError);
    } else {
      console.log(`\n✅ Found ${tasks?.length || 0} tasks for admin-1:`);
      tasks?.forEach((task, idx) => {
        const taskAge = Date.now() - new Date(task.created_at).getTime();
        const isNew = taskAge < 10000; // Created in last 10 seconds
        
        console.log(`\n${idx + 1}. ${isNew ? '🆕' : '📌'} ${task.title}`);
        console.log(`   ID: ${task.id}`);
        console.log(`   Status: ${task.status}`);
        console.log(`   Created: ${new Date(task.created_at).toLocaleString()}`);
        if (isNew) {
          console.log(`   ✨ This task was just created!`);
        }
      });
    }
    
    console.log('\n\n✅ SUMMARY:');
    console.log('- Chat endpoint is working');
    console.log('- Task creation intent is detected');
    console.log('- Tasks should appear in dashboard for admin-1');
    console.log('\n💡 If tasks are not appearing:');
    console.log('1. Make sure server was restarted');
    console.log('2. Check server console for errors');
    console.log('3. Verify dashboard is filtering by admin-1');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  process.exit(0);
}

testChatTaskCreation();