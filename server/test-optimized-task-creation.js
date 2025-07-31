/**
 * Test optimized task creation with better titles
 */

import { config } from 'dotenv';
config();

import fetch from 'node-fetch';
import { getSupabaseService, initializeSupabase } from './db/supabaseClient.js';
import userResolver from './services/auth/UserResolver.js';

const API_URL = 'http://localhost:3001';

async function testOptimizedTaskCreation() {
  console.log('🧪 Testing Optimized Task Creation\n');
  
  try {
    // Initialize
    initializeSupabase();
    await userResolver.initialize();
    const supabase = getSupabaseService();
    
    // Test cases with expected concise titles
    const testCases = [
      {
        message: "create a task to reach out to Sara by 11pm for her NCCL cruise",
        expectedTitle: "reach out to sara",
        expectedTime: "11:00 PM"
      },
      {
        message: "remind me to call John tomorrow at 3pm about the Tokyo trip",
        expectedTitle: "call john",
        expectedTime: "3:00 PM tomorrow"
      },
      {
        message: "I need to book flights for the Miller family vacation next week",
        expectedTitle: "book flights",
        expectedTime: "next week"
      },
      {
        message: "create a task to review the quarterly report by end of day",
        expectedTitle: "review the quarterly",
        expectedTime: "end of day"
      },
      {
        message: "add a reminder to send the visa application documents to the embassy",
        expectedTitle: "send the visa",
        expectedTime: "no specific time"
      }
    ];
    
    console.log('📋 Test Cases:\n');
    
    for (const testCase of testCases) {
      console.log(`\n🔹 Input: "${testCase.message}"`);
      console.log(`   Expected title: "${testCase.expectedTitle}"`);
      
      // Send chat request
      const response = await fetch(`${API_URL}/api/chat/v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'admin-1'
        },
        body: JSON.stringify({
          message: testCase.message,
          userId: 'admin-1'
        })
      });
      
      if (response.ok) {
        console.log('   ✅ Request successful');
      } else {
        console.log('   ❌ Request failed:', response.status);
      }
      
      // Small delay to ensure task is created
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Check created tasks
    console.log('\n\n📊 Checking Created Tasks...\n');
    const adminUUID = await userResolver.resolveUserId('admin-1');
    
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('created_by', adminUUID)
      .order('created_at', { ascending: false })
      .limit(testCases.length);
    
    if (error) {
      console.error('❌ Error fetching tasks:', error);
      return;
    }
    
    console.log(`Found ${tasks?.length || 0} recent tasks:\n`);
    tasks?.forEach((task, idx) => {
      console.log(`${idx + 1}. Title: "${task.title}"`);
      console.log(`   Description: ${task.description ? `"${task.description.substring(0, 80)}..."` : 'None'}`);
      console.log(`   Due date: ${task.due_date || 'Not set'}`);
      console.log(`   Priority: ${task.priority}`);
      console.log('   ---');
    });
    
    console.log('\n✨ Optimization Summary:');
    console.log('- Titles should be concise (2-3 words)');
    console.log('- Full request saved in description');
    console.log('- Time/date extracted to due_date field');
    console.log('- Priority detected from keywords');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  process.exit(0);
}

testOptimizedTaskCreation();