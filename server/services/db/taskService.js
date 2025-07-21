/**
 * Task Service for Database Operations
 * Handles task creation, updates, retrieval, and deletion
 */

import { BaseService } from './baseService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class TaskService extends BaseService {
  constructor() {
    super('tasks');
    this.tasksFile = path.join(__dirname, '../../data/tasks.json');
    this.ensureDataFile();
  }

  ensureDataFile() {
    const dir = path.dirname(this.tasksFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.tasksFile)) {
      fs.writeFileSync(this.tasksFile, '[]');
    }
  }

  readTasks() {
    try {
      const data = fs.readFileSync(this.tasksFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading tasks:', error);
      return [];
    }
  }

  writeTasks(tasks) {
    try {
      fs.writeFileSync(this.tasksFile, JSON.stringify(tasks, null, 2));
    } catch (error) {
      console.error('Error writing tasks:', error);
    }
  }

  /**
   * Create a new task
   */
  async createTask(taskData) {
    try {
      const task = {
        id: uuidv4(),
        title: taskData.title,
        description: taskData.description || '',
        priority: taskData.priority || 'medium',
        status: taskData.status || 'pending',
        dueDate: taskData.dueDate || null,
        source: taskData.source || 'manual',
        sourceId: taskData.sourceId || null,
        userId: taskData.userId,
        organizationId: taskData.organizationId,
        tags: taskData.tags || [],
        assignee: taskData.assignee || taskData.userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const tasks = this.readTasks();
      tasks.push(task);
      this.writeTasks(tasks);
      
      return {
        success: true,
        data: task
      };
    } catch (error) {
      console.error('Error creating task:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get tasks for a user with filters
   */
  async getUserTasks(userId, organizationId, filters = {}) {
    try {
      let tasks = this.readTasks();
      
      // Filter by user and organization
      tasks = tasks.filter(task => 
        task.userId === userId && 
        task.organizationId === organizationId &&
        !task.deletedAt
      );

      // Apply additional filters
      if (filters.status) {
        tasks = tasks.filter(task => task.status === filters.status);
      }

      if (filters.priority) {
        tasks = tasks.filter(task => task.priority === filters.priority);
      }

      if (filters.source) {
        tasks = tasks.filter(task => task.source === filters.source);
      }

      // Sort tasks
      const orderBy = filters.orderBy || 'createdAt';
      const orderDirection = filters.orderDirection || 'desc';
      
      tasks.sort((a, b) => {
        const aVal = a[orderBy];
        const bVal = b[orderBy];
        
        if (orderDirection === 'desc') {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        } else {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        }
      });

      // Apply limit
      if (filters.limit) {
        tasks = tasks.slice(0, filters.limit);
      }

      return {
        success: true,
        data: tasks
      };
    } catch (error) {
      console.error('Error getting user tasks:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update a task
   */
  async updateTask(taskId, updates, userId, organizationId) {
    try {
      const tasks = this.readTasks();
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      
      if (taskIndex === -1) {
        return {
          success: false,
          error: 'Task not found'
        };
      }

      const task = tasks[taskIndex];
      
      // Verify ownership
      if (task.userId !== userId || task.organizationId !== organizationId) {
        return {
          success: false,
          error: 'Unauthorized'
        };
      }

      // Update task
      updates.updatedAt = new Date().toISOString();
      tasks[taskIndex] = { ...task, ...updates };
      this.writeTasks(tasks);
      
      return {
        success: true,
        data: tasks[taskIndex]
      };
    } catch (error) {
      console.error('Error updating task:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId, userId, organizationId) {
    try {
      const tasks = this.readTasks();
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      
      if (taskIndex === -1) {
        return {
          success: false,
          error: 'Task not found'
        };
      }

      const task = tasks[taskIndex];
      
      // Verify ownership
      if (task.userId !== userId || task.organizationId !== organizationId) {
        return {
          success: false,
          error: 'Unauthorized'
        };
      }

      // Soft delete
      tasks[taskIndex].deletedAt = new Date().toISOString();
      this.writeTasks(tasks);
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Error deleting task:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get upcoming tasks (due soon)
   */
  async getUpcomingTasks(userId, organizationId, limit = 5) {
    try {
      const tasks = this.readTasks();
      const now = new Date();
      
      let upcomingTasks = tasks.filter(task => 
        task.userId === userId && 
        task.organizationId === organizationId &&
        !task.deletedAt &&
        task.status !== 'completed' &&
        task.dueDate &&
        new Date(task.dueDate) >= now
      );
      
      // Sort by due date ascending
      upcomingTasks.sort((a, b) => 
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );
      
      // Limit results
      upcomingTasks = upcomingTasks.slice(0, limit);
      
      return {
        success: true,
        data: upcomingTasks
      };
    } catch (error) {
      console.error('Error getting upcoming tasks:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get overdue tasks
   */
  async getOverdueTasks(userId, organizationId) {
    try {
      const tasks = this.readTasks();
      const now = new Date();
      
      let overdueTasks = tasks.filter(task => 
        task.userId === userId && 
        task.organizationId === organizationId &&
        !task.deletedAt &&
        task.status !== 'completed' &&
        task.dueDate &&
        new Date(task.dueDate) < now
      );
      
      // Sort by due date ascending
      overdueTasks.sort((a, b) => 
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );
      
      return {
        success: true,
        data: overdueTasks
      };
    } catch (error) {
      console.error('Error getting overdue tasks:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default TaskService;