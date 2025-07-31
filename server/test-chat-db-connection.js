/**
 * Test chat to database connection
 * Verifies that chat messages and tasks are being stored in Supabase
 */

import { config } from 'dotenv';
config();

import fetch from 'node-fetch';
import { getSupabaseService, initializeSupabase } from './db/supabaseClient.js';

const API_BASE = 'http://localhost:3001';
const TEST_USER_ID = 'test_user_456'; // Different from previous tests
const TEST_ORG_ID = 'test_org_123';

async function testChatV2Endpoint() {
  console.log('🔍 Testing Chat v2 Database Connection\n');
  
  try {
    // 1. Initialize Supabase
    console.log('1️⃣ Initializing Supabase...');
    const initResult = initializeSupabase();
    if (!initResult.success) {
      throw new Error('Failed to initialize Supabase');
    }
    const supabase = getSupabaseService();
    console.log('✅ Supabase connected\n');
    
    // 2. Test chat v2 endpoint
    console.log('2️⃣ Testing /api/chat/v2 endpoint...');
    
    const chatRequest = {
      message: "Create a task to test the database connection for chat v2",
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
          'x-organization-id': TEST_ORG_ID
        },
        body: JSON.stringify(chatRequest)
      });
      
      const result = await response.json();
      console.log('Response status:', response.status);
      console.log('Response:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        console.log('✅ Chat v2 endpoint responded successfully');
        console.log('   Conversation ID:', result.conversationId);
      } else {
        console.log('❌ Chat v2 endpoint failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Failed to call chat v2 endpoint:', error.message);
      console.log('\n💡 Make sure the server is running on port 3001');
    }
    console.log('');
    
    // 3. Check conversations in database
    console.log('3️⃣ Checking conversations in database...');
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', TEST_USER_ID)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (convError) {
      console.error('❌ Error fetching conversations:', convError);
    } else {
      console.log(`✅ Found ${conversations?.length || 0} conversations for user ${TEST_USER_ID}`);
      conversations?.forEach((conv, idx) => {
        console.log(`   ${idx + 1}. ${conv.title || 'Untitled'} (${conv.id})`);
      });
    }
    console.log('');
    
    // 4. Check messages in database
    console.log('4️⃣ Checking messages in database...');
    if (conversations && conversations.length > 0) {
      const latestConvId = conversations[0].id;
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', latestConvId)
        .order('created_at', { ascending: true });
      
      if (msgError) {
        console.error('❌ Error fetching messages:', msgError);
      } else {
        console.log(`✅ Found ${messages?.length || 0} messages in latest conversation`);
        messages?.forEach((msg, idx) => {
          console.log(`   ${idx + 1}. [${msg.role}]: ${msg.content.substring(0, 60)}...`);
        });
      }
    }
    console.log('');
    
    // 5. Check tasks created by this user
    console.log('5️⃣ Checking tasks in database...');
    const { data: tasks, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('created_by', TEST_USER_ID)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (taskError) {
      console.error('❌ Error fetching tasks:', taskError);
    } else {
      console.log(`✅ Found ${tasks?.length || 0} tasks created by ${TEST_USER_ID}`);
      tasks?.forEach((task, idx) => {
        console.log(`   ${idx + 1}. ${task.title} (${task.status})`);
      });
    }
    console.log('');
    
    // 6. Summary
    console.log('📊 SUMMARY');
    console.log('==========');
    console.log(`Conversations: ${conversations?.length || 0}`);
    console.log(`Tasks: ${tasks?.length || 0}`);
    
    if (!conversations || conversations.length === 0) {
      console.log('\n⚠️  No conversations found. The chat may still be using in-memory storage.');
      console.log('   Make sure the frontend is calling /api/chat/v2 instead of /api/chat');
    }
    
    if (!tasks || tasks.length === 0) {
      console.log('\n⚠️  No tasks found. Task creation through chat may not be working.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  process.exit(0);
}

testChatV2Endpoint();