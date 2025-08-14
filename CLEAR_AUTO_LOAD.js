/**
 * Run this in browser console to stop auto-loading the last conversation
 */

(function clearAutoLoad() {
  console.log('🧹 Clearing auto-load conversation...\n');
  
  // Remove the current conversation that auto-loads
  localStorage.removeItem('tala_current_conversation');
  console.log('✅ Removed auto-loading conversation');
  
  // Show remaining conversations
  const convList = localStorage.getItem('tala_conversations_admin-1');
  if (convList) {
    const list = JSON.parse(convList);
    console.log(`\n📚 You have ${list.length} conversations saved:`);
    list.slice(0, 5).forEach((conv, i) => {
      console.log(`${i + 1}. ${conv.title || 'Untitled'} (${conv.id})`);
    });
    console.log('\nThese will appear in the sidebar after refresh.');
  }
  
  console.log('\n✨ Done! Refresh the page to start with a clean chat.');
  console.log('The old conversations will still be in the sidebar.');
})();