/**
 * Clear all tasks using the admin endpoint
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';

async function clearAllTasksAdmin() {
  console.log('🗑️  Clearing all tasks via admin endpoint...\n');
  
  try {
    const response = await fetch(`${API_URL}/api/tasks/admin/clear-all`, {
      method: 'DELETE',
      headers: {
        'x-mock-user-id': 'admin-1'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Failed:', error);
      return;
    }
    
    const result = await response.json();
    console.log('✅ Success:', result.message);
    console.log(`   Deleted ${result.deletedCount} tasks`);
    
    // Verify by checking tasks
    console.log('\n🔍 Verifying...');
    const verifyResponse = await fetch(`${API_URL}/api/tasks`, {
      headers: {
        'x-mock-user-id': 'test_user_123'
      }
    });
    
    if (verifyResponse.ok) {
      const data = await verifyResponse.json();
      console.log(`\n📊 Tasks remaining: ${data.tasks?.length || 0}`);
      
      if (data.tasks?.length === 0) {
        console.log('✅ All tasks successfully cleared!');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

clearAllTasksAdmin();