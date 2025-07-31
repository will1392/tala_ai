/**
 * Debug task creation flow
 * Tests the complete flow from chat to task creation
 */

import { config } from 'dotenv';
config();

import fetch from 'node-fetch';
import { getSupabaseService, initializeSupabase } from './db/supabaseClient.js';
import userResolver from './services/auth/UserResolver.js';

const API_URL = 'http://localhost:3001';

async function testTaskCreation() {
  console.log('🔍 Debugging Task Creation Flow\n');
  
  try {
    // 1. Initialize services
    console.log('1️⃣ Initializing services...');
    initializeSupabase();
    await userResolver.initialize();
    const supabase = getSupabaseService();
    console.log('✅ Services initialized\n');
    
    // Test messages that should trigger task creation
    const testMessages = [
      "create a task to call John",
      "add task: Review presentation",
      "remind me to submit the report tomorrow",
      "I need to book a flight for next week",
      "Create todo: Review pull requests"
    ];
    
    const userId = 'test_user_123';
    let conversationId = null;
    
    for (const message of testMessages) {
      console.log(`\n📝 Testing: "${message}"`);
      console.log('='.repeat(60));
      
      try {
        // Test direct task creation endpoint
        console.log('1️⃣ Testing direct task creation endpoint...');
        const directResponse = await fetch(`${API_URL}/api/chat-tasks/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-mock-user-id': userId,
            'x-user-id': userId,
            'x-organization-id': 'test_org'
          },
          body: JSON.stringify({
            message,
            userId
          })
        });
        
        if (directResponse.ok) {
          const result = await directResponse.json();
          console.log('   ✅ Task created:', result.task.title);
          console.log('   ID:', result.task.id);
        } else {
          const error = await directResponse.text();
          console.log('   ❌ Failed:', error);
        }
        
        // Test chat v2 endpoint
        console.log('\n2️⃣ Testing chat v2 endpoint...');
        const chatResponse = await fetch(`${API_URL}/api/chat/v2`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-mock-user-id': userId,
            'x-user-id': userId,
            'x-organization-id': 'test_org'
          },
          body: JSON.stringify({
            message,
            conversationId,
            metadata: {
              debug: true,
              test: 'task-creation'
            }
          })
        });
        
        if (chatResponse.ok) {
          const result = await chatResponse.json();
          console.log('   ✅ Chat response received');
          conversationId = result.conversationId || conversationId;
          
          // Check the response for task creation indication
          if (result.data?.response) {
            const responseText = typeof result.data.response === 'string' 
              ? result.data.response 
              : JSON.stringify(result.data.response);
            
            if (responseText.toLowerCase().includes('task') && 
                (responseText.toLowerCase().includes('created') || 
                 responseText.toLowerCase().includes('added'))) {
              console.log('   ✅ Task creation detected in response!');
            } else {
              console.log('   ⚠️ No task creation confirmation in response');
            }
            
            console.log('   Response preview:', responseText.substring(0, 100) + '...');
          }
          
          // Log routing information if available
          if (result.data?.routingDecision) {
            console.log('\n   🎯 Routing Decision:');
            console.log(`      Strategy: ${result.data.routingDecision.strategy}`);
            console.log(`      Task Type: ${result.data.routingDecision.taskAnalysis?.type}`);
            console.log(`      Selected Agents: ${result.data.routingDecision.selectedAgents?.map(a => a.name || a.id).join(', ')}`);
          }
        } else {
          const error = await chatResponse.text();
          console.log('   ❌ Failed:', error);
        }
        
      } catch (error) {
        console.error('   ❌ Error:', error.message);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Check if tasks were created
    console.log('\n\n3️⃣ Checking created tasks in Supabase...');
    console.log('='.repeat(60));
    
    // Get the UUID for our test user
    const userUUID = await userResolver.resolveUserId(userId);
    console.log(`User ID mapping: ${userId} → ${userUUID}`);
    
    const { data: tasks, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('created_by', userUUID)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (taskError) {
      console.error('❌ Error fetching tasks:', taskError);
    } else {
      console.log(`\n✅ Found ${tasks?.length || 0} tasks for user ${userUUID}:`);
      tasks?.forEach((task, idx) => {
        console.log(`\n${idx + 1}. Task ID: ${task.id}`);
        console.log(`   Title: ${task.title}`);
        console.log(`   Status: ${task.status}`);
        console.log(`   Priority: ${task.priority}`);
        console.log(`   Created: ${new Date(task.created_at).toLocaleString()}`);
        if (task.metadata?.source === 'chat') {
          console.log(`   ✅ Created via chat!`);
        }
      });
    }
    
    // 4. Summary
    console.log('\n\n📊 DEBUGGING SUMMARY');
    console.log('='.repeat(60));
    console.log('1. Task creation messages were sent to both endpoints');
    console.log('2. Check server logs for:');
    console.log('   - Task type detection (should be "create-task")');
    console.log('   - Agent routing (should route to TaskCreatorAgent)');
    console.log('   - UUID resolution logs');
    console.log('   - Task creation confirmation');
    console.log('3. Tasks should appear in the database with proper UUIDs');
    console.log('4. Tasks should be visible in the dashboard');
    console.log('\n✨ If tasks are not being created, check:');
    console.log('   - Is TalaIntelligence detecting the intent correctly?');
    console.log('   - Is TaskCreatorAgent being selected?');
    console.log('   - Are there any UUID resolution errors?');
    console.log('   - Is the task being saved to Supabase?');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  process.exit(0);
}

testTaskCreation();