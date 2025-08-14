#!/usr/bin/env node

/**
 * Test Database Connection and Conversation Storage
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testDatabase() {
  console.log('🔍 Testing Database Connection and Conversation Storage\n');
  console.log('=' .repeat(60) + '\n');
  
  // 1. Check environment variables
  console.log('1️⃣ Checking environment variables:');
  const envVars = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY
  };
  
  Object.entries(envVars).forEach(([key, value]) => {
    if (value) {
      console.log(`   ✅ ${key}: ${value.substring(0, 20)}...`);
    } else {
      console.log(`   ❌ ${key}: NOT SET`);
    }
  });
  
  if (!envVars.SUPABASE_URL || !envVars.SUPABASE_ANON_KEY) {
    console.log('\n❌ Missing required environment variables!');
    console.log('   Please check your .env file');
    return;
  }
  
  console.log('\n' + '-' .repeat(60) + '\n');
  
  // 2. Test Supabase connection
  console.log('2️⃣ Testing Supabase connection:');
  const { getSupabaseService, getSupabaseHealth } = await import('./db/supabaseClient.js');
  
  try {
    const health = await getSupabaseHealth();
    console.log('   Connection status:', health);
    
    if (!health.connected) {
      console.log('   ❌ Cannot connect to database!');
      return;
    }
    console.log('   ✅ Connected to Supabase');
  } catch (error) {
    console.log('   ❌ Connection test failed:', error.message);
    return;
  }
  
  console.log('\n' + '-' .repeat(60) + '\n');
  
  // 3. Check if conversations table exists
  console.log('3️⃣ Checking conversations table:');
  
  try {
    const supabase = getSupabaseService();
    
    // Try to query the conversations table
    const { data, error } = await supabase
      .from('conversations')
      .select('id, title, created_at')
      .limit(1);
    
    if (error) {
      console.log('   ❌ Conversations table error:', error.message);
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('   ⚠️  Table does not exist! Run migrations.');
      }
    } else {
      console.log('   ✅ Conversations table exists');
      console.log(`   Found ${data?.length || 0} conversations in sample query`);
    }
  } catch (error) {
    console.log('   ❌ Table check failed:', error.message);
  }
  
  console.log('\n' + '-' .repeat(60) + '\n');
  
  // 4. Test ConversationService
  console.log('4️⃣ Testing ConversationService:');
  
  try {
    const { ConversationService } = await import('./services/db/conversationService.js');
    const conversationService = new ConversationService();
    
    // Try to get recent conversations
    const result = await conversationService.getMany(
      { user_id: 'admin-1' }, // filters
      {
        pagination: { pageSize: 5 }
      }
    );
    
    if (result.success) {
      console.log(`   ✅ ConversationService works`);
      console.log(`   Found ${result.data?.length || 0} conversations for admin-1`);
      
      if (result.data && result.data.length > 0) {
        console.log('\n   Recent conversations:');
        result.data.forEach((conv, i) => {
          console.log(`   ${i + 1}. ${conv.title} (${conv.id})`);
        });
      }
    } else {
      console.log('   ❌ ConversationService error:', result.error?.message);
    }
  } catch (error) {
    console.log('   ❌ ConversationService test failed:', error.message);
  }
  
  console.log('\n' + '-' .repeat(60) + '\n');
  
  // 5. Test creating a conversation
  console.log('5️⃣ Testing conversation creation:');
  
  try {
    const { ConversationService } = await import('./services/db/conversationService.js');
    const conversationService = new ConversationService();
    
    // Try to resolve user ID first
    const userResolver = await import('./services/auth/UserResolver.js');
    const userId = await userResolver.default.resolveUserId('admin-1');
    const orgId = await userResolver.default.resolveOrgId('default');
    
    console.log(`   User ID resolved: ${userId}`);
    console.log(`   Org ID resolved: ${orgId}`);
    
    const testConversation = {
      organization_id: orgId,
      user_id: userId,
      title: 'Test Conversation ' + new Date().toISOString(),
      description: 'Created by database test script',
      metadata: {
        test: true,
        timestamp: new Date().toISOString()
      }
    };
    
    const result = await conversationService.createConversation(testConversation);
    
    if (result.success) {
      console.log('   ✅ Successfully created conversation');
      console.log(`   ID: ${result.data.id}`);
      console.log(`   Title: ${result.data.title}`);
      
      // Try to add a message
      const messageResult = await conversationService.addMessage({
        conversation_id: result.data.id,
        role: 'user',
        content: 'Test message from database test script',
        metadata: { test: true }
      });
      
      if (messageResult.success) {
        console.log('   ✅ Successfully added message');
      } else {
        console.log('   ❌ Failed to add message:', messageResult.error?.message);
      }
    } else {
      console.log('   ❌ Failed to create conversation:', result.error?.message);
    }
  } catch (error) {
    console.log('   ❌ Creation test failed:', error.message);
    console.log('   Error details:', error);
  }
  
  console.log('\n' + '-' .repeat(60) + '\n');
  
  // 6. Test ThreadingServiceDB
  console.log('6️⃣ Testing ThreadingServiceDB:');
  
  try {
    const { ThreadingServiceDB } = await import('./services/conversations/ThreadingServiceDB.js');
    const threadingService = new ThreadingServiceDB();
    await threadingService.initialize();
    
    // Create a test thread
    const thread = await threadingService.createThread({
      userId: 'admin-1',
      organizationId: 'default',
      title: 'Test Thread ' + new Date().toISOString(),
      metadata: {
        test: true,
        mode: 'travel'
      }
    });
    
    console.log('   ✅ Created thread:', thread.id);
    console.log('   Is UUID format?:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(thread.id) ? '✅ YES' : '❌ NO');
    
    // Add a message
    await threadingService.addMessage(thread.id, {
      role: 'user',
      content: 'Test message from ThreadingServiceDB'
    });
    
    // Get messages
    const messages = await threadingService.getThreadMessages(thread.id);
    console.log(`   Found ${messages.length} messages in thread`);
    
  } catch (error) {
    console.log('   ❌ ThreadingServiceDB test failed:', error.message);
    console.log('   Error details:', error);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('✨ Database test complete!\n');
  console.log('Summary:');
  console.log('- Check if all tests passed above');
  console.log('- If conversations table doesn\'t exist, run migrations');
  console.log('- If user/org resolution fails, check UserResolver configuration');
}

// Run the test
testDatabase().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});