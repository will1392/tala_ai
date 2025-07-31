/**
 * Temporary Supabase-compatible tasks route
 * This bypasses TaskManager's SQL queries and uses Supabase directly
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getSupabaseService } from '../db/supabaseClient.js';
import userResolver from '../services/auth/UserResolver.js';

const router = express.Router();

// Helper function to convert snake_case to camelCase
function toCamelCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  }
  
  const camelObj = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    camelObj[camelKey] = value;
  }
  return camelObj;
}

// List tasks with Supabase
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      status,
      priority,
      limit = 20,
      offset = 0
    } = req.query;
    
    // Resolve user ID to UUID
    const userUUID = await userResolver.resolveUserId(req.userId);
    console.log(`📋 Fetching tasks for ${req.userId} → ${userUUID}`);
    
    // Build Supabase query
    const supabase = getSupabaseService();
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('created_by', userUUID)
      .order('created_at', { ascending: false });
    
    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }
    
    // Apply pagination
    query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    
    const { data: tasks, error, count } = await query;
    
    if (error) {
      console.error('❌ Error fetching tasks:', error);
      throw error;
    }
    
    console.log(`✅ Found ${tasks?.length || 0} tasks`);
    
    // Format response to match expected structure
    res.json({
      success: true,
      tasks: toCamelCase(tasks || []),
      pagination: {
        total: count || tasks?.length || 0,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (tasks?.length || 0) === parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get upcoming tasks (for dashboard)
router.get('/upcoming', authenticate, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Resolve user ID to UUID
    const userUUID = await userResolver.resolveUserId(req.userId);
    
    const supabase = getSupabaseService();
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('created_by', userUUID)
      .in('status', ['pending', 'in_progress'])
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));
    
    if (error) {
      console.error('❌ Error fetching upcoming tasks:', error);
      throw error;
    }
    
    res.json({
      success: true,
      tasks: toCamelCase(tasks || [])
    });
    
  } catch (error) {
    console.error('Error fetching upcoming tasks:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update task
router.put('/:taskId', authenticate, async (req, res) => {
  try {
    const { taskId } = req.params;
    const updates = req.body;
    
    // Resolve user ID to UUID
    const userUUID = await userResolver.resolveUserId(req.userId);
    console.log(`📝 Updating task ${taskId} for ${req.userId} → ${userUUID}`);
    
    // If updating status to completed, add completed_at timestamp
    if (updates.status === 'completed' && !updates.completed_at) {
      updates.completed_at = new Date().toISOString();
    }
    
    // Always update the updated_at timestamp
    updates.updated_at = new Date().toISOString();
    
    const supabase = getSupabaseService();
    const { data: updatedTask, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .eq('created_by', userUUID) // Ensure user owns the task
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('❌ Task not found or unauthorized');
        return res.status(404).json({
          success: false,
          error: 'Task not found or unauthorized'
        });
      }
      console.error('❌ Error updating task:', error);
      throw error;
    }
    
    console.log(`✅ Task updated successfully: ${updatedTask.title} → ${updatedTask.status}`);
    
    res.json({
      success: true,
      task: toCamelCase(updatedTask)
    });
    
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete task
router.delete('/:taskId', authenticate, async (req, res) => {
  try {
    const { taskId } = req.params;
    
    // Resolve user ID to UUID
    const userUUID = await userResolver.resolveUserId(req.userId);
    console.log(`🗑️ Deleting task ${taskId} for ${req.userId} → ${userUUID}`);
    
    const supabase = getSupabaseService();
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('created_by', userUUID); // Ensure user owns the task
    
    if (error) {
      console.error('❌ Error deleting task:', error);
      throw error;
    }
    
    console.log(`✅ Task deleted successfully: ${taskId}`);
    
    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;