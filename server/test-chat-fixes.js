/**
 * Test the complete chat to database flow after fixes
 */

import { config } from 'dotenv';
config();

import fetch from 'node-fetch';
import { getSupabaseService, initializeSupabase } from './db/supabaseClient.js';

const API_BASE = 'http://localhost:3001';
const TEST_USER_ID = 'user_test_789';
const TEST_ORG_ID = 'org_test_123';

async function testChatFixes() {
  console.log('🔍 Testing Chat Fixes\n');
  
  try {
    // 1. Initialize Supabase
    console.log('1️⃣ Initializing Supabase...');
    const initResult = initializeSupabase();
    if (!initResult.success) {
      throw new Error('Failed to initialize Supabase');
    }
    const supabase = getSupabaseService();
    console.log('✅ Supabase connected\n');
    
    // 2. Test multiple chat messages
    console.log('2️⃣ Testing chat messages...\n');
    
    const testMessages = [
      "Hello, I need help with my tasks",
      "Create a task to review the quarterly financial report",
      "Add a task to call the dentist tomorrow at 2pm",
      "What tasks do I have pending?"
    ];
    
    let conversationId = null;
    
    for (const message of testMessages) {
      console.log(`📝 Sending: "${message}"`);
      
      const chatRequest = {
        message,
        conversationId,
        metadata: {
          test: true,
          timestamp: new Date().toISOString()
        }
      };
      
      try {
        const response = await fetch(`${API_BASE}/api/chat/v2`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': TEST_USER_ID,
            'x-organization-id': TEST_ORG_ID,
            'x-mock-user-id': TEST_USER_ID // For mock auth
          },
          body: JSON.stringify(chatRequest)
        });
        
        const result = await response.json();
        
        if (result.success) {
          console.log('✅ Response received');
          conversationId = result.conversationId || conversationId;
          console.log(`   Conversation ID: ${conversationId}`);
          
          if (result.metadata?.taskCreated || result.response?.task) {
            console.log('   ✅ Task created!');
          }
        } else {
          console.log('❌ Error:', result.error || 'Unknown error');
        }
      } catch (error) {
        console.error('❌ Request failed:', error.message);
      }
      
      console.log('');
      
      // Small delay between messages
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // 3. Check conversations in database
    console.log('\n3️⃣ Checking conversations in database...');
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', TEST_USER_ID)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (convError) {
      console.error('❌ Error fetching conversations:', convError);
      console.log('\n💡 You may need to run the schema migration:');
      console.log('   Run this SQL in Supabase: db/migrations/fix-conversation-schema.sql');
    } else {
      console.log(`✅ Found ${conversations?.length || 0} conversations`);
      conversations?.forEach((conv, idx) => {
        console.log(`   ${idx + 1}. ${conv.title || 'Untitled'}`);
        console.log(`      ID: ${conv.id}`);
        console.log(`      Created: ${new Date(conv.created_at).toLocaleString()}`);
      });
    }
    
    // 4. Check messages
    console.log('\n4️⃣ Checking messages...');
    if (conversations && conversations.length > 0) {
      const latestConv = conversations[0];
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', latestConv.id)
        .order('created_at', { ascending: true });
      
      if (msgError) {
        console.error('❌ Error fetching messages:', msgError);
      } else {
        console.log(`✅ Found ${messages?.length || 0} messages in latest conversation`);
        messages?.slice(-5).forEach((msg, idx) => {
          console.log(`   ${idx + 1}. [${msg.role}]: ${msg.content.substring(0, 50)}...`);
        });
      }
    }
    
    // 5. Check tasks
    console.log('\n5️⃣ Checking tasks created...');
    const { data: tasks, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('created_by', TEST_USER_ID)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (taskError) {
      console.error('❌ Error fetching tasks:', taskError);
    } else {
      console.log(`✅ Found ${tasks?.length || 0} tasks`);
      tasks?.forEach((task, idx) => {
        console.log(`   ${idx + 1}. ${task.title}`);
        console.log(`      Status: ${task.status}, Priority: ${task.priority}`);
        console.log(`      Created: ${new Date(task.created_at).toLocaleString()}`);
      });
    }
    
    // 6. Summary
    console.log('\n📊 SUMMARY');
    console.log('==========');
    console.log(`✅ Conversations: ${conversations?.length || 0}`);
    console.log(`✅ Messages: ${(conversations && conversations[0]) ? 'Stored' : 'Not found'}`);
    console.log(`✅ Tasks: ${tasks?.length || 0}`);
    
    if ((!conversations || conversations.length === 0) && convError?.code === '22P02') {
      console.log('\n⚠️  IMPORTANT: The conversation storage is failing due to UUID type mismatch.');
      console.log('   Please run the schema migration in Supabase SQL editor:');
      console.log('   File: /server/db/migrations/fix-conversation-schema.sql');
    }
    
    console.log('\n🎉 Test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  process.exit(0);
}

// Add delay before running to ensure server is ready
console.log('⏳ Waiting for server to be ready...');
setTimeout(testChatFixes, 2000);