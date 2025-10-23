/**
 * Task Service
 * Handles all task-related API operations
 */

import { buildApiUrl } from '../utils/api';

const API_BASE = buildApiUrl('');

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  dueDate?: string;
  assignee?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  source?: 'email' | 'manual' | 'automation' | 'chat';
  sourceId?: string; // Email ID if created from email
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  assignee?: string;
  tags?: string[];
  source?: 'email' | 'manual' | 'automation' | 'chat';
  sourceId?: string;
}

class TaskService {
  private headers = {
    'Content-Type': 'application/json',
    'x-user-id': 'admin-1' // TODO: Get from auth context
  };

  async getTasks(filters?: {
    status?: string;
    priority?: string;
    limit?: number;
    offset?: number;
  }): Promise<Task[]> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, value.toString());
          }
        });
      }

      const response = await fetch(`${API_BASE}/tasks?${params}`, {
        headers: this.headers,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.status}`);
      }

      const data = await response.json();
      return data.tasks || [];
    } catch (error) {
      // Don't log errors if server is simply not available
      // This is a non-critical service
      if (!error.message?.includes('Failed to fetch')) {
        console.error('Error fetching tasks:', error);
      }
      return [];
    }
  }

  async createTask(task: CreateTaskInput): Promise<Task | null> {
    try {
      const response = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: this.headers,
        credentials: 'include',
        body: JSON.stringify(task)
      });

      if (!response.ok) {
        throw new Error(`Failed to create task: ${response.status}`);
      }

      const data = await response.json();
      return data.task;
    } catch (error) {
      console.error('Error creating task:', error);
      return null;
    }
  }

  async createTasksFromEmail(emailId: string, tasks: CreateTaskInput[]): Promise<Task[]> {
    try {
      const response = await fetch(`${API_BASE}/email-tasks/process`, {
        method: 'POST',
        headers: this.headers,
        credentials: 'include',
        body: JSON.stringify({
          emailId,
          tasks,
          autoAssign: true
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create tasks from email: ${response.status}`);
      }

      const data = await response.json();
      return data.tasks || [];
    } catch (error) {
      console.error('Error creating tasks from email:', error);
      return [];
    }
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task | null> {
    try {
      const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'PUT',
        headers: this.headers,
        credentials: 'include',
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`Failed to update task: ${response.status}`);
      }

      const data = await response.json();
      return data.task;
    } catch (error) {
      console.error('Error updating task:', error);
      return null;
    }
  }

  async deleteTask(taskId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: this.headers,
        credentials: 'include'
      });

      return response.ok;
    } catch (error) {
      console.error('Error deleting task:', error);
      return false;
    }
  }

  async getUpcomingTasks(limit: number = 5): Promise<Task[]> {
    return this.getTasks({
      status: 'pending',
      limit
    });
  }
}

export default new TaskService();