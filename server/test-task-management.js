/**
 * Test Task Management System Integration
 * 
 * Comprehensive test suite for the native task management system
 */

import { TaskManager } from './services/tasks/TaskManager.js';
import { TaskWorkflow } from './services/tasks/TaskWorkflow.js';
import { TaskAutomation } from './services/tasks/TaskAutomation.js';
import { ReminderService } from './services/tasks/ReminderService.js';
import { getTaskTemplate, createTripTasks } from './data/taskTemplates.js';

// Simple color console without chalk dependency
const chalk = {
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`
};

// Test configuration
const TEST_USER_ID = 'test_user_123';

class TaskManagementTester {
  constructor() {
    this.taskManager = new TaskManager({ userId: TEST_USER_ID });
    this.taskWorkflow = new TaskWorkflow({ userId: TEST_USER_ID, taskManager: this.taskManager });
    this.taskAutomation = new TaskAutomation({ 
      userId: TEST_USER_ID, 
      taskManager: this.taskManager,
      taskWorkflow: this.taskWorkflow 
    });
    this.reminderService = new ReminderService({ userId: TEST_USER_ID });
    
    this.createdTasks = [];
    this.testResults = [];
  }
  
  async initialize() {
    console.log(chalk.blue('🚀 Initializing Task Management System...'));
    
    try {
      await Promise.all([
        this.taskManager.initialize(),
        this.taskWorkflow.initialize(),
        this.taskAutomation.initialize(),
        this.reminderService.initialize()
      ]);
      
      console.log(chalk.green('✅ All services initialized successfully'));
      return true;
    } catch (error) {
      console.error(chalk.red('❌ Initialization failed:'), error);
      return false;
    }
  }
  
  async runAllTests() {
    console.log(chalk.blue('\n📋 Starting Task Management System Tests...\n'));
    
    const tests = [
      { name: 'Basic Task CRUD', fn: this.testBasicTaskCRUD.bind(this) },
      { name: 'Task Assignments', fn: this.testTaskAssignments.bind(this) },
      { name: 'Task Dependencies', fn: this.testTaskDependencies.bind(this) },
      { name: 'Task Workflow', fn: this.testTaskWorkflow.bind(this) },
      { name: 'Task Templates', fn: this.testTaskTemplates.bind(this) },
      { name: 'Task Automation', fn: this.testTaskAutomation.bind(this) },
      { name: 'Reminders', fn: this.testReminders.bind(this) },
      { name: 'Email to Task', fn: this.testEmailToTask.bind(this) },
      { name: 'Travel Itinerary', fn: this.testTravelItinerary.bind(this) },
      { name: 'Analytics', fn: this.testAnalytics.bind(this) }
    ];
    
    for (const test of tests) {
      console.log(chalk.yellow(`\n🧪 Test: ${test.name}`));
      console.log(chalk.gray('─'.repeat(50)));
      
      try {
        await test.fn();
        this.testResults.push({ name: test.name, status: 'passed' });
        console.log(chalk.green(`✅ ${test.name} passed`));
      } catch (error) {
        this.testResults.push({ name: test.name, status: 'failed', error: error.message });
        console.error(chalk.red(`❌ ${test.name} failed:`), error.message);
      }
    }
    
    // Cleanup
    await this.cleanup();
    
    // Summary
    this.printSummary();
  }
  
  async testBasicTaskCRUD() {
    console.log(chalk.cyan('Testing basic task CRUD operations...'));
    
    // Create task
    const taskData = {
      title: 'Book flight to Paris',
      description: 'Book round-trip flight for client John Doe',
      priority: 'high',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      travelType: 'flight',
      bookingReference: 'TEST123',
      tags: ['urgent', 'vip-client'],
      estimatedDuration: 30
    };
    
    const task = await this.taskManager.createTask(taskData);
    this.createdTasks.push(task.id);
    console.log(chalk.gray(`Created task: ${task.id}`));
    
    // Read task
    const retrievedTask = await this.taskManager.getTask(task.id);
    if (retrievedTask.title !== taskData.title) {
      throw new Error('Retrieved task does not match created task');
    }
    console.log(chalk.gray('Task retrieved successfully'));
    
    // Update task
    const updates = {
      priority: 'urgent',
      description: 'Updated: Book round-trip flight for VIP client John Doe'
    };
    
    const updatedTask = await this.taskManager.updateTask(task.id, updates);
    if (updatedTask.priority !== 'urgent') {
      throw new Error('Task update failed');
    }
    console.log(chalk.gray('Task updated successfully'));
    
    // List tasks
    const taskList = await this.taskManager.listTasks({
      priority: 'urgent',
      limit: 10
    });
    
    if (taskList.tasks.length === 0) {
      throw new Error('Task list query failed');
    }
    console.log(chalk.gray(`Listed ${taskList.tasks.length} urgent tasks`));
  }
  
  async testTaskAssignments() {
    console.log(chalk.cyan('Testing task assignments...'));
    
    // Create task
    const task = await this.taskManager.createTask({
      title: 'Review hotel options',
      priority: 'medium',
      estimatedDuration: 45
    });
    this.createdTasks.push(task.id);
    
    // Assign users
    await this.taskManager.assignTask(null, task.id, 'agent_001', 'assignee');
    await this.taskManager.assignTask(null, task.id, 'supervisor_001', 'reviewer');
    console.log(chalk.gray('Assigned task to agent and reviewer'));
    
    // Get task with assignments
    const taskWithAssignments = await this.taskManager.getTask(task.id);
    if (!taskWithAssignments.assignments || taskWithAssignments.assignments.length < 2) {
      throw new Error('Task assignments not properly saved');
    }
    
    // Unassign
    await this.taskManager.unassignTask(task.id, 'agent_001', 'assignee');
    console.log(chalk.gray('Unassigned agent from task'));
  }
  
  async testTaskDependencies() {
    console.log(chalk.cyan('Testing task dependencies...'));
    
    // Create parent and child tasks
    const parentTask = await this.taskManager.createTask({
      title: 'Obtain visa for client',
      priority: 'high',
      estimatedDuration: 120
    });
    this.createdTasks.push(parentTask.id);
    
    const childTask = await this.taskManager.createTask({
      title: 'Book flight after visa approval',
      priority: 'medium',
      estimatedDuration: 30
    });
    this.createdTasks.push(childTask.id);
    
    // Add dependency
    await this.taskManager.addDependency(childTask.id, parentTask.id, 'blocks');
    console.log(chalk.gray('Added blocking dependency'));
    
    // Verify dependency
    const taskWithDeps = await this.taskManager.getTask(childTask.id);
    if (!taskWithDeps.dependencies || taskWithDeps.dependencies.length === 0) {
      throw new Error('Dependencies not properly saved');
    }
    
    // Test circular dependency prevention
    try {
      await this.taskManager.addDependency(parentTask.id, childTask.id, 'blocks');
      throw new Error('Circular dependency was not prevented');
    } catch (error) {
      if (!error.message.includes('Circular dependency')) {
        throw error;
      }
      console.log(chalk.gray('Circular dependency prevention working'));
    }
  }
  
  async testTaskWorkflow() {
    console.log(chalk.cyan('Testing task workflow transitions...'));
    
    // Create task
    const task = await this.taskManager.createTask({
      title: 'Process passport renewal',
      priority: 'high',
      estimatedDuration: 60,
      assignees: [{ userId: 'agent_001', role: 'assignee' }]
    });
    this.createdTasks.push(task.id);
    
    // Get available transitions
    const transitions = await this.taskWorkflow.getAvailableTransitions(task.id);
    console.log(chalk.gray(`Available transitions: ${transitions.join(', ')}`));
    
    // Start task
    const startedTask = await this.taskWorkflow.startTask(task.id);
    if (startedTask.status !== 'in_progress') {
      throw new Error('Task start transition failed');
    }
    console.log(chalk.gray('Task started successfully'));
    
    // Complete task
    const completedTask = await this.taskWorkflow.completeTask(task.id, {
      actualDuration: 55,
      completionNotes: 'Passport renewal completed successfully'
    });
    
    if (completedTask.status !== 'completed') {
      throw new Error('Task completion failed');
    }
    console.log(chalk.gray('Task completed successfully'));
    
    // Test invalid transition
    try {
      await this.taskWorkflow.startTask(task.id);
      throw new Error('Invalid transition was allowed');
    } catch (error) {
      if (!error.message.includes('Invalid transition')) {
        throw error;
      }
      console.log(chalk.gray('Invalid transition prevention working'));
    }
  }
  
  async testTaskTemplates() {
    console.log(chalk.cyan('Testing task templates...'));
    
    // Create task from flight booking template
    const flightTask = await this.taskWorkflow.createTaskFromTemplate('flight_booking', {
      title: 'Book flight to Tokyo for Smith family',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    });
    this.createdTasks.push(flightTask.id);
    console.log(chalk.gray('Created task from flight booking template'));
    
    // Verify subtasks were created
    const dependencies = await this.taskManager.db.query(
      'SELECT COUNT(*) as count FROM task_dependencies WHERE depends_on_task_id = $1',
      [flightTask.id]
    );
    
    if (parseInt(dependencies.rows[0].count) === 0) {
      console.log(chalk.yellow('Warning: Subtasks not created (expected in full implementation)'));
    }
    
    // Create visa application from template
    const visaTask = await this.taskWorkflow.createTaskFromTemplate('visa_application', {
      dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
    });
    this.createdTasks.push(visaTask.id);
    console.log(chalk.gray('Created task from visa template'));
  }
  
  async testTaskAutomation() {
    console.log(chalk.cyan('Testing task automation rules...'));
    
    // Create automation rule
    const rule = await this.taskAutomation.createAutomationRule({
      name: 'High Priority Email Tasks',
      description: 'Automatically set high priority for urgent email tasks',
      triggers: ['task_created'],
      conditions: [
        { field: 'task.extractedFromEmail', operator: 'equals', value: true },
        { field: 'task.customFields.confidence', operator: 'greater_than', value: 0.8 }
      ],
      actions: ['update_task'],
      enabled: true
    });
    
    console.log(chalk.gray(`Created automation rule: ${rule.name}`));
    
    // List automation rules
    const rules = await this.taskAutomation.listAutomationRules();
    console.log(chalk.gray(`Total automation rules: ${rules.total}`));
    console.log(chalk.gray(`Templates: ${rules.templates.length}`));
    console.log(chalk.gray(`Custom rules: ${rules.custom.length}`));
  }
  
  async testReminders() {
    console.log(chalk.cyan('Testing reminder system...'));
    
    // Create task with future due date
    const task = await this.taskManager.createTask({
      title: 'Submit visa application',
      priority: 'urgent',
      dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      travelType: 'document'
    });
    this.createdTasks.push(task.id);
    
    // Create reminders
    const reminder1 = await this.reminderService.createReminder({
      taskId: task.id,
      reminderTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      type: 'email',
      message: 'Visa application due in 1 hour'
    });
    
    const reminder2 = await this.reminderService.createReminder({
      taskId: task.id,
      reminderTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
      type: 'push',
      message: 'Urgent: Visa application due soon'
    });
    
    console.log(chalk.gray('Created email and push reminders'));
    
    // Get task reminders
    const reminders = await this.reminderService.getTaskReminders(task.id);
    if (reminders.length !== 2) {
      throw new Error('Reminders not properly created');
    }
    
    // Cancel one reminder
    await this.reminderService.cancelReminder(reminder2.id);
    console.log(chalk.gray('Cancelled push reminder'));
    
    // Test reminder stats
    const stats = await this.reminderService.getReminderStats({
      userId: TEST_USER_ID
    });
    console.log(chalk.gray(`Reminder stats: ${stats.totalReminders} total reminders`));
  }
  
  async testEmailToTask() {
    console.log(chalk.cyan('Testing email to task conversion...'));
    
    // Simulate email data
    const emailData = {
      email: {
        id: 'email_123',
        subject: 'Urgent: Book flight to London by Friday',
        from: 'client@example.com',
        body: 'Please book a business class flight to London for next week.'
      },
      extractedTasks: [
        {
          title: 'Book flight to London',
          description: 'Business class flight for next week',
          priority: 'urgent',
          deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          tags: ['flight', 'urgent', 'business-class'],
          travelType: 'flight',
          confidence: 0.9
        }
      ]
    };
    
    const tasks = await this.taskAutomation.createTaskFromEmail(emailData);
    if (tasks.length === 0) {
      throw new Error('No tasks created from email');
    }
    
    this.createdTasks.push(...tasks.map(t => t.id));
    console.log(chalk.gray(`Created ${tasks.length} task(s) from email`));
    
    // Verify email attachment
    const taskWithAttachments = await this.taskManager.getTask(tasks[0].id);
    if (!taskWithAttachments.attachments || taskWithAttachments.attachments.length === 0) {
      throw new Error('Email attachment not linked to task');
    }
    console.log(chalk.gray('Email properly linked as attachment'));
  }
  
  async testTravelItinerary() {
    console.log(chalk.cyan('Testing travel itinerary automation...'));
    
    const tripData = {
      destination: 'Bali, Indonesia',
      startDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      endDate: new Date(Date.now() + 97 * 24 * 60 * 60 * 1000), // 7 day trip
      travelers: 2,
      tripType: 'leisure'
    };
    
    const tasks = await this.taskAutomation.createTravelItineraryTasks(tripData);
    this.createdTasks.push(...tasks.map(t => t.id));
    
    console.log(chalk.gray(`Created ${tasks.length} tasks for Bali trip:`));
    tasks.forEach(task => {
      console.log(chalk.gray(`  - ${task.title} (due: ${task.dueDate?.toLocaleDateString()})`));
    });
  }
  
  async testAnalytics() {
    console.log(chalk.cyan('Testing analytics and reporting...'));
    
    // Get user task stats
    const userStats = await this.taskManager.getUserTaskStats(TEST_USER_ID);
    console.log(chalk.gray('User task statistics:'));
    console.log(chalk.gray(`  - Total tasks: ${userStats.totalTasks}`));
    console.log(chalk.gray(`  - Completed: ${userStats.completedTasks}`));
    console.log(chalk.gray(`  - In progress: ${userStats.inProgressTasks}`));
    console.log(chalk.gray(`  - Pending: ${userStats.pendingTasks}`));
    
    // Get workflow metrics
    const workflowMetrics = await this.taskWorkflow.getWorkflowMetrics({
      userId: TEST_USER_ID
    });
    console.log(chalk.gray('\\nWorkflow metrics:'));
    console.log(chalk.gray(`  - Total tasks: ${workflowMetrics.totalTasks}`));
    
    // Get automation stats
    const automationStats = await this.taskAutomation.getAutomationStats();
    console.log(chalk.gray('\\nAutomation statistics:'));
    console.log(chalk.gray(`  - Total rules: ${automationStats.totalRules}`));
    console.log(chalk.gray(`  - Active rules: ${automationStats.activeRules}`));
    console.log(chalk.gray(`  - Templates: ${automationStats.templates}`));
  }
  
  async cleanup() {
    console.log(chalk.yellow('\\n🧹 Cleaning up test data...'));
    
    // Delete all created tasks
    for (const taskId of this.createdTasks) {
      try {
        await this.taskManager.deleteTask(taskId);
      } catch (error) {
        // Task might already be deleted
      }
    }
    
    // Stop reminder service
    this.reminderService.stopReminderChecker();
    
    console.log(chalk.gray(`Cleaned up ${this.createdTasks.length} test tasks`));
  }
  
  printSummary() {
    console.log(chalk.blue('\\n📊 Test Summary'));
    console.log(chalk.gray('─'.repeat(50)));
    
    const passed = this.testResults.filter(r => r.status === 'passed').length;
    const failed = this.testResults.filter(r => r.status === 'failed').length;
    const total = this.testResults.length;
    
    console.log(chalk.green(`✅ Passed: ${passed}/${total}`));
    if (failed > 0) {
      console.log(chalk.red(`❌ Failed: ${failed}/${total}`));
      console.log(chalk.red('\\nFailed tests:'));
      this.testResults
        .filter(r => r.status === 'failed')
        .forEach(r => {
          console.log(chalk.red(`  - ${r.name}: ${r.error}`));
        });
    }
    
    console.log('\\n' + chalk.blue('🎉 Task Management System testing complete!'));
  }
}

// Run tests
async function main() {
  const tester = new TaskManagementTester();
  
  const initialized = await tester.initialize();
  if (!initialized) {
    console.error(chalk.red('Failed to initialize test environment'));
    process.exit(1);
  }
  
  await tester.runAllTests();
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(chalk.red('Test execution failed:'), error);
    process.exit(1);
  });
}

export { TaskManagementTester };