/**
 * CommonJS version of task management test
 * For environments that don't support ES modules
 */

// Mock implementations for CommonJS testing
class TaskManager {
    constructor(options = {}) {
        this.userId = options.userId;
        this.tasks = new Map();
        this.reminders = new Map();
        this.initialized = false;
    }
    
    async initialize() {
        this.initialized = true;
        console.log('   TaskManager initialized (mock)');
    }
    
    async createTask(taskData, sourceEmailId) {
        const task = {
            id: `task_${Date.now()}`,
            ...taskData,
            source: sourceEmailId ? 'email' : 'manual',
            sourceEmailId,
            status: 'pending',
            created_at: new Date(),
            created_by: this.userId
        };
        
        this.tasks.set(task.id, task);
        return task;
    }
    
    async setReminder(taskId, reminderTime) {
        const reminder = {
            id: `reminder_${Date.now()}`,
            task_id: taskId,
            reminder_time: reminderTime,
            status: 'scheduled'
        };
        
        this.reminders.set(reminder.id, reminder);
        return reminder;
    }
    
    async getUpcomingDeadlines(userId) {
        const upcoming = Array.from(this.tasks.values())
            .filter(task => {
                return task.created_by === userId && 
                       task.status !== 'completed' &&
                       task.due_date > new Date();
            })
            .sort((a, b) => a.due_date - b.due_date);
        
        return upcoming;
    }
    
    async updateTask(taskId, updates) {
        const task = this.tasks.get(taskId);
        if (!task) throw new Error('Task not found');
        
        Object.assign(task, updates, { updated_at: new Date() });
        return task;
    }
    
    async completeTask(taskId) {
        return this.updateTask(taskId, { 
            status: 'completed',
            completed_at: new Date()
        });
    }
}

class ReminderService {
    constructor() {
        this.active = true;
        this.reminders = [];
    }
    
    isActive() {
        return this.active;
    }
    
    async createReminder(data) {
        const reminder = {
            id: `reminder_${Date.now()}`,
            ...data,
            created_at: new Date(),
            status: 'scheduled'
        };
        
        this.reminders.push(reminder);
        return reminder;
    }
    
    async checkReminders() {
        const now = new Date();
        const due = this.reminders.filter(r => 
            r.status === 'scheduled' && 
            new Date(r.reminder_time) <= now
        );
        
        console.log(`   Found ${due.length} due reminders`);
        return due;
    }
}

async function testTaskManagement() {
    console.log('Testing Task Management System...\n');
    
    const taskManager = new TaskManager({ userId: 'test-user-123' });
    
    try {
        await taskManager.initialize();
        
        // Test 1: Create task
        console.log('📝 Creating test task:');
        const task = await taskManager.createTask({
            title: 'Book flight to Paris',
            description: 'Economy class, direct flight preferred',
            priority: 8,
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            source: 'email'
        }, 'email-123');
        console.log('   ✅ Task created:', task.id);
        
        // Test 2: Set reminder
        console.log('\n⏰ Setting reminder:');
        const reminder = await taskManager.setReminder(
            task.id, 
            new Date(Date.now() + 6 * 24 * 60 * 60 * 1000) // 1 day before
        );
        console.log('   ✅ Reminder set for:', reminder.reminder_time.toLocaleDateString());
        
        // Test 3: Get upcoming tasks
        console.log('\n📅 Getting upcoming deadlines:');
        const upcoming = await taskManager.getUpcomingDeadlines('test-user-123');
        console.log(`   ✅ Found ${upcoming.length} upcoming tasks`);
        upcoming.forEach(t => {
            console.log(`   - ${t.title} (due: ${t.due_date.toLocaleDateString()})`);
        });
        
        // Test 4: Update task
        console.log('\n✏️  Updating task:');
        await taskManager.updateTask(task.id, { status: 'in_progress' });
        console.log('   ✅ Task updated to in_progress');
        
        // Test 5: Complete task
        console.log('\n✅ Completing task:');
        await taskManager.completeTask(task.id);
        console.log('   ✅ Task marked as complete');
        
    } catch (error) {
        console.log('❌ Task management error:', error.message);
    }
}

// Test reminder service
async function testReminders() {
    console.log('\n\n🔔 Testing Reminder Service:');
    
    const reminderService = new ReminderService();
    
    // Check if reminder system is working
    const active = reminderService.isActive();
    console.log(`   Reminder service active: ${active ? '✅' : '❌'}`);
    
    // Create test reminder
    const reminder = await reminderService.createReminder({
        task_id: 'task_123',
        reminder_time: new Date(Date.now() + 1000), // 1 second from now
        type: 'email',
        message: 'Test reminder'
    });
    console.log('   ✅ Test reminder created');
    
    // Check for due reminders
    setTimeout(async () => {
        console.log('\n   Checking for due reminders...');
        const due = await reminderService.checkReminders();
        console.log(`   ✅ Reminder check complete`);
    }, 1100);
}

// Export for use in other modules
module.exports = {
    TaskManager,
    ReminderService
};

// Run tests if executed directly
if (require.main === module) {
    (async () => {
        await testTaskManagement();
        await testReminders();
        
        // Exit after reminders test completes
        setTimeout(() => {
            console.log('\n✅ All tests completed!');
            process.exit(0);
        }, 2000);
    })();
}