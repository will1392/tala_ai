/**
 * Complete cleanup and fix script for Tala AI Chat
 * Run this in browser console to fix all known issues
 */

(function cleanupAndFix() {
  console.log('🔧 Starting comprehensive cleanup...\n');
  
  // 1. Remove mock conversations
  console.log('📋 Step 1: Removing mock conversations...');
  const listKey = 'tala_conversations_admin-1';
  const stored = localStorage.getItem(listKey);
  
  if (stored) {
    const conversations = JSON.parse(stored);
    const originalCount = conversations.length;
    
    // Filter out mock conversations and frontend IDs
    const filtered = conversations.filter(conv => {
      // Remove mock conversations
      if (conv.title === 'Marketing Campaign Ideas' || 
          conv.title === 'Iceland Northern Lights') {
        console.log(`  ❌ Removing mock: ${conv.title}`);
        return false;
      }
      
      // Remove any conversation with frontend-generated IDs
      if (conv.id && conv.id.startsWith('conv-')) {
        console.log(`  ❌ Removing frontend ID: ${conv.id} (${conv.title || 'Untitled'})`);
        return false;
      }
      
      return true;
    });
    
    // Save the filtered list
    localStorage.setItem(listKey, JSON.stringify(filtered));
    
    const removed = originalCount - filtered.length;
    console.log(`  ✅ Removed ${removed} invalid conversations`);
    console.log(`  📚 ${filtered.length} valid conversations remain\n`);
    
    // Show remaining conversations
    if (filtered.length > 0) {
      console.log('📚 Remaining conversations:');
      filtered.slice(0, 5).forEach((conv, i) => {
        console.log(`  ${i + 1}. ${conv.title || 'Untitled'} (${conv.id})`);
      });
      if (filtered.length > 5) {
        console.log(`  ... and ${filtered.length - 5} more`);
      }
      console.log('');
    }
  } else {
    console.log('  No conversations found to clean\n');
  }
  
  // 2. Clean up message caches for invalid conversations
  console.log('📦 Step 2: Cleaning message caches...');
  const messageKeys = Object.keys(localStorage).filter(k => k.startsWith('tala_messages_'));
  let cachesCleaned = 0;
  
  messageKeys.forEach(key => {
    const convId = key.replace('tala_messages_', '');
    if (convId.startsWith('conv-')) {
      localStorage.removeItem(key);
      cachesCleaned++;
      console.log(`  🗑️ Removed cache for ${convId}`);
    }
  });
  
  if (cachesCleaned > 0) {
    console.log(`  ✅ Cleaned ${cachesCleaned} invalid message caches\n`);
  } else {
    console.log('  ✅ No invalid caches found\n');
  }
  
  // 3. Clear auto-load conversation
  console.log('🔄 Step 3: Clearing auto-load...');
  const currentConv = localStorage.getItem('tala_current_conversation');
  if (currentConv) {
    const parsed = JSON.parse(currentConv);
    if (parsed.title === 'Marketing Campaign Ideas' || 
        parsed.title === 'Iceland Northern Lights' ||
        parsed.id?.startsWith('conv-')) {
      localStorage.removeItem('tala_current_conversation');
      console.log('  ✅ Cleared invalid auto-load conversation\n');
    } else {
      localStorage.removeItem('tala_current_conversation');
      console.log('  ✅ Cleared auto-load (fresh start)\n');
    }
  } else {
    console.log('  ✅ No auto-load set\n');
  }
  
  // 4. Verify system state
  console.log('🔍 Step 4: Verifying system state...');
  const finalConversations = JSON.parse(localStorage.getItem(listKey) || '[]');
  const validConversations = finalConversations.filter(c => !c.id?.startsWith('conv-'));
  
  console.log(`  📊 Total conversations: ${finalConversations.length}`);
  console.log(`  ✅ Valid conversations: ${validConversations.length}`);
  console.log(`  ❌ Invalid conversations: ${finalConversations.length - validConversations.length}`);
  
  // 5. Final recommendations
  console.log('\n✨ Cleanup complete!\n');
  console.log('📝 Next steps:');
  console.log('  1. Refresh the page (Cmd+R or Ctrl+R)');
  console.log('  2. You should see a clean chat interface');
  console.log('  3. Previous valid conversations will be in the sidebar');
  console.log('  4. Start a new conversation to test');
  
  console.log('\n💡 Test the fix:');
  console.log('  - Send "Tell me about Greece"');
  console.log('  - You should see properly formatted response');
  console.log('  - No raw markdown symbols (###, **, -)');
  
  return {
    conversationsRemoved: originalCount - filtered.length,
    cachesCleared: cachesCleaned,
    validConversations: validConversations.length
  };
})();