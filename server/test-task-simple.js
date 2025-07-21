/**
 * Simple test for native task management system
 * Tests basic functionality with the actual API
 */

import { TaskManager } from './services/tasks/TaskManager.js';
import { ReminderService } from './services/tasks/ReminderService.js';
import { TaskWorkflow } from './services/tasks/TaskWorkflow.js';

// Simple color console without external dependencies
const chalk = {
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`
};

async function testTaskManagement() {
    console.log('Testing Task Management System...\n');
    
    const userId = 'test-user-123';
    const taskManager = new TaskManager({ userId });
    const taskWorkflow = new TaskWorkflow({ userId, taskManager });
    
    try {
        // Initialize services
        await taskManager.initialize();
        await taskWorkflow.initialize();
        
        // Test 1: Create task
        console.log('📝 Creating test task:');
        const task = await taskManager.createTask({
            title: 'Book flight to Paris',
            description: 'Economy class, direct flight preferred',
            priority: 'high', // Changed from numeric to enum
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            sourceEmailId: 'email-123',
            travelType: 'flight',
            tags: ['urgent', 'client-request']
        });
        console.log('   ✅ Task created:', task.id);
        console.log('   Title:', task.title);
        console.log('   Priority:', task.priority);
        console.log('   Due:', task.dueDate?.toLocaleDateString());
        
        // Test 2: Assign task
        console.log('\n👤 Assigning task:');
        await taskManager.assignTask(null, task.id, 'agent-001', 'assignee');
        console.log('   ✅ Task assigned to agent-001');
        
        // Test 3: Get task details
        console.log('\n📋 Getting task details:');
        const taskDetails = await taskManager.getTask(task.id);
        console.log('   ✅ Task retrieved');
        console.log('   Assignments:', taskDetails.assignments?.length || 0);
        console.log('   Status:', taskDetails.status);
        
        // Test 4: Start task (workflow)
        console.log('\n▶️  Starting task:');
        const startedTask = await taskWorkflow.startTask(task.id);
        console.log('   ✅ Task started');
        console.log('   New status:', startedTask.status);
        
        // Test 5: List tasks
        console.log('\n📅 Getting upcoming tasks:');
        const taskList = await taskManager.listTasks({
            status: 'in_progress',
            createdBy: userId,
            limit: 10
        });
        console.log(`   ✅ Found ${taskList.tasks.length} tasks in progress`);
        taskList.tasks.forEach(t => {
            console.log(`   - ${t.title} (${t.priority})`);
        });
        
        // Test 6: Complete task
        console.log('\n✅ Completing task:');
        const completedTask = await taskWorkflow.completeTask(task.id, {
            actualDuration: 45,
            completionNotes: 'Flight booked successfully'
        });
        console.log('   ✅ Task marked as complete');
        console.log('   Completed at:', completedTask.completedAt);
        
        // Test 7: Get user stats
        console.log('\n📊 Getting user statistics:');
        const stats = await taskManager.getUserTaskStats(userId);
        console.log('   Total tasks:', stats.totalTasks || 0);
        console.log('   Completed:', stats.completedTasks || 0);
        console.log('   In progress:', stats.inProgressTasks || 0);
        console.log('   Pending:', stats.pendingTasks || 0);
        
    } catch (error) {
        console.log('❌ Task management error:', error.message);
        console.error(error);
    }
}

async function testReminders() {
    console.log('\n\n🔔 Testing Reminder Service:\n');
    
    const userId = 'test-user-123';
    const reminderService = new ReminderService({ userId });
    
    try {
        // Initialize service
        await reminderService.initialize();
        console.log('   ✅ Reminder service initialized');
        
        // Create a task first
        const taskManager = new TaskManager({ userId });
        await taskManager.initialize();
        
        const task = await taskManager.createTask({
            title: 'Check passport expiry',
            priority: 'medium',
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
            travelType: 'document'
        });
        
        // Test 1: Create reminder
        console.log('\n⏰ Setting reminder:');
        const reminder = await reminderService.createReminder({
            taskId: task.id,
            reminderTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 1 day before
            type: 'email',
            message: 'Passport check reminder - due tomorrow'
        });
        console.log('   ✅ Reminder created:', reminder.id);
        console.log('   Type:', reminder.type);
        console.log('   Time:', new Date(reminder.reminder_time).toLocaleString());
        console.log('   Status:', reminder.status);
        
        // Test 2: Get task reminders
        console.log('\n📋 Getting task reminders:');
        const reminders = await reminderService.getTaskReminders(task.id);
        console.log(`   ✅ Found ${reminders.length} reminder(s) for task`);
        
        // Test 3: Create recurring reminder
        console.log('\n🔁 Creating recurring reminder:');
        const recurringReminder = await reminderService.createReminder({
            taskId: task.id,
            reminderTime: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour
            type: 'push',
            message: 'Hourly check reminder',
            isRecurring: true,
            recurrencePattern: 'daily'
        });
        console.log('   ✅ Recurring reminder created');
        console.log('   Pattern:', recurringReminder.recurrence_pattern);
        
        // Test 4: Cancel reminder
        console.log('\n❌ Cancelling reminder:');
        await reminderService.cancelReminder(recurringReminder.id);
        console.log('   ✅ Reminder cancelled');
        
        // Test 5: Get reminder stats
        console.log('\n📊 Reminder statistics:');
        const stats = await reminderService.getReminderStats({ userId });
        console.log('   Total reminders:', stats.totalReminders);
        console.log('   By status:', JSON.stringify(stats.byStatus, null, 2));
        
        // Cleanup
        reminderService.stopReminderChecker();
        console.log('\n🧹 Reminder service stopped');
        
    } catch (error) {
        console.log('❌ Reminder service error:', error.message);
        console.error(error);
    }
}

// Test task creation from email
async function testEmailIntegration() {
    console.log('\n\n📧 Testing Email to Task Integration:\n');
    
    const userId = 'test-user-123';
    const { TaskAutomation } = await import('./services/tasks/TaskAutomation.js');
    const taskAutomation = new TaskAutomation({ userId });
    
    try {
        await taskAutomation.initialize();
        
        // Simulate email data with extracted tasks
        const emailData = {
            email: {
                id: 'email_456',
                subject: 'Urgent: Need visa for Japan trip next month',
                from: 'important.client@company.com',
                body: 'Please arrange tourist visa for 2 people traveling to Japan on March 15th.'
            },
            extractedTasks: [{
                title: 'Arrange Japan tourist visa',
                description: 'Tourist visa for 2 people, travel date March 15th',
                priority: 'urgent',
                deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                tags: ['visa', 'urgent', 'japan'],
                travelType: 'document',
                location: { country: 'Japan' },
                entities: {
                    travelers: 2,
                    destination: 'Japan',
                    travelDate: 'March 15th'
                },
                confidence: 0.95
            }]
        };
        
        console.log('📨 Processing email:', emailData.email.subject);
        const tasks = await taskAutomation.createTaskFromEmail(emailData);
        
        console.log(`   ✅ Created ${tasks.length} task(s) from email`);
        tasks.forEach(task => {
            console.log(`   - ${task.title}`);
            console.log(`     Priority: ${task.priority}`);
            console.log(`     Due: ${task.dueDate?.toLocaleDateString()}`);
            console.log(`     Source: Email ${task.sourceEmailId}`);
        });
        
    } catch (error) {
        console.log('❌ Email integration error:', error.message);
        console.error(error);
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting Task Management System Tests\n');
    console.log('=' .repeat(50));
    
    await testTaskManagement();
    await testReminders();
    await testEmailIntegration();
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ All tests completed!');
    
    // Exit after a short delay to allow async operations to complete
    setTimeout(() => process.exit(0), 1000);
}

// Execute tests
runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});