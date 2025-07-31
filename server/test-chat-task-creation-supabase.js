/**
 * Test task creation through the chat service
 * 
 * This simulates a user asking to create a task through the chat interface
 */

import { config } from 'dotenv';
config();

import { TalaIntelligence } from './services/intelligence/TalaIntelligence.js';
import { initializeSharedDb } from './services/db/sharedDatabase.js';

async function testChatTaskCreation() {
  console.log('💬 Testing task creation through chat interface...\n');
  
  try {
    // 1. Initialize shared database
    console.log('1️⃣ Initializing database...');
    await initializeSharedDb();
    console.log('✅ Database initialized\n');
    
    // 2. Create TalaIntelligence instance
    console.log('2️⃣ Creating TalaIntelligence instance...');
    const tala = new TalaIntelligence({
      mockMode: true  // Use mock LLM responses
    });
    await tala.initialize();
    console.log('✅ TalaIntelligence initialized\n');
    
    // 3. Test various task creation requests
    const testRequests = [
      "Create a task to review the quarterly report by next Friday",
      "Add a todo to call the dentist tomorrow",
      "Remind me to submit the expense report",
      "I need to book flights to New York for the conference next month",
      "Make a task for preparing the presentation slides with high priority"
    ];
    
    for (const request of testRequests) {
      console.log(`📝 Testing: "${request}"`);
      
      const result = await tala.processRequest({
        content: request,
        userId: 'test_user_123',
        conversationId: 'test-conversation',
        data: {
          userId: 'test_user_123'
        }
      });
      
      if (result.success) {
        console.log(`✅ Success: ${result.response}`);
        if (result.metadata?.taskCreated) {
          console.log(`   Task ID: ${result.metadata.taskId}`);
        }
      } else {
        console.log(`❌ Failed: ${result.error}`);
      }
      console.log('');
    }
    
    // 4. Check if tasks were created
    console.log('4️⃣ Verifying tasks in database...');
    const { TaskManager } = await import('./services/tasks/TaskManager.js');
    const taskManager = new TaskManager({
      userId: 'test_user_123',
      db: await initializeSharedDb()
    });
    await taskManager.initialize();
    
    const tasks = await taskManager.getUserTasks('test_user_123', {
      limit: 20,
      orderBy: 'created_at',
      orderDirection: 'desc'
    });
    
    console.log(`\n📊 Total tasks in database: ${tasks.total}`);
    console.log('\nRecent tasks:');
    tasks.tasks.slice(0, 10).forEach((task, idx) => {
      const createdAt = new Date(task.createdAt).toLocaleString();
      console.log(`${idx + 1}. [${task.priority}] "${task.title}"`);
      console.log(`   Status: ${task.status}, Created: ${createdAt}`);
      if (task.description) {
        console.log(`   Description: ${task.description}`);
      }
      console.log('');
    });
    
    console.log('🎉 Chat task creation test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

// Run the test
testChatTaskCreation();