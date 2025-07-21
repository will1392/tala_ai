/**
 * TaskWorkflow - Manages task lifecycle and state transitions
 * 
 * Handles task workflow rules, state transitions, validations,
 * and automated actions based on task lifecycle events.
 */

import { TaskManager } from './TaskManager.js';
import { EventEmitter } from 'events';

export class TaskWorkflow extends EventEmitter {
  constructor(options = {}) {
    super();
    this.taskManager = options.taskManager || new TaskManager(options);
    this.userId = options.userId;
    
    // Define valid state transitions
    this.stateTransitions = {
      pending: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'on_hold', 'cancelled'],
      on_hold: ['in_progress', 'cancelled'],
      completed: [], // Terminal state
      cancelled: []  // Terminal state
    };
    
    // Define workflow rules
    this.workflowRules = {
      // Rules that run before state change
      preTransition: {
        completed: [
          this.validateNoBlockingDependencies.bind(this),
          this.validateRequiredFields.bind(this)
        ],
        in_progress: [
          this.ensureAssignee.bind(this)
        ]
      },
      // Rules that run after state change
      postTransition: {
        completed: [
          this.updateDependentTasks.bind(this),
          this.recordCompletionMetrics.bind(this)
        ],
        in_progress: [
          this.startTimeTracking.bind(this)
        ],
        cancelled: [
          this.cascadeCancellation.bind(this)
        ]
      }
    };
    
    this.initialized = false;
  }
  
  async initialize() {
    if (!this.initialized) {
      await this.taskManager.initialize();
      this.initialized = true;
      console.log('🔄 TaskWorkflow initialized');
    }
  }
  
  /**
   * Transition task to new state
   */
  async transitionTask(taskId, newStatus, options = {}) {
    try {
      // Get current task state
      const task = await this.taskManager.getTask(taskId);
      const currentStatus = task.status;
      
      // Validate transition
      if (!this.isValidTransition(currentStatus, newStatus)) {
        throw new Error(`Invalid transition from ${currentStatus} to ${newStatus}`);
      }
      
      // Run pre-transition rules
      await this.runPreTransitionRules(task, newStatus, options);
      
      // Emit pre-transition event
      this.emit('task:transition:before', {
        taskId,
        fromStatus: currentStatus,
        toStatus: newStatus,
        task,
        options
      });
      
      // Perform the transition
      const updatedTask = await this.taskManager.updateTask(taskId, {
        status: newStatus,
        ...options.additionalUpdates
      });
      
      // Run post-transition rules
      await this.runPostTransitionRules(updatedTask, currentStatus, options);
      
      // Emit post-transition event
      this.emit('task:transition:after', {
        taskId,
        fromStatus: currentStatus,
        toStatus: newStatus,
        task: updatedTask,
        options
      });
      
      console.log(`✅ Task ${taskId} transitioned from ${currentStatus} to ${newStatus}`);
      return updatedTask;
    } catch (error) {
      console.error('Error transitioning task:', error);
      this.emit('task:transition:error', {
        taskId,
        error,
        newStatus
      });
      throw error;
    }
  }
  
  /**
   * Start a task (transition to in_progress)
   */
  async startTask(taskId, options = {}) {
    return this.transitionTask(taskId, 'in_progress', {
      ...options,
      additionalUpdates: {
        actualStartTime: new Date()
      }
    });
  }
  
  /**
   * Complete a task
   */
  async completeTask(taskId, options = {}) {
    const { actualDuration, completionNotes } = options;
    
    return this.transitionTask(taskId, 'completed', {
      ...options,
      additionalUpdates: {
        actualDuration,
        customFields: {
          completionNotes
        }
      }
    });
  }
  
  /**
   * Put task on hold
   */
  async holdTask(taskId, reason, options = {}) {
    return this.transitionTask(taskId, 'on_hold', {
      ...options,
      additionalUpdates: {
        customFields: {
          holdReason: reason,
          holdDate: new Date()
        }
      }
    });
  }
  
  /**
   * Cancel a task
   */
  async cancelTask(taskId, reason, options = {}) {
    const { cascadeToSubtasks = false } = options;
    
    return this.transitionTask(taskId, 'cancelled', {
      ...options,
      cascadeToSubtasks,
      additionalUpdates: {
        customFields: {
          cancellationReason: reason,
          cancelledDate: new Date()
        }
      }
    });
  }
  
  /**
   * Bulk transition tasks
   */
  async bulkTransition(taskIds, newStatus, options = {}) {
    const results = {
      successful: [],
      failed: []
    };
    
    for (const taskId of taskIds) {
      try {
        const updatedTask = await this.transitionTask(taskId, newStatus, options);
        results.successful.push({
          taskId,
          task: updatedTask
        });
      } catch (error) {
        results.failed.push({
          taskId,
          error: error.message
        });
      }
    }
    
    return results;
  }
  
  /**
   * Check if transition is valid
   */
  isValidTransition(fromStatus, toStatus) {
    if (fromStatus === toStatus) return false;
    
    const allowedTransitions = this.stateTransitions[fromStatus] || [];
    return allowedTransitions.includes(toStatus);
  }
  
  /**
   * Get available transitions for task
   */
  async getAvailableTransitions(taskId) {
    const task = await this.taskManager.getTask(taskId);
    return this.stateTransitions[task.status] || [];
  }
  
  /**
   * Run pre-transition rules
   */
  async runPreTransitionRules(task, newStatus, options) {
    const rules = this.workflowRules.preTransition[newStatus] || [];
    
    for (const rule of rules) {
      await rule(task, options);
    }
  }
  
  /**
   * Run post-transition rules
   */
  async runPostTransitionRules(task, previousStatus, options) {
    const rules = this.workflowRules.postTransition[task.status] || [];
    
    for (const rule of rules) {
      await rule(task, previousStatus, options);
    }
  }
  
  /**
   * Validation Rules
   */
  
  async validateNoBlockingDependencies(task) {
    // Check if all dependencies are completed
    if (task.dependencies && task.dependencies.length > 0) {
      const blockingDeps = [];
      
      for (const dep of task.dependencies) {
        if (dep.dependencyType === 'blocks') {
          const depTask = await this.taskManager.getTask(dep.dependsOnTaskId);
          if (depTask.status !== 'completed') {
            blockingDeps.push(depTask);
          }
        }
      }
      
      if (blockingDeps.length > 0) {
        const depTitles = blockingDeps.map(t => t.title).join(', ');
        throw new Error(`Cannot complete task. Blocking dependencies not completed: ${depTitles}`);
      }
    }
  }
  
  async validateRequiredFields(task) {
    // Validate based on task type
    const requiredFields = this.getRequiredFieldsForType(task.travelType);
    const missingFields = [];
    
    for (const field of requiredFields) {
      if (!task[field] && !task.customFields?.[field]) {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      throw new Error(`Cannot complete task. Missing required fields: ${missingFields.join(', ')}`);
    }
  }
  
  async ensureAssignee(task) {
    // Ensure task has at least one assignee
    if (!task.assignments || task.assignments.filter(a => a.role === 'assignee').length === 0) {
      throw new Error('Task must have at least one assignee before starting');
    }
  }
  
  /**
   * Action Rules
   */
  
  async updateDependentTasks(task) {
    // Find tasks that depend on this completed task
    const result = await this.taskManager.db.query(`
      SELECT task_id FROM task_dependencies 
      WHERE depends_on_task_id = $1 AND dependency_type = 'blocks'
    `, [task.id]);
    
    // Notify about unblocked tasks
    for (const row of result.rows) {
      this.emit('task:unblocked', {
        taskId: row.task_id,
        unblockedBy: task.id
      });
    }
  }
  
  async recordCompletionMetrics(task, previousStatus) {
    // Calculate actual duration if not provided
    if (!task.actualDuration && task.createdAt) {
      const duration = Math.floor((new Date() - new Date(task.createdAt)) / 60000); // minutes
      await this.taskManager.updateTask(task.id, {
        actualDuration: duration
      });
    }
    
    // Emit completion event for analytics
    this.emit('task:completed', {
      taskId: task.id,
      completionTime: new Date(),
      duration: task.actualDuration,
      previousStatus
    });
  }
  
  async startTimeTracking(task) {
    // Record when work actually started
    this.emit('task:started', {
      taskId: task.id,
      startTime: new Date(),
      assignees: task.assignments.filter(a => a.role === 'assignee')
    });
  }
  
  async cascadeCancellation(task, previousStatus, options) {
    if (!options.cascadeToSubtasks) return;
    
    // Find child tasks
    const result = await this.taskManager.db.query(`
      SELECT task_id FROM task_dependencies 
      WHERE depends_on_task_id = $1 AND dependency_type = 'child_of'
    `, [task.id]);
    
    // Cancel child tasks
    for (const row of result.rows) {
      try {
        await this.cancelTask(row.task_id, 'Parent task cancelled', {
          cascadeToSubtasks: true
        });
      } catch (error) {
        console.error(`Failed to cancel child task ${row.task_id}:`, error);
      }
    }
  }
  
  /**
   * Workflow Templates
   */
  
  async createTaskFromTemplate(templateId, overrides = {}) {
    const template = await this.getTaskTemplate(templateId);
    
    const taskData = {
      ...template,
      ...overrides,
      title: overrides.title || template.title,
      status: 'pending',
      createdBy: this.userId
    };
    
    // Create main task
    const task = await this.taskManager.createTask(taskData);
    
    // Create subtasks if defined in template
    if (template.subtasks) {
      for (const subtaskTemplate of template.subtasks) {
        const subtask = await this.taskManager.createTask({
          ...subtaskTemplate,
          createdBy: this.userId
        });
        
        // Add parent-child dependency
        await this.taskManager.addDependency(subtask.id, task.id, 'child_of');
      }
    }
    
    return task;
  }
  
  async getTaskTemplate(templateId) {
    // In a real implementation, this would fetch from database
    const templates = {
      'flight_booking': {
        title: 'Book Flight',
        description: 'Complete flight booking process',
        travelType: 'flight',
        estimatedDuration: 30,
        tags: ['booking', 'flight'],
        subtasks: [
          {
            title: 'Search for flights',
            estimatedDuration: 15
          },
          {
            title: 'Compare prices',
            estimatedDuration: 10
          },
          {
            title: 'Complete booking',
            estimatedDuration: 5
          }
        ]
      },
      'visa_application': {
        title: 'Visa Application',
        description: 'Process visa application',
        travelType: 'document',
        estimatedDuration: 120,
        tags: ['visa', 'document'],
        subtasks: [
          {
            title: 'Gather required documents',
            estimatedDuration: 60
          },
          {
            title: 'Fill application form',
            estimatedDuration: 30
          },
          {
            title: 'Submit application',
            estimatedDuration: 15
          },
          {
            title: 'Track application status',
            estimatedDuration: 15
          }
        ]
      }
    };
    
    const template = templates[templateId];
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }
    
    return template;
  }
  
  /**
   * Helper: Get required fields for task type
   */
  getRequiredFieldsForType(travelType) {
    const requiredFields = {
      flight: ['bookingReference'],
      hotel: ['bookingReference', 'locationData'],
      activity: ['locationData'],
      document: [],
      transfer: ['locationData']
    };
    
    return requiredFields[travelType] || [];
  }
  
  /**
   * Analytics and Reporting
   */
  
  async getWorkflowMetrics(options = {}) {
    const { userId, dateFrom, dateTo } = options;
    
    let query = `
      SELECT 
        status,
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) as avg_completion_hours,
        AVG(actual_duration) as avg_actual_duration,
        AVG(estimated_duration) as avg_estimated_duration
      FROM tasks
      WHERE 1=1
    `;
    
    const values = [];
    let paramIndex = 1;
    
    if (userId) {
      query += ` AND created_by = $${paramIndex}`;
      values.push(userId);
      paramIndex++;
    }
    
    if (dateFrom) {
      query += ` AND created_at >= $${paramIndex}`;
      values.push(dateFrom);
      paramIndex++;
    }
    
    if (dateTo) {
      query += ` AND created_at <= $${paramIndex}`;
      values.push(dateTo);
      paramIndex++;
    }
    
    query += ' GROUP BY status';
    
    const result = await this.taskManager.db.query(query, values);
    
    return {
      statusDistribution: result.rows,
      totalTasks: result.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
      metrics: result.rows.reduce((acc, row) => {
        acc[row.status] = {
          count: parseInt(row.count),
          avgCompletionHours: parseFloat(row.avg_completion_hours) || null,
          avgActualDuration: parseFloat(row.avg_actual_duration) || null,
          avgEstimatedDuration: parseFloat(row.avg_estimated_duration) || null
        };
        return acc;
      }, {})
    };
  }
}

export default TaskWorkflow;