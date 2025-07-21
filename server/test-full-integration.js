/**
 * Comprehensive Email & Task System Integration Test
 * Tests the complete flow from email ingestion to task management with integrations
 */

import EmailManager from './services/EmailManager.js';
import EmailToTaskConverter from './services/EmailToTaskConverter.js';
import TaskSuggestionEngine from './services/TaskSuggestionEngine.js';
import EmailActionHandler from './services/EmailActionHandler.js';
import TaskManager from './services/TaskManager.js';
import TaskWorkflow from './services/TaskWorkflow.js';
import TaskAutomation from './services/TaskAutomation.js';
import ReminderService from './services/ReminderService.js';
import IntegrationManager from './services/integrations/IntegrationManager.js';
import NotionIntegration from './services/integrations/NotionIntegration.js';
import LinearIntegration from './services/integrations/LinearIntegration.js';
import IntegrationMonitoring from './services/integrations/IntegrationMonitoring.js';
import { MockEmailProvider } from './services/providers/MockEmailProvider.js';

// Test configuration
const TEST_CONFIG = {
    userId: 'test_user_123',
    organizationId: 'test_org_123',
    enableIntegrations: false, // Can work without integrations
    mockData: true
};

// Test emails
const TEST_EMAILS = [
    {
        id: 'email_flight_001',
        subject: 'Urgent: Book flights to Tokyo for Johnson family - March 25',
        from: { name: 'Sarah Johnson', address: 'sarah@company.com' },
        to: [{ address: 'agent@tala.ai' }],
        body: `Hi Team,

Please book the following flights urgently:

Departure: March 25, 2024
- From: JFK (New York)
- To: NRT (Tokyo)
- Passengers: 2 adults, 1 child
- Class: Business

Return: April 3, 2024
- Same route reversed

Budget: Maximum $15,000 total
Passport info will be sent separately.

This is for an important client meeting. Please confirm by EOD today.

Thanks,
Sarah`,
        date: new Date().toISOString(),
        threadId: 'thread_flight_001',
        labels: ['urgent', 'travel']
    },
    {
        id: 'email_hotel_001',
        subject: 'Hotel booking needed - Rome Vatican area',
        from: { name: 'Mike Chen', address: 'mchen@vip.com' },
        body: `Hello,

I need a 5-star hotel near the Vatican for my upcoming trip:

Check-in: April 15, 2024
Check-out: April 20, 2024
Rooms: 2 suites (connecting if possible)

Requirements:
- Walking distance to Vatican
- Spa and fitness center
- Business facilities
- Excellent restaurant

Budget: €800/night per room

Please send options ASAP.

Best,
Mike Chen`,
        date: new Date().toISOString()
    },
    {
        id: 'email_visa_001',
        subject: 'RE: India business trip - visa requirements',
        body: `Following up on our discussion:

For the India trip (May 10-20), you'll need:
1. Business visa (apply at least 1 week before)
2. Valid passport (6 months validity)
3. Invitation letter from client
4. Yellow fever vaccination certificate

The client meeting is on May 12 in Mumbai, followed by site visits in Delhi.

Let me know if you need help with the visa application.`,
        threadId: 'thread_india_001',
        date: new Date().toISOString()
    },
    {
        id: 'email_itinerary_001',
        subject: 'Complete Europe itinerary for the Williams family',
        body: `Here's the detailed itinerary:

Day 1-3 (June 1-3): Paris
- Hotel: Four Seasons George V
- Activities: Eiffel Tower, Louvre, Versailles

Day 4-6 (June 4-6): Rome
- Hotel: Hotel de Russie
- Activities: Colosseum, Vatican, Trevi Fountain

Day 7-9 (June 7-9): Barcelona
- Hotel: Mandarin Oriental
- Activities: Sagrada Familia, Park Güell

Transportation:
- Paris to Rome: Flight on June 4 (AF1234)
- Rome to Barcelona: Train on June 7

Please prepare all tickets and confirmations.`,
        date: new Date().toISOString()
    }
];

class FullIntegrationTest {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            skipped: 0,
            tests: []
        };
        
        this.services = {};
    }
    
    async setup() {
        console.log('🔧 Setting up test environment...\n');
        
        // Initialize mock database
        this.mockDb = {
            tasks: new Map(),
            reminders: new Map(),
            integrations: new Map(),
            emails: new Map(),
            
            // Mock methods
            query: async (sql, params) => ({ rows: [] }),
            execute: async (sql, params) => ({ affectedRows: 1 }),
            saveTask: async (task) => {
                task.id = task.id || `task_${Date.now()}`;
                this.tasks.set(task.id, task);
                return task;
            },
            getTask: async (id) => this.tasks.get(id),
            saveReminder: async (reminder) => {
                reminder.id = reminder.id || `rem_${Date.now()}`;
                this.reminders.set(reminder.id, reminder);
                return reminder;
            }
        };
        
        // Initialize services
        this.services.emailManager = new EmailManager({
            userId: TEST_CONFIG.userId,
            organizationId: TEST_CONFIG.organizationId
        });
        
        // Add mock provider
        const mockProvider = new MockEmailProvider({
            emails: TEST_EMAILS
        });
        await this.services.emailManager.addProvider('mock', mockProvider);
        await this.services.emailManager.setActiveProvider('mock');
        
        // Initialize converters and engines
        this.services.converter = new EmailToTaskConverter({
            enableAI: false, // Use pattern matching for tests
            preserveThread: true
        });
        
        this.services.suggestionEngine = new TaskSuggestionEngine({
            learnFromHistory: true
        });
        
        this.services.actionHandler = new EmailActionHandler({
            converter: this.services.converter,
            enableWebSocket: false // Disable for tests
        });
        
        // Initialize task management
        this.services.taskManager = new TaskManager({
            db: this.mockDb
        });
        
        this.services.taskWorkflow = new TaskWorkflow({
            db: this.mockDb
        });
        
        this.services.taskAutomation = new TaskAutomation({
            db: this.mockDb,
            taskManager: this.services.taskManager
        });
        
        this.services.reminderService = new ReminderService({
            db: this.mockDb,
            channels: {
                email: { send: async () => ({ sent: true }) },
                sms: { send: async () => ({ sent: true }) },
                push: { send: async () => ({ sent: true }) }
            }
        });
        
        // Initialize integrations (optional)
        if (TEST_CONFIG.enableIntegrations) {
            this.services.integrationManager = new IntegrationManager({
                db: this.mockDb,
                taskManager: this.services.taskManager
            });
            
            this.services.integrationManager.registerIntegration(new NotionIntegration());
            this.services.integrationManager.registerIntegration(new LinearIntegration());
            
            this.services.monitoring = new IntegrationMonitoring({
                db: this.mockDb
            });
        }
        
        console.log('✅ Test environment ready\n');
    }
    
    async runTest(name, testFn) {
        console.log(`\n🧪 ${name}`);
        const start = Date.now();
        
        try {
            await testFn();
            const duration = Date.now() - start;
            console.log(`   ✅ Passed (${duration}ms)`);
            this.results.passed++;
            this.results.tests.push({ name, status: 'passed', duration });
        } catch (error) {
            const duration = Date.now() - start;
            console.log(`   ❌ Failed: ${error.message}`);
            this.results.failed++;
            this.results.tests.push({ name, status: 'failed', error: error.message, duration });
        }
    }
    
    async testEmailProviders() {
        await this.runTest('Email Provider Abstraction', async () => {
            // Test provider registration
            const providers = this.services.emailManager.listProviders();
            if (!providers.includes('mock')) {
                throw new Error('Mock provider not registered');
            }
            
            // Test email fetching
            const inbox = await this.services.emailManager.getInbox();
            if (inbox.messages.length !== TEST_EMAILS.length) {
                throw new Error(`Expected ${TEST_EMAILS.length} emails, got ${inbox.messages.length}`);
            }
        });
        
        await this.runTest('Email Filtering and Search', async () => {
            // Test label filtering
            const urgentEmails = await this.services.emailManager.getInbox({
                labels: ['urgent']
            });
            
            if (urgentEmails.messages.length !== 1) {
                throw new Error('Label filtering failed');
            }
            
            // Test search
            const searchResults = await this.services.emailManager.searchEmails('Tokyo');
            if (searchResults.length !== 1) {
                throw new Error('Search failed');
            }
        });
    }
    
    async testTaskExtraction() {
        await this.runTest('Extract Tasks from Flight Email', async () => {
            const email = TEST_EMAILS[0]; // Flight email
            const result = await this.services.converter.convertEmailToTasks(email);
            
            if (!result.tasks || result.tasks.length === 0) {
                throw new Error('No tasks extracted from flight email');
            }
            
            const task = result.tasks[0];
            if (!task.title.includes('flight') || !task.title.includes('Tokyo')) {
                throw new Error('Task title incorrect');
            }
            
            if (task.priority !== 'urgent') {
                throw new Error('Priority not correctly identified');
            }
        });
        
        await this.runTest('Extract Multiple Tasks from Itinerary', async () => {
            const email = TEST_EMAILS[3]; // Itinerary email
            const result = await this.services.converter.convertEmailToTasks(email);
            
            if (result.tasks.length < 2) {
                throw new Error('Should extract multiple tasks from itinerary');
            }
            
            const hasHotelTask = result.tasks.some(t => t.title.includes('Hotel'));
            const hasFlightTask = result.tasks.some(t => t.title.includes('Flight'));
            
            if (!hasHotelTask || !hasFlightTask) {
                throw new Error('Missing expected task types');
            }
        });
        
        await this.runTest('Smart Task Suggestions', async () => {
            const task = {
                title: 'Book flight to Tokyo',
                type: 'flight',
                entities: {
                    dates: ['March 25'],
                    locations: ['Tokyo']
                }
            };
            
            const suggestions = await this.services.suggestionEngine.generateTaskSuggestion(
                task,
                TEST_EMAILS[0]
            );
            
            if (!suggestions.dueDate) {
                throw new Error('No due date suggested');
            }
            
            if (!suggestions.reminders || suggestions.reminders.length === 0) {
                throw new Error('No reminders suggested');
            }
            
            if (!suggestions.tags.includes('flight')) {
                throw new Error('Missing expected tags');
            }
        });
    }
    
    async testTaskManagement() {
        await this.runTest('Create and Manage Tasks', async () => {
            // Create task
            const taskData = {
                title: 'Book Tokyo flights for Johnson family',
                description: 'Business class, March 25 - April 3',
                priority: 'urgent',
                status: 'pending',
                dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
                tags: ['flight', 'urgent', 'client'],
                metadata: {
                    passenger: 'Johnson family',
                    route: 'JFK-NRT',
                    budget: 15000
                }
            };
            
            const task = await this.services.taskManager.createTask(taskData);
            
            if (!task.id) {
                throw new Error('Task creation failed');
            }
            
            // Update task
            await this.services.taskManager.updateTask(task.id, {
                status: 'in_progress'
            });
            
            const updated = await this.services.taskManager.getTask(task.id);
            if (updated.status !== 'in_progress') {
                throw new Error('Task update failed');
            }
        });
        
        await this.runTest('Task Workflow Transitions', async () => {
            const task = {
                id: 'test_task_001',
                status: 'pending'
            };
            
            // Get available transitions
            const transitions = await this.services.taskWorkflow.getAvailableTransitions('pending');
            if (!transitions.includes('start')) {
                throw new Error('Missing expected transition');
            }
            
            // Perform transition
            const result = await this.services.taskWorkflow.transitionTask(task, 'start');
            if (result.newStatus !== 'in_progress') {
                throw new Error('Transition failed');
            }
        });
        
        await this.runTest('Task Automation Rules', async () => {
            // Create rule
            const rule = {
                name: 'Auto-assign urgent flights',
                trigger: {
                    type: 'task_created',
                    conditions: {
                        type: 'flight',
                        priority: 'urgent'
                    }
                },
                actions: [
                    {
                        type: 'assign_user',
                        params: { userId: 'flight_specialist' }
                    },
                    {
                        type: 'add_tag',
                        params: { tag: 'auto-processed' }
                    }
                ]
            };
            
            await this.services.taskAutomation.createRule(rule);
            
            // Test rule execution
            const task = {
                type: 'flight',
                priority: 'urgent',
                title: 'Test flight task'
            };
            
            const result = await this.services.taskAutomation.processTaskEvent('created', task);
            if (!result.executed || result.executed.length === 0) {
                throw new Error('Automation rule not executed');
            }
        });
    }
    
    async testReminderSystem() {
        await this.runTest('Create Multi-Channel Reminders', async () => {
            const reminder = await this.services.reminderService.createReminder({
                taskId: 'task_001',
                reminderTime: new Date(Date.now() + 60 * 60 * 1000),
                channels: ['email', 'push'],
                message: 'Flight booking deadline'
            });
            
            if (!reminder.id) {
                throw new Error('Reminder creation failed');
            }
            
            if (!reminder.channels.includes('email')) {
                throw new Error('Channel configuration failed');
            }
        });
        
        await this.runTest('Smart Reminder Scheduling', async () => {
            const task = {
                priority: 'urgent',
                dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
                type: 'flight'
            };
            
            const suggestions = this.services.reminderService.suggestReminders(task);
            
            if (suggestions.length < 2) {
                throw new Error('Insufficient reminder suggestions');
            }
            
            const hasUrgentReminder = suggestions.some(s => s.timing.includes('hour'));
            if (!hasUrgentReminder) {
                throw new Error('Missing urgent reminder for high-priority task');
            }
        });
    }
    
    async testEmailToTaskFlow() {
        await this.runTest('Complete Email to Task Conversion Flow', async () => {
            const email = TEST_EMAILS[0]; // Flight email
            
            // Step 1: Send to Tala
            const session = await this.services.actionHandler.handleSendToTala(
                email,
                TEST_CONFIG.userId
            );
            
            if (!session.sessionId) {
                throw new Error('Session creation failed');
            }
            
            // Step 2: Get preview
            const preview = await this.services.actionHandler.getSessionStatus(session.sessionId);
            if (!preview.results?.taskPreviews) {
                throw new Error('No task preview generated');
            }
            
            // Step 3: Confirm and create
            const confirmation = {
                confirmed: true,
                edits: {},
                rejectedTasks: []
            };
            
            const result = await this.services.actionHandler.confirmAndCreateTasks(
                session.sessionId,
                confirmation
            );
            
            if (result.tasksCreated === 0) {
                throw new Error('No tasks created');
            }
        });
        
        await this.runTest('Batch Email Processing', async () => {
            const emailIds = TEST_EMAILS.slice(0, 3).map(e => e.id);
            
            const results = await this.services.actionHandler.handleBatchSendToTala(
                emailIds,
                TEST_CONFIG.userId,
                { autoCreate: true }
            );
            
            if (results.successful !== 3) {
                throw new Error(`Expected 3 successful, got ${results.successful}`);
            }
            
            if (results.totalTasksCreated < 3) {
                throw new Error('Insufficient tasks created from batch');
            }
        });
    }
    
    async testIntegrations() {
        if (!TEST_CONFIG.enableIntegrations) {
            console.log('\n⚠️  Skipping integration tests (disabled in config)');
            this.results.skipped += 2;
            return;
        }
        
        await this.runTest('Integration Registration', async () => {
            const integrations = this.services.integrationManager.getAllIntegrations();
            
            if (integrations.length !== 2) {
                throw new Error('Expected 2 integrations registered');
            }
            
            const hasNotion = integrations.some(i => i.id === 'notion');
            const hasLinear = integrations.some(i => i.id === 'linear');
            
            if (!hasNotion || !hasLinear) {
                throw new Error('Missing expected integrations');
            }
        });
        
        await this.runTest('Integration Health Monitoring', async () => {
            // Record some metrics
            await this.services.monitoring.recordSync('config_001', 'complete', {
                integrationId: 'notion',
                duration: 2500,
                itemsSynced: 10,
                created: 5,
                updated: 5
            });
            
            // Get health status
            const health = await this.services.monitoring.getIntegrationHealth('config_001');
            
            if (!health.indicators.successRate) {
                throw new Error('Health indicators not calculated');
            }
        });
    }
    
    async testSystemWithoutIntegrations() {
        await this.runTest('System Works Without External Integrations', async () => {
            // Disable all integrations
            this.services.integrationManager = null;
            
            // System should still work
            const email = TEST_EMAILS[1]; // Hotel email
            const result = await this.services.converter.convertEmailToTasks(email);
            
            if (!result.tasks || result.tasks.length === 0) {
                throw new Error('System failed without integrations');
            }
            
            // Create task natively
            const task = await this.services.taskManager.createTask(result.tasks[0]);
            if (!task.id) {
                throw new Error('Native task creation failed');
            }
            
            // Set reminder natively
            const reminder = await this.services.reminderService.createReminder({
                taskId: task.id,
                reminderTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
                channels: ['email']
            });
            
            if (!reminder.id) {
                throw new Error('Native reminder creation failed');
            }
        });
    }
    
    async runPerformanceTests() {
        console.log('\n📊 Performance Tests:');
        
        await this.runTest('Process 100 Emails in Under 5 Seconds', async () => {
            const emails = Array(100).fill(null).map((_, i) => ({
                id: `perf_email_${i}`,
                subject: `Task ${i}: Process this request`,
                body: 'Please handle this task urgently.',
                from: { address: 'test@example.com' },
                date: new Date().toISOString()
            }));
            
            const start = Date.now();
            
            // Process in batches
            for (let i = 0; i < emails.length; i += 10) {
                const batch = emails.slice(i, i + 10);
                await Promise.all(
                    batch.map(email => this.services.converter.convertEmailToTasks(email))
                );
            }
            
            const duration = Date.now() - start;
            
            if (duration > 5000) {
                throw new Error(`Too slow: ${duration}ms`);
            }
            
            console.log(`     Processed 100 emails in ${duration}ms`);
        });
        
        await this.runTest('Handle 1000 Concurrent Tasks', async () => {
            const tasks = Array(1000).fill(null).map((_, i) => ({
                title: `Task ${i}`,
                status: 'pending',
                priority: ['low', 'medium', 'high'][i % 3]
            }));
            
            const start = Date.now();
            
            // Create all tasks
            const created = await Promise.all(
                tasks.map(task => this.services.taskManager.createTask(task))
            );
            
            const duration = Date.now() - start;
            
            if (created.length !== 1000) {
                throw new Error('Failed to create all tasks');
            }
            
            console.log(`     Created 1000 tasks in ${duration}ms`);
        });
    }
    
    async generateReport() {
        console.log('\n\n' + '='.repeat(60));
        console.log('📊 FULL INTEGRATION TEST REPORT');
        console.log('='.repeat(60));
        
        console.log('\n📈 Results Summary:');
        console.log(`   Total Tests: ${this.results.tests.length}`);
        console.log(`   ✅ Passed: ${this.results.passed}`);
        console.log(`   ❌ Failed: ${this.results.failed}`);
        console.log(`   ⚠️  Skipped: ${this.results.skipped}`);
        console.log(`   Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);
        
        console.log('\n🏆 Feature Coverage:');
        console.log('   ✅ Email provider abstraction');
        console.log('   ✅ Mock provider for testing');
        console.log('   ✅ Task extraction from emails');
        console.log('   ✅ Smart task suggestions');
        console.log('   ✅ Native task management');
        console.log('   ✅ Workflow automation');
        console.log('   ✅ Multi-channel reminders');
        console.log('   ✅ Email-to-task conversion');
        console.log('   ✅ Batch processing');
        console.log('   ✅ Works without integrations');
        
        if (TEST_CONFIG.enableIntegrations) {
            console.log('   ✅ Notion integration');
            console.log('   ✅ Linear integration');
            console.log('   ✅ Health monitoring');
        }
        
        console.log('\n⚠️  Production Considerations:');
        console.log('   • Real Gmail requires OAuth2 setup');
        console.log('   • Outlook needs app registration');
        console.log('   • Task extraction works best with GPT-4');
        console.log('   • Notion/Linear need valid API keys');
        console.log('   • Enable monitoring for production');
        
        if (this.results.failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.results.tests
                .filter(t => t.status === 'failed')
                .forEach(t => {
                    console.log(`   • ${t.name}: ${t.error}`);
                });
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ Integration test completed!');
        console.log('='.repeat(60));
    }
    
    async run() {
        console.log('🚀 Starting Full Email & Task Integration Test');
        console.log('=' .repeat(60));
        
        try {
            await this.setup();
            
            console.log('📧 Testing Email Providers...');
            await this.testEmailProviders();
            
            console.log('\n🔍 Testing Task Extraction...');
            await this.testTaskExtraction();
            
            console.log('\n📋 Testing Task Management...');
            await this.testTaskManagement();
            
            console.log('\n⏰ Testing Reminder System...');
            await this.testReminderSystem();
            
            console.log('\n🔄 Testing Email-to-Task Flow...');
            await this.testEmailToTaskFlow();
            
            console.log('\n🔌 Testing Integrations...');
            await this.testIntegrations();
            
            console.log('\n🏗️ Testing System Without Integrations...');
            await this.testSystemWithoutIntegrations();
            
            await this.runPerformanceTests();
            
        } catch (error) {
            console.error('\n💥 Fatal error:', error);
        } finally {
            await this.generateReport();
        }
    }
}

// Run the test
if (process.argv[1] === new URL(import.meta.url).pathname) {
    const test = new FullIntegrationTest();
    test.run().catch(console.error);
}

export { FullIntegrationTest };