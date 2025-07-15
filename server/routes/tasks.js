/**
 * Task Management API Routes
 * 
 * RESTful API endpoints for task management including CRUD operations,
 * workflow management, automation, and reminders.
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import TaskManager from '../services/tasks/TaskManager.js';
import TaskWorkflow from '../services/tasks/TaskWorkflow.js';
import TaskAutomation from '../services/tasks/TaskAutomation.js';
import ReminderService from '../services/tasks/ReminderService.js';

const router = express.Router();

// Initialize services
let taskManager, taskWorkflow, taskAutomation, reminderService;

// Middleware to ensure services are initialized with user context
const initializeServices = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.userId;
    
    if (!taskManager || taskManager.userId !== userId) {
      taskManager = new TaskManager({ userId });
      await taskManager.initialize();
    }
    
    if (!taskWorkflow || taskWorkflow.userId !== userId) {
      taskWorkflow = new TaskWorkflow({ userId, taskManager });
      await taskWorkflow.initialize();
    }
    
    if (!taskAutomation || taskAutomation.userId !== userId) {
      taskAutomation = new TaskAutomation({ userId, taskManager, taskWorkflow });
      await taskAutomation.initialize();
    }
    
    if (!reminderService || reminderService.userId !== userId) {
      reminderService = new ReminderService({ userId });
      await reminderService.initialize();
    }
    
    req.taskServices = {
      taskManager,
      taskWorkflow,
      taskAutomation,
      reminderService
    };
    
    next();
  } catch (error) {
    console.error('Error initializing task services:', error);
    res.status(500).json({ error: 'Failed to initialize task services' });
  }
};

// Apply auth and service initialization to all routes
router.use(authenticate);
router.use(initializeServices);

/**
 * Task CRUD Operations
 */

// Create task
router.post('/', async (req, res) => {
  try {
    const { taskManager, reminderService } = req.taskServices;
    const taskData = req.body;
    
    // Create task
    const task = await taskManager.createTask(taskData);
    
    // Create default reminders if due date is set
    if (task.dueDate) {
      await reminderService.createTaskReminders(task.id, task);
    }
    
    res.status(201).json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get task by ID
router.get('/:taskId', async (req, res) => {
  try {
    const { taskManager } = req.taskServices;
    const { taskId } = req.params;
    
    const task = await taskManager.getTask(taskId);
    
    res.json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Error getting task:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

// Update task
router.put('/:taskId', async (req, res) => {
  try {
    const { taskManager } = req.taskServices;
    const { taskId } = req.params;
    const updates = req.body;
    
    const task = await taskManager.updateTask(taskId, updates);
    
    res.json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Delete task
router.delete('/:taskId', async (req, res) => {
  try {
    const { taskManager } = req.taskServices;
    const { taskId } = req.params;
    
    await taskManager.deleteTask(taskId);
    
    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// List tasks with filters
router.get('/', async (req, res) => {
  try {
    const { taskManager } = req.taskServices;
    const filters = {
      status: req.query.status,
      priority: req.query.priority,
      assignedTo: req.query.assignedTo,
      createdBy: req.query.createdBy || req.user?.id,
      dueAfter: req.query.dueAfter,
      dueBefore: req.query.dueBefore,
      tags: req.query.tags ? req.query.tags.split(',') : undefined,
      travelType: req.query.travelType,
      search: req.query.search,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder
    };
    
    const result = await taskManager.listTasks(filters);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error listing tasks:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Task Assignment Operations
 */

// Assign task
router.post('/:taskId/assignments', async (req, res) => {
  try {
    const { taskManager } = req.taskServices;
    const { taskId } = req.params;
    const { userId, role = 'assignee' } = req.body;
    
    await taskManager.assignTask(null, taskId, userId, role);
    
    res.json({
      success: true,
      message: 'Task assigned successfully'
    });
  } catch (error) {
    console.error('Error assigning task:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Unassign task
router.delete('/:taskId/assignments/:userId', async (req, res) => {
  try {
    const { taskManager } = req.taskServices;
    const { taskId, userId } = req.params;
    const { role = 'assignee' } = req.query;
    
    await taskManager.unassignTask(taskId, userId, role);
    
    res.json({
      success: true,
      message: 'Task unassigned successfully'
    });
  } catch (error) {
    console.error('Error unassigning task:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Task Dependencies
 */

// Add dependency
router.post('/:taskId/dependencies', async (req, res) => {
  try {
    const { taskManager } = req.taskServices;
    const { taskId } = req.params;
    const { dependsOnTaskId, dependencyType = 'blocks' } = req.body;
    
    await taskManager.addDependency(taskId, dependsOnTaskId, dependencyType);
    
    res.json({
      success: true,
      message: 'Dependency added successfully'
    });
  } catch (error) {
    console.error('Error adding dependency:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Remove dependency
router.delete('/:taskId/dependencies/:dependsOnTaskId', async (req, res) => {
  try {
    const { taskManager } = req.taskServices;
    const { taskId, dependsOnTaskId } = req.params;
    
    await taskManager.removeDependency(taskId, dependsOnTaskId);
    
    res.json({
      success: true,
      message: 'Dependency removed successfully'
    });
  } catch (error) {
    console.error('Error removing dependency:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Task Attachments
 */

// Add attachment
router.post('/:taskId/attachments', async (req, res) => {
  try {
    const { taskManager } = req.taskServices;
    const { taskId } = req.params;
    const attachmentData = req.body;
    
    const attachment = await taskManager.addAttachment(taskId, attachmentData);
    
    res.json({
      success: true,
      attachment
    });
  } catch (error) {
    console.error('Error adding attachment:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Remove attachment
router.delete('/:taskId/attachments/:attachmentId', async (req, res) => {
  try {
    const { taskManager } = req.taskServices;
    const { taskId, attachmentId } = req.params;
    
    await taskManager.removeAttachment(taskId, attachmentId);
    
    res.json({
      success: true,
      message: 'Attachment removed successfully'
    });
  } catch (error) {
    console.error('Error removing attachment:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Task History
 */

// Get task history
router.get('/:taskId/history', async (req, res) => {
  try {
    const { taskManager } = req.taskServices;
    const { taskId } = req.params;
    const { limit = 50 } = req.query;
    
    const history = await taskManager.getTaskHistory(taskId, parseInt(limit));
    
    res.json({
      success: true,
      history
    });
  } catch (error) {
    console.error('Error getting task history:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Task Workflow Operations
 */

// Transition task status
router.post('/:taskId/transition', async (req, res) => {
  try {
    const { taskWorkflow } = req.taskServices;
    const { taskId } = req.params;
    const { newStatus, reason, options = {} } = req.body;
    
    const task = await taskWorkflow.transitionTask(taskId, newStatus, {
      ...options,
      reason
    });
    
    res.json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Error transitioning task:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get available transitions
router.get('/:taskId/transitions', async (req, res) => {
  try {
    const { taskWorkflow } = req.taskServices;
    const { taskId } = req.params;
    
    const transitions = await taskWorkflow.getAvailableTransitions(taskId);
    
    res.json({
      success: true,
      transitions
    });
  } catch (error) {
    console.error('Error getting transitions:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Start task
router.post('/:taskId/start', async (req, res) => {
  try {
    const { taskWorkflow } = req.taskServices;
    const { taskId } = req.params;
    
    const task = await taskWorkflow.startTask(taskId);
    
    res.json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Error starting task:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Complete task
router.post('/:taskId/complete', async (req, res) => {
  try {
    const { taskWorkflow } = req.taskServices;
    const { taskId } = req.params;
    const { actualDuration, completionNotes } = req.body;
    
    const task = await taskWorkflow.completeTask(taskId, {
      actualDuration,
      completionNotes
    });
    
    res.json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Cancel task
router.post('/:taskId/cancel', async (req, res) => {
  try {
    const { taskWorkflow } = req.taskServices;
    const { taskId } = req.params;
    const { reason, cascadeToSubtasks = false } = req.body;
    
    const task = await taskWorkflow.cancelTask(taskId, reason, {
      cascadeToSubtasks
    });
    
    res.json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Error cancelling task:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Bulk transition
router.post('/bulk/transition', async (req, res) => {
  try {
    const { taskWorkflow } = req.taskServices;
    const { taskIds, newStatus, options = {} } = req.body;
    
    const results = await taskWorkflow.bulkTransition(taskIds, newStatus, options);
    
    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Error bulk transitioning tasks:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Task Templates
 */

// Create task from template
router.post('/templates/:templateId/create', async (req, res) => {
  try {
    const { taskWorkflow } = req.taskServices;
    const { templateId } = req.params;
    const overrides = req.body;
    
    const task = await taskWorkflow.createTaskFromTemplate(templateId, overrides);
    
    res.json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Error creating task from template:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Task Automation
 */

// Create task from email
router.post('/automation/email-to-task', async (req, res) => {
  try {
    const { taskAutomation } = req.taskServices;
    const { email, extractedTasks } = req.body;
    
    const tasks = await taskAutomation.createTaskFromEmail({
      email,
      extractedTasks
    });
    
    res.json({
      success: true,
      tasks
    });
  } catch (error) {
    console.error('Error creating tasks from email:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Create travel itinerary tasks
router.post('/automation/travel-itinerary', async (req, res) => {
  try {
    const { taskAutomation } = req.taskServices;
    const tripData = req.body;
    
    const tasks = await taskAutomation.createTravelItineraryTasks(tripData);
    
    res.json({
      success: true,
      tasks
    });
  } catch (error) {
    console.error('Error creating travel itinerary:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get automation rules
router.get('/automation/rules', async (req, res) => {
  try {
    const { taskAutomation } = req.taskServices;
    
    const rules = await taskAutomation.listAutomationRules();
    
    res.json({
      success: true,
      rules
    });
  } catch (error) {
    console.error('Error listing automation rules:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Create automation rule
router.post('/automation/rules', async (req, res) => {
  try {
    const { taskAutomation } = req.taskServices;
    const ruleData = req.body;
    
    const rule = await taskAutomation.createAutomationRule(ruleData);
    
    res.json({
      success: true,
      rule
    });
  } catch (error) {
    console.error('Error creating automation rule:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Task Reminders
 */

// Create reminder
router.post('/:taskId/reminders', async (req, res) => {
  try {
    const { reminderService } = req.taskServices;
    const { taskId } = req.params;
    const reminderData = {
      ...req.body,
      taskId
    };
    
    const reminder = await reminderService.createReminder(reminderData);
    
    res.json({
      success: true,
      reminder
    });
  } catch (error) {
    console.error('Error creating reminder:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get task reminders
router.get('/:taskId/reminders', async (req, res) => {
  try {
    const { reminderService } = req.taskServices;
    const { taskId } = req.params;
    
    const reminders = await reminderService.getTaskReminders(taskId);
    
    res.json({
      success: true,
      reminders
    });
  } catch (error) {
    console.error('Error getting reminders:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Cancel reminder
router.delete('/reminders/:reminderId', async (req, res) => {
  try {
    const { reminderService } = req.taskServices;
    const { reminderId } = req.params;
    
    await reminderService.cancelReminder(reminderId);
    
    res.json({
      success: true,
      message: 'Reminder cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling reminder:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Analytics and Stats
 */

// Get user task stats
router.get('/stats/user/:userId?', async (req, res) => {
  try {
    const { taskManager } = req.taskServices;
    const userId = req.params.userId || req.user?.id;
    
    const stats = await taskManager.getUserTaskStats(userId);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get workflow metrics
router.get('/stats/workflow', async (req, res) => {
  try {
    const { taskWorkflow } = req.taskServices;
    const { dateFrom, dateTo } = req.query;
    
    const metrics = await taskWorkflow.getWorkflowMetrics({
      userId: req.user?.id,
      dateFrom,
      dateTo
    });
    
    res.json({
      success: true,
      metrics
    });
  } catch (error) {
    console.error('Error getting workflow metrics:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get reminder stats
router.get('/stats/reminders', async (req, res) => {
  try {
    const { reminderService } = req.taskServices;
    const { dateFrom, dateTo } = req.query;
    
    const stats = await reminderService.getReminderStats({
      userId: req.user?.id,
      dateFrom,
      dateTo
    });
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting reminder stats:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get overdue tasks
router.get('/overdue', async (req, res) => {
  try {
    const { taskManager } = req.taskServices;
    
    const tasks = await taskManager.getOverdueTasks(req.user?.id);
    
    res.json({
      success: true,
      tasks
    });
  } catch (error) {
    console.error('Error getting overdue tasks:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

export default router;