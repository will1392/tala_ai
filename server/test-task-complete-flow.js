/**
 * Test complete task creation flow with all related tables
 */

import { config } from 'dotenv';
config();

import { getSupabaseService, initializeSupabase } from './db/supabaseClient.js';
import { TaskManager } from './services/tasks/TaskManager.js';
import { getSharedDb, initializeSharedDb } from './services/db/sharedDatabase.js';

async function testCompleteTaskFlow() {
  console.log('🔍 Testing complete task creation flow...\n');
  
  try {
    // 1. Initialize
    console.log('1️⃣ Initializing database...');
    await initializeSharedDb();
    const supabase = getSupabaseService();
    console.log('✅ Database initialized\n');
    
    // 2. Create TaskManager
    console.log('2️⃣ Creating TaskManager...');
    const taskManager = new TaskManager({
      userId: 'test_user_123',
      db: getSharedDb()
    });
    await taskManager.initialize();
    console.log('✅ TaskManager ready\n');
    
    // 3. Create a comprehensive task
    console.log('3️⃣ Creating task with all features...');
    const newTask = await taskManager.createTask({
      title: 'Complete Test Task with History',
      description: 'This task tests all related tables',
      priority: 'high',
      status: 'pending',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      tags: ['test', 'complete-flow'],
      customFields: { category: 'testing' },
      estimatedDuration: 120,
      assignees: [
        { userId: 'test_user_123', role: 'owner' },
        { userId: 'test_user_456', role: 'assignee' }
      ]
    });
    
    console.log('✅ Task created:', newTask.id);
    console.log('   Title:', newTask.title);
    console.log('   Priority:', newTask.priority);
    console.log('   Status:', newTask.status, '\n');
    
    // 4. Check task_history
    console.log('4️⃣ Checking task_history table...');
    const { data: history, error: historyError } = await supabase
      .from('task_history')
      .select('*')
      .eq('task_id', newTask.id)
      .order('created_at', { ascending: false });
    
    if (historyError) {
      console.error('❌ Error fetching history:', historyError);
    } else {
      console.log(`✅ Found ${history.length} history entries:`);
      history.forEach((entry, idx) => {
        console.log(`   ${idx + 1}. Action: ${entry.action}`);
        console.log(`      User: ${entry.user_id}`);
        console.log(`      Changes: ${JSON.stringify(entry.changes)}`);
        console.log(`      Comment: ${entry.comment || 'null'}`);
        console.log(`      Created: ${new Date(entry.created_at).toLocaleString()}`);
      });
    }
    console.log('');
    
    // 5. Check task_assignments
    console.log('5️⃣ Checking task_assignments table...');
    const { data: assignments, error: assignError } = await supabase
      .from('task_assignments')
      .select('*')
      .eq('task_id', newTask.id);
    
    if (assignError) {
      console.error('❌ Error fetching assignments:', assignError);
    } else {
      console.log(`✅ Found ${assignments.length} assignments:`);
      assignments.forEach((assign, idx) => {
        console.log(`   ${idx + 1}. User: ${assign.user_id}`);
        console.log(`      Role: ${assign.role}`);
        console.log(`      Assigned by: ${assign.assigned_by || 'null'}`);
        console.log(`      Assigned at: ${new Date(assign.assigned_at).toLocaleString()}`);
      });
    }
    console.log('');
    
    // 6. Update the task to generate more history
    console.log('6️⃣ Updating task to test history tracking...');
    const updatedTask = await taskManager.updateTask(newTask.id, {
      status: 'in_progress',
      description: 'Updated description for testing history',
      priority: 'urgent'
    });
    console.log('✅ Task updated\n');
    
    // 7. Check history again
    console.log('7️⃣ Checking history after update...');
    const { data: updatedHistory } = await supabase
      .from('task_history')
      .select('*')
      .eq('task_id', newTask.id)
      .order('created_at', { ascending: false });
    
    console.log(`✅ Now have ${updatedHistory.length} history entries`);
    const newEntries = updatedHistory.slice(0, updatedHistory.length - history.length);
    newEntries.forEach((entry, idx) => {
      console.log(`   New ${idx + 1}. Action: ${entry.action}`);
      console.log(`         Changes: ${JSON.stringify(entry.changes)}`);
    });
    console.log('');
    
    // 8. Add an attachment
    console.log('8️⃣ Adding attachment...');
    await taskManager.addAttachment(newTask.id, {
      fileName: 'test-document.pdf',
      fileUrl: 'https://example.com/test-document.pdf',
      fileSize: 1024000,
      mimeType: 'application/pdf',
      documentId: 'doc_123'
    });
    console.log('✅ Attachment added\n');
    
    // 9. Check attachments
    console.log('9️⃣ Checking task_attachments table...');
    const { data: attachments } = await supabase
      .from('task_attachments')
      .select('*')
      .eq('task_id', newTask.id);
    
    console.log(`✅ Found ${attachments.length} attachments`);
    
    // 10. Summary
    console.log('\n📊 SUMMARY');
    console.log('===========');
    console.log(`Task ID: ${newTask.id}`);
    console.log(`History entries: ${updatedHistory.length}`);
    console.log(`Assignments: ${assignments.length}`);
    console.log(`Attachments: ${attachments.length}`);
    
    // Check for NULL values in history
    const nullCount = updatedHistory.filter(h => 
      h.action === null || 
      h.user_id === null || 
      h.task_id === null
    ).length;
    
    if (nullCount > 0) {
      console.log(`\n⚠️ WARNING: Found ${nullCount} history entries with NULL values!`);
    } else {
      console.log('\n✅ All history entries have proper values!');
    }
    
    console.log('\n🎉 Complete flow test finished!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

testCompleteTaskFlow();