/**
 * Complete Reset and Test Script
 * Run this in browser console to clear old data and test the fixed system
 */

// Step 1: Clear ALL old data
function clearAllData() {
  console.log('🧹 Clearing all old conversation data...');
  
  // Remove all tala-related localStorage
  const keys = Object.keys(localStorage).filter(k => k.includes('tala'));
  keys.forEach(key => {
    console.log(`   Removing: ${key}`);
    localStorage.removeItem(key);
  });
  
  console.log(`✅ Cleared ${keys.length} localStorage items`);
  console.log('🔄 Refreshing page in 2 seconds...');
  
  setTimeout(() => {
    window.location.reload();
  }, 2000);
}

// Step 2: Send test message to create proper backend conversation
async function sendTestMessage() {
  console.log('📤 Sending test message to create backend conversation...');
  
  try {
    const response = await fetch('http://localhost:3001/api/chat/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'admin-1'
      },
      body: JSON.stringify({
        message: 'Hello, this is a test message',
        mode: 'travel',
        searchKnowledge: false
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Message sent successfully!');
      console.log('🔑 Backend conversation ID:', data.conversationId);
      console.log('💬 Response:', data.response?.substring(0, 100) + '...');
      
      if (data.conversationId?.startsWith('conv-')) {
        console.error('❌ ERROR: Backend is still returning frontend-style IDs!');
        console.error('   The backend needs to be fixed to create proper thread IDs');
      } else {
        console.log('✅ Backend returned proper thread ID (not conv-xxx)');
      }
      
      return data.conversationId;
    } else {
      console.error('❌ Failed to send message:', response.status);
      const error = await response.text();
      console.error('   Error:', error);
    }
  } catch (error) {
    console.error('❌ Network error:', error);
  }
  
  return null;
}

// Step 3: Verify conversation appears in list
async function checkConversationList() {
  console.log('📋 Checking conversation list...');
  
  try {
    const response = await fetch('http://localhost:3001/api/conversations', {
      headers: {
        'x-user-id': 'admin-1'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Found ${data.conversations?.length || 0} conversations in backend`);
      
      if (data.conversations && data.conversations.length > 0) {
        console.log('   Recent conversations:');
        data.conversations.slice(0, 3).forEach((conv, i) => {
          console.log(`   ${i + 1}. ${conv.title || 'Untitled'}`);
          console.log(`      ID: ${conv.id}`);
          console.log(`      Frontend-style?: ${conv.id?.startsWith('conv-') ? '❌ YES' : '✅ NO'}`);
        });
      }
      
      return data.conversations;
    } else {
      console.error('❌ Failed to get conversations:', response.status);
    }
  } catch (error) {
    console.error('❌ Network error:', error);
  }
  
  return [];
}

// Step 4: Load messages for a conversation
async function loadMessages(conversationId) {
  console.log(`💬 Loading messages for conversation: ${conversationId}`);
  
  try {
    const response = await fetch(`http://localhost:3001/api/conversations/${conversationId}/messages`, {
      headers: {
        'x-user-id': 'admin-1'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Found ${data.messages?.length || 0} messages`);
      
      if (data.messages && data.messages.length > 0) {
        console.log('   Sample messages:');
        data.messages.slice(0, 2).forEach((msg, i) => {
          console.log(`   ${i + 1}. ${msg.sender || msg.role}: "${msg.content?.substring(0, 50)}..."`);
        });
      }
      
      return data.messages;
    } else {
      console.error('❌ Failed to load messages:', response.status);
    }
  } catch (error) {
    console.error('❌ Network error:', error);
  }
  
  return [];
}

// Main test flow
async function runCompleteTest() {
  console.clear();
  console.log('🚀 TALA AI CONVERSATION SYSTEM TEST');
  console.log('=' .repeat(60) + '\n');
  
  console.log('This test will:');
  console.log('1. Clear all old data');
  console.log('2. Send a test message');
  console.log('3. Verify backend conversation creation');
  console.log('4. Check if messages can be loaded\n');
  
  const proceed = confirm('This will clear all your conversation data. Continue?');
  
  if (!proceed) {
    console.log('❌ Test cancelled');
    return;
  }
  
  // Clear data
  clearAllData();
  
  console.log('\n⏳ Page will refresh in 2 seconds...');
  console.log('   After refresh, run: testNewSystem()');
}

// Function to run after page refresh
async function testNewSystem() {
  console.clear();
  console.log('🧪 Testing New Conversation System');
  console.log('=' .repeat(60) + '\n');
  
  // Send test message
  const conversationId = await sendTestMessage();
  
  if (!conversationId) {
    console.error('\n❌ Failed to create conversation. Check server logs.');
    return;
  }
  
  console.log('\n' + '-' .repeat(60) + '\n');
  
  // Wait a bit for backend to process
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Check conversation list
  const conversations = await checkConversationList();
  
  console.log('\n' + '-' .repeat(60) + '\n');
  
  // Load messages
  if (conversationId) {
    await loadMessages(conversationId);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ Test complete!');
  
  // Check localStorage state
  console.log('\n📦 Current localStorage state:');
  const currentConv = localStorage.getItem('tala_current_conversation');
  const convList = localStorage.getItem('tala_conversations_admin-1');
  
  if (currentConv) {
    const parsed = JSON.parse(currentConv);
    console.log('   Current conversation ID:', parsed.id);
    console.log('   Is frontend ID?:', parsed.id?.startsWith('conv-') ? '❌ YES' : '✅ NO');
  }
  
  if (convList) {
    const list = JSON.parse(convList);
    console.log(`   Total conversations in cache: ${list.length}`);
  }
  
  console.log('\n💡 Next steps:');
  console.log('1. Try sending a message in the UI');
  console.log('2. Refresh and see if conversation loads');
  console.log('3. Click on conversation in sidebar');
}

// Print instructions
console.log('🎯 CONVERSATION FIX TEST TOOL\n');
console.log('Commands:');
console.log('  runCompleteTest() - Clear all data and start fresh');
console.log('  testNewSystem() - Test after page refresh');
console.log('  clearAllData() - Just clear all data');
console.log('  sendTestMessage() - Create a test conversation');
console.log('  checkConversationList() - List backend conversations');
console.log('\nRun runCompleteTest() to begin');