/**
 * Run this in browser console to clean up old frontend IDs
 */

(function cleanupFrontend() {
  console.log('🧹 Cleaning up old frontend conversation IDs...\n');
  
  // 1. Remove any conversations with conv- IDs
  const convList = localStorage.getItem('tala_conversations_admin-1');
  if (convList) {
    const list = JSON.parse(convList);
    const cleaned = list.filter(c => !c.id?.startsWith('conv-'));
    const removed = list.length - cleaned.length;
    
    if (removed > 0) {
      localStorage.setItem('tala_conversations_admin-1', JSON.stringify(cleaned));
      console.log(`✅ Removed ${removed} frontend conversations`);
    } else {
      console.log('✅ No frontend conversations found');
    }
  }
  
  // 2. Remove message caches with conv- IDs
  const messageKeys = Object.keys(localStorage).filter(k => 
    k.startsWith('tala_messages_conv-')
  );
  
  if (messageKeys.length > 0) {
    messageKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    console.log(`✅ Removed ${messageKeys.length} frontend message caches`);
  } else {
    console.log('✅ No frontend message caches found');
  }
  
  // 3. Clear current conversation if it's a frontend ID
  const currentConv = localStorage.getItem('tala_current_conversation');
  if (currentConv) {
    const parsed = JSON.parse(currentConv);
    if (parsed.id?.startsWith('conv-')) {
      localStorage.removeItem('tala_current_conversation');
      console.log('✅ Cleared current conversation (was frontend ID)');
    } else {
      console.log('✅ Current conversation is already backend format');
    }
  }
  
  // 4. Show remaining data
  console.log('\n📊 Remaining data:');
  const remainingKeys = Object.keys(localStorage).filter(k => k.includes('tala'));
  console.log(`   Total Tala keys: ${remainingKeys.length}`);
  
  const remainingConvs = localStorage.getItem('tala_conversations_admin-1');
  if (remainingConvs) {
    const list = JSON.parse(remainingConvs);
    console.log(`   Conversations: ${list.length}`);
  } else {
    console.log('   Conversations: 0');
  }
  
  console.log('\n✨ Cleanup complete!');
  console.log('Now refresh the page and try sending a message.');
})();