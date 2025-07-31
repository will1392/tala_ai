/**
 * Verify all task-related tables in Supabase
 */

import { config } from 'dotenv';
config();

import { getSupabaseService, initializeSupabase } from './db/supabaseClient.js';

async function verifyTaskTables() {
  console.log('🔍 Verifying all task-related tables...\n');
  
  try {
    // Initialize
    const initResult = initializeSupabase();
    if (!initResult.success) {
      throw new Error('Failed to initialize Supabase');
    }
    
    const supabase = getSupabaseService();
    
    // 1. Check tasks table
    console.log('📋 TASKS TABLE');
    console.log('==============');
    const { data: tasks, count: taskCount } = await supabase
      .from('tasks')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log(`Total tasks: ${taskCount}`);
    if (tasks && tasks.length > 0) {
      console.log('Recent tasks:');
      tasks.forEach((task, idx) => {
        console.log(`${idx + 1}. ${task.title} (${task.status}) - Created by: ${task.created_by}`);
      });
    }
    console.log('');
    
    // 2. Check task_history table
    console.log('📜 TASK_HISTORY TABLE');
    console.log('====================');
    const { data: history, count: historyCount } = await supabase
      .from('task_history')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(10);
    
    console.log(`Total history entries: ${historyCount}`);
    
    // Check for NULL values
    let nullCount = 0;
    if (history) {
      history.forEach(entry => {
        if (entry.action === null || entry.user_id === null || entry.task_id === null) {
          nullCount++;
        }
      });
    }
    
    if (nullCount > 0) {
      console.log(`⚠️  WARNING: ${nullCount} entries with NULL required fields!`);
    } else {
      console.log('✅ No NULL values in required fields');
    }
    
    if (history && history.length > 0) {
      console.log('\nRecent history entries:');
      history.slice(0, 5).forEach((entry, idx) => {
        console.log(`${idx + 1}. Action: ${entry.action}, User: ${entry.user_id}`);
        if (entry.changes) {
          console.log(`   Changes: ${JSON.stringify(entry.changes)}`);
        }
        if (entry.comment) {
          console.log(`   Comment: ${entry.comment}`);
        }
      });
    }
    console.log('');
    
    // 3. Check task_assignments table
    console.log('👥 TASK_ASSIGNMENTS TABLE');
    console.log('========================');
    const { data: assignments, count: assignCount } = await supabase
      .from('task_assignments')
      .select('*', { count: 'exact' })
      .order('assigned_at', { ascending: false })
      .limit(10);
    
    console.log(`Total assignments: ${assignCount}`);
    if (assignments && assignments.length > 0) {
      console.log('Recent assignments:');
      assignments.slice(0, 5).forEach((assign, idx) => {
        console.log(`${idx + 1}. Task: ${assign.task_id.substring(0, 8)}... assigned to ${assign.user_id} as ${assign.role}`);
      });
    }
    console.log('');
    
    // 4. Check task_attachments table
    console.log('📎 TASK_ATTACHMENTS TABLE');
    console.log('========================');
    const { data: attachments, count: attachCount } = await supabase
      .from('task_attachments')
      .select('*', { count: 'exact' })
      .limit(10);
    
    console.log(`Total attachments: ${attachCount}`);
    if (attachments && attachments.length > 0) {
      console.log('Attachments:');
      attachments.forEach((att, idx) => {
        console.log(`${idx + 1}. ${att.file_name} (${att.mime_type})`);
      });
    }
    console.log('');
    
    // 5. Check task_reminders table
    console.log('⏰ TASK_REMINDERS TABLE');
    console.log('======================');
    const { data: reminders, count: reminderCount } = await supabase
      .from('task_reminders')
      .select('*', { count: 'exact' })
      .limit(10);
    
    console.log(`Total reminders: ${reminderCount}`);
    console.log('');
    
    // Summary
    console.log('📊 SUMMARY');
    console.log('==========');
    console.log(`✅ Tasks: ${taskCount}`);
    console.log(`✅ History entries: ${historyCount}`);
    console.log(`✅ Assignments: ${assignCount}`);
    console.log(`✅ Attachments: ${attachCount}`);
    console.log(`✅ Reminders: ${reminderCount}`);
    
    if (nullCount === 0) {
      console.log('\n🎉 All tables are properly populated with no NULL values in required fields!');
    } else {
      console.log(`\n⚠️  Found ${nullCount} entries with NULL values that need attention.`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

verifyTaskTables();