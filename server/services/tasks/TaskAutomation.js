/**
 * TaskAutomation - Automated task creation and rule-based actions
 * 
 * Handles automatic task generation from emails, rule-based task creation,
 * and automated workflows based on triggers and conditions.
 */

import { TaskManager } from './TaskManager.js';
import { TaskWorkflow } from './TaskWorkflow.js';
import { EventEmitter } from 'events';

export class TaskAutomation extends EventEmitter {
  constructor(options = {}) {
    super();
    this.taskManager = options.taskManager || new TaskManager(options);
    this.taskWorkflow = options.taskWorkflow || new TaskWorkflow(options);
    this.userId = options.userId;
    
    // Automation rules storage (in production, this would be in database)
    this.automationRules = new Map();
    
    // Pre-defined automation templates
    this.automationTemplates = {
      emailToTask: {
        id: 'email_to_task',
        name: 'Email to Task Conversion',
        triggers: ['email_received'],
        conditions: [],
        actions: ['create_task_from_email']
      },
      flightReminder: {
        id: 'flight_reminder',
        name: 'Flight Check-in Reminder',
        triggers: ['task_created'],
        conditions: [
          { field: 'travelType', operator: 'equals', value: 'flight' },
          { field: 'dueDate', operator: 'exists' }
        ],
        actions: ['create_checkin_reminder']
      },
      visaWorkflow: {
        id: 'visa_workflow',
        name: 'Visa Application Workflow',
        triggers: ['task_created'],
        conditions: [
          { field: 'tags', operator: 'contains', value: 'visa' }
        ],
        actions: ['create_visa_subtasks']
      },
      hotelConfirmation: {
        id: 'hotel_confirmation',
        name: 'Hotel Booking Confirmation',
        triggers: ['task_completed'],
        conditions: [
          { field: 'travelType', operator: 'equals', value: 'hotel' }
        ],
        actions: ['send_confirmation_email', 'create_checkin_task']
      }
    };
    
    this.initialized = false;
  }
  
  async initialize() {
    if (!this.initialized) {
      await Promise.all([
        this.taskManager.initialize(),
        this.taskWorkflow.initialize()
      ]);
      
      // Subscribe to workflow events
      this.setupEventListeners();
      
      this.initialized = true;
      console.log('🤖 TaskAutomation initialized');
    }
  }
  
  /**
   * Setup event listeners for automation triggers
   */
  setupEventListeners() {
    // Task lifecycle events
    this.taskWorkflow.on('task:created', (event) => {
      this.processTrigger('task_created', event);
    });
    
    this.taskWorkflow.on('task:transition:after', (event) => {
      if (event.toStatus === 'completed') {
        this.processTrigger('task_completed', event);
      }
      this.processTrigger('task_status_changed', event);
    });
    
    this.taskWorkflow.on('task:unblocked', (event) => {
      this.processTrigger('task_unblocked', event);
    });
  }
  
  /**
   * Process automation trigger
   */
  async processTrigger(triggerType, eventData) {
    try {
      // Find matching automation rules
      const matchingRules = await this.findMatchingRules(triggerType, eventData);
      
      for (const rule of matchingRules) {
        try {
          await this.executeRule(rule, eventData);
          
          this.emit('automation:executed', {
            ruleId: rule.id,
            triggerType,
            eventData,
            success: true
          });
        } catch (error) {
          console.error(`Error executing automation rule ${rule.id}:`, error);
          
          this.emit('automation:error', {
            ruleId: rule.id,
            triggerType,
            eventData,
            error: error.message
          });
        }
      }
    } catch (error) {
      console.error('Error processing automation trigger:', error);
    }
  }
  
  /**
   * Find rules matching trigger and conditions
   */
  async findMatchingRules(triggerType, eventData) {
    const matchingRules = [];
    
    // Check built-in templates
    for (const template of Object.values(this.automationTemplates)) {
      if (template.triggers.includes(triggerType)) {
        if (await this.evaluateConditions(template.conditions, eventData)) {
          matchingRules.push(template);
        }
      }
    }
    
    // Check custom rules
    for (const rule of this.automationRules.values()) {
      if (rule.triggers.includes(triggerType) && rule.enabled) {
        if (await this.evaluateConditions(rule.conditions, eventData)) {
          matchingRules.push(rule);
        }
      }
    }
    
    return matchingRules;
  }
  
  /**
   * Evaluate rule conditions
   */
  async evaluateConditions(conditions, eventData) {
    if (!conditions || conditions.length === 0) return true;
    
    for (const condition of conditions) {
      const fieldValue = this.getFieldValue(eventData, condition.field);
      
      switch (condition.operator) {
        case 'equals':
          if (fieldValue !== condition.value) return false;
          break;
          
        case 'not_equals':
          if (fieldValue === condition.value) return false;
          break;
          
        case 'contains':
          if (!fieldValue || !fieldValue.includes(condition.value)) return false;
          break;
          
        case 'exists':
          if (!fieldValue) return false;
          break;
          
        case 'not_exists':
          if (fieldValue) return false;
          break;
          
        case 'greater_than':
          if (!(fieldValue > condition.value)) return false;
          break;
          
        case 'less_than':
          if (!(fieldValue < condition.value)) return false;
          break;
          
        default:
          console.warn(`Unknown condition operator: ${condition.operator}`);
      }
    }
    
    return true;
  }
  
  /**
   * Execute automation rule actions
   */
  async executeRule(rule, eventData) {
    console.log(`🤖 Executing automation rule: ${rule.name || rule.id}`);
    
    for (const action of rule.actions) {
      await this.executeAction(action, eventData, rule);
    }
  }
  
  /**
   * Execute specific action
   */
  async executeAction(actionType, eventData, rule) {
    switch (actionType) {
      case 'create_task_from_email':
        await this.createTaskFromEmail(eventData);
        break;
        
      case 'create_checkin_reminder':
        await this.createCheckinReminder(eventData);
        break;
        
      case 'create_visa_subtasks':
        await this.createVisaSubtasks(eventData);
        break;
        
      case 'send_confirmation_email':
        await this.sendConfirmationEmail(eventData);
        break;
        
      case 'create_checkin_task':
        await this.createCheckinTask(eventData);
        break;
        
      case 'create_task':
        await this.createAutomatedTask(eventData, rule);
        break;
        
      case 'update_task':
        await this.updateAutomatedTask(eventData, rule);
        break;
        
      case 'assign_task':
        await this.assignAutomatedTask(eventData, rule);
        break;
        
      default:
        console.warn(`Unknown action type: ${actionType}`);
    }
  }
  
  /**
   * Action implementations
   */
  
  async createTaskFromEmail(eventData) {
    const { email, extractedTasks } = eventData;
    
    if (!extractedTasks || extractedTasks.length === 0) return;
    
    const createdTasks = [];
    
    for (const extractedTask of extractedTasks) {
      const taskData = {
        title: extractedTask.title,
        description: extractedTask.description,
        priority: this.mapPriorityFromEmail(extractedTask.priority),
        dueDate: extractedTask.deadline,
        sourceEmailId: email.id,
        extractedFromEmail: true,
        tags: extractedTask.tags || [],
        travelType: extractedTask.travelType,
        locationData: extractedTask.location,
        customFields: {
          extractedEntities: extractedTask.entities,
          confidence: extractedTask.confidence
        }
      };
      
      const task = await this.taskManager.createTask(taskData);
      createdTasks.push(task);
      
      // Link email as attachment
      if (email.id) {
        await this.taskManager.addAttachment(task.id, {
          emailId: email.id,
          attachmentType: 'email',
          description: 'Source email'
        });
      }
    }
    
    console.log(`✅ Created ${createdTasks.length} tasks from email`);
    return createdTasks;
  }
  
  async createCheckinReminder(eventData) {
    const { task } = eventData;
    
    if (!task.dueDate) return;
    
    // Create check-in reminder 24 hours before flight
    const reminderTime = new Date(task.dueDate);
    reminderTime.setHours(reminderTime.getHours() - 24);
    
    // Create subtask for check-in
    const checkinTask = await this.taskManager.createTask({
      title: `Check-in for ${task.title}`,
      description: `Remember to check in for your flight. Booking reference: ${task.bookingReference}`,
      priority: 'high',
      dueDate: reminderTime,
      travelType: 'flight',
      tags: ['checkin', 'automated'],
      customFields: {
        parentTaskId: task.id,
        automationType: 'flight_checkin'
      }
    });
    
    // Add dependency
    await this.taskManager.addDependency(task.id, checkinTask.id, 'blocks');
    
    console.log(`✅ Created check-in reminder for flight task ${task.id}`);
    return checkinTask;
  }
  
  async createVisaSubtasks(eventData) {
    const { task } = eventData;
    
    const visaSubtasks = [
      {
        title: 'Gather visa documents',
        description: 'Collect passport, photos, and required documents',
        estimatedDuration: 60,
        daysBeforeDue: 30
      },
      {
        title: 'Fill visa application form',
        description: 'Complete online visa application',
        estimatedDuration: 30,
        daysBeforeDue: 25
      },
      {
        title: 'Schedule visa appointment',
        description: 'Book appointment at visa center',
        estimatedDuration: 15,
        daysBeforeDue: 20
      },
      {
        title: 'Attend visa appointment',
        description: 'Submit documents and biometrics',
        estimatedDuration: 60,
        daysBeforeDue: 15
      },
      {
        title: 'Track visa status',
        description: 'Monitor application progress',
        estimatedDuration: 10,
        daysBeforeDue: 5
      }
    ];
    
    const createdSubtasks = [];
    
    for (const subtaskTemplate of visaSubtasks) {
      const dueDate = task.dueDate ? new Date(task.dueDate) : null;
      if (dueDate) {
        dueDate.setDate(dueDate.getDate() - subtaskTemplate.daysBeforeDue);
      }
      
      const subtask = await this.taskManager.createTask({
        title: subtaskTemplate.title,
        description: subtaskTemplate.description,
        priority: 'medium',
        dueDate,
        estimatedDuration: subtaskTemplate.estimatedDuration,
        travelType: 'document',
        tags: ['visa', 'automated'],
        customFields: {
          parentTaskId: task.id,
          automationType: 'visa_workflow'
        }
      });
      
      // Add parent-child relationship
      await this.taskManager.addDependency(subtask.id, task.id, 'child_of');
      
      // Add sequential dependencies between subtasks
      if (createdSubtasks.length > 0) {
        const previousSubtask = createdSubtasks[createdSubtasks.length - 1];
        await this.taskManager.addDependency(subtask.id, previousSubtask.id, 'blocks');
      }
      
      createdSubtasks.push(subtask);
    }
    
    console.log(`✅ Created ${createdSubtasks.length} visa subtasks for task ${task.id}`);
    return createdSubtasks;
  }
  
  async sendConfirmationEmail(eventData) {
    // In a real implementation, this would integrate with email service
    const { task } = eventData;
    
    console.log(`📧 Would send confirmation email for completed task: ${task.title}`);
    
    this.emit('automation:email:sent', {
      taskId: task.id,
      emailType: 'confirmation',
      recipient: task.createdBy
    });
  }
  
  async createCheckinTask(eventData) {
    const { task } = eventData;
    
    // Create check-in task for next day
    const checkinDate = new Date();
    checkinDate.setDate(checkinDate.getDate() + 1);
    checkinDate.setHours(15, 0, 0, 0); // 3 PM
    
    const checkinTask = await this.taskManager.createTask({
      title: `Check-in at ${task.locationData?.name || 'hotel'}`,
      description: `Check-in for your hotel reservation. Booking: ${task.bookingReference}`,
      priority: 'medium',
      dueDate: checkinDate,
      travelType: 'hotel',
      locationData: task.locationData,
      tags: ['checkin', 'automated'],
      customFields: {
        parentTaskId: task.id,
        automationType: 'hotel_checkin'
      }
    });
    
    console.log(`✅ Created hotel check-in task following booking completion`);
    return checkinTask;
  }
  
  /**
   * Custom automation rule management
   */
  
  async createAutomationRule(ruleData) {
    const {
      name,
      description,
      triggers,
      conditions,
      actions,
      enabled = true
    } = ruleData;
    
    const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const rule = {
      id: ruleId,
      name,
      description,
      triggers,
      conditions,
      actions,
      enabled,
      createdAt: new Date(),
      createdBy: this.userId
    };
    
    this.automationRules.set(ruleId, rule);
    
    console.log(`✅ Created automation rule: ${name}`);
    return rule;
  }
  
  async updateAutomationRule(ruleId, updates) {
    const rule = this.automationRules.get(ruleId);
    if (!rule) {
      throw new Error('Automation rule not found');
    }
    
    const updatedRule = {
      ...rule,
      ...updates,
      updatedAt: new Date()
    };
    
    this.automationRules.set(ruleId, updatedRule);
    
    console.log(`✅ Updated automation rule: ${updatedRule.name}`);
    return updatedRule;
  }
  
  async deleteAutomationRule(ruleId) {
    if (!this.automationRules.has(ruleId)) {
      throw new Error('Automation rule not found');
    }
    
    this.automationRules.delete(ruleId);
    console.log(`✅ Deleted automation rule: ${ruleId}`);
  }
  
  async listAutomationRules() {
    const rules = Array.from(this.automationRules.values());
    const templates = Object.values(this.automationTemplates);
    
    return {
      custom: rules,
      templates: templates,
      total: rules.length + templates.length
    };
  }
  
  /**
   * Travel-specific automation patterns
   */
  
  async createTravelItineraryTasks(tripData) {
    const {
      destination,
      startDate,
      endDate,
      travelers,
      tripType
    } = tripData;
    
    const tasks = [];
    
    // Pre-trip tasks
    const preTripTasks = [
      {
        title: 'Book flights',
        daysBeforeTrip: 60,
        priority: 'high',
        travelType: 'flight'
      },
      {
        title: 'Book accommodation',
        daysBeforeTrip: 45,
        priority: 'high',
        travelType: 'hotel'
      },
      {
        title: 'Check visa requirements',
        daysBeforeTrip: 90,
        priority: 'urgent',
        travelType: 'document'
      },
      {
        title: 'Purchase travel insurance',
        daysBeforeTrip: 30,
        priority: 'medium',
        travelType: 'document'
      },
      {
        title: 'Plan activities',
        daysBeforeTrip: 30,
        priority: 'low',
        travelType: 'activity'
      }
    ];
    
    for (const taskTemplate of preTripTasks) {
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() - taskTemplate.daysBeforeTrip);
      
      const task = await this.taskManager.createTask({
        title: `${taskTemplate.title} for ${destination}`,
        priority: taskTemplate.priority,
        dueDate,
        travelType: taskTemplate.travelType,
        tags: ['automated', 'itinerary', tripType],
        locationData: { destination },
        customFields: {
          tripStartDate: startDate,
          tripEndDate: endDate,
          travelers: travelers
        }
      });
      
      tasks.push(task);
    }
    
    console.log(`✅ Created ${tasks.length} tasks for travel itinerary`);
    return tasks;
  }
  
  /**
   * Helper methods
   */
  
  getFieldValue(data, fieldPath) {
    const parts = fieldPath.split('.');
    let value = data;
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }
  
  mapPriorityFromEmail(emailPriority) {
    const priorityMap = {
      'urgent': 'urgent',
      'high': 'high',
      'normal': 'medium',
      'low': 'low'
    };
    
    return priorityMap[emailPriority] || 'medium';
  }
  
  /**
   * Analytics
   */
  
  async getAutomationStats() {
    const stats = {
      totalRules: this.automationRules.size + Object.keys(this.automationTemplates).length,
      activeRules: Array.from(this.automationRules.values()).filter(r => r.enabled).length,
      templates: Object.keys(this.automationTemplates).length,
      recentExecutions: [] // Would track in database
    };
    
    return stats;
  }
}

export default TaskAutomation;