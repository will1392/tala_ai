// Ensure userId is set in localStorage
export const ensureUserId = () => {
  const currentUserId = localStorage.getItem('userId');
  
  // If no userId or it's one of the old test IDs, set the correct one
  if (!currentUserId || currentUserId === 'admin-1' || currentUserId === 'test_user_123') {
    localStorage.setItem('userId', '59b70373-ba68-4d89-8420-5c3723aef01f');
    console.log('✅ Set userId to your Supabase user');
    
    // Dispatch event to update any components listening
    window.dispatchEvent(new Event('creditUpdate'));
  }
};