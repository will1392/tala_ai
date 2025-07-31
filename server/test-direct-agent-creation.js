/**
 * Test TaskCreatorAgent directly
 * This bypasses the chat endpoints to test if the agent itself works
 */

import { config } from 'dotenv';
config();

import { TaskCreatorAgent } from './services/agents/TaskCreatorAgent.js';
import { getSupabaseService, initializeSupabase } from './db/supabaseClient.js';
import userResolver from './services/auth/UserResolver.js';

async function testDirectAgentCreation() {
  console.log('🧪 Testing TaskCreatorAgent directly\n');
  
  try {
    // Initialize services
    console.log('1️⃣ Initializing services...');
    initializeSupabase();
    await userResolver.initialize();
    console.log('✅ Services initialized\n');
    
    // Create agent instance
    console.log('2️⃣ Creating TaskCreatorAgent...');
    const agent = new TaskCreatorAgent({
      userId: 'test_user_123',
      id: 'test-agent'
    });
    await agent.initialize();
    console.log('✅ Agent initialized\n');
    
    // Test task creation
    console.log('3️⃣ Creating test task...');
    const task = {
      content: 'create a task to review the documentation',
      data: {
        userId: 'test_user_123'
      },
      userId: 'test_user_123'
    };
    
    const context = {
      userProfile: {
        userId: 'test_user_123',
        preferences: {}
      }
    };
    
    const result = await agent.performTask(task, context);
    console.log('✅ Task creation result:', result);
    
    // Check if task was saved
    console.log('\n4️⃣ Checking if task was saved...');
    const supabase = getSupabaseService();
    const userUUID = await userResolver.resolveUserId('test_user_123');
    
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('created_by', userUUID)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('❌ Error fetching tasks:', error);
    } else {
      console.log(`\n✅ Found ${tasks?.length || 0} tasks for user ${userUUID}:`);
      tasks?.forEach((task, idx) => {
        console.log(`\n${idx + 1}. Task: ${task.title}`);
        console.log(`   ID: ${task.id}`);
        console.log(`   Status: ${task.status}`);
        console.log(`   Created: ${new Date(task.created_at).toLocaleString()}`);
      });
    }
    
    console.log('\n✨ Test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

testDirectAgentCreation();