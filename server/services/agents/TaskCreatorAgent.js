/**
 * TaskCreatorAgent - Agent for creating new tasks directly from user requests
 * 
 * Handles direct task creation when users ask to create tasks, todos, or reminders
 */

import BaseAgent from './BaseAgent.js';
import TaskManager from '../tasks/TaskManager.js';
import { getSharedDb, initializeSharedDb } from '../db/sharedDatabase.js';

export class TaskCreatorAgent extends BaseAgent {
  constructor(options = {}) {
    super({
      ...options,
      preferredLLM: 'gpt-4o-mini',
      confidence_threshold: 0.8,
      temperature: 0.3
    });
    
    this.userId = options.userId; // May be provided in constructor
    this.taskManager = null;
    this.initialized = false;
  }

  async initialize() {
    if (!this.initialized) {
      const sharedDb = await initializeSharedDb();
      this.taskManager = new TaskManager({ 
        userId: this.userId,
        db: sharedDb 
      });
      await this.taskManager.initialize();
      this.initialized = true;
    }
  }

  /**
   * Get agent capabilities
   */
  getCapabilities() {
    return [
      'task-creation',
      'todo-creation',
      'reminder-creation',
      'task-management'
    ];
  }

  /**
   * Get agent specialization
   */
  getSpecialization() {
    return 'task-creation';
  }

  /**
   * Get preferred LLM
   */
  getPreferredLLM() {
    return 'gpt-4o-mini';
  }

  /**
   * Get supported task types
   */
  getSupportedTaskTypes() {
    return [
      'create-task',
      'create-todo',
      'create-reminder',
      'add-task'
    ];
  }

  /**
   * Evaluate if agent can handle task
   */
  async evaluateTask(task) {
    // High confidence for task creation
    if (task.type && task.type.includes('create-task')) {
      return 0.95;
    }
    
    // Check for creation keywords
    const keywords = ['create', 'add', 'make', 'new', 'task', 'todo', 'reminder'];
    const taskText = JSON.stringify(task).toLowerCase();
    
    const createKeywords = ['create', 'add', 'make', 'new'];
    const taskKeywords = ['task', 'todo', 'reminder'];
    
    const hasCreateKeyword = createKeywords.some(keyword => taskText.includes(keyword));
    const hasTaskKeyword = taskKeywords.some(keyword => taskText.includes(keyword));
    
    if (hasCreateKeyword && hasTaskKeyword) {
      return 0.9;
    }
    
    return 0.2;
  }

  /**
   * Validate task
   */
  async validateTask(task) {
    // Ensure we're initialized
    if (!this.initialized) {
      await this.initialize();
    }
    
    // We can work with minimal information
    return { valid: true };
  }

  /**
   * Perform task creation
   */
  async performTask(task, context) {
    console.log('📝 Creating new task');
    console.log('📊 Task object:', { 
      hasUserId: !!task.userId, 
      hasDataUserId: !!task.data?.userId,
      constructorUserId: this.userId 
    });
    
    try {
      // Get userId from task object if not already set
      const userId = task.userId || task.data?.userId || this.userId;
      console.log(`👤 Using userId for task creation: ${userId}`);
      
      if (!userId) {
        throw new Error('No userId provided for task creation');
      }
      
      // Ensure task manager has the correct userId
      if (this.taskManager && this.taskManager.userId !== userId) {
        console.log(`🔄 Updating TaskManager userId from ${this.taskManager.userId} to ${userId}`);
        this.taskManager.userId = userId;
      }
      
      // Extract task details from the request
      const taskDetails = await this.extractTaskDetails(task, context);
      
      // Create the task
      const createdTask = await this.taskManager.createTask(taskDetails);
      
      // Return the task directly - BaseAgent will wrap it
      return {
        task: createdTask,
        message: `Task "${createdTask.title}" has been created successfully.`,
        actions: this.suggestNextActions(createdTask),
        metadata: {
          taskId: createdTask.id,
          title: createdTask.title,
          priority: createdTask.priority
        }
      };
      
    } catch (error) {
      console.error('Task creation error:', error);
      throw error;
    }
  }

  /**
   * Extract task details from request
   */
  async extractTaskDetails(task, context) {
    const content = task.content || '';
    const data = task.data || {};
    
    // Start with any pre-extracted data
    let taskDetails = {
      title: data.taskTitle || '',
      description: '',
      priority: 'medium',
      status: 'pending',
      tags: []
    };
    
    // If we have a full task description in the content, use simple extraction
    if (content && !taskDetails.title) {
      // Simple extraction without LLM for now
      taskDetails.title = this.extractSimpleTitle(content);
      
      // Extract priority from keywords
      if (content.toLowerCase().includes('urgent') || content.toLowerCase().includes('asap')) {
        taskDetails.priority = 'high';
      } else if (content.toLowerCase().includes('low priority') || content.toLowerCase().includes('whenever')) {
        taskDetails.priority = 'low';
      }
      
      // Extract due date patterns
      const tomorrowMatch = content.match(/tomorrow/i);
      const todayMatch = content.match(/today/i);
      const nextWeekMatch = content.match(/next week/i);
      
      if (todayMatch) {
        taskDetails.dueDate = new Date();
      } else if (tomorrowMatch) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        taskDetails.dueDate = tomorrow;
      } else if (nextWeekMatch) {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        taskDetails.dueDate = nextWeek;
      }
    }
    
    // Ensure we have at least a title
    if (!taskDetails.title) {
      taskDetails.title = 'New Task';
    }
    
    // Add context-based enhancements
    if (context?.userProfile?.preferences) {
      // Apply user preferences
      if (context.userProfile.preferences.defaultPriority) {
        taskDetails.priority = context.userProfile.preferences.defaultPriority;
      }
    }
    
    return taskDetails;
  }

  /**
   * Extract simple title from content
   */
  extractSimpleTitle(content) {
    // Remove common prefixes
    let title = content
      .replace(/^(please\s+)?(create|add|make)\s+(a\s+)?(new\s+)?(task|todo|reminder)(\s+to|\s+for)?\s*/i, '')
      .trim();
    
    // Remove trailing punctuation
    title = title.replace(/[.!?]+$/, '');
    
    // Capitalize first letter
    if (title.length > 0) {
      title = title.charAt(0).toUpperCase() + title.slice(1);
    }
    
    // Limit length
    if (title.length > 100) {
      title = title.substring(0, 97) + '...';
    }
    
    return title || 'New Task';
  }

  /**
   * Suggest next actions for created task
   */
  suggestNextActions(task) {
    const actions = [];
    
    // Suggest setting a due date if none
    if (!task.dueDate) {
      actions.push({
        type: 'set-due-date',
        label: 'Set a due date',
        prompt: `When should "${task.title}" be completed?`
      });
    }
    
    // Suggest adding details if description is empty
    if (!task.description) {
      actions.push({
        type: 'add-description',
        label: 'Add more details',
        prompt: 'Would you like to add more details to this task?'
      });
    }
    
    // Suggest priority adjustment
    if (task.priority === 'medium') {
      actions.push({
        type: 'adjust-priority',
        label: 'Adjust priority',
        prompt: 'Is this task high priority or can it wait?'
      });
    }
    
    return actions;
  }

  /**
   * Get required result fields
   */
  getRequiredResultFields() {
    return ['task'];
  }

  /**
   * Perform result validation
   */
  async performResultValidation(result) {
    // Check for task in data field (wrapped by BaseAgent) or at top level
    const task = result.data?.task || result.task;
    
    if (!task) {
      return { valid: false, reason: 'No task created' };
    }
    
    if (!task.id || !task.title) {
      return { valid: false, reason: 'Invalid task object' };
    }
    
    return { valid: true };
  }
}

export default TaskCreatorAgent;