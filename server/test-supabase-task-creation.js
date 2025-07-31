/**
 * Test task creation with Supabase database
 * 
 * This script tests the full flow of creating tasks through the chat interface
 * using the real PostgreSQL database via Supabase
 */

import { config } from 'dotenv';
config();

import { TaskManager } from './services/tasks/TaskManager.js';
import { getSharedDb, initializeSharedDb } from './services/db/sharedDatabase.js';
import { TaskCreatorAgent } from './services/agents/TaskCreatorAgent.js';

async function testTaskCreation() {
  console.log('🚀 Testing task creation with Supabase...\n');
  
  try {
    // 1. Initialize shared database
    console.log('1️⃣ Initializing shared database...');
    const sharedDb = await initializeSharedDb();
    console.log('✅ Shared database initialized\n');
    
    // 2. Create TaskManager instance
    console.log('2️⃣ Creating TaskManager...');
    const taskManager = new TaskManager({
      userId: 'test_user_123',
      db: sharedDb
    });
    await taskManager.initialize();
    console.log('✅ TaskManager initialized\n');
    
    // 3. Create a test task directly
    console.log('3️⃣ Creating task directly via TaskManager...');
    const directTask = await taskManager.createTask({
      title: 'Test Task via TaskManager',
      description: 'This task was created directly through TaskManager with Supabase',
      priority: 'high',
      status: 'pending',
      tags: ['test', 'supabase', 'direct']
    });
    console.log('✅ Direct task created:', directTask.id);
    console.log('   Title:', directTask.title);
    console.log('   Priority:', directTask.priority);
    console.log('   Created by:', directTask.createdBy);
    console.log('   Created at:', directTask.createdAt, '\n');
    
    // 4. Test TaskCreatorAgent
    console.log('4️⃣ Testing TaskCreatorAgent...');
    const agent = new TaskCreatorAgent({
      userId: 'test_user_123'
    });
    await agent.initialize();
    
    const agentResult = await agent.execute({
      type: 'create-task',
      content: 'Create a task to migrate all mock data to Supabase database',
      userId: 'test_user_123',
      data: {
        userId: 'test_user_123'
      }
    });
    
    if (agentResult.success) {
      console.log('✅ Agent task created successfully');
      if (agentResult.result && agentResult.result.task) {
        console.log('   Task ID:', agentResult.result.task.id);
        console.log('   Title:', agentResult.result.task.title);
        console.log('   Description:', agentResult.result.task.description);
      } else if (agentResult.data && agentResult.data.task) {
        console.log('   Task ID:', agentResult.data.task.id);
        console.log('   Title:', agentResult.data.task.title);
        console.log('   Description:', agentResult.data.task.description);
      } else {
        console.log('   Result:', JSON.stringify(agentResult, null, 2));
      }
    } else {
      console.error('❌ Agent task creation failed:', agentResult.error);
    }
    console.log('\n');
    
    // 5. List all tasks for the user
    console.log('5️⃣ Listing all tasks for user...');
    const userTasks = await taskManager.listTasks({
      createdBy: 'test_user_123',
      limit: 10
    });
    console.log(`✅ Found ${userTasks.total || userTasks.length || '?'} tasks for user:`);
    const taskList = userTasks.tasks || userTasks;
    if (Array.isArray(taskList)) {
      taskList.forEach((task, idx) => {
        console.log(`   ${idx + 1}. "${task.title}" - ${task.status} (${task.priority})`);
      });
    } else {
      console.log('   Response:', JSON.stringify(userTasks, null, 2));
    }
    
    console.log('\n🎉 Supabase task creation test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

// Run the test
testTaskCreation();