/**
 * Frontend Debugging Script
 * Copy and paste this into browser console to debug conversation state
 */

// Debug function to check conversation state
function debugConversationState() {
  console.log('🔍 DEBUGGING CONVERSATION STATE\n');
  console.log('=' .repeat(50));
  
  // 1. Check current conversation
  const currentConv = localStorage.getItem('tala_current_conversation');
  if (currentConv) {
    const parsed = JSON.parse(currentConv);
    console.log('📌 Current Conversation:');
    console.log('   ID:', parsed.id);
    console.log('   Title:', parsed.title);
    console.log('   Is Frontend ID (conv-xxx)?:', parsed.id?.startsWith('conv-'));
    console.log('   Updated:', new Date(parsed.updatedAt).toLocaleString());
  } else {
    console.log('❌ No current conversation');
  }
  
  console.log('\n' + '=' .repeat(50));
  
  // 2. List all conversations
  const convList = localStorage.getItem('tala_conversations_admin-1');
  if (convList) {
    const list = JSON.parse(convList);
    console.log(`📚 Found ${list.length} conversations:`);
    list.slice(0, 5).forEach((conv, i) => {
      console.log(`\n   ${i + 1}. ${conv.title || 'Untitled'}`);
      console.log(`      ID: ${conv.id}`);
      console.log(`      Frontend ID?: ${conv.id?.startsWith('conv-') ? '❌ YES (BAD)' : '✅ NO (GOOD)'}`);
      console.log(`      Messages: ${conv.messageCount || 0}`);
      console.log(`      Updated: ${new Date(conv.updatedAt).toLocaleString()}`);
    });
    
    // Check for problematic IDs
    const frontendIds = list.filter(c => c.id?.startsWith('conv-'));
    if (frontendIds.length > 0) {
      console.log(`\n⚠️  WARNING: Found ${frontendIds.length} conversations with frontend IDs!`);
      console.log('   These should be replaced with backend IDs');
    }
  } else {
    console.log('📚 No conversations found');
  }
  
  console.log('\n' + '=' .repeat(50));
  
  // 3. Check cached messages
  const messageKeys = Object.keys(localStorage).filter(k => k.startsWith('tala_messages_'));
  console.log(`💬 Found ${messageKeys.length} cached message sets:`);
  messageKeys.slice(0, 3).forEach(key => {
    const convId = key.replace('tala_messages_', '');
    const messages = JSON.parse(localStorage.getItem(key));
    console.log(`\n   Conv ID: ${convId}`);
    console.log(`   Frontend ID?: ${convId.startsWith('conv-') ? '❌ YES' : '✅ NO'}`);
    console.log(`   Messages: ${messages.length}`);
    if (messages.length > 0) {
      console.log(`   First: "${messages[0].content?.substring(0, 50)}..."`);
      console.log(`   Last: "${messages[messages.length - 1].content?.substring(0, 50)}..."`);
    }
  });
  
  console.log('\n' + '=' .repeat(50));
  console.log('✨ Debug complete\n');
  
  return {
    currentConversationId: currentConv ? JSON.parse(currentConv).id : null,
    conversationCount: convList ? JSON.parse(convList).length : 0,
    hasFrontendIds: convList ? JSON.parse(convList).some(c => c.id?.startsWith('conv-')) : false,
    messageSets: messageKeys.length
  };
}

// Function to clean up old frontend IDs
function cleanupFrontendIds() {
  console.log('🧹 Cleaning up frontend IDs...\n');
  
  // Remove conversations with frontend IDs
  const convList = localStorage.getItem('tala_conversations_admin-1');
  if (convList) {
    const list = JSON.parse(convList);
    const cleaned = list.filter(c => !c.id?.startsWith('conv-'));
    localStorage.setItem('tala_conversations_admin-1', JSON.stringify(cleaned));
    console.log(`✅ Removed ${list.length - cleaned.length} frontend conversations`);
  }
  
  // Remove message caches with frontend IDs
  const messageKeys = Object.keys(localStorage).filter(k => 
    k.startsWith('tala_messages_conv-')
  );
  messageKeys.forEach(key => {
    localStorage.removeItem(key);
  });
  console.log(`✅ Removed ${messageKeys.length} frontend message caches`);
  
  // Clear current conversation if it's a frontend ID
  const currentConv = localStorage.getItem('tala_current_conversation');
  if (currentConv) {
    const parsed = JSON.parse(currentConv);
    if (parsed.id?.startsWith('conv-')) {
      localStorage.removeItem('tala_current_conversation');
      console.log('✅ Cleared current conversation (was frontend ID)');
    }
  }
  
  console.log('\n🎉 Cleanup complete! Refresh the page to start fresh.');
}

// Function to test backend connectivity
async function testBackendConnection() {
  console.log('🌐 Testing backend connection...\n');
  
  try {
    // Test conversations endpoint
    const response = await fetch('http://localhost:3001/api/conversations', {
      headers: { 'x-user-id': 'admin-1' }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend is reachable');
      console.log(`   Found ${data.conversations?.length || 0} backend conversations`);
      
      if (data.conversations && data.conversations.length > 0) {
        console.log('\n   First 3 backend conversations:');
        data.conversations.slice(0, 3).forEach((conv, i) => {
          console.log(`   ${i + 1}. ${conv.title || 'Untitled'} (${conv.id})`);
        });
      }
    } else {
      console.log('❌ Backend returned error:', response.status);
    }
  } catch (error) {
    console.log('❌ Cannot reach backend:', error.message);
    console.log('   Make sure the server is running on port 3001');
  }
}

// Run all diagnostics
async function runFullDiagnostics() {
  console.clear();
  console.log('🚀 TALA AI CONVERSATION DIAGNOSTICS');
  console.log('=' .repeat(60) + '\\n');
  
  // 1. Check current state
  const state = debugConversationState();
  
  // 2. Test backend
  await testBackendConnection();
  
  console.log('\\n' + '=' .repeat(60));
  console.log('📊 SUMMARY:');
  console.log(`   Current Conv ID: ${state.currentConversationId || 'None'}`);
  console.log(`   Total Conversations: ${state.conversationCount}`);
  console.log(`   Has Frontend IDs: ${state.hasFrontendIds ? '❌ Yes (needs cleanup)' : '✅ No'}`);
  console.log(`   Cached Message Sets: ${state.messageSets}`);
  
  if (state.hasFrontendIds) {
    console.log('\\n⚠️  Action Required:');
    console.log('   Run cleanupFrontendIds() to remove old frontend IDs');
  }
  
  console.log('\\n✨ Diagnostics complete!');
  console.log('\\nAvailable commands:');
  console.log('  debugConversationState() - Check current state');
  console.log('  cleanupFrontendIds() - Remove old frontend IDs');
  console.log('  testBackendConnection() - Test backend API');
  console.log('  runFullDiagnostics() - Run all checks');
}

// Auto-run diagnostics
runFullDiagnostics();