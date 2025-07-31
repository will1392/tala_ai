/**
 * Verify tasks in Supabase database
 */

import { config } from 'dotenv';
config();

import { getSupabaseService, initializeSupabase } from './db/supabaseClient.js';

async function verifyTasks() {
  console.log('🔍 Verifying tasks in Supabase...\n');
  
  try {
    // Initialize and get service client
    const initResult = initializeSupabase();
    if (!initResult.success) {
      throw new Error('Failed to initialize Supabase');
    }
    
    const supabase = getSupabaseService();
    
    // Count total tasks
    const { count: totalCount } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Total tasks in database: ${totalCount}\n`);
    
    // Get recent tasks
    const { data: recentTasks, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      throw error;
    }
    
    console.log('Recent tasks:');
    console.log('=============');
    
    if (recentTasks && recentTasks.length > 0) {
      recentTasks.forEach((task, idx) => {
        const createdAt = new Date(task.created_at).toLocaleString();
        console.log(`\n${idx + 1}. ${task.title}`);
        console.log(`   ID: ${task.id}`);
        console.log(`   Status: ${task.status}`);
        console.log(`   Priority: ${task.priority}`);
        console.log(`   Created by: ${task.created_by}`);
        console.log(`   Created at: ${createdAt}`);
        if (task.description) {
          console.log(`   Description: ${task.description}`);
        }
        if (task.source) {
          console.log(`   Source: ${task.source}`);
        }
      });
    } else {
      console.log('No tasks found in database.');
    }
    
    // Check tasks by user
    console.log('\n\nTasks by user:');
    console.log('==============');
    
    const { data: userStats } = await supabase
      .from('tasks')
      .select('created_by')
      .order('created_by');
    
    if (userStats) {
      const userCounts = {};
      userStats.forEach(row => {
        userCounts[row.created_by] = (userCounts[row.created_by] || 0) + 1;
      });
      
      Object.entries(userCounts).forEach(([user, count]) => {
        console.log(`${user}: ${count} tasks`);
      });
    }
    
    console.log('\n✅ Verification complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

verifyTasks();