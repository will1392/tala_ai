/**
 * Run this in browser console to remove mock conversations
 */

(function removeMockConversations() {
  console.log('🧹 Removing mock conversations...\n');
  
  // Get current conversation list
  const listKey = 'tala_conversations_admin-1';
  const stored = localStorage.getItem(listKey);
  
  if (stored) {
    const conversations = JSON.parse(stored);
    const originalCount = conversations.length;
    
    // Filter out the mock conversations
    const filtered = conversations.filter(conv => {
      // Remove conversations with these exact titles
      if (conv.title === 'Marketing Campaign Ideas' || 
          conv.title === 'Iceland Northern Lights') {
        console.log(`❌ Removing mock: ${conv.title}`);
        return false;
      }
      
      // Also remove any conversation that doesn't have a proper backend ID
      if (conv.id && conv.id.startsWith('conv-')) {
        console.log(`❌ Removing frontend ID: ${conv.id}`);
        return false;
      }
      
      return true;
    });
    
    // Save the filtered list
    localStorage.setItem(listKey, JSON.stringify(filtered));
    
    const removed = originalCount - filtered.length;
    console.log(`\n✅ Removed ${removed} mock/invalid conversations`);
    console.log(`📚 ${filtered.length} real conversations remain`);
    
    // Also remove their message caches if any
    const messageKeys = Object.keys(localStorage).filter(k => k.startsWith('tala_messages_'));
    messageKeys.forEach(key => {
      const convId = key.replace('tala_messages_', '');
      if (convId.startsWith('conv-')) {
        localStorage.removeItem(key);
        console.log(`🗑️ Removed message cache for ${convId}`);
      }
    });
    
  } else {
    console.log('No conversations found to clean');
  }
  
  // Clear current conversation if it's invalid
  const currentConv = localStorage.getItem('tala_current_conversation');
  if (currentConv) {
    const parsed = JSON.parse(currentConv);
    if (parsed.title === 'Marketing Campaign Ideas' || 
        parsed.title === 'Iceland Northern Lights' ||
        parsed.id?.startsWith('conv-')) {
      localStorage.removeItem('tala_current_conversation');
      console.log('✅ Cleared invalid current conversation');
    }
  }
  
  console.log('\n✨ Cleanup complete! Refresh the page.');
})();