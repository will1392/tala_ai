/**
 * Simple In-Memory Task Store
 * This is a temporary solution for task persistence
 * In production, this would use a database
 */

class TaskStore {
  constructor() {
    this.tasks = new Map();
    this.tasksByUser = new Map();
  }

  /**
   * Create a new task
   */
  createTask(taskData) {
    const task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...taskData,
      status: taskData.status || 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Store task
    this.tasks.set(task.id, task);

    // Index by user
    const userId = task.userId || 'test_user_123';
    if (!this.tasksByUser.has(userId)) {
      this.tasksByUser.set(userId, new Set());
    }
    this.tasksByUser.get(userId).add(task.id);

    console.log(`📝 Created task: ${task.title} for user ${userId}`);
    return task;
  }

  /**
   * Get all tasks for a user
   */
  getTasksByUser(userId, filters = {}) {
    const userTaskIds = this.tasksByUser.get(userId) || new Set();
    let tasks = Array.from(userTaskIds).map(id => this.tasks.get(id)).filter(Boolean);

    // Apply filters
    if (filters.status) {
      tasks = tasks.filter(t => t.status === filters.status);
    }
    if (filters.priority) {
      tasks = tasks.filter(t => t.priority === filters.priority);
    }

    // Sort by created date (newest first)
    tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply limit
    if (filters.limit) {
      tasks = tasks.slice(0, filters.limit);
    }

    return tasks;
  }

  /**
   * Get a single task by ID
   */
  getTask(taskId) {
    return this.tasks.get(taskId);
  }

  /**
   * Update a task
   */
  updateTask(taskId, updates) {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    const updatedTask = {
      ...task,
      ...updates,
      id: task.id, // Prevent ID change
      updatedAt: new Date().toISOString()
    };

    this.tasks.set(taskId, updatedTask);
    return updatedTask;
  }

  /**
   * Delete a task
   */
  deleteTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    // Remove from user index
    const userId = task.userId || 'test_user_123';
    const userTasks = this.tasksByUser.get(userId);
    if (userTasks) {
      userTasks.delete(taskId);
    }

    // Remove task
    this.tasks.delete(taskId);
    return true;
  }

  /**
   * Get task statistics for a user
   */
  getStats(userId) {
    const tasks = this.getTasksByUser(userId);
    
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      urgent: tasks.filter(t => t.priority === 'urgent').length,
      fromEmail: tasks.filter(t => t.source === 'email').length
    };
  }
}

// Export singleton instance
export default new TaskStore();