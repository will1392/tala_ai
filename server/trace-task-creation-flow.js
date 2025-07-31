#!/usr/bin/env node

/**
 * Trace task creation flow through the system
 * This script simulates the exact flow when a task is created via chat
 */

import TalaIntelligence from './services/intelligence/TalaIntelligence.js';
import { TaskCreatorAgent } from './services/agents/TaskCreatorAgent.js';
import userResolver from './services/auth/UserResolver.js';

async function traceTaskCreation() {
  console.log('=== TASK CREATION FLOW TRACE ===\n');
  
  try {
    // 1. Simulate a chat request
    const testUserId = 'test_user_123';
    const chatMessage = 'Create a task to review the quarterly report';
    
    console.log('📥 Incoming chat request:');
    console.log(`   User ID: ${testUserId}`);
    console.log(`   Message: "${chatMessage}"\n`);
    
    // 2. Initialize intelligence system
    console.log('🧠 Initializing TalaIntelligence...');
    const intelligence = new TalaIntelligence({ mockMode: true });
    await intelligence.initialize();
    
    // 3. Process the request
    console.log('\n📊 Processing request through TalaIntelligence...');
    const request = {
      userId: testUserId,
      content: chatMessage,
      source: 'chat',
      timestamp: new Date()
    };
    
    // 4. Analyze the task type
    console.log('\n🔍 Analyzing task type...');
    const mockContext = {
      contextWindow: [],
      relevantMemories: [],
      thread: { id: 'test-thread' },
      recentMessages: [],
      userProfile: {
        userId: testUserId,
        preferences: { responseStyle: 'balanced' }
      }
    };
    
    const taskAnalysis = await intelligence.analyzeTask(request, mockContext);
    console.log(`   Task type detected: ${taskAnalysis.type}`);
    console.log(`   Complexity: ${taskAnalysis.complexity}`);
    console.log(`   Extracted data:`, taskAnalysis.extractedData);
    
    // 5. Check routing decision
    console.log('\n🎯 Making routing decision...');
    const routingDecision = await intelligence.makeRoutingDecision(request, mockContext, mockContext.userProfile);
    console.log(`   Strategy: ${routingDecision.strategy}`);
    console.log(`   Selected agents: ${routingDecision.selectedAgents.map(a => a.name || a.id).join(', ')}`);
    
    // 6. Test TaskCreatorAgent directly
    console.log('\n🤖 Testing TaskCreatorAgent directly...');
    const taskCreatorAgent = new TaskCreatorAgent({ userId: testUserId });
    await taskCreatorAgent.initialize();
    
    // 7. Test user ID resolution
    console.log('\n👤 Testing user ID resolution...');
    console.log(`   Input user ID: ${testUserId}`);
    const resolvedUserId = await userResolver.resolveUserId(testUserId);
    console.log(`   Resolved UUID: ${resolvedUserId}`);
    console.log(`   Is valid UUID: ${userResolver.isValidUUID(resolvedUserId)}`);
    
    // 8. Execute task creation
    console.log('\n📝 Executing task creation...');
    const task = {
      type: 'create-task',
      content: chatMessage,
      userId: testUserId,
      data: {
        userId: testUserId,
        taskTitle: taskAnalysis.extractedData.taskTitle || 'Review quarterly report'
      }
    };
    
    console.log('   Task object being passed:', JSON.stringify(task, null, 2));
    
    try {
      const result = await taskCreatorAgent.performTask(task, mockContext);
      console.log('\n✅ Task creation result:');
      console.log(`   Task ID: ${result.task?.id || 'N/A'}`);
      console.log(`   Title: ${result.task?.title || 'N/A'}`);
      console.log(`   Created by: ${result.task?.created_by || 'N/A'}`);
      console.log(`   Message: ${result.message}`);
    } catch (error) {
      console.error('\n❌ Task creation failed:', error.message);
      console.error('   Stack:', error.stack);
    }
    
    // 9. Check what would happen through the full intelligence flow
    console.log('\n🔄 Testing full intelligence flow...');
    try {
      const fullResult = await intelligence.processRequest(request);
      console.log('   Success:', fullResult.success);
      console.log('   Response:', fullResult.response?.content || fullResult.response);
      console.log('   Metadata:', fullResult.metadata);
    } catch (error) {
      console.error('   Intelligence flow error:', error.message);
    }
    
  } catch (error) {
    console.error('\n❌ Trace failed:', error);
    console.error(error.stack);
  }
  
  console.log('\n=== TRACE COMPLETE ===');
  process.exit(0);
}

// Run the trace
traceTaskCreation();